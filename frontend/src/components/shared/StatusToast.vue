<template>
  <div v-if="statusKey" class="w-full">
    <div
      class="w-full rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all duration-300 ease-out"
      :class="statusClass"
      :style="fadeStyle"
    >
      <div class="flex items-start justify-between gap-4">
        <p class="min-w-0 flex-1 leading-6">
          {{ t(statusKey) }}
        </p>

        <div class="relative mt-0.5 h-7 w-7 shrink-0">
          <svg
            v-if="durationMs > 0"
            :key="token"
            class="pointer-events-none absolute inset-0 h-7 w-7 -rotate-90"
            viewBox="0 0 28 28"
            aria-hidden="true"
          >
            <circle
              cx="14"
              cy="14"
              r="11"
              pathLength="1"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-dasharray="1"
              class="text-current/40 status-ring"
              :style="{ animationDuration: `${durationMs}ms` }"
            />
          </svg>
          <button
            type="button"
            class="absolute inset-0 inline-flex items-center justify-center rounded-full text-current/70 transition hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25"
            :aria-label="t('status.dismiss')"
            @click="$emit('dismiss')"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              class="h-4 w-4"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  statusKey: string;
  statusClass: string;
  fadeStyle: Record<string, string | number>;
  /** Countdown ring duration in ms. 0 hides the ring (persistent status). */
  durationMs: number;
  /** Bump this to force the ring to restart even if the key/class repeat. */
  token: number;
}>();
defineEmits<{ dismiss: [] }>();

const { t } = useI18n();
</script>

<style scoped>
/* SVG pathLength="1" normalizes the circle's circumference to 1, so the
   dash animation doesn't need to know the actual radius/circumference. */
@keyframes status-ring-countdown {
  from {
    stroke-dashoffset: 0;
  }
  to {
    stroke-dashoffset: 1;
  }
}

.status-ring {
  animation-name: status-ring-countdown;
  animation-timing-function: linear;
  animation-fill-mode: forwards;
}
</style>
