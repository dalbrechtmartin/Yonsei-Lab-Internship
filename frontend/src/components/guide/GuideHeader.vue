<template>
  <header
    class="mb-5 flex items-start justify-between border-b border-border pb-3"
  >
    <div class="flex items-center gap-3">
      <img :src="logoUrl" class="h-12 w-12" />
      <div>
        <h1 class="text-xl leading-tight font-semibold">
          {{ t("app.title") }} — {{ t("guide.meta.subtitle") }}
        </h1>
        <p class="text-sm text-secondary">{{ t("guide.meta.lab") }}</p>
      </div>
    </div>
    <div class="flex flex-col items-end gap-2">
      <span class="font-mono text-xs text-secondary">
        {{ t("guide.meta.version") }} v{{ appVersion }}
      </span>
      <span
        class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase"
      >
        {{ locale }}
      </span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import logoUrl from "@/assets/logo.svg";

// appVersion is a prop, not read from a shared const, since HomeView's own
// page-1 header markup independently needs the exact same value -- see
// GuideTemplate.vue's own appVersion constant, the single source of truth.
defineProps<{ appVersion: string }>();

const { t, locale } = useI18n();
</script>
