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

    <div
      class="w-full h-125 rounded-2xl border border-secondary/10 bg-card/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm"
    >
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed, provide } from "vue";
import { use, registerTheme } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { ScatterChart } from "echarts/charts";
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

use([
  CanvasRenderer,
  ScatterChart,
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
  }>(),
  {
    yAxis: null,
    xAxis: null,
    groupBy: null,
    yAxisScale: "log",
    chartTitle: "",
    showMedian: true,
  },
);

const displayTitle = computed(() => props.chartTitle.trim());

const MAX_AXIS_LABEL_LENGTH = 24;

const palette: string[] = labTheme.theme.color;
const medianLineColor: string = labTheme.theme._custom.accentColor;
const legendColor: string = labTheme.theme._custom.legendColor;

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
const plottableData = computed(() => {
  if (!props.yAxis) return props.chartData;
  return props.chartData.filter((item) => {
    const raw = item[props.yAxis as string];
    if (raw === null || raw === undefined || raw === "") return false;
    return !isNaN(Number(raw));
  });
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

const medianValue = computed(() => {
  if (!props.yAxis) return 0;
  const values = plottableData.value
    .map((item) => Number(item[props.yAxis as string]))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 !== 0
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2;
});

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

  return {
    value: [
      (props.xAxis ? item[props.xAxis] : undefined) ?? t("fomcharts.unknownGroup"),
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
const withItemStyle = (point: ReturnType<typeof buildPoint>, color: string) => ({
  ...point,
  itemStyle: point.isUnclear
    ? { color, borderType: "dashed" as const, borderWidth: 2, borderColor: legendColor }
    : { color },
});

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

  if (!props.groupBy || !groupValues.value) {
    return [
      {
        name: t("fomcharts.type.scatter"),
        symbolSize: 10,
        type: "scatter",
        data: plottableData.value.map((item) => withItemStyle(buildPoint(item), palette[0])),
        label: pointLabel,
        // Papers plotted at the same x-tick with close FOM values get
        // stacked ref-labels ("47" printed twice, directly overlapping).
        // hideOverlap keeps whichever label fits and drops the rest rather
        // than rendering illegible stacked text — the point itself and its
        // tooltip are unaffected.
        labelLayout: { hideOverlap: true },
        markLine: medianMarkLine,
      },
    ];
  }

  return groupValues.value.map((groupName, idx) => ({
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
      .map((item) => withItemStyle(buildPoint(item), palette[idx % palette.length])),
    label: pointLabel,
    labelLayout: { hideOverlap: true },
    // Only the first series carries the median markLine — echarts draws it
    // across the full plot width regardless of which series owns it, so
    // attaching it to every series would just duplicate the line.
    markLine: idx === 0 ? medianMarkLine : { data: [] },
  }));
});

const chartOption = computed(() => ({
  title: { text: displayTitle.value, left: "center" },
  // type: "scroll" keeps the legend to a single row with pager arrows
  // instead of wrapping into extra rows that collide with the title and
  // the y-axis name — group-by values are meant to be a handful of
  // categories (Origin, Material Class...), but nothing stops a long list.
  legend: { show: !!props.groupBy, type: "scroll", top: 28 },
  grid: { top: props.groupBy ? 70 : 40, containLabel: true },
  tooltip: {
    trigger: "item",
    formatter: (params: any) => {
      if (params.componentType === "markLine") {
        return `${t("fomcharts.medianLine.name")}: ${escapeHtml(params.data.value)}`;
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
      dataZoom: {
        title: {
          zoom: t("fomcharts.toolbox.feature.dataZoom.title.zoom"),
          back: t("fomcharts.toolbox.feature.dataZoom.title.back"),
        },
      },
      restore: { title: t("fomcharts.toolbox.feature.restore.title") },
    },
  },
  dataZoom: [{ type: "inside" }, { type: "slider" }],
  xAxis: {
    type: "category",
    name: props.xAxis,
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
  },
  series: seriesList.value,
}));
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>
