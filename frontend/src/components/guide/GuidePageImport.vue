<template>
  <!-- ============================= PAGE 5 -- Mode 1: overview + import ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1Import')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2.5 text-xl font-semibold">{{ t("guide.mode1.title") }}</h2>

    <div class="mb-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="mb-1 text-sm font-semibold text-ink">
        {{ t("guide.scenario.title") }}
      </p>
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.scenario.body") }}
      </p>
    </div>

    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.import.overviewBody") }}
    </p>

    <div class="mb-3">
      <h3 class="mb-1.5 text-base font-semibold text-primary">
        {{ t("guide.steps.import.title") }}
      </h3>
      <p class="mb-2.5 text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.import.body") }}
      </p>

      <div class="mx-auto guide-callout-region" style="max-width: 380px">
        <FileDropzone compact />
      </div>
      <p
        class="mx-auto mt-1.5 max-w-96 text-center text-[11px] leading-snug text-secondary"
      >
        {{ t("guide.steps.import.figure1Caption") }}
      </p>
      <!-- Real clickable PDF link (see pdfExport.ts's data-external-link
           handling), pointing at a static sample dataset shipped alongside
           the app (public/sample-guide-data.csv, the exact worked example
           used throughout this guide) -- so a reader with no data of their
           own yet can still open the tool and try it immediately. -->
      <p
        class="mx-auto mt-1 max-w-96 text-center text-xs leading-snug text-primary underline"
        data-external-link="/sample-guide-data.csv"
      >
        {{ t("guide.steps.import.sampleDataLink") }}
      </p>
    </div>

    <div>
      <div
        ref="toolbarWrap"
        class="relative mx-auto guide-callout-region"
        style="max-width: 500px"
      >
        <div
          class="flex items-center justify-between rounded-2xl border border-secondary/10 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-xl"
        >
          <span class="text-sm font-semibold text-ink">{{
            t("fomcharts.workspace.title")
          }}</span>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              class="border-secondary/20 bg-background/80 text-ink"
            >
              <Upload />
              {{ t("actions.import") }}
            </Button>
            <Button
              variant="outline"
              size="xs"
              class="border-secondary/20 bg-background/80 text-ink"
            >
              <Download />
              {{ t("actions.export") }}
              <ChevronDown class="size-2.5" />
            </Button>
            <div class="h-5 w-px bg-secondary/15" />
            <Button
              variant="outline"
              size="xs"
              class="border-secondary/20 bg-background/80 text-ink"
            >
              <RotateCcw />
              {{ t("fomcharts.workspace.reset") }}
            </Button>
          </div>
        </div>
        <GuideMarkRing
          v-for="(m, i) in toolbarMarks"
          :key="i"
          :mark="m"
          :number="i + 1"
          side="top"
        />
      </div>
      <p
        class="mx-auto mt-1.5 max-w-125 text-center text-[11px] leading-snug text-secondary"
      >
        {{ t("guide.steps.import.figure2Caption") }}
      </p>

      <GuideMarkLegend
        class="mt-1.5"
        :items="[
          {
            label: t('guide.steps.import.toolbar.import.label'),
            body: t('guide.steps.import.toolbar.import.body'),
          },
          {
            label: t('guide.steps.import.toolbar.export.label'),
            body: t('guide.steps.import.toolbar.export.body'),
          },
          {
            label: t('guide.steps.import.toolbar.reset.label'),
            body: t('guide.steps.import.toolbar.reset.body'),
          },
        ]"
      />
    </div>

    <p class="mt-2.5 text-xs leading-snug text-secondary">
      {{ t("guide.steps.import.aiNote") }}
    </p>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Download, RotateCcw, Upload } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  toolbarMarks: GuideMark[];
}>();

const { t } = useI18n();

const toolbarWrap = useTemplateRef<HTMLDivElement>("toolbarWrap");

defineExpose({ toolbarWrap });
</script>
