<template>
  <!-- ============================= PAGE 20 -- Mode 2: extraction running ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2Running')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-2.5 text-xl font-semibold">
      {{ t("guide.steps.mode2Running.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.mode2Running.body") }}
    </p>

    <div class="mb-3 overflow-hidden rounded-2xl border border-secondary/10">
      <ExtractionStepper :steps="extractionStepperSteps" :current-step="2" :furthest-step="2" />
    </div>

    <div ref="runningWrap" class="relative flex flex-col gap-3">
      <div ref="runningHeaderWrap" class="guide-callout-region overflow-hidden p-0!">
        <ExtractionProgressHeader :job="runningJob" />
      </div>

      <div ref="runningStripWrap" class="guide-callout-region flex flex-col gap-2.5">
        <ExtractionFileIconStrip :job="runningJob" />
        <ExtractionNoticeBanner :job="runningJob" />
      </div>

      <div ref="runningFilesWrap" class="guide-callout-region flex flex-col gap-2">
        <ExtractionCurrentFileCard :job="runningJob" />
        <ExtractionNextFileCard :file="nextFile" />
      </div>

      <div ref="runningLogWrap" class="guide-callout-region">
        <ExtractionEventLog
          class="h-32"
          :entries="runningLogEntries"
          :warning-count="runningWarningCount"
        />
      </div>

      <GuideMarkRing
        v-for="(m, i) in runningMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>

    <GuideMarkLegend
      class="mt-2"
      :items="[
        {
          label: t('guide.steps.mode2Running.marks.header.label'),
          body: t('guide.steps.mode2Running.marks.header.body'),
        },
        {
          label: t('guide.steps.mode2Running.marks.notice.label'),
          body: t('guide.steps.mode2Running.marks.notice.body'),
        },
        {
          label: t('guide.steps.mode2Running.marks.files.label'),
          body: t('guide.steps.mode2Running.marks.files.body'),
        },
        {
          label: t('guide.steps.mode2Running.marks.log.label'),
          body: t('guide.steps.mode2Running.marks.log.body'),
        },
      ]"
    />

    <div class="mt-3 flex items-center gap-2.5 rounded-xl border border-border bg-muted/20 px-4 py-2.5">
      <Gamepad2 class="size-4 shrink-0 text-primary" />
      <p class="text-xs leading-snug text-ink">
        {{ t("guide.steps.mode2Running.easterEgg") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { toRef, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Gamepad2 } from "@lucide/vue";
import ExtractionStepper from "@/components/extraction/ExtractionStepper.vue";
import ExtractionProgressHeader from "@/components/extraction/ExtractionProgressHeader.vue";
import ExtractionFileIconStrip from "@/components/extraction/ExtractionFileIconStrip.vue";
import ExtractionNoticeBanner from "@/components/extraction/ExtractionNoticeBanner.vue";
import ExtractionCurrentFileCard from "@/components/extraction/ExtractionCurrentFileCard.vue";
import ExtractionNextFileCard from "@/components/extraction/ExtractionNextFileCard.vue";
import ExtractionEventLog from "@/components/extraction/ExtractionEventLog.vue";
import { useExtractionProgressDisplay } from "@/composables/useExtractionProgressDisplay";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  extractionStepperSteps,
  runningJob,
  runningLogEntries,
  runningWarningCount,
} from "./guideExtractionSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  runningMarks: GuideMark[];
}>();

const { t } = useI18n();

const jobRef = toRef(() => runningJob);
const { nextFile } = useExtractionProgressDisplay(jobRef);

const runningWrap = useTemplateRef<HTMLDivElement>("runningWrap");
const runningHeaderWrap = useTemplateRef<HTMLDivElement>("runningHeaderWrap");
const runningStripWrap = useTemplateRef<HTMLDivElement>("runningStripWrap");
const runningFilesWrap = useTemplateRef<HTMLDivElement>("runningFilesWrap");
const runningLogWrap = useTemplateRef<HTMLDivElement>("runningLogWrap");

defineExpose({
  runningWrap,
  runningHeaderWrap,
  runningStripWrap,
  runningFilesWrap,
  runningLogWrap,
});
</script>
