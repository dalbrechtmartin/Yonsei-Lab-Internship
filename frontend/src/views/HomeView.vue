<template>
  <main class="flex grow flex-col">
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
        <div class="mb-9 flex items-center justify-center gap-5">
          <img
            :src="yonseiSymbol"
            alt="Yonsei University"
            class="h-10 w-auto drop-shadow-[0_0_6px_rgba(255,255,255,0.25)] sm:h-11.5"
          />
          <div class="h-9 w-px bg-white/20" />
          <span class="text-lg font-semibold tracking-[0.2em] text-white/70">OPTICA</span>
        </div>
        <p class="mb-5 text-[11px] font-medium tracking-[0.3em] text-white/40 uppercase">
          {{ t("view.home.hero.eyebrow") }}
        </p>
        <h1
          class="mx-auto text-[28px] leading-tight font-bold text-pretty text-white sm:text-[46px] sm:leading-[1.16]"
        >
          {{ t("view.home.hero.title") }}
        </h1>
        <p
          class="mx-auto mt-4 max-w-135 text-sm leading-relaxed text-white/60 sm:mt-5.5 sm:text-base sm:leading-[1.68]"
        >
          {{ t("view.home.hero.description") }}
        </p>
        <div class="mt-8 flex flex-wrap justify-center gap-3 sm:mt-9">
          <RouterLink
            to="/visualization"
            class="rounded-lg bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover sm:px-7.5"
          >
            {{ t("view.home.hero.cta") }}
          </RouterLink>
          <button
            type="button"
            class="rounded-lg border-[1.5px] border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white/85 transition-colors hover:bg-white/15 hover:text-white"
          >
            ↓ {{ t("view.home.hero.manual") }}
          </button>
        </div>
      </div>
    </section>

    <div
      class="flex-1 px-4 pt-7 pb-10 sm:px-10 sm:pt-9 sm:pb-13"
      style="background: radial-gradient(ellipse 80% 60% at 5% 0%, rgba(0, 150, 136, 0.1) 0%, transparent 55%), radial-gradient(ellipse 60% 50% at 95% 0%, rgba(0, 114, 178, 0.13) 0%, transparent 55%), linear-gradient(180deg, #f0f4f8 0%, #e9eef4 100%)"
    >
      <div class="mx-auto grid max-w-280 grid-cols-1 gap-5 sm:grid-cols-2">
        <RouterLink
          to="/visualization"
          class="flex flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none sm:p-8"
        >
          <p class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase">
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
          class="flex flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none sm:p-8"
        >
          <p class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase">
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
          class="flex flex-col rounded-[1.25rem] border border-white/55 bg-card/90 p-7 opacity-65 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:p-8"
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
            {{ t("view.home.tools.extraction.body") }} {{ t("view.home.tools.extraction.lockedNote") }}
          </p>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Lock } from "@lucide/vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import yonseiSymbol from "@/assets/yonsei-symbol.png";
import yonseiCampus from "@/assets/yonsei-university.jpg";

const { t } = useI18n();

// Extraction is locked in deployed builds while its next version is being
// reworked -- see the matching lock in AppNavbar.vue and the router guard.
const extractionLocked = import.meta.env.PROD;
</script>
