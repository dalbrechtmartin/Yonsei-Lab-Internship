<template>
  <!-- ============================= PAGE 14 -- Mode 1: pin & annotate ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1Annotate')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.annotate.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.annotate.body") }}
    </p>

    <div class="flex items-start gap-7">
      <!-- R1 stays collapsed (a real second card, for contrast), but R3 is
           expanded for real -- the same click a researcher would make --
           so Layer Structure / Metrics / Notes render at native size
           instead of only being described in prose (see
           captureGuideArtifacts). -->
      <div class="flex shrink-0 flex-col items-center" style="width: 300px">
        <div ref="annotationsWrap" class="guide-callout-region relative w-full">
          <AnnotationsPanel
            ref="annotationsPanelRef"
            v-model:open="annotationsOpen"
            v-model:show-only-annotated="showOnlyAnnotated"
            :annotations="annotations"
            :columns="sampleColumns"
            :rows="plottableRows"
            :x-axis="selectedXAxis"
            :y-axis="selectedYAxis"
            :group-by="groupBy"
            :unbounded-list="true"
          />
          <GuideMarkRing
            v-for="(m, i) in annotationMarks"
            :key="i"
            :mark="m"
            :number="i + 1"
            :side="i === 3 || i === 4 ? 'top' : undefined"
          />
        </div>
        <p class="mt-2 text-center text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.annotate.figureCaption") }}
        </p>
      </div>
      <div class="flex-1 pt-1">
        <GuideMarkLegend
          :compact="true"
          :items="[
            {
              label: t('guide.steps.annotate.marks.sort.label'),
              body: t('guide.steps.annotate.marks.sort.body'),
            },
            {
              label: t('guide.steps.annotate.marks.showOnlyPinned.label'),
              body: t('guide.steps.annotate.marks.showOnlyPinned.body'),
            },
            {
              label: t('guide.steps.annotate.marks.compareSelect.label'),
              body: t('guide.steps.annotate.marks.compareSelect.body'),
            },
            {
              label: t('guide.steps.annotate.marks.card.label'),
              body: t('guide.steps.annotate.marks.card.body'),
            },
            {
              label: t('guide.steps.annotate.marks.export.label'),
              body: t('guide.steps.annotate.marks.export.body'),
            },
            {
              label: t('guide.steps.annotate.marks.remove.label'),
              body: t('guide.steps.annotate.marks.remove.body'),
            },
            {
              label: t('guide.steps.annotate.marks.siblings.label'),
              body: t('guide.steps.annotate.marks.siblings.body'),
            },
            {
              label: t('guide.steps.annotate.marks.origin.label'),
              body: t('guide.steps.annotate.marks.origin.body'),
            },
            {
              label: t('guide.steps.annotate.marks.modeId.label'),
              body: t('guide.steps.annotate.marks.modeId.body'),
            },
            {
              label: t('guide.steps.annotate.marks.layerStructure.label'),
              body: t('guide.steps.annotate.marks.layerStructure.body'),
            },
            {
              label: t('guide.steps.annotate.marks.metrics.label'),
              body: t('guide.steps.annotate.marks.metrics.body'),
            },
            {
              label: t('guide.steps.annotate.marks.notes.label'),
              body: t('guide.steps.annotate.marks.notes.body'),
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
import AnnotationsPanel from "@/components/visualization/AnnotationsPanel.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  annotationsOpen,
  showOnlyAnnotated,
  annotations,
  sampleColumns,
  plottableRows,
  selectedXAxis,
  selectedYAxis,
  groupBy,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  annotationMarks: GuideMark[];
}>();

const { t } = useI18n();

const annotationsWrap = useTemplateRef<HTMLDivElement>("annotationsWrap");
const annotationsPanelRef = useTemplateRef<
  InstanceType<typeof AnnotationsPanel>
>("annotationsPanelRef");

defineExpose({ annotationsWrap, annotationsPanelRef });
</script>
