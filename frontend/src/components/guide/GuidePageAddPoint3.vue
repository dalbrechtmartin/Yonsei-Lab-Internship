<template>
  <!-- ============================= PAGE 13 -- Mode 1: add a point, result on the chart ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1AddPoint3')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.addPoint3.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.addPoint3.body") }}
    </p>

    <div ref="addPoint3Wrap" class="relative mx-auto" style="width: 560px">
      <div
        class="guide-callout-region"
        style="width: 560px; height: 400px; overflow: hidden"
      >
        <div
          style="
            width: 800px;
            transform: scale(0.7);
            transform-origin: top left;
          "
        >
          <FomChart
            ref="addPoint3ChartRef"
            :chart-data="addPointResultRows"
            :columns="sampleColumns"
            :y-axis="selectedYAxis"
            :x-axis="selectedXAxis"
            :group-by="groupBy"
            :y-axis-scale="yAxisScale"
            :show-legend="true"
            :show-median="false"
            :show-trend="false"
            :show-pareto="false"
            :x-axis-numeric="true"
            :group-color-map="groupColorMap"
            :include-custom-in-stats="true"
          />
        </div>
      </div>
      <GuideMarkRing
        v-for="(m, i) in addPoint3Marks"
        :key="i"
        :mark="m"
        :number="i + 1"
        side="top"
      />
    </div>
    <p
      class="mx-auto mt-2 max-w-120 text-center text-[11px] leading-snug text-secondary"
    >
      {{ t("guide.steps.addPoint3.figureCaption") }}
    </p>

    <GuideMarkLegend
      class="mt-2"
      :items="[
        {
          label: t('guide.steps.addPoint3.marks.manualCount.label'),
          body: t('guide.steps.addPoint3.marks.manualCount.body'),
        },
        {
          label: t('guide.steps.addPoint3.marks.newPoint.label'),
          body: t('guide.steps.addPoint3.marks.newPoint.body'),
        },
      ]"
    />

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.addPoint3.note") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import FomChart from "@/components/visualization/FomChart.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  sampleColumns,
  selectedYAxis,
  selectedXAxis,
  groupBy,
  yAxisScale,
  groupColorMap,
  addPointResultRows,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  addPoint3Marks: GuideMark[];
}>();

const { t } = useI18n();

const addPoint3Wrap = useTemplateRef<HTMLDivElement>("addPoint3Wrap");
const addPoint3ChartRef =
  useTemplateRef<InstanceType<typeof FomChart>>("addPoint3ChartRef");

defineExpose({ addPoint3Wrap, addPoint3ChartRef });
</script>
