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
  /\b(ref|id|title|quotes?|evidence|page|notes?|model(\s*used)?|comments?|source|location|domain|reported|review(\s*status)?|definition)\b/i;

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
 * Best-effort guess for a sensible default Y-axis column: prioritizes
 * FOM value when present, then Q-factor, then falls back to the first
 * numeric column found.
 */
export function guessDefaultYAxis(numericColumns: string[]): string | null {
  const fomValueLike = numericColumns.find((c) => /fom\s*value/i.test(c));
  const fomLike = fomValueLike || numericColumns.find((c) => /fom/i.test(c));
  if (fomLike) return fomLike;
  const qFactorLike = numericColumns.find((c) => /q[-\s]?factor/i.test(c));
  return qFactorLike || numericColumns[0] || null;
}

/**
 * Best-effort guess for a sensible default X-axis column: prioritizes the
 * structure/material categorical-column logic (Layer Structure, when
 * present, gives the intended one-dot-per-sample layout), falling back to
 * a numeric Sensitivity column only when no categorical column exists at
 * all.
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
  numericColumns: string[] = [],
): string | null {
  if (categoricalColumns.length > 0) {
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

  const sensitivityLike = numericColumns.find((c) => /sensitivity/i.test(c));
  return sensitivityLike || numericColumns[0] || null;
}

/**
 * Best-effort guess for a sensible default "Group / Color by" column: none.
 * Auto-grouping by Material Class or Origin made the legend and per-point
 * colors hard to reason about (a single ungrouped series suddenly split
 * into several colors with no obvious cause) — grouping is now always an
 * explicit, opt-in choice from the "Group / Color by" dropdown.
 */
export function guessDefaultColorGroup(_categoricalColumns: string[]): string | null {
  return null;
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

export function findMaterialClassColumn(columns: string[]): string | null {
  return columns.find((c) => /material\s*class/i.test(c)) ?? null;
}

/**
 * "Base Materials" (e.g. "Au;SiO2") is the same shape of problem as
 * Material Class: a composite, semicolon/comma-separated cell that should
 * filter and group by its individual tokens rather than the raw combined
 * string. Matched separately from findMaterialClassColumn so a sheet with
 * both columns keeps them as distinct filters/groupings.
 */
export function findBaseMaterialsColumn(columns: string[]): string | null {
  return columns.find((c) => /base\s*materials?/i.test(c)) ?? null;
}

export function findSensitivityColumn(columns: string[]): string | null {
  return columns.find((c) => /sensitivity/i.test(c)) ?? null;
}

export function findQFactorColumn(columns: string[]): string | null {
  return columns.find((c) => /q[-\s]?factor/i.test(c)) ?? null;
}

export function findFomValueColumn(columns: string[]): string | null {
  return columns.find((c) => /fom\s*value/i.test(c)) ?? null;
}

export function findLayerStructureColumn(columns: string[]): string | null {
  return columns.find((c) => /layer\s*structure/i.test(c)) ?? null;
}

/**
 * Locates the "Evidence" column (the exact quoted text fragment backing the
 * extracted metrics), if present. Kept out of the chart tooltip (too much
 * text for a hover popup) -- used instead to pre-fill an annotation's note
 * field when a point gets pinned (see VisualizationView's handlePointClick).
 */
export function findEvidenceColumn(columns: string[]): string | null {
  return columns.find((c) => /\bevidence\b/i.test(c)) ?? null;
}

/**
 * Locates the "Notes" column (short clarifications, e.g. "FWHM calculated
 * from S/FOM"), if present -- same treatment as Evidence: not shown in the
 * hover tooltip, pre-filled into an annotation's note field on pin instead.
 */
export function findNotesColumn(columns: string[]): string | null {
  return columns.find((c) => /\bnotes?\b/i.test(c)) ?? null;
}

/**
 * Locates the "FOM reported" QA flag column (Yes/No/Unclear), if present —
 * drives the dashed-outline data-quality marker on uncertain points.
 */
export function findReportedColumn(columns: string[]): string | null {
  return columns.find((c) => /\breported\b/i.test(c)) ?? null;
}

/**
 * Locates the "Review status" column (Approve/Edit/Exclude), if present —
 * a human-review workflow flag, not a plottable category (see
 * METADATA_COLUMN_PATTERN, which excludes it from axis/group-by choices).
 * "Edit" marks a record whose FWHM was calculated/estimated rather than
 * read directly from the paper, so it drives the same dashed-outline
 * data-quality marker as an "Unclear" FOM Reported flag.
 */
export function findReviewStatusColumn(columns: string[]): string | null {
  return columns.find((c) => /review\s*status/i.test(c)) ?? null;
}

/**
 * Locates the "Short Title" column, if present — a concise (<=6 word)
 * version of the paper's title meant for compact UI display (e.g. the
 * Compare pinned points table), as opposed to the full "Title" column.
 */
export function findShortTitleColumn(columns: string[]): string | null {
  return columns.find((c) => /short\s*title/i.test(c)) ?? null;
}

/**
 * Columns worth surfacing in the point tooltip beyond the axes already on
 * display — a researcher comparing FOM records usually wants Sensitivity/
 * Q-factor/FOM Value/Layer Structure/Spectral Range/Origin alongside it without re-plotting.
 * Matched by keyword since exact header text varies across harmonized exports.
 */
export function findTooltipExtraColumns(columns: string[]): string[] {
  const patterns = [/sensitivity/i, /q[-\s]?factor/i, /fom\s*value/i, /layer\s*structure/i, /spectral\s*range/i, /\borigin\b/i];
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
 * Splits a composite cell value like "Dielectric;Metal" or "Dielectric, Metal"
 * on ; or , into trimmed, non-empty tokens. Single-value cells return a
 * one-element array unchanged.
 */
export function tokenizeValue(value: unknown): string[] {
  if (value === null || value === undefined || value === "") return [];
  return String(value)
    .split(/[;,]/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Sorted, de-duplicated set of individual tokens across a column, splitting
 * composite cells (see tokenizeValue) — the chip list for a filter like
 * Material Class must offer "Dielectric" and "Metal" separately even when
 * every row that has "Metal" stores it combined as "Dielectric;Metal".
 */
export function tokenizedDistinctValues(rows: DataRow[], column: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    for (const token of tokenizeValue(row[column])) values.add(token);
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
 *
 * Composite columns (Material Class, Base Materials — see
 * findMaterialClassColumn/findBaseMaterialsColumn) are always offered
 * regardless of cardinality: grouping by one of them splits composite cells
 * like "Dielectric;Metal" into their individual tokens (see FomChart's
 * isGroupingByCompositeColumn), and a sheet can legitimately have more
 * than MAX_GROUPABLE_CATEGORIES distinct base materials (Au, Ag, SiO2,
 * Si3N4, Ta2O5, ...) — excluding the option entirely would be worse than
 * the accepted tradeoff of the palette repeating colors past 7 groups.
 */
export function groupableColumns(
  rows: DataRow[],
  categoricalColumns: string[],
  compositeColumns: (string | null)[] = [],
): string[] {
  return categoricalColumns.filter((col) => {
    if (compositeColumns.includes(col)) return true;
    return distinctValues(rows, col).length <= MAX_GROUPABLE_CATEGORIES;
  });
}