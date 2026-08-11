<template>
  <!-- ============================= PAGE 18 -- Mode 2: section divider ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2')"
  >
    <GuideHeader :app-version="appVersion" />
    <div
      class="flex flex-1 flex-col items-center justify-center gap-5 text-center"
    >
      <p
        class="text-xs font-semibold tracking-[0.35em] text-secondary uppercase"
      >
        {{ t("guide.mode2.eyebrow") }}
      </p>
      <h2 class="max-w-lg text-3xl font-bold text-ink">
        {{ t("guide.mode2.title") }}
      </h2>
      <div
        class="flex max-w-md items-center gap-3 rounded-xl border border-border bg-muted/20 px-4 py-2.5 text-left"
      >
        <Info class="size-5 shrink-0 text-primary" />
        <p class="text-xs leading-snug text-ink">
          <strong class="font-semibold"
            >{{ t("guide.mode2.status.title") }}.</strong
          >
          {{ t("guide.mode2.status.body") }}
        </p>
      </div>

      <!-- Import and extraction are real and already usable (see page 18's
           "Aujourd'hui" section) -- only Human review is still being
           designed, so it alone stays in the dimmer, unstyled "not real
           yet" treatment the whole flow used to share. -->
      <div class="mt-1 flex items-center justify-center gap-2.5">
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Upload class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.divider.flow.upload")
          }}</span>
        </div>
        <ArrowRight class="size-3.5 shrink-0 text-secondary/40" />
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
          >
            <Sparkles class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.divider.flow.extract")
          }}</span>
        </div>
        <ArrowRight class="size-3.5 shrink-0 text-secondary/40" />
        <div class="flex flex-col items-center gap-1">
          <span
            class="flex size-9 items-center justify-center rounded-lg bg-secondary/10 text-secondary"
          >
            <ClipboardCheck class="size-4" />
          </span>
          <span class="text-[10px] text-secondary">{{
            t("guide.mode2.divider.flow.review")
          }}</span>
        </div>
      </div>
      <p class="text-[10px] text-secondary/70 italic">
        {{ t("guide.mode2.divider.caption") }}
      </p>
    </div>
    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowRight, ClipboardCheck, Info, Sparkles, Upload } from "@lucide/vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
}>();

const { t } = useI18n();
</script>
