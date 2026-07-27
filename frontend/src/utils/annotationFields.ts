import { findDomainColumn, findOriginColumn, findTooltipExtraColumns } from "./columnTypes";

/**
 * Columns worth showing on a pinned annotation card / the compare table:
 * Domain and Origin (if the sheet has them), the active group-by column,
 * the currently plotted X/Y axes (so the point's own coordinates are always
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

  add(findDomainColumn(columns));
  add(findOriginColumn(columns));
  add(groupBy);
  add(xAxis);
  add(yAxis);
  for (const col of findTooltipExtraColumns(columns)) add(col);

  return fields;
}
