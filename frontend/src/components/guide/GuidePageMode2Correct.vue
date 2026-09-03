<template>
  <!-- ============================= PAGE 22 -- Mode 2: correct a record ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2Correct')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-2.5 text-xl font-semibold">
      {{ t("guide.steps.mode2Correct.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.mode2Correct.body") }}
    </p>

    <div class="mb-3 overflow-hidden rounded-2xl border border-secondary/10">
      <ExtractionStepper
        :steps="extractionStepperSteps"
        :current-step="3"
        :furthest-step="3"
      />
    </div>

    <!-- compact: every section opens independently on the real review screen
         (see ExtractionReviewDetail's own compact doc comment), so without
         this all four render open at once and overflow this fixed-height
         page. GuideTemplate's captureGuideArtifacts clicks Measurements back
         open (the section the fwhmField ring below needs visible); the
         status banner and source strip above the sections stay visible
         either way, since they're not part of any collapsible section. -->
    <div
      ref="detailWrap"
      class="relative mx-auto w-full max-w-125 guide-callout-region"
    >
      <ExtractionReviewDetail :record="flaggedRecord" compact />
      <!-- fwhmField (i === 2) sits in the RIGHT column of the Measurements
           grid, with its Sensitivity neighbor immediately to the left --
           "left" (used by the other two, wider rings) would float its badge
           straight into that neighbor's pencil icon, so this one keeps the
           default right-side badge instead, where the grid's own edge
           leaves it room. -->
      <GuideMarkRing
        v-for="(m, i) in correctMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
        :side="i === 2 ? undefined : 'left'"
      />
    </div>

    <GuideMarkLegend
      class="mx-auto mt-2 max-w-125"
      :compact="true"
      :items="[
        {
          label: t('guide.steps.mode2Correct.marks.banner.label'),
          body: t('guide.steps.mode2Correct.marks.banner.body'),
        },
        {
          label: t('guide.steps.mode2Correct.marks.sources.label'),
          body: t('guide.steps.mode2Correct.marks.sources.body'),
        },
        {
          label: t('guide.steps.mode2Correct.marks.pencil.label'),
          body: t('guide.steps.mode2Correct.marks.pencil.body'),
        },
      ]"
    />

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.mode2Correct.note") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ExtractionStepper from "@/components/extraction/ExtractionStepper.vue";
import ExtractionReviewDetail from "@/components/extraction/ExtractionReviewDetail.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  extractionStepperSteps,
  flaggedRecord,
} from "./guideExtractionSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  correctMarks: GuideMark[];
}>();

const { t } = useI18n();

const detailWrap = useTemplateRef<HTMLDivElement>("detailWrap");

defineExpose({ detailWrap });
</script>
