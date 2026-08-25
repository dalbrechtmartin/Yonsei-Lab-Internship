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

    <div ref="runningWrap" class="relative flex items-start gap-3">
      <div class="flex min-w-0 flex-[1.1] flex-col gap-2">
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
      </div>

      <div ref="runningGameWrap" class="flex min-w-0 flex-[1.15] flex-col gap-3">
        <!-- Hand-copied from PhotonDashGame's own collapsed/folded toggle
             button (same real icon/classes, see PhotonDashGame.vue) --
             folded by default, same convention as the toolbar mock on the
             Import page for a real control this guide can't cleanly mount
             (the game canvas itself isn't meaningful as a static image). -->
        <div class="guide-callout-region p-0!">
          <div
            class="flex w-full items-center gap-3 rounded-2xl border border-secondary/15 bg-card/80 px-4 py-3 text-left shadow-sm"
          >
            <span
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Gamepad2 class="size-4" />
            </span>
            <span class="min-w-0 flex-1 text-sm font-semibold text-ink">{{
              t("extraction.minigame.title")
            }}</span>
            <span
              class="flex shrink-0 items-center gap-1 text-xs font-medium text-secondary"
            >
              {{ t("extraction.minigame.teaser") }}
              <ChevronRight class="size-3.5" />
            </span>
          </div>
        </div>

        <!-- Folded state's own vacated spot: a live PDF preview of whichever
             file is currently being analyzed (ExtractionPdfViewer), which
             needs a live backend this static guide doesn't have -- same
             honest stand-in convention as the Review page's own PDF-viewer
             mock (see its own template comment). -->
        <div
          class="guide-callout-region flex h-72 flex-col overflow-hidden p-0!"
        >
          <div
            class="flex shrink-0 items-center gap-1.5 border-b border-secondary/10 px-3 py-2"
          >
            <span class="min-w-0 flex-1 truncate text-[12px] font-medium text-ink">{{
              currentFile?.filename ?? runningJob.files[0].filename
            }}</span>
          </div>
          <div class="flex flex-1 flex-col gap-1.5 bg-secondary/4 p-3">
            <div class="mb-1 h-1.5 w-2/3 rounded-full bg-secondary/20" />
            <div class="mb-1 h-1.5 w-full rounded-full bg-secondary/15" />
            <div class="mb-1 h-1.5 w-5/6 rounded-full bg-secondary/15" />
            <div class="mb-1 h-1.5 w-full rounded-full bg-secondary/15" />
            <div class="h-1.5 w-4/5 rounded-full bg-secondary/15" />
          </div>
        </div>
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
        {
          label: t('guide.steps.mode2Running.marks.game.label'),
          body: t('guide.steps.mode2Running.marks.game.body'),
        },
      ]"
    />

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { toRef, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronRight, Gamepad2 } from "@lucide/vue";
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
const { nextFile, currentFile } = useExtractionProgressDisplay(jobRef);

const runningWrap = useTemplateRef<HTMLDivElement>("runningWrap");
const runningHeaderWrap = useTemplateRef<HTMLDivElement>("runningHeaderWrap");
const runningStripWrap = useTemplateRef<HTMLDivElement>("runningStripWrap");
const runningFilesWrap = useTemplateRef<HTMLDivElement>("runningFilesWrap");
const runningLogWrap = useTemplateRef<HTMLDivElement>("runningLogWrap");
const runningGameWrap = useTemplateRef<HTMLDivElement>("runningGameWrap");

defineExpose({
  runningWrap,
  runningHeaderWrap,
  runningStripWrap,
  runningFilesWrap,
  runningLogWrap,
  runningGameWrap,
});
</script>
