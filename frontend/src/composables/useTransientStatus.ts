import { computed, onUnmounted, ref } from "vue";

const STATUS_FADE_MS = 250;

/**
 * Drives a dismissible status message: a persistent state (e.g. "uploading…")
 * that stays until explicitly replaced, and a transient state (success/error)
 * that auto-dismisses after `visibleMs`. `ringDurationMs` is only non-zero
 * for the transient state, so consumers know when to show a countdown ring.
 */
export function useTransientStatus(visibleMs = 30000) {
  const statusKey = ref("");
  const statusClass = ref("");
  const statusExiting = ref(false);
  const statusToken = ref(0);
  const ringDurationMs = ref(0);
  const statusTimeout = ref<number | null>(null);
  const statusClearTimeout = ref<number | null>(null);

  const clearStatusTimeout = () => {
    if (statusTimeout.value !== null) {
      window.clearTimeout(statusTimeout.value);
      statusTimeout.value = null;
    }
    if (statusClearTimeout.value !== null) {
      window.clearTimeout(statusClearTimeout.value);
      statusClearTimeout.value = null;
    }
  };

  const setStatus = (key: string, className: string) => {
    clearStatusTimeout();
    statusExiting.value = false;
    statusKey.value = key;
    statusClass.value = className;
    ringDurationMs.value = 0;
    statusToken.value += 1;
  };

  const dismissStatus = () => {
    if (!statusKey.value || statusExiting.value) {
      return;
    }

    clearStatusTimeout();
    statusExiting.value = true;
    statusClearTimeout.value = window.setTimeout(() => {
      statusKey.value = "";
      statusClass.value = "";
      statusExiting.value = false;
      ringDurationMs.value = 0;
      statusClearTimeout.value = null;
    }, STATUS_FADE_MS);
  };

  const setTransientStatus = (key: string, className: string) => {
    clearStatusTimeout();
    statusExiting.value = false;
    statusKey.value = key;
    statusClass.value = className;
    ringDurationMs.value = visibleMs;
    statusToken.value += 1;
    statusTimeout.value = window.setTimeout(() => {
      dismissStatus();
    }, visibleMs);
  };

  const clearStatus = () => {
    clearStatusTimeout();
    statusKey.value = "";
    statusClass.value = "";
    statusExiting.value = false;
    ringDurationMs.value = 0;
  };

  const statusStyle = computed(() => ({
    opacity: statusExiting.value ? 0 : 1,
    transform: statusExiting.value ? "translateY(-4px)" : "translateY(0)",
  }));

  onUnmounted(() => {
    clearStatusTimeout();
  });

  return {
    statusKey,
    statusClass,
    statusStyle,
    statusToken,
    ringDurationMs,
    setStatus,
    setTransientStatus,
    dismissStatus,
    clearStatus,
  };
}
