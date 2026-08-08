<template>
  <div class="w-full max-w-2xl">
    <div class="flex items-start gap-4.5">
      <div class="relative h-13 w-11 shrink-0 overflow-visible">
        <svg
          class="lv-logo-bounce absolute top-2 left-0"
          width="44"
          height="44"
          viewBox="0 0 100 100"
        >
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

      <div class="min-w-0 flex-1 pt-2.5">
        <div class="text-sm font-semibold text-ink">
          {{ t("extraction.progress.heading") }}
        </div>
        <div class="text-xs text-secondary">
          {{
            t("extraction.progress.overall", {
              done: job.completedCount,
              total: job.totalFiles,
            })
          }}
          <template v-if="etaLabel">
            ·
            {{
              t("extraction.progress.etaRemaining", { eta: etaLabel })
            }}</template
          >
        </div>
      </div>
    </div>

    <div class="mt-3.5 h-2 overflow-hidden rounded-full bg-secondary/12">
      <div
        class="h-full rounded-full bg-emerald-600 transition-[width] duration-150"
        :style="{ width: overallPct + '%' }"
      />
    </div>

    <div
      v-if="job.notice"
      class="mt-3 flex items-start gap-2 rounded-[10px] border border-amber-500/20 bg-amber-500/10 px-3 py-2.5"
    >
      <span class="mt-px text-sm leading-none">⚠</span>
      <p class="text-xs leading-relaxed text-amber-900">
        {{
          t(`extraction.notice.${job.notice.reason}`, {
            count: job.notice.pendingCount,
          })
        }}
        {{ t("extraction.notice.retryIn", { seconds: retrySecondsLeft }) }}
      </p>
    </div>

    <ul class="mt-3.5 flex flex-col gap-2.5">
      <li
        v-for="file in job.files"
        :key="file.id"
        class="flex flex-col gap-1.5 rounded-xl border border-secondary/15 bg-secondary/5 px-3 py-2 text-sm"
      >
        <div class="flex items-center justify-between gap-3">
          <span class="min-w-0 flex-1 truncate text-ink">{{
            file.filename
          }}</span>
          <span
            class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
            :class="pillClass(file.status)"
          >
            <span
              v-if="file.status === 'processing'"
              class="h-2.5 w-2.5 animate-spin rounded-full border border-primary/40 border-t-primary"
              aria-hidden="true"
            />
            {{ t(`extraction.progress.file.${fileLabelKey(file)}`) }}
          </span>
        </div>
        <div class="h-1.25 overflow-hidden rounded-full bg-secondary/12">
          <div
            class="h-full rounded-full transition-[width] duration-300 ease-linear"
            :class="fileBarClass(file)"
            :style="{ width: fileProgressPct(file) + '%' }"
          />
        </div>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import type {
  JobFileStatus,
  JobFileStatusValue,
  JobStatusResponse,
} from "@/services/api";

const { t } = useI18n();

const props = defineProps<{ job: JobStatusResponse }>();

// A loading bar should never render fully empty -- start it slightly
// filled so it always reads as "in progress" from the first frame.
const MIN_OVERALL_PCT = 4;

const overallPct = computed(() => {
  const pct =
    props.job.totalFiles > 0
      ? (props.job.completedCount / props.job.totalFiles) * 100
      : 0;
  return Math.max(MIN_OVERALL_PCT, Math.round(pct));
});

// Ticks every second so the ETA and retry countdown stay live.
const nowMs = ref(Date.now());
let tickTimer: number | null = null;
onMounted(() => {
  tickTimer = window.setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
});
onUnmounted(() => {
  if (tickTimer !== null) window.clearInterval(tickTimer);
});

const formatDuration = (ms: number) => {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

// The backend never reports a duration estimate (Gemini gives no ETA),
// so this is a rough approximation: ~2 minutes per PDF until we have
// real data, then the actual average pace of this job once at least one
// file has finished -- explicitly approximate ("~"), never claimed exact.
// Also doubles as the "how long is too long" threshold for a single
// file's own progress bar below.
const ESTIMATED_MS_PER_FILE = 2 * 60 * 1000;

// Counts down against each file's own estimate instead of an average of
// files finished so far -- an average-based estimate stays frozen while
// the very first file is still in flight (nothing has completed yet to
// average), then can jump upward if that file happens to run long. This
// ticks steadily: time left on whichever file is in flight, plus a flat
// estimate for every file that hasn't started yet.
const etaLabel = computed(() => {
  const remainingFiles = props.job.totalFiles - props.job.completedCount;
  if (remainingFiles <= 0) return null;
  const processingFile = props.job.files.find((f) => f.status === "processing");
  let msLeft = remainingFiles * ESTIMATED_MS_PER_FILE;
  if (processingFile?.startedAt) {
    const elapsed = nowMs.value - new Date(processingFile.startedAt).getTime();
    msLeft -= Math.min(elapsed, ESTIMATED_MS_PER_FILE);
  }
  return formatDuration(msLeft);
});

const retrySecondsLeft = computed(() => {
  if (!props.job.notice) return 0;
  return Math.max(
    0,
    Math.round(
      (new Date(props.job.notice.retryAt).getTime() - nowMs.value) / 1000,
    ),
  );
});

const PROCESSING_BAR_CAP_PCT = 92;

const isOvertime = (file: JobFileStatus) => {
  if (file.status !== "processing" || !file.startedAt) return false;
  return (
    nowMs.value - new Date(file.startedAt).getTime() >= ESTIMATED_MS_PER_FILE
  );
};

const fileLabelKey = (file: JobFileStatus) => {
  if (file.status === "processing" && isOvertime(file)) return "almostDone";
  // A 'pending' file that already failed once this job is being held for
  // an automatic retry, not just waiting for its turn -- worth saying so.
  if (file.status === "pending" && file.errorReason) return "retrying";
  return file.status;
};

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

// The backend never reports a numeric progress fraction (Gemini gives no
// per-call progress), so this fills the bar toward the same ~2 min/file
// estimate used for the ETA -- real enough to feel alive, but explicitly
// capped below 100% while still processing so it never falsely claims
// the file is done a beat before the server actually says so.
const fileProgressPct = (file: JobFileStatus) => {
  if (file.status === "done" || file.status === "failed") return 100;
  if (file.status !== "processing" || !file.startedAt) return 0;
  const elapsedMs = nowMs.value - new Date(file.startedAt).getTime();
  const pct = (elapsedMs / ESTIMATED_MS_PER_FILE) * PROCESSING_BAR_CAP_PCT;
  return Math.min(PROCESSING_BAR_CAP_PCT, Math.max(0, Math.round(pct)));
};

const fileBarClass = (file: JobFileStatus) => {
  switch (file.status) {
    case "done":
      return "bg-emerald-600";
    case "failed":
      return "bg-rose-500";
    case "processing":
      // Pulses only once stalled at the cap, as a "still working" signal
      // instead of a determinate fill that looks frozen.
      return isOvertime(file) ? "animate-pulse bg-primary" : "bg-primary";
    default:
      return "bg-transparent";
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
