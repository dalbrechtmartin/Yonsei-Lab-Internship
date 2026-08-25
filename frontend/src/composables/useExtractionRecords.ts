import { computed, ref, watch } from "vue";
import {
  apiService,
  type EditableRecordFields,
  type ExtractionRecord,
  type JobStatusResponse,
  type ReviewStatus,
} from "@/services/api";

export type ReviewFilter = "all" | "toConfirm" | "excluded";

// Exported so callers outside this composable (e.g. ExtractionReviewStep's
// per-record UI state) can key off the same stable identity -- `cursor`
// itself gets a new object reference on every PATCH response even while
// staying on the same logical record (see updateReviewStatus below), so
// anything that must survive a Valider/Corriger/Exclure click has to reset
// on this key changing, not on `cursor` changing.
export function recordKey(record: ExtractionRecord): string {
  return `${record.fileId}:${record.index}`;
}

/**
 * Aggregates every file's `/records` into one flat list for the review
 * step, and owns the review-row cursor, tab filter, and PATCH mutations.
 * The `/records` endpoint is per-file, so this is what makes the review
 * step feel like it's working over one job-wide table.
 */
export function useExtractionRecords() {
  const records = ref<ExtractionRecord[]>([]);
  const loading = ref(false);
  const activeFilter = ref<ReviewFilter>("all");
  const cursor = ref<ExtractionRecord | null>(null);
  const currentJobId = ref<string | null>(null);
  const pageCountCache = new Map<string, number>();

  const filteredRecords = computed(() => {
    switch (activeFilter.value) {
      case "toConfirm":
        return records.value.filter((r) => r.reviewStatus === "Edit");
      case "excluded":
        return records.value.filter((r) => r.reviewStatus === "Exclude");
      default:
        return records.value;
    }
  });

  const counts = computed(() => ({
    all: records.value.length,
    toConfirm: records.value.filter((r) => r.reviewStatus === "Edit").length,
    excluded: records.value.filter((r) => r.reviewStatus === "Exclude").length,
  }));

  // Switching tabs re-anchors the cursor to that tab's first row, same as
  // the mockup's tab strip driving the table below it.
  watch(activeFilter, () => {
    cursor.value = filteredRecords.value[0] ?? null;
  });

  function reset(): void {
    records.value = [];
    cursor.value = null;
    currentJobId.value = null;
    activeFilter.value = "all";
    pageCountCache.clear();
  }

  /** Loads every finished file's reconciled records for `job` and flattens
   * them into one list. Only "done" files have records to fetch -- a
   * "failed" file's records array is always empty server-side. */
  async function loadForJob(job: JobStatusResponse): Promise<void> {
    currentJobId.value = job.jobId;
    loading.value = true;
    try {
      const results = await Promise.all(
        job.files
          .filter((f) => f.status === "done")
          .map((f) => apiService.getFileRecords(job.jobId, f.id)),
      );
      records.value = results.flatMap((r) => r.records);
      // Land on the "to confirm" queue first when there's anything flagged
      // -- that's the reviewer's actual job -- falling back to the full
      // list only once nothing needs a second look.
      activeFilter.value = counts.value.toConfirm > 0 ? "toConfirm" : "all";
      cursor.value = filteredRecords.value[0] ?? null;
    } finally {
      loading.value = false;
    }
  }

  function selectRecord(record: ExtractionRecord): void {
    cursor.value = record;
  }

  /** Advances the cursor within the active tab's filtered list, wrapping
   * back to the first row after the last -- "Suivant" moves the review
   * cursor, never the wizard step. */
  function next(): void {
    const list = filteredRecords.value;
    if (list.length === 0) {
      cursor.value = null;
      return;
    }
    const currentIndex = cursor.value
      ? list.findIndex((r) => recordKey(r) === recordKey(cursor.value!))
      : -1;
    cursor.value = list[(currentIndex + 1) % list.length];
  }

  /** Same as `next`, backwards -- "Précédent" wraps to the last row before
   * the first. */
  function previous(): void {
    const list = filteredRecords.value;
    if (list.length === 0) {
      cursor.value = null;
      return;
    }
    const currentIndex = cursor.value
      ? list.findIndex((r) => recordKey(r) === recordKey(cursor.value!))
      : -1;
    cursor.value = list[(currentIndex - 1 + list.length) % list.length];
  }

  /** Valider/Corriger/Exclure all funnel through here -- a single PATCH
   * carrying the new status and, for a correction, the edited fields
   * together (see backend's review-status endpoint). */
  async function updateReviewStatus(
    record: ExtractionRecord,
    status: ReviewStatus,
    fields?: Partial<EditableRecordFields>,
  ): Promise<void> {
    const jobId = currentJobId.value;
    if (!jobId) return;
    const updated = await apiService.updateRecordReviewStatus(
      jobId,
      record.fileId,
      record.filename,
      record.index,
      status,
      fields,
    );
    const idx = records.value.findIndex(
      (r) => recordKey(r) === recordKey(record),
    );
    if (idx !== -1) records.value.splice(idx, 1, updated);
    if (cursor.value && recordKey(cursor.value) === recordKey(record)) {
      cursor.value = updated;
    }
    // The last flagged row just got resolved -- nothing left to confirm, so
    // hand the reviewer back to the full list instead of leaving them
    // stranded on a now-empty tab.
    if (activeFilter.value === "toConfirm" && counts.value.toConfirm === 0) {
      activeFilter.value = "all";
    }
  }

  /** Memoized per file -- the PDF's page count never changes mid-review. */
  async function getPageCount(fileId: string): Promise<number> {
    const cached = pageCountCache.get(fileId);
    if (cached !== undefined) return cached;
    const jobId = currentJobId.value;
    if (!jobId) return 1;
    const total = await apiService.getFilePageCount(jobId, fileId);
    pageCountCache.set(fileId, total);
    return total;
  }

  return {
    records,
    loading,
    activeFilter,
    filteredRecords,
    counts,
    cursor,
    loadForJob,
    selectRecord,
    next,
    previous,
    updateReviewStatus,
    getPageCount,
    reset,
  };
}
