<template>
  <!-- ============================= PAGE 3 -- Table of contents ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.toc')"
  >
    <GuideHeader :app-version="appVersion" />

    <h2 class="mb-2 text-xl font-semibold">{{ t("guide.toc.title") }}</h2>

    <div class="min-h-0 flex-1">
      <div
        class="flex flex-col overflow-hidden rounded-2xl border border-border bg-white"
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
          <GuideTocRow :entry="entry" :idx="idx" />
        </template>
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { Component } from "vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideTocRow from "./GuideTocRow.vue";

const props = defineProps<{
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

// Split across two pages (this one plus GuidePageToc2.vue) rather than
// squeezed into two side-by-side columns -- 19 entries at 15 vs. 5 made for
// a visibly lopsided, cramped-looking split. This page covers Mode 1 (whose
// 14 entries plus the Introduction still comfortably fit one page); Mode 2's
// 5 entries get their own page next. Front matter (just the Introduction)
// leads the list since it has no group header of its own to sit under.
const entries = computed(() =>
  props.entries.filter((e) => e.group === "front" || e.group === "mode1"),
);
</script>
