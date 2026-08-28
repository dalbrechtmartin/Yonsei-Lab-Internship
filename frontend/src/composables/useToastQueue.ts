import { onUnmounted, reactive, readonly, ref } from "vue";

const TOAST_VISIBLE_MS = 5000;

export interface ToastEntry {
  id: number;
  key: string;
  className: string;
  /** Countdown ring duration in ms. 0 hides the ring (persistent status). */
  ringDurationMs: number;
  /** Bumped on every in-place update so the ring restarts even if the key/class repeat. */
  token: number;
}

let nextId = 1;
// Module-level (not per-call) so every view shares the same stack -- pushing
// from ExtractionView and VisualizationView both land in the one queue the
// app-wide ToastStack renders. Removal (both auto-dismiss and manual close)
// just splices the array; ToastStack's <TransitionGroup> owns the fade-out.
const toasts = reactive<ToastEntry[]>([]);
const hideTimers = new Map<number, number>();

function clearHideTimer(id: number) {
  const timer = hideTimers.get(id);
  if (timer !== undefined) {
    window.clearTimeout(timer);
    hideTimers.delete(id);
  }
}

function removeToast(id: number) {
  clearHideTimer(id);
  const index = toasts.findIndex((toast) => toast.id === id);
  if (index !== -1) toasts.splice(index, 1);
}

function scheduleAutoDismiss(id: number) {
  clearHideTimer(id);
  hideTimers.set(
    id,
    window.setTimeout(() => removeToast(id), TOAST_VISIBLE_MS),
  );
}

/**
 * Pushes/updates entries in the shared toast queue rendered by ToastStack.
 * Each call site keeps its own `activeId`: consecutive setStatus calls (e.g.
 * "uploading" -> "converting") update the same toast in place -- one
 * evolving message for a single operation, not a new card per step. The
 * status that finally lands via setTransientStatus closes that chain, so an
 * unrelated call afterwards starts a fresh, independently-queued toast
 * instead of overwriting it.
 */
export function useToastQueue() {
  const activeId = ref<number | null>(null);

  const activeEntry = () =>
    activeId.value !== null ? toasts.find((t) => t.id === activeId.value) : undefined;

  function setStatus(key: string, className: string) {
    const existing = activeEntry();
    if (existing) {
      clearHideTimer(existing.id);
      existing.key = key;
      existing.className = className;
      existing.ringDurationMs = 0;
      existing.token += 1;
      return;
    }
    const id = nextId++;
    toasts.unshift({ id, key, className, ringDurationMs: 0, token: 0 });
    activeId.value = id;
  }

  function setTransientStatus(key: string, className: string) {
    const existing = activeEntry();
    const id = existing ? existing.id : nextId++;
    if (existing) {
      existing.key = key;
      existing.className = className;
      existing.ringDurationMs = TOAST_VISIBLE_MS;
      existing.token += 1;
    } else {
      toasts.unshift({ id, key, className, ringDurationMs: TOAST_VISIBLE_MS, token: 0 });
    }
    // This operation is done -- the next setStatus/setTransientStatus call
    // from this instance starts a new toast rather than reusing this one.
    activeId.value = null;
    scheduleAutoDismiss(id);
  }

  function clearStatus() {
    const existing = activeEntry();
    if (existing) removeToast(existing.id);
    activeId.value = null;
  }

  onUnmounted(() => {
    activeId.value = null;
  });

  return { setStatus, setTransientStatus, clearStatus };
}

export function useToastStack() {
  return { toasts: readonly(toasts), dismissToast: removeToast };
}
