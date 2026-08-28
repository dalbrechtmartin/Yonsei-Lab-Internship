// Parses backend's "Reconciliation Log" free text (see reconcile.py's
// _reconcile_slot/_reconcile_set_field/_reconcile_scalar_field/
// _reconcile_numeric_field) into structured, per-field notes so the UI can
// surface each disagreement next to the field it's actually about, instead
// of dumping the whole raw paragraph into Provenance. This is coupled to
// reconcile.py's exact annotation templates -- if those change, the regexes
// below need to change with them; anything that stops matching still shows
// up as a "raw" fallback note rather than silently vanishing.

export type ReconciliationSeverity = "info" | "warning";

export type ReconciliationNote =
  | { fieldKey: string | null; kind: "disagreement"; severity: "warning"; raw: string }
  | {
      fieldKey: string | null;
      kind: "partialAgreement";
      severity: "info";
      agreed: number;
      total: number;
    }
  | { fieldKey: string | null; kind: "fullDisagreement"; severity: "warning"; raw: string }
  | { fieldKey: null; kind: "rowCount"; severity: "info"; count: number; total: number }
  | { fieldKey: null; kind: "extraRow"; severity: "warning"; total: number }
  | { fieldKey: null; kind: "raw"; severity: "info"; raw: string };

// Maps reconcile.py's schema column names (its Ref/Title/.../"FOM (RIU^-1)"
// literals) to this app's camelCase ExtractionRecord keys -- the same keys
// ExtractionDetailField already uses.
const FIELD_NAME_MAP: Record<string, string> = {
  Ref: "ref",
  Title: "title",
  "Short Title": "shortTitle",
  Origin: "origin",
  Domain: "domain",
  "Material Class": "materialClass",
  "Base Materials": "baseMaterials",
  "Mode ID": "modeId",
  "Resonance Wavelength (nm)": "resonanceWavelengthNm",
  "FOM (RIU^-1)": "fomRiuInv",
  "Sensitivity (nm/RIU)": "sensitivityNmPerRiu",
  "FWHM (nm)": "fwhmNm",
  "Q-factor": "qFactor",
  "Model Used": "modelUsed",
};

function mapField(name: string): string | null {
  return FIELD_NAME_MAP[name.trim()] ?? null;
}

const RE_SET_DISAGREEMENT =
  /^(.+?) disagreed across runs: (.+) — used tokens appearing in >= \d+\/\d+ runs\.$/;
const RE_SCALAR_DISAGREEMENT = /^(.+?) disagreed across runs: (.+) — used ".*"\.$/;
const RE_PARTIAL_AGREEMENT = /^(.+?): (\d+)\/(\d+) runs agreed — .+\.$/;
const RE_FULL_DISAGREEMENT =
  /^(.+?) DISAGREEMENT \(no 2\/\d+ match\): (.+)\. Used run1's value — verify manually\.$/;
const RE_EXTRA_ROW =
  /^Only found in 1 of (\d+) runs \(extra row beyond the modal row count for this Origin\) — needs human verification\.$/;
const RE_ROW_COUNT = /^Only (\d+) of (\d+) runs contained this row\.$/;

export function parseReconciliationLog(log: string | null | undefined): ReconciliationNote[] {
  if (!log) return [];
  const notes: ReconciliationNote[] = [];

  for (const line of log.split("\n").map((l) => l.trim())) {
    if (!line) continue;

    let m = line.match(RE_EXTRA_ROW);
    if (m) {
      notes.push({ fieldKey: null, kind: "extraRow", severity: "warning", total: Number(m[1]) });
      continue;
    }

    m = line.match(RE_ROW_COUNT);
    if (m) {
      notes.push({
        fieldKey: null,
        kind: "rowCount",
        severity: "info",
        count: Number(m[1]),
        total: Number(m[2]),
      });
      continue;
    }

    m = line.match(RE_FULL_DISAGREEMENT);
    if (m) {
      notes.push({
        fieldKey: mapField(m[1]),
        kind: "fullDisagreement",
        severity: "warning",
        raw: m[2],
      });
      continue;
    }

    m = line.match(RE_PARTIAL_AGREEMENT);
    if (m) {
      notes.push({
        fieldKey: mapField(m[1]),
        kind: "partialAgreement",
        severity: "info",
        agreed: Number(m[2]),
        total: Number(m[3]),
      });
      continue;
    }

    m = line.match(RE_SCALAR_DISAGREEMENT);
    if (m) {
      notes.push({
        fieldKey: mapField(m[1]),
        kind: "disagreement",
        severity: "warning",
        raw: m[2],
      });
      continue;
    }

    m = line.match(RE_SET_DISAGREEMENT);
    if (m) {
      // raw is just the per-run value lists (e.g. "Si;SiO2 / Si"), matching
      // the shape RE_SCALAR_DISAGREEMENT's raw already has -- NOT the whole
      // line, which already ends in its own period and would otherwise
      // double up with the i18n template's trailing "{values}." below.
      notes.push({ fieldKey: mapField(m[1]), kind: "disagreement", severity: "warning", raw: m[2] });
      continue;
    }

    notes.push({ fieldKey: null, kind: "raw", severity: "info", raw: line });
  }

  return notes;
}

// Groups notes by their mapped field key (null-keyed entries -- record-level
// notes, and notes whose field name didn't map to a known key -- land in
// `general` instead, so nothing found in the log is ever silently dropped).
export function groupReconciliationNotes(notes: ReconciliationNote[]): {
  byField: Map<string, ReconciliationNote[]>;
  general: ReconciliationNote[];
} {
  const byField = new Map<string, ReconciliationNote[]>();
  const general: ReconciliationNote[] = [];
  for (const note of notes) {
    if (note.fieldKey) {
      const list = byField.get(note.fieldKey) ?? [];
      list.push(note);
      byField.set(note.fieldKey, list);
    } else {
      general.push(note);
    }
  }
  return { byField, general };
}
