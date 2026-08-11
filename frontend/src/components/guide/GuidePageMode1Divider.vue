<template>
  <!-- ============================= PAGE 4 -- Mode 1: section divider ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="outlineTitle"
  >
    <GuideHeader :app-version="appVersion" />
    <div
      class="flex flex-1 flex-col items-center justify-center gap-5 text-center"
    >
      <p
        class="text-xs font-semibold tracking-[0.35em] text-secondary uppercase"
      >
        {{ t("guide.mode1.eyebrow") }}
      </p>
      <h2 class="max-w-lg text-3xl font-bold text-ink">
        {{ t("guide.mode1.title") }}
      </h2>
      <p class="max-w-sm text-sm leading-relaxed text-secondary">
        {{ t("guide.mode1.partIntro") }}
      </p>
      <div
        class="mt-2 flex items-center justify-center gap-4 rounded-2xl border border-border bg-muted/20 px-8 py-6"
      >
        <template v-for="(step, i) in mode1FlowSteps" :key="step.label">
          <div class="flex flex-col items-center gap-1.5">
            <span
              class="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"
            >
              <component :is="step.icon" class="size-5" />
            </span>
            <span
              class="max-w-20 text-[10.5px] leading-tight font-medium text-ink"
              >{{ step.label }}</span
            >
          </div>
          <ArrowRight
            v-if="i < mode1FlowSteps.length - 1"
            class="size-4 shrink-0 text-secondary/40"
          />
        </template>
      </div>
      <ul class="mt-1 grid max-w-md grid-cols-2 gap-x-6 gap-y-1 text-left">
        <li
          v-for="entry in entries"
          :key="entry.page"
          class="flex items-center gap-2 text-xs text-secondary"
        >
          <span
            class="flex size-4 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[9px] font-semibold text-primary"
          >
            {{ entry.page - firstPage + 1 }}
          </span>
          {{ entry.label }}
        </li>
      </ul>
    </div>
    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRight, Download, Pin, SlidersHorizontal, Upload } from "@lucide/vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  entries: { label: string; page: number }[];
  firstPage: number;
}>();

const { t } = useI18n();

const outlineTitle = computed(
  () => `${t("guide.mode1.eyebrow")} — ${t("guide.mode1.title")}`,
);

const mode1FlowSteps = computed(() => [
  { label: t("guide.mode1.flow.import"), icon: Upload },
  { label: t("guide.mode1.flow.configure"), icon: SlidersHorizontal },
  { label: t("guide.mode1.flow.annotate"), icon: Pin },
  { label: t("guide.mode1.flow.export"), icon: Download },
]);
</script>
