<template>
  <div class="w-full">
    <div class="flex justify-between items-center mb-2 px-4">
      <h2 class="text-lg font-semibold text-ink">
        {{ t("fomcharts.title") }}
      </h2>
      <span
        class="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded"
      >
        {{ sampleCount }} {{ t("fomcharts.sampleCount") }}
      </span>
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
import type { DataRow } from "@/utils/columnTypes";

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
    yAxisScale?: "log" | "value";
  }>(),
  {
    yAxis: null,
    xAxis: null,
    yAxisScale: "log",
  },
);

const palette: string[] = labTheme.theme.color;
const medianLineColor: string = labTheme.theme._custom.accentColor;
const legendColor: string = labTheme.theme._custom.legendColor;

const sampleCount = computed(() => props.chartData.length);

const medianValue = computed(() => {
  if (!props.yAxis) return 0;
  const values = props.chartData
    .map((item) => Number(item[props.yAxis as string]))
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
    formatter: (params: any) => {
      if (params.componentType === "markLine") {
        return `${t("fomcharts.medianLine.name")}: ${params.data.value}`;
      }
      return `<div style="max-width: 300px; white-space: normal;">
                <strong>${params.data.refLabel ?? ""}</strong> ${params.data.title ?? ""}<br/><br/>
                ${props.xAxis}: <strong>${params.data.value[0]}</strong><br/>
                ${props.yAxis}: <strong>${params.data.value[1]}</strong>
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
    axisLabel: { interval: 0, rotate: 30 },
  },
  yAxis: {
    type: props.yAxisScale,
    name: props.yAxis,
  },
  series: [
    {
      symbolSize: 10,
      type: "scatter",
      data: props.chartData.map((item) => ({
        value: [
          (props.xAxis ? item[props.xAxis] : undefined) ??
            t("fomcharts.unknownGroup"),
          Number(props.yAxis ? item[props.yAxis] : NaN),
        ],
        title: item.title ?? item.Title,
        refLabel: item.ref ?? item.Ref,
        itemStyle: { color: palette[0] },
      })),
      label: {
        show: true,
        position: "top",
        formatter: (params: any) => params.data.refLabel,
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
</script>

<style scoped>
.chart {
  height: 100%;
}
</style>
