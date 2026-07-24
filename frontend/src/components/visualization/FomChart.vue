<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-2 px-4">
      <h2 class="text-lg font-semibold text-ink">
        {{ t("fomcharts.type.scatter") }}
      </h2>
      <div class="flex items-center gap-2">
        <span v-if="hasUnclearReported" class="text-xs text-secondary italic">
          {{ t("fomcharts.unclearHint") }}
        </span>
        <span
          v-if="originSummary"
          class="bg-secondary/10 text-secondary text-xs font-medium px-2.5 py-0.5 rounded"
        >
          {{ originSummary }}
        </span>
        <span
          class="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded"
        >
          {{ sampleCount }} {{ t("fomcharts.sampleCount") }}
        </span>
      </div>
    </div>

    <!-- One chip per group value when a "Group / color by" column is set --
         clicking a chip isolates that group by dimming the rest, letting a
         researcher pick a single series out of a busy plot without having
         to change the Domain/Origin filters. -->
    <div v-if="groupValues" class="mb-2 flex flex-wrap items-center gap-2 px-4">
      <button
        v-for="(name, idx) in groupValues"
        :key="name"
        type="button"
        class="inline-flex items-center gap-1.5 rounded-full border border-secondary/15 px-2.5 py-1 text-[11.5px] font-medium transition duration-150"
        :class="
          highlightGroup && highlightGroup !== name
            ? 'bg-secondary/5 text-muted-foreground opacity-60'
            : 'bg-white/80 text-ink shadow-sm'
        "
        @click="toggleHighlight(name)"
      >
        <span class="inline-block size-2 rounded-full" :style="{ background: palette[idx % palette.length] }" />
        {{ name }}
      </button>
    </div>

    <div
      class="w-full h-125 rounded-2xl border border-secondary/10 bg-card/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm"
    >
      <v-chart class="chart" :option="chartOption" autoresize @click="handleChartClick" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed, provide } from "vue";
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
import {
  findOriginColumn,
  findReportedColumn,
  findTooltipExtraColumns,
  type DataRow,
} from "@/utils/columnTypes";
import { computeStats, filterPlottable, linearRegression } from "@/utils/stats";

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
    xAxisNumeric?: boolean;
  }>(),
  {
    yAxis: null,
    xAxis: null,
    groupBy: null,
    yAxisScale: "log",
    chartTitle: "",
    showMedian: true,
    showTrend: false,
    xAxisNumeric: false,
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
    },
  ];
}>();

// Isolating a group by clicking its chip (below) is chart-local UI state,
// not something the rest of the page needs to persist or react to beyond
// resetting it when groupBy itself changes -- see VisualizationView.
const highlightGroup = defineModel<string | null>("highlightGroup", { default: null });

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

const sampleCount = computed(() => plottableData.value.length);

const originColumn = computed(() => findOriginColumn(props.columns));
const reportedColumn = computed(() => findReportedColumn(props.columns));
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
  for (const item of plottableData.value) {
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

const hasUnclearReported = computed(() => {
  const column = reportedColumn.value;
  if (!column) return false;
  return plottableData.value.some((item) => {
    const v: unknown = item[column];
    return typeof v === "string" && /unclear/i.test(v);
  });
});

const yValues = computed(() =>
  props.yAxis
    ? plottableData.value.map((item) => Number(item[props.yAxis as string])).filter((v) => !isNaN(v))
    : [],
);
const medianValue = computed(() => computeStats(yValues.value).median);

// When groupBy is set, every distinct value becomes its own series so
// echarts can color and legend them independently — the "categorical
// grouping" the plotting module needs (e.g. color points by Origin/
// Material Class) as opposed to xAxis, which only controls position.
const groupValues = computed(() => {
  if (!props.groupBy) return null;
  const values = new Set<string>();
  for (const row of plottableData.value) {
    const v = row[props.groupBy as string];
    values.add(v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v));
  }
  return Array.from(values).sort();
});

const toggleHighlight = (name: string) => {
  highlightGroup.value = highlightGroup.value === name ? null : name;
};

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
  const reportedValue = reportedColumn.value ? item[reportedColumn.value] : null;
  const isUnclear = typeof reportedValue === "string" && /unclear/i.test(reportedValue);
  const rawX = props.xAxis ? item[props.xAxis] : undefined;

  return {
    value: [
      props.xAxisNumeric ? Number(rawX) : (rawX ?? t("fomcharts.unknownGroup")),
      Number(props.yAxis ? item[props.yAxis] : NaN),
    ],
    title: item.title ?? item.Title,
    refLabel: item.ref ?? item.Ref,
    extras,
    isUnclear,
  };
};

// A dashed outline flags points whose FOM Reported flag is "Unclear" —
// a data-quality signal, not a category, so it rides on top of whatever
// fill color the group/series already assigned rather than replacing it.
// Clicking a chip (above) to isolate one group dims the rest instead of
// hiding them, so the overall shape of the dataset stays visible.
const withItemStyle = (point: ReturnType<typeof buildPoint>, color: string, groupName: string | null) => {
  const dimmed = highlightGroup.value !== null && groupName !== null && groupName !== highlightGroup.value;
  const opacity = dimmed ? 0.15 : 0.88;
  return {
    ...point,
    itemStyle: point.isUnclear
      ? { color, opacity, borderType: "dashed" as const, borderWidth: 2, borderColor: legendColor }
      : { color, opacity },
  };
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
      series.push({
        name: groupName,
        symbolSize: 10,
        type: "scatter",
        data: plottableData.value
          .filter((item) => {
            const v = item[props.groupBy as string];
            const normalized =
              v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
            return normalized === groupName;
          })
          .map((item) => withItemStyle(buildPoint(item), palette[idx % palette.length], groupName)),
        label: pointLabel,
        labelLayout: { hideOverlap: true },
        // Only the first series carries the median markLine — echarts draws it
        // across the full plot width regardless of which series owns it, so
        // attaching it to every series would just duplicate the line.
        markLine: idx === 0 ? medianMarkLine : { data: [] },
      });
    });
  }

  // A simple least-squares fit over the plotted points — only meaningful
  // when the X axis is itself a numeric quantity (e.g. Sensitivity), not a
  // category label like Material Class.
  if (props.showTrend && props.xAxisNumeric && props.xAxis && props.yAxis) {
    const points = plottableData.value
      .map((item): [number, number] => [Number(item[props.xAxis as string]), Number(item[props.yAxis as string])])
      .filter(([x, y]) => !isNaN(x) && !isNaN(y));
    const fit = linearRegression(points);
    if (fit) {
      const xs = points.map((p) => p[0]);
      const xmin = Math.min(...xs);
      const xmax = Math.max(...xs);
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
  }

  return series;
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
  });
};

const chartOption = computed(() => ({
  // Changing an axis, groupBy, or the trend-line toggle usually reshapes the
  // series array enough that echarts can't match old vs new series/data and
  // smoothly interpolate -- it tears the series down and replays its
  // default "grow from nothing" enter animation (~1s), during which the
  // chart looks empty/frozen. animationDurationUpdate: 0 alone doesn't
  // cover this case (echarts treats a torn-down-and-rebuilt series as a
  // fresh enter, not an update), so animation is disabled outright --
  // control-driven changes should be instant on a data tool like this one.
  animation: false,
  title: { text: displayTitle.value, left: "center" },
  // The group chips above the chart (see template) already show every
  // group's color and name, and additionally let you isolate one by
  // clicking it -- echarts' own legend would just repeat that mapping in
  // the chart itself, so it stays off.
  legend: { show: false },
  // left/right stay modest (containLabel still grows them further if an
  // unusually wide tick label needs it) instead of the ~10% default on
  // both sides, which left a dead strip on the left and — combined with
  // the x-axis name trailing off the last tick — clipped the name on the
  // right. left needs to comfortably fit the y-axis tick labels *and* its
  // rotated name (see yAxis.nameGap below); too tight and a numeric
  // (value-type) x-axis, which has no category buckets holding points
  // away from x=0, ends up drawing points/labels right through that area.
  grid: { top: 40, left: 56, right: 32, containLabel: true },
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
      const unclearLine = params.data.isUnclear
        ? `<span style="color:${medianLineColor}">${t("fomcharts.unclearReported")}</span><br/>`
        : "";
      const extraLines = Object.entries(params.data.extras ?? {})
        .map(([key, val]) => `${escapeHtml(key)}: <strong>${escapeHtml(val)}</strong><br/>`)
        .join("");
      return `<div style="max-width: 300px; white-space: normal;">
                <strong>${escapeHtml(params.data.refLabel ?? "")}</strong> ${escapeHtml(params.data.title ?? "")}<br/><br/>
                ${unclearLine}
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
  xAxis: props.xAxisNumeric
    ? { type: "value", name: props.xAxis, nameLocation: "middle", nameGap: 32 }
    : {
        type: "category",
        name: props.xAxis,
        // Centered below the (rotated) tick labels instead of the echarts
        // default of trailing after the last one -- a long axis name at
        // the end has nowhere left to go and gets clipped by the chart's
        // right edge; centered under the full axis width it always fits.
        nameLocation: "middle",
        nameGap: 85,
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
    name: props.yAxis,
    // echarts' default y-axis name sits horizontally above the top tick,
    // left-anchored roughly at the axis line -- for a long descriptive
    // column name (e.g. "Wavelength-based FOM (/RIU)") that runs past the
    // left edge of the chart and gets clipped. Rotated and centered
    // alongside the axis, it uses the chart's height instead of its width,
    // so it always fits regardless of how long the column name is.
    nameLocation: "middle",
    nameGap: 50,
    nameRotate: 90,
  },
  series: seriesList.value,
}));
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>
