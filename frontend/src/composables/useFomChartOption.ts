import { computed, onBeforeUnmount, onMounted, ref, type ComputedRef, type Ref } from "vue";
import type VChart from "vue-echarts";
import { escapeHtml } from "@/utils/fomChartPoints";
import { estimateAxisNameSpace, estimateLegendWrapRows } from "@/utils/fomChartLegend";
import { formatUnitSuperscripts } from "@/utils/columnTypes";
import { formatStat, type TrendFit } from "@/utils/stats";

// Full-length layer-structure strings can run to 80+ characters — rotated at
// full length they sprawl across most of the chart height and still overlap
// their neighbors. Truncate the tick label; the full text stays available in
// the tooltip on hover.
const MAX_AXIS_LABEL_LENGTH = 24;

export interface UseFomChartOptionDeps {
  props: {
    xAxis: string | null;
    yAxis: string | null;
    xAxisNumeric: boolean;
    yAxisNumeric: boolean;
    yAxisScale: "log" | "value";
    groupBy: string | null;
    showLegend: boolean;
  };
  t: (key: string, params?: Record<string, unknown>) => string;
  medianLineColor: string;
  legendColor: string;
  displayTitle: ComputedRef<string>;
  chartRef: Ref<InstanceType<typeof VChart> | null>;
  seriesList: ComputedRef<any[]>;
  groupLegendNames: ComputedRef<string[]>;
  overlayLegendNames: ComputedRef<string[]>;
  sizeLegendNames: ComputedRef<string[]>;
  legendTooltipFormatter: (params: any) => string;
  trendFit: ComputedRef<TrendFit | null>;
}

/**
 * Assembles the actual echarts option object -- title/legend/grid layout
 * math, the tooltip formatter, and axis config -- off of an already-built
 * `series` array and its legend name lists (see useFomChartSeries.ts, which
 * owns turning FomChart's data model into those). Split out of FomChart.vue
 * because this half (axis/tooltip/legend assembly) is a genuinely different
 * concern from building points/series: this part never touches a DataRow,
 * it only lays out what's already been built.
 */
export function useFomChartOption(deps: UseFomChartOptionDeps) {
  const { props, chartRef } = deps;

  // chartRef.getWidth() is a live imperative read, not a reactive Vue value
  // -- calling it inside chartOption's computed wouldn't register as a
  // dependency, so a container resize would never re-trigger the group
  // legend's wrap-row estimate (see estimateLegendWrapRows/groupLegendRows
  // below) even though the actual number of wrapped lines needed changes
  // with the chart's width. legendWidthTick is a plain reactive counter
  // bumped by a ResizeObserver purely to force that recomputation;
  // chartOption then re-reads the chart's current getWidth() fresh each time
  // it fires.
  const legendWidthTick = ref(0);
  let legendWidthObserver: ResizeObserver | null = null;
  onMounted(() => {
    const dom = chartRef.value?.getDom();
    if (!dom) return;
    legendWidthObserver = new ResizeObserver(() => {
      legendWidthTick.value += 1;
    });
    legendWidthObserver.observe(dom);
  });
  onBeforeUnmount(() => {
    legendWidthObserver?.disconnect();
  });

  const chartOption = computed(() => {
    const xName = props.xAxis ? formatUnitSuperscripts(props.xAxis) : "";
    const yName = props.yAxis ? formatUnitSuperscripts(props.yAxis) : "";
    const xNameSpace = estimateAxisNameSpace(xName);
    const yNameSpace = yName ? 26 : 0;

    // The chart title and the legend both default to the top-center of the
    // canvas -- with no reservation for the title's own line height, a
    // non-empty title sat directly on top of (or under) the legend/points.
    // titleSpace pushes everything below it down by one line when a title is
    // actually set.
    const hasTitle = !!deps.displayTitle.value;
    const titleTop = 4;
    const titleSpace = hasTitle ? 26 : 0;

    // Group-by colors, trend/Pareto overlays, and the point-size encoding
    // render as up to three separate legend rows (rather than one run-on
    // line) so a researcher isn't left parsing "Dielectric, Metal, Trend
    // line, Taille des points" as if they were all the same kind of thing.
    const showGroupLegend =
      props.showLegend && deps.groupLegendNames.value.length > 0;
    const showOverlayLegend =
      props.showLegend && deps.overlayLegendNames.value.length > 0;
    const showSizeLegend =
      props.showLegend && deps.sizeLegendNames.value.length > 0;
    // legendWidthTick is read purely to register a reactive dependency (see
    // its own comment) -- chartRef.getWidth() itself is a live, non-reactive
    // read, so without this a container resize would never re-run this
    // estimate even though the real wrap-row count depends on the current
    // width. Unlike the fixed single-row assumption every other legend
    // section gets, the group legend can wrap onto several lines once there
    // are enough groups (see estimateLegendWrapRows) -- undercounting here
    // would let a wrapped line overlap the plotted points below it, so a
    // width unavailable yet (pre-mount) falls back to a conservative 600.
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions -- deliberate reactive-dependency read, see comment above
    legendWidthTick.value;
    const chartWidthPx = chartRef.value?.getWidth() ?? 600;
    const groupLegendRows = showGroupLegend
      ? estimateLegendWrapRows(
          deps.groupLegendNames.value,
          Math.max(0, chartWidthPx - 48),
        )
      : 0;
    const legendRows =
      groupLegendRows + (showOverlayLegend ? 1 : 0) + (showSizeLegend ? 1 : 0);
    const groupLegendTop = titleTop + titleSpace;
    const overlayLegendTop = groupLegendTop + groupLegendRows * 22;
    const sizeLegendTop = overlayLegendTop + (showOverlayLegend ? 22 : 0);
    // Trend's swatch stays the bare overlay name in legend.data (identity
    // used for matching); the type + R² only shows via this formatter,
    // which rewrites the DISPLAYED text without touching the underlying
    // name -- otherwise "what it shows" (the fit stats) would only ever
    // surface on hover via legendTooltipFormatter, one click of context a
    // researcher shouldn't have to go looking for.
    const overlayLegendFormatter = (name: string): string =>
      name === deps.t("fomcharts.controls.trendLine") && deps.trendFit.value
        ? `${name} (${deps.t(`fomcharts.trendType.${deps.trendFit.value.type}`)}, R² ${formatStat(deps.trendFit.value.r2)})`
        : name;
    return {
      // Changing an axis, groupBy, or the trend-line toggle usually reshapes
      // the series array enough that echarts can't match old vs new
      // series/data and smoothly interpolate -- it tears the series down and
      // replays its default "grow from nothing" enter animation (~1s),
      // during which the chart looks empty/frozen. animationDurationUpdate:
      // 0 alone doesn't cover this case (echarts treats a torn-down-and-
      // rebuilt series as a fresh enter, not an update), so animation is
      // disabled outright -- control-driven changes should be instant on a
      // data tool like this one.
      animation: false,
      title: { text: deps.displayTitle.value, left: "center", top: titleTop },
      // Controlled by Display > Show legend (GraphControls) -- on by default
      // so exporting the chart as an image (see FomChart.vue's exportPng)
      // still carries a key for which color is which group. Three rows:
      // group-by colors, then trend/Pareto overlays, then the point-size
      // encoding (see groupLegendTop/overlayLegendTop/sizeLegendTop above)
      // -- each with a hover tooltip explaining what it shows and how it's
      // computed (legendTooltipFormatter), since a bare swatch name alone
      // doesn't.
      legend: [
        {
          // Default "plain" type -- wraps onto as many centered lines as it
          // needs instead of paginating, so every group is always fully
          // listed at once (see groupLegendRows/estimateLegendWrapRows
          // above, which reserve enough grid.top space for however many
          // lines that turns out to be).
          show: showGroupLegend,
          data: deps.groupLegendNames.value,
          top: groupLegendTop,
          left: "center",
          selectedMode: false,
          textStyle: { color: deps.legendColor, fontSize: 11 },
          itemWidth: 14,
          itemHeight: 8,
        },
        {
          show: showOverlayLegend,
          data: deps.overlayLegendNames.value,
          top: overlayLegendTop,
          left: "center",
          selectedMode: false,
          textStyle: { color: deps.legendColor, fontSize: 11 },
          itemWidth: 14,
          itemHeight: 8,
          formatter: overlayLegendFormatter,
          tooltip: { show: true, formatter: deps.legendTooltipFormatter },
        },
        {
          show: showSizeLegend,
          data: deps.sizeLegendNames.value,
          top: sizeLegendTop,
          left: "center",
          selectedMode: false,
          textStyle: { color: deps.legendColor, fontSize: 11 },
          itemWidth: 10,
          itemHeight: 10,
          tooltip: { show: true, formatter: deps.legendTooltipFormatter },
        },
      ],
      // left/right stay modest (containLabel still grows them further if an
      // unusually wide tick label needs it) instead of the ~10% default on
      // both sides, which left a dead strip on the left; too tight on the
      // left and a numeric (value-type) x-axis, which has no category
      // buckets holding points away from x=0, ends up drawing points/labels
      // right through that area. right/top get an explicit reservation for
      // the axis names themselves (see estimateAxisNameSpace above) since
      // they now render at the end of each axis rather than below/beside the
      // ticks.
      grid: {
        // legendRows now already accounts for however many lines the group
        // legend itself wraps onto (see groupLegendRows above), not just a
        // flat one-row assumption -- so this reservation grows automatically
        // with a wider groupBy column instead of the wrapped legend
        // overlapping the plotted points below it.
        top: 16 + titleSpace + legendRows * 24 + yNameSpace,
        left: 56,
        right: 32 + xNameSpace,
        bottom: 8,
        containLabel: true,
      },
      tooltip: {
        trigger: "item",
        // Compact chrome (padding/font/line-height) around the formatted
        // HTML below -- echarts' own tooltip defaults are noticeably roomier
        // than this app's UI text elsewhere, and a hover popup is read at a
        // glance, not a document.
        padding: [7, 10],
        textStyle: { fontSize: 11.5, lineHeight: 15.5 },
        formatter: (params: any) => {
          if (params.componentType === "markLine") {
            return `${deps.t("fomcharts.medianLine.name")}: ${escapeHtml(params.data.value)}`;
          }
          if (params.seriesType === "line") {
            return escapeHtml(params.seriesName);
          }
          const groupLine = props.groupBy
            ? `${escapeHtml(formatUnitSuperscripts(props.groupBy))}: <strong>${escapeHtml(params.seriesName)}</strong><br/>`
            : "";
          // A row with several kept Material Class/Base Materials tokens
          // plots as more than one dot (or, in merge mode, one dot anchored
          // on just one of them) -- without this, two neighboring points (or
          // a single merged marker) give no hint they're actually the *same*
          // row split across categories. Lists every other group this exact
          // point also belongs to, alongside the one groupLine already
          // names.
          const otherGroups = (params.data.groups ?? []).filter(
            (g: string) => g !== params.seriesName,
          );
          const alsoInGroupsLine =
            otherGroups.length > 0
              ? `<em style="opacity:0.75">${deps.t("fomcharts.alsoInGroups", { groups: otherGroups.map(escapeHtml).join(", ") })}</em><br/>`
              : "";
          // Disambiguates which of a paper's several extracted rows this
          // point is -- Mode ID + Mode Description together (e.g. "Mode 1 —
          // Resonance peak P1") -- without it, two points from the same
          // Ref/Title look identical in the tooltip.
          const modeCaseLine = params.data.modeCase
            ? `<em style="opacity:0.75">${escapeHtml(params.data.modeCase)}</em><br/>`
            : "";
          const needsReviewLine = params.data.needsReview
            ? `<span style="color:${deps.medianLineColor}">${deps.t("fomcharts.needsReview")}</span><br/>`
            : "";
          const extraLines = Object.entries(params.data.extras ?? {})
            .map(
              ([key, val]) =>
                `${escapeHtml(formatUnitSuperscripts(key))}: <strong>${escapeHtml(val)}</strong><br/>`,
            )
            .join("");
          // X and Y share one line (· -separated) instead of two -- the
          // plotted axes are the two values a researcher reads first, so
          // keeping them together also puts them right under the title
          // instead of pushed down by every optional line above.
          const axisLine = `${escapeHtml(formatUnitSuperscripts(props.xAxis ?? ""))}: <strong>${escapeHtml(params.data.value[0])}</strong> · ${escapeHtml(formatUnitSuperscripts(props.yAxis ?? ""))}: <strong>${escapeHtml(params.data.value[1])}</strong><br/>`;
          return `<div style="max-width: 260px; white-space: normal;">
                  <strong>${escapeHtml(params.data.refLabel ?? "")}</strong> ${escapeHtml(params.data.title ?? "")}<br/>
                  ${modeCaseLine}
                  ${needsReviewLine}
                  ${groupLine}
                  ${alsoInGroupsLine}
                  ${axisLine}
                  ${extraLines}
                </div>`;
        },
      },
      // The visible slider bar sat right under the x-axis name and would
      // overlap it for long names -- "inside" (scroll-wheel/pinch/drag zoom)
      // covers zooming without it. zoomOnMouseWheel is off: the wheel is
      // handled by FomChart's own handleWheelZoom listener instead (see
      // useFomChartZoom.ts for why), so ECharts' own built-in wheel handling
      // would otherwise double up with it. Un-zooming is the +/- buttons or
      // scrolling/dragging back out -- there's no separate reset control.
      dataZoom: [{ type: "inside", zoomOnMouseWheel: false }],
      // nameLocation "end" puts the column name right at the tip of each
      // axis (past the last tick) instead of centered below/beside the tick
      // labels -- this both answers "which axis is X and which is Y"
      // directly on the chart, and sidesteps the old clipping bug, since
      // grid.right/top above now reserve dedicated space for it rather than
      // relying on containLabel.
      xAxis: props.xAxisNumeric
        ? { type: "value", name: xName, nameLocation: "end", nameGap: 12 }
        : {
            type: "category",
            name: xName,
            nameLocation: "end",
            nameGap: 12,
            axisLabel: {
              interval: 0,
              rotate: 30,
              formatter: (value: string) =>
                value.length > MAX_AXIS_LABEL_LENGTH
                  ? `${value.slice(0, MAX_AXIS_LABEL_LENGTH)}…`
                  : value,
            },
          },
      // Same value/category split as the X axis above -- a categorical Y
      // (e.g. Material Class) can't take a log/linear scale, so it falls
      // back to a plain category axis instead of props.yAxisScale
      // (GraphControls forces the scale toggle to "value" and disables it
      // whenever Y isn't numeric, but this is what actually makes the axis
      // itself render correctly). No rotate here, unlike the X category axis
      // -- Y tick labels are horizontal text stacked vertically, so they
      // don't run into each other the way X's horizontal row of category
      // ticks does.
      yAxis: props.yAxisNumeric
        ? {
            type: props.yAxisScale,
            name: yName,
            nameLocation: "end",
            nameGap: 12,
          }
        : {
            type: "category",
            name: yName,
            nameLocation: "end",
            nameGap: 12,
            axisLabel: {
              formatter: (value: string) =>
                value.length > MAX_AXIS_LABEL_LENGTH
                  ? `${value.slice(0, MAX_AXIS_LABEL_LENGTH)}…`
                  : value,
            },
          },
      series: deps.seriesList.value,
    };
  });

  return { chartOption };
}
