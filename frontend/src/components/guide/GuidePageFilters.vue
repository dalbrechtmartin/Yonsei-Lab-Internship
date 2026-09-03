<template>
  <!-- ============================= PAGE 7 -- Mode 1: filters ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1Filters')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.filters.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.filters.body") }}
    </p>

    <div class="flex items-start gap-9">
      <div class="flex shrink-0 flex-col items-center" style="width: 260px">
        <div ref="filtersWrap" class="guide-callout-region relative w-full">
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
            v-for="(m, i) in filterMarks"
            :key="i"
            :mark="m"
            :number="i + 1"
          />
        </div>
        <p class="mt-2 text-center text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.filters.figureCaption") }}
        </p>
      </div>
      <div class="flex-1 pt-1">
        <GuideMarkLegend
          :compact="true"
          :items="[
            {
              label: t('guide.steps.filters.marks.needsReview.label'),
              body: t('guide.steps.filters.marks.needsReview.body'),
            },
            {
              label: t('guide.steps.filters.marks.domain.label'),
              body: t('guide.steps.filters.marks.domain.body'),
            },
            {
              label: t('guide.steps.filters.marks.origin.label'),
              body: t('guide.steps.filters.marks.origin.body'),
            },
            {
              label: t('guide.steps.filters.marks.materialClass.label'),
              body: t('guide.steps.filters.marks.materialClass.body'),
            },
            {
              label: t('guide.steps.filters.marks.baseMaterials.label'),
              body: t('guide.steps.filters.marks.baseMaterials.body'),
            },
            {
              label: t('guide.steps.filters.marks.exclusionMode.label'),
              body: t('guide.steps.filters.marks.exclusionMode.body'),
            },
          ]"
        />
      </div>
    </div>

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="mb-2 text-sm leading-relaxed text-ink">
        {{ t("guide.steps.filters.note.lead") }}
      </p>
      <div class="grid grid-cols-2 gap-3">
        <div class="rounded-lg border border-border bg-white px-3 py-1.5">
          <p class="text-xs font-semibold text-ink">
            {{ t("guide.steps.filters.note.lenientLabel") }}
          </p>
          <p class="text-xs leading-snug text-secondary">
            {{ t("guide.steps.filters.note.lenientBody") }}
          </p>
        </div>
        <div class="rounded-lg border border-border bg-white px-3 py-1.5">
          <p class="text-xs font-semibold text-ink">
            {{ t("guide.steps.filters.note.strictLabel") }}
          </p>
          <p class="text-xs leading-snug text-secondary">
            {{ t("guide.steps.filters.note.strictBody") }}
          </p>
        </div>
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
  filterMarks: GuideMark[];
}>();

const { t } = useI18n();

const filtersWrap = useTemplateRef<HTMLDivElement>("filtersWrap");

defineExpose({ filtersWrap });
</script>
