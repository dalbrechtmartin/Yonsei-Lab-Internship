<template>
  <!--
    Hidden single source of truth for the multilingual PDF user guide.
    Never shown on screen -- positioned off-canvas and captured by
    html2canvas-pro/jsPDF (utils/pdfExport.ts) on demand.

    Mode 1's illustrations are genuine renders of the real production
    components (FileDropzone, GraphControls, FomChart, StatsSummaryPanel),
    fed by a fixed worked-example dataset defined below -- not mockups --
    so the guide can never drift from what the app actually looks like,
    and stays multilingual for free since those components read the same
    vue-i18n instance as the rest of the app.

    Cover + introduction + a clickable table of contents (see
    data-toc-target below, resolved into real PDF link annotations by
    pdfExport.ts) come before Mode 1's own pages, and every figure is
    captioned with what it shows. Pages also carry a translated PDF
    outline (data-outline-title) so the document stays easy to skim and
    navigate, especially for low-vision readers relying on their PDF
    viewer's zoom and bookmarks.
  -->
  <div ref="rootEl" class="fixed top-0 left-[-9999px] font-sans text-ink" aria-hidden="true">
    <!-- ============================= PAGE 1 -- Cover ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col items-center justify-between bg-white p-[18mm] break-after-page"
      :data-outline-title="t('guide.outline.cover')"
    >
      <div class="flex w-full items-center justify-between">
        <span class="font-mono text-xs text-secondary">{{ t("guide.meta.version") }} v{{ appVersion }}</span>
        <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase">
          {{ locale }}
        </span>
      </div>

      <div class="flex flex-col items-center gap-5 text-center">
        <img src="@/assets/logo.svg" class="h-24 w-24" alt="" />
        <h1 class="text-5xl font-bold text-ink">{{ t("app.title") }}</h1>
        <p class="text-xl text-secondary">{{ t("guide.meta.subtitle") }}</p>
        <div class="mt-6 h-px w-24 bg-border" />
        <p class="max-w-md text-base leading-relaxed text-ink">{{ t("view.home.hero.title") }}</p>
        <p class="max-w-sm text-sm leading-relaxed text-secondary">{{ t("view.home.hero.description") }}</p>
      </div>

      <div class="flex w-full flex-col items-center gap-4">
        <!-- The Optica mark is a solid-white SVG (designed for the app's dark
             hero band, see HomeView.vue) -- invisible on a plain white cover,
             so it gets its own dark chip here rather than sitting bare. -->
        <div class="flex items-center gap-8 rounded-2xl bg-[#0b1824] px-8 py-4">
          <img :src="yonseiSymbol" alt="Yonsei University" class="h-14 w-auto" />
          <div class="h-9 w-px bg-white/20" />
          <img :src="yonseiOptica" alt="Optica" class="h-11 w-auto" />
        </div>
        <p class="text-xs text-secondary">{{ t("guide.meta.lab") }}</p>
      </div>
    </section>

    <!-- ============================= PAGE 2 -- Introduction / abstract ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.intro')"
    >
      <header class="mb-6 flex items-start justify-between border-b border-border pb-4">
        <div class="flex items-center gap-3">
          <img src="@/assets/logo.svg" class="h-12 w-12" alt="" />
          <div>
            <h1 class="text-xl leading-tight font-semibold">{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</h1>
            <p class="text-sm text-secondary">{{ t("guide.meta.lab") }}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="font-mono text-xs text-secondary">{{ t("guide.meta.version") }} v{{ appVersion }}</span>
          <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase">
            {{ locale }}
          </span>
        </div>
      </header>

      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.intro.title") }}</h2>

      <div class="mb-4">
        <h3 class="mb-1.5 text-base font-semibold text-primary">{{ t("guide.intro.abstractTitle") }}</h3>
        <p class="text-sm leading-relaxed text-ink">{{ t("guide.intro.abstractBody") }}</p>
      </div>

      <div class="mb-4">
        <h3 class="mb-1.5 text-base font-semibold text-primary">{{ t("guide.intro.guideTitle") }}</h3>
        <p class="text-sm leading-relaxed text-ink">{{ t("guide.intro.guideBody") }}</p>
      </div>

      <div class="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.authorTitle") }}</h3>
        <p class="text-sm leading-relaxed text-ink">{{ t("guide.intro.authorBody") }}</p>
      </div>

      <div class="h-px w-full bg-border" />

      <h2 class="mt-6 mb-4 text-xl font-semibold">{{ t("guide.toc.title") }}</h2>

      <div class="flex flex-col">
        <div
          v-for="entry in tocEntries"
          :key="entry.page"
          class="guide-toc-row flex items-baseline gap-2 border-b border-border py-2.5"
          :data-toc-target="entry.page"
        >
          <span class="text-base text-ink">{{ entry.label }}</span>
          <span class="mx-1 h-0 flex-1 -translate-y-1 border-b border-dotted border-secondary/50" />
          <span class="font-mono text-sm font-semibold text-primary">{{ entry.page }}</span>
        </div>
      </div>

      <p class="mt-3 text-xs text-secondary">{{ t("guide.toc.hint") }}</p>

      <footer class="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-secondary">
        <span>{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</span>
        <span>{{ t("guide.footer.page") }} {{ PAGE_INTRO }} / {{ TOTAL_PAGES }}</span>
      </footer>
    </section>

    <!-- ============================= PAGE 3 -- Mode 1: import & setup ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Setup')"
    >
      <header class="mb-6 flex items-start justify-between border-b border-border pb-4">
        <div class="flex items-center gap-3">
          <img src="@/assets/logo.svg" class="h-12 w-12" alt="" />
          <div>
            <h1 class="text-xl leading-tight font-semibold">{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</h1>
            <p class="text-sm text-secondary">{{ t("guide.meta.lab") }}</p>
          </div>
        </div>
        <div class="flex flex-col items-end gap-2">
          <span class="font-mono text-xs text-secondary">{{ t("guide.meta.version") }} v{{ appVersion }}</span>
          <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase">
            {{ locale }}
          </span>
        </div>
      </header>

      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.mode1.title") }}</h2>

      <div class="mb-6 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.scenario.title") }}</p>
        <p class="text-sm leading-relaxed text-ink">{{ t("guide.scenario.body") }}</p>
      </div>

      <div class="mb-6">
        <h3 class="mb-2 text-base font-semibold">{{ t("guide.steps.import.title") }}</h3>
        <p class="mb-3 text-sm leading-relaxed text-ink">{{ t("guide.steps.import.body") }}</p>

        <div class="mx-auto guide-callout-region" style="max-width: 420px">
          <FileDropzone compact />
        </div>
        <p class="mx-auto mt-2 max-w-[420px] text-sm leading-snug text-ink">{{ t("guide.steps.import.figure1Caption") }}</p>
      </div>

      <div class="mb-2">
        <div class="mx-auto guide-callout-region" style="max-width: 500px">
          <div class="flex items-center justify-between rounded-2xl border border-secondary/10 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-xl">
            <span class="text-sm font-semibold text-ink">{{ t("fomcharts.workspace.title") }}</span>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink">
                <Upload />
                {{ t("actions.import") }}
              </Button>
              <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink">
                <Download />
                {{ t("actions.export") }}
                <ChevronDown class="size-2.5" />
              </Button>
              <div class="h-5 w-px bg-secondary/15" />
              <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink">
                <RotateCcw />
                {{ t("fomcharts.workspace.reset") }}
              </Button>
            </div>
          </div>
        </div>
        <p class="mx-auto mt-2 max-w-[500px] text-sm leading-snug text-ink">{{ t("guide.steps.import.figure2Caption") }}</p>
      </div>

      <footer class="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-secondary">
        <span>{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</span>
        <span>{{ t("guide.footer.page") }} {{ PAGE_MODE1_IMPORT }} / {{ TOTAL_PAGES }}</span>
      </footer>
    </section>

    <!-- ============================= PAGE 4 -- Mode 1: axes, display & filters ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Controls')"
    >
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.steps.controls.title") }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-ink">{{ t("guide.steps.controls.body") }}</p>

      <div class="flex items-start gap-5">
        <div ref="controlsFiltersWrap" class="guide-callout-region shrink-0" style="width: 260px">
          <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-legend="showLegend"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:show-axis-names="showAxisNames"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:show-pareto="showPareto"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
          />
        </div>
        <p class="pt-1 text-sm leading-snug text-ink">{{ t("guide.steps.controls.figure3Caption") }}</p>
      </div>

      <footer class="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-secondary">
        <span>{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</span>
        <span>{{ t("guide.footer.page") }} {{ PAGE_MODE1_CONTROLS }} / {{ TOTAL_PAGES }}</span>
      </footer>
    </section>

    <!-- ============================= PAGE 5 -- Mode 1: chart, comparison & export ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Chart')"
    >
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.steps.reading.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-ink">{{ t("guide.steps.reading.body") }}</p>

      <div class="mx-auto guide-callout-region" style="width: 480px; height: 392px; overflow: hidden">
        <div style="width: 686px; transform: scale(0.7); transform-origin: top left">
          <FomChart
            :chart-data="sampleRows"
            :columns="sampleColumns"
            :y-axis="selectedYAxis"
            :x-axis="selectedXAxis"
            :group-by="groupBy"
            :y-axis-scale="yAxisScale"
            :chart-title="chartTitle"
            :show-legend="showLegend"
            :show-median="showMedian"
            :show-trend="showTrend"
            :show-pareto="showPareto"
            :show-axis-names="showAxisNames"
            :x-axis-numeric="true"
            :group-color-map="groupColorMap"
          />
        </div>
      </div>
      <p class="mx-auto mt-2 max-w-[480px] text-sm leading-snug text-ink">{{ t("guide.steps.reading.figure4Caption") }}</p>

      <div class="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.hover.label") }}</strong> — {{ t("guide.steps.reading.interactions.hover.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.zoom.label") }}</strong> — {{ t("guide.steps.reading.interactions.zoom.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.click.label") }}</strong> — {{ t("guide.steps.reading.interactions.click.body") }}</p>
        <p><strong class="text-primary">{{ t("fomcharts.medianLine.name") }}</strong> — {{ t("guide.steps.reading.interactions.median.body") }}</p>
      </div>

      <div class="mt-6">
        <h3 class="mb-2 text-base font-semibold">{{ t("guide.steps.compare.title") }}</h3>
        <p class="mb-3 text-sm leading-relaxed text-ink">{{ t("guide.steps.compare.body") }}</p>

        <div class="flex items-start gap-5">
          <div class="guide-callout-region shrink-0" style="width: 260px">
            <StatsSummaryPanel
              v-model:open="statsOpen"
              v-model:group-by="groupBy"
              :rows="plottableRows"
              :y-axis="selectedYAxis"
              :x-axis="selectedXAxis"
              :group-by-columns="groupByColumns"
              :highlight-group="highlightGroup"
              :composite-columns="compositeColumns"
              :group-color-map="groupColorMap"
            />
          </div>
          <p class="pt-1 text-sm leading-snug text-ink">{{ t("guide.steps.compare.figure5Caption") }}</p>
        </div>
      </div>

      <footer class="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-secondary">
        <span>{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</span>
        <span>{{ t("guide.footer.page") }} {{ PAGE_MODE1_CHART }} / {{ TOTAL_PAGES }}</span>
      </footer>
    </section>

    <!-- ============================= PAGE 6 -- Mode 2: coming soon ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm]"
      :data-outline-title="t('guide.outline.mode2')"
    >
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode2.eyebrow") }}</p>
      <h2 class="mb-6 text-xl font-semibold">{{ t("guide.mode2.title") }}</h2>

      <div class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-10 py-10 text-center">
        <p class="mb-3 text-3xl">🚧</p>
        <p class="mb-2 text-lg font-semibold text-ink">{{ t("guide.mode2.comingSoon.title") }}</p>
        <p class="max-w-md text-sm leading-relaxed text-ink">{{ t("guide.mode2.comingSoon.body") }}</p>
      </div>

      <div class="mt-8">
        <h3 class="mb-3 text-base font-semibold">{{ t("guide.mode2.preview.title") }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.mode2.preview.rules.title") }}</p>
            <p class="text-sm leading-relaxed text-secondary">{{ t("guide.mode2.preview.rules.body") }}</p>
          </div>
          <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.mode2.preview.validation.title") }}</p>
            <p class="text-sm leading-relaxed text-secondary">{{ t("guide.mode2.preview.validation.body") }}</p>
          </div>
        </div>
      </div>

      <footer class="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-secondary">
        <span>{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</span>
        <span>{{ t("guide.footer.page") }} {{ PAGE_MODE2 }} / {{ TOTAL_PAGES }}</span>
      </footer>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Download, RotateCcw, Upload } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import { filterPlottable } from "@/utils/stats";
import { assignGroupColors } from "@/utils/palette";
import {
  detectColumnTypes,
  findOriginColumn,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findModeIdColumn,
  distinctValues,
  tokenizedDistinctValues,
  tokenizeValue,
  groupableColumns,
  type DataRow,
} from "@/utils/columnTypes";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
import yonseiOptica from "@/assets/yonsei-optica.svg";

const { t, locale } = useI18n();

// Kept as a plain constant (rather than importing package.json, which sits
// outside the tsconfig `src` root) -- bump alongside real app releases.
const appVersion = "0.2.0";
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

// Fixed page numbers -- referenced both in each page's own footer and by
// the clickable table of contents (see tocEntries + data-toc-target below,
// resolved into real PDF link annotations by pdfExport.ts).
const PAGE_INTRO = 2;
const PAGE_MODE1_IMPORT = 3;
const PAGE_MODE1_CONTROLS = 4;
const PAGE_MODE1_CHART = 5;
const PAGE_MODE2 = 6;
const TOTAL_PAGES = 6;

const tocEntries = computed(() => [
  { label: t("guide.outline.intro"), page: PAGE_INTRO },
  { label: t("guide.outline.mode1Setup"), page: PAGE_MODE1_IMPORT },
  { label: t("guide.outline.mode1Controls"), page: PAGE_MODE1_CONTROLS },
  { label: t("guide.outline.mode1Chart"), page: PAGE_MODE1_CHART },
  { label: t("guide.outline.mode2"), page: PAGE_MODE2 },
]);

// ---------------------------------------------------------------------
// Worked example dataset (Mode 1 only) -- six photonic resonator sensor
// designs, each reported once experimentally (EXP) and once from
// simulation (SIM). Column names follow the same conventions the real
// app's column detectors (utils/columnTypes.ts) look for, so every real
// component mounted below -- GraphControls' filters, FomChart's grouping,
// StatsSummaryPanel -- behaves exactly as it would on a real uploaded
// file, not a hand-faked illustration.
// ---------------------------------------------------------------------
const sampleColumns = [
  "Ref",
  "Title",
  "Origin",
  "Material Class",
  "Base Materials",
  "Mode ID",
  "Resonance Wavelength (nm)",
  "Q-Factor",
  "Sensitivity (nm/RIU)",
  "FWHM (nm)",
  "Layer Structure",
  "Review Status",
  "Notes",
];

function sampleRow(data: Record<string, unknown>): DataRow {
  return { "Mode ID": 1, "Review Status": "Approve", Notes: "", ...data };
}

const sampleRows: DataRow[] = [
  sampleRow({ Ref: "R1", Title: "High-Q silicon microring resonator RI sensor", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Si;SiO2", "Resonance Wavelength (nm)": 1550, "Q-Factor": 42000, "Sensitivity (nm/RIU)": 65, "FWHM (nm)": 0.037, "Layer Structure": "Si core / SiO2 cladding" }),
  sampleRow({ Ref: "R1", Title: "High-Q silicon microring resonator RI sensor", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Si;SiO2", "Resonance Wavelength (nm)": 1550, "Q-Factor": 51000, "Sensitivity (nm/RIU)": 70, "FWHM (nm)": 0.03, "Layer Structure": "Si core / SiO2 cladding" }),
  sampleRow({ Ref: "R2", Title: "Silicon-nitride ring resonator for biosensing", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "SiN;SiO2", "Resonance Wavelength (nm)": 1310, "Q-Factor": 88000, "Sensitivity (nm/RIU)": 40, "FWHM (nm)": 0.015, "Layer Structure": "SiN core / SiO2 cladding" }),
  sampleRow({ Ref: "R2", Title: "Silicon-nitride ring resonator for biosensing", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "SiN;SiO2", "Resonance Wavelength (nm)": 1310, "Q-Factor": 96000, "Sensitivity (nm/RIU)": 45, "FWHM (nm)": 0.014, "Layer Structure": "SiN core / SiO2 cladding" }),
  sampleRow({ Ref: "R3", Title: "Plasmonic gold nanodisk array LSPR sensor", Origin: "EXP", "Material Class": "Metal", "Base Materials": "Au", "Resonance Wavelength (nm)": 780, "Q-Factor": 120, "Sensitivity (nm/RIU)": 320, "FWHM (nm)": 6.5, "Layer Structure": "Au nanodisk array / glass", "Review Status": "Edit", Notes: "FWHM estimated from the published linewidth plot (Q ≈ λ / FWHM)." }),
  sampleRow({ Ref: "R3", Title: "Plasmonic gold nanodisk array LSPR sensor", Origin: "SIM", "Material Class": "Metal", "Base Materials": "Au", "Resonance Wavelength (nm)": 780, "Q-Factor": 150, "Sensitivity (nm/RIU)": 340, "FWHM (nm)": 5.2, "Layer Structure": "Au nanodisk array / glass" }),
  sampleRow({ Ref: "R4", Title: "Hybrid dielectric-metal disk resonator on a gold mirror", Origin: "EXP", "Material Class": "Dielectric;Metal", "Base Materials": "Si;Au", "Resonance Wavelength (nm)": 1064, "Q-Factor": 3200, "Sensitivity (nm/RIU)": 210, "FWHM (nm)": 0.33, "Layer Structure": "Si disk / Au mirror" }),
  sampleRow({ Ref: "R4", Title: "Hybrid dielectric-metal disk resonator on a gold mirror", Origin: "SIM", "Material Class": "Dielectric;Metal", "Base Materials": "Si;Au", "Resonance Wavelength (nm)": 1064, "Q-Factor": 3900, "Sensitivity (nm/RIU)": 230, "FWHM (nm)": 0.27, "Layer Structure": "Si disk / Au mirror" }),
  sampleRow({ Ref: "R5", Title: "InP Mach-Zehnder interferometer sensor", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "InP", "Resonance Wavelength (nm)": 1550, "Q-Factor": 1200, "Sensitivity (nm/RIU)": 180, "FWHM (nm)": 1.3, "Layer Structure": "InP rib waveguide" }),
  sampleRow({ Ref: "R5", Title: "InP Mach-Zehnder interferometer sensor", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "InP", "Resonance Wavelength (nm)": 1550, "Q-Factor": 1500, "Sensitivity (nm/RIU)": 190, "FWHM (nm)": 1.0, "Layer Structure": "InP rib waveguide" }),
  sampleRow({ Ref: "R6", Title: "Polymer microring resonator for label-free detection", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Polymer;SiO2", "Resonance Wavelength (nm)": 1300, "Q-Factor": 2600, "Sensitivity (nm/RIU)": 95, "FWHM (nm)": 0.5, "Layer Structure": "Polymer core / SiO2 cladding" }),
  sampleRow({ Ref: "R6", Title: "Polymer microring resonator for label-free detection", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Polymer;SiO2", "Resonance Wavelength (nm)": 1300, "Q-Factor": 3100, "Sensitivity (nm/RIU)": 100, "FWHM (nm)": 0.42, "Layer Structure": "Polymer core / SiO2 cladding" }),
];

const columnTypes = detectColumnTypes(sampleRows, sampleColumns);
const numericColumns = columnTypes.numeric;
const categoricalColumns = columnTypes.categorical;

const originColumn = findOriginColumn(sampleColumns);
const materialClassColumn = findMaterialClassColumn(sampleColumns);
const baseMaterialsColumn = findBaseMaterialsColumn(sampleColumns);
const modeIdColumn = findModeIdColumn(sampleColumns);
const compositeColumns = [materialClassColumn, baseMaterialsColumn].filter((c): c is string => !!c);
const xAxisCategoricalColumns = categoricalColumns.filter((c) => c !== originColumn && !compositeColumns.includes(c));

const originValues = originColumn ? distinctValues(sampleRows, originColumn) : [];
const materialClassValues = materialClassColumn ? tokenizedDistinctValues(sampleRows, materialClassColumn) : [];
const baseMaterialsValues = baseMaterialsColumn ? tokenizedDistinctValues(sampleRows, baseMaterialsColumn) : [];

function countTokensBy(column: string | null, rows: DataRow[]): Record<string, number> {
  if (!column) return {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const tok of tokenizeValue(row[column])) counts[tok] = (counts[tok] ?? 0) + 1;
  }
  return counts;
}
const originCounts = countTokensBy(originColumn, sampleRows);
const materialClassCounts = countTokensBy(materialClassColumn, sampleRows);
const baseMaterialsCounts = countTokensBy(baseMaterialsColumn, sampleRows);

const groupByExemptColumns = [...compositeColumns, modeIdColumn].filter((c): c is string => !!c);
const groupByColumns = groupableColumns(sampleRows, categoricalColumns, groupByExemptColumns);

// Fixed illustrative chart configuration -- Q-factor (log scale) against
// resonance wavelength, colored by Origin (EXP vs SIM), median line on.
const selectedYAxis = ref<string | null>("Q-Factor");
const selectedXAxis = ref<string | null>("Resonance Wavelength (nm)");
const groupBy = ref<string | null>(originColumn);
const yAxisScale = ref<"log" | "value">("log");
const chartTitle = ref("");
const showLegend = ref(true);
const showMedian = ref(true);
const showTrend = ref(false);
const showAxisNames = ref(false);
const showPareto = ref(false);
const highlightGroup = ref<string | null>(null);
const selectedDomains = ref<string[]>([]);
const selectedOrigins = ref<string[]>([...originValues]);
const selectedMaterialClasses = ref<string[]>([...materialClassValues]);
const selectedBaseMaterials = ref<string[]>([...baseMaterialsValues]);

const groupColorMap = computed<Record<string, string>>(() => (originColumn ? assignGroupColors(originValues) : {}));

const plottableRows = computed(() => filterPlottable(filterPlottable(sampleRows, selectedYAxis.value), selectedXAxis.value));

const statsOpen = ref(true);

// The Filters section needs to be forced open for the screenshot --
// CollapsibleSection's open/closed state is internal, so this simulates
// the exact click a user would make on that section's header, right after
// the component mounts.
const controlsFiltersWrap = useTemplateRef<HTMLDivElement>("controlsFiltersWrap");

function openSection(root: HTMLElement | null, title: string) {
  const button = root ? Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.trim() === title) : undefined;
  button?.click();
}

onMounted(async () => {
  await nextTick();
  openSection(controlsFiltersWrap.value, t("fomcharts.sections.filters"));
});

defineExpose({ rootEl });
</script>

<style scoped>
.guide-page {
  page-break-inside: avoid;
}

.guide-callout-region {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 10px;
  background: #fff;
}
</style>
