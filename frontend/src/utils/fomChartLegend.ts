// Pure pixel-estimate helpers pulled out of FomChart.vue's chartOption --
// echarts' own containLabel/legend layout doesn't reliably reserve space for
// axis *names* or a wrapped legend, so these are used to reserve grid margin
// by hand. Estimates only, not pixel-perfect -- just close enough that
// nothing overlaps.

/**
 * Reserves grid margin for an axis name -- echarts' containLabel does not
 * account for axis names (as opposed to tick labels), so without an
 * explicit reservation a long name can render past the canvas edge and
 * simply appear to vanish.
 */
export function estimateAxisNameSpace(text: string): number {
  return text ? text.length * 6.2 + 16 : 0;
}

/**
 * Rough character-count estimate, summed across every legend entry and
 * wrapped against the chart's actual rendered width -- reserves enough grid
 * space for however many lines the (always-complete, never truncated) group
 * legend wraps into.
 */
export function estimateLegendWrapRows(names: string[], availableWidth: number): number {
  if (names.length === 0 || availableWidth <= 0) return 1;
  const itemGap = 20; // echarts legend's own default itemGap
  const swatchAndPadding = 14 + 5; // legend[0]'s itemWidth + icon-to-text gap
  const charWidth = 6.3;
  let rows = 1;
  let rowWidth = 0;
  for (const name of names) {
    const entryWidth = swatchAndPadding + name.length * charWidth + itemGap;
    if (rowWidth > 0 && rowWidth + entryWidth > availableWidth) {
      rows += 1;
      rowWidth = entryWidth;
    } else {
      rowWidth += entryWidth;
    }
  }
  return rows;
}
