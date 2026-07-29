import {
  findBaseMaterialsColumn,
  findDomainColumn,
  findMaterialClassColumn,
  findModeIdColumn,
  findModeDescriptionColumn,
  findOriginColumn,
  findTooltipExtraColumns,
} from "./columnTypes";

/**
 * Columns worth showing on a pinned annotation card / the compare table:
 * Mode ID/Mode Description first (which of a paper's several extracted rows
 * this pin is -- without it, two pins from the same Ref/Title are
 * indistinguishable), then
 * Domain and Origin (if the sheet has them), Material Class/Base Materials
 * (the structure's composition -- always relevant context for a pinned
 * point, not just when grouping by them), the active group-by column, the
 * currently plotted X/Y axes (so the point's own coordinates are always
 * visible, not just whatever it was pinned under), then whatever other
 * metrics (Sensitivity, Q-factor, ...) the chart tooltip itself surfaces.
 * Recomputed off the *current* axis/group-by selection rather than frozen
 * at pin time, so a pinned point still makes sense after the researcher
 * changes axes -- it reads straight off the annotation's stored row.
 */
export function annotationFieldColumns(
  columns: string[],
  xAxis: string | null,
  yAxis: string | null,
  groupBy: string | null,
): string[] {
  const seen = new Set<string>();
  const fields: string[] = [];
  const add = (col: string | null | undefined) => {
    if (col && !seen.has(col)) {
      seen.add(col);
      fields.push(col);
    }
  };

  add(findModeIdColumn(columns));
  add(findModeDescriptionColumn(columns));
  add(findDomainColumn(columns));
  add(findOriginColumn(columns));
  add(findMaterialClassColumn(columns));
  add(findBaseMaterialsColumn(columns));
  add(groupBy);
  add(xAxis);
  add(yAxis);
  for (const col of findTooltipExtraColumns(columns)) add(col);

  return fields;
}
