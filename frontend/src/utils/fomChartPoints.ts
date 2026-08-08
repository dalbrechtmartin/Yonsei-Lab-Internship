// Pure ECharts point-shaping helpers pulled out of FomChart.vue -- none of
// these read component state, they only transform whatever is passed in.

/**
 * Tooltip content is built as an HTML string for echarts (it renders via
 * innerHTML), and every interpolated value can originate from a cell in the
 * researcher's uploaded spreadsheet -- escape it so a stray "<" or a crafted
 * cell value can't inject markup into the tooltip.
 */
export function escapeHtml(value: unknown): string {
  const str = String(value ?? "");
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}

/**
 * A single-color style for a normal point; for a merged multi-category point
 * (mergeMultiCategoryPoints) a left-to-right sweep of solid color BANDS (one
 * per member group, hard edges rather than a smooth blend) communicates
 * "this point is more than one category" with no custom rendering -- ECharts
 * accepts this plain object directly wherever an itemStyle.color is
 * expected. Hard edges instead of a continuous gradient matter here: a
 * smoothly blended gradient washes out into a single muddy mid-tone on a
 * marker this small, making a 3+ way split unreadable -- solid bands stay
 * individually identifiable at any size the merged floor allows.
 */
export function gradientColor(colors: string[]): string | Record<string, unknown> {
  return colors.length <= 1
    ? (colors[0] ?? "")
    : {
        type: "linear",
        x: 0,
        y: 0,
        x2: 1,
        y2: 0,
        colorStops: colors.flatMap((c, i) => [
          { offset: i / colors.length, color: c },
          { offset: (i + 1) / colors.length, color: c },
        ]),
      };
}

/**
 * Two distinct rows that happen to share the exact same x/y (a common FOM
 * value at a shared x-category, e.g. two "Dielectric" papers both reporting
 * FOM=53) render as a single dot otherwise -- N still counts both, but only
 * one circle is visible and hideOverlap silently drops the other's ref
 * label, so a researcher counting dots undercounts by one. This spreads
 * same-coordinate points a few pixels apart vertically (screen space, not
 * data space) so every row stays its own visible dot with its own label.
 * Runs *after* the composite-column horizontal offset (a single row's
 * copies across different group series) -- this pass instead separates
 * different rows that land in the same series at the same spot, so it only
 * ever adds a y-offset, never touching x. Mutates and returns `points`.
 */
export function spreadDuplicatePoints<
  T extends {
    value: unknown[];
    symbolOffset?: [number, number];
    symbolSize?: number;
  },
>(points: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const point of points) {
    // Keyed on the existing x-offset too, not just the raw coordinate -- a
    // composite-column row's own per-token dots already sit at distinct
    // x-offsets from each other, so without this they'd still share one raw-
    // value key and get a second, needless y-nudge stacked on top of their
    // already-distinct positions. Genuinely different rows landing on the
    // same coordinate still share both the value and the (usually zero)
    // x-offset, so they're unaffected.
    const key = JSON.stringify([point.value, point.symbolOffset?.[0] ?? 0]);
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    // A fixed offset was small enough to still leave large size-by-value
    // bubbles overlapping each other -- basing the step on the group's own
    // bubble size guarantees visible separation regardless of dot size.
    const offsetStep = Math.max(...group.map((p) => p.symbolSize ?? 10)) * 0.7 + 3;
    group.forEach((point, i) => {
      const xOffset = point.symbolOffset?.[0] ?? 0;
      point.symbolOffset = [xOffset, (i - (group.length - 1) / 2) * offsetStep];
    });
  }
  return points;
}
