import { formatUnitSuperscripts, type DataRow } from "./columnTypes";
import type { StructureLayer } from "./layerStructure";

export interface FieldRow {
  key: string;
  value: string;
}

export interface AnnotationCardData {
  /** Only set when the caller needs to map back to the source Annotation
   * (see AnnotationsPanel's cardDataFor, feeding CompareDialog's add/remove
   * point list) -- AnnotationCard's own single-pin export has no use for it. */
  id?: string;
  ref: string;
  title: string;
  origin: FieldRow | null;
  /** Plotted X/Y axis values, excluding whichever axis is Layer Structure itself (see AnnotationCard's axisBadges). */
  axisBadges: FieldRow[];
  /** Material Class / Base Materials -- rendered alongside Layer Structure, not the plain metrics grid. */
  structureExtraFields: FieldRow[];
  /** axisBadges + foldFields combined -- every measurement, matching what's visible somewhere on the card (see AnnotationCard's exportMetricsRows). */
  metricsRows: FieldRow[];
  modeRows: FieldRow[];
  modeDescription: string | null;
  layers: StructureLayer[];
  layerStructureRaw: string | null;
  note: string;
}

const displayValue = (v: unknown): string =>
  v === null || v === undefined || v === "" ? "—" : String(v);

const rowField = (row: DataRow, col: string | null): FieldRow | null => {
  if (!col) return null;
  const raw = row[col];
  if (raw === null || raw === undefined || raw === "") return null;
  return { key: formatUnitSuperscripts(col), value: String(raw) };
};

/**
 * Single source of truth for how a pinned point's raw row splits into the
 * Origin / Mode / Layer Structure / Metrics / Notes groupings used by both
 * AnnotationCard (on-screen card + single-pin export) and the multi-pin
 * compare export -- keeping these two consumers derived from the same rules
 * so a change to what counts as "structure" vs. "metrics" can't drift
 * between the two exports.
 */
export function buildAnnotationCardData(input: {
  id?: string;
  ref: string;
  title: string;
  row: DataRow;
  note: string;
  xAxis: string | null;
  yAxis: string | null;
  layerStructureColumnName: string | null;
  materialClassColumnName: string | null;
  baseMaterialsColumnName: string | null;
  originColumnName: string | null;
  leadingFields: FieldRow[];
  foldFields: FieldRow[];
  modeDescription: string | null;
  layers: StructureLayer[];
  layerStructureRaw: string | null;
}): AnnotationCardData {
  const origin = rowField(input.row, input.originColumnName);

  const axisBadges = [{ axis: input.xAxis }, { axis: input.yAxis }]
    .filter(({ axis }) => axis && axis !== input.layerStructureColumnName)
    .map(({ axis }) => ({
      key: formatUnitSuperscripts(axis as string),
      value: displayValue(input.row[axis as string]),
    }));

  const structureExtraFields = [
    rowField(input.row, input.materialClassColumnName),
    rowField(input.row, input.baseMaterialsColumnName),
  ].filter((f): f is FieldRow => f !== null);

  return {
    id: input.id,
    ref: input.ref,
    title: input.title,
    origin,
    axisBadges,
    structureExtraFields,
    metricsRows: [...axisBadges, ...input.foldFields],
    modeRows: input.leadingFields,
    modeDescription: input.modeDescription,
    layers: input.layers,
    layerStructureRaw: input.layerStructureRaw,
    note: input.note,
  };
}
