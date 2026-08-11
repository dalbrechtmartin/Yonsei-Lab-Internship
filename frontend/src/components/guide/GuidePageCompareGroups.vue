<template>
  <!-- ============================= PAGE 9 -- Mode 1: compare groups ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1Compare')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.compare.title") }}
    </h2>
    <p class="mb-4 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.compare.body") }}
    </p>

    <div class="flex items-start gap-9">
      <div
        ref="statsWrap"
        class="guide-callout-region relative shrink-0"
        style="width: 270px"
      >
        <StatsSummaryPanel
          v-model:open="statsOpen"
          v-model:group-by="groupBy"
          :rows="plottableRows"
          :y-axis="selectedYAxis"
          :x-axis="selectedXAxis"
          :group-by-columns="groupByColumns"
          :highlight-group="highlightGroup"
          :composite-columns="compositeColumns"
          :group-color-map="groupColorMap"
        />
        <GuideMarkRing
          v-for="(m, i) in statsMarks"
          :key="i"
          :mark="m"
          :number="i + 1"
        />
      </div>
      <div class="flex-1 pt-1">
        <p class="mb-2 text-xs leading-snug text-secondary">
          {{ t("guide.steps.compare.figureCaption") }}
        </p>
        <GuideMarkLegend
          :items="[
            {
              label: t('guide.steps.compare.marks.groupBySelect.label'),
              body: t('guide.steps.compare.marks.groupBySelect.body'),
            },
            {
              label: t('guide.steps.compare.marks.groupCard.label'),
              body: t('guide.steps.compare.marks.groupCard.body'),
            },
            {
              label: t('guide.steps.compare.marks.groupDetails.label'),
              body: t('guide.steps.compare.marks.groupDetails.body'),
            },
          ]"
        />
      </div>
    </div>

    <div class="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.compare.note") }}
      </p>
    </div>

    <div class="mt-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.compare.mergeNote") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  statsOpen,
  groupBy,
  plottableRows,
  selectedYAxis,
  selectedXAxis,
  groupByColumns,
  highlightGroup,
  compositeColumns,
  groupColorMap,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  statsMarks: GuideMark[];
}>();

const { t } = useI18n();

const statsWrap = useTemplateRef<HTMLDivElement>("statsWrap");

defineExpose({ statsWrap });
</script>
