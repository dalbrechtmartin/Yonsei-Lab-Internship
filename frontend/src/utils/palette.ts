import labTheme from "@/assets/themes/okabe-ito-palette.json";

export const PALETTE: string[] = labTheme.theme.color;

/**
 * Assigns each label a fixed color by its position in the given (already
 * ordered) list. Callers must always pass the full, stable label set for
 * the current "Group / Color by" column -- computed off the *unfiltered*
 * dataset, not whatever subset happens to be visible after Domain/Origin/
 * Material Class filtering. Otherwise unchecking a filter chip or changing
 * a selection can shrink the visible label set and shift every remaining
 * label's index, silently reassigning colors that a researcher already
 * memorized (e.g. "Dielectric is orange") -- the exact inconsistency this
 * shared map exists to prevent.
 */
export function assignGroupColors(labels: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  labels.forEach((label, idx) => {
    map[label] = PALETTE[idx % PALETTE.length];
  });
  return map;
}
