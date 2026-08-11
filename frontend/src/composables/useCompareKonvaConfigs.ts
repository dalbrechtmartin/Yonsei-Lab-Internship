import type { ComputedRef, Ref } from "vue";
import {
  COL_GAP,
  COL_WIDTH,
  PEN_WIDTH,
  POSTIT_LINE_H,
  STAMP_COLORS,
  STAMP_R,
  TITLE_H,
  pickTextColor,
  postitHeight,
  resolveAnchor,
  stampCenter,
  type ArrowAnnotation,
  type ComparePinData,
  type ComparePlan,
  type CompareRowBand,
  type FrameAnnotation,
  type PenAnnotation,
  type PostitAnnotation,
  type StampAnnotation,
  type UnderlineAnnotation,
} from "@/utils/compareExport";

export const COLUMN_SWAP_SIZE = 20;
const POSTIT_MIN_WIDTH = 80;
const POSTIT_MAX_WIDTH = 320;
const POSTIT_MAX_HEIGHT = 400;

// Hand-drawn glyphs (star/check/cross), local to their stamp group's origin
// -- same relative offsets compareExport.ts's own drawStampShape uses,
// translated from cx/cy-relative canvas calls to group-local Konva shapes.
export const STAMP_GLYPH_STAR = {
  numPoints: 5,
  innerRadius: 2.5,
  outerRadius: 5.5,
  fill: "#ffffff",
};
export const STAMP_GLYPH_CHECK = {
  points: [-5, 0, -1.5, 4, 5.5, -4.5],
  stroke: "#ffffff",
  strokeWidth: 2,
  lineCap: "round",
  lineJoin: "round",
};
export const STAMP_GLYPH_CROSS_1 = {
  points: [-4.5, -4.5, 4.5, 4.5],
  stroke: "#ffffff",
  strokeWidth: 2,
  lineCap: "round",
};
export const STAMP_GLYPH_CROSS_2 = {
  points: [4.5, -4.5, -4.5, 4.5],
  stroke: "#ffffff",
  strokeWidth: 2,
  lineCap: "round",
};

/**
 * Konva node configs -- one builder per annotation type, each reading the
 * same pinRef+percentage anchor compareExport.ts's own draw functions use
 * (via resolveAnchor/stampCenter), so the interactive Konva shapes can never
 * disagree with the static PNG export (which still draws with plain canvas
 * 2D via drawCompareAnnotations). Draggable only under the Pointer tool (and
 * never while Space-panning) so a drag gesture never fights whatever tool
 * is actually active. Plus the row/column anchor-math helpers both these
 * builders AND the dialog's own drag/gesture handlers need.
 *
 * Pure given its inputs -- every dependency here is read-only (the dialog
 * owns and mutates `hoveredColumnIndex`/`draggingColumnIndex` itself; this
 * composable only reads them). See CompareDialog.vue for the drag/transform
 * handlers that mutate annotations, which stay in the component since they
 * also touch undo history and selection state.
 */
export function useCompareKonvaConfigs(deps: {
  plan: ComputedRef<ComparePlan | null>;
  comparePins: ComputedRef<ComparePinData[]>;
  isDraggableNow: ComputedRef<boolean>;
  activeTool: Ref<string>;
  hoveredColumnIndex: Ref<number | null>;
  draggingColumnIndex: Ref<number | null>;
  measureCtx: CanvasRenderingContext2D;
}) {
  const { plan, comparePins, isDraggableNow, activeTool, hoveredColumnIndex, draggingColumnIndex, measureCtx } =
    deps;

  function bandAt(y: number): CompareRowBand | null {
    const p = plan.value;
    if (!p) return null;
    return p.rowBands.find((b) => y >= b.y - 3 && y <= b.y + b.height + 3) ?? null;
  }

  // Same idea as bandAt, but never comes back empty-handed (as long as SOME
  // row exists) -- it snaps to the closest band instead of requiring an
  // exact hit, so a click on a section's title bar or in the small gap
  // between two boxes still gets a stable row to anchor to. This is what
  // lets frame/arrow/postit/stamp stay glued to their row instead of
  // drifting when some OTHER section is toggled on/off.
  function nearestBand(y: number): CompareRowBand | null {
    const p = plan.value;
    if (!p || p.rowBands.length === 0) return null;
    const containing = bandAt(y);
    if (containing) return containing;
    let best = p.rowBands[0];
    let bestDist = Infinity;
    for (const b of p.rowBands) {
      const dist = y < b.y ? b.y - y : y > b.y + b.height ? y - (b.y + b.height) : 0;
      if (dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }
    return best;
  }

  function pinRefAt(x: number): string | null {
    if (comparePins.value.length === 0) return null;
    const idx = Math.max(
      0,
      Math.min(comparePins.value.length - 1, Math.floor(x / (COL_WIDTH + COL_GAP))),
    );
    return comparePins.value[idx]?.ref ?? null;
  }
  function pinIndexAt(x: number): number {
    return Math.max(
      0,
      Math.min(comparePins.value.length - 1, Math.floor(x / (COL_WIDTH + COL_GAP))),
    );
  }
  /** Percentage position for a NEW annotation, expressed relative to the
   * nearest row band (not the whole column -- see nearestBand above). */
  function toBandPct(
    pinRef: string,
    pt: { x: number; y: number },
  ): { xPct: number; yPct: number; bandKey: string | null } | null {
    const idx = comparePins.value.findIndex((p) => p.ref === pinRef);
    if (idx === -1 || !plan.value) return null;
    const colX = idx * (COL_WIDTH + COL_GAP);
    const xPct = (pt.x - colX) / COL_WIDTH;
    const band = nearestBand(pt.y);
    if (band) return { xPct, yPct: (pt.y - band.y) / band.height, bandKey: band.key };
    return { xPct, yPct: pt.y / plan.value.height, bandKey: null };
  }

  function penConfig(a: PenAnnotation) {
    return {
      id: a.id,
      points: a.points.flatMap((p) => [p.x, p.y]),
      stroke: a.color,
      strokeWidth: PEN_WIDTH,
      opacity: 0.55,
      lineCap: "round",
      lineJoin: "round",
      hitStrokeWidth: PEN_WIDTH + 8,
      draggable: isDraggableNow.value,
      x: 0,
      y: 0,
    };
  }
  // Every config builder below always returns the SAME set of keys, whether
  // or not its anchor actually resolves -- toggling `visible`/`listening`
  // instead of ever swapping to a bare `{ visible: false }` shape. Reason:
  // vue-konva tracks its own "last applied config" snapshot via a plain
  // Object.assign MERGE, which never clears keys that later disappear from
  // that snapshot. So a config that OMITS x/y/draggable one render (e.g.
  // while a section is toggled off) and brings them back the next finds
  // vue-konva comparing the new x/y against its still-stale, never-cleared
  // memory of the OLD x/y -- sees "no change" since the numbers happen to
  // match -- and never re-applies them to the real Konva node, which WAS
  // cleared to 0 in between. Keeping every key present in every render
  // sidesteps that upstream footgun entirely.
  function frameConfig(a: FrameAnnotation) {
    const anchor = plan.value ? resolveAnchor(comparePins.value, plan.value, a.pinRef, a.bandKey) : null;
    const w = anchor ? a.wPct * anchor.w : 0;
    const h = anchor ? a.hPct * anchor.h : 0;
    return {
      id: a.id,
      visible: !!anchor,
      listening: !!anchor,
      x: anchor ? anchor.x + a.xPct * anchor.w + w / 2 : 0,
      y: anchor ? anchor.y + a.yPct * anchor.h + h / 2 : 0,
      radiusX: Math.max(4, Math.abs(w) / 2),
      radiusY: Math.max(4, Math.abs(h) / 2),
      stroke: a.color,
      strokeWidth: 2.5,
      hitStrokeWidth: 10,
      draggable: !!anchor && isDraggableNow.value,
    };
  }
  function arrowConfig(a: ArrowAnnotation) {
    const anchor = plan.value ? resolveAnchor(comparePins.value, plan.value, a.pinRef, a.bandKey) : null;
    return {
      id: a.id,
      visible: !!anchor,
      listening: !!anchor,
      points: anchor
        ? [anchor.x + a.x1Pct * anchor.w, anchor.y + a.y1Pct * anchor.h, anchor.x + a.x2Pct * anchor.w, anchor.y + a.y2Pct * anchor.h]
        : [0, 0, 0, 0],
      stroke: a.color,
      fill: a.color,
      strokeWidth: 2.5,
      pointerLength: 10,
      pointerWidth: 10,
      hitStrokeWidth: 14,
      draggable: !!anchor && isDraggableNow.value,
      x: 0,
      y: 0,
    };
  }
  function underlineConfig(a: UnderlineAnnotation) {
    const anchor = plan.value ? resolveAnchor(comparePins.value, plan.value, a.pinRef, a.bandKey) : null;
    const y = anchor ? anchor.y + a.yPct * anchor.h : 0;
    return {
      id: a.id,
      visible: !!anchor,
      listening: !!anchor,
      points: anchor ? [anchor.x + a.x1Pct * anchor.w, y, anchor.x + a.x2Pct * anchor.w, y] : [0, 0, 0, 0],
      stroke: a.color,
      strokeWidth: 3,
      lineCap: "round",
      hitStrokeWidth: 12,
      draggable: !!anchor && isDraggableNow.value,
      x: 0,
      y: 0,
    };
  }
  function postitGroupConfig(a: PostitAnnotation) {
    const anchor = plan.value ? resolveAnchor(comparePins.value, plan.value, a.pinRef, a.bandKey) : null;
    return {
      id: a.id,
      visible: !!anchor,
      listening: !!anchor,
      x: anchor ? anchor.x + a.xPct * anchor.w : 0,
      y: anchor ? anchor.y + a.yPct * anchor.h : 0,
      draggable: !!anchor && isDraggableNow.value,
    };
  }
  // a.height is a MINIMUM, not a fixed box -- the note always grows to fit
  // its wrapped text even if that's taller than whatever height was last
  // dragged (e.g. after typing more, or narrowing the width back down).
  function postitRenderedHeight(a: PostitAnnotation): number {
    return Math.max(a.height, postitHeight(measureCtx, a.text, a.width));
  }
  function postitRectConfig(a: PostitAnnotation) {
    return {
      width: a.width,
      height: postitRenderedHeight(a),
      fill: a.color,
      stroke: "rgba(28,37,65,0.35)",
      strokeWidth: 1,
      cornerRadius: 3,
    };
  }
  function postitTextConfig(a: PostitAnnotation) {
    return {
      text: a.text,
      x: 8,
      y: 6,
      width: a.width - 16,
      fontSize: 11,
      fontFamily: "Inter, sans-serif",
      fill: pickTextColor(a.color),
      lineHeight: POSTIT_LINE_H / 11,
      wrap: "word",
      listening: false,
    };
  }
  // Resize handle -- bottom-right corner of the note, drag freely to change
  // BOTH its width and height. Height can never go below what the wrapped
  // text actually needs at the current width (see postitRenderedHeight) --
  // dragging it shorter than that just stops shrinking, it never clips
  // text. Only meaningful under the Pointer tool, same as every other drag
  // interaction.
  function postitResizeHandleConfig(a: PostitAnnotation) {
    // Konva's dragBoundFunc works in ABSOLUTE (stage) coordinates, not the
    // node's own local/parent-relative ones -- easy to miss since node.x()/
    // y() elsewhere are always local. Getting this wrong here sent the
    // handle's Y to wherever `height` landed in ABSOLUTE stage space (i.e.
    // usually off-canvas) instead of relative to the note's own corner.
    const anchor = plan.value ? resolveAnchor(comparePins.value, plan.value, a.pinRef, a.bandKey) : null;
    const groupX = anchor ? anchor.x + a.xPct * anchor.w : 0;
    const groupY = anchor ? anchor.y + a.yPct * anchor.h : 0;
    return {
      x: a.width,
      y: postitRenderedHeight(a),
      radius: 5,
      fill: "#ffffff",
      stroke: "#0072b2",
      strokeWidth: 2,
      draggable: isDraggableNow.value,
      dragBoundFunc(pos: { x: number; y: number }) {
        const w = Math.max(POSTIT_MIN_WIDTH, Math.min(POSTIT_MAX_WIDTH, pos.x - groupX));
        const minH = postitHeight(measureCtx, a.text, w);
        const h = Math.max(minH, Math.min(POSTIT_MAX_HEIGHT, pos.y - groupY));
        return { x: groupX + w, y: groupY + h };
      },
    };
  }
  function stampGroupConfig(a: StampAnnotation) {
    const center = plan.value ? stampCenter(comparePins.value, plan.value, a) : null;
    return {
      id: a.id,
      visible: !!center,
      listening: !!center,
      x: center?.x ?? 0,
      y: center?.y ?? 0,
      draggable: !!center && isDraggableNow.value,
    };
  }
  function stampCircleConfig(a: StampAnnotation) {
    return {
      radius: STAMP_R,
      fill: STAMP_COLORS[a.kind],
      stroke: "#1c2541",
      strokeWidth: 1.5,
    };
  }

  // -- Column swap directly on the canvas: a small handle at the top-right
  // of each column's header, draggable left/right only. Only shown under
  // the Pointer tool, same as selection/drag.
  function columnHeaderY(): number {
    return (plan.value?.hasTitle ? TITLE_H : 0) + 4;
  }
  function columnSwapGroupConfig(index: number) {
    const active = activeTool.value === "pointer";
    const colX = index * (COL_WIDTH + COL_GAP);
    const y = columnHeaderY();
    return {
      x: colX + COL_WIDTH - COLUMN_SWAP_SIZE - 4,
      y,
      visible: active,
      listening: active,
      draggable: active,
      dragBoundFunc: (pos: { x: number; y: number }) => ({ x: pos.x, y }),
    };
  }
  function columnSwapBgConfig(index: number) {
    const active = hoveredColumnIndex.value === index || draggingColumnIndex.value === index;
    return {
      width: COLUMN_SWAP_SIZE,
      height: COLUMN_SWAP_SIZE,
      cornerRadius: 5,
      fill: active ? "#0072b2" : "rgba(58,80,107,0.15)",
    };
  }
  function columnSwapGlyphConfig(index: number) {
    const active = hoveredColumnIndex.value === index || draggingColumnIndex.value === index;
    return {
      text: "⇄",
      width: COLUMN_SWAP_SIZE,
      height: COLUMN_SWAP_SIZE,
      align: "center",
      verticalAlign: "middle",
      fontSize: 12,
      fill: active ? "#ffffff" : "#3a506b",
      listening: false,
    };
  }
  function columnIndexForX(x: number, count: number): number {
    let best = 0;
    let bestDist = Infinity;
    for (let i = 0; i < count; i++) {
      const dist = Math.abs(x - (i * (COL_WIDTH + COL_GAP) + COL_WIDTH / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = i;
      }
    }
    return best;
  }

  return {
    bandAt,
    nearestBand,
    pinRefAt,
    pinIndexAt,
    toBandPct,
    penConfig,
    frameConfig,
    arrowConfig,
    underlineConfig,
    postitGroupConfig,
    postitRenderedHeight,
    postitRectConfig,
    postitTextConfig,
    postitResizeHandleConfig,
    stampGroupConfig,
    stampCircleConfig,
    columnHeaderY,
    columnSwapGroupConfig,
    columnSwapBgConfig,
    columnSwapGlyphConfig,
    columnIndexForX,
  };
}
