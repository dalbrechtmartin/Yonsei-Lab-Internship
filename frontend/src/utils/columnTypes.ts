export type DataRow = Record<string, unknown>;

export interface ColumnTypes {
  numeric: string[];
  categorical: string[];
}

/**
 * Columns that carry provenance/bookkeeping/validation data (citation refs,
 * quoted evidence text, page numbers, free-text notes, which model produced
 * the row, the free-text FOM definition, the reported/unreported QA flag,
 * the Domain classification...) rather than a plottable quantity or
 * dimension. Harmonized exports (e.g. the PDF-extraction output) are full
 * of these; they must never show up as an axis/group-by choice even though
 * "Sensitivity Page" parses as a number and "Notes" reads as text.
 * Domain and Origin get their own dedicated filter UI (see
 * findDomainColumn/findOriginColumn below) instead of being axis choices —
 * Origin stays out of this pattern on purpose so it can still double as a
 * "Group / Color by" option, which is the whole point of separating EXP
 * from SIM records visually.
 */
const METADATA_COLUMN_PATTERN =
  /\b(ref|id|title|quotes?|evidence|page|notes?|model(\s*used)?|comments?|source|location|domain|reported|definition)\b/i;

export function isMetadataColumn(column: string): boolean {
  return METADATA_COLUMN_PATTERN.test(column);
}

/**
 * Columns worth dropping specifically from the *export* — narrower
 * than isMetadataColumn on purpose. A researcher exporting "the filtered
 * dataset" still wants Ref/Title (which record is this?), Domain/Origin/
 * FOM Reported (why was it included/excluded?), and FOM Definition (what
 * formula did the author use?) — those are real analysis context, not
 * noise. What's actually unreadable clutter in a spreadsheet are the long
 * verbatim quote paragraphs, page numbers, and pipeline bookkeeping
 * (which LLM produced this row) — useful for auditing one record in the
 * app's tooltip, not for scanning a table of dozens of rows in Excel.
 */
const EXPORT_NOISE_PATTERN =
  /\b(quotes?|page|notes?|model(\s*used)?|comments?|source|location)\b/i;

export function isExportNoiseColumn(column: string): boolean {
  return EXPORT_NOISE_PATTERN.test(column);
}

/** Columns to include in the exported file — the full column list minus export noise (see isExportNoiseColumn). */
export function filterExportColumns(columns: string[]): string[] {
  return columns.filter((col) => !isExportNoiseColumn(col));
}

/**
 * Detects which columns are numeric vs categorical by sampling the data.
 * This is what makes the app work with ANY uploaded spreadsheet — the
 * golden 4-column file, the richer harmonized export, or anything a
 * researcher drags in — without hardcoding column names anywhere.
 * Metadata columns (see isMetadataColumn) are excluded from both buckets
 * so they never appear as an axis/group-by candidate.
 */
export function detectColumnTypes(rows: DataRow[], columns: string[]): ColumnTypes {
  const numeric: string[] = [];
  const categorical: string[] = [];

  for (const col of columns) {
    if (isMetadataColumn(col)) continue;

    const sample = rows
      .map((row) => row[col])
      .filter((v) => v !== null && v !== undefined && v !== "");

    if (sample.length === 0) {
      categorical.push(col); // nothing to judge by, default to categorical
      continue;
    }

    const numericCount = sample.filter(
      (v) =>
        typeof v === "number" ||
        (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))),
    ).length;

    // Consider it numeric if most non-empty values parse as numbers.
    if (numericCount / sample.length > 0.8) {
      numeric.push(col);
    } else {
      categorical.push(col);
    }
  }

  return { numeric, categorical };
}

/**
 * Best-effort guess for a sensible default Y-axis column: prefers a
 * numeric column whose name contains "FOM", falls back to the first
 * numeric column found.
 */
export function guessDefaultYAxis(numericColumns: string[]): string | null {
  const fomLike = numericColumns.find((c) => /fom/i.test(c));
  return fomLike || numericColumns[0] || null;
}

/**
 * Best-effort guess for a sensible default X-axis column: among the
 * structure/material-like columns (falling back to all categorical columns
 * if none match), picks the most granular one — the one with the most
 * distinct values relative to row count.
 *
 * Cardinality matters here, not just name: on a harmonized export,
 * "Material Class" (a handful of coarse buckets like "Dielectric;Metal")
 * matches the same keyword as "Layer Structure" (near-unique per record),
 * but using the coarse one as X-axis collapses many unrelated samples onto
 * the same tick, stacking their points and dot labels on top of each
 * other. The granular column is what reproduces the intended one-dot-per-
 * sample layout.
 */
export function guessDefaultXAxis(
  rows: DataRow[],
  categoricalColumns: string[],
): string | null {
  if (categoricalColumns.length === 0) return null;

  const structureLike = categoricalColumns.filter((c) =>
    /material|structure|layer|층|class/i.test(c),
  );
  const candidates = structureLike.length > 0 ? structureLike : categoricalColumns;

  let best = candidates[0];
  let bestCount = -1;
  for (const col of candidates) {
    const count = distinctValues(rows, col).length;
    if (count > bestCount) {
      bestCount = count;
      best = col;
    }
  }
  return best;
}

/**
 * Best-effort guess for a sensible default "Group / Color by" column.
 * Only defaults to Origin (EXP vs SIM) — the one grouping Phase 1 actually
 * requires researchers be able to tell apart — rather than picking any
 * arbitrary categorical column, which would just duplicate whatever was
 * chosen for the X-axis.
 */
export function guessDefaultColorGroup(categoricalColumns: string[]): string | null {
  return categoricalColumns.find((c) => /\borigin\b/i.test(c)) ?? null;
}

/**
 * Locates the Domain (wavelength/frequency/unclear) and Origin (EXP/SIM)
 * columns in an uploaded sheet, if present. These drive the Phase 1
 * "Domain control" / "Origin control" filters — required so wavelength and
 * frequency-domain records, or experimental and simulated ones, can be
 * viewed separately rather than mixed on the same plot.
 */
export function findDomainColumn(columns: string[]): string | null {
  return columns.find((c) => /\bdomain\b/i.test(c)) ?? null;
}

export function findOriginColumn(columns: string[]): string | null {
  return columns.find((c) => /\borigin\b/i.test(c)) ?? null;
}

/**
 * Locates the "FOM reported" QA flag column (Yes/No/Unclear), if present —
 * drives the dashed-outline data-quality marker on uncertain points.
 */
export function findReportedColumn(columns: string[]): string | null {
  return columns.find((c) => /\breported\b/i.test(c)) ?? null;
}

/**
 * Columns worth surfacing in the point tooltip beyond the axes already on
 * display — a researcher comparing FOM records usually wants Sensitivity/
 * Q-factor/Spectral Range/Origin alongside it without re-plotting. Matched
 * by keyword since exact header text varies across harmonized exports.
 */
export function findTooltipExtraColumns(columns: string[]): string[] {
  const patterns = [/sensitivity/i, /q[-\s]?factor/i, /spectral\s*range/i, /\borigin\b/i];
  const found: string[] = [];
  for (const pattern of patterns) {
    const col = columns.find((c) => pattern.test(c));
    if (col && !found.includes(col)) found.push(col);
  }
  return found;
}

/** Sorted, de-duplicated, non-empty values found in a column. */
export function distinctValues(rows: DataRow[], column: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    const v = row[column];
    if (v === null || v === undefined || v === "") continue;
    values.add(String(v));
  }
  return Array.from(values).sort();
}

/**
 * The chart's color palette (Okabe-Ito, colorblind-safe) has 7 distinct
 * series colors — see okabe-ito-palette.json. Past that many groups, colors
 * start repeating and the legend actively lies: two unrelated categories
 * (e.g. "Experimental" and "aGST sensor") end up rendered in the same
 * color. Keep this in sync with that palette's length.
 */
export const MAX_GROUPABLE_CATEGORIES = 7;

/**
 * Categorical columns worth offering in "Group / Color by": ones with few
 * enough distinct values that every group still gets its own color. A
 * column like "Mode/Case" — often near one distinct value per row — is
 * exactly what makes a good X-axis (see guessDefaultXAxis) but a useless,
 * cluttered legend.
 */
export function groupableColumns(rows: DataRow[], categoricalColumns: string[]): string[] {
  return categoricalColumns.filter(
    (col) => distinctValues(rows, col).length <= MAX_GROUPABLE_CATEGORIES,
  );
}