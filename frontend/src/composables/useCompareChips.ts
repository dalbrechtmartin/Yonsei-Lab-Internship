import { ref, type ComputedRef, type Ref } from "vue";
import { parseMetricNumber, type ComparePinData } from "@/utils/compareExport";
import type { AnnotationCardData } from "@/utils/annotationCardData";

type OrderedPin = AnnotationCardData & { id: string };

// -- Sort: each option is a one-shot re-sort of `order`, not a locked mode,
// so a manual drag afterward always still works.
export type SortMode = "selection" | "ref" | "metric-asc" | "metric-desc";

/**
 * CompareDialog's chip row: native HTML5 drag-and-drop reordering (same
 * pattern as LayerStructureField.vue's layer rows), add/remove, and the
 * one-shot sort presets. All state changes funnel through `order` (the
 * dialog's own `order` v-model, shared two-way with AnnotationsPanel).
 */
export function useCompareChips(deps: {
  order: Ref<string[]>;
  orderedPins: ComputedRef<OrderedPin[]>;
  comparePins: ComputedRef<ComparePinData[]>;
  bestWorstKeys: Ref<string[]>;
  compareMax: number;
}) {
  const { order, orderedPins, comparePins, bestWorstKeys, compareMax } = deps;

  const dragIndex = ref<number | null>(null);
  const dragOverIndex = ref<number | null>(null);
  function onChipDragStart(index: number, ev: DragEvent) {
    dragIndex.value = index;
    if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move";
  }
  function onChipDragOver(index: number, ev: DragEvent) {
    ev.preventDefault();
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
    dragOverIndex.value = index;
  }
  function onChipDrop(index: number, ev: DragEvent) {
    ev.preventDefault();
    const from = dragIndex.value;
    dragIndex.value = null;
    dragOverIndex.value = null;
    if (from === null || from === index) return;
    const next = [...order.value];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    order.value = next;
  }
  function moveChip(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= order.value.length) return;
    const next = [...order.value];
    [next[index], next[target]] = [next[target], next[index]];
    order.value = next;
  }
  function removeChip(id: string) {
    order.value = order.value.filter((existing) => existing !== id);
  }

  const addPointOpen = ref(false);
  function addPoint(id: string) {
    if (order.value.length >= compareMax) return;
    order.value = [...order.value, id];
    addPointOpen.value = false;
  }

  const sortMode = ref<SortMode>("selection");
  function metricValueForId(id: string, key: string): number | null {
    const ref = orderedPins.value.find((p) => p.id === id)?.ref;
    const pinData = ref ? comparePins.value.find((p) => p.ref === ref) : undefined;
    if (!pinData) return null;
    for (const section of pinData.sections) {
      const row = section.rows?.find((r) => r.key === key);
      if (row) return parseMetricNumber(row.value);
    }
    return null;
  }
  function applySort(mode: SortMode) {
    sortMode.value = mode;
    if (mode === "selection") return;
    const next = [...order.value];
    if (mode === "ref") {
      next.sort((a, b) => {
        const refA = orderedPins.value.find((p) => p.id === a)?.ref ?? "";
        const refB = orderedPins.value.find((p) => p.id === b)?.ref ?? "";
        return refA.localeCompare(refB, undefined, { numeric: true });
      });
    } else if (bestWorstKeys.value.length > 0) {
      const dir = mode === "metric-asc" ? 1 : -1;
      // Several metrics can be active at once (see bestWorstKeys) -- sorting
      // needs exactly one, so this uses whichever was toggled on first.
      const key = bestWorstKeys.value[0];
      next.sort((a, b) => {
        const va = metricValueForId(a, key);
        const vb = metricValueForId(b, key);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return (va - vb) * dir;
      });
    }
    order.value = next;
  }

  return {
    dragIndex,
    dragOverIndex,
    onChipDragStart,
    onChipDragOver,
    onChipDrop,
    moveChip,
    removeChip,
    addPointOpen,
    addPoint,
    sortMode,
    applySort,
  };
}
