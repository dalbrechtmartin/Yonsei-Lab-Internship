<template>
  <!-- ============================= PAGE 19 -- Mode 2: today & what's coming ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="`${t('guide.outline.mode2')}: ${t('guide.mode2.today.title')}`"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-3 text-xl font-semibold">{{ t("guide.mode2.title") }}</h2>

    <div>
      <h3 class="mb-1 text-sm font-semibold text-primary">
        {{ t("guide.mode2.today.title") }}
      </h3>
      <p class="mb-2 text-[11.5px] leading-snug text-ink">
        {{ t("guide.mode2.today.body") }}
      </p>
      <div
        class="flex items-center justify-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-3"
      >
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Upload class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.today.flow.upload")
          }}</span>
        </div>
        <ArrowRight class="size-3.5 shrink-0 text-secondary/40" />
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Cpu class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.today.flow.model")
          }}</span>
        </div>
        <ArrowRight class="size-3.5 shrink-0 text-secondary/40" />
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Activity class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.today.flow.progress")
          }}</span>
        </div>
        <ArrowRight class="size-3.5 shrink-0 text-secondary/40" />
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Download class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.today.flow.export")
          }}</span>
        </div>
      </div>
    </div>

    <div class="mt-3">
      <h3 class="mb-1 text-sm font-semibold">
        {{ t("guide.mode2.preview.title") }}
      </h3>
      <p class="mb-2 text-[11px] leading-snug text-secondary">
        {{ t("guide.mode2.preview.intro") }}
      </p>
      <div class="grid grid-cols-3 gap-2.5">
        <div class="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p
            class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink"
          >
            <Sparkles class="size-3.5 shrink-0 text-primary" />{{
              t("guide.mode2.preview.rules.title")
            }}
          </p>
          <ul
            class="flex flex-col gap-1 pl-3.5 text-[11px] leading-snug text-secondary"
          >
            <li class="list-disc">
              {{ t("guide.mode2.preview.rules.items.scope") }}
            </li>
            <li class="list-disc">
              {{ t("guide.mode2.preview.rules.items.vocab") }}
            </li>
            <li class="list-disc">
              {{ t("guide.mode2.preview.rules.items.periodic") }}
            </li>
          </ul>
        </div>
        <div class="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p
            class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink"
          >
            <Table2 class="size-3.5 shrink-0 text-primary" />{{
              t("guide.mode2.preview.columns.title")
            }}
          </p>
          <p class="text-[11px] leading-snug text-secondary">
            {{ t("guide.mode2.preview.columns.body") }}
          </p>
        </div>
        <div class="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p
            class="mb-1 flex items-center gap-1.5 text-xs font-semibold text-ink"
          >
            <ClipboardCheck class="size-3.5 shrink-0 text-primary" />{{
              t("guide.mode2.preview.validation.title")
            }}
          </p>
          <p class="text-[11px] leading-snug text-secondary">
            {{ t("guide.mode2.preview.validation.body") }}
          </p>
        </div>
      </div>
    </div>

    <div class="mt-3">
      <div class="mb-1.5 flex items-center gap-2">
        <h3 class="text-sm font-semibold">
          {{ t("guide.mode2.wireframe.title") }}
        </h3>
        <span
          class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase"
        >
          {{ t("guide.mode2.wireframe.badge") }}
        </span>
      </div>
      <p class="mb-2 text-[11px] leading-snug text-secondary">
        {{ t("guide.mode2.wireframe.caption") }}
      </p>

      <!-- Pure wireframe: placeholder bars/blocks standing in for a
           split-screen "source page vs. extracted fields" review UI that
           doesn't exist yet -- deliberately abstract (no real component,
           no invented copy) rather than a fabricated screenshot, and
           explicitly labeled "theoretical" above and in the caption so it
           can never be mistaken for a real feature. -->
      <div
        class="flex overflow-hidden rounded-xl border border-dashed border-border"
      >
        <div
          class="flex-1 border-r border-dashed border-border bg-muted/20 p-4"
        >
          <div class="mb-2 h-2.5 w-2/3 rounded-full bg-secondary/25" />
          <div class="mb-1.5 h-2 w-full rounded-full bg-secondary/15" />
          <div class="mb-1.5 h-2 w-full rounded-full bg-secondary/15" />
          <div class="mb-1.5 h-2 w-5/6 rounded-full bg-secondary/15" />
          <div
            class="mb-2 h-9 w-full rounded-md border border-dashed border-primary/50 bg-primary/8"
          />
          <div class="mb-1.5 h-2 w-full rounded-full bg-secondary/15" />
          <div class="mb-1.5 h-2 w-4/5 rounded-full bg-secondary/15" />
          <div class="h-2 w-2/3 rounded-full bg-secondary/15" />
        </div>
        <div class="flex-1 bg-white p-4">
          <div class="mb-3 h-2.5 w-1/2 rounded-full bg-secondary/25" />
          <div
            v-for="i in 4"
            :key="i"
            class="mb-1.5 flex items-center gap-1.5"
          >
            <div class="h-2 w-1/3 rounded-full bg-secondary/15" />
            <div
              class="h-4.5 flex-1 rounded-md border border-secondary/20 bg-muted/20"
            />
          </div>
          <div class="mt-3 flex gap-2">
            <div class="h-6 w-16 rounded-md bg-primary/20" />
            <div class="h-6 w-16 rounded-md border border-secondary/20" />
          </div>
        </div>
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  Activity,
  ArrowRight,
  ClipboardCheck,
  Cpu,
  Download,
  Sparkles,
  Table2,
  Upload,
} from "@lucide/vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
}>();

const { t } = useI18n();
</script>
