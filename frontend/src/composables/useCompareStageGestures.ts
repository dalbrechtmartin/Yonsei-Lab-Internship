import { ref, type ComputedRef, type Ref } from "vue";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import {
  COL_GAP,
  COL_WIDTH,
  STAMP_COLORS,
  type CompareAnnotation,
  type ComparePlan,
  type CompareRowBand,
  type StampKind,
} from "@/utils/compareExport";

type Point = { x: number; y: number };
type PreviewShape = {
  type: "frame" | "arrow" | "underline";
  start: Point;
  end: Point;
} | null;

/**
 * CompareDialog's Konva stage-level pointer plumbing -- pen/frame/arrow/
 * postit/stamp/eraser/highlight all start from a stage "mousedown" (drawing
 * a NEW thing), unlike Pointer's per-shape drag/click (moving/selecting an
 * EXISTING one, handled directly in the dialog next to the rest of its
 * annotation-mutation logic, since that also touches undo history and
 * selection). Also owns the in-progress-gesture state (pen stroke,
 * frame/arrow/underline drag preview, highlight/postit hover, eraser
 * cursor) -- the dialog's own preview Konva configs read these straight out
 * of this composable's return.
 */
export function useCompareStageGestures(deps: {
  plan: ComputedRef<ComparePlan | null>;
  activeTool: Ref<string>;
  activeColor: Ref<string>;
  activeStampKind: Ref<StampKind>;
  annotations: Ref<CompareAnnotation[]>;
  highlightedKeys: Ref<Map<string, string>>;
  selectedAnnotationId: Ref<string | null>;
  selectedBounds: Ref<{ x: number; y: number; width: number; height: number } | null>;
  // Truthiness-checked only (a postit draft is in progress or it isn't) --
  // the draft's own shape stays owned by the dialog alongside the rest of
  // its postit-editing state.
  editingPostit: Ref<unknown>;
  commitPostitInternal: (selectAfter: boolean) => void;
  beginPostitDraft: (pinRef: string, bandKey: string | null, xPct: number, yPct: number) => void;
  getStage: () => Konva.Stage | undefined;
  bandAt: (y: number) => CompareRowBand | null;
  nearestBand: (y: number) => CompareRowBand | null;
  pinRefAt: (x: number) => string | null;
  pinIndexAt: (x: number) => number;
  toBandPct: (
    pinRef: string,
    pt: Point,
  ) => { xPct: number; yPct: number; bandKey: string | null } | null;
  pushHistory: () => void;
  nextAnnotationId: () => string;
  selectNewlyPlaced: (id: string) => void;
}) {
  const {
    plan,
    activeTool,
    activeColor,
    activeStampKind,
    annotations,
    highlightedKeys,
    selectedAnnotationId,
    selectedBounds,
    editingPostit,
    commitPostitInternal,
    beginPostitDraft,
    getStage,
    bandAt,
    nearestBand,
    pinRefAt,
    pinIndexAt,
    toBandPct,
    pushHistory,
    nextAnnotationId,
    selectNewlyPlaced,
  } = deps;

  function stagePointerPos(e: KonvaEventObject<MouseEvent>): Point | null {
    const stage = e.target.getStage();
    return stage ? stage.getPointerPosition() : null;
  }

  // -- Eraser: drag across shapes to delete every one the pointer touches in
  // one gesture, using Konva's own hit-graph (stage.getIntersection) rather
  // than re-deriving hit areas by hand -- more accurate than the old manual
  // math, and it's what made "just click through everything you don't want"
  // finally faster than reset-everything or undo-repeatedly.
  const erasedThisGesture = new Set<string>();
  let eraserGestureStarted = false;
  let isErasing = false;
  const eraserCursorPt = ref<Point | null>(null);
  function eraseAt(pos: Point) {
    const stage = getStage();

    if (stage) {
      let node: Konva.Node | null = stage.getIntersection(pos);
      while (node && !node.id() && node !== stage) node = node.getParent();
      const id = node?.id();
      if (id && !erasedThisGesture.has(id)) {
        if (!eraserGestureStarted) {
          pushHistory();
          eraserGestureStarted = true;
        }
        erasedThisGesture.add(id);
        annotations.value = annotations.value.filter((a) => a.id !== id);
        if (selectedAnnotationId.value === id) {
          selectedAnnotationId.value = null;
          selectedBounds.value = null;
        }
      }
    }

    // Row highlights live on the static content canvas, not as Konva shapes
    // (see highlightedKeys/renderContent), so the eraser needs its own,
    // separate check here to reach them -- without this, dragging the eraser
    // straight through a highlighted row did nothing, since there was no
    // Konva node there for stage.getIntersection to find.
    const band = bandAt(pos.y);
    const gestureKey = band ? `highlight:${band.key}` : null;
    if (
      band &&
      gestureKey &&
      highlightedKeys.value.has(band.key) &&
      !erasedThisGesture.has(gestureKey)
    ) {
      if (!eraserGestureStarted) {
        pushHistory();
        eraserGestureStarted = true;
      }
      erasedThisGesture.add(gestureKey);
      const next = new Map(highlightedKeys.value);
      next.delete(band.key);
      highlightedKeys.value = next;
    }
  }

  // -- In-progress drawing previews (pen stroke, frame/arrow drag, highlight
  // hover, postit ghost) -- plain refs the dialog's own preview Konva
  // configs read straight from this composable's return, replacing the old
  // manual per-frame canvas redraw.
  const hoverBand = ref<CompareRowBand | null>(null);
  const activePenPoints = ref<Point[] | null>(null);
  let dragStart: Point | null = null;
  const previewShape = ref<PreviewShape>(null);
  const hoverPostitPt = ref<Point | null>(null);

  function onStageMouseDown(e: KonvaEventObject<MouseEvent>) {
    e.evt.preventDefault();
    // A postit still being written gets saved (or discarded if left blank) the
    // moment you click anywhere else, no matter what that click was for --
    // this is what actually fixes "clicking elsewhere emptied what I wrote":
    // previously a fresh click while the postit tool was still active
    // overwrote the in-progress note with a new blank one before it ever had a
    // chance to save.
    if (editingPostit.value) {
      commitPostitInternal(false);
      return;
    }
    if (activeTool.value === "pan") return;
    const pos = stagePointerPos(e);
    if (!pos) return;

    if (activeTool.value === "eraser") {
      erasedThisGesture.clear();
      eraserGestureStarted = false;
      isErasing = true;
      eraserCursorPt.value = pos;
      eraseAt(pos);
      return;
    }
    if (activeTool.value === "pen") {
      activePenPoints.value = [pos];
      return;
    }
    if (
      activeTool.value === "frame" ||
      activeTool.value === "arrow" ||
      activeTool.value === "underline"
    ) {
      dragStart = pos;
      previewShape.value = { type: activeTool.value, start: pos, end: pos };
      return;
    }
    if (activeTool.value === "postit") {
      const pinRef = pinRefAt(pos.x);
      const pct = pinRef ? toBandPct(pinRef, pos) : null;
      if (!pinRef || !pct) return;
      beginPostitDraft(pinRef, pct.bandKey, pct.xPct, pct.yPct);
      return;
    }
    if (activeTool.value === "stamp") {
      const pinRef = pinRefAt(pos.x);
      const pct = pinRef ? toBandPct(pinRef, pos) : null;
      if (!pinRef || !pct) return;
      const id = nextAnnotationId();
      pushHistory();
      annotations.value = [
        ...annotations.value,
        {
          id,
          type: "stamp",
          pinRef,
          bandKey: pct.bandKey,
          kind: activeStampKind.value,
          color: STAMP_COLORS[activeStampKind.value],
          xPct: pct.xPct,
          yPct: pct.yPct,
        },
      ];
      selectNewlyPlaced(id);
    }
  }

  function onStageMouseMove(e: KonvaEventObject<MouseEvent>) {
    const pos = stagePointerPos(e);
    if (!pos) return;

    if (activeTool.value === "eraser") {
      eraserCursorPt.value = pos;
      if (isErasing) eraseAt(pos);
      return;
    }
    if (activeTool.value === "highlight") {
      hoverBand.value = bandAt(pos.y);
      return;
    }
    if (activeTool.value === "postit") {
      hoverPostitPt.value = pos;
      return;
    }
    if (activeTool.value === "pen" && activePenPoints.value) {
      activePenPoints.value = [...activePenPoints.value, pos];
      return;
    }
    if (activeTool.value === "underline" && dragStart) {
      // Y locked to the drag's start -- an underline is always horizontal,
      // never a diagonal like the arrow it otherwise shares its drag gesture
      // with (see previewUnderlineConfig).
      previewShape.value = {
        type: "underline",
        start: dragStart,
        end: { x: pos.x, y: dragStart.y },
      };
      return;
    }
    if (
      (activeTool.value === "frame" || activeTool.value === "arrow") &&
      dragStart
    ) {
      previewShape.value = { type: activeTool.value, start: dragStart, end: pos };
    }
  }

  function onStageMouseUp() {
    isErasing = false;
    if (activeTool.value === "pen" && activePenPoints.value) {
      const points = activePenPoints.value;
      activePenPoints.value = null;
      // A plain click (no drag -- points never grew past the initial
      // mousedown position) used to still commit a zero-length, invisible
      // stroke that then forced a switch to the Pointer tool for nothing
      // visible to select -- the "bug" reported when just tapping a point.
      // Requiring a real drag fixes that. Pen also deliberately does NOT call
      // selectNewlyPlaced like every other tool: drawing is often a sequence
      // of several strokes in a row, and forcing a switch to Pointer after
      // each one meant re-arming the Pen tool by hand before every next mark.
      if (points.length > 1) {
        const id = nextAnnotationId();
        pushHistory();
        annotations.value = [
          ...annotations.value,
          { id, type: "pen", color: activeColor.value, points },
        ];
      }
      return;
    }
    if (
      (activeTool.value === "frame" ||
        activeTool.value === "arrow" ||
        activeTool.value === "underline") &&
      dragStart &&
      previewShape.value &&
      plan.value
    ) {
      const { start, end } = previewShape.value;
      const pinRef = pinRefAt((start.x + end.x) / 2);
      const idx = pinIndexAt((start.x + end.x) / 2);
      const colX = idx * (COL_WIDTH + COL_GAP);
      // ONE shared band for both endpoints (based on the drag's midpoint) --
      // keeps the shape's own geometry internally consistent even if start/end
      // technically sit in different bands (e.g. a frame drawn slightly across
      // a row boundary).
      const band = nearestBand((start.y + end.y) / 2);
      const bandY = band ? band.y : 0;
      const bandH = band ? band.height : plan.value.height;
      const startPct = {
        xPct: (start.x - colX) / COL_WIDTH,
        yPct: (start.y - bandY) / bandH,
      };
      const endPct = {
        xPct: (end.x - colX) / COL_WIDTH,
        yPct: (end.y - bandY) / bandH,
      };
      if (pinRef) {
        const id = nextAnnotationId();
        pushHistory();
        if (previewShape.value.type === "frame") {
          annotations.value = [
            ...annotations.value,
            {
              id,
              type: "frame",
              color: activeColor.value,
              pinRef,
              bandKey: band?.key ?? null,
              xPct: Math.min(startPct.xPct, endPct.xPct),
              yPct: Math.min(startPct.yPct, endPct.yPct),
              wPct: Math.abs(endPct.xPct - startPct.xPct) || 0.1,
              hPct: Math.abs(endPct.yPct - startPct.yPct) || 0.03,
            },
          ];
        } else if (previewShape.value.type === "arrow") {
          annotations.value = [
            ...annotations.value,
            {
              id,
              type: "arrow",
              color: activeColor.value,
              pinRef,
              bandKey: band?.key ?? null,
              x1Pct: startPct.xPct,
              y1Pct: startPct.yPct,
              x2Pct: endPct.xPct,
              y2Pct: endPct.yPct,
            },
          ];
        } else {
          // A plain click (no real drag) still gets a visible, usable
          // underline instead of a zero-length, invisible one -- same "give a
          // degenerate gesture a sane minimum size" idea as the frame's own
          // `|| 0.1` above.
          const x1Pct = Math.min(startPct.xPct, endPct.xPct);
          const x2Pct =
            Math.abs(endPct.xPct - startPct.xPct) < 0.02
              ? x1Pct + 0.12
              : Math.max(startPct.xPct, endPct.xPct);
          annotations.value = [
            ...annotations.value,
            {
              id,
              type: "underline",
              color: activeColor.value,
              pinRef,
              bandKey: band?.key ?? null,
              x1Pct,
              x2Pct,
              yPct: startPct.yPct,
            },
          ];
        }
        selectNewlyPlaced(id);
      }
      dragStart = null;
      previewShape.value = null;
    }
  }

  function onStageMouseLeave() {
    onStageMouseUp();
    eraserCursorPt.value = null;
    activePenPoints.value = null;
    dragStart = null;
    previewShape.value = null;
    hoverBand.value = null;
    hoverPostitPt.value = null;
  }

  function onStageClick(e: KonvaEventObject<MouseEvent>) {
    const stage = e.target.getStage();
    if (activeTool.value === "pointer") {
      if (e.target === stage) {
        selectedAnnotationId.value = null;
        selectedBounds.value = null;
      }
      return;
    }
    if (activeTool.value !== "highlight") return;
    const pos = stagePointerPos(e);
    const band = pos ? bandAt(pos.y) : null;
    if (!band) return;
    pushHistory();
    const next = new Map(highlightedKeys.value);
    const current = next.get(band.key);
    // Not highlighted yet -> highlight it in the active color. Already
    // highlighted in a DIFFERENT color -> recolor it (lets you fix a color
    // without erasing + redrawing first). Already highlighted in the SAME
    // color you've got selected -> toggle it off, same as before.
    if (current === undefined || current !== activeColor.value)
      next.set(band.key, activeColor.value);
    else next.delete(band.key);
    highlightedKeys.value = next;
  }

  /** Called from the dialog's `open` watcher -- a fresh session each time it
   * reopens. Mirrors exactly what that watcher reset inline before this was
   * extracted (hover/eraser cursors are deliberately left alone, same as
   * before). */
  function reset() {
    activePenPoints.value = null;
    dragStart = null;
    previewShape.value = null;
  }

  return {
    hoverBand,
    activePenPoints,
    previewShape,
    hoverPostitPt,
    eraserCursorPt,
    onStageMouseDown,
    onStageMouseMove,
    onStageMouseUp,
    onStageMouseLeave,
    onStageClick,
    reset,
  };
}
