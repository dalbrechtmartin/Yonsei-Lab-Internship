<template>
  <ToolActionsBar
    :tool-name="t('nav.extraction')"
    :show-export="false"
    :show-import="false"
  />

  <main class="grow px-6 pb-10 sm:px-8 lg:px-10">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        class="mt-6 overflow-hidden rounded-4xl border border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <div
          class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div class="max-w-2xl">
            <p class="text-xs uppercase tracking-[0.3em] text-secondary">
              {{ t("view.extraction.batchExtraction.legend") }}
            </p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">
              {{ t("view.extraction.batchExtraction.title") }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-secondary">
              {{ t("view.extraction.batchExtraction.description") }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-secondary">
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">
                {{ t("view.extraction.pdfInput.title") }}
              </div>
              <div>{{ t("view.extraction.pdfInput.description") }}</div>
            </div>
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">
                {{ t("view.extraction.excelOutput.title") }}
              </div>
              <div>{{ t("view.extraction.excelOutput.description") }}</div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="isProcessing" class="flex flex-col items-center gap-3 py-8">
        <div
          class="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin"
        />
        <p class="text-sm text-secondary">
          {{ t("extraction.processing", { count: fileCount }) }}
        </p>

        <div class="w-full max-w-sm">
          <div class="h-2 w-full overflow-hidden rounded-full bg-secondary/10">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
              :style="{ width: `${progressPercent}%` }"
            />
          </div>
          <p class="mt-2 text-center text-xs text-secondary">
            {{
              remainingSeconds > 0
                ? t("extraction.progress.remaining", {
                    time: formatDuration(remainingSeconds),
                  })
                : t("extraction.progress.almostDone")
            }}
          </p>
        </div>
      </div>

      <StatusToast
        v-if="!isProcessing"
        :status-key="statusKey"
        :status-class="statusClass"
        :fade-style="statusStyle"
        :duration-ms="ringDurationMs"
        :token="statusToken"
        @dismiss="dismissStatus"
      />

      <section
        v-show="!isProcessing && fileCount === 0"
        class="flex justify-center py-6"
      >
        <FileDropzone
          accept=".pdf"
          multiple
          :title="t('extraction.dropzone.title')"
          :subtitle="t('extraction.dropzone.subtitle')"
          @files-selected="handleExtract"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import StatusToast from "@/components/shared/StatusToast.vue";
import { apiService, QuotaExceededError } from "@/services/api";
import { useTransientStatus } from "@/composables/useTransientStatus";

const STATUS_VISIBLE_MS = 15000;

// Backend processes PDFs one at a time and sleeps 13s between each to stay
// within the LLM free-tier rate limit (see backend/main.py), plus a few
// seconds of actual model latency. There's no real progress feed from the
// server (it's a single blocking request), so this is only an estimate used
// to drive the progress bar — tune it if the backend's pace changes.
const ESTIMATED_SECONDS_PER_FILE = 30;
// Never let the estimate alone show 100% before the response actually
// arrives, so the bar doesn't look "done" while still waiting on the server.
const MAX_ESTIMATED_PROGRESS_PERCENT = 96;

const { t } = useI18n();

const isProcessing = ref(false);
const {
  statusKey,
  statusClass,
  statusStyle,
  statusToken,
  ringDurationMs,
  setTransientStatus,
  dismissStatus,
  clearStatus,
} = useTransientStatus(STATUS_VISIBLE_MS);
const fileCount = ref(0);
const elapsedSeconds = ref(0);
const progressTimer = ref<number | null>(null);

const estimatedTotalSeconds = computed(
  () => fileCount.value * ESTIMATED_SECONDS_PER_FILE,
);

const remainingSeconds = computed(() =>
  Math.max(estimatedTotalSeconds.value - elapsedSeconds.value, 0),
);

const progressPercent = computed(() => {
  if (estimatedTotalSeconds.value === 0) return 0;
  const ratio = elapsedSeconds.value / estimatedTotalSeconds.value;
  return Math.min(ratio, 1) * MAX_ESTIMATED_PROGRESS_PERCENT;
});

const formatDuration = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
};

const startProgressTimer = () => {
  elapsedSeconds.value = 0;
  progressTimer.value = window.setInterval(() => {
    elapsedSeconds.value += 1;
  }, 1000);
};

const stopProgressTimer = () => {
  if (progressTimer.value !== null) {
    window.clearInterval(progressTimer.value);
    progressTimer.value = null;
  }
};

const handleExtract = async (files: File[]) => {
  fileCount.value = files.length;
  clearStatus();
  isProcessing.value = true;
  startProgressTimer();

  try {
    const { blob, partial } = await apiService.extractPdfs(files);
    downloadBlob(blob, "Gold_Standard_Data.xlsx");
    setTransientStatus(
      partial ? "extraction.partialSuccess" : "extraction.success",
      partial
        ? "border-amber-500/20 bg-amber-500/12 text-amber-950"
        : "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
    );
  } catch (error) {
    setTransientStatus(
      error instanceof QuotaExceededError
        ? "extraction.quotaExceeded"
        : "extraction.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
  } finally {
    isProcessing.value = false;
    stopProgressTimer();
    fileCount.value = 0;
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

onUnmounted(() => {
  stopProgressTimer();
});
</script>
