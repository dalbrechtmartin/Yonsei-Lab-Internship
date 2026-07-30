import { layoutAndMaybeDraw, PAD_X, type AnnotationExportSection } from "./annotationExport";

export interface ComparePinData {
  ref: string;
  title: string;
  origin: { key: string; value: string } | null;
  sections: AnnotationExportSection[];
}

const COL_WIDTH = 300;
const COL_GAP = 22;
const TITLE_FONT = "700 20px Inter, sans-serif";
const TITLE_COLOR = "#1c2541";
const TITLE_H = 34;
const DIVIDER = "rgba(58,80,107,0.18)";

/**
 * Lays out several pinned points as side-by-side columns -- each column is
 * exactly one pin's card (see annotationExport.ts's layoutAndMaybeDraw,
 * reused here rather than reimplemented) so a multi-pin comparison reads as
 * "the same single-pin export, repeated per pin" instead of a different
 * visual language. An optional heading spans the full width above every
 * column. Returns the canvas's data URL, or null if 2D canvas isn't
 * available or there are no pins to render.
 */
export function renderComparePng(title: string | null, pins: ComparePinData[]): string | null {
  if (pins.length === 0) return null;

  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;

  const hasTitle = !!title && title.trim().length > 0;
  const topY = hasTitle ? TITLE_H : 0;

  measureCtx.textBaseline = "alphabetic";
  const colHeights = pins.map((pin, i) =>
    layoutAndMaybeDraw(measureCtx, pin, pin.origin, pin.sections, false, i * (COL_WIDTH + COL_GAP), COL_WIDTH, topY),
  );
  const contentHeight = Math.max(...colHeights);
  const width = pins.length * COL_WIDTH + (pins.length - 1) * COL_GAP;
  const height = topY + contentHeight;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  if (hasTitle) {
    ctx.textBaseline = "alphabetic";
    ctx.font = TITLE_FONT;
    ctx.fillStyle = TITLE_COLOR;
    ctx.fillText(title!.trim(), PAD_X, 24);
  }

  pins.forEach((pin, i) => {
    const colX = i * (COL_WIDTH + COL_GAP);
    if (i > 0) {
      ctx.strokeStyle = DIVIDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX - COL_GAP / 2, topY);
      ctx.lineTo(colX - COL_GAP / 2, height);
      ctx.stroke();
    }
    layoutAndMaybeDraw(ctx, pin, pin.origin, pin.sections, true, colX, COL_WIDTH, topY);
  });

  return canvas.toDataURL("image/png");
}

/**
 * Exports the side-by-side comparison as a single PNG file.
 */
export function exportComparePng(title: string | null, pins: ComparePinData[], filename?: string): void {
  const url = renderComparePng(title, pins);
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  const refs = pins.map((p) => p.ref.replace(/[^a-z0-9_-]+/gi, "_")).join("_");
  a.download = filename ?? `compare_${refs}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
