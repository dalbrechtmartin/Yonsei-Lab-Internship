<template>
  <!-- ============================= PAGE 16 -- Mode 1: export the dataset & chart ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1ExportChart')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.exportChart.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.exportChart.body") }}
    </p>

    <div class="flex items-start gap-4">
      <div style="width: 320px">
        <!-- A genuine "Export chart image (.png)" render (see the hidden
             generator FomChart instances after the last page, and their
             exposed getPngDataUrl) rather than the live interactive
             component -- grouped by Material Class (a composite column)
             with "Merge multi-category points" on, so a multi-category
             record collapses into one multi-color marker. -->
        <div class="guide-callout-region" style="width: 320px">
          <img
            v-if="exportChartPngUrl"
            :src="exportChartPngUrl"
            class="block w-full"
            :alt="t('fomcharts.export.png')"
          />
        </div>
        <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">
          {{ t("guide.steps.exportChart.chartCaption") }}
        </p>
      </div>
      <div style="width: 320px">
        <!-- The same merge switch OFF instead, grouped by Base Materials
             (more distinct tokens than Material Class) -- a genuine,
             directly comparable contrast: every token gets its own
             colored marker instead of collapsing into one. -->
        <div class="guide-callout-region" style="width: 320px">
          <img
            v-if="exportChartPngUrl2"
            :src="exportChartPngUrl2"
            class="block w-full"
            :alt="t('fomcharts.export.png')"
          />
        </div>
        <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">
          {{ t("guide.steps.exportChart.chartCaption2") }}
        </p>
      </div>
    </div>

    <div
      class="mt-3 flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5"
    >
      <!-- The actual "Merge multi-category points" switch, hand-assembled
           from the same real Switch component and i18n label the live
           control uses (same convention as the toolbar figure on the
           Import page) -- so the paragraph next to it references a
           control the reader can see, not just describe. -->
      <div
        class="flex shrink-0 items-center gap-2 rounded-[10px] border border-secondary/20 bg-secondary/5 px-2.5 py-2"
        style="width: 150px"
      >
        <span class="flex-1 text-[10.5px] leading-snug text-ink">{{
          t("fomcharts.controls.mergeMultiCategory")
        }}</span>
        <Switch :model-value="true" />
      </div>
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.exportChart.mergeExplain") }}
      </p>
    </div>

    <div class="mt-3">
      <h3 class="mb-2 text-sm font-semibold text-primary">
        {{ t("guide.steps.exportChart.formatsTitle") }}
      </h3>
      <div class="grid grid-cols-3 gap-3">
        <div
          class="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            ><FileText class="size-4"
          /></span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-ink">
              {{ t("fomcharts.export.csv") }}
            </p>
            <p class="text-[10.5px] leading-snug text-secondary">
              {{ t("guide.steps.exportChart.formats.csv") }}
            </p>
          </div>
        </div>
        <div
          class="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            ><FileSpreadsheet class="size-4"
          /></span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-ink">
              {{ t("fomcharts.export.xlsx") }}
            </p>
            <p class="text-[10.5px] leading-snug text-secondary">
              {{ t("guide.steps.exportChart.formats.xlsx") }}
            </p>
          </div>
        </div>
        <div
          class="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            ><FileImage class="size-4"
          /></span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-ink">
              {{ t("fomcharts.export.png") }}
            </p>
            <p class="text-[10.5px] leading-snug text-secondary">
              {{ t("guide.steps.exportChart.formats.png") }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { FileImage, FileSpreadsheet, FileText } from "@lucide/vue";
import { Switch } from "@/components/ui/switch";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  exportChartPngUrl: string | null;
  exportChartPngUrl2: string | null;
}>();

const { t } = useI18n();
</script>
