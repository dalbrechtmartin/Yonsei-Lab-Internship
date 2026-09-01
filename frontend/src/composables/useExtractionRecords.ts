import { computed, ref, watch } from "vue";
import {
  apiService,
  type EditableRecordFields,
  type ExtractionRecord,
  type JobStatusResponse,
  type ReviewStatus,
} from "@/services/api";

export type ReviewFilter = "all" | "toConfirm" | "excluded";
export type SortDirection = "asc" | "desc" | null;

// Exactly backend main.py's RECOMPUTE_TOUCHED_FIELDS -- the only fields a
// recompute-field/recompute-sensing-medium call could ever have touched, so
// undo/redo only ever needs to snapshot these 8 (see buildRecomputeSnapshot
// below). COLUMN_ORDER label strings, not camelCase -- restoreRecomputeFields
// is a raw snapshot replay, not a normal field edit.
const RECOMPUTE_SNAPSHOT_KEYS = {
  sensitivityNmPerRiu: "Sensitivity (nm/RIU)",
  fomRiuInv: "FOM (RIU^-1)",
  fwhmNm: "FWHM (nm)",
  conversionMethod: "Conversion Method",
  rawValue: "Raw Value",
  calculatedFields: "Calculated Fields",
  reviewStatus: "Review status",
  notes: "Notes",
} as const satisfies Partial<Record<keyof ExtractionRecord, string>>;

const RECOMPUTE_LABEL_TO_CAMEL = Object.fromEntries(
  Object.entries(RECOMPUTE_SNAPSHOT_KEYS).map(([camel, label]) => [label, camel]),
) as Record<string, keyof typeof RECOMPUTE_SNAPSHOT_KEYS>;

// `labels`, when given, restricts the snapshot to exactly those COLUMN_ORDER
// keys (used by undo/redo to mirror whichever subset the ORIGINAL recompute
// actually touched -- see diffRecomputeFields) -- defaults to all 8 when
// omitted (there's no prior action to mirror yet).
function buildRecomputeSnapshot(
  record: ExtractionRecord,
  labels?: string[],
): Record<string, unknown> {
  const keys = labels ?? Object.values(RECOMPUTE_SNAPSHOT_KEYS);
  const out: Record<string, unknown> = {};
  for (const label of keys) {
    const camelKey = RECOMPUTE_LABEL_TO_CAMEL[label];
    if (camelKey) out[label] = record[camelKey];
  }
  return out;
}

// Only the subset of RECOMPUTE_TOUCHED_FIELDS whose value actually differs
// between `before` and `after` -- a single recompute call typically only
// changes 2-4 of the 8 possible fields (e.g. a FOM-only fom_relation call
// never touches FWHM at all). Snapshotting only what actually changed means
// undo/redo can never clobber an UNRELATED field the reviewer edited by hand
// afterward (e.g. hand-correcting FWHM's own pencil right after recomputing
// FOM) -- undoing the FOM recompute must leave that separate FWHM edit
// alone, not silently revert it back to its pre-recompute value too.
function diffRecomputeFields(
  before: ExtractionRecord,
  after: ExtractionRecord,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [camelKey, label] of Object.entries(RECOMPUTE_SNAPSHOT_KEYS)) {
    const key = camelKey as keyof typeof RECOMPUTE_SNAPSHOT_KEYS;
    if (before[key] !== after[key]) out[label] = before[key];
  }
  return out;
}

interface RecomputeSnapshot {
  recordKey: string;
  fields: Record<string, unknown>;
}

// Blank refs always sort last regardless of direction -- only the relative
// order of actual ref values flips between asc/desc (same convention
// DataPointsTable's numericValue uses for NaN).
function compareRef(
  a: ExtractionRecord,
  b: ExtractionRecord,
  dir: 1 | -1,
): number {
  const aRef = a.ref ?? "";
  const bRef = b.ref ?? "";
  if (!aRef && !bRef) return 0;
  if (!aRef) return 1;
  if (!bRef) return -1;
  return dir * aRef.localeCompare(bRef, undefined, { numeric: true });
}

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
  // null = dataset order (the order files/modes were extracted in), the
  // default -- toggled by clicking the table's Référence column header.
  const sortByRef = ref<SortDirection>(null);
  const cursor = ref<ExtractionRecord | null>(null);
  const currentJobId = ref<string | null>(null);
  const pageCountCache = new Map<string, number>();
  const pageLabelsCache = new Map<string, (string | null)[]>();

  // Single-level undo/redo for a recompute-field/recompute-sensing-medium
  // action (see ExtractionReviewDetail's recompute panels) -- shared here,
  // one slot for the whole review screen, rather than per-component-instance
  // state that would reset on re-render. Scoped per record (see the cursor
  // watch below): navigating to a different record clears both, so an undo
  // slot from record A can never apply to record B.
  const recomputeUndo = ref<RecomputeSnapshot | null>(null);
  const recomputeRedo = ref<RecomputeSnapshot | null>(null);

  const filteredRecords = computed(() => {
    const base = (() => {
      switch (activeFilter.value) {
        case "toConfirm":
          return records.value.filter((r) => r.reviewStatus === "Edit");
        case "excluded":
          return records.value.filter((r) => r.reviewStatus === "Exclude");
        default:
          return records.value;
      }
    })();
    if (!sortByRef.value) return base;
    const dir = sortByRef.value === "asc" ? 1 : -1;
    return [...base].sort((a, b) => compareRef(a, b, dir));
  });

  /** Cycles the Référence column's sort: dataset order -> asc -> desc ->
   * back to dataset order. Applies to `filteredRecords`, so it also reorders
   * keyboard/"Suivant"-"Précédent" navigation, not just the table's display. */
  function toggleSortByRef(): void {
    sortByRef.value =
      sortByRef.value === "asc"
        ? "desc"
        : sortByRef.value === "desc"
          ? null
          : "asc";
  }

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
    sortByRef.value = null;
    pageCountCache.clear();
    pageLabelsCache.clear();
    recomputeUndo.value = null;
    recomputeRedo.value = null;
  }

  // A stale undo/redo slot must never bleed into a newly-selected record --
  // keyed off the record's stable identity, not object identity (cursor gets
  // a new object reference on every PATCH/recompute response even while
  // staying on the same logical record, which must NOT clear these).
  watch(
    () => (cursor.value ? recordKey(cursor.value) : null),
    () => {
      recomputeUndo.value = null;
      recomputeRedo.value = null;
    },
  );

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

  /** Splices a server-returned record replacement into `records` (and
   * `cursor`, if it's the one being replaced) by its stable identity --
   * shared by updateReviewStatus below and by a "recompute sensitivity"
   * response (see ExtractionReviewDetail), which updates machine-only
   * fields (Conversion Method/Raw Value) the review-status PATCH's
   * EDITABLE_RECORD_FIELDS allowlist can't touch, so it goes through its
   * own endpoint instead but still needs the same local-state splice. */
  function replaceRecord(updated: ExtractionRecord): void {
    const idx = records.value.findIndex(
      (r) => recordKey(r) === recordKey(updated),
    );
    if (idx !== -1) records.value.splice(idx, 1, updated);
    if (cursor.value && recordKey(cursor.value) === recordKey(updated)) {
      cursor.value = updated;
    }
    // The last flagged row just got resolved -- nothing left to confirm, so
    // hand the reviewer back to the full list instead of leaving them
    // stranded on a now-empty tab.
    if (activeFilter.value === "toConfirm" && counts.value.toConfirm === 0) {
      activeFilter.value = "all";
    }
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
    replaceRecord(updated);
  }

  /** Call right after a recompute-field/recompute-sensing-medium call
   * succeeds, with the full record as it was immediately BEFORE the call
   * (`before`) and the full record the API returned (`after`) -- see
   * ExtractionReviewDetail's `recompute-applied` emit. Snapshots ONLY
   * whichever of the 8 RECOMPUTE_TOUCHED_FIELDS this specific call actually
   * changed (see diffRecomputeFields) as the new undo target, and clears
   * any pending redo, since a fresh action always invalidates the old redo
   * branch (standard undo/redo semantics). A no-op if nothing actually
   * changed (shouldn't happen for a real recompute, but avoids leaving a
   * dead, empty-fields undo slot if it ever does). */
  function commitRecompute(before: ExtractionRecord, after: ExtractionRecord): void {
    const fields = diffRecomputeFields(before, after);
    if (Object.keys(fields).length === 0) return;
    recomputeUndo.value = { recordKey: recordKey(after), fields };
    recomputeRedo.value = null;
  }

  /** No-ops if there's nothing to undo, or if it belongs to a different
   * record than the one currently selected (should never happen -- the
   * cursor watch above already clears both on a record change -- but this
   * is the actual safety guarantee, not the watch). The redo snapshot it
   * builds covers ONLY the same fields it's about to overwrite (not the
   * full 8) -- restoring must never also revert some OTHER field a
   * reviewer edited by hand in the meantime, and redo must mirror exactly
   * what undo touched, nothing more. */
  async function undoRecompute(): Promise<void> {
    const snapshot = recomputeUndo.value;
    const jobId = currentJobId.value;
    const current = cursor.value;
    if (!snapshot || !jobId || !current || recordKey(current) !== snapshot.recordKey) return;
    const redoSnapshot: RecomputeSnapshot = {
      recordKey: snapshot.recordKey,
      fields: buildRecomputeSnapshot(current, Object.keys(snapshot.fields)),
    };
    const updated = await apiService.restoreRecomputeFields(
      jobId,
      current.fileId,
      current.filename,
      current.index,
      snapshot.fields,
    );
    replaceRecord(updated);
    recomputeRedo.value = redoSnapshot;
    recomputeUndo.value = null;
  }

  /** Symmetric to undoRecompute -- reapplies what was just undone, touching
   * only that same field subset. */
  async function redoRecompute(): Promise<void> {
    const snapshot = recomputeRedo.value;
    const jobId = currentJobId.value;
    const current = cursor.value;
    if (!snapshot || !jobId || !current || recordKey(current) !== snapshot.recordKey) return;
    const undoSnapshot: RecomputeSnapshot = {
      recordKey: snapshot.recordKey,
      fields: buildRecomputeSnapshot(current, Object.keys(snapshot.fields)),
    };
    const updated = await apiService.restoreRecomputeFields(
      jobId,
      current.fileId,
      current.filename,
      current.index,
      snapshot.fields,
    );
    replaceRecord(updated);
    recomputeUndo.value = undoSnapshot;
    recomputeRedo.value = null;
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

  /** Memoized per file, same reasoning as getPageCount -- a PDF's printed
   * page labels never change mid-review. */
  async function getPageLabels(fileId: string): Promise<(string | null)[]> {
    const cached = pageLabelsCache.get(fileId);
    if (cached !== undefined) return cached;
    const jobId = currentJobId.value;
    if (!jobId) return [];
    const labels = await apiService.getPageLabels(jobId, fileId);
    pageLabelsCache.set(fileId, labels);
    return labels;
  }

  return {
    records,
    loading,
    activeFilter,
    sortByRef,
    toggleSortByRef,
    filteredRecords,
    counts,
    cursor,
    loadForJob,
    selectRecord,
    next,
    previous,
    updateReviewStatus,
    replaceRecord,
    getPageCount,
    getPageLabels,
    recomputeUndo,
    recomputeRedo,
    commitRecompute,
    undoRecompute,
    redoRecompute,
    reset,
  };
}
