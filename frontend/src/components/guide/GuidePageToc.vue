<template>
  <!-- ============================= PAGE 3 -- Table of contents ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.toc')"
  >
    <GuideHeader :app-version="appVersion" />

    <h2 class="mb-2 text-xl font-semibold">{{ t("guide.toc.title") }}</h2>

    <div
      class="flex flex-col overflow-hidden rounded-2xl border border-border"
    >
      <template v-for="(entry, idx) in entries" :key="entry.page">
        <div
          v-if="
            entry.group === 'mode1' && entries[idx - 1]?.group !== 'mode1'
          "
          class="flex items-center gap-2 border-b border-border bg-primary/[0.07] px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary uppercase"
        >
          {{ t("guide.mode1.eyebrow") }} — {{ t("guide.mode1.title") }}
        </div>
        <div
          v-if="
            entry.group === 'mode2' && entries[idx - 1]?.group !== 'mode2'
          "
          class="flex items-center gap-2 border-b border-border bg-primary/[0.07] px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary uppercase"
        >
          {{ t("guide.mode2.eyebrow") }} — {{ t("guide.mode2.title") }}
        </div>
        <div
          class="guide-toc-row group flex items-center gap-3 px-4 py-2"
          :class="[
            idx % 2 === 1 ? 'bg-muted/25' : 'bg-white',
            entry.group === 'mode1' || entry.group === 'mode2' ? 'pl-9' : '',
            idx > 0 ? 'border-t border-border/70' : '',
          ]"
          :data-toc-target="entry.page"
        >
          <span
            class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
          >
            <component :is="entry.icon" class="size-3.5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium text-ink">{{
              entry.label
            }}</span>
            <span class="block truncate text-[11px] text-secondary">{{
              entry.desc
            }}</span>
          </span>
          <span
            class="h-0 w-6 flex-none -translate-y-1 border-b border-dotted border-secondary/50"
          />
          <span
            class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-white"
          >
            {{ entry.page }}
          </span>
        </div>
      </template>
    </div>

    <p class="mt-2 text-xs text-secondary">{{ t("guide.toc.hint") }}</p>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Component } from "vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  entries: {
    label: string;
    desc: string;
    page: number;
    icon: Component;
    group: "front" | "mode1" | "mode2" | "back";
  }[];
}>();

const { t } = useI18n();
</script>
