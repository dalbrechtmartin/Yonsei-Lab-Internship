<template>
  <!-- ============================= PAGE 21 -- Mode 2: review a record ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2Review')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-1.5 text-xl font-semibold">
      {{ t("guide.steps.mode2Review.title") }}
    </h2>
    <p class="mb-1.5 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.mode2Review.body") }}
    </p>

    <div class="mb-1.5 overflow-hidden rounded-2xl border border-secondary/10">
      <ExtractionStepper :steps="extractionStepperSteps" :current-step="3" :furthest-step="3" />
    </div>

    <div ref="reviewWrap" class="relative flex flex-1 items-stretch gap-10">
      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div ref="reviewTableWrap" class="guide-callout-region flex flex-col gap-1.5">
          <ExtractionReviewTabs model-value="all" :counts="reviewCounts" />
          <ExtractionReviewTable :records="extractionRecords" :selected-index="selectedIndex" />
        </div>

        <div ref="reviewCalloutWrap" class="guide-callout-region">
          <ExtractionReviewCallout :record="flaggedRecord" />
        </div>

        <div ref="reviewActionsWrap" class="guide-callout-region">
          <ExtractionReviewActions />
        </div>
      </div>

      <div ref="reviewPdfWrap" class="flex w-56 shrink-0 flex-col">
        <div class="guide-callout-region flex flex-1 flex-col overflow-hidden p-0!">
          <!-- Hand-assembled stand-in for ExtractionPdfViewer -- same real
               header chrome (Button + Chevron/Minus/Plus icons, identical
               markup to the live component), but the live viewer streams
               a rendered page image from a running job's own backend
               (see apiService.getPdfPageUrl), which doesn't exist for
               this guide's static worked example. The page body below is
               a deliberately schematic stand-in, not a fabricated
               screenshot -- see the caption underneath. -->
          <div class="flex shrink-0 items-center gap-1.5 border-b border-secondary/10 px-3.5 py-2.5">
            <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{{ flaggedRecord.filename }}</span>
            <span class="shrink-0 rounded-full bg-secondary/10 px-2.5 py-0.5 font-mono text-[11px] text-secondary">
              {{ t("extraction.review.pdf.pageOf", { current: 4, total: 12 }) }}
            </span>
            <Button type="button" variant="outline" size="icon-xs" :aria-label="t('extraction.review.pdf.prevPage')">
              <ChevronLeft class="size-3.5" />
            </Button>
            <Button type="button" variant="outline" size="icon-xs" :aria-label="t('extraction.review.pdf.nextPage')">
              <ChevronRight class="size-3.5" />
            </Button>
            <Button type="button" variant="outline" size="icon-xs" :aria-label="t('extraction.review.pdf.zoomOut')">
              <Minus class="size-3.5" />
            </Button>
            <Button type="button" variant="outline" size="icon-xs" :aria-label="t('extraction.review.pdf.zoomIn')">
              <Plus class="size-3.5" />
            </Button>
          </div>
          <div class="flex flex-1 flex-col gap-1.5 bg-secondary/4 p-4">
            <div class="mb-1.5 h-2 w-2/3 rounded-full bg-secondary/20" />
            <div class="mb-1.5 h-2 w-full rounded-full bg-secondary/15" />
            <div class="mb-1.5 h-2 w-5/6 rounded-full bg-secondary/15" />
            <div class="relative my-1 rounded-sm bg-amber-400/35 px-2 py-1.5 ring-2 ring-amber-500/70">
              <p class="text-[11px] leading-snug text-amber-950 italic">
                « {{ firstSource.quote }} »
              </p>
            </div>
            <div class="mb-1.5 h-2 w-full rounded-full bg-secondary/15" />
            <div class="mb-1.5 h-2 w-4/5 rounded-full bg-secondary/15" />
            <div class="h-2 w-2/3 rounded-full bg-secondary/15" />
          </div>
        </div>
        <p class="mt-1.5 text-center text-[10.5px] leading-snug text-secondary italic">
          {{ t("guide.steps.mode2Review.pdfCaption") }}
        </p>
      </div>

      <GuideMarkRing
        v-for="(m, i) in reviewMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>

    <GuideMarkLegend
      class="mt-1"
      :compact="true"
      :items="[
        {
          label: t('guide.steps.mode2Review.marks.table.label'),
          body: t('guide.steps.mode2Review.marks.table.body'),
        },
        {
          label: t('guide.steps.mode2Review.marks.callout.label'),
          body: t('guide.steps.mode2Review.marks.callout.body'),
        },
        {
          label: t('guide.steps.mode2Review.marks.actions.label'),
          body: t('guide.steps.mode2Review.marks.actions.body'),
        },
        {
          label: t('guide.steps.mode2Review.marks.pdf.label'),
          body: t('guide.steps.mode2Review.marks.pdf.body'),
        },
      ]"
    />

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronLeft, ChevronRight, Minus, Plus } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import ExtractionStepper from "@/components/extraction/ExtractionStepper.vue";
import ExtractionReviewTabs from "@/components/extraction/ExtractionReviewTabs.vue";
import ExtractionReviewTable from "@/components/extraction/ExtractionReviewTable.vue";
import ExtractionReviewCallout from "@/components/extraction/ExtractionReviewCallout.vue";
import ExtractionReviewActions from "@/components/extraction/ExtractionReviewActions.vue";
import { parseEvidenceSources } from "@/utils/parseLocation";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  extractionStepperSteps,
  extractionRecords,
  flaggedRecord,
  reviewCounts,
} from "./guideExtractionSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  reviewMarks: GuideMark[];
}>();

const { t } = useI18n();

const selectedIndex = `${flaggedRecord.fileId}:${flaggedRecord.index}`;
const firstSource = computed(
  () => parseEvidenceSources(flaggedRecord.evidence, flaggedRecord.location)[0],
);

const reviewWrap = useTemplateRef<HTMLDivElement>("reviewWrap");
const reviewTableWrap = useTemplateRef<HTMLDivElement>("reviewTableWrap");
const reviewCalloutWrap = useTemplateRef<HTMLDivElement>("reviewCalloutWrap");
const reviewActionsWrap = useTemplateRef<HTMLDivElement>("reviewActionsWrap");
const reviewPdfWrap = useTemplateRef<HTMLDivElement>("reviewPdfWrap");

defineExpose({
  reviewWrap,
  reviewTableWrap,
  reviewCalloutWrap,
  reviewActionsWrap,
  reviewPdfWrap,
});
</script>
