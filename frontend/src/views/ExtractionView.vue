<template>
  <ToolActionsBar
    :tool-name="t('nav.extraction')"
    :show-export="false"
    :show-import="false"
  />

  <main class="animate-in fade-in grow px-3 pb-8 duration-300 sm:px-4 lg:px-5">
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
              v-show="!isBusy && !readyToSave"
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
            v-show="!isBusy && !readyToSave"
            v-model:model-choice="modelChoice"
            class="md:w-1/3 md:shrink-0 md:border-l md:border-secondary/10 md:pl-6"
          />
        </div>
      </Card>

      <StatusToast
        v-if="!isBusy && !readyToSave"
        :status-key="statusKey"
        :status-class="statusClass"
        :fade-style="statusStyle"
        :duration-ms="ringDurationMs"
        :token="statusToken"
        @dismiss="dismissStatus"
      />

      <section v-if="isBusy && jobStatus" class="flex justify-center py-4">
        <ExtractionProgress :job="jobStatus" />
      </section>

      <section v-if="readyToSave" class="flex justify-center py-4">
        <div class="w-full max-w-2xl rounded-xl border border-secondary/15 bg-secondary/5 p-4">
          <p class="text-sm font-semibold text-ink">{{ t("extraction.ready.heading") }}</p>
          <p v-if="readyToSave.partial" class="mt-1 text-xs leading-relaxed text-amber-700">
            {{ t("extraction.partialSuccess") }}
          </p>
          <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              v-model="saveName"
              type="text"
              class="min-w-0 flex-1 rounded-lg border border-secondary/20 bg-card px-2 py-1.5 text-sm text-ink"
              :placeholder="readyToSave.defaultName"
            />
            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg border border-secondary/20 bg-card px-2.5 py-1.5 text-xs font-medium text-ink"
                >
                  .{{ saveFormat }}
                  <ChevronDown class="size-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem @select="saveFormat = 'xlsx'">.xlsx</DropdownMenuItem>
                <DropdownMenuItem @select="saveFormat = 'csv'">.csv</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button type="button" :disabled="isSaving" @click="handleSaveClick">
              {{ t("extraction.ready.save") }}
            </Button>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown } from "@lucide/vue";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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
import { buildDefaultExportName, normalizeFilename } from "@/utils/exportFilename";
import { saveBlobWithPicker, convertXlsxBlobToCsv } from "@/utils/saveFile";

const STATUS_VISIBLE_MS = 15000;
const POLL_INTERVAL_MS = 2500;
// Persisting the active job id lets a page refresh mid-batch reattach to
// polling instead of losing track of an already-running job -- the
// backend keeps processing regardless, since it's not tied to this
// browser tab's lifetime.
const ACTIVE_JOB_STORAGE_KEY = "extraction.activeJobId";
// A job always finishes on its own within roughly the backend's own
// automatic-retry budget (~20 min, see jobs.py) plus real processing
// time -- so a stored job id still unfinished well past that is not a
// job to reattach to, it's debris from a browser that was closed mid
// extraction days ago. Generous on purpose: never cut off a real batch.
const STALE_JOB_MAX_AGE_MS = 45 * 60 * 1000;

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

interface ReadyToSave {
  jobId: string;
  partial: boolean;
  defaultName: string;
}
const readyToSave = ref<ReadyToSave | null>(null);
const saveName = ref("");
const saveFormat = ref<"xlsx" | "csv">("xlsx");
const isSaving = ref(false);

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
  readyToSave.value = null;
  window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
};

/** The job finished server-side -- stop polling and let the user pick the
 * file's name/location instead of silently downloading it for them (the
 * File System Access API also requires a real click to show its picker,
 * so this doubles as satisfying that browser requirement). */
const markReady = (status: JobStatusResponse) => {
  stopPolling();
  isBusy.value = false;
  readyToSave.value = {
    jobId: status.jobId,
    partial: status.files.some((f) => f.status === "failed"),
    defaultName: buildDefaultExportName(status.files.map((f) => f.filename)),
  };
  saveName.value = readyToSave.value.defaultName;
};

const handleSaveClick = async () => {
  if (!readyToSave.value) return;
  isSaving.value = true;
  try {
    const { blob: xlsxBlob, partial } = await apiService.downloadJobResult(readyToSave.value.jobId);
    const blob = saveFormat.value === "csv" ? await convertXlsxBlobToCsv(xlsxBlob) : xlsxBlob;
    const filename = normalizeFilename(saveName.value || readyToSave.value.defaultName, saveFormat.value);
    await saveBlobWithPicker(blob, filename, saveFormat.value);
    setTransientStatus(
      partial ? "extraction.partialSuccess" : "extraction.success",
      partial
        ? "border-amber-500/20 bg-amber-500/12 text-amber-950"
        : "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
    );
    resetJob();
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return; // user cancelled the save dialog -- leave the prompt as-is
    }
    console.error("Failed to save job result:", error);
    setTransientStatus("extraction.error", "border-rose-500/20 bg-rose-500/12 text-rose-950");
  } finally {
    isSaving.value = false;
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
    markReady(status);
  }
  // Otherwise still pending/running -- including a file mid-automatic-
  // retry, which shows up as its own notice banner, not a stopped poll.
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
    if (isBusy.value) startPolling();
  } catch (error) {
    setTransientStatus(
      error instanceof QuotaExceededError
        ? "extraction.quotaExceeded"
        : "extraction.error",
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
    const ageMs = Date.now() - new Date(status.createdAt).getTime();
    if (status.status === "done") {
      markReady(status);
    } else if (ageMs > STALE_JOB_MAX_AGE_MS) {
      // Long past what any real batch (plus its automatic retries) should
      // take -- this is leftover state from a closed tab, not live work.
      resetJob();
    } else {
      jobStatus.value = status;
      isBusy.value = true;
      startPolling();
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
