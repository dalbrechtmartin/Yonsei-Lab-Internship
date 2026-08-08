import { computed, nextTick, ref, type ComputedRef, type Ref } from "vue";
import type { ComparePlan } from "@/utils/compareExport";

export const MIN_ZOOM = 0.25;
export const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

/**
 * CompareDialog's zoom (auto-fits to the preview wrapper's width unless the
 * user has manually zoomed this session) and pan (drags the scroll
 * container directly, not a Konva stage position -- see the dialog's own
 * comment on why) -- plus the floating tool rail's vertical/horizontal
 * orientation switch, which lives here purely because it's driven by the
 * same preview-area ResizeObserver.
 *
 * `init()`/`dispose()` mirror exactly what the dialog's `open` watcher and
 * `onUnmounted` did before extraction: only listen/observe while the dialog
 * is actually open, torn down the moment it closes or unmounts.
 */
export function useCompareZoomPan(deps: {
  plan: ComputedRef<ComparePlan | null>;
  isPanActive: () => boolean;
  previewWrapperEl: Ref<HTMLElement | null>;
  previewAreaEl: Ref<HTMLElement | null>;
  railProbeEl: Ref<HTMLElement | null>;
}) {
  const { plan, isPanActive, previewWrapperEl, previewAreaEl, railProbeEl } = deps;

  const zoom = ref(1);
  const userAdjustedZoom = ref(false);
  const zoomPercent = computed(() => Math.round(zoom.value * 100));
  const railHorizontal = ref(false);

  function computeFitZoom(): number {
    const wrapper = previewWrapperEl.value;
    const p = plan.value;
    if (!wrapper || !p) return 1;
    const availableW = wrapper.clientWidth - 20;
    if (availableW <= 0) return 1;
    return Math.min(1, availableW / p.width);
  }
  function autoFit() {
    if (userAdjustedZoom.value) return;
    zoom.value = Math.max(MIN_ZOOM, computeFitZoom());
  }
  function clampZoom(z: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));
  }
  function zoomIn() {
    userAdjustedZoom.value = true;
    zoom.value = clampZoom(zoom.value + ZOOM_STEP);
  }
  function zoomOut() {
    userAdjustedZoom.value = true;
    zoom.value = clampZoom(zoom.value - ZOOM_STEP);
  }
  function resetZoomToFit() {
    userAdjustedZoom.value = false;
    autoFit();
  }
  function onWheel(e: WheelEvent) {
    if (!e.ctrlKey) return;
    e.preventDefault();
    userAdjustedZoom.value = true;
    zoom.value = clampZoom(zoom.value * (e.deltaY < 0 ? 1.08 : 1 / 1.08));
  }

  // Compares the probe's natural (always-vertical, MINIMUM-footprint) height
  // against the preview area's real available height to decide whether the
  // visible rail should be vertical or horizontal -- see the template
  // comments on both.
  function updateRailOrientation() {
    const probe = railProbeEl.value;
    const area = previewAreaEl.value;
    if (!probe || !area) return;
    // 16px: the rail's own top-3 offset (12px) plus a few px of breathing
    // room at the bottom edge -- NOT doubled.
    const available = area.clientHeight - 16;
    railHorizontal.value = probe.scrollHeight > available;
  }
  function onWindowResize() {
    autoFit();
    updateRailOrientation();
  }

  let railResizeObserver: ResizeObserver | null = null;

  // -- Pan tool + Space-hold-to-pan --
  const isSpacePanning = ref(false);
  const isPanningNow = ref(false);
  let panDrag: {
    startX: number;
    startY: number;
    scrollLeft: number;
    scrollTop: number;
  } | null = null;

  function onWrapperPointerDown(e: PointerEvent) {
    if (!isPanActive() && !isSpacePanning.value) return;
    const wrapper = previewWrapperEl.value;
    if (!wrapper) return;
    e.preventDefault();
    isPanningNow.value = true;
    panDrag = {
      startX: e.clientX,
      startY: e.clientY,
      scrollLeft: wrapper.scrollLeft,
      scrollTop: wrapper.scrollTop,
    };
    wrapper.setPointerCapture(e.pointerId);
  }
  function onWrapperPointerMove(e: PointerEvent) {
    if (!panDrag) return;
    const wrapper = previewWrapperEl.value;
    if (!wrapper) return;
    wrapper.scrollLeft = panDrag.scrollLeft - (e.clientX - panDrag.startX);
    wrapper.scrollTop = panDrag.scrollTop - (e.clientY - panDrag.startY);
  }
  function onWrapperPointerUp() {
    panDrag = null;
    isPanningNow.value = false;
  }

  /** Called from the dialog's `open` watcher on the way IN. */
  function init() {
    window.addEventListener("resize", onWindowResize);
    railHorizontal.value = false;
    nextTick(() => {
      if (!previewAreaEl.value) return;
      railResizeObserver = new ResizeObserver(() => updateRailOrientation());
      railResizeObserver.observe(previewAreaEl.value);
      updateRailOrientation();
    });
    isSpacePanning.value = false;
    isPanningNow.value = false;
    userAdjustedZoom.value = false;
    zoom.value = 1;
    nextTick(() => {
      autoFit();
    });
  }
  /** Called from the dialog's `open` watcher on the way OUT, and from
   * `onUnmounted` in case the dialog unmounts while still open. */
  function dispose() {
    window.removeEventListener("resize", onWindowResize);
    railResizeObserver?.disconnect();
    railResizeObserver = null;
  }

  return {
    zoom,
    zoomPercent,
    userAdjustedZoom,
    railHorizontal,
    isSpacePanning,
    isPanningNow,
    zoomIn,
    zoomOut,
    resetZoomToFit,
    onWheel,
    onWrapperPointerDown,
    onWrapperPointerMove,
    onWrapperPointerUp,
    autoFit,
    init,
    dispose,
  };
}
