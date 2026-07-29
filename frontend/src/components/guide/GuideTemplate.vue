<template>
  <!--
    Hidden single source of truth for the multilingual PDF user guide.
    Never shown on screen -- positioned off-canvas and captured by
    html2pdf.js (utils/pdfExport.ts) on demand. Content comes entirely from
    the app's own vue-i18n `guide.*` keys, so adding a locale to
    src/locales/*.json is the only work needed to translate the guide.
  -->
  <div
    ref="rootEl"
    class="fixed top-0 left-[-9999px] font-sans text-ink"
    aria-hidden="true"
  >
    <!-- ============================= PAGE 1 ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    >
      <header
        class="mb-8 flex items-start justify-between border-b border-border pb-4"
      >
        <div class="flex items-center gap-3">
          <img src="@/assets/logo.svg" class="h-12 w-12" alt="" />
          <div>
            <h1 class="text-xl leading-tight font-semibold">
              {{ t("app.title") }} — {{ t("guide.meta.subtitle") }}
            </h1>
            <p class="text-xs text-muted-foreground">
              {{ t("guide.meta.lab") }}
            </p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="font-mono text-[10px] text-muted-foreground"
            >{{ t("guide.meta.version") }} v{{ appVersion }}</span
          >
          <span
            class="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-medium tracking-[0.2em] text-primary uppercase"
          >
            {{ locale }}
          </span>
        </div>
      </header>

      <p
        class="mb-2 text-[10px] tracking-[0.3em] text-muted-foreground uppercase"
      >
        {{ t("guide.mode1.eyebrow") }}
      </p>
      <h2 class="mb-6 text-lg font-semibold">{{ t("guide.mode1.title") }}</h2>

      <div class="mb-10">
        <h3 class="mb-2 text-sm font-semibold">
          {{ t("guide.import.title") }}
        </h3>
        <p class="mb-4 text-sm leading-relaxed text-muted-foreground">
          {{ t("guide.import.body") }}
        </p>

        <div
          class="flex h-32 items-center gap-4 rounded-xl border-2 border-dashed border-border bg-muted/40 px-6"
        >
          <div
            class="flex h-12 w-10 shrink-0 items-center justify-center rounded-sm border border-[#009e73]/40 bg-[#009e73]/15"
          >
            <span class="font-mono text-[9px] font-semibold text-[#009e73]"
              >.xlsx</span
            >
          </div>
          <div class="flex-1">
            <p class="text-sm font-medium">
              {{ t("guide.import.dropzone.title") }}
            </p>
            <p class="mt-0.5 text-[11px] text-muted-foreground">
              {{ t("guide.import.dropzone.subtitle") }}
            </p>
          </div>
          <div
            class="shrink-0 rounded-md bg-primary px-3 py-1.5 text-[11px] text-primary-foreground"
          >
            {{ t("guide.import.dropzone.button") }}
          </div>
        </div>
      </div>

      <div class="flex flex-1 flex-col">
        <h3 class="mb-2 text-sm font-semibold">{{ t("guide.chart.title") }}</h3>
        <p class="mb-4 text-sm leading-relaxed text-muted-foreground">
          {{ t("guide.chart.body") }}
        </p>

        <div
          class="relative h-48 overflow-hidden rounded-2xl border border-border bg-muted/30"
        >
          <svg viewBox="0 0 400 200" class="h-full w-full">
            <line
              x1="30"
              y1="10"
              x2="30"
              y2="180"
              stroke="#3a506b"
              stroke-width="1"
            />
            <line
              x1="30"
              y1="180"
              x2="390"
              y2="180"
              stroke="#3a506b"
              stroke-width="1"
            />
            <circle
              v-for="(pt, i) in simPoints"
              :key="`sim-${i}`"
              :cx="pt.x"
              :cy="pt.y"
              r="4"
              fill="#0072B2"
            />
            <circle
              v-for="(pt, i) in expPoints"
              :key="`exp-${i}`"
              :cx="pt.x"
              :cy="pt.y"
              r="4"
              fill="#E69F00"
            />
            <polyline
              points="60,150 350,50"
              stroke="#3a506b"
              stroke-width="1.5"
              stroke-dasharray="4 3"
              fill="none"
            />
          </svg>

          <div
            class="absolute rounded-md border border-primary bg-white px-1.5 py-1 font-mono text-[8px] text-ink shadow-sm"
            style="top: 22%; left: 44%"
          >
            {{ t("guide.chart.annotation.point") }}
          </div>
          <div
            class="absolute top-1/2 left-2 -translate-y-1/2 -rotate-90 font-mono text-[9px] text-muted-foreground"
          >
            {{ t("guide.chart.axis.y") }}
          </div>
          <div
            class="absolute right-4 bottom-1 font-mono text-[9px] text-muted-foreground"
          >
            {{ t("guide.chart.axis.x") }}
          </div>
          <div
            class="absolute top-3 left-10 text-[9px] text-muted-foreground italic"
          >
            ↖ {{ t("guide.chart.annotation.median") }}
          </div>

          <div
            class="absolute top-3 right-3 flex flex-col gap-1 rounded-md border border-border bg-white/90 px-2 py-1.5"
          >
            <div class="flex items-center gap-1.5">
              <span
                class="inline-block h-2 w-2 rounded-full"
                style="background: #0072b2"
              ></span>
              <span class="text-[9px] text-muted-foreground">{{
                t("guide.chart.legend.sim")
              }}</span>
            </div>
            <div class="flex items-center gap-1.5">
              <span
                class="inline-block h-2 w-2 rounded-full"
                style="background: #e69f00"
              ></span>
              <span class="text-[9px] text-muted-foreground">{{
                t("guide.chart.legend.exp")
              }}</span>
            </div>
          </div>
        </div>

        <div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
          <div
            v-for="key in chartInteractionKeys"
            :key="key"
            class="flex items-start gap-2"
          >
            <span class="shrink-0 font-semibold text-primary">{{
              t(`guide.chart.interaction.${key}.label`)
            }}</span>
            <span class="text-muted-foreground">{{
              t(`guide.chart.interaction.${key}.body`)
            }}</span>
          </div>
        </div>
      </div>

      <footer
        class="mt-4 border-t border-border pt-4 text-center text-[9px] text-muted-foreground"
      >
        {{ t("guide.footer.page") }} 1 / 2
      </footer>
    </section>

    <!-- ============================= PAGE 2 ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm]"
    >
      <p
        class="mb-2 text-[10px] tracking-[0.3em] text-muted-foreground uppercase"
      >
        {{ t("guide.mode2.eyebrow") }}
      </p>
      <h2 class="mb-6 text-lg font-semibold">{{ t("guide.mode2.title") }}</h2>

      <div class="mb-10">
        <h3 class="mb-2 text-sm font-semibold">
          {{ t("guide.extraction.title") }}
        </h3>
        <p class="mb-4 text-sm leading-relaxed text-muted-foreground">
          {{ t("guide.extraction.body") }}
        </p>

        <div class="grid grid-cols-2 gap-3">
          <div class="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p class="mb-1 text-xs font-semibold">
              {{ t("guide.extraction.rule.substrate.title") }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t("guide.extraction.rule.substrate.body") }}
            </p>
          </div>
          <div class="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p class="mb-1 text-xs font-semibold">
              {{ t("guide.extraction.rule.wavelength.title") }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ t("guide.extraction.rule.wavelength.body") }}
            </p>
          </div>
        </div>
      </div>

      <div class="flex flex-1 flex-col">
        <h3 class="mb-2 text-sm font-semibold">
          {{ t("guide.validation.title") }}
        </h3>
        <p class="mb-4 text-sm leading-relaxed text-muted-foreground">
          {{ t("guide.validation.body") }}
        </p>

        <div
          class="grid flex-1 grid-cols-2 gap-4 rounded-2xl border border-border bg-muted/20 p-3"
        >
          <div
            class="relative flex flex-col gap-2 rounded-lg border border-border bg-white p-4"
          >
            <p
              class="mb-1 text-[9px] tracking-widest text-muted-foreground uppercase"
            >
              {{ t("guide.validation.pdf.label") }}
            </p>
            <div class="h-2 w-full rounded bg-muted"></div>
            <div class="h-2 w-11/12 rounded bg-muted"></div>
            <div class="h-2 w-full rounded bg-muted"></div>
            <div class="h-2 w-4/5 rounded bg-muted"></div>
            <div
              class="relative my-2 w-fit rounded-sm border-2 border-accent px-2 py-1"
            >
              <span class="font-mono text-[10px] text-accent-foreground"
                >Q = 1.2 × 10⁴</span
              >
              <span
                class="absolute -top-4 left-0 text-[8px] font-medium text-accent-foreground"
                >{{ t("guide.validation.pdf.detected") }}</span
              >
            </div>
            <div class="h-2 w-full rounded bg-muted"></div>
            <div class="h-2 w-3/4 rounded bg-muted"></div>
            <div class="h-2 w-10/12 rounded bg-muted"></div>
          </div>

          <div
            class="flex flex-col gap-2 rounded-lg border border-border bg-white p-3"
          >
            <p
              class="mb-1 text-[9px] tracking-widest text-muted-foreground uppercase"
            >
              {{ t("guide.validation.table.label") }}
            </p>
            <div
              v-for="row in 3"
              :key="row"
              class="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5"
            >
              <span class="font-mono text-[10px] text-ink">FOM_{{ row }}</span>
              <div class="flex gap-1">
                <span
                  class="rounded px-2 py-1 text-[9px] font-medium text-[#009e73]"
                  style="background: rgba(0, 158, 115, 0.15)"
                >
                  {{ t("guide.validation.action.approve") }}
                </span>
                <span
                  class="rounded bg-primary/10 px-2 py-1 text-[9px] font-medium text-primary"
                >
                  {{ t("guide.validation.action.edit") }}
                </span>
                <span
                  class="rounded bg-destructive/10 px-2 py-1 text-[9px] font-medium text-destructive"
                >
                  {{ t("guide.validation.action.exclude") }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer
        class="mt-4 border-t border-border pt-4 text-center text-[9px] text-muted-foreground"
      >
        {{ t("guide.footer.page") }} 2 / 2
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale } = useI18n();

// Kept as a plain constant (rather than importing package.json, which sits
// outside the tsconfig `src` root) -- bump alongside real app releases.
const appVersion = "0.2.0";
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

const chartInteractionKeys = [
  "hover",
  "zoom",
  "legend",
  "scale",
  "median",
  "groupBy",
] as const;

// Fixed mock coordinates for the illustrative scatter -- purely decorative,
// mirrors the shape of a real FOM-vs-wavelength trend for the screenshot.
const simPoints = ref([
  { x: 80, y: 140 },
  { x: 130, y: 110 },
  { x: 180, y: 90 },
  { x: 230, y: 60 },
]);
const expPoints = ref([
  { x: 100, y: 120 },
  { x: 150, y: 95 },
  { x: 200, y: 70 },
  { x: 250, y: 45 },
]);

defineExpose({ rootEl });
</script>

<style scoped>
.guide-page {
  page-break-inside: avoid;
}
</style>
