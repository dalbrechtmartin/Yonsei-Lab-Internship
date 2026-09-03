<template>
  <!-- ============================= PAGE 11 -- Mode 1: interacting with the chart ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1ReadingInteract')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.readingInteract.title") }}
    </h2>
    <p class="mb-4 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.readingInteract.body") }}
    </p>

    <!-- Icon-led mini-cards, one per mouse interaction, instead of a dense
         text grid -- split off page 10 (see GuidePageReading.vue's own
         history) specifically to give each interaction room to read as a
         small, self-contained diagram rather than another paragraph. -->
    <div class="grid grid-cols-2 gap-4">
      <div
        v-for="item in interactions"
        :key="item.key"
        class="flex flex-col gap-2 rounded-2xl border border-border bg-muted/20 px-4 py-3.5"
      >
        <span
          class="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <component :is="item.icon" class="size-4.5" />
        </span>
        <p class="text-sm font-semibold text-ink">{{ item.label }}</p>
        <p class="text-xs leading-relaxed text-secondary">{{ item.body }}</p>
      </div>
    </div>

    <div class="mt-4 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.readingInteract.flaggedNote") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Menu, MousePointer2, MousePointerClick, ZoomIn } from "@lucide/vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
}>();

const { t } = useI18n();

const interactions = computed(() => [
  {
    key: "hover",
    icon: MousePointer2,
    label: t("guide.steps.readingInteract.interactions.hover.label"),
    body: t("guide.steps.readingInteract.interactions.hover.body"),
  },
  {
    key: "zoom",
    icon: ZoomIn,
    label: t("guide.steps.readingInteract.interactions.zoom.label"),
    body: t("guide.steps.readingInteract.interactions.zoom.body"),
  },
  {
    key: "click",
    icon: MousePointerClick,
    label: t("guide.steps.readingInteract.interactions.click.label"),
    body: t("guide.steps.readingInteract.interactions.click.body"),
  },
  {
    key: "rightClick",
    icon: Menu,
    label: t("guide.steps.readingInteract.interactions.rightClick.label"),
    body: t("guide.steps.readingInteract.interactions.rightClick.body"),
  },
]);
</script>
