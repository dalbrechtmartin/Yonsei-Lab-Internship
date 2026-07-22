"""Majority-vote reconciliation across multiple independent LLM extraction
runs of the SAME PDF, to counter the non-determinism observed even at
temperature=0 (see docs/Model_Comparison_Lite_vs_Flash_v2.md: identical
duplicate PDFs produced different Material Class / Spectral Range
classifications, and even different row counts, across runs).
"""

import math
from collections import Counter
from typing import Optional

# Free-text fields are never voted on: comparing structurally-unstable
# free text (different valid phrasings of the same real thing, e.g.
# "R1 mode (Simulation)" vs "Simulation - Peak R1 (TD)") across runs would
# produce noise, not a signal. Always take the primary run's value
# verbatim. Mode/Case is the field this was explicitly designed for;
# Layer Structure and FOM Definition have the identical free-text-drift
# problem and get the same treatment.
_FREE_TEXT_PRIMARY_ONLY_FIELDS = ("Mode/Case", "Layer Structure", "FOM Definition")

# ";"-joined sets: reconciled at the token level.
_SET_JOINED_FIELDS = ("Material Class", "Base Materials")

# Simple scalar fields, reconciled by majority vote.
_SCALAR_CATEGORICAL_FIELDS = (
    "Ref",
    "Title",
    "Spectral Range",
    "Origin",
    "FOM Reported",
    "FOM Domain",
    "Model Used",
)

# (value, quote, page) triplets that must move together as one atomic unit
# -- never mix a value from one run with a quote from another.
_NUMERIC_TRIPLETS = (
    ("Wavelength-based FOM (/RIU)", "FOM Quote", "FOM Page"),
    ("Sensitivity (nm/RIU)", "Sensitivity Quote", "Sensitivity Page"),
    ("Q-factor", "Q-factor Quote", "Q-factor Page"),
)

_NOTES_FIELD = "Notes"
_EPSILON = 1e-6


def reconcile_runs(runs: list[list[dict]]) -> list[dict]:
    """Merges 1-3 independent extraction runs of the same PDF into one
    final list of records.

    Rows are aligned by (Origin, rank-within-origin-within-run) rather
    than by the free-text "Mode/Case" label, which is confirmed unstable
    across runs. Each field is then reconciled with a strategy suited to
    its type, and every disagreement is annotated into the merged
    record's "Notes" rather than silently resolved, so the output stays
    human-auditable.

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

    if is_extra_row:
        annotations.append(
            f"Only found in 1 of {total_runs} runs (extra row beyond the modal "
            f"row count for this Origin) — needs human verification."
        )
    elif len(contributing) < total_runs:
        annotations.append(f"Only {len(contributing)} of {total_runs} runs contained this row.")

    for field in _FREE_TEXT_PRIMARY_ONLY_FIELDS:
        result[field] = primary.get(field)

    for field in _SET_JOINED_FIELDS:
        value, note = _reconcile_set_field(contributing, field)
        result[field] = value
        if note:
            annotations.append(note)

    for field in _SCALAR_CATEGORICAL_FIELDS:
        value, note = _reconcile_scalar_field(contributing, primary, field)
        result[field] = value
        if note:
            annotations.append(note)

    for value_field, quote_field, page_field in _NUMERIC_TRIPLETS:
        value, quote, page, note = _reconcile_numeric_triplet(
            contributing, primary, value_field, quote_field, page_field
        )
        result[value_field], result[quote_field], result[page_field] = value, quote, page
        if note:
            annotations.append(note)

    result[_NOTES_FIELD] = _merge_notes(primary.get(_NOTES_FIELD), annotations)
    return result


def _reconcile_set_field(contributing: list[dict], field: str) -> tuple[Optional[str], Optional[str]]:
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
            f'{field} disagreed across runs: {" / ".join(raw)} — used tokens '
            f"appearing in >= {threshold}/{n} runs."
        )
    else:
        note = None
    return value, note


def _reconcile_scalar_field(
    contributing: list[dict], primary: dict, field: str
) -> tuple[object, Optional[str]]:
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


def _reconcile_numeric_triplet(
    contributing: list[dict],
    primary: dict,
    value_field: str,
    quote_field: str,
    page_field: str,
) -> tuple[object, object, object, Optional[str]]:
    triplets = [
        (rec.get(value_field), rec.get(quote_field), rec.get(page_field)) for rec in contributing
    ]

    # Cluster triplets by matching value. With at most 3 runs this is
    # cheap; index order within a cluster follows run order, so the
    # first index in the largest cluster is the earliest-run (and thus
    # primary-preferring, since primary is always index 0) agreeing run.
    clusters: list[list[int]] = []
    for i, (vi, _, _) in enumerate(triplets):
        for cluster in clusters:
            if _values_match(triplets[cluster[0]][0], vi):
                cluster.append(i)
                break
        else:
            clusters.append([i])
    largest = max(clusters, key=len)

    def summary() -> str:
        return ", ".join(f"run{i + 1}={v} (p.{p})" for i, (v, _, p) in enumerate(triplets))

    if len(largest) >= 2:
        chosen_idx = min(largest)
        value, quote, page = triplets[chosen_idx]
        note = None
        if len(largest) < len(triplets):
            note = f"{value_field}: {len(largest)}/{len(triplets)} runs agreed — {summary()}."
        return value, quote, page, note

    # No 2-of-N agreement anywhere: never silently null or average --
    # fall back to the primary run's own triplet and flag it loudly.
    # This is the exact shape of the paper-65 bug (a Delta-l=25nm quote
    # attributed to a Delta-l=20nm row) that motivated this rule.
    note = (
        f"{value_field} DISAGREEMENT (no 2/{len(triplets)} match): {summary()}. "
        f"Used run1's value — verify manually."
    )
    return primary.get(value_field), primary.get(quote_field), primary.get(page_field), note


def _merge_notes(primary_notes: object, annotations: list[str]) -> Optional[str]:
    parts = []
    if primary_notes:
        parts.append(str(primary_notes))
    parts.extend(f"[Reconciliation] {a}" for a in annotations)
    return " ".join(parts) if parts else None
