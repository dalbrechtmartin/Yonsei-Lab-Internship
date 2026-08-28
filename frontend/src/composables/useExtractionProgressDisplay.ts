import { type Ref, computed, onMounted, onUnmounted, ref } from "vue";
import { FileIcon, FileCheckCorner, FileExclamationPoint } from "@lucide/vue";
import type { JobEvent, JobFileStatus, JobStatusResponse } from "@/services/api";
import { ESTIMATED_MS_PER_FILE, formatDuration } from "@/utils/extractionEta";

// backend's extractRetryQuota event (see llm.py) announces a concrete
// "retrying in {seconds}s" window for the file currently being processed --
// real wall-clock time the pace-based estimate below has no way to predict
// in advance. The backend processes one file at a time and sleeps through
// each retry synchronously before ever emitting the next event, so at most
// one such window is genuinely still open for a given file at once; this
// just finds it (the most recent matching event whose window hasn't
// elapsed yet) rather than assuming which one that is.
function pendingRetryDelayMs(events: JobEvent[], filename: string, nowMs: number): number {
  let remaining = 0;
  for (const event of events) {
    if (event.key !== "extractRetryQuota" || event.params.filename !== filename) continue;
    const seconds = Number(event.params.seconds);
    if (!Number.isFinite(seconds)) continue;
    remaining = Math.max(0, event.atMs + seconds * 1000 - nowMs);
  }
  return remaining;
}

// A loading bar should never render fully empty -- start it slightly filled
// so it always reads as "in progress" from the first frame.
const MIN_OVERALL_PCT = 4;
const PROCESSING_BAR_CAP_PCT = 92;

/**
 * All the derived, ticking display state a running-extraction UI needs --
 * overall/per-file progress, ETA, status pills/icons -- shared by every
 * running-step sub-component (ExtractionProgressHeader,
 * ExtractionFileIconStrip, ExtractionCurrentFileCard,
 * ExtractionNoticeBanner) instead of each recomputing it. `job` may be
 * null so a caller can create this composable once even before the first
 * job status has arrived.
 */
export function useExtractionProgressDisplay(
  job: Ref<JobStatusResponse | null>,
) {
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

  const overallPct = computed(() => {
    const j = job.value;
    const pct = j && j.totalFiles > 0 ? (j.completedCount / j.totalFiles) * 100 : 0;
    return Math.max(MIN_OVERALL_PCT, Math.round(pct));
  });

  // The flat ESTIMATED_MS_PER_FILE guess is only ever right by coincidence:
  // real per-file time depends on which model tier got pinned (a rate-
  // limited "Flash" file sleeps far longer between its 3 consensus calls
  // than a "Flash Lite" one), the PDF's length, and whether this job has
  // hit any quota backoff at all. The moment at least one file has actually
  // resolved (done or failed -- completedCount counts both, see main.py),
  // this job's own observed pace already reflects all of that for real,
  // so it replaces the blind guess instead of running alongside it forever.
  const observedMsPerFile = computed(() => {
    const j = job.value;
    if (!j || j.completedCount <= 0) return ESTIMATED_MS_PER_FILE;
    const elapsedMs = nowMs.value - new Date(j.createdAt).getTime();
    return elapsedMs / j.completedCount;
  });

  // Counts down against the current per-file pace (flat guess before
  // anything has finished, this job's own observed average after) instead
  // of an average of files finished so far being applied only to remaining
  // files -- ticks steadily: time left on whichever file is in flight, plus
  // that same pace for every file that hasn't started yet.
  const etaLabel = computed(() => {
    const j = job.value;
    if (!j) return null;
    const remainingFiles = j.totalFiles - j.completedCount;
    if (remainingFiles <= 0) return null;
    const msPerFile = observedMsPerFile.value;
    const processingFile = j.files.find((f) => f.status === "processing");
    let msLeft = remainingFiles * msPerFile;
    if (processingFile?.startedAt) {
      const elapsed = nowMs.value - new Date(processingFile.startedAt).getTime();
      msLeft -= Math.min(elapsed, msPerFile);
      // The subtraction above floors the current file's own contribution at
      // zero once it runs past msPerFile -- as if it were about to finish,
      // even while it's still actively waiting out a Google-announced 429
      // retry. Adding the concrete remaining window back (see
      // pendingRetryDelayMs) is what makes the countdown grow instead of
      // silently sitting there while real time keeps passing -- this was
      // the main source of the estimate always running short during a
      // file stuck retrying.
      msLeft += pendingRetryDelayMs(j.events, processingFile.filename, nowMs.value);
    }
    // A quota/backoff pause (see ExtractionNoticeBanner) is real wall-clock
    // time the per-file pace above has no way to know about in advance --
    // without this, the countdown keeps ticking down through a multi-minute
    // pause as if nothing were happening, then quietly blows past zero.
    // Only covers the pause that's actively showing; it can't predict a
    // later retry pass needing one too (though once that pass's own file
    // resolves, it folds into observedMsPerFile like any other).
    if (j.notice) {
      msLeft += Math.max(0, new Date(j.notice.retryAt).getTime() - nowMs.value);
    }
    return formatDuration(Math.max(0, msLeft));
  });

  // Files process one at a time server-side (see jobs.py), so at most one
  // ever has status "processing" -- that one is the natural focal point.
  // Between files (a retry backoff, or the brief gap right after one
  // finishes and before the next flips to "processing") there's none, so
  // this falls back to the next file waiting its turn, and finally to the
  // last file once the whole batch is done/failed and about to hand off to
  // the ready-to-save screen.
  const currentFile = computed<JobFileStatus | null>(() => {
    const files = job.value?.files ?? [];
    if (files.length === 0) return null;
    return (
      files.find((f) => f.status === "processing") ??
      files.find((f) => f.status === "pending") ??
      files[files.length - 1]
    );
  });

  const nextFile = computed<JobFileStatus | null>(() => {
    const files = job.value?.files ?? [];
    const current = currentFile.value;
    if (!current) return null;
    const currentIdx = files.findIndex((f) => f.id === current.id);
    return files[currentIdx + 1] ?? null;
  });

  const retrySecondsLeft = computed(() => {
    const notice = job.value?.notice;
    if (!notice) return 0;
    return Math.max(
      0,
      Math.round((new Date(notice.retryAt).getTime() - nowMs.value) / 1000),
    );
  });

  // A file genuinely waiting out a backend-announced 429 retry (see
  // pendingRetryDelayMs) is never "overtime" in the misleading sense
  // fileLabelKey uses this for -- it hasn't stalled, it's doing exactly
  // what it's supposed to. Without this check, that pill used to read
  // "Almost done" for as long as the retry lasted, the opposite of what
  // was actually happening.
  const isOvertime = (file: JobFileStatus) => {
    if (file.status !== "processing" || !file.startedAt) return false;
    const overPace = nowMs.value - new Date(file.startedAt).getTime() >= observedMsPerFile.value;
    if (!overPace) return false;
    return pendingRetryDelayMs(job.value?.events ?? [], file.filename, nowMs.value) <= 0;
  };

  // Counts down against the same per-file pace the overall ETA and progress
  // bar use (see fileProgressPct below) -- null once the file runs past
  // that estimate with no active retry to explain it (see isOvertime),
  // since "almostDone" (see fileLabelKey) already covers that state and a
  // "0s left" that never resolves would just look broken. While an
  // announced retry IS running, shows that concrete countdown instead of
  // the pace-based one -- a real number tied to what's actually happening.
  const fileEtaLabel = (file: JobFileStatus): string | null => {
    if (file.status !== "processing" || !file.startedAt) return null;
    const retryMs = pendingRetryDelayMs(job.value?.events ?? [], file.filename, nowMs.value);
    if (retryMs > 0) return formatDuration(retryMs);
    if (isOvertime(file)) return null;
    const elapsed = nowMs.value - new Date(file.startedAt).getTime();
    return formatDuration(Math.max(0, observedMsPerFile.value - elapsed));
  };

  const fileLabelKey = (file: JobFileStatus) => {
    if (file.status === "processing" && isOvertime(file)) return "almostDone";
    // A 'pending' file that already failed once this job is being held for
    // an automatic retry, not just waiting for its turn -- worth saying so.
    if (file.status === "pending" && file.errorReason) return "retrying";
    // Rejected by the pre-extraction domain check (see jobs.py) -- not a
    // technical failure, so it gets its own label instead of "Failed".
    if (file.status === "failed" && file.errorReason === "out_of_domain")
      return "outOfDomain";
    return file.status;
  };

  const pillClass = (file: JobFileStatus) => {
    if (file.status === "failed" && file.errorReason === "out_of_domain")
      return "bg-amber-500/10 text-amber-700";
    switch (file.status) {
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
  // per-call progress), so this fills the bar toward the same per-file pace
  // used for the ETA -- real enough to feel alive, but explicitly capped
  // below 100% while still processing so it never falsely claims the file
  // is done a beat before the server actually says so.
  const fileProgressPct = (file: JobFileStatus) => {
    if (file.status === "done" || file.status === "failed") return 100;
    if (file.status !== "processing" || !file.startedAt) return 0;
    const elapsedMs = nowMs.value - new Date(file.startedAt).getTime();
    const pct = (elapsedMs / observedMsPerFile.value) * PROCESSING_BAR_CAP_PCT;
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

  // The icon strip is the only place all files stay visible at once (the
  // card above shows just the current one) -- one file icon per file,
  // swapped for its status instead of a blinking dot. Bumped up slightly
  // when it's the file currently shown above, a quiet link between the two.
  const fileIcon = (file: JobFileStatus) => {
    if (file.status === "done") return FileCheckCorner;
    // A permanent failure and a "pending" file held for automatic retry (see
    // fileLabelKey's "retrying") both mean the same thing at a glance: this
    // one needs another look.
    if (file.status === "failed" || (file.status === "pending" && file.errorReason))
      return FileExclamationPoint;
    return FileIcon;
  };

  const fileIconClass = (file: JobFileStatus) => {
    const active = currentFile.value?.id === file.id ? " scale-110" : "";
    if (file.status === "failed" && file.errorReason === "out_of_domain")
      return "text-amber-600" + active;
    switch (file.status) {
      case "done":
        return "text-emerald-600" + active;
      case "failed":
        return "text-rose-500" + active;
      case "processing":
        return "text-primary" + active;
      default:
        return (file.errorReason ? "text-amber-600" : "text-secondary/35") + active;
    }
  };

  return {
    nowMs,
    overallPct,
    etaLabel,
    currentFile,
    nextFile,
    retrySecondsLeft,
    isOvertime,
    fileEtaLabel,
    fileLabelKey,
    pillClass,
    fileProgressPct,
    fileBarClass,
    fileIcon,
    fileIconClass,
  };
}
