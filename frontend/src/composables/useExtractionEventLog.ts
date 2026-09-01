import { type Ref, computed, ref, watch } from "vue";
import type { JobStatusResponse } from "@/services/api";

export interface ExtractionLogEntry {
  id: string;
  atMs: number;
  level: "info" | "warn";
  messageKey: string;
  params?: Record<string, unknown>;
  /** The count vue-i18n should pluralize this entry's message on (see
   * ExtractionEventLog.vue's `t(messageKey, params, { plural })`) --
   * undefined for messages with no countable quantity in them. */
  plural?: number;
}

// Which named param (if any) is the one number a log key's own message
// text pluralizes on -- e.g. pdfRead's "({pages} page(s))" needs `pages`,
// not `count`. A key absent here has nothing to pluralize (runFailed/
// fileFailed/extractSwitch/etc. never carry a bare countable noun).
const PLURAL_PARAM_BY_KEY: Record<string, string> = {
  fileDone: "count",
  pdfRead: "pages",
  runDone: "count",
  reconcileDone: "count",
  noticeStarted: "count",
};

// Backend event keys whose i18n message is split per "reason" (see
// backend's llm._classify_error / jobs.py's error_reason values) instead of
// one flat message -- mirrors runFailed's own long-standing nested shape in
// the locale files. Every other event key maps straight to
// `extraction.log.<key>`.
const REASON_KEYED_EVENTS = new Set(["runFailed", "fileFailed"]);

function messageKeyFor(key: string, params: Record<string, unknown>): string {
  if (REASON_KEYED_EVENTS.has(key)) {
    return `extraction.log.${key}.${params.reason ?? "error"}`;
  }
  // The fallback chain can run out of models entirely (params.nextModel is
  // null) -- a different sentence than "switching to X", not just a blank
  // {nextModel} inside the same one.
  if (key === "extractSwitch") {
    return `extraction.log.extractSwitch.${params.nextModel ? "next" : "exhausted"}`;
  }
  return `extraction.log.${key}`;
}

/**
 * Maps the backend's own persisted job event log (see JobStatusResponse's
 * `events` -- backend's state.append_job_event) into the "Journal" panel's
 * entries. The backend is the source of truth for what happened and when:
 * it records every model attempt, retry, fallback switch and quota hit as
 * it happens, not just what differs between two 2.5s status polls -- a
 * retry-then-success sequence that resolves between two polls used to be
 * completely invisible when this composable derived entries itself by
 * diffing snapshots. Instantiated once in ExtractionView.vue (fed
 * `useExtractionJob().jobStatus`) rather than inside
 * ExtractionRunningStep.vue, so the log stays accurate even for a run
 * where the journal panel was never opened.
 */
export function useExtractionEventLog(job: Ref<JobStatusResponse | null>) {
  const entries = ref<ExtractionLogEntry[]>([]);
  let nextSeq = 0;

  const reset = () => {
    entries.value = [];
    nextSeq = 0;
  };

  watch(job, (status) => {
    if (!status) return;

    const newEvents = status.events.filter((e) => e.seq >= nextSeq);
    if (!newEvents.length) return;
    nextSeq = status.events[status.events.length - 1].seq + 1;

    for (const event of newEvents) {
      const pluralParam = PLURAL_PARAM_BY_KEY[event.key];
      const pluralValue = pluralParam ? Number(event.params[pluralParam]) : undefined;
      entries.value.push({
        id: `${status.jobId}-${event.seq}`,
        atMs: event.atMs,
        level: event.level,
        messageKey: messageKeyFor(event.key, event.params),
        params: event.params,
        plural: Number.isFinite(pluralValue) ? pluralValue : undefined,
      });
    }
  });

  const warningCount = computed(
    () => entries.value.filter((e) => e.level === "warn").length,
  );

  return { entries, warningCount, reset };
}
