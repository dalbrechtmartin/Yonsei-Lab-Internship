import { ref } from "vue";

/**
 * Module-scoped (not per-component instance) so a file handed off from the
 * Extraction screen's "Visualiser" button survives the client-side route
 * change to /visualization -- a one-shot in-memory relay, not persisted
 * app state.
 */
const pendingFile = ref<File | null>(null);

export function setIncomingVisualizationFile(file: File): void {
  pendingFile.value = file;
}

/** Reads and clears the pending file in one step, so a later plain visit to
 * /visualization never accidentally replays a stale handoff. */
export function takeIncomingVisualizationFile(): File | null {
  const file = pendingFile.value;
  pendingFile.value = null;
  return file;
}
