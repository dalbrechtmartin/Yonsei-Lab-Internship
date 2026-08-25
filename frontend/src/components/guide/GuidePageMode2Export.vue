<template>
  <!-- ============================= PAGE 23 -- Mode 2: export your data ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2Export')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-2.5 text-xl font-semibold">
      {{ t("guide.steps.mode2Export.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.mode2Export.body") }}
    </p>

    <div class="mb-3 overflow-hidden rounded-2xl border border-secondary/10">
      <ExtractionStepper :steps="extractionStepperSteps" :current-step="4" :furthest-step="4" />
    </div>

    <div ref="exportStepWrap" class="relative flex flex-1 flex-col guide-callout-region overflow-hidden">
      <ExtractionExportStep
        :job="finishedJob"
        :records="extractionRecords"
        :default-export-name="exportDefaultName"
        :partial="false"
      />
      <GuideMarkRing
        v-for="(m, i) in exportMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>

    <GuideMarkLegend
      class="mt-2"
      :items="[
        {
          label: t('guide.steps.mode2Export.marks.legend.label'),
          body: t('guide.steps.mode2Export.marks.legend.body'),
        },
        {
          label: t('guide.steps.mode2Export.marks.table.label'),
          body: t('guide.steps.mode2Export.marks.table.body'),
        },
        {
          label: t('guide.steps.mode2Export.marks.save.label'),
          body: t('guide.steps.mode2Export.marks.save.body'),
        },
      ]"
    />

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.mode2Export.note") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import ExtractionStepper from "@/components/extraction/ExtractionStepper.vue";
import ExtractionExportStep from "@/components/extraction/ExtractionExportStep.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  extractionStepperSteps,
  extractionRecords,
  finishedJob,
  exportDefaultName,
} from "./guideExtractionSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  exportMarks: GuideMark[];
}>();

const { t } = useI18n();

const exportStepWrap = useTemplateRef<HTMLDivElement>("exportStepWrap");

defineExpose({ exportStepWrap });
</script>
