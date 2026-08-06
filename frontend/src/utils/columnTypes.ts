import { parseLayerStructure } from "./layerStructure";

export type DataRow = Record<string, unknown>;

export interface ColumnTypes {
  numeric: string[];
  categorical: string[];
}

/**
 * Columns that carry provenance/bookkeeping/validation data (citation refs,
 * quoted evidence text, page numbers, free-text notes, which model produced
 * the row, the reconciliation pipeline's own run-disagreement log, the
 * free-text FOM definition, the Domain classification, the free-text Mode
 * Description...) rather than a plottable quantity or dimension. Harmonized
 * exports (e.g. the PDF-extraction output) are full of these; they must
 * never show up as an axis/group-by choice even though "Location" parses as
 * text and "Notes" reads as text.
 * Domain and Origin get their own dedicated filter UI (see
 * findDomainColumn/findOriginColumn below) instead of being axis choices —
 * Origin stays out of this pattern on purpose so it can still double as a
 * "Group / Color by" option, which is the whole point of separating EXP
 * from SIM records visually.
 * Mode Description is excluded here for the same reason as Evidence/Notes:
 * near-unique free text per row makes an unreadable axis/legend, but it's
 * still surfaced individually in the chart tooltip and pinned annotations
 * (see findModeDescriptionColumn / annotationFields.ts). Mode ID is NOT
 * excluded — it's a short label (e.g. "Mode 1") genuinely useful as an
 * X-axis or "Group / Color by" choice once filtered down to one paper's
 * rows (see groupableColumns' exemptColumns).
 * A bare "id" is excluded too (a generic row-id column), but not when it's
 * part of "Mode ID".
 */
const METADATA_COLUMN_PATTERN =
  /\b(ref|title|quotes?|evidence|page|notes?|model(\s*used)?|comments?|source|location|domain|review(\s*status)?|definition|mode\s*description|reconciliation(\s*log)?)\b/i;
const GENERIC_ID_PATTERN = /(?<!mode\s)\bid\b/i;

export function isMetadataColumn(column: string): boolean {
  return METADATA_COLUMN_PATTERN.test(column) || GENERIC_ID_PATTERN.test(column);
}

/**
 * Columns worth dropping specifically from the *export* — narrower
 * than isMetadataColumn on purpose. A researcher exporting "the filtered
 * dataset" still wants Ref/Title (which record is this?), Domain/Origin
 * (why was it included/excluded?), and Definition (what formula did the
 * author use?) — those are real analysis context, not noise. What's
 * actually unreadable clutter in a spreadsheet are the long verbatim quote
 * paragraphs, page numbers, and pipeline bookkeeping (which LLM produced
 * this row) — useful for auditing one record in the app's tooltip, not for
 * scanning a table of dozens of rows in Excel.
 */
const EXPORT_NOISE_PATTERN =
  /\b(quotes?|page|notes?|model(\s*used)?|comments?|source|location|reconciliation(\s*log)?)\b/i;

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

    // Mode ID is a plain integer in the harmonized export (1, 2, 3 --
    // normalized from whatever label style the paper used, e.g. "Mode
    // A"/"Peak 1", see backend/prompt.txt), but it's semantically a
    // discrete label disambiguating a paper's rows, not a continuous
    // quantity -- force it categorical so it keeps working as an X-axis/
    // "Group / Color by" choice instead of being treated like a metric.
    if (findModeIdColumn([col])) {
      categorical.push(col);
      continue;
    }

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
 * FOM when present, then Q-factor, then falls back to the first
 * numeric column found.
 */
export function guessDefaultYAxis(numericColumns: string[]): string | null {
  const fomLike = numericColumns.find((c) => /\bfom\b/i.test(c));
  if (fomLike) return fomLike;
  const qFactorLike = numericColumns.find((c) => /q[-\s]?factor/i.test(c));
  return qFactorLike || numericColumns[0] || null;
}

/**
 * Best-effort guess for a sensible default X-axis column: prioritizes
 * Resonance Wavelength when present -- comparing FOM (or Q-factor/
 * Sensitivity) against it across papers is this tool's own flagship
 * example (see the user guide's worked scenario, and guessDefaultYAxis's
 * matching FOM-first preference), a scientifically meaningful axis that
 * works for essentially any dataset in scope. Falls back to the structure/
 * material categorical-column logic (Layer Structure, when present, gives
 * a one-dot-per-sample layout) for sheets without it, and finally to a
 * numeric Sensitivity column when no categorical column exists either.
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
  const resonanceWavelength = findResonanceWavelengthColumn(numericColumns);
  if (resonanceWavelength) return resonanceWavelength;

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

/**
 * Locates the "Mode ID" column (e.g. "Mode 1", "Peak 3") — the strict
 * numbered identifier that disambiguates several rows extracted from the
 * very same paper. Near-unique per row (see groupableColumns), so it's
 * excluded from "Group / Color by" by cardinality alone, but it's exactly
 * the context a researcher needs to make sense of why a paper shows up
 * more than once — surfaced in the point tooltip and on pinned annotations
 * (see findTooltipExtraColumns / annotationFields.ts).
 */
export function findModeIdColumn(columns: string[]): string | null {
  return columns.find((c) => /\bmode\s*id\b/i.test(c)) ?? null;
}

/**
 * Locates the "Mode Description" column (e.g. "Resonance peak P1 Fano
 * mode") — the free-text companion to Mode ID, describing what that
 * specific configuration/peak actually is.
 */
export function findModeDescriptionColumn(columns: string[]): string | null {
  return columns.find((c) => /mode\s*description/i.test(c)) ?? null;
}

export function findSensitivityColumn(columns: string[]): string | null {
  return columns.find((c) => /sensitivity/i.test(c)) ?? null;
}

export function findQFactorColumn(columns: string[]): string | null {
  return columns.find((c) => /q[-\s]?factor/i.test(c)) ?? null;
}

export function findFwhmColumn(columns: string[]): string | null {
  return columns.find((c) => /\bfwhm\b/i.test(c)) ?? null;
}

export function findFomValueColumn(columns: string[]): string | null {
  return columns.find((c) => /\bfom\b/i.test(c)) ?? null;
}

export function findResonanceWavelengthColumn(columns: string[]): string | null {
  return columns.find((c) => /resonance\s*wavelength/i.test(c)) ?? null;
}

/**
 * Locates the "Spectral Range" column (UV/Visible/NIR/MIR/FIR-THz), if
 * present -- derived server-side from Resonance Wavelength (see
 * backend/schema.py's spectral_range), so it's genuinely a measurement
 * worth always showing alongside it (tooltip, pins, exports), not
 * metadata/bookkeeping.
 */
export function findSpectralRangeColumn(columns: string[]): string | null {
  return columns.find((c) => /spectral\s*range/i.test(c)) ?? null;
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
 * Locates the "Review status" column (Approve/Edit/Exclude), if present —
 * a human-review workflow flag, not a plottable category (see
 * METADATA_COLUMN_PATTERN, which excludes it from axis/group-by choices).
 * "Edit" marks a record whose FWHM/Sensitivity was estimated, converted
 * from incompatible units, or otherwise ambiguous, so it drives the
 * dashed-outline data-quality marker on uncertain points.
 */
export function findReviewStatusColumn(columns: string[]): string | null {
  return columns.find((c) => /review\s*status/i.test(c)) ?? null;
}

/**
 * A row is flagged "needs review" when its Review status cell reads
 * "Edit" (see findReviewStatusColumn) -- shared by FomChart's dashed-
 * outline marker and VisualizationView's "hide points needing review"
 * filter, so both agree on exactly the same rows.
 */
export function isNeedsReviewRow(row: DataRow, reviewStatusColumn: string | null): boolean {
  if (!reviewStatusColumn) return false;
  const v = row[reviewStatusColumn];
  return typeof v === "string" && /^edit$/i.test(v.trim());
}

/**
 * Marks a row added through the "Add data" dialog (Active Benchmarking) as
 * manually entered rather than sourced from the uploaded file/paper -- read
 * by FomChart (distinct diamond marker + gold outline), the data points
 * table (Remove instead of Hide), and the export helpers (Source column).
 * Never a real spreadsheet column: it's set directly on the in-memory row
 * object, not read from `columns`, so it never appears in fomColumns /
 * detectColumnTypes / any axis-or-group-by picker.
 */
export const MANUAL_ROW_FLAG = "__manual";

export function isManualRow(row: DataRow): boolean {
  return row[MANUAL_ROW_FLAG] === true;
}

/** The three marker shapes a point can render as on the chart (see FomChart's symbol resolution). "star" is a custom SVG path -- ECharts has no built-in star symbol. */
export type PointShape = "circle" | "diamond" | "star";

/**
 * Never a real spreadsheet column, same treatment as MANUAL_ROW_FLAG --
 * set directly on the in-memory row so any point (manual or from the
 * literature) can have its marker shape overridden from the point-edit
 * dialog, independent of its origin.
 */
export const POINT_SHAPE_FLAG = "__shape";

/** A row with no explicit choice keeps today's convention: manual points default to a diamond, everything else to a circle. */
export function pointShape(row: DataRow): PointShape {
  const explicit = row[POINT_SHAPE_FLAG];
  if (explicit === "circle" || explicit === "diamond" || explicit === "star") return explicit;
  return isManualRow(row) ? "diamond" : "circle";
}

/**
 * Marks a row (manual or literature-sourced alike) whose values were changed
 * through the point-edit dialog after the fact -- surfaced as a small
 * "modified" badge (DataPointsTable, the edit dialog itself) so an edited
 * literature value is never mistaken for what the paper/AI extraction
 * actually said. Deliberately separate from "Review status" (see
 * findReviewStatusColumn) -- that flag is the paper's own extraction-quality
 * signal; this one is about a researcher's own after-the-fact correction and
 * must not be conflated with or overwritten by it.
 */
export const EDITED_ROW_FLAG = "__edited";
/** Snapshot of every field's pre-edit value, taken once on the first edit (see snapshotOriginal) -- what "reset this point" (see revertToOriginal) restores from. Never touched by the general workspace Reset, only by that point's own revert action. */
export const ORIGINAL_SNAPSHOT_FLAG = "__original";

export function isEditedRow(row: DataRow): boolean {
  return row[EDITED_ROW_FLAG] === true;
}

/** Takes the one-time snapshot an edited row reverts to -- a no-op on a row that's already been edited before, so a second/third edit doesn't overwrite the ORIGINAL original with an already-modified version. */
function snapshotOriginal(row: DataRow): void {
  if (row[ORIGINAL_SNAPSHOT_FLAG] !== undefined) return;
  row[ORIGINAL_SNAPSHOT_FLAG] = { ...row };
}

/** Applies a patch to a row in place (preserving its object identity, which is what keeps existing pins/hidden-row entries pointing at the same point -- see VisualizationView's rowsEqual), snapshotting its pre-edit state first if this is the first edit. */
export function applyRowEdit(row: DataRow, patch: DataRow): void {
  snapshotOriginal(row);
  Object.assign(row, patch);
  row[EDITED_ROW_FLAG] = true;
}

/** Restores a row to its pre-edit snapshot (see snapshotOriginal) and clears both edit flags -- a no-op if the row was never edited. Distinct from the general workspace Reset, which never touches edited points at all (see VisualizationView's resetWorkspace). */
export function revertToOriginal(row: DataRow): void {
  const original = row[ORIGINAL_SNAPSHOT_FLAG] as DataRow | undefined;
  if (!original) return;
  for (const key of Object.keys(row)) delete row[key];
  Object.assign(row, original);
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
 * display — a researcher comparing FOM records usually wants Resonance
 * Wavelength/FOM/Sensitivity/FWHM/Q-factor/Layer Structure/Origin alongside
 * it without re-plotting. Ordered to match the extraction schema's own
 * COLUMN_ORDER (see backend/schema.py) rather than an arbitrary order --
 * peak position, then the FOM value itself, then the two quantities it's
 * derived from (Sensitivity, FWHM), then Q-factor -- so this list (and
 * everything downstream that renders it top to bottom: the annotation
 * card's Metrics box, the compare table) reads in the same logical order
 * every time. Matched by keyword since exact header text varies across
 * harmonized exports.
 */
export function findTooltipExtraColumns(columns: string[]): string[] {
  const patterns = [
    /resonance\s*wavelength/i,
    /spectral\s*range/i,
    /\bfom\b/i,
    /sensitivity/i,
    /\bfwhm\b/i,
    /q[-\s]?factor/i,
    /layer\s*structure/i,
    /\borigin\b/i,
  ];
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
 * A cell's tokens (see tokenizeValue) restricted to the ones still "kept" by
 * a filter selection — `selected: null` means no restriction (every token
 * kept). Used everywhere a composite column's tokens feed grouping/coloring,
 * so an excluded token never re-surfaces as its own group just because the
 * row survived the lenient composite-filter mode via one of its other
 * tokens (see VisualizationView's compositeFilterMode).
 */
export function keptTokens(value: unknown, selected: string[] | null): string[] {
  const tokens = tokenizeValue(value);
  return selected === null ? tokens : tokens.filter((t) => selected.includes(t));
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
 * enough distinct values that every group still gets its own color. Most
 * near-unique-per-row columns are excluded this way — a useless, cluttered
 * legend — but two kinds are always offered regardless of cardinality
 * (passed in as exemptColumns):
 *
 * - Composite columns (Material Class, Base Materials — see
 *   findMaterialClassColumn/findBaseMaterialsColumn): grouping by one of
 *   them splits composite cells like "Dielectric;Metal" into their
 *   individual tokens (see FomChart's isGroupingByCompositeColumn), and a
 *   sheet can legitimately have more than MAX_GROUPABLE_CATEGORIES distinct
 *   base materials (Au, Ag, SiO2, Si3N4, Ta2O5, ...).
 * - Mode ID (see findModeIdColumn): near-unique across the *whole*
 *   dataset, but the point of grouping by it is almost always after
 *   filtering down to a single paper's rows (comparing its own handful of
 *   modes by color) rather than the full multi-paper dataset — excluding it
 *   would remove that use case entirely just to guard against a legend that
 *   only gets messy in the untargeted case.
 *
 * In both cases, excluding the option entirely would be worse than the
 * accepted tradeoff of the palette repeating colors past 7 groups.
 */
export function groupableColumns(
  rows: DataRow[],
  categoricalColumns: string[],
  exemptColumns: (string | null)[] = [],
): string[] {
  return categoricalColumns.filter((col) => {
    if (exemptColumns.includes(col)) return true;
    return distinctValues(rows, col).length <= MAX_GROUPABLE_CATEGORIES;
  });
}

/**
 * One field of the "Add data" dialog (Active Benchmarking) -- resolves to a
 * real column of the currently loaded dataset, never an invented one, so a
 * manually entered row plots and filters exactly like any other row.
 * `labelKey` names a fomcharts.addPoint.fields.* i18n key for the curated
 * FOM quantities below; left undefined for the two current-axis fields,
 * whose label is instead the axis's own (already researcher-facing) column
 * name -- there's no canonical translation for an arbitrary harmonized
 * export's own metric column.
 */
export interface ManualPointField {
  column: string;
  kind: "numeric" | "text" | "select" | "tags" | "layers";
  labelKey?: string;
  /** Required only for the two axis fields -- without a value there, the
   * point can't be placed on the chart currently being viewed at all. */
  required: boolean;
  /**
   * Suggested/selectable values:
   * - "select": the only choices offered (existing distinct values).
   * - "tags": existing tokens (from the imported file, e.g. Material Class/Base Materials) offered as one-click picks, but not exhaustive -- a new one can always be typed (see Combobox).
   * - "layers": existing per-layer material names across the dataset, same "pick or type new" treatment as "tags".
   */
  options?: string[];
}

/**
 * Curated, fixed set of FOM concepts a manual point can carry -- deliberately
 * narrower than "every column in the file" (see needsAiConversion for that
 * kind of full scan): provenance/bookkeeping columns (Ref, Title, Evidence,
 * Notes, Page, Model used, Review status, ...) are never offered here, since
 * a manually entered sensor has no document to cite (see MANUAL_ROW_FLAG /
 * isManualRow, which stands in for that "reference" instead) -- Notes is the
 * one exception, handled as its own always-present field outside this list
 * (see AddPointDialog), since it's a free note about the manual point itself
 * rather than provenance.
 * Always starts with whichever columns are the CURRENT X and Y axes, even
 * when they're not one of the canonical quantities below (e.g. a bespoke
 * metric in a harmonized export) -- those two are the only fields that must
 * be filled for the point to be plottable on the chart the researcher is
 * currently looking at, so they're required and always offered first. Their
 * kind is still resolved through the same recognized-column matching as
 * every other field below (rather than a blunt numeric-or-text fallback) --
 * otherwise picking, say, Layer Structure as the X-axis would silently lose
 * the structured layer builder and fall back to a free-text input, right
 * when this field is required to plot the point at all.
 * A column absent from `columns` (the loaded file simply doesn't have it)
 * is silently skipped rather than fabricated.
 */
export function buildManualPointFields(
  columns: string[],
  rows: DataRow[],
  xAxis: string | null,
  yAxis: string | null,
  numericColumns: string[],
): ManualPointField[] {
  const materialClassCol = findMaterialClassColumn(columns);
  const baseMaterialsCol = findBaseMaterialsColumn(columns);
  const layerStructureCol = findLayerStructureColumn(columns);
  const domainCol = findDomainColumn(columns);
  const originCol = findOriginColumn(columns);
  const modeIdCol = findModeIdColumn(columns);

  const resolveKind = (column: string): ManualPointField["kind"] => {
    // Mode ID is numeric-only per the extraction schema (see backend/prompt.txt)
    // but detectColumnTypes deliberately forces it categorical so it still works
    // as an X-axis/Group-by choice -- checked ahead of numericColumns here so
    // the Add Point dialog still gives it a proper number input.
    if (column === modeIdCol) return "numeric";
    if (numericColumns.includes(column)) return "numeric";
    if (column === materialClassCol || column === baseMaterialsCol) return "tags";
    if (column === layerStructureCol) return "layers";
    if (column === domainCol || column === originCol) return "select";
    return "text";
  };

  const fields: ManualPointField[] = [];
  const seen = new Set<string>();

  const addField = (column: string | null, opts: { labelKey?: string; required?: boolean } = {}) => {
    if (!column || seen.has(column)) return;
    seen.add(column);
    const kind = resolveKind(column);
    const field: ManualPointField = { column, kind, labelKey: opts.labelKey, required: opts.required ?? false };
    if (kind === "select") field.options = distinctValues(rows, column);
    if (kind === "tags") field.options = tokenizedDistinctValues(rows, column);
    if (kind === "layers") field.options = layerMaterialSuggestions(rows, column, baseMaterialsCol);
    fields.push(field);
  };

  addField(yAxis, { required: true });
  addField(xAxis, { required: true });

  addField(findResonanceWavelengthColumn(columns), { labelKey: "resonanceWavelength" });
  addField(findFomValueColumn(columns), { labelKey: "fom" });
  addField(findSensitivityColumn(columns), { labelKey: "sensitivity" });
  addField(findFwhmColumn(columns), { labelKey: "fwhm" });
  addField(findQFactorColumn(columns), { labelKey: "qFactor" });
  addField(domainCol, { labelKey: "domain" });
  addField(originCol, { labelKey: "origin" });
  // Base Materials before Material Class -- a researcher knows what their
  // sensor is physically made of before they know (or care) which taxonomy
  // bucket it falls under, and a material can genuinely belong to more than
  // one class. Material Class comes second as a verification step: the Add
  // Point dialog pre-suggests whichever class(es) this dataset associates
  // with the materials just picked (see AddPointDialog's suggestedMaterialClasses),
  // and the researcher confirms or adjusts from there.
  addField(baseMaterialsCol, { labelKey: "baseMaterials" });
  addField(materialClassCol, { labelKey: "materialClass" });
  addField(layerStructureCol, { labelKey: "layerStructure" });
  addField(modeIdCol, { labelKey: "modeId" });
  addField(findModeDescriptionColumn(columns), { labelKey: "modeDescription" });

  return fields;
}

/**
 * Candidate material names for the Layer Structure builder's per-layer
 * picker (see LayerStructureField) -- every material already used somewhere
 * in the dataset's own Layer Structure stacks (parsed the same way as the
 * read-only LayerStack visualization, see parseLayerStructure) unioned with
 * Base Materials tokens, since a paper's Base Materials list and its Layer
 * Structure stack name the same substances and a material worth suggesting
 * from one is just as worth suggesting from the other.
 */
export function layerMaterialSuggestions(rows: DataRow[], layerStructureColumn: string | null, baseMaterialsColumn: string | null): string[] {
  const materials = new Set<string>();
  if (layerStructureColumn) {
    for (const row of rows) {
      for (const layer of parseLayerStructure(row[layerStructureColumn])) materials.add(layer.material);
    }
  }
  if (baseMaterialsColumn) {
    for (const token of tokenizedDistinctValues(rows, baseMaterialsColumn)) materials.add(token);
  }
  return Array.from(materials).sort();
}

/**
 * Which Base Materials tokens co-occur with each Material Class token across
 * the loaded dataset's own rows (e.g. a row with Material Class
 * "2D Material" and Base Materials "Graphene" teaches this map that
 * "2D Material" -> "Graphene") -- learned from the data itself rather than a
 * hardcoded taxonomy, same reasoning as Material Class's own options no
 * longer coming from backend/prompt.txt's fixed six-item list. Drives the Add
 * Point dialog's cascading Material Class -> Base Materials suggestion (see
 * AddPointDialog): once a class is picked, Base Materials narrows to what
 * this dataset actually pairs with it, instead of every material in the
 * whole file regardless of class.
 */
export function materialsByClass(rows: DataRow[], materialClassColumn: string | null, baseMaterialsColumn: string | null): Record<string, string[]> {
  const map: Record<string, Set<string>> = {};
  if (!materialClassColumn || !baseMaterialsColumn) return {};
  for (const row of rows) {
    const classes = tokenizeValue(row[materialClassColumn]);
    const materials = tokenizeValue(row[baseMaterialsColumn]);
    if (classes.length === 0 || materials.length === 0) continue;
    for (const cls of classes) {
      map[cls] ??= new Set<string>();
      for (const material of materials) map[cls].add(material);
    }
  }
  const out: Record<string, string[]> = {};
  for (const [cls, set] of Object.entries(map)) out[cls] = Array.from(set).sort();
  return out;
}

/**
 * Decides whether an uploaded sheet needs AI reformatting before
 * visualization -- reuses the same find*Column heuristics the rest of this
 * file already relies on, so "what counts as a recognizable column" stays
 * defined in exactly one place. Triggers when either:
 * - Origin or Domain is entirely absent: these drive Phase 1's "wavelength-
 *   domain by default" filtering (see VisualizationView's applyDefaults) --
 *   without them that filtering silently never applies, rather than
 *   erroring, so it has to be checked for explicitly here.
 * - No numeric metric (Resonance Wavelength/FOM/Sensitivity/Q-factor) is
 *   present at all, or no structure/material categorical column is present
 *   at all -- i.e. there's nothing worth plotting on either axis.
 * A sheet that already has all of these (e.g. the app's own harmonized
 * export) never triggers a conversion call.
 */
export function needsAiConversion(columns: string[]): boolean {
  const hasOrigin = findOriginColumn(columns) !== null;
  const hasDomain = findDomainColumn(columns) !== null;
  const hasMetric =
    findResonanceWavelengthColumn(columns) !== null ||
    findFomValueColumn(columns) !== null ||
    findSensitivityColumn(columns) !== null ||
    findQFactorColumn(columns) !== null;
  const hasStructure =
    findLayerStructureColumn(columns) !== null ||
    findMaterialClassColumn(columns) !== null ||
    findBaseMaterialsColumn(columns) !== null;
  return !hasOrigin || !hasDomain || !hasMetric || !hasStructure;
}

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "-": "⁻",
};

/**
 * Display-only: rewrites a caret exponent like "RIU^-1" into "RIU⁻¹" using
 * real Unicode superscript characters -- source column names keep their
 * literal "^-1" (upload/export/regex matching all depend on that exact
 * text), so this must only ever be applied where a column name is being
 * rendered as text, never to the string used to index a DataRow or to match
 * against a column-detection regex.
 */
export function formatUnitSuperscripts(text: string): string {
  return text.replace(/\^(-?\d+)/g, (_, exponent: string) =>
    [...exponent].map((ch) => SUPERSCRIPT_DIGITS[ch] ?? ch).join(""),
  );
}

/**
 * Splits a column name like "FOM (RIU^-1)" into its bare name ("FOM") and
 * display-ready unit ("RIU⁻¹", already run through formatUnitSuperscripts),
 * for UI that renders the two on separate lines (see AxisSelector). Columns
 * with no trailing "(...)" -- e.g. "Q-factor" -- get a null unit rather than
 * an empty string, so callers can skip rendering a second line entirely.
 */
export function splitColumnUnit(column: string): { name: string; unit: string | null } {
  const match = column.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
  if (!match) return { name: column, unit: null };
  return { name: match[1], unit: formatUnitSuperscripts(match[2]) };
}