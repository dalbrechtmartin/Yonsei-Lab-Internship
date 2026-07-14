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

    <div
      class="w-full h-125 bg-white p-4 rounded-xl shadow-lg border border-gray-100"
    >
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<script setup>
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
const props = defineProps(["chartData"]);

const palette = labTheme.theme.color;
const medianLineColor = labTheme.theme._custom.accentColor;

const sampleCount = computed(() => props.chartData.length);

const medianFOM = computed(() => {
  const fomValues = props.chartData
    .map((item) => item["wavelength based FOM(/RIU)"])
    .sort((a, b) => a - b);
  const mid = Math.floor(fomValues.length / 2);
  return fomValues.length % 2 !== 0
    ? fomValues[mid]
    : (fomValues[mid - 1] + fomValues[mid]) / 2;
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
                <strong>${params.data.title}</strong><br/>
                FOM: <strong>${params.data.value[1]}</strong>
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
    name: t("fomcharts.xAxis.name"),
    axisLabel: { interval: 0, rotate: 30 },
  },
  yAxis: {
    type: "log",
    name: t("fomcharts.yAxis.name"),
  },
  series: [
    {
      symbolSize: 15,
      type: "scatter",
      data: props.chartData.map((item, index) => ({
        value: [item.ref, item["wavelength based FOM(/RIU)"]],
        title: item.title,
        itemStyle: { color: palette[0] },
      })),
      markLine: {
        lineStyle: { type: "dashed", color: medianLineColor, width: 2 },
        data: [
          { yAxis: medianFOM.value, name: t("fomcharts.medianLine.name") },
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
