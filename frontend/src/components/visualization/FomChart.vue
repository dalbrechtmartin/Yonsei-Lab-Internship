<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-2 px-4">
      <h2 class="text-lg font-semibold text-ink">
        {{ t("fomcharts.type.scatter") }}
      </h2>
      <TooltipProvider :delay-duration="200">
        <div class="flex items-center gap-1.5">
          <span
            v-if="needsReviewCount > 0"
            class="flex items-center gap-1 bg-amber-500/15 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
          >
            {{ t("fomcharts.reviewWarning", { count: needsReviewCount }) }}
            <InfoTooltip
              v-if="hasFlaggedPoints"
              :text="t('fomcharts.flaggedHint')"
              icon-class="text-amber-800/70 hover:text-amber-800"
            />
          </span>
          <InfoTooltip v-else-if="hasFlaggedPoints" :text="t('fomcharts.flaggedHint')" />
          <span
            v-if="trendUnavailable"
            class="flex items-center gap-1 bg-amber-500/15 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
          >
            {{ t("fomcharts.controls.trendUnavailable") }}
            <InfoTooltip :text="t('fomcharts.tooltips.trendUnavailable')" icon-class="text-amber-800/70 hover:text-amber-800" />
          </span>
          <span
            v-if="originSummary"
            class="bg-secondary/10 text-secondary text-xs font-medium px-2.5 py-0.5 rounded whitespace-nowrap"
          >
            {{ originSummary }}
          </span>
          <span
            class="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded whitespace-nowrap"
          >
            {{ sampleCount }} {{ t("fomcharts.sampleCount") }}
          </span>
        </div>
      </TooltipProvider>
    </div>

    <div
      class="w-full h-125 rounded-2xl border border-secondary/10 bg-card/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm"
    >
      <v-chart ref="chartRef" class="chart" :option="chartOption" autoresize @click="handleChartClick" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed, provide, ref } from "vue";
import { use, registerTheme } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { ScatterChart, LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
} from "echarts/components";
import labTheme from "@/assets/themes/okabe-ito-palette.json";
import VChart, { THEME_KEY } from "vue-echarts";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import {
  findOriginColumn,
  findReviewStatusColumn,
  findTooltipExtraColumns,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findFomValueColumn,
  findModeIdColumn,
  findModeDescriptionColumn,
  tokenizeValue,
  type DataRow,
} from "@/utils/columnTypes";
import { computeStats, filterPlottable, linearRegression, computeParetoFrontier } from "@/utils/stats";

use([
  CanvasRenderer,
  ScatterChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  MarkLineComponent,
]);

registerTheme("Okabe-Ito-palette", labTheme.theme);
provide(THEME_KEY, "Okabe-Ito-palette");

const { t } = useI18n();

// yAxis/xAxis/yAxisScale are selected upstream (GraphControls, via
// VisualizationView) and simply passed down — this component only draws.
const props = withDefaults(
  defineProps<{
    chartData: DataRow[];
    columns: string[];
    yAxis?: string | null;
    xAxis?: string | null;
    groupBy?: string | null;
    yAxisScale?: "log" | "value";
    chartTitle?: string;
    showMedian?: boolean;
    showTrend?: boolean;
    showLegend?: boolean;
    showPareto?: boolean;
    showAxisNames?: boolean;
    xAxisNumeric?: boolean;
    // Isolating a group is now driven externally (clicking a card in
    // StatsSummaryPanel) -- this component only reads it to dim the rest.
    highlightGroup?: string | null;
    // Fixed label -> color assignment computed by VisualizationView off the
    // full unfiltered dataset (see utils/palette.ts) -- used instead of a
    // locally-computed index so a group's color never shifts just because a
    // filter temporarily hid some of its rows.
    groupColorMap?: Record<string, string>;
  }>(),
  {
    yAxis: null,
    xAxis: null,
    groupBy: null,
    yAxisScale: "log",
    chartTitle: "",
    showMedian: false,
    showTrend: false,
    showLegend: false,
    showPareto: false,
    showAxisNames: false,
    xAxisNumeric: false,
    highlightGroup: null,
    groupColorMap: () => ({}),
  },
);

const emit = defineEmits<{
  "point-click": [
    point: {
      ref: string;
      xLabel: string;
      xValue: unknown;
      yLabel: string;
      yValue: unknown;
      extras: Record<string, unknown>;
      row: DataRow;
    },
  ];
}>();

const chartRef = ref<InstanceType<typeof VChart> | null>(null);

const displayTitle = computed(() => props.chartTitle.trim());

const MAX_AXIS_LABEL_LENGTH = 24;

const palette: string[] = labTheme.theme.color;
const medianLineColor: string = labTheme.theme._custom.accentColor;
const legendColor: string = labTheme.theme._custom.legendColor;
// Kept visually distinct from the median line's accent orange so the two
// dashed overlays never read as the same indicator.
const trendLineColor: string = legendColor;

// Tooltip content is built as an HTML string for echarts (it renders via
// innerHTML), and every interpolated value below can originate from a
// cell in the researcher's uploaded spreadsheet — escape it so a stray
// "<" or a crafted cell value can't inject markup into the tooltip.
const escapeHtml = (value: unknown): string => {
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
};

const MIN_BUBBLE_SIZE = 6;
const MAX_BUBBLE_SIZE = 16;

const fomValueRange = computed(() => {
  const col = fomValueColumn.value;
  if (!col) return null;
  const values = plottableData.value
    .map((r) => Number(r[col]))
    .filter((v) => !isNaN(v));
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
});

const bubbleSizeFor = (value: number): number => {
  const range = fomValueRange.value;
  if (range === null || isNaN(value)) return 10;
  if (range.max === range.min) return (MIN_BUBBLE_SIZE + MAX_BUBBLE_SIZE) / 2;
  const t = (value - range.min) / (range.max - range.min);
  return MIN_BUBBLE_SIZE + t * (MAX_BUBBLE_SIZE - MIN_BUBBLE_SIZE);
};

// Rows with a missing/blank Y value must be dropped, not plotted — a naive
// Number(item[yAxis]) coerces null/"" to 0, which would silently draw a
// fake data point at y=0 for every record whose FOM value wasn't reported
// (e.g. a row correctly left blank because its FOM is frequency-domain).
// When the X axis is itself numeric (as opposed to a category label), the
// same rule applies there too, or a blank X would plot at x=0.
const plottableData = computed(() => {
  const yFiltered = filterPlottable(props.chartData, props.yAxis);
  return props.xAxisNumeric ? filterPlottable(yFiltered, props.xAxis) : yFiltered;
});

// Reflects the highlighted subset (when a group is isolated) rather than
// the full plotted dataset -- same reasoning as highlightedRows below: a
// badge reading "13 samples" next to a median computed from 5 would be its
// own inconsistency.
const sampleCount = computed(() => highlightedRows.value.length);

const originColumn = computed(() => findOriginColumn(props.columns));
const reviewStatusColumn = computed(() => findReviewStatusColumn(props.columns));
const materialClassColumn = computed(() => findMaterialClassColumn(props.columns));
const baseMaterialsColumn = computed(() => findBaseMaterialsColumn(props.columns));
const fomValueColumn = computed(() => findFomValueColumn(props.columns));
const modeIdColumn = computed(() => findModeIdColumn(props.columns));
const modeDescriptionColumn = computed(() => findModeDescriptionColumn(props.columns));
// Extra tooltip fields shouldn't repeat whatever's already on an axis/
// group-by — e.g. picking Origin as "Group / Color by" already shows it
// via the legend and the group line below, no need to print it twice.
const extraTooltipColumns = computed(() =>
  findTooltipExtraColumns(props.columns).filter(
    (col) => col !== props.xAxis && col !== props.yAxis && col !== props.groupBy,
  ),
);

// "EXP: 8 · SIM: 14" next to the sample-count badge — the Origin
// breakdown the Phase 1 evaluation plan asks researchers be able to see
// at a glance, independent of whichever axis/group-by is selected.
const originSummary = computed(() => {
  const column = originColumn.value;
  if (!column) return null;
  const counts: Record<string, number> = {};
  for (const item of highlightedRows.value) {
    const v: unknown = item[column];
    if (v === null || v === undefined || v === "") continue;
    const key = String(v);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  return entries.length > 0
    ? entries.map(([key, count]) => `${key}: ${count}`).join(" · ")
    : null;
});

const isEditStatus = (item: DataRow): boolean => {
  const column = reviewStatusColumn.value;
  if (!column) return false;
  const v = item[column];
  return typeof v === "string" && /^edit$/i.test(v.trim());
};

// "3 to review" next to the sample-count badge -- Review status: Edit means
// a value (usually FWHM) was calculated or estimated rather than read
// directly from the paper, so it's worth a researcher's attention before
// the record is trusted at face value.
const needsReviewCount = computed(() => highlightedRows.value.filter(isEditStatus).length);

// A "Review status: Edit" flag puts a dashed outline on a point (see
// withItemStyle) -- a data-quality signal worth a researcher's attention
// next to the sample count.
const hasFlaggedPoints = computed(() => needsReviewCount.value > 0);

// Grouping by a composite column (Material Class or Base Materials) is a
// special case: a composite cell like "Dielectric;Metal" should not become
// its own third bucket distinct from "Dielectric" and "Metal" — it should
// count toward *both* of those groups (the same point plotted twice, once
// per token) so the groups stay legible and match the corresponding filter
// chips exactly.
const isGroupingByCompositeColumn = computed(
  () =>
    !!props.groupBy &&
    (props.groupBy === materialClassColumn.value || props.groupBy === baseMaterialsColumn.value),
);

// Single source of truth for "does this row belong to this group" — used
// both to build each series' data (below) and to decide which rows feed
// the median/trend/Pareto overlays (see highlightedRows). Having two
// separate copies of this logic is exactly how the median line drifted out
// of sync with the highlighted group: the series filter respected
// highlightGroup's *dimming*, but the overlays kept reading unfiltered
// plottableData.
const matchesGroup = (item: DataRow, groupName: string): boolean => {
  if (!props.groupBy) return false;
  if (isGroupingByCompositeColumn.value) {
    const tokens = tokenizeValue(item[props.groupBy as string]);
    return tokens.length === 0 ? groupName === t("fomcharts.unknownGroup") : tokens.includes(groupName);
  }
  const v = item[props.groupBy as string];
  const normalized = v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
  return normalized === groupName;
};

// When a group is isolated (clicking its card in StatsSummaryPanel), every
// stat/overlay derived from "the plotted points" -- median line, trend
// line, Pareto frontier -- must read from that group's rows only, or they
// silently keep describing the whole dataset while the chart visually
// dims everything else, which is exactly the "median always says 42"
// inconsistency this fixes.
const highlightedRows = computed(() =>
  props.highlightGroup !== null && props.groupBy
    ? plottableData.value.filter((item) => matchesGroup(item, props.highlightGroup as string))
    : plottableData.value,
);

const yValues = computed(() =>
  props.yAxis
    ? highlightedRows.value.map((item) => Number(item[props.yAxis as string])).filter((v) => !isNaN(v))
    : [],
);
const medianValue = computed(() => computeStats(yValues.value).median);

// Computed once here and reused by both the series builder and the
// trendUnavailable badge below -- linearRegression silently returns null
// when there are fewer than 2 points, or when every point shares the same
// X value (isolating a single-row group is the common way to hit this), so
// "Trend line" can be toggled on with nothing to show for it; the badge
// makes that visible instead of a silent no-op.
const trendFit = computed(() => {
  if (!(props.showTrend && props.xAxisNumeric && props.xAxis && props.yAxis)) return null;
  const points = highlightedRows.value
    .map((item): [number, number] => [Number(item[props.xAxis as string]), Number(item[props.yAxis as string])])
    .filter(([x, y]) => !isNaN(x) && !isNaN(y));
  return linearRegression(points);
});
const trendUnavailable = computed(
  () => props.showTrend && props.xAxisNumeric && !!props.xAxis && !!props.yAxis && trendFit.value === null,
);

// When groupBy is set, every distinct value becomes its own series so
// echarts can color and legend them independently — the "categorical
// grouping" the plotting module needs (e.g. color points by Origin/
// Material Class) as opposed to xAxis, which only controls position.
const groupValues = computed(() => {
  if (!props.groupBy) return null;
  const values = new Set<string>();
  for (const row of plottableData.value) {
    if (isGroupingByCompositeColumn.value) {
      const tokens = tokenizeValue(row[props.groupBy as string]);
      if (tokens.length === 0) values.add(t("fomcharts.unknownGroup"));
      else tokens.forEach((tok) => values.add(tok));
    } else {
      const v = row[props.groupBy as string];
      values.add(v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v));
    }
  }
  return Array.from(values).sort();
});

const pointLabel = {
  show: true,
  position: "top",
  formatter: (params: any) => params.data.refLabel,
  fontSize: 10,
  color: legendColor,
};

const buildPoint = (item: DataRow) => {
  const extras: Record<string, unknown> = {};
  for (const col of extraTooltipColumns.value) {
    const v = item[col];
    if (v !== null && v !== undefined && v !== "") extras[col] = v;
  }
  const needsReview = isEditStatus(item);
  const rawX = props.xAxis ? item[props.xAxis] : undefined;
  const rawFomValue = fomValueColumn.value ? Number(item[fomValueColumn.value]) : NaN;
  // Already shown via the axis/group-by line below when Mode ID happens to
  // be picked as one of those -- no need to print it twice.
  const modeId =
    modeIdColumn.value && modeIdColumn.value !== props.xAxis && modeIdColumn.value !== props.groupBy
      ? item[modeIdColumn.value]
      : null;
  const modeDescription = modeDescriptionColumn.value ? item[modeDescriptionColumn.value] : null;
  const modeCase = [modeId, modeDescription].filter((v) => v !== null && v !== undefined && v !== "").join(" — ");

  return {
    value: [
      props.xAxisNumeric ? Number(rawX) : (rawX ?? t("fomcharts.unknownGroup")),
      Number(props.yAxis ? item[props.yAxis] : NaN),
    ],
    title: item.title ?? item.Title,
    refLabel: item.ref ?? item.Ref,
    modeCase: modeCase || null,
    extras,
    needsReview,
    isFlagged: needsReview,
    row: item,
    symbolSize: bubbleSizeFor(rawFomValue),
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
// isGroupingByCompositeColumn above for how Material Class points land in
// the right (possibly several) series to begin with.
const withItemStyle = (point: ReturnType<typeof buildPoint>, color: string, groupName: string | null) => {
  const dimmed = props.highlightGroup !== null && groupName !== null && groupName !== props.highlightGroup;
  const opacity = dimmed ? 0.15 : 0.88;
  return {
    ...point,
    itemStyle: point.isFlagged
      ? { color, opacity, borderType: "dashed" as const, borderWidth: 1, borderColor: legendColor }
      : { color, opacity },
  };
};

// Two distinct rows that happen to share the exact same x/y (a common FOM
// value at a shared x-category, e.g. two "Dielectric" papers both reporting
// FOM=53) render as a single dot otherwise -- N still counts both, but only
// one circle is visible and hideOverlap silently drops the other's ref
// label, so a researcher counting dots undercounts by one. This spreads
// same-coordinate points a few pixels apart vertically (screen space, not
// data space) so every row stays its own visible dot with its own label.
// Runs *after* the composite-column horizontal offset above, which already
// separates a single row's copies across different group series -- this
// pass instead separates different rows that land in the same series at
// the same spot, so it only ever adds a y-offset, never touching x.
const spreadDuplicatePoints = <T extends { value: unknown[]; symbolOffset?: [number, number]; symbolSize?: number }>(
  points: T[],
): T[] => {
  const groups = new Map<string, T[]>();
  for (const point of points) {
    const key = JSON.stringify(point.value);
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    // A fixed offset was small enough to still leave large FOM-driven
    // bubbles (see bubbleSizeFor, up to MAX_BUBBLE_SIZE) overlapping each
    // other -- basing the step on the group's own bubble size guarantees
    // visible separation regardless of how big the dots are.
    const offsetStep = Math.max(...group.map((p) => p.symbolSize ?? 10)) * 0.7 + 3;
    group.forEach((point, i) => {
      const xOffset = point.symbolOffset?.[0] ?? 0;
      point.symbolOffset = [xOffset, (i - (group.length - 1) / 2) * offsetStep];
    });
  }
  return points;
};

const seriesList = computed(() => {
  const medianMarkLine = {
    lineStyle: { type: "dashed", color: medianLineColor, width: 1 },
    data: props.showMedian
      ? [{ yAxis: medianValue.value, name: t("fomcharts.medianLine.name") }]
      : [],
    label: {
      formatter: t("fomcharts.medianLine.name") + "\n{c}",
      position: "middle",
      color: medianLineColor,
    },
  };

  const series: any[] = [];

  if (!props.groupBy || !groupValues.value) {
    series.push({
      name: t("fomcharts.type.scatter"),
      symbolSize: 10,
      type: "scatter",
      data: plottableData.value.map((item) => withItemStyle(buildPoint(item), palette[0], null)),
      label: pointLabel,
      // Papers plotted at the same x-tick with close FOM values get
      // stacked ref-labels ("47" printed twice, directly overlapping).
      // hideOverlap keeps whichever label fits and drops the rest rather
      // than rendering illegible stacked text — the point itself and its
      // tooltip are unaffected.
      labelLayout: { hideOverlap: true },
      markLine: medianMarkLine,
    });
  } else {
    groupValues.value.forEach((groupName, idx) => {
      const color = props.groupColorMap[groupName] ?? palette[idx % palette.length];
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
        data: plottableData.value
          .filter((item) => matchesGroup(item, groupName))
          .map((item) => {
            const point = buildPoint(item);
            // A row with several materials (e.g. "Dielectric;Metal") plots
            // once per material at the exact same x/y -- without an offset
            // the duplicates stack perfectly on top of each other and only
            // the last-drawn series' color is ever visible, which is what
            // made the chart's colors look arbitrary/wrong. symbolOffset
            // shifts each duplicate a few pixels apart (screen space, not
            // data space) so every material's dot stays visible without
            // moving the point off its real coordinate.
            if (isGroupingByCompositeColumn.value) {
              const tokens = tokenizeValue(item[props.groupBy as string]);
              const n = Math.max(tokens.length, 1);
              const i = Math.max(tokens.indexOf(groupName), 0);
              const offsetStep = 7;
              point.symbolOffset = [(i - (n - 1) / 2) * offsetStep, 0];
              // Every one of those duplicates would otherwise carry its own
              // copy of the same ref label, piling up n near-identical
              // strings on top of each other -- one Ref only needs to be
              // labeled once, so only the first material's dot keeps it.
              if (i !== 0) point.label = { show: false };
            }
            return withItemStyle(point, color, groupName);
          }),
        label: pointLabel,
        labelLayout: { hideOverlap: true },
        // Only the first series carries the median markLine — echarts draws it
        // across the full plot width regardless of which series owns it, so
        // attaching it to every series would just duplicate the line.
        markLine: idx === 0 ? medianMarkLine : { data: [] },
      });
    });
  }

  // Spread duplicate coordinates across the WHOLE chart, not per series --
  // two points from *different* series (e.g. one EXP, one SIM) landing on
  // the same x/y would otherwise never get separated, since each series only
  // ever saw its own single point at that spot. Points are the same object
  // references inside each series' data array, so mutating them here also
  // updates them in place there.
  spreadDuplicatePoints(series.filter((s) => s.type === "scatter").flatMap((s) => s.data));

  // A simple least-squares fit over the plotted points — only meaningful
  // when the X axis is itself a numeric quantity (e.g. Sensitivity), not a
  // category label like Material Class. Fit itself is computed once in
  // trendFit above (shared with the trendUnavailable badge).
  if (trendFit.value) {
    const xs = highlightedRows.value
      .map((item) => Number(item[props.xAxis as string]))
      .filter((x) => !isNaN(x));
    const xmin = Math.min(...xs);
    const xmax = Math.max(...xs);
    const fit = trendFit.value;
    series.push({
      name: t("fomcharts.controls.trendLine"),
      type: "line",
      data: [
        [xmin, fit.intercept + fit.slope * xmin],
        [xmax, fit.intercept + fit.slope * xmax],
      ],
      showSymbol: false,
      silent: true,
      z: 5,
      lineStyle: { type: "dashed", width: 2, color: trendLineColor },
    });
  }

  // Pareto frontier (maximize-both-axes non-dominated set) — only meaningful
  // when both X and Y axes are numeric.
  if (props.showPareto && props.xAxisNumeric && props.xAxis && props.yAxis) {
    const points = highlightedRows.value
      .map((item) => ({
        x: Number(item[props.xAxis as string]),
        y: Number(item[props.yAxis as string]),
        row: item,
      }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    const frontier = computeParetoFrontier(points);
    // A frontier of exactly one point has no line segment to draw --
    // `type: "line"` with a single coordinate renders nothing at all, which
    // reads as "the toggle did nothing" even though it worked correctly.
    // Draw it as a visible marker instead so a single non-dominated point
    // is never silently invisible.
    if (frontier.length === 1) {
      series.push({
        name: t("fomcharts.controls.pareto"),
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
        name: t("fomcharts.controls.pareto"),
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

  return series;
});

// The legend should only list names a user can actually make sense of.
// With no groupBy, all points share one series internally named after the
// generic "Scatter Plot" chart type — showing that as a legend chip reads
// as a meaningless label, so it's left out; only real group names (or the
// median/trend/Pareto overlays, when active) are listed.
// Split into two groups -- group-by colors vs. trend/Pareto overlays -- so
// they can render as two visually distinct legend rows (see chartOption's
// `legend` array below) instead of one run-on line that was hard to parse
// when both a color legend and the overlay names were mixed together.
const groupLegendNames = computed(() => (props.groupBy && groupValues.value ? groupValues.value : []));
const overlayLegendNames = computed(() => {
  const names: string[] = [];
  if (props.showTrend && props.xAxisNumeric && props.xAxis && props.yAxis) {
    names.push(t("fomcharts.controls.trendLine"));
  }
  if (props.showPareto && props.xAxisNumeric && props.xAxis && props.yAxis) {
    names.push(t("fomcharts.controls.pareto"));
  }
  return names;
});

// Pinning a point is meant for comparing metrics across papers, not for
// re-reading the title (already one hover away in the tooltip) -- so the
// annotation carries the two plotted axes plus whatever secondary metrics
// (Sensitivity, Q-factor, ...) the tooltip itself already surfaces.
const handleChartClick = (params: any) => {
  if (params.componentType !== "series" || !params.data || params.data.refLabel === undefined) return;
  emit("point-click", {
    ref: String(params.data.refLabel ?? ""),
    xLabel: props.xAxis ?? "",
    xValue: params.data.value?.[0],
    yLabel: props.yAxis ?? "",
    yValue: params.data.value?.[1],
    extras: params.data.extras ?? {},
    row: params.data.row,
  });
};

/** Downloads the current chart render as a PNG -- used by the workspace's
 * Export menu. Mirrors echarts' own toolbox "save as image" action, just
 * triggerable from outside the chart. */
const exportPng = (filename = "fom_chart.png") => {
  const url = chartRef.value?.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" });
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

defineExpose({ exportPng });

// Rough pixel-width estimate for reserving grid margin for an axis name --
// echarts' containLabel does not reliably account for axis *names* (as
// opposed to tick labels), so without an explicit reservation a long name
// can render past the canvas edge and simply appear to vanish. This was the
// numeric x-axis name disappearing bug: its old nameGap (32px, "middle"
// location) had no matching grid.bottom reservation the way the category
// axis's nameGap (85px) implicitly got from its rotated tick labels
// growing containLabel's margin anyway.
const estimateAxisNameSpace = (text: string): number => (text ? text.length * 6.2 + 16 : 0);

const chartOption = computed(() => {
  // The axis name (the actual column name, e.g. "Sensitivity (nm/RIU)") is
  // always shown -- it's not what showAxisNames controls. showAxisNames
  // only toggles the small "X ·"/"Y ·" marker prefixed onto it, which helps
  // tell at a glance which line is X and which is Y (most useful when both
  // axes are numeric and otherwise look alike).
  const xColumnName = props.xAxis ?? "";
  const yColumnName = props.yAxis ?? "";
  const xName = xColumnName ? (props.showAxisNames ? `X · ${xColumnName}` : xColumnName) : "";
  const yName = yColumnName ? (props.showAxisNames ? `Y · ${yColumnName}` : yColumnName) : "";
  const xNameSpace = estimateAxisNameSpace(xName);
  const yNameSpace = yName ? 26 : 0;

  // The chart title and the legend both default to the top-center of the
  // canvas -- with no reservation for the title's own line height, a
  // non-empty title sat directly on top of (or under) the legend/points.
  // titleSpace pushes everything below it down by one line when a title is
  // actually set.
  const hasTitle = !!displayTitle.value;
  const titleTop = 4;
  const titleSpace = hasTitle ? 26 : 0;

  // Group-by colors and trend/Pareto overlays render as two separate legend
  // rows (rather than one run-on line) so a researcher isn't left parsing
  // "Dielectric, Metal, Trend line, Pareto frontier" as if they were all the
  // same kind of thing.
  const showGroupLegend = props.showLegend && groupLegendNames.value.length > 0;
  const showOverlayLegend = props.showLegend && overlayLegendNames.value.length > 0;
  const legendRows = (showGroupLegend ? 1 : 0) + (showOverlayLegend ? 1 : 0);
  const groupLegendTop = titleTop + titleSpace;
  const overlayLegendTop = showGroupLegend ? groupLegendTop + 22 : groupLegendTop;

  return {
  // Changing an axis, groupBy, or the trend-line toggle usually reshapes the
  // series array enough that echarts can't match old vs new series/data and
  // smoothly interpolate -- it tears the series down and replays its
  // default "grow from nothing" enter animation (~1s), during which the
  // chart looks empty/frozen. animationDurationUpdate: 0 alone doesn't
  // cover this case (echarts treats a torn-down-and-rebuilt series as a
  // fresh enter, not an update), so animation is disabled outright --
  // control-driven changes should be instant on a data tool like this one.
  animation: false,
  title: { text: displayTitle.value, left: "center", top: titleTop },
  // Controlled by Display > Show legend (GraphControls) -- on by default so
  // exporting the chart as an image (see exportPng below) still carries a
  // key for which color is which group. Two entries: group-by colors on
  // their own row, trend/Pareto overlays on a second row below it (see
  // groupLegendTop/overlayLegendTop above).
  legend: [
    {
      show: showGroupLegend,
      data: groupLegendNames.value,
      top: groupLegendTop,
      left: "center",
      selectedMode: false,
      textStyle: { color: legendColor, fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
    },
    {
      show: showOverlayLegend,
      data: overlayLegendNames.value,
      top: overlayLegendTop,
      left: "center",
      selectedMode: false,
      textStyle: { color: legendColor, fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
    },
  ],
  // left/right stay modest (containLabel still grows them further if an
  // unusually wide tick label needs it) instead of the ~10% default on
  // both sides, which left a dead strip on the left; too tight on the left
  // and a numeric (value-type) x-axis, which has no category buckets
  // holding points away from x=0, ends up drawing points/labels right
  // through that area. right/top get an explicit reservation for the axis
  // names themselves (see estimateAxisNameSpace above) since they now
  // render at the end of each axis rather than below/beside the ticks.
  grid: {
    top: 16 + titleSpace + legendRows * 24 + yNameSpace,
    left: 56,
    right: 32 + xNameSpace,
    bottom: 8,
    containLabel: true,
  },
  tooltip: {
    trigger: "item",
    formatter: (params: any) => {
      if (params.componentType === "markLine") {
        return `${t("fomcharts.medianLine.name")}: ${escapeHtml(params.data.value)}`;
      }
      if (params.seriesType === "line") {
        return escapeHtml(params.seriesName);
      }
      const groupLine = props.groupBy
        ? `${escapeHtml(props.groupBy)}: <strong>${escapeHtml(params.seriesName)}</strong><br/>`
        : "";
      // Disambiguates which of a paper's several extracted rows this point
      // is -- Mode ID + Mode Description together (e.g. "Mode 1 —
      // Resonance peak P1") -- without it, two points from the same
      // Ref/Title look identical in the tooltip.
      const modeCaseLine = params.data.modeCase
        ? `<em style="opacity:0.75">${escapeHtml(params.data.modeCase)}</em><br/>`
        : "";
      const needsReviewLine = params.data.needsReview
        ? `<span style="color:${medianLineColor}">${t("fomcharts.needsReview")}</span><br/>`
        : "";
      const extraLines = Object.entries(params.data.extras ?? {})
        .map(([key, val]) => `${escapeHtml(key)}: <strong>${escapeHtml(val)}</strong><br/>`)
        .join("");
      return `<div style="max-width: 300px; white-space: normal;">
                <strong>${escapeHtml(params.data.refLabel ?? "")}</strong> ${escapeHtml(params.data.title ?? "")}<br/>
                ${modeCaseLine}
                <br/>
                ${needsReviewLine}
                ${groupLine}
                ${escapeHtml(props.xAxis)}: <strong>${escapeHtml(params.data.value[0])}</strong><br/>
                ${escapeHtml(props.yAxis)}: <strong>${escapeHtml(params.data.value[1])}</strong><br/>
                ${extraLines}
              </div>`;
    },
  },
  toolbox: {
    feature: {
      saveAsImage: { title: t("fomcharts.toolbox.feature.saveAsImage.title") },
    },
  },
  // The visible slider bar sat right under the x-axis name and would
  // overlap it for long names -- "inside" (scroll-wheel/pinch zoom) covers
  // zooming without it; scrolling back out is the only way to un-zoom now
  // that the toolbox's own zoom/restore buttons are gone.
  dataZoom: [{ type: "inside" }],
  // nameLocation "end" puts the column name right at the tip of each axis
  // (past the last tick) instead of centered below/beside the tick labels --
  // this both answers "which axis is X and which is Y" directly on the
  // chart, and sidesteps the old clipping bug, since grid.right/top above
  // now reserve dedicated space for it rather than relying on containLabel.
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
          // Full layer-structure strings can run to 80+ characters — rotated
          // at full length they sprawl across most of the chart height and
          // still overlap their neighbors. Truncate the tick label; the full
          // text stays available in the tooltip on hover.
          formatter: (value: string) =>
            value.length > MAX_AXIS_LABEL_LENGTH
              ? `${value.slice(0, MAX_AXIS_LABEL_LENGTH)}…`
              : value,
        },
      },
  yAxis: {
    type: props.yAxisScale,
    name: yName,
    nameLocation: "end",
    nameGap: 12,
  },
  series: seriesList.value,
  };
});
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>
