<template>
  <!-- ============================= PAGE 1 -- Cover ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col items-center justify-between bg-white p-[18mm] break-after-page"
    :data-outline-title="t('guide.outline.cover')"
  >
    <div class="flex w-full items-center justify-between">
      <span class="font-mono text-xs text-secondary"
        >{{ t("guide.meta.version") }} v{{ appVersion }}</span
      >
      <span
        class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase"
      >
        {{ locale }}
      </span>
    </div>

    <div class="flex flex-col items-center gap-5 text-center">
      <img src="@/assets/logo.svg" class="h-24 w-24" alt="" />
      <h1 class="text-5xl font-bold text-ink">{{ t("app.title") }}</h1>
      <p class="text-xl text-secondary">{{ t("guide.meta.subtitle") }}</p>
      <div class="mt-6 h-px w-24 bg-border" />
      <p class="max-w-md text-base leading-relaxed text-ink">
        {{ t("view.home.hero.title") }}
      </p>
      <p class="max-w-sm text-sm leading-relaxed text-secondary">
        {{ t("view.home.hero.description") }}
      </p>
    </div>

    <div class="flex w-full flex-col items-center gap-4">
      <div class="flex items-center gap-8">
        <img
          :src="yonseiSymbol"
          alt="Yonsei University"
          width="64"
          height="64"
          class="h-16 w-auto"
        />
        <div class="h-10 w-px bg-border" />
        <!-- The Optica mark ships as a solid-white SVG (built for the app's
             dark hero band, see HomeView.vue) -- on this plain white cover
             it's recolored to solid black via a brightness filter rather
             than boxed in a dark chip, so both marks read directly off
             the page like a real letterhead. -->
        <img
          :src="yonseiOptica"
          alt="Optica"
          width="96"
          height="48"
          class="h-12 w-auto"
          style="filter: brightness(0)"
        />
      </div>
      <p class="text-xs text-secondary">{{ t("guide.meta.lab") }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
import yonseiOptica from "@/assets/yonsei-optica.svg";

defineProps<{ appVersion: string }>();

const { t, locale } = useI18n();
</script>
