<template>
  <div
    class="flex shrink-0 items-center gap-4 border-b border-secondary/10 px-5 py-4 sm:px-7"
  >
    <div class="relative h-13 w-11 shrink-0 overflow-visible">
      <svg
        class="lv-logo-bounce absolute top-2 left-0"
        width="44"
        height="44"
        viewBox="0 0 100 100"
      >
        <defs>
          <radialGradient id="lensGlareRunning" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#0072b2" stop-opacity="0.08" />
          </radialGradient>
        </defs>
        <circle cx="45" cy="45" r="32" fill="url(#lensGlareRunning)" />
        <circle cx="30" cy="35" r="2.5" fill="#1c2541" opacity="0.6" />
        <circle cx="58" cy="30" r="3.5" fill="#0b132b" opacity="0.8" />
        <circle cx="60" cy="52" r="2" fill="#0072b2" opacity="0.7" />
        <g
          stroke="#0072b2"
          stroke-width="7"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <line x1="38" y1="28" x2="56" y2="62" />
          <line x1="47" y1="44" x2="34" y2="62" />
        </g>
        <circle
          cx="45"
          cy="45"
          r="32"
          fill="none"
          stroke="#3a506b"
          stroke-width="6"
        />
        <line
          x1="66"
          y1="66"
          x2="86"
          y2="86"
          stroke="#1c2541"
          stroke-width="10"
          stroke-linecap="round"
        />
        <line
          x1="68"
          y1="68"
          x2="80"
          y2="80"
          stroke="#3a506b"
          stroke-width="2"
          stroke-linecap="round"
        />
      </svg>
      <div
        class="lv-logo-shadow absolute bottom-0.5 left-1/2 h-1.5 w-6.5 rounded-full bg-ink"
      />
    </div>

    <div class="min-w-0 flex-1">
      <p class="flex items-baseline gap-2 text-sm font-semibold text-ink">
        <span>
          {{
            t("extraction.running.heading", {
              done: job.completedCount,
              total: job.totalFiles,
            })
          }}
        </span>
        <span v-if="etaLabel" class="shrink-0 font-mono text-xs font-normal text-secondary">
          {{ t("extraction.progress.etaRemaining", { eta: etaLabel }) }}
        </span>
      </p>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-secondary/12">
        <div
          class="h-full rounded-full bg-emerald-600 transition-[width] duration-150"
          :style="{ width: overallPct + '%' }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";
import type { JobStatusResponse } from "@/services/api";
import { useExtractionProgressDisplay } from "@/composables/useExtractionProgressDisplay";

const { t } = useI18n();
const props = defineProps<{ job: JobStatusResponse }>();
const { overallPct, etaLabel } = useExtractionProgressDisplay(toRef(props, "job"));
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
