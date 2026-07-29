<template>
  <main class="flex animate-in fade-in grow flex-col duration-300">
    <section
      class="relative overflow-hidden bg-[#0b1824] px-6 pt-14 pb-12 text-center sm:px-20 sm:pt-20 sm:pb-19"
    >
      <img
        :src="yonseiCampus"
        alt=""
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
            class="h-14 w-auto drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] sm:h-16"
          />
          <div class="h-12 w-px bg-white/20 sm:h-14" />
          <img
            :src="yonseiOptica"
            alt="Optica"
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
        <RouterLink
          to="/visualization"
          class="flex animate-in fade-in slide-in-from-bottom-4 flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl fill-mode-both delay-300 transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none sm:p-8"
        >
          <p
            class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase"
          >
            {{ t("view.home.tools.visualization.eyebrow") }}
          </p>
          <h3 class="mt-2.5 text-[20px] font-semibold text-ink">
            {{ t("view.home.tools.visualization.title") }}
          </h3>
          <p class="mt-2.5 text-[13px] leading-[1.6] text-secondary">
            {{ t("view.home.tools.visualization.body") }}
          </p>
          <div class="mt-auto pt-5">
            <span
              class="inline-block rounded-[7px] bg-primary px-5 py-2.5 text-[13px] font-semibold text-white"
            >
              {{ t("view.home.tools.visualization.cta") }} →
            </span>
          </div>
        </RouterLink>

        <RouterLink
          v-if="!extractionLocked"
          to="/extraction"
          class="flex animate-in fade-in slide-in-from-bottom-4 flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl fill-mode-both delay-500 transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none sm:p-8"
        >
          <p
            class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase"
          >
            {{ t("view.home.tools.extraction.eyebrowUnlocked") }}
          </p>
          <h3 class="mt-2.5 text-[20px] font-semibold text-ink">
            {{ t("view.home.tools.extraction.title") }}
          </h3>
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

        <div
          v-else
          class="flex animate-in fade-in slide-in-from-bottom-4 flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 opacity-65 shadow-xl shadow-slate-900/5 backdrop-blur-xl fill-mode-both delay-500 duration-500 sm:p-8"
        >
          <p
            class="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-secondary uppercase"
          >
            {{ t("view.home.tools.extraction.eyebrow") }}
            <Lock class="size-3" />
          </p>
          <h3 class="mt-2.5 text-[20px] font-semibold text-ink">
            {{ t("view.home.tools.extraction.title") }}
          </h3>
          <p class="mt-2.5 text-[13px] leading-[1.6] text-secondary">
            {{ t("view.home.tools.extraction.body") }}
            {{ t("view.home.tools.extraction.lockedNote") }}
          </p>
        </div>
      </div>
    </div>

    <!-- Hidden multilingual guide, captured to PDF on demand -- see
         GuideTemplate.vue and utils/pdfExport.ts. -->
    <GuideTemplate ref="guideTemplateRef" />
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Lock } from "@lucide/vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import GuideTemplate from "@/components/guide/GuideTemplate.vue";
import { exportGuideToPdf } from "@/utils/pdfExport";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
import yonseiOptica from "@/assets/yonsei-optica.svg";
import yonseiCampus from "@/assets/yonsei-university.jpg";

const { t, locale } = useI18n();

// Extraction is locked in deployed builds while its next version is being
// reworked -- see the matching lock in AppNavbar.vue and the router guard.
const extractionLocked = import.meta.env.PROD;

const guideTemplateRef = ref<InstanceType<typeof GuideTemplate> | null>(null);
const generatingGuide = ref(false);

async function downloadGuide() {
  if (generatingGuide.value || !guideTemplateRef.value?.rootEl) return;

  generatingGuide.value = true;
  try {
    await exportGuideToPdf(
      guideTemplateRef.value.rootEl,
      `${t("guide.filenameBase")}_${t("app.title")}_${locale.value.toUpperCase()}.pdf`,
      { title: `${t("app.title")} — ${t("guide.meta.subtitle")}`, language: locale.value },
    );
  } finally {
    generatingGuide.value = false;
  }
}
</script>
