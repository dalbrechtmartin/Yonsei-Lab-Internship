<template>
  <!-- ============================= PAGE 6 -- Mode 1: chart & display controls ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1Controls')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-1.5 text-xl font-semibold">
      {{ t("guide.steps.controls.title") }}
    </h2>
    <p class="mb-2.5 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.controls.body") }}
    </p>

    <div class="flex gap-5">
      <div class="flex-1">
        <div
          ref="chartControlsWrap"
          class="guide-callout-region relative"
          style="width: 260px"
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
        <p class="mt-1.5 max-w-65 text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.controls.figureChartCaption") }}
        </p>
        <GuideMarkLegend
          class="mt-1.5"
          :compact="true"
          :items="[
            {
              label: t('guide.steps.controls.chart.title.label'),
              body: t('guide.steps.controls.chart.title.body'),
            },
            {
              label: t('guide.steps.controls.chart.axes.label'),
              body: t('guide.steps.controls.chart.axes.body'),
            },
          ]"
        />
      </div>

      <div class="flex-1">
        <div
          ref="displayControlsWrap"
          class="guide-callout-region relative"
          style="width: 260px"
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
            v-for="(m, i) in displayMarks"
            :key="i"
            :mark="m"
            :number="i + 1"
          />
        </div>
        <p class="mt-1 max-w-65 text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.controls.figureDisplayCaption") }}
        </p>
        <GuideMarkLegend
          class="mt-1"
          :compact="true"
          :items="[
            {
              label: t('guide.steps.controls.display.scale.label'),
              body: t('guide.steps.controls.display.scale.body'),
            },
            {
              label: t('guide.steps.controls.display.trendLine.label'),
              body: t('guide.steps.controls.display.trendLine.body'),
            },
            {
              label: t('guide.steps.controls.display.pareto.label'),
              body: t('guide.steps.controls.display.pareto.body'),
            },
            {
              label: t('guide.steps.controls.display.legend.label'),
              body: t('guide.steps.controls.display.legend.body'),
            },
            {
              label: t('guide.steps.controls.display.median.label'),
              body: t('guide.steps.controls.display.median.body'),
            },
            {
              label: t('guide.steps.controls.display.pointSize.label'),
              body: t('guide.steps.controls.display.pointSize.body'),
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
  displayMarks: GuideMark[];
}>();

const { t } = useI18n();

const chartControlsWrap = useTemplateRef<HTMLDivElement>("chartControlsWrap");
const displayControlsWrap = useTemplateRef<HTMLDivElement>(
  "displayControlsWrap",
);

defineExpose({ chartControlsWrap, displayControlsWrap });
</script>
