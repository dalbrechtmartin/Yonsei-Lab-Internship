import { ref, type Ref } from "vue";
import type { CompareAnnotation } from "@/utils/compareExport";

type HistorySnapshot = {
  annotations: CompareAnnotation[];
  highlightedKeys: [string, string][];
};

/**
 * Undo/redo for CompareDialog's annotations -- plain (non-reactive)
 * snapshot stacks of the whole annotation state, pushed before every
 * mutating action. Simple and always correct (no command objects to keep
 * in sync) since the object count here is always small.
 */
export function useCompareHistory(deps: {
  annotations: Ref<CompareAnnotation[]>;
  highlightedKeys: Ref<Map<string, string>>;
  selectedAnnotationId: Ref<string | null>;
  selectedBounds: Ref<{ x: number; y: number; width: number; height: number } | null>;
}) {
  const { annotations, highlightedKeys, selectedAnnotationId, selectedBounds } = deps;

  let undoStack: HistorySnapshot[] = [];
  let redoStack: HistorySnapshot[] = [];
  const HISTORY_LIMIT = 50;
  const canUndo = ref(false);
  const canRedo = ref(false);

  function snapshot(): HistorySnapshot {
    return {
      annotations: JSON.parse(JSON.stringify(annotations.value)),
      highlightedKeys: [...highlightedKeys.value],
    };
  }
  function pushHistory() {
    undoStack.push(snapshot());
    if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
    redoStack = [];
    canUndo.value = true;
    canRedo.value = false;
  }
  function restore(snap: HistorySnapshot) {
    annotations.value = snap.annotations;
    highlightedKeys.value = new Map(snap.highlightedKeys);
    selectedAnnotationId.value = null;
    selectedBounds.value = null;
  }
  function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(snapshot());
    restore(undoStack.pop()!);
    canUndo.value = undoStack.length > 0;
    canRedo.value = true;
  }
  function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(snapshot());
    restore(redoStack.pop()!);
    canRedo.value = redoStack.length > 0;
    canUndo.value = true;
  }
  /** Called from the dialog's `open` watcher -- a fresh session each time
   * it reopens. */
  function reset() {
    undoStack = [];
    redoStack = [];
    canUndo.value = false;
    canRedo.value = false;
  }

  return { canUndo, canRedo, pushHistory, undo, redo, reset };
}
