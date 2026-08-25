<template>
  <!-- ============================= PAGE 18 -- Mode 2: section divider ============================= -->
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
        {{ t("guide.mode2.eyebrow") }}
      </p>
      <h2 class="max-w-lg text-3xl font-bold text-ink">
        {{ t("guide.mode2.title") }}
      </h2>
      <p class="max-w-sm text-sm leading-relaxed text-secondary">
        {{ t("guide.mode2.partIntro") }}
      </p>

      <div
        class="mt-2 flex items-center justify-center gap-4 rounded-2xl border border-border bg-muted/20 px-8 py-6"
      >
        <template v-for="(step, i) in mode2FlowSteps" :key="step.label">
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
            v-if="i < mode2FlowSteps.length - 1"
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
          {{ stripNumber(entry.label) }}
        </li>
      </ul>
    </div>
    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRight, ClipboardCheck, Download, Sparkles, Upload } from "@lucide/vue";
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
  () => `${t("guide.mode2.eyebrow")} — ${t("guide.mode2.title")}`,
);

// See GuidePageMode1Divider.vue's own copy of this helper for why it's
// needed: this list's positional badge would otherwise double up with the
// step numeral the label itself already carries (Correct has no such
// numeral -- see guide.outline.mode2Correct -- so it's simply left as-is).
function stripNumber(label: string): string {
  return label.replace(/^\d+\.\s*/, "");
}

// Every step here is real and usable end to end today -- unlike the old
// divider, none is styled as "still being designed" anymore.
const mode2FlowSteps = computed(() => [
  { label: t("guide.mode2.divider.flow.drop"), icon: Upload },
  { label: t("guide.mode2.divider.flow.extract"), icon: Sparkles },
  { label: t("guide.mode2.divider.flow.review"), icon: ClipboardCheck },
  { label: t("guide.mode2.divider.flow.export"), icon: Download },
]);
</script>
