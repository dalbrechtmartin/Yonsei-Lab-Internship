<template>
  <ToolActionsBar
    :tool-name="t('nav.extraction')"
    :show-export="false"
    :show-import="false"
  />

  <main class="grow px-3 pb-8 sm:px-4 lg:px-5">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <Card class="mt-4 overflow-hidden rounded-4xl border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl">
        <div class="flex flex-col gap-6 md:flex-row md:items-stretch md:gap-8">
          <div class="flex flex-col md:w-2/3">
            <p class="text-xs uppercase tracking-[0.3em] text-secondary">
              {{ t("view.extraction.batchExtraction.legend") }}
            </p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">
              {{ t("view.extraction.batchExtraction.title") }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-secondary">
              {{ t("view.extraction.batchExtraction.description") }}
            </p>

            <FileDropzone
              v-show="!isBusy"
              compact
              accept=".pdf"
              multiple
              class="mt-4 flex flex-1 flex-col items-center justify-center"
              :title="t('extraction.dropzone.title')"
              :subtitle="t('extraction.dropzone.subtitle')"
              @files-selected="handleExtract"
            />
          </div>

          <ModelSelector
            v-show="!isBusy"
            v-model:model-choice="modelChoice"
            class="md:w-1/3 md:shrink-0 md:border-l md:border-secondary/10 md:pl-6"
          />
        </div>
      </Card>

      <StatusToast
        v-if="!isBusy"
        :status-key="statusKey"
        :status-class="statusClass"
        :fade-style="statusStyle"
        :duration-ms="ringDurationMs"
        :token="statusToken"
        @dismiss="dismissStatus"
      />

      <section v-if="isBusy && jobStatus" class="flex justify-center py-4">
        <ExtractionProgress :job="jobStatus" @resume="handleResume" />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Card } from "@/components/ui/card";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import StatusToast from "@/components/shared/StatusToast.vue";
import ModelSelector from "@/components/extraction/ModelSelector.vue";
import ExtractionProgress from "@/components/extraction/ExtractionProgress.vue";
import {
  apiService,
  QuotaExceededError,
  type JobStatusResponse,
  type ModelChoice,
} from "@/services/api";
import { useTransientStatus } from "@/composables/useTransientStatus";

const STATUS_VISIBLE_MS = 15000;
const POLL_INTERVAL_MS = 2500;
// Persisting the active job id lets a page refresh mid-batch reattach to
// polling instead of losing track of an already-running/resumable job --
// the backend keeps processing regardless, since it's not tied to this
// browser tab's lifetime.
const ACTIVE_JOB_STORAGE_KEY = "extraction.activeJobId";

const { t } = useI18n();

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

const modelChoice = ref<ModelChoice>("default");
const jobId = ref<string | null>(null);
const jobStatus = ref<JobStatusResponse | null>(null);
const pollTimer = ref<number | null>(null);
const isBusy = ref(false);

const stopPolling = () => {
  if (pollTimer.value !== null) {
    window.clearInterval(pollTimer.value);
    pollTimer.value = null;
  }
};

const resetJob = () => {
  stopPolling();
  jobId.value = null;
  jobStatus.value = null;
  isBusy.value = false;
  window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const finishJob = async () => {
  const id = jobId.value;
  if (!id) return;
  try {
    const { blob, partial } = await apiService.downloadJobResult(id);
    downloadBlob(blob, "Gold_Standard_Data.xlsx");
    setTransientStatus(
      partial ? "extraction.partialSuccess" : "extraction.success",
      partial
        ? "border-amber-500/20 bg-amber-500/12 text-amber-950"
        : "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
    );
  } catch (error) {
    console.error("Failed to download job result:", error);
    setTransientStatus(
      "extraction.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
  } finally {
    resetJob();
  }
};

/** Fetches the latest status once and reacts to a terminal state. Shared
 * by the poll interval, the immediate post-submit check, and mount-time
 * reattachment, so all three paths behave identically. */
const pollOnce = async () => {
  const id = jobId.value;
  if (!id) return;

  let status: JobStatusResponse;
  try {
    status = await apiService.getJobStatus(id);
  } catch (error) {
    console.error("Failed to fetch job status:", error);
    return; // transient network hiccup -- the next tick will retry
  }
  jobStatus.value = status;

  if (status.status === "done") {
    stopPolling();
    await finishJob();
    return;
  }

  if (["quota_hit", "interrupted", "error"].includes(status.status)) {
    stopPolling();
    if (status.completedCount < status.totalFiles) {
      setTransientStatus(
        "extraction.quotaHit",
        "border-amber-500/20 bg-amber-500/12 text-amber-950",
      );
    } else {
      // Nothing left to resume -- treat like a normal (partial) finish.
      await finishJob();
    }
  }
};

const startPolling = () => {
  stopPolling();
  pollTimer.value = window.setInterval(pollOnce, POLL_INTERVAL_MS);
};

const handleExtract = async (files: File[]) => {
  clearStatus();
  try {
    const { jobId: newJobId } = await apiService.extractPdfs(
      files,
      modelChoice.value,
    );
    jobId.value = newJobId;
    isBusy.value = true;
    window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, newJobId);
    await pollOnce();
    startPolling();
  } catch (error) {
    setTransientStatus(
      error instanceof QuotaExceededError
        ? "extraction.quotaExceeded"
        : "extraction.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
  }
};

const handleResume = async () => {
  const id = jobId.value;
  if (!id) return;
  try {
    await apiService.resumeJob(id);
    await pollOnce();
    startPolling();
  } catch (error) {
    console.error("Failed to resume job:", error);
    setTransientStatus(
      "extraction.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
  }
};

onMounted(async () => {
  const storedJobId = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
  if (!storedJobId) return;

  jobId.value = storedJobId;
  try {
    const status = await apiService.getJobStatus(storedJobId);
    jobStatus.value = status;
    if (status.status === "running" || status.status === "pending") {
      isBusy.value = true;
      startPolling();
    } else if (
      ["quota_hit", "interrupted", "error"].includes(status.status) &&
      status.completedCount < status.totalFiles
    ) {
      isBusy.value = true;
    } else {
      await finishJob();
    }
  } catch (error) {
    console.error("Failed to reattach to stored job:", error);
    resetJob();
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>
