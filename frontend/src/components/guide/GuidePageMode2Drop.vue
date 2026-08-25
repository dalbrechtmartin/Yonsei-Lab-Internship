<template>
  <!-- ============================= PAGE 19 -- Mode 2: drop your PDFs ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2Drop')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-2.5 text-xl font-semibold">
      {{ t("guide.steps.mode2Drop.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.mode2Drop.body") }}
    </p>

    <!-- Real ExtractionStepper, step 1 active -- the same "you are here"
         strip every Mode 2 screen shows, so these five pages read as one
         continuous walkthrough instead of five disconnected figures. -->
    <div class="mb-3 overflow-hidden rounded-2xl border border-secondary/10">
      <ExtractionStepper :steps="extractionStepperSteps" :current-step="1" :furthest-step="1" />
    </div>

    <div ref="dropStepWrap" class="relative flex flex-1 items-stretch gap-5">
      <div ref="dropFilesWrap" class="guide-callout-region flex min-w-0 flex-2 flex-col">
        <FileDropzone
          compact
          tight-padding
          class="flex flex-1 flex-col"
          :title="t('extraction.dropzone.title')"
          :subtitle="t('extraction.dropzone.subtitle')"
        >
          <div class="grid w-full grid-cols-1 gap-2">
            <ExtractionStagedFileCard
              v-for="(f, i) in stagedFiles"
              :key="f.filename"
              :order="i + 1"
              :filename="f.filename"
              :size-bytes="f.sizeBytes"
              :page-count="f.pageCount"
              :loading="false"
              :dragging="false"
              :drag-over="false"
            />
          </div>
        </FileDropzone>
      </div>

      <div class="flex min-w-0 flex-[1.1] flex-col gap-3">
        <div ref="dropModelWrap" class="guide-callout-region">
          <ModelSelector v-model:model-choice="modelChoice" />
        </div>
        <div ref="dropLaunchWrap" class="guide-callout-region mt-auto flex flex-col gap-2">
          <p class="text-xs text-secondary">
            {{ t("extraction.drop.stagedCount", { count: stagedFiles.length }) }}
            ·
            {{ t("extraction.drop.etaEstimate", { eta: etaEstimate }) }}
          </p>
          <Button type="button">{{ t("extraction.drop.launch") }}</Button>
        </div>
      </div>

      <GuideMarkRing
        v-for="(m, i) in dropMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
        side="top"
      />
    </div>

    <GuideMarkLegend
      class="mt-2"
      :items="[
        {
          label: t('guide.steps.mode2Drop.marks.files.label'),
          body: t('guide.steps.mode2Drop.marks.files.body'),
        },
        {
          label: t('guide.steps.mode2Drop.marks.model.label'),
          body: t('guide.steps.mode2Drop.marks.model.body'),
        },
        {
          label: t('guide.steps.mode2Drop.marks.launch.label'),
          body: t('guide.steps.mode2Drop.marks.launch.body'),
        },
      ]"
    />

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import ModelSelector from "@/components/extraction/ModelSelector.vue";
import ExtractionStagedFileCard from "@/components/extraction/ExtractionStagedFileCard.vue";
import ExtractionStepper from "@/components/extraction/ExtractionStepper.vue";
import type { ModelChoice } from "@/services/api";
import { estimateFileDurationMs, formatDuration } from "@/utils/extractionEta";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import { extractionStepperSteps, stagedFiles } from "./guideExtractionSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  dropMarks: GuideMark[];
}>();

const { t } = useI18n();

const modelChoice = ref<ModelChoice>("default");

const etaEstimate = computed(() =>
  formatDuration(
    stagedFiles.reduce((total, f) => total + estimateFileDurationMs(f.pageCount), 0),
  ),
);

const dropStepWrap = useTemplateRef<HTMLDivElement>("dropStepWrap");
const dropFilesWrap = useTemplateRef<HTMLDivElement>("dropFilesWrap");
const dropModelWrap = useTemplateRef<HTMLDivElement>("dropModelWrap");
const dropLaunchWrap = useTemplateRef<HTMLDivElement>("dropLaunchWrap");

defineExpose({ dropStepWrap, dropFilesWrap, dropModelWrap, dropLaunchWrap });
</script>
