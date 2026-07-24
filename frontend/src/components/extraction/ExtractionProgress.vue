<template>
  <div class="w-full max-w-2xl">
    <div class="flex items-start gap-4.5">
      <div class="relative h-13 w-11 shrink-0 overflow-visible">
        <svg class="lv-logo-bounce absolute top-2 left-0" width="44" height="44" viewBox="0 0 100 100">
          <defs>
            <radialGradient id="lensGlareLoader" cx="35%" cy="35%" r="60%">
              <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
              <stop offset="100%" stop-color="#0072b2" stop-opacity="0.08" />
            </radialGradient>
          </defs>
          <circle cx="45" cy="45" r="32" fill="url(#lensGlareLoader)" />
          <circle cx="30" cy="35" r="2.5" fill="#1c2541" opacity="0.6" />
          <circle cx="58" cy="30" r="3.5" fill="#0b132b" opacity="0.8" />
          <circle cx="60" cy="52" r="2" fill="#0072b2" opacity="0.7" />
          <g stroke="#0072b2" stroke-width="7" stroke-linecap="round" stroke-linejoin="round">
            <line x1="38" y1="28" x2="56" y2="62" />
            <line x1="47" y1="44" x2="34" y2="62" />
          </g>
          <circle cx="45" cy="45" r="32" fill="none" stroke="#3a506b" stroke-width="6" />
          <line x1="66" y1="66" x2="86" y2="86" stroke="#1c2541" stroke-width="10" stroke-linecap="round" />
          <line x1="68" y1="68" x2="80" y2="80" stroke="#3a506b" stroke-width="2" stroke-linecap="round" />
        </svg>
        <div class="lv-logo-shadow absolute bottom-0.5 left-1/2 h-1.5 w-6.5 rounded-full bg-ink" />
      </div>

      <div class="min-w-0 flex-1 pt-2.5">
        <div class="text-sm font-semibold text-ink">{{ t("extraction.progress.heading") }}</div>
        <div class="text-xs text-secondary">
          {{ t("extraction.progress.overall", { done: job.completedCount, total: job.totalFiles }) }}
        </div>
      </div>
    </div>

    <div class="mt-3.5 h-2 overflow-hidden rounded-full bg-secondary/12">
      <div class="h-full rounded-full bg-emerald-600 transition-[width] duration-150" :style="{ width: overallPct + '%' }" />
    </div>

    <div
      v-if="showResume"
      class="mt-3 flex items-start gap-2 rounded-[10px] border border-amber-500/20 bg-amber-500/10 px-3 py-2.5"
    >
      <span class="mt-px text-sm leading-none">⚠</span>
      <p class="text-xs leading-relaxed text-amber-900">{{ t("extraction.quotaHit") }}</p>
    </div>

    <ul class="mt-3.5 flex flex-col gap-2.5">
      <li
        v-for="file in job.files"
        :key="file.id"
        class="flex flex-col gap-1.5 rounded-xl border border-secondary/10 bg-background/70 px-3 py-2 text-sm"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="min-w-0 flex-1 truncate text-ink">{{ file.filename }}</span>
          <span
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="pillClass(file.status)"
          >
            <span
              v-if="file.status === 'processing'"
              class="h-2.5 w-2.5 animate-spin rounded-full border border-primary/40 border-t-primary"
              aria-hidden="true"
            />
            {{ t(`extraction.progress.file.${file.status}`) }}
          </span>
        </div>
        <div class="h-1.25 overflow-hidden rounded-full bg-secondary/12">
          <div class="h-full rounded-full transition-[width] duration-150" :class="fileBarClass(file.status)" :style="{ width: fileBarWidth(file.status) }" />
        </div>
      </li>
    </ul>

    <Button v-if="showResume" type="button" class="mt-4" @click="$emit('resume')">
      {{ t("extraction.progress.resume") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import type { JobFileStatusValue, JobStatusResponse } from "@/services/api";

const { t } = useI18n();

const props = defineProps<{ job: JobStatusResponse }>();
defineEmits<{ resume: [] }>();

const overallPct = computed(() =>
  props.job.totalFiles > 0 ? Math.round((props.job.completedCount / props.job.totalFiles) * 100) : 0,
);

const showResume = computed(
  () =>
    (["quota_hit", "interrupted", "error"] as const).includes(
      props.job.status as "quota_hit" | "interrupted" | "error",
    ) && props.job.completedCount < props.job.totalFiles,
);

const pillClass = (status: JobFileStatusValue) => {
  switch (status) {
    case "done":
      return "bg-emerald-500/10 text-emerald-700";
    case "failed":
      return "bg-rose-500/10 text-rose-700";
    case "processing":
      return "bg-primary/10 text-primary";
    default:
      return "bg-secondary/10 text-secondary";
  }
};

// The backend only reports a per-file *status*, not a numeric progress
// fraction -- so the thin bar reflects that status honestly (empty/full/
// pulsing) rather than fabricating a percentage the server never gave us.
const fileBarClass = (status: JobFileStatusValue) => {
  switch (status) {
    case "done":
      return "bg-emerald-600";
    case "failed":
      return "bg-rose-500";
    case "processing":
      return "animate-pulse bg-primary";
    default:
      return "bg-transparent";
  }
};
const fileBarWidth = (status: JobFileStatusValue) => {
  switch (status) {
    case "done":
    case "failed":
      return "100%";
    case "processing":
      return "60%";
    default:
      return "0%";
  }
};
</script>

<style scoped>
.lv-logo-bounce {
  animation: lv-logo-bounce 1.1s ease-in-out infinite;
}
.lv-logo-shadow {
  animation: lv-logo-shadow 1.1s ease-in-out infinite;
}
@keyframes lv-logo-bounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}
@keyframes lv-logo-shadow {
  0%,
  100% {
    transform: translateX(-50%) scaleX(1);
    opacity: 0.35;
  }
  50% {
    transform: translateX(-50%) scaleX(0.5);
    opacity: 0.12;
  }
}
</style>

