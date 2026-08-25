import { type Ref, computed, ref, watch } from "vue";
import type { JobStatusResponse } from "@/services/api";

export interface ExtractionLogEntry {
  id: string;
  atMs: number;
  level: "info" | "warn";
  messageKey: string;
  params?: Record<string, unknown>;
}

/**
 * Derives a timestamped event journal by diffing successive job status
 * snapshots -- the backend has no event-log endpoint of its own, so this is
 * the only source for the "Journal" panel and for the summary
 * interstitial's warning count. Instantiated once in ExtractionView.vue
 * (fed `useExtractionJob().jobStatus`) rather than inside
 * ExtractionRunningStep.vue, so the log stays accurate even for a run
 * where the journal panel was never opened.
 */
export function useExtractionEventLog(job: Ref<JobStatusResponse | null>) {
  const entries = ref<ExtractionLogEntry[]>([]);
  let seq = 0;
  const knownFileStatus = new Map<string, string>();
  let noticeActive = false;

  const push = (
    level: "info" | "warn",
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    entries.value.push({
      id: `${Date.now()}-${seq++}`,
      atMs: Date.now(),
      level,
      messageKey,
      params,
    });
  };

  const reset = () => {
    entries.value = [];
    knownFileStatus.clear();
    noticeActive = false;
  };

  watch(job, (status) => {
    if (!status) return;

    for (const file of status.files) {
      const prev = knownFileStatus.get(file.id);
      if (prev === file.status) continue;
      knownFileStatus.set(file.id, file.status);
      if (file.status === "processing") {
        push("info", "extraction.log.fileProcessing", { filename: file.filename });
      } else if (file.status === "done") {
        push("info", "extraction.log.fileDone", {
          filename: file.filename,
          count: file.recordCount,
        });
      } else if (file.status === "failed") {
        push("warn", "extraction.log.fileFailed", { filename: file.filename });
      }
    }

    if (status.notice && !noticeActive) {
      noticeActive = true;
      push("warn", "extraction.log.noticeStarted", {
        count: status.notice.pendingCount,
      });
    } else if (!status.notice && noticeActive) {
      noticeActive = false;
      push("info", "extraction.log.noticeCleared");
    }
  });

  const warningCount = computed(
    () => entries.value.filter((e) => e.level === "warn").length,
  );

  return { entries, warningCount, reset };
}
