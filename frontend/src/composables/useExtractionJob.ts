import { computed, ref } from "vue";
import {
  apiService,
  type JobStatusResponse,
  type ModelChoice,
} from "@/services/api";
import { buildDefaultExportName } from "@/utils/exportFilename";

const POLL_INTERVAL_MS = 2500;
// Persisting the active job id lets a page refresh mid-batch reattach to
// polling instead of losing track of an already-running job -- the backend
// keeps processing regardless, since it's not tied to this browser tab's
// lifetime.
const ACTIVE_JOB_STORAGE_KEY = "extraction.activeJobId";
// A job always finishes on its own within roughly the backend's own
// automatic-retry budget (~20 min, see jobs.py) plus real processing time
// -- so a stored job id still unfinished well past that is not a job to
// reattach to, it's debris from a browser that was closed mid extraction
// days ago. Generous on purpose: never cut off a real batch.
const STALE_JOB_MAX_AGE_MS = 45 * 60 * 1000;

export interface ExtractionExportInfo {
  jobId: string;
  partial: boolean;
  defaultName: string;
}

export type ReattachOutcome = "none" | "resumed-running" | "resumed-done";

export interface UseExtractionJobOptions {
  /** Job finished with zero extractable records across every file (a real,
   * if rare, outcome -- e.g. no data table found in any paper). The
   * composable has already reset the job by the time this fires; the
   * caller decides how to tell the researcher (a toast, today). */
  onNoData?: () => void;
}

/**
 * Job creation, polling, and localStorage reattach -- the extraction
 * wizard's data/networking layer, deliberately unaware of i18n or toasts
 * (it throws/calls back instead) so the orchestrator decides what to show.
 */
export function useExtractionJob(options: UseExtractionJobOptions = {}) {
  const jobId = ref<string | null>(null);
  const jobStatus = ref<JobStatusResponse | null>(null);
  const isBusy = ref(false);
  const pollTimer = ref<number | null>(null);

  // Drives whether/what the export step shows -- null while busy, still
  // pending, or once resolved to a batch with no extractable records at
  // all (see markReady below, which resets the job in that case).
  const exportInfo = computed<ExtractionExportInfo | null>(() => {
    const status = jobStatus.value;
    if (!status || status.status !== "done") return null;
    if (!status.files.some((f) => f.recordCount > 0)) return null;
    return {
      jobId: status.jobId,
      partial: status.files.some((f) => f.status === "failed"),
      defaultName: buildDefaultExportName(status.files.map((f) => f.filename)),
    };
  });

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

  /** The job finished server-side -- stop polling. */
  const markReady = (status: JobStatusResponse) => {
    stopPolling();
    isBusy.value = false;

    // Mirrors the backend's own check (see download_job_result): a job can
    // reach "done" with zero records across every file (e.g. no data table
    // found in any paper). GET .../download then 400s, so bail out here
    // instead of leaving an export step that's guaranteed to fail.
    if (!status.files.some((f) => f.recordCount > 0)) {
      resetJob();
      options.onNoData?.();
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

  /** Submits PDFs and starts polling. Throws on failure (including
   * QuotaExceededError) rather than swallowing it -- the caller decides
   * what to show. */
  const startExtraction = async (files: File[], model: ModelChoice) => {
    const { jobId: newJobId } = await apiService.extractPdfs(files, model);
    jobId.value = newJobId;
    isBusy.value = true;
    window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, newJobId);
    await pollOnce();
    if (isBusy.value) startPolling();
  };

  /** Attempts to reattach to a job stored from a previous page load, so a
   * refresh mid-batch (or mid-review) doesn't strand the researcher back
   * at step 1. Returns the outcome so the caller (the wizard) can decide
   * which step to land on. */
  const reattach = async (): Promise<ReattachOutcome> => {
    const storedJobId = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);
    if (!storedJobId) return "none";

    jobId.value = storedJobId;
    try {
      const status = await apiService.getJobStatus(storedJobId);
      const ageMs = Date.now() - new Date(status.createdAt).getTime();
      if (status.status === "done") {
        jobStatus.value = status;
        markReady(status);
        return exportInfo.value ? "resumed-done" : "none";
      }
      if (ageMs > STALE_JOB_MAX_AGE_MS) {
        // Long past what any real batch (plus its automatic retries)
        // should take -- this is leftover state from a closed tab, not
        // live work.
        resetJob();
        return "none";
      }
      jobStatus.value = status;
      isBusy.value = true;
      startPolling();
      return "resumed-running";
    } catch (error) {
      console.error("Failed to reattach to stored job:", error);
      resetJob();
      return "none";
    }
  };

  return {
    jobId,
    jobStatus,
    isBusy,
    exportInfo,
    startExtraction,
    pollOnce,
    startPolling,
    stopPolling,
    resetJob,
    reattach,
  };
}
