<template>
  <!-- ============================= PAGE 8 -- Mode 1: reading the chart ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1Reading')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.reading.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.reading.body") }}
    </p>

    <!-- The chart itself is clipped (overflow:hidden, to crop the scaled
         component to a fixed figure size), but its real content (the
         status-badge row) runs flush to that box's own right edge with
         zero slack -- so the numbered rings live in this OUTER, unclipped
         wrapper instead, sized identically, letting badges float outside
         the inner box without either covering real content or being
         clipped themselves. -->
    <div ref="readingWrap" class="relative mx-auto" style="width: 560px">
      <div
        class="guide-callout-region"
        style="width: 560px; height: 392px; overflow: hidden"
      >
        <div
          style="
            width: 800px;
            transform: scale(0.7);
            transform-origin: top left;
          "
        >
          <FomChart
            ref="readingChartRef"
            :chart-data="sampleRows"
            :columns="sampleColumns"
            :y-axis="selectedYAxis"
            :x-axis="selectedXAxis"
            :group-by="groupBy"
            :y-axis-scale="yAxisScale"
            :chart-title="chartTitle"
            :show-legend="showLegend"
            :show-median="showMedian"
            :show-trend="showTrend"
            :trend-type="trendType"
            :show-pareto="showPareto"
            :x-axis-numeric="true"
            :group-color-map="groupColorMap"
            :point-size-mode="pointSizeMode"
            :point-size-by="pointSizeBy"
            :point-size="pointSize"
          />
        </div>
      </div>
      <!-- A "peephole" patch, not a full re-render: the point-size legend
           line ("Taille : Sensitivity (nm/RIU) (40-230)") is the one bit
           of this canvas that gets silently clipped once scaled down this
           far by the transform above -- confirmed real (echarts' own
           getOption()/getDataURL() always had the complete, correct text;
           only the live, transformed canvas paint dropped characters,
           with no ellipsis and no console warning) and confirmed not a
           `zoom` fix either (same clipping persisted under zoom, which
           avoids transform's usual scaling-artifact class of bug but not
           this one). Everything else on this canvas (badges, group
           legend, median line, the flagged point) renders correctly even
           scaled, so this only patches the one broken row: a small,
           clipped window (sized to readingSizeLegendRect, the same rect
           the ring for it already uses) showing just that slice of a full
           getPngDataUrl() snapshot, offset so the slice lines up exactly
           over the broken text underneath. A plain `<img>`, unlike a
           scaled canvas, has no such clipping failure mode. -->
      <div
        v-if="
          readingChartImgUrl && readingSizeLegendRect && readingChartFullRect
        "
        class="absolute overflow-hidden"
        :style="{
          top: `${readingSizeLegendRect.top}px`,
          left: `${readingSizeLegendRect.left}px`,
          width: `${readingSizeLegendRect.width}px`,
          height: `${readingSizeLegendRect.height}px`,
        }"
      >
        <img
          :src="readingChartImgUrl"
          class="absolute max-w-none"
          :style="{
            top: `${readingChartFullRect.top - readingSizeLegendRect.top}px`,
            left: `${readingChartFullRect.left - readingSizeLegendRect.left}px`,
            width: `${readingChartFullRect.width}px`,
            height: `${readingChartFullRect.height}px`,
          }"
        />
      </div>
      <GuideMarkRing
        v-for="(m, i) in readingMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>
    <p
      class="mx-auto mt-2 max-w-120 text-center text-[11px] leading-snug text-secondary"
    >
      {{ t("guide.steps.reading.figure4Caption") }}
    </p>

    <GuideMarkLegend
      class="mt-2"
      :items="[
        {
          label: t('guide.steps.reading.marks.badges.label'),
          body: t('guide.steps.reading.marks.badges.body'),
        },
        {
          label: t('guide.steps.reading.marks.legend.label'),
          body: t('guide.steps.reading.marks.legend.body'),
        },
        {
          label: t('guide.steps.reading.marks.pointSize.label'),
          body: t('guide.steps.reading.marks.pointSize.body'),
        },
        {
          label: t('guide.steps.reading.marks.median.label'),
          body: t('guide.steps.reading.marks.median.body'),
        },
        {
          label: t('guide.steps.reading.marks.flagged.label'),
          body: t('guide.steps.reading.marks.flagged.body'),
        },
        {
          label: t('guide.steps.reading.marks.zoomControls.label'),
          body: t('guide.steps.reading.marks.zoomControls.body'),
        },
      ]"
    />

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
  sampleRows,
  selectedYAxis,
  selectedXAxis,
  groupBy,
  yAxisScale,
  chartTitle,
  showLegend,
  showMedian,
  showTrend,
  trendType,
  showPareto,
  groupColorMap,
  pointSizeMode,
  pointSizeBy,
  pointSize,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  readingMarks: GuideMark[];
  readingChartImgUrl: string | null;
  readingChartFullRect: GuideMark | null;
  readingSizeLegendRect: GuideMark | null;
}>();

const { t } = useI18n();

const readingWrap = useTemplateRef<HTMLDivElement>("readingWrap");
const readingChartRef =
  useTemplateRef<InstanceType<typeof FomChart>>("readingChartRef");

defineExpose({ readingWrap, readingChartRef });
</script>
