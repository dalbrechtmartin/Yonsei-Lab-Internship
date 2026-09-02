<template>
  <!-- ============================= PAGE 6 -- Mode 1: chart settings ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1ControlsChart')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-1.5 text-xl font-semibold">
      {{ t("guide.steps.controlsChart.title") }}
    </h2>
    <p class="mb-4 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.controlsChart.body") }}
    </p>

    <div class="flex items-start gap-8">
      <div class="flex shrink-0 flex-col items-center" style="width: 280px">
        <div
          ref="chartControlsWrap"
          class="guide-callout-region relative w-full"
        >
          <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-legend="showLegend"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:trend-type="trendType"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:composite-filter-mode="compositeFilterMode"
            v-model:show-pareto="showPareto"
            v-model:exclude-needs-review="excludeNeedsReview"
            v-model:point-size-mode="pointSizeMode"
            v-model:point-size-by="pointSizeBy"
            v-model:point-size="pointSize"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :domain-column="domainColumn"
            :domain-values="domainValues"
            :domain-counts="domainCounts"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
            :needs-review-column="reviewStatusColumn"
            :needs-review-count="needsReviewCount"
          />
          <GuideMarkRing
            v-for="(m, i) in chartMarks"
            :key="i"
            :mark="m"
            :number="i + 1"
          />
        </div>
        <p class="mt-2 text-center text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.controlsChart.figureCaption") }}
        </p>
      </div>

      <div class="w-64 shrink-0 pt-1">
        <GuideMarkLegend
          :compact="true"
          :items="[
            {
              label: t('guide.steps.controlsChart.chart.title.label'),
              body: t('guide.steps.controlsChart.chart.title.body'),
            },
            {
              label: t('guide.steps.controlsChart.chart.axes.label'),
              body: t('guide.steps.controlsChart.chart.axes.body'),
            },
            {
              label: t('guide.steps.controlsChart.chart.picker.label'),
              body: t('guide.steps.controlsChart.chart.picker.body'),
            },
          ]"
        />
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import GraphControls from "@/components/visualization/GraphControls.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  numericColumns,
  xAxisCategoricalColumns,
  domainColumn,
  domainValues,
  domainCounts,
  originColumn,
  originValues,
  originCounts,
  materialClassColumn,
  materialClassValues,
  materialClassCounts,
  baseMaterialsColumn,
  baseMaterialsValues,
  baseMaterialsCounts,
  reviewStatusColumn,
  needsReviewCount,
  selectedYAxis,
  selectedXAxis,
  yAxisScale,
  chartTitle,
  showLegend,
  showMedian,
  showTrend,
  trendType,
  showPareto,
  compositeFilterMode,
  excludeNeedsReview,
  pointSizeMode,
  pointSizeBy,
  pointSize,
  selectedDomains,
  selectedOrigins,
  selectedMaterialClasses,
  selectedBaseMaterials,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  chartMarks: GuideMark[];
}>();

const { t } = useI18n();

const chartControlsWrap = useTemplateRef<HTMLDivElement>("chartControlsWrap");

defineExpose({ chartControlsWrap });
</script>
