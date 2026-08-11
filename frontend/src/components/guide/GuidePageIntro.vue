<template>
  <!-- ============================= PAGE 2 -- Introduction ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.intro')"
  >
    <GuideHeader :app-version="appVersion" />

    <!-- Single-column "hero" layout -- the PDF-folder -> guided-extraction
         -> chart diagram carries the page as its main visual (rather than
         being boxed into a text card), with the four institutions moved
         from a 2x2 card grid to a compact logo strip + numbered footnotes,
         like a real letterhead/paper citation rather than a spec sheet.
         Everything below the header centers together as ONE group (not
         just the text block stretched to fill the page) -- this page has
         noticeably less total content than the card grid it replaces, and
         centering only the text left a dead gap before the logo strip,
         which stayed pinned to the bottom next to the footer. -->
    <div class="flex flex-1 flex-col items-center justify-center text-center">
      <p
        class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
      >
        {{ t("guide.outline.intro") }}
      </p>
      <h2 class="mb-3 text-2xl font-bold text-ink">
        {{ t("guide.intro.title") }}
      </h2>
      <p class="mb-4 max-w-md text-sm leading-relaxed text-ink">
        {{ t("guide.intro.abstractBody") }}
      </p>

      <div
        class="mb-4 flex items-center justify-center gap-4 rounded-2xl border border-border bg-muted/20 px-8 py-5"
      >
        <div class="flex flex-col items-center gap-1.5">
          <span
            class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <FolderOpen class="size-5" />
          </span>
          <span
            class="max-w-20 text-[11px] leading-tight font-medium text-ink"
            >{{ t("guide.intro.diagram.folder") }}</span
          >
        </div>
        <ArrowRight class="size-4 shrink-0 text-secondary/50" />
        <div class="flex flex-col items-center gap-1.5">
          <span
            class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <Sparkles class="size-5" />
          </span>
          <span
            class="max-w-20 text-[11px] leading-tight font-medium text-ink"
            >{{ t("guide.intro.diagram.extraction") }}</span
          >
        </div>
        <ArrowRight class="size-4 shrink-0 text-secondary/50" />
        <div class="flex flex-col items-center gap-1.5">
          <span
            class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
          >
            <LineChart class="size-5" />
          </span>
          <span
            class="max-w-20 text-[11px] leading-tight font-medium text-ink"
            >{{ t("guide.intro.diagram.chart") }}</span
          >
        </div>
      </div>

      <p class="mb-2 max-w-md text-sm leading-relaxed text-ink">
        {{ t("guide.intro.guideBody") }}
      </p>
      <p class="mb-6 max-w-md text-sm leading-relaxed text-secondary">
        {{ t("guide.intro.contextBody") }}
      </p>

      <!-- Yonsei, BPEL, SPIE and Optica all reuse real, rights-cleared
           local marks (Optica's own standalone SVG here, not the
           yonsei-optica.svg lockup built for sitting next to Yonsei's mark
           on the cover). -->
      <div
        class="flex w-full max-w-md items-center justify-center gap-8 border-t border-border pt-4"
      >
        <div class="flex flex-col items-center gap-1.5">
          <img
            :src="yonseiSymbol"
            alt="Yonsei University"
            width="32"
            height="32"
            class="h-8 w-auto"
          />
          <span class="text-[11px] text-secondary">Yonsei<sup>1</sup></span>
        </div>
        <div class="h-8 w-px bg-border" />
        <div class="flex flex-col items-center gap-1.5">
          <img :src="bpelLogo" alt="BPEL" class="h-7 w-auto" />
          <span class="text-[11px] text-secondary">BPEL<sup>2</sup></span>
        </div>
        <div class="h-8 w-px bg-border" />
        <div class="flex flex-col items-center gap-1.5">
          <img :src="spieLogo" alt="SPIE" class="h-7 w-auto" />
          <span class="text-[11px] text-secondary">SPIE<sup>3</sup></span>
        </div>
        <div class="h-8 w-px bg-border" />
        <div class="flex flex-col items-center gap-1.5">
          <img :src="opticaLogo" alt="Optica" class="h-6 w-auto" />
          <span class="text-[11px] text-secondary">Optica<sup>4</sup></span>
        </div>
      </div>

      <!-- Each footnote's URL is a real clickable PDF link (see
           pdfExport.ts's data-external-link handling), same mechanism as
           the sample dataset link on the Import page -- pointing at each
           institution's own site rather than this app's origin. -->
      <div
        class="mt-3 flex max-w-md flex-col gap-1 text-left text-[9.5px] leading-snug text-secondary"
      >
        <p>
          <sup>1</sup> {{ t("guide.intro.yonsei") }}
          <span
            class="text-primary underline"
            data-external-link="https://www.yonsei.ac.kr/en_sc/"
            >yonsei.ac.kr</span
          >
        </p>
        <p>
          <sup>2</sup> {{ t("guide.intro.bpel") }}
          <span
            class="text-primary underline"
            data-external-link="https://monet.yonsei.ac.kr/"
            >monet.yonsei.ac.kr</span
          >
        </p>
        <p>
          <sup>3</sup> {{ t("guide.intro.spie") }}
          <span
            class="text-primary underline"
            data-external-link="https://spie.org/"
            >spie.org</span
          >
        </p>
        <p>
          <sup>4</sup> {{ t("guide.intro.optica") }}
          <span
            class="text-primary underline"
            data-external-link="https://www.optica.org/"
            >optica.org</span
          >
        </p>
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowRight, FolderOpen, LineChart, Sparkles } from "@lucide/vue";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
// Standalone marks for the intro's logo strip -- real, rights-cleared
// SVGs, not the yonsei-optica.svg lockup built for pairing next to Yonsei's
// own mark elsewhere.
import bpelLogo from "@/assets/bpel.svg";
import spieLogo from "@/assets/P-SPIE.svg";
import opticaLogo from "@/assets/optica.svg";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
}>();

const { t } = useI18n();
</script>
