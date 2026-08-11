import { getInstanceByDom } from "echarts/core";
import type { ComputedRef, Ref } from "vue";
import type VChart from "vue-echarts";

export type PixelRect = { left: number; top: number; width: number; height: number };

/**
 * The chart's read-only measurement/export surface that exists solely so
 * GuideTemplate.vue can screenshot/PDF-export a real, live-rendered chart
 * and draw accurate callout rings around specific parts of it (median line,
 * legend rows, a flagged/manual point) -- none of this is used by the
 * interactive workspace itself. Kept as its own composable so FomChart.vue's
 * own script isn't dominated by a feature only one other component consumes.
 *
 * IMPORTANT: the returned function names are called directly by
 * GuideTemplate.vue via FomChart's defineExpose -- renaming any of them is a
 * two-file change.
 */
export function useFomChartGuideApi(deps: {
  chartRef: Ref<InstanceType<typeof VChart> | null>;
  badgesRowRef: Ref<HTMLElement | null>;
  medianValue: ComputedRef<number>;
  sizeLegendFullText: ComputedRef<string>;
  showMedian: () => boolean;
  showLegend: () => boolean;
}) {
  const { chartRef, badgesRowRef, medianValue, sizeLegendFullText, showMedian, showLegend } = deps;

  /** The current chart render as a PNG data URL -- split out of exportPng so
   * the guide can show a genuine "Export chart image" example instead of
   * just the live interactive component. */
  const getPngDataUrl = (): string | null =>
    chartRef.value?.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: "#fff",
    }) ?? null;

  // Guide-only: the badges row is real DOM (GuideTemplate can already box it
  // with the normal getBoundingClientRect-based helpers once it has this
  // element) -- exposed the same way chartRef itself is used internally.
  const getBadgesRow = (): HTMLElement | null => badgesRowRef.value;

  /** Guide-only: the chart's own DOM node, in whatever CSS transform scale
   * the guide is currently rendering it at -- paired with getMedianLineRect/
   * getLegendRect below (which report positions in echarts' own, pre-scale
   * pixel space) so GuideTemplate can convert one into the other and box
   * canvas-drawn content the same way it boxes real DOM elements everywhere
   * else in the guide. */
  const getChartDom = (): HTMLElement | null => chartRef.value?.getDom() ?? null;

  /** Guide-only: the median line's full extent, read from echarts' own live
   * layout rather than guessed -- its vertical position shifts with the
   * plotted data (the median itself), and its horizontal extent spans the
   * whole grid, which itself shifts with the x-axis name's length.
   * getInstanceByDom + the grid coordinate system's own rect is the only way
   * to read this back, since none of it is real DOM (CanvasRenderer draws it
   * straight onto the canvas). */
  const getMedianLineRect = (): PixelRect | null => {
    if (!showMedian()) return null;
    const dom = chartRef.value?.getDom();
    const raw = dom ? getInstanceByDom(dom) : undefined;
    if (!raw) return null;
    // `getModel`/`coordinateSystem` aren't part of echarts' typed public API
    // surface, but reading a live grid's rendered rect back is a
    // long-standing, stable pattern -- worth it here to avoid re-deriving
    // (and drifting from) the same layout math chartOption uses.
    const grid = (raw as any).getModel?.()?.getComponent?.("grid", 0)?.coordinateSystem?.getRect?.();
    const y = raw.convertToPixel({ yAxisIndex: 0 }, medianValue.value);
    if (!grid || typeof y !== "number" || Number.isNaN(y)) return null;
    return { left: grid.x, top: y - 18, width: grid.width, height: 36 };
  };

  /** Guide-only: the legend's live top position (see getMedianLineRect for
   * why this can't be read off real DOM) -- horizontally it's always
   * centered on the whole canvas (`left: "center"`, not grid-relative), so
   * only the vertical position needs to be read back; a fixed generous
   * width covers the legend regardless of how long its (locale-invariant,
   * data-literal) group names run. */
  const getLegendRect = (): PixelRect | null => {
    if (!showLegend()) return null;
    const inst = chartRef.value;
    if (!inst) return null;
    const legendOpt = (inst.getOption() as any)?.legend?.[0];
    if (!legendOpt || legendOpt.show === false) return null;
    const width = inst.getWidth();
    const top = typeof legendOpt.top === "number" ? legendOpt.top : 4;
    // Rows sit only 22px apart -- a shorter, tighter box than this row's
    // neighbors further down used to get away with (back when this was
    // always the LAST row) now keeps the ring from painting over the
    // overlay/size rows that can render directly beneath it.
    return { left: width / 2 - 75, top: top - 4, width: 150, height: 18 };
  };

  /** Guide-only: the point-size legend row's live top position -- the third
   * (`legend[2]`) of chartOption's three stacked legend rows. Same reasoning
   * as getLegendRect above, EXCEPT for width: getLegendRect's fixed 150px
   * guess is fine for its own row (short, locale-invariant group names), but
   * this row's text is the full "Taille : {column} ({min}-{max})" sentence
   * -- long enough, in some locales, to run past a 150px guess -- so this
   * estimates from the actual string length instead. */
  const getSizeLegendRect = (): PixelRect | null => {
    if (!showLegend()) return null;
    const inst = chartRef.value;
    if (!inst) return null;
    const legendOpt = (inst.getOption() as any)?.legend?.[2];
    if (!legendOpt || legendOpt.show === false) return null;
    const width = inst.getWidth();
    const top = typeof legendOpt.top === "number" ? legendOpt.top : 4;
    const iconAndGap = 10 + 5;
    const textWidth = sizeLegendFullText.value.length * 6.3;
    const boxWidth = iconAndGap + textWidth + 8;
    return {
      left: width / 2 - boxWidth / 2,
      top: top - 4,
      width: boxWidth,
      height: 18,
    };
  };

  /** Guide-only: a flagged ("Review status: Edit", dashed-outline) point's
   * pixel rect, found by its ref label rather than a fixed index -- reads
   * every series' raw data back off the live option (the same option
   * chartOption feeds the chart) instead of recomputing bubble positions/
   * sizes independently, so this can't drift from what's actually drawn.
   * Returns the first flagged point found, since the guide's worked example
   * only ever flags one. */
  const getFlaggedPointRect = (): PixelRect | null => {
    const inst = chartRef.value;
    if (!inst) return null;
    const series = (inst.getOption() as any)?.series ?? [];
    for (const s of series) {
      for (const d of s.data ?? []) {
        if (d?.isFlagged) {
          const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, d.value) as unknown as
            | number[]
            | undefined;
          if (!px) return null;
          const r = (d.symbolSize ?? 10) / 2 + 6;
          return { left: px[0] - r, top: px[1] - r, width: r * 2, height: r * 2 };
        }
      }
    }
    return null;
  };

  /** Guide-only: same idea as getFlaggedPointRect, for the manually-added
   * point's own gold-outlined bubble instead -- the guide's own "Add a
   * point" worked example only ever adds one. */
  const getManualPointRect = (): PixelRect | null => {
    const inst = chartRef.value;
    if (!inst) return null;
    const series = (inst.getOption() as any)?.series ?? [];
    for (const s of series) {
      for (const d of s.data ?? []) {
        if (d?.isManual) {
          const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, d.value) as unknown as
            | number[]
            | undefined;
          if (!px) return null;
          const r = (d.symbolSize ?? 10) / 2 + 6;
          return { left: px[0] - r, top: px[1] - r, width: r * 2, height: r * 2 };
        }
      }
    }
    return null;
  };

  return {
    getPngDataUrl,
    getBadgesRow,
    getChartDom,
    getMedianLineRect,
    getLegendRect,
    getSizeLegendRect,
    getFlaggedPointRect,
    getManualPointRect,
  };
}
