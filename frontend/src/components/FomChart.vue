<template>
  <div
    class="w-full h-125 bg-white p-4 rounded-xl shadow-lg border border-gray-100"
  >
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

<script setup>
import { computed, provide } from "vue";
import { use } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { ScatterChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
} from "echarts/components";
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
]);

provide(THEME_KEY, "light");

const props = defineProps(["chartData"]);

const chartOption = computed(() => ({
  title: { text: "Wavelength-Domain FOM Distribution", left: "center" },
  tooltip: {
    trigger: "item",
    // formatter for tooltip to show title and FOM value
    formatter: (params) =>
      `${params.data.title}<br/>FOM: ${params.data.value[1]}`,
  },
  toolbox: {
    feature: {
      saveAsImage: { title: "Export" }, // export
      dataZoom: { title: { zoom: "Zoom", back: "Reset" } },
    },
  },
  dataZoom: [{ type: "inside" }, { type: "slider" }], // zoom
  xAxis: { type: "category", name: "Reference" },
  yAxis: { type: "value", name: "FOM (/RIU)" },
  series: [
    {
      symbolSize: 20, // dot size
      data: props.chartData.map((item) => ({
        value: [item.ref, item["wavelength based FOM(/RIU)"]],
        title: item.title,
      })),
      type: "scatter",
      itemStyle: { color: "#5bc0be" },
    },
  ],
}));
</script>
