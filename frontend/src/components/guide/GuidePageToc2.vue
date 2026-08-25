<template>
  <!-- ============================= PAGE 4 -- Table of contents (cont.) ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.toc2')"
  >
    <GuideHeader :app-version="appVersion" />

    <h2 class="mb-2 text-xl font-semibold">{{ t("guide.toc.title2") }}</h2>

    <div class="min-h-0 flex-1">
      <div
        class="flex flex-col overflow-hidden rounded-2xl border border-border bg-white"
      >
        <div
          class="flex items-center gap-2 border-b border-border bg-primary/[0.07] px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary uppercase"
        >
          {{ t("guide.mode2.eyebrow") }} — {{ t("guide.mode2.title") }}
        </div>
        <template v-for="(entry, idx) in entries" :key="entry.page">
          <GuideTocRow :entry="entry" :idx="idx" />
        </template>
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { Component } from "vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideTocRow from "./GuideTocRow.vue";

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
