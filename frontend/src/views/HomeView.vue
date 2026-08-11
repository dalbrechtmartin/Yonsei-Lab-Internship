<template>
  <main class="flex animate-in fade-in grow flex-col duration-300">
    <section
      class="relative overflow-hidden bg-[#0b1824] px-6 pt-14 pb-12 text-center sm:px-20 sm:pt-20 sm:pb-19"
    >
      <img
        :src="yonseiCampus1600"
        :srcset="`${yonseiCampus640} 640w, ${yonseiCampus960} 960w, ${yonseiCampus1280} 1280w, ${yonseiCampus1600} 1600w`"
        sizes="100vw"
        fetchpriority="high"
        alt=""
        width="1600"
        height="991"
        class="absolute inset-0 h-full w-full object-cover object-[center_32%] opacity-[0.26]"
      />
      <div
        class="absolute inset-0 bg-[linear-gradient(180deg,rgba(11,24,36,0.55)_0%,rgba(11,24,36,0.2)_45%,rgba(11,24,36,0.65)_100%)]"
      />
      <div class="relative mx-auto max-w-215">
        <div
          class="mb-9 flex animate-in fade-in slide-in-from-bottom-4 items-center justify-center gap-5 fill-mode-both duration-500"
        >
          <img
            :src="yonseiSymbol"
            alt="Yonsei University"
            width="56"
            height="56"
            class="h-14 w-auto drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] sm:h-16"
          />
          <div class="h-12 w-px bg-white/20 sm:h-14" />
          <img
            :src="yonseiOptica"
            alt="Optica"
            width="88"
            height="44"
            class="h-11 w-auto drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] sm:h-12.5"
          />
        </div>
        <p
          class="mb-5 animate-in fade-in slide-in-from-bottom-4 text-[11px] font-medium tracking-[0.3em] text-white/40 uppercase fill-mode-both delay-100 duration-500"
        >
          {{ t("view.home.hero.eyebrow") }}
        </p>
        <h1
          class="mx-auto animate-in fade-in slide-in-from-bottom-4 text-[28px] leading-tight font-bold text-pretty text-white fill-mode-both delay-150 duration-500 sm:text-[46px] sm:leading-[1.16]"
        >
          {{ t("view.home.hero.title") }}
        </h1>
        <p
          class="mx-auto mt-4 max-w-135 animate-in fade-in slide-in-from-bottom-4 text-sm leading-relaxed text-white/60 fill-mode-both delay-200 duration-500 sm:mt-5.5 sm:text-base sm:leading-[1.68]"
        >
          {{ t("view.home.hero.description") }}
        </p>
        <div
          class="mt-8 flex animate-in fade-in slide-in-from-bottom-4 flex-wrap justify-center gap-3 fill-mode-both delay-300 duration-500 sm:mt-9"
        >
          <RouterLink
            to="/visualization"
            class="rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:px-7.5"
          >
            {{ t("view.home.hero.cta") }}
          </RouterLink>
          <button
            type="button"
            :disabled="generatingGuide"
            class="rounded-lg border-[1.5px] border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            @click="downloadGuide"
          >
            ↓
            {{
              generatingGuide
                ? t("guide.generating")
                : t("view.home.hero.manual")
            }}
          </button>
        </div>
      </div>
    </section>

    <div
      class="flex-1 px-4 pt-7 pb-10 sm:px-10 sm:pt-9 sm:pb-13"
      style="
        background:
          radial-gradient(
            ellipse 80% 60% at 5% 0%,
            rgba(0, 150, 136, 0.1) 0%,
            transparent 55%
          ),
          radial-gradient(
            ellipse 60% 50% at 95% 0%,
            rgba(0, 114, 178, 0.13) 0%,
            transparent 55%
          ),
          linear-gradient(180deg, #f0f4f8 0%, #e9eef4 100%);
      "
    >
      <div class="mx-auto grid max-w-280 grid-cols-1 gap-5 sm:grid-cols-2">
        <div
          class="relative flex animate-in fade-in slide-in-from-bottom-4 flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl fill-mode-both delay-300 transition-shadow duration-200 hover:shadow-2xl sm:p-8"
        >
          <!-- Stretched-link overlay: keeps the whole card clickable (same
               UX as before) while leaving room for a second, genuinely
               separate interactive control below (the sample dataset
               download) that must NOT also trigger this navigation. Painted
               above the plain-text content (browsers stack a positioned,
               z-index:0 element after in-flow static content) but below the
               download button, which gets its own stacking context via
               `relative z-10`. -->
          <RouterLink
            to="/visualization"
            class="absolute inset-0 rounded-[1.25rem] focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
            :aria-label="t('view.home.tools.visualization.cta')"
          />
          <p
            class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase"
          >
            {{ t("view.home.tools.visualization.eyebrow") }}
          </p>
          <h2 class="mt-2.5 text-[20px] font-semibold text-ink">
            {{ t("view.home.tools.visualization.title") }}
          </h2>
          <p class="mt-2.5 text-[13px] leading-[1.6] text-secondary">
            {{ t("view.home.tools.visualization.body") }}
          </p>
          <div class="mt-auto flex flex-wrap items-center gap-2.5 pt-5">
            <span
              class="inline-block rounded-[7px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-white"
            >
              {{ t("view.home.tools.visualization.cta") }} →
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="relative z-10 inline-flex items-center gap-1.5 rounded-[7px] border border-border bg-white/70 px-4 py-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
                >
                  <Download class="size-3.5" />
                  {{ t("view.home.tools.visualization.sampleData") }}
                  <ChevronDown class="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem @select="downloadSampleDataset('csv')">{{
                  t("fomcharts.export.csv")
                }}</DropdownMenuItem>
                <DropdownMenuItem @select="downloadSampleDataset('xlsx')">{{
                  t("fomcharts.export.xlsx")
                }}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <RouterLink
          to="/extraction"
          class="flex animate-in fade-in slide-in-from-bottom-4 flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl fill-mode-both delay-500 transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none sm:p-8"
        >
          <p
            class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase"
          >
            {{ t("view.home.tools.extraction.eyebrowUnlocked") }}
          </p>
          <h2 class="mt-2.5 text-[20px] font-semibold text-ink">
            {{ t("view.home.tools.extraction.title") }}
          </h2>
          <p class="mt-2.5 text-[13px] leading-[1.6] text-secondary">
            {{ t("view.home.tools.extraction.body") }}
          </p>
          <div class="mt-auto pt-5">
            <span
              class="inline-block rounded-[7px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-white"
            >
              {{ t("view.home.tools.extraction.cta") }} →
            </span>
          </div>
        </RouterLink>
      </div>
    </div>

    <!-- Hidden multilingual guide, captured to PDF on demand -- see
         GuideTemplate.vue and utils/pdfExport.ts. Kept out of the DOM until
         the first download request so its heavy dependency chunk (echarts,
         konva...) never loads on a plain home-page visit. -->
    <GuideTemplate v-if="showGuideTemplate" ref="guideTemplateRef" />
  </main>
</template>

<script setup lang="ts">
import { defineAsyncComponent, nextTick, ref } from "vue";
import { ChevronDown, Download } from "@lucide/vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

// GuideTemplate pulls in the whole visualization component tree (echarts,
// konva...) just to render the off-screen PDF guide, so it's loaded as its
// own chunk instead of shipping with every visit to the home page. The
// loader is kept as a named function (rather than inlined) so downloadGuide
// can await the same cached import() promise Vue uses internally.
const loadGuideTemplate = () => import("@/components/guide/GuideTemplate.vue");
const GuideTemplate = defineAsyncComponent(loadGuideTemplate);
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportGuideToPdf } from "@/utils/pdfExport";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
import yonseiOptica from "@/assets/yonsei-optica.svg";
import yonseiCampus640 from "@/assets/yonsei-university-640.webp";
import yonseiCampus960 from "@/assets/yonsei-university-960.webp";
import yonseiCampus1280 from "@/assets/yonsei-university-1280.webp";
import yonseiCampus1600 from "@/assets/yonsei-university-1600.webp";

const { t, locale } = useI18n();

const guideTemplateRef = ref<InstanceType<typeof GuideTemplate> | null>(null);
const showGuideTemplate = ref(false);
const generatingGuide = ref(false);

async function downloadGuide() {
  if (generatingGuide.value) return;

  generatingGuide.value = true;
  try {
    showGuideTemplate.value = true;
    // v-if just turned on; awaiting the same (module-cached) import promise
    // Vue's async component uses internally -- rather than polling with
    // nextTick(), which would busy-loop on microtasks and starve the chunk
    // fetch's own completion -- then one nextTick() flush lets Vue commit
    // the mount so guideTemplateRef/rootEl are populated.
    await loadGuideTemplate();
    await nextTick();
    if (!guideTemplateRef.value?.rootEl) return;
    // The guide being mounted doesn't mean its rings/PNG exports have
    // finished computing yet -- they re-run async on every locale switch,
    // so exporting right after switching language could otherwise snapshot
    // pages mid-capture.
    await guideTemplateRef.value.waitUntilReady();
    await exportGuideToPdf(
      guideTemplateRef.value.rootEl,
      `${t("guide.filenameBase")}_${t("app.title")}_${locale.value.toUpperCase()}.pdf`,
      {
        title: `${t("app.title")} — ${t("guide.meta.subtitle")}`,
        language: locale.value,
      },
    );
  } finally {
    generatingGuide.value = false;
  }
}

// Static files shipped in public/ -- a richer, standalone dataset for
// first-time visitors to try the tool with, deliberately separate from
// public/sample-guide-data.csv (that one stays pinned to the PDF guide's
// own screenshots and hardcoded row references, see GuideTemplate.vue).
function downloadSampleDataset(format: "csv" | "xlsx") {
  const link = document.createElement("a");
  link.href = `/sample-fom-dataset.${format}`;
  link.download = `sample-fom-dataset.${format}`;
  link.click();
}
</script>
