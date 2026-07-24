<template>
  <main class="grow px-3 pb-8 sm:px-4 lg:px-5">
    <div class="mx-auto flex w-full max-w-[1100px] flex-col gap-7 pt-6">
      <Card
        class="overflow-hidden rounded-4xl border-white/50 bg-card/80 px-6 py-12 text-center shadow-2xl shadow-slate-900/5 backdrop-blur-xl sm:px-12 sm:py-14"
      >
        <img :src="yonseiSymbol" alt="Yonsei University" class="mx-auto mb-3.5 block h-14 w-14" />
        <p class="text-xs uppercase tracking-[0.3em] text-secondary">
          {{ t("view.home.hero.eyebrow") }}
        </p>
        <h1
          class="mx-auto mt-3 max-w-[720px] text-[28px] leading-tight font-bold text-pretty text-ink sm:text-[34px]"
        >
          {{ t("view.home.hero.title") }}
        </h1>
        <p class="mx-auto mt-3.5 max-w-[560px] text-[15px] leading-relaxed text-secondary">
          {{ t("view.home.hero.description") }}
        </p>
        <div class="mt-6 flex justify-center">
          <Button as-child size="lg">
            <RouterLink to="/visualization">{{ t("view.home.hero.cta") }}</RouterLink>
          </Button>
        </div>
      </Card>

      <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <RouterLink
          to="/visualization"
          class="rounded-[1.25rem] border border-white/50 bg-card/80 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <p class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase">
            {{ t("view.home.tools.visualization.eyebrow") }}
          </p>
          <h3 class="mt-2 text-[19px] font-semibold text-ink">
            {{ t("view.home.tools.visualization.title") }}
          </h3>
          <p class="mt-2 text-[13px] leading-[1.55] text-secondary">
            {{ t("view.home.tools.visualization.body") }}
          </p>
        </RouterLink>

        <RouterLink
          v-if="!extractionLocked"
          to="/extraction"
          class="rounded-[1.25rem] border border-white/50 bg-card/80 p-7 text-left shadow-xl shadow-slate-900/5 backdrop-blur-xl transition-shadow duration-200 hover:shadow-2xl focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none"
        >
          <p class="text-[11px] font-bold tracking-[0.08em] text-primary uppercase">
            {{ t("view.home.tools.extraction.eyebrowUnlocked") }}
          </p>
          <h3 class="mt-2 text-[19px] font-semibold text-ink">
            {{ t("view.home.tools.extraction.title") }}
          </h3>
          <p class="mt-2 text-[13px] leading-[1.55] text-secondary">
            {{ t("view.home.tools.extraction.body") }}
          </p>
        </RouterLink>

        <div
          v-else
          class="rounded-[1.25rem] border border-white/50 bg-card/80 p-7 opacity-65 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
        >
          <p
            class="flex items-center gap-1.5 text-[11px] font-bold tracking-[0.08em] text-secondary uppercase"
          >
            {{ t("view.home.tools.extraction.eyebrow") }}
            <Lock class="size-3" />
          </p>
          <h3 class="mt-2 text-[19px] font-semibold text-ink">
            {{ t("view.home.tools.extraction.title") }}
          </h3>
          <p class="mt-2 text-[13px] leading-[1.55] text-secondary">
            {{ t("view.home.tools.extraction.body") }} {{ t("view.home.tools.extraction.lockedNote") }}
          </p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div
          v-for="(step, index) in howItWorks"
          :key="index"
          class="rounded-2xl border border-white/50 bg-card/80 p-[18px] shadow-xl shadow-slate-900/5 backdrop-blur-xl"
        >
          <div class="mb-1.5 font-mono text-[11px] text-primary">{{ step.n }}</div>
          <div class="mb-1 text-[13.5px] font-semibold text-ink">{{ step.title }}</div>
          <div class="text-xs leading-relaxed text-secondary">{{ step.body }}</div>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { Lock } from "@lucide/vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import yonseiSymbol from "@/assets/yonsei-symbol.png";

interface HowItWorksStep {
  n: string;
  title: string;
  body: string;
}

const { t, tm } = useI18n();

const howItWorks = tm("view.home.howItWorks") as HowItWorksStep[];

// Extraction is locked in deployed builds while its next version is being
// reworked -- see the matching lock in AppNavbar.vue and the router guard.
const extractionLocked = import.meta.env.PROD;
</script>
