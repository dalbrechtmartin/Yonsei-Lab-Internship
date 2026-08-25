<template>
  <!-- ============================= PAGE 17 -- Mode 1: export a pinned point ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1ExportPin')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.exportPin.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.exportPin.body") }}
    </p>

    <div class="flex items-start gap-4">
      <div>
        <!-- A genuine render of "Export this pin" (see AnnotationsPanel's
             exposed getExportDataUrl) -- the full combined-card export. -->
        <div class="guide-callout-region" style="width: 222px">
          <img
            v-if="pinExportDataUrl"
            :src="pinExportDataUrl"
            class="block w-full"
            :alt="t('fomcharts.annotations.exportPin')"
          />
        </div>
        <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">
          {{ t("guide.steps.exportPin.pinExportCaption") }}
        </p>
      </div>
      <div>
        <!-- A genuine render of the "Metrics" zoom dialog's own PNG export
             (see AnnotationCard's exposed getMetricsExportDataUrl) --
             numeric fields only, no structure/notes, for when only the
             measurements matter. -->
        <div class="guide-callout-region" style="width: 202px">
          <img
            v-if="metricsExportDataUrl"
            :src="metricsExportDataUrl"
            class="block w-full"
            :alt="t('fomcharts.annotations.metrics')"
          />
        </div>
        <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">
          {{ t("guide.steps.exportPin.metricsExportCaption") }}
        </p>
      </div>
      <div>
        <!-- A static preview of the "Layer Structure" zoom dialog's
             content -- not the live <Dialog> itself (its content
             teleports outside the `.guide-page` tree, same constraint as
             CompareDialog on the previous pages), but a faithful
             reconstruction feeding the same genuine LayerStack component
             the real dialog renders with R3's actual parsed layers, so
             the materials/thicknesses shown are real data, not a mockup. -->
        <div class="guide-callout-region" style="width: 222px">
          <div
            class="overflow-hidden rounded-lg border border-secondary/20 bg-white shadow-sm"
          >
            <div
              class="flex items-center justify-between border-b border-secondary/15 bg-secondary/5 px-2 py-1"
            >
              <span class="text-[10px] font-semibold text-secondary">{{
                t("fomcharts.annotations.layerStructure")
              }}</span>
              <span class="text-[10px] text-muted-foreground">✕</span>
            </div>
            <div class="p-2">
              <p class="mb-1.5 truncate text-[10px]">
                <span class="font-mono font-bold text-primary">R3</span>
                <span class="ml-1 text-ink"
                  >All-dielectric guided-mode resonance biosensor</span
                >
              </p>
              <LayerStack :layers="layerPopupLayers" />
            </div>
          </div>
        </div>
        <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">
          {{ t("guide.steps.exportPin.layerPopupCaption") }}
        </p>
      </div>
    </div>

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.exportPin.layerOrderNote") }}
      </p>
    </div>

    <div class="mt-3">
      <h3 class="mb-2 text-sm font-semibold text-primary">
        {{ t("guide.steps.exportPin.pinFormatsTitle") }}
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
              {{ t("fomcharts.annotations.downloadTxt") }}
            </p>
            <p class="text-[10.5px] leading-snug text-secondary">
              {{ t("guide.steps.exportPin.pinFormats.note") }}
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
              {{ t("fomcharts.annotations.downloadPng") }}
            </p>
            <p class="text-[10.5px] leading-snug text-secondary">
              {{ t("guide.steps.exportPin.pinFormats.fields") }}
            </p>
          </div>
        </div>
        <div
          class="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
            ><Download class="size-4"
          /></span>
          <div class="min-w-0">
            <p class="text-xs font-semibold text-ink">
              {{ t("fomcharts.annotations.exportPin") }}
            </p>
            <p class="text-[10.5px] leading-snug text-secondary">
              {{ t("guide.steps.exportPin.pinFormats.all") }}
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
import { Download, FileImage, FileText } from "@lucide/vue";
import LayerStack from "@/components/visualization/LayerStack.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import { layerPopupLayers } from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  pinExportDataUrl: string | null;
  metricsExportDataUrl: string | null;
}>();

const { t } = useI18n();
</script>
