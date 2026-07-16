<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-2 px-4">
      <h2 class="text-lg font-semibold text-gray-700">
        {{ t("fomcharts.title") }}
      </h2>
      <span
        class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded"
      >
        {{ sampleCount }} {{ t("fomcharts.sampleCount") }}
      </span>
    </div>

    <!-- Dynamic axis/group selectors: no column name is hardcoded here.
         This is what lets the same chart work with the golden 4-column
         file AND the richer harmonized export, or anything else uploaded. -->
    <div class="flex flex-wrap items-center gap-4 mb-2 px-4">
      <label class="flex items-center gap-2 text-sm text-gray-600">
        {{ t("fomcharts.controls.yAxis") }}
        <select
          v-model="selectedYAxis"
          class="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option v-for="col in numericColumns" :key="col" :value="col">
            {{ col }}
          </option>
        </select>
      </label>

      <label class="flex items-center gap-2 text-sm text-gray-600">
        {{ t("fomcharts.controls.xAxis") }}
        <select
          v-model="selectedxAxis"
          class="border border-gray-300 rounded px-2 py-1 text-sm"
        >
          <option v-for="col in categoricalColumns" :key="col" :value="col">
            {{ col }}
          </option>
        </select>
      </label>

      <div class="flex items-center gap-2">
        <span class="text-sm text-gray-500">{{
          t("fomcharts.scale.label")
        }}</span>
        <div
          class="inline-flex rounded-md border border-gray-200 overflow-hidden"
        >
          <button
            class="px-3 py-1 text-sm"
            :class="
              yAxisScale === 'log'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            "
            @click="yAxisScale = 'log'"
          >
            {{ t("fomcharts.scale.log") }}
          </button>
          <button
            class="px-3 py-1 text-sm border-l border-gray-200"
            :class="
              yAxisScale === 'value'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            "
            @click="yAxisScale = 'value'"
          >
            {{ t("fomcharts.scale.linear") }}
          </button>
        </div>
      </div>

      <button
        class="ml-auto px-3 py-1 text-sm rounded border border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
        @click="exportFilteredDataset"
      >
        {{ t("fomcharts.controls.exportCsv") }}
      </button>
    </div>

    <div
      class="w-full h-125 bg-white p-4 rounded-xl shadow-lg border border-gray-100"
    >
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { computed, provide, ref, watch } from "vue";
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
  detectColumnTypes,
  guessDefaultYAxis,
  guessDefaultGroup,
} from "@/utils/columnTypes.js";

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
// `columns` comes straight from the API response (data.columns), so it
// always reflects whatever file was actually uploaded.
const props = defineProps(["chartData", "columns"]);

const palette = labTheme.theme.color;
const medianLineColor = labTheme.theme._custom.accentColor;
const legendColor = labTheme.theme._custom.legendColor;

const yAxisScale = ref("log"); // "log" | "value"

// IMPORTANT: these must stay reactive computed refs (not `.value` unwrapped
// here), otherwise the dropdown options go stale if a second file with a
// different schema is uploaded without remounting this component.
const columnTypes = computed(() =>
  detectColumnTypes(props.chartData, props.columns),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);

const selectedYAxis = ref(guessDefaultYAxis(numericColumns.value));
const selectedxAxis = ref(guessDefaultGroup(categoricalColumns.value));

// If a new file is uploaded with a different schema, re-pick sensible
// defaults instead of pointing at columns that no longer exist.
watch(
  () => props.columns,
  () => {
    selectedYAxis.value = guessDefaultYAxis(numericColumns.value);
    selectedxAxis.value = guessDefaultGroup(categoricalColumns.value);
  },
);

const sampleCount = computed(() => props.chartData.length);

const medianValue = computed(() => {
  if (!selectedYAxis.value) return 0;
  const values = props.chartData
    .map((item) => Number(item[selectedYAxis.value]))
    .filter((v) => !isNaN(v))
    .sort((a, b) => a - b);
  if (values.length === 0) return 0;
  const mid = Math.floor(values.length / 2);
  return values.length % 2 !== 0
    ? values[mid]
    : (values[mid - 1] + values[mid]) / 2;
});

const chartOption = computed(() => ({
  title: { text: t("fomcharts.title"), left: "center" },
  tooltip: {
    trigger: "item",
    formatter: (params) => {
      if (params.componentType === "markLine") {
        return `${t("fomcharts.medianLine.name")}: ${params.data.value}`;
      }
      return `<div style="max-width: 300px; white-space: normal;">
                <strong>${params.data.refLabel ?? ""}</strong> ${params.data.title ?? ""}<br/><br/>
                ${selectedxAxis.value}: <strong>${params.data.value[0]}</strong><br/>
                ${selectedYAxis.value}: <strong>${params.data.value[1]}</strong>
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
    name: selectedxAxis.value,
    axisLabel: { interval: 0, rotate: 30 },
  },
  yAxis: {
    type: yAxisScale.value,
    name: selectedYAxis.value,
  },
  series: [
    {
      symbolSize: 10,
      type: "scatter",
      data: props.chartData.map((item) => ({
        value: [
          item[selectedxAxis.value] ?? t("fomcharts.unknownGroup"),
          Number(item[selectedYAxis.value]),
        ],
        title: item.title ?? item.Title,
        refLabel: item.ref ?? item.Ref,
        itemStyle: { color: palette[0] },
      })),
      label: {
        show: true,
        position: "top",
        formatter: (params) => params.data.refLabel,
        fontSize: 10,
        color: legendColor,
      },
      markLine: {
        lineStyle: { type: "dashed", color: medianLineColor, width: 1 },
        data: [
          { yAxis: medianValue.value, name: t("fomcharts.medianLine.name") },
        ],
        label: {
          formatter: t("fomcharts.medianLine.name") + "\n{c}",
          position: "middle",
          color: medianLineColor,
        },
      },
    },
  ],
}));

// Exports exactly what's currently loaded (all columns, all rows) as CSV.
// Filtering to the zoomed range could be added later by reading the
// dataZoom component's current window if that becomes a real need.
function exportFilteredDataset() {
  if (props.chartData.length === 0) return;

  const header = props.columns.join(",");
  const rows = props.chartData.map((row) =>
    props.columns
      .map((col) => {
        const val = row[col] ?? "";
        const escaped = String(val).replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      })
      .join(","),
  );
  const csvContent = [header, ...rows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "fom_data_export.csv";
  link.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>
