"""Majority-vote reconciliation across multiple independent LLM extraction
runs of the SAME PDF, to counter the non-determinism observed even at
temperature=0 (see docs/Model_Comparison_Lite_vs_Flash_v2.md: identical
duplicate PDFs produced different Material Class / Domain
classifications, and even different row counts, across runs).
"""

import math
from collections import Counter

import schema

# Free-text fields are never voted on: comparing structurally-unstable
# free text (different valid phrasings of the same real thing, e.g.
# "R1 mode (Simulation)" vs "Simulation - Peak R1 (TD)") across runs would
# produce noise, not a signal. Always take the primary run's value
# verbatim. Mode Description is the field this was explicitly designed
# for; Layer Structure, Definition, Evidence, Location, Raw Value,
# Conversion Method and Sensing Medium have the identical free-text-drift
# problem (e.g. "NaCl (aqueous)" vs "NaCl solution in water") and get the
# same treatment. Short Title is a paraphrase of Title (see
# prompts/extraction.txt: "a concise version...for UI display"), so it has
# the same drift as Mode Description too -- e.g. "High-Q Fano resonances in
# metastructures" vs "...in all-dielectric metastructures" is the SAME
# paper's title shortened slightly differently, not a disagreement worth a
# reviewer's attention; Title itself stays scalar-voted below, since it's
# meant to be copied verbatim, not paraphrased, so a real mismatch there IS
# worth flagging. Mode ID is NOT here -- it's a plain integer now (see
# prompts/extraction.txt), so it gets the same numeric majority-vote
# treatment as the other metrics instead. Evidence Field Map travels
# alongside Evidence/Location (it's per-fragment metadata describing THEM,
# with the identical run-to-run phrasing drift), so it gets the same
# primary-wins-verbatim treatment.
_FREE_TEXT_PRIMARY_ONLY_FIELDS = (
    "Mode Description",
    "Short Title",
    "Layer Structure",
    "Definition",
    "Evidence",
    "Location",
    "Evidence Field Map",
    "Sensing Medium",
    "Raw Value",
    "Conversion Method",
    "Calculated Fields",
)

# ";"-joined sets: reconciled at the token level.
_SET_JOINED_FIELDS = ("Material Class", "Base Materials")

# Simple scalar fields, reconciled by majority vote.
_SCALAR_CATEGORICAL_FIELDS = (
    "Ref",
    "Title",
    "Origin",
    "Domain",
    "Review status",
    "Model Used",
)

# Numeric fields, reconciled by clustering matching values across runs.
# Evidence/Location are shared per-record (not per-metric) in the current
# prompt, so unlike the old quote/page triplets these values are voted on
# alone -- there is no companion field to move atomically with them.
_NUMERIC_FIELDS = (
    "Mode ID",
    "Resonance Wavelength (nm)",
    "FOM (RIU^-1)",
    "Sensitivity (nm/RIU)",
    "FWHM (nm)",
    "Q-factor",
)

_NOTES_FIELD = "Notes"
_LOG_FIELD = "Reconciliation Log"
_EPSILON = 1e-6

# Every column reconcile_runs actually reconciles must be accounted for by
# exactly one of the four categorization tuples above (Notes and the two
# derived/output-only columns are handled separately, see _reconcile_slot).
# Checked at import time so adding a column to schema.COLUMN_ORDER without
# also deciding how it reconciles fails loudly at startup, instead of that
# column silently falling through to whatever "primary" happens to be doing.
_CATEGORIZED_FIELDS = (
    frozenset(_FREE_TEXT_PRIMARY_ONLY_FIELDS)
    | frozenset(_SET_JOINED_FIELDS)
    | frozenset(_SCALAR_CATEGORICAL_FIELDS)
    | frozenset(_NUMERIC_FIELDS)
)
_UNCATEGORIZED_FIELDS = frozenset(schema.COLUMN_ORDER) - _CATEGORIZED_FIELDS - {
    _NOTES_FIELD,
    _LOG_FIELD,
    "Spectral Range",
}
assert not _UNCATEGORIZED_FIELDS, (
    "reconcile.py has no reconciliation strategy for these schema.COLUMN_ORDER "
    f"columns -- add each to one of the tuples above: {sorted(_UNCATEGORIZED_FIELDS)}"
)


def reconcile_runs(runs: list[list[dict]]) -> list[dict]:
    """Merges 1-3 independent extraction runs of the same PDF into one
    final list of records.

    Rows are aligned by (Origin, rank-within-origin-within-run) rather
    than by the free-text "Mode ID"/"Mode Description" labels, which are
    confirmed unstable across runs. Each field is then reconciled with a strategy suited to
    its type, and every disagreement is annotated into the merged
    record's "Reconciliation Log" rather than silently resolved, so the
    output stays human-auditable. "Notes" is left untouched (the winning
    run's own value) since it's user-facing in the app and must not carry
    internal run-to-run bookkeeping.

    `runs` is a list of already-normalized record lists, one entry per
    run that actually succeeded. A failed/missing run must simply be
    omitted from this list (not passed as None or an empty placeholder).

    Known limitation: if two runs disagree about a record's own Origin
    (EXP/SIM/UNCLEAR), they will not be aligned together -- not an
    observed failure mode in prior testing, but not provably impossible.
    """
    runs = [r for r in runs if r]
    if not runs:
        return []
    if len(runs) == 1:
        return list(runs[0])

    total_runs = len(runs)
    grouped = [_group_by_origin(run) for run in runs]
    origins = sorted({origin for run_groups in grouped for origin in run_groups})

    merged: list[dict] = []
    for origin in origins:
        counts = [len(run_groups.get(origin, [])) for run_groups in grouped]
        modal_count = _modal_count(counts)
        max_count = max(counts)

        for rank in range(max_count):
            contributing = [
                run_groups[origin][rank]
                for run_groups in grouped
                if len(run_groups.get(origin, [])) > rank
            ]
            is_extra_row = rank >= modal_count
            merged.append(_reconcile_slot(contributing, total_runs, is_extra_row))

    return merged


def _group_by_origin(run: list[dict]) -> dict[str, list[dict]]:
    groups: dict[str, list[dict]] = {}
    for record in run:
        origin = record.get("Origin") or "UNCLEAR"
        groups.setdefault(origin, []).append(record)
    return groups


def _modal_count(counts: list[int]) -> int:
    """Most common row-count across runs for one Origin group. Ties are
    broken toward the larger count: under-reporting a possibly-real
    result is worse for a research dataset than one clearly-flagged
    extra row a human can delete, so completeness wins ties."""
    tally = Counter(counts)
    best = max(tally.values())
    return max(c for c, n in tally.items() if n == best)


def _reconcile_slot(contributing: list[dict], total_runs: int, is_extra_row: bool) -> dict:
    primary = contributing[0]
    result = dict(primary)
    annotations: list[str] = []
    # True the moment ANY field carries a real cross-run disagreement (not
    # just a "2/3 runs agreed" FYI) -- a lone run's own "Approve (AI)" can't
    # self-certify a value the other runs contradict, so this downgrades
    # Review status below regardless of what the winning run claimed.
    has_warning = is_extra_row

    if is_extra_row:
        annotations.append(
            f"Only found in 1 of {total_runs} runs (extra row beyond the modal "
            f"row count for this Origin) — needs human verification."
        )
    elif len(contributing) < total_runs:
        annotations.append(f"Only {len(contributing)} of {total_runs} runs contained this row.")

    for field in _FREE_TEXT_PRIMARY_ONLY_FIELDS:
        result[field] = primary.get(field)

    # Primary's own "Calculated Fields" survives the copy above verbatim,
    # but "Review status" is about to be independently majority-voted below
    # across every run's OWN status -- if primary derived a metric (needs
    # Edit) while the other runs happened to read it directly (Approve AI),
    # a naive vote could pick the majority's "Approve (AI)" even though the
    # value THIS record actually kept (primary's) was the derived one.
    if result["Calculated Fields"]:
        has_warning = True

    for field in _SET_JOINED_FIELDS:
        value, note = _reconcile_set_field(contributing, field)
        result[field] = value
        if note:
            annotations.append(note)
            has_warning = True

    for field in _SCALAR_CATEGORICAL_FIELDS:
        value, note = _reconcile_scalar_field(contributing, primary, field)
        result[field] = value
        if note:
            annotations.append(note)
            has_warning = True

    for field in _NUMERIC_FIELDS:
        value, note, is_disagreement = _reconcile_numeric_field(contributing, primary, field)
        result[field] = value
        if note:
            annotations.append(note)
            has_warning = has_warning or is_disagreement

    # Derived from Resonance Wavelength, which the loop above may just have
    # changed via majority vote -- recompute rather than keep primary's copy.
    result["Spectral Range"] = schema.spectral_range(result["Resonance Wavelength (nm)"])

    # A record a reviewer would otherwise see marked "Approve (AI)" must not
    # hide the fact that some other field is actually contested, or that a
    # value was computed rather than read -- force human attention instead
    # of letting the AI's own self-assessment (which only ever saw ONE run)
    # override what the cross-run comparison found. Exclude is a stronger,
    # separate flag and is left alone.
    if has_warning and result.get("Review status") == "Approve (AI)":
        result["Review status"] = "Edit"
        annotations.append(
            f"Review status forced to Edit: {result['Calculated Fields']} (calculated, not read directly)."
            if result["Calculated Fields"]
            else "Review status forced to Edit: at least one field disagreed across runs (see above)."
        )

    # Notes stays exactly what the model wrote for the winning run (user-
    # facing, about the science) -- reconciliation bookkeeping (run
    # disagreements, dropped/extra rows) goes in its own column instead,
    # since Notes is surfaced directly to end users in the app. The one
    # exception: the forced-Edit case above has no science-content Notes to
    # preserve if the winning run never wrote one, so it gets an explanation
    # instead of an empty "no reason given" banner in the review screen.
    result[_NOTES_FIELD] = primary.get(_NOTES_FIELD)
    if has_warning and result["Review status"] == "Edit" and not result[_NOTES_FIELD]:
        result[_NOTES_FIELD] = (
            f"Downgraded to Edit: {result['Calculated Fields']} (calculated, not read directly)."
            if result["Calculated Fields"]
            else "Downgraded to Edit: one or more fields disagreed across extraction "
            "runs -- see the flagged field(s) below."
        )
    result[_LOG_FIELD] = "\n".join(annotations) if annotations else None
    return result


def _reconcile_set_field(contributing: list[dict], field: str) -> tuple[str | None, str | None]:
    per_run_sets = [
        {tok.strip() for tok in (rec.get(field) or "").split(";") if tok.strip()}
        for rec in contributing
    ]
    per_run_sets = [s for s in per_run_sets if s]
    if not per_run_sets:
        return None, None

    n = len(per_run_sets)
    all_tokens: set[str] = set()
    for s in per_run_sets:
        all_tokens |= s
    threshold = math.ceil(n / 2)
    kept = sorted(tok for tok in all_tokens if sum(tok in s for s in per_run_sets) >= threshold)
    value = ";".join(kept) if kept else None

    if len({frozenset(s) for s in per_run_sets}) > 1:
        raw = [";".join(sorted(s)) for s in per_run_sets]
        note = (
            f"{field} disagreed across runs: {' / '.join(raw)} — used tokens "
            f"appearing in >= {threshold}/{n} runs."
        )
    else:
        note = None
    return value, note


def _reconcile_scalar_field(
    contributing: list[dict], primary: dict, field: str
) -> tuple[object, str | None]:
    values = [rec.get(field) for rec in contributing]
    normalized = [(str(v).strip().lower() if v is not None else None) for v in values]

    if len(set(normalized)) <= 1:
        return primary.get(field), None

    tally = Counter(v for v in values if v is not None)
    chosen = primary.get(field)
    if tally:
        best_count = max(tally.values())
        winners = [v for v, c in tally.items() if c == best_count]
        if len(winners) == 1 and best_count > len(contributing) / 2:
            chosen = winners[0]
        # else: a true tie (or no strict majority) -- primary wins, per plan.

    note = f'{field} disagreed across runs: {", ".join(str(v) for v in values)} — used "{chosen}".'
    return chosen, note


def _values_match(a: object, b: object) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    try:
        return abs(float(a) - float(b)) < _EPSILON
    except (TypeError, ValueError):
        return a == b


def _reconcile_numeric_field(
    contributing: list[dict], primary: dict, field: str
) -> tuple[object, str | None, bool]:
    """Returns (value, note, is_disagreement) -- is_disagreement is True only
    for the no-2-of-N-match case (a real, unresolved contradiction), not for
    the "2/3 runs agreed" partial-agreement FYI, so callers can tell which
    notes actually warrant downgrading Review status."""
    values = [rec.get(field) for rec in contributing]

    # Cluster values by numeric match. With at most 3 runs this is cheap;
    # index order within a cluster follows run order, so the first index
    # in the largest cluster is the earliest-run (and thus
    # primary-preferring, since primary is always index 0) agreeing run.
    clusters: list[list[int]] = []
    for i, vi in enumerate(values):
        for cluster in clusters:
            if _values_match(values[cluster[0]], vi):
                cluster.append(i)
                break
        else:
            clusters.append([i])
    largest = max(clusters, key=len)

    def summary() -> str:
        return ", ".join(f"run{i + 1}={v}" for i, v in enumerate(values))

    if len(largest) >= 2:
        value = values[min(largest)]
        note = None
        if len(largest) < len(values):
            note = f"{field}: {len(largest)}/{len(values)} runs agreed — {summary()}."
        return value, note, False

    # No 2-of-N agreement anywhere: never silently null or average --
    # fall back to the primary run's own value and flag it loudly.
    note = (
        f"{field} DISAGREEMENT (no 2/{len(values)} match): {summary()}. "
        f"Used run1's value — verify manually."
    )
    return primary.get(field), note, True
