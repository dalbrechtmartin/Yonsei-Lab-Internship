import { computed, type ComputedRef } from "vue";
import { gradientColor, spreadDuplicatePoints } from "@/utils/fomChartPoints";
import { isManualRow, pointShape, type DataRow } from "@/utils/columnTypes";
import {
  sampleTrendCurve,
  computeParetoFrontier,
  formatStat,
  type TrendFit,
} from "@/utils/stats";

// Custom ECharts symbol path (5-point star, arbitrary coordinate space --
// ECharts fits it to symbolSize like any other custom symbol) -- "star" has
// no built-in ECharts symbol name, unlike "circle"/"diamond".
const STAR_SYMBOL_PATH =
  "path://M12 2l2.9 6.9 7.1.6-5.4 4.6 1.7 7-6.3-4-6.3 4 1.7-7L1 9.5l7.1-.6z";

export interface UseFomChartSeriesDeps {
  props: {
    xAxis: string | null;
    yAxis: string | null;
    xAxisNumeric: boolean;
    yAxisNumeric: boolean;
    groupBy: string | null;
    groupColorMap: Record<string, string>;
    mergeMultiCategoryPoints: boolean;
    pointSize: number;
    pointSizeBy: string | null;
    highlightGroup: string | null;
    showMedian: boolean;
    showTrend: boolean;
    showPareto: boolean;
  };
  t: (key: string, params?: Record<string, unknown>) => string;
  palette: string[];
  medianLineColor: string;
  legendColor: string;
  trendLineColor: string;
  manualPointBorderColor: string;
  hoverRingColor: string;
  // The chart's already-derived data model (see FomChart.vue) -- shared with
  // the top badges row, so it stays owned there rather than being re-derived
  // here; this composable only turns it into echarts series/legend shapes.
  plottableData: ComputedRef<DataRow[]>;
  highlightedRows: ComputedRef<DataRow[]>;
  medianValue: ComputedRef<number>;
  trendFit: ComputedRef<TrendFit | null>;
  previewPoint: ComputedRef<{
    value: unknown[];
    refLabel: unknown;
    title: unknown;
    symbolSize: number;
  } | null>;
  groupValues: ComputedRef<string[] | null>;
  groupNamesByCount: ComputedRef<string[]>;
  isGroupingByCompositeColumn: ComputedRef<boolean>;
  compositeGroupTokens: (item: DataRow) => string[];
  matchesGroup: (item: DataRow, groupName: string) => boolean;
  extraTooltipColumns: ComputedRef<string[]>;
  modeIdColumn: ComputedRef<string | null>;
  modeDescriptionColumn: ComputedRef<string | null>;
  isEditStatus: (item: DataRow) => boolean;
  isPinnedRow: (item: DataRow) => boolean;
  isHoveredRow: (item: DataRow) => boolean;
  hasVisibleHoveredMatch: ComputedRef<boolean>;
  bubbleSizeFor: (value: number) => number;
  pointSizeLegend: ComputedRef<{
    column: string;
    min: string;
    max: string;
  } | null>;
}

/**
 * Turns FomChart's already-derived data model (plottableData, grouping,
 * median/trend/Pareto overlays -- see FomChart.vue) into the actual echarts
 * `series` array plus the legend name lists chartOption's legend rows
 * display (see useFomChartOption.ts). Split out of FomChart.vue's own
 * chartOption computed -- building points/applying item styles/grouping was
 * a large, mostly self-contained chunk of that chain, distinct from the
 * axis/tooltip/legend layout math around it.
 */
export function useFomChartSeries(deps: UseFomChartSeriesDeps) {
  const { props } = deps;

  // Hidden by default -- with every dot labeled at once the chart reads as a
  // wall of overlapping ref numbers. A label only earns its place when a
  // point is actually the one being looked at: hovering it (series-level
  // `emphasis` below), isolating its group, or pinning it (see
  // withItemStyle's showLabel, which sets each point's own `label.show`).
  const pointLabel = {
    show: false,
    position: "top",
    formatter: (params: any) => params.data.refLabel,
    fontSize: 10,
    color: deps.legendColor,
  };
  const pointLabelEmphasis = { label: { show: true } };

  const buildPoint = (item: DataRow) => {
    const extras: Record<string, unknown> = {};
    for (const col of deps.extraTooltipColumns.value) {
      const v = item[col];
      if (v !== null && v !== undefined && v !== "") extras[col] = v;
    }
    const needsReview = deps.isEditStatus(item);
    const rawX = props.xAxis ? item[props.xAxis] : undefined;
    const rawY = props.yAxis ? item[props.yAxis] : undefined;
    const rawSizeValue = props.pointSizeBy ? Number(item[props.pointSizeBy]) : NaN;
    // Already shown via the axis/group-by line below when Mode ID happens to
    // be picked as one of those -- no need to print it twice.
    const modeId =
      deps.modeIdColumn.value &&
      deps.modeIdColumn.value !== props.xAxis &&
      deps.modeIdColumn.value !== props.groupBy
        ? item[deps.modeIdColumn.value]
        : null;
    const modeDescription = deps.modeDescriptionColumn.value
      ? item[deps.modeDescriptionColumn.value]
      : null;
    const modeCase = [modeId, modeDescription]
      .filter((v) => v !== null && v !== undefined && v !== "")
      .join(" — ");
    // Every group this point belongs to (composite grouping only) -- powers
    // both the tooltip's "also classified as" line and, for a merged marker,
    // the dimming check in withItemStyle below (a merged point anchored on
    // one group must still stay bright when a *different* member group is
    // isolated).
    const groups = deps.isGroupingByCompositeColumn.value
      ? deps.compositeGroupTokens(item)
      : null;
    const isManual = isManualRow(item);
    const shape = pointShape(item);
    // A diamond/star reads visually smaller than a circle at the same
    // symbolSize (less filled area for the same bounding box) -- scaled up so
    // neither shape looks small/secondary next to a plain circle at the same
    // underlying size.
    const baseSize = deps.bubbleSizeFor(rawSizeValue);

    return {
      value: [
        props.xAxisNumeric
          ? Number(rawX)
          : (rawX ?? deps.t("fomcharts.unknownGroup")),
        props.yAxisNumeric
          ? Number(rawY)
          : (rawY ?? deps.t("fomcharts.unknownGroup")),
      ],
      title: item.title ?? item.Title,
      refLabel: item.ref ?? item.Ref,
      modeCase: modeCase || null,
      extras,
      needsReview,
      isFlagged: needsReview,
      isManual,
      isHovered: deps.isHoveredRow(item),
      row: item,
      groups,
      isPinned: deps.isPinnedRow(item),
      symbol:
        shape === "circle"
          ? undefined
          : shape === "diamond"
            ? "diamond"
            : STAR_SYMBOL_PATH,
      symbolSize: shape === "circle" ? baseSize : baseSize * 1.2,
      symbolOffset: undefined as [number, number] | undefined,
      label: undefined as { show: boolean } | undefined,
    };
  };

  // A dashed outline flags points that need a second look — Review status is
  // "Edit" (a value like FWHM was calculated/estimated rather than read
  // directly from the paper) — a data-quality signal, not a category, so it
  // rides on top of whatever fill color the group/series already assigned
  // rather than replacing it.
  // Isolating one group (via StatsSummaryPanel) dims the rest instead of
  // hiding them, so the overall shape of the dataset stays visible. Every
  // point's color always matches the series/legend it belongs to — see
  // isGroupingByCompositeColumn for how Material Class points land in the
  // right (possibly several) series to begin with.
  const withItemStyle = (
    point: ReturnType<typeof buildPoint>,
    color: string | Record<string, unknown>,
    // The group(s) that must include highlightGroup for this exact point to
    // stay bright. Normally just [groupName] of whichever series built this
    // point (dimmed unless it's the isolated group). A merged marker (see
    // seriesList below) passes its *full* member-token list instead, since
    // one marker there really does represent several groups at once and
    // must not dim just because its series/anchor happens not to be the
    // isolated one.
    dimGroups: string[] | null,
  ) => {
    const memberOfIsolated =
      props.highlightGroup !== null &&
      dimGroups !== null &&
      dimGroups.includes(props.highlightGroup);
    const dimmedByGroup =
      props.highlightGroup !== null && dimGroups !== null && !memberOfIsolated;
    // Hovering a row in the DataPointsTable panel previews exactly the point
    // a click there would hide/remove -- every OTHER point dims (like
    // isolating a group does) so the hovered one reads unambiguously at a
    // glance, on top of whatever group-dim state was already active.
    const dimmedByHover = deps.hasVisibleHoveredMatch.value && !point.isHovered;
    const dimmed = dimmedByGroup || dimmedByHover;
    const opacity = point.isHovered ? 1 : dimmed ? 0.15 : 0.88;
    // The ref-label above each dot is hidden by default (see pointLabel
    // above) and only forced on for a point that's meaningfully "the one
    // being looked at" right now: isolated via a group click, pinned as an
    // annotation, or hovered from the side panel. Hovering the CHART itself
    // reveals it too, but that's handled by the series-level `emphasis`
    // style, not here. A merge-mode invisible sibling (symbolSize 0) never
    // gets a label regardless -- it isn't drawn, so a label would float
    // unanchored right on top of its visible anchor's own label.
    // Manually added points always stay labeled (their ref, e.g. "M1") for
    // the same reason a pinned/isolated point does -- they're purpose-built
    // to be individually identified while comparing against the literature,
    // not blended anonymously into a series of dozens.
    const showLabel =
      (point.symbolSize ?? 0) !== 0 &&
      (point.isPinned || memberOfIsolated || point.isManual || point.isHovered);
    // The gold diamond outline takes priority over the dashed "needs review"
    // border -- a manually entered point never carries a Review status to
    // begin with (see isNeedsReviewRow), so the two are not expected to
    // co-occur, but the manual cue is the more important one when they do.
    const baseItemStyle = point.isManual
      ? {
          color,
          opacity,
          borderWidth: 2.5,
          borderColor: deps.manualPointBorderColor,
        }
      : point.isFlagged
        ? {
            color,
            opacity,
            borderType: "dashed" as const,
            borderWidth: 1,
            borderColor: deps.legendColor,
          }
        : { color, opacity };
    // The hover-preview ring wins over every other border treatment (manual
    // gold, flagged dashed) -- while hovering a panel row, unambiguously
    // pointing at the right dot matters more than any other cue that point
    // might also carry.
    const itemStyle = point.isHovered
      ? {
          ...baseItemStyle,
          opacity,
          borderWidth: 1.5,
          borderColor: deps.hoverRingColor,
        }
      : baseItemStyle;
    return {
      ...point,
      label: { show: showLabel },
      itemStyle,
      // Bumped, not just outlined, so the preview reads clearly even at the
      // small end of the size-by-value range (see bubbleSizeFor).
      symbolSize: point.isHovered
        ? (point.symbolSize ?? 10) * 1.35
        : point.symbolSize,
    };
  };

  // A merged multi-category marker must stay legible at its smallest -- the
  // ordinary size-by-value bubble size (see bubbleSizeFor) can go as low as
  // pointSize's floor, too small for a multi-band gradient to read as
  // anything but a smear. Merged points get floored to pointSize itself
  // instead (still scaling up further for a genuinely large value, just
  // never below it).
  const mergedMinBubbleSize = computed(() => props.pointSize);

  const seriesList = computed(() => {
    const medianMarkLine = {
      lineStyle: { type: "dashed", color: deps.medianLineColor, width: 1 },
      data: props.showMedian
        ? [{ yAxis: deps.medianValue.value, name: deps.t("fomcharts.medianLine.name") }]
        : [],
      label: {
        formatter: deps.t("fomcharts.medianLine.name") + "\n{c}",
        position: "middle",
        color: deps.medianLineColor,
        // Explicit so the label sits vertically CENTERED on the line rather
        // than echarts' default of stacking it entirely above -- without
        // this, getMedianLineRect's symmetric (y ± half-height) guide
        // callout rect only ever covered the bottom half of the two-line
        // label, clipping "Median" off the top.
        align: "center",
        verticalAlign: "middle",
        // A plain center-of-the-line label had the dashed stroke cutting
        // straight through the text, unreadable. A solid backdrop (matching
        // the chart's own canvas background -- see exportPng's white
        // background) sits the line behind the chip instead of through the
        // glyphs, without moving the label off the centered position
        // getMedianLineRect's callout box above assumes.
        backgroundColor: "#fff",
        padding: [2, 5],
        borderRadius: 3,
      },
    };

    const series: any[] = [];

    if (!props.groupBy || !deps.groupValues.value) {
      series.push({
        name: deps.t("fomcharts.type.scatter"),
        symbolSize: 10,
        type: "scatter",
        data: deps.plottableData.value.map((item) =>
          withItemStyle(buildPoint(item), deps.palette[0], null),
        ),
        label: pointLabel,
        emphasis: pointLabelEmphasis,
        // Papers plotted at the same x-tick with close FOM values get
        // stacked ref-labels ("47" printed twice, directly overlapping).
        // hideOverlap keeps whichever label fits and drops the rest rather
        // than rendering illegible stacked text — the point itself and its
        // tooltip are unaffected.
        labelLayout: { hideOverlap: true },
        markLine: medianMarkLine,
      });
    } else {
      deps.groupValues.value.forEach((groupName, idx) => {
        const color =
          props.groupColorMap[groupName] ?? deps.palette[idx % deps.palette.length];
        series.push({
          name: groupName,
          symbolSize: 10,
          type: "scatter",
          // A series-level color is what the legend icon actually reads —
          // without it, echarts falls back to auto-cycling its own theme
          // colors by series position, which drifts out of sync with our
          // fixed groupColorMap the moment a filter hides an entire category
          // (shrinking the series list and shifting every later series'
          // auto-assigned position/color).
          color,
          itemStyle: { color },
          data: deps.plottableData.value
            .filter((item) => deps.matchesGroup(item, groupName))
            .map((item) => {
              const point = buildPoint(item);
              if (deps.isGroupingByCompositeColumn.value) {
                const tokens = deps.compositeGroupTokens(item);
                if (props.mergeMultiCategoryPoints && tokens.length > 1) {
                  // Merge mode: a row with several kept tokens draws as ONE
                  // marker instead of one duplicate per token, anchored on a
                  // deterministically sorted first token so every series
                  // agrees on which copy is the visible one. The other
                  // member series still carry an invisible (symbolSize 0)
                  // copy of the same row purely so matchesGroup-driven logic
                  // (isolate, stats) keeps treating it as a member of every
                  // one of its groups -- see the symbolSize-0 filter in
                  // spreadDuplicatePoints below, which keeps that invisible
                  // sibling from nudging the visible anchor off its true
                  // coordinate.
                  // Known trade-off: ECharts' own legend row for a
                  // non-anchor member group can't hide this marker by
                  // itself (it isn't really drawn in that series) -- only
                  // the anchor group's legend row can. The sidebar filter
                  // chips are unaffected.
                  const sortedTokens = [...tokens].sort();
                  const anchor = sortedTokens[0];
                  point.symbolOffset = [0, 0];
                  if (groupName === anchor) {
                    const memberColors = sortedTokens.map(
                      (tok) => props.groupColorMap[tok] ?? color,
                    );
                    point.symbolSize = Math.max(
                      point.symbolSize,
                      mergedMinBubbleSize.value,
                    );
                    return withItemStyle(
                      point,
                      gradientColor(memberColors),
                      sortedTokens,
                    );
                  }
                  point.symbolSize = 0;
                  return withItemStyle(point, color, [groupName]);
                }
                // Separated mode (default): a row with several materials
                // (e.g. "Dielectric;Metal") plots once per material at the
                // exact same x/y -- without an offset the duplicates stack
                // perfectly on top of each other and only the last-drawn
                // series' color is ever visible, which is what made the
                // chart's colors look arbitrary/wrong. symbolOffset shifts
                // each duplicate a few pixels apart (screen space, not data
                // space) so every material's dot stays visible without
                // moving the point off its real coordinate. Scales gently
                // with pointSize so bigger bubbles (the Display > point-size
                // slider) still separate cleanly instead of overlapping at
                // the same fixed step.
                const n = Math.max(tokens.length, 1);
                const i = Math.max(tokens.indexOf(groupName), 0);
                const offsetStep = Math.max(7, props.pointSize * 0.4);
                point.symbolOffset = [(i - (n - 1) / 2) * offsetStep, 0];
              }
              return withItemStyle(point, color, [groupName]);
            }),
          label: pointLabel,
          emphasis: pointLabelEmphasis,
          labelLayout: { hideOverlap: true },
          // Only the first series carries the median markLine — echarts
          // draws it across the full plot width regardless of which series
          // owns it, so attaching it to every series would just duplicate
          // the line.
          markLine: idx === 0 ? medianMarkLine : { data: [] },
        });
      });
    }

    // Spread duplicate coordinates across the WHOLE chart, not per series --
    // two points from *different* series (e.g. one EXP, one SIM) landing on
    // the same x/y would otherwise never get separated, since each series
    // only ever saw its own single point at that spot. Points are the same
    // object references inside each series' data array, so mutating them
    // here also updates them in place there. symbolSize-0 points are
    // excluded -- those are merge mode's invisible per-token siblings of an
    // already-visible anchor (see above); they always share their anchor's
    // exact coordinate, so without this filter every merged marker would get
    // needlessly nudged off its true position by its own invisible copy.
    spreadDuplicatePoints(
      series
        .filter((s) => s.type === "scatter")
        .flatMap((s) => s.data)
        .filter((p) => (p.symbolSize ?? 10) !== 0),
    );

    // A least-squares fit over the plotted points — only meaningful when the
    // X axis is itself a numeric quantity (e.g. Sensitivity), not a category
    // label like Material Class. Fit itself is computed once in trendFit
    // (see FomChart.vue, shared with the trendUnavailable badge). Sampled at
    // many x values rather than drawn as a single 2-point segment: a
    // non-linear model (exponential/logarithmic/power/polynomial) is an
    // actual curve, and even a linear fit needs sampling to render as a
    // straight line once the Y axis itself is log-scaled (echarts
    // interpolates a "line" series in data space between whatever points
    // it's given, so 2 points would draw straight in *pixel* space and come
    // out visibly bent on a log axis).
    if (deps.trendFit.value) {
      const xs = deps.highlightedRows.value
        .map((item) => Number(item[props.xAxis as string]))
        .filter((x) => !isNaN(x));
      const xmin = Math.min(...xs);
      const xmax = Math.max(...xs);
      const fit = deps.trendFit.value;
      series.push({
        name: deps.t("fomcharts.controls.trendLine"),
        type: "line",
        data: sampleTrendCurve(fit, xmin, xmax),
        showSymbol: false,
        silent: true,
        smooth: true,
        z: 5,
        lineStyle: { type: "dashed", width: 2, color: deps.trendLineColor },
      });
    }

    // Pareto frontier (maximize-both-axes non-dominated set) — only
    // meaningful when both X and Y axes are numeric.
    if (
      props.showPareto &&
      props.xAxisNumeric &&
      props.yAxisNumeric &&
      props.xAxis &&
      props.yAxis
    ) {
      const points = deps.highlightedRows.value
        .map((item) => ({
          x: Number(item[props.xAxis as string]),
          y: Number(item[props.yAxis as string]),
          row: item,
        }))
        .filter((p) => !isNaN(p.x) && !isNaN(p.y));
      const frontier = computeParetoFrontier(points);
      // A frontier of exactly one point has no line segment to draw --
      // `type: "line"` with a single coordinate renders nothing at all,
      // which reads as "the toggle did nothing" even though it worked
      // correctly. Draw it as a visible marker instead so a single
      // non-dominated point is never silently invisible.
      if (frontier.length === 1) {
        series.push({
          name: deps.t("fomcharts.controls.pareto"),
          type: "scatter",
          data: [[frontier[0].x, frontier[0].y]],
          symbol: "diamond",
          symbolSize: 14,
          silent: true,
          z: 6,
          itemStyle: { color: "#009E73", borderColor: "#fff", borderWidth: 1.5 },
        });
      } else if (frontier.length > 1) {
        series.push({
          name: deps.t("fomcharts.controls.pareto"),
          type: "line",
          data: frontier.map((p) => [p.x, p.y]),
          showSymbol: false,
          silent: true,
          step: false,
          z: 6,
          lineStyle: { type: "solid", width: 2, color: "#009E73" },
        });
      }
    }

    // A legend-only entry for "Taille selon une mesure" (Display section) --
    // no data of its own, it exists purely so the point-size encoding gets a
    // row in the chart's own legend (see sizeLegendNames/useFomChartOption's
    // legend row), the same way Trend line / Pareto frontier do, instead of
    // living only in a floating HTML badge disconnected from the chart
    // itself. name is the full "Taille : {column} ({min}-{max})" text (see
    // sizeLegendFullText), not a short placeholder later swapped in via a
    // legend `formatter` -- echarts sizes a "plain"-type legend item's own
    // box from its DATA name, before any formatter ever runs, so a formatter
    // that rewrites a short name into a much longer string just gets that
    // longer string clipped to the short name's box. Matches this series'
    // name to what the legend row (and legendTooltipFormatter's lookup)
    // actually display.
    if (deps.pointSizeLegend.value) {
      series.push({
        name: sizeLegendFullText.value,
        type: "scatter",
        data: [],
        silent: true,
        symbol: "circle",
        itemStyle: { color: deps.legendColor },
      });
    }

    // Hovering a hidden row in the panel's disclosure previews where it
    // would reappear -- a faint, dashed-ring ghost point rather than a real,
    // styled series member (it isn't actually visible yet, just a preview of
    // a click away). silent: true keeps it out of hover/click/tooltip
    // handling entirely, and it's excluded from the legend (see
    // groupLegendNames etc. below, which never reference this series' name).
    if (deps.previewPoint.value) {
      series.push({
        name: deps.t("fomcharts.pointsTable.unhide"),
        type: "scatter",
        data: [
          {
            value: deps.previewPoint.value.value,
            refLabel: deps.previewPoint.value.refLabel,
            title: deps.previewPoint.value.title,
          },
        ],
        symbol: "circle",
        symbolSize: deps.previewPoint.value.symbolSize * 1.35,
        silent: true,
        z: 7,
        label: {
          show: true,
          position: "top",
          formatter: () => String(deps.previewPoint.value?.refLabel ?? ""),
          fontSize: 10,
          color: deps.hoverRingColor,
        },
        itemStyle: {
          color: deps.hoverRingColor,
          opacity: 0.35,
          borderWidth: 1.5,
          borderColor: deps.hoverRingColor,
          borderType: "dashed",
        },
      });
    }

    return series;
  });

  // The legend should only list names a user can actually make sense of.
  // With no groupBy, all points share one series internally named after the
  // generic "Scatter Plot" chart type — showing that as a legend chip reads
  // as a meaningless label, so it's left out; only real group names (or the
  // median/trend/Pareto overlays, when active) are listed.
  // Split into two groups -- group-by colors vs. trend/Pareto overlays -- so
  // they can render as two visually distinct legend rows (see
  // useFomChartOption's `legend` array) instead of one run-on line that was
  // hard to parse when both a color legend and the overlay names were mixed
  // together.
  // Every group gets its own legend entry, ranked most-populous-first
  // (groupNamesByCount) -- with many groups, legend[0] wraps onto however
  // many lines it needs (see estimateLegendWrapRows/groupLegendRows in
  // useFomChartOption) rather than truncating some away: every group is
  // always fully listed, at full legible size, right there on the chart.
  // Isolating a single group (StatsSummaryPanel's isolate click) narrows the
  // on-chart legend down to just that one group instead -- the rest are
  // already dimmed on the chart itself, so listing their names alongside
  // adds nothing but extra wrapped lines.
  const groupLegendNames = computed<string[]>(() => {
    if (!props.groupBy || !deps.groupValues.value) return [];
    if (props.highlightGroup !== null) return [props.highlightGroup];
    return deps.groupNamesByCount.value;
  });
  const overlayLegendNames = computed(() => {
    const names: string[] = [];
    if (
      props.showTrend &&
      props.xAxisNumeric &&
      props.yAxisNumeric &&
      props.xAxis &&
      props.yAxis
    ) {
      names.push(deps.t("fomcharts.controls.trendLine"));
    }
    if (
      props.showPareto &&
      props.xAxisNumeric &&
      props.yAxisNumeric &&
      props.xAxis &&
      props.yAxis
    ) {
      names.push(deps.t("fomcharts.controls.pareto"));
    }
    return names;
  });
  // Its own legend row (rather than folded into overlayLegendNames) because
  // it needs a square, circle-friendly icon box (itemWidth === itemHeight)
  // -- Trend/Pareto's elongated line-swatch box (14x8) would squash a circle
  // icon into an oval.
  // The full "Taille : {column} ({min}-{max})" text, computed once and used
  // directly as BOTH the legend's data name and the point-size helper
  // series' own name above -- see that series' comment for why a
  // `formatter` alone isn't enough here.
  const sizeLegendFullText = computed(() =>
    deps.pointSizeLegend.value
      ? deps.t("fomcharts.pointSizeLegend", {
          column: deps.pointSizeLegend.value.column,
          min: deps.pointSizeLegend.value.min,
          max: deps.pointSizeLegend.value.max,
        })
      : deps.t("fomcharts.controls.pointSize"),
  );
  const sizeLegendNames = computed(() =>
    deps.pointSizeLegend.value ? [sizeLegendFullText.value] : [],
  );

  // Hover explanations for the overlay/size legend rows -- "what it shows
  // and how it's calculated" for Trend/Pareto/point-size, since a bare
  // "Ligne de tendance" swatch name on its own doesn't say anything about
  // the fit method or what a bigger dot means. Keyed by the exact legend
  // entry name so the formatter below can look an item up regardless of
  // which row it's in.
  const legendTooltipFormatter = (params: any): string => {
    const name = params.name;
    if (name === deps.t("fomcharts.controls.trendLine")) {
      return deps.trendFit.value
        ? `${deps.t(`fomcharts.trendType.${deps.trendFit.value.type}`)} · R² ${formatStat(deps.trendFit.value.r2)}<br/>${deps.t("fomcharts.trendLineExplain")}`
        : name;
    }
    if (name === deps.t("fomcharts.controls.pareto")) {
      return deps.t("fomcharts.paretoExplain");
    }
    if (name === sizeLegendFullText.value && deps.pointSizeLegend.value) {
      return deps.t("fomcharts.pointSizeLegendExplain", {
        column: deps.pointSizeLegend.value.column,
      });
    }
    return name;
  };

  return {
    seriesList,
    groupLegendNames,
    overlayLegendNames,
    sizeLegendFullText,
    sizeLegendNames,
    legendTooltipFormatter,
  };
}
