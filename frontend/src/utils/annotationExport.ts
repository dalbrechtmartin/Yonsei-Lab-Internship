import { drawLayerStack, layerHeights } from "./layerStackExport";
import type { StructureLayer } from "./layerStructure";
import { downloadDataUrl } from "./saveFile";

export interface AnnotationExportSection {
  title: string;
  rows?: { key: string; value: string }[];
  text?: string;
  layers?: StructureLayer[];
}

export const WIDTH = 460;
export const PAD_X = 20;
export const BOX_PAD = 12;
export const ROW_LINE_H = 15;
export const ROW_GAP = 8;
export const SECTION_GAP = 16;
export const SECTION_TITLE_H = 16;
export const BORDER = "rgba(58,80,107,0.22)";
export const BOX_BG = "#f8fafc";
export const LABEL_FONT = "400 11px Inter, sans-serif";
export const VALUE_FONT = '600 12px "IBM Plex Mono", monospace';
export const LABEL_COLOR = "#52616b";
export const VALUE_COLOR = "#1c2541";

// Every distinct family+weight this file (and compareExport.ts) sets via
// ctx.font. Canvas text silently falls back to a generic font for any
// @font-face it hasn't already loaded -- and, unlike DOM text, never
// re-paints on its own once the real one arrives, so a caller that memoizes
// a measured layout (see CompareDialog's `plan`) can get stuck with row
// heights measured against the (narrower) fallback forever. document.fonts
// only *starts* loading a given face the first time something requests it,
// so waiting on document.fonts.ready alone can still race: if nothing else
// on the page happened to need "IBM Plex Mono" 700 yet, ready may resolve
// before that request is even made. Explicitly loading these exact faces
// sidesteps that.
const CANVAS_FONT_FACES = [
  "400 12px Inter",
  "700 12px Inter",
  "400 12px 'IBM Plex Mono'",
  "600 12px 'IBM Plex Mono'",
  "700 12px 'IBM Plex Mono'",
];
let canvasFontsLoadPromise: Promise<unknown> | null = null;
export function ensureCanvasFontsLoaded(): Promise<unknown> {
  if (typeof document === "undefined" || !("fonts" in document))
    return Promise.resolve();
  if (!canvasFontsLoadPromise) {
    canvasFontsLoadPromise = Promise.all(
      CANVAS_FONT_FACES.map((f) =>
        document.fonts.load(f).catch(() => undefined),
      ),
    );
  }
  return canvasFontsLoadPromise;
}

/**
 * Hard-wraps a single unbreakable token (no whitespace for wrapText to break
 * on) that's still wider than maxWidth on its own -- e.g. a semicolon-joined
 * list like "2D Material;Dielectric;Metal" is one "word" to wrapText, and
 * without this it just ran off the edge of its box instead of wrapping.
 * Prefers breaking right after a semicolon/comma (keeping it attached to the
 * piece before it, so a materials list still reads as a list); falls back to
 * a hard character wrap for a single piece that's long even on its own (e.g.
 * one long, delimiter-free material name).
 */
function breakLongToken(
  ctx: CanvasRenderingContext2D,
  token: string,
  maxWidth: number,
): string[] {
  if (ctx.measureText(token).width <= maxWidth) return [token];
  const pieces = token.split(/(?<=[;,])/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const piece of pieces) {
    if (ctx.measureText(piece).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let chunk = "";
      for (const ch of piece) {
        const candidate = chunk + ch;
        if (ctx.measureText(candidate).width > maxWidth && chunk) {
          lines.push(chunk);
          chunk = ch;
        } else {
          chunk = candidate;
        }
      }
      line = chunk;
      continue;
    }
    const candidate = line + piece;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = piece;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (ctx.measureText(word).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      const broken = breakLongToken(ctx, word, maxWidth);
      lines.push(...broken.slice(0, -1));
      line = broken[broken.length - 1] ?? "";
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Draws (or, with draw=false, just measures) one label/value row inside a
 * two-column layout that wraps BOTH columns independently -- a long label
 * like "Resonance Wavelength (nm)" wrapping onto its own second line
 * instead of running into the value column, which is what produced
 * overlapping/garbled text before this. Returns the row's height so the
 * caller can advance its cursor.
 */
function drawRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
  key: string,
  value: string,
  draw: boolean,
): number {
  ctx.font = LABEL_FONT;
  const labelLines = wrapText(ctx, key, labelW);
  ctx.font = VALUE_FONT;
  const valueLines = wrapText(ctx, value, valueW);
  const lineCount = Math.max(labelLines.length, valueLines.length, 1);
  if (draw) {
    ctx.font = LABEL_FONT;
    ctx.fillStyle = LABEL_COLOR;
    labelLines.forEach((line, i) =>
      ctx.fillText(line, x, y + 11 + i * ROW_LINE_H),
    );
    ctx.font = VALUE_FONT;
    ctx.fillStyle = VALUE_COLOR;
    valueLines.forEach((line, i) =>
      ctx.fillText(line, x + labelW + 10, y + 11 + i * ROW_LINE_H),
    );
  }
  return lineCount * ROW_LINE_H + ROW_GAP;
}

function drawBoxStart(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  draw: boolean,
) {
  if (!draw) return;
  ctx.fillStyle = BOX_BG;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

/**
 * Lays out a pinned point's full card (header, Origin, Mode, Layer Structure
 * + materials, Metrics, Note) top to bottom onto a canvas and returns the
 * total height consumed. Called twice by exportAnnotationPng -- once against
 * a throwaway 1x1 context (draw=false) purely to measure how tall the real
 * canvas needs to be, then again against the real, correctly-sized context.
 * Boxes are drawn in a first sub-pass per section (once their height is
 * known) so the border/background sits behind the text, matching the
 * rounded bordered-card look the rest of the app uses for these same
 * groupings (Mode, Layer Structure, Metrics, Note).
 *
 * `originX`/`width`/`y0` let this same layout render as one column among
 * several (see compareExport.ts's side-by-side multi-pin export) instead of
 * always owning the whole canvas from (0, 0) -- exported for that reuse.
 */
export function layoutAndMaybeDraw(
  ctx: CanvasRenderingContext2D,
  source: { ref: string; title: string },
  origin: { key: string; value: string } | null,
  sections: AnnotationExportSection[],
  draw: boolean,
  originX = 0,
  width = WIDTH,
  y0 = 0,
): number {
  const contentW = width - PAD_X * 2;
  const labelW = Math.round(contentW * 0.38);
  // Subtracts BOX_PAD on both sides -- the box is only contentW wide and
  // rows start at x + BOX_PAD, so sizing the value column off contentW
  // alone let a long value (e.g. Base Materials) overflow the box's right
  // edge by exactly BOX_PAD (see compareExport.ts's planComparePins for the
  // same fix on the multi-pin compare export).
  const valueW = contentW - BOX_PAD * 2 - labelW - 10;
  const x = originX + PAD_X;
  let y = y0;

  ctx.textBaseline = "alphabetic";
  ctx.font = "700 15px 'IBM Plex Mono', monospace";
  if (draw) {
    ctx.fillStyle = "#0072b2";
    ctx.fillText(source.ref, x, y + 18);
  }
  y += 24;

  ctx.font = "400 12px Inter, sans-serif";
  const titleLines = wrapText(ctx, source.title, contentW);
  if (draw) {
    ctx.fillStyle = "#1c2541";
    titleLines.forEach((line, i) => ctx.fillText(line, x, y + 12 + i * 16));
  }
  y += titleLines.length * 16 + SECTION_GAP;

  if (origin) {
    const rowH = drawRow(
      ctx,
      x + BOX_PAD,
      y + BOX_PAD,
      labelW,
      valueW,
      origin.key,
      origin.value,
      false,
    );
    const boxH = rowH - ROW_GAP + BOX_PAD * 2;
    drawBoxStart(ctx, originX + PAD_X, y, contentW, boxH, draw);
    if (draw)
      drawRow(
        ctx,
        x + BOX_PAD,
        y + BOX_PAD,
        labelW,
        valueW,
        origin.key,
        origin.value,
        true,
      );
    y += boxH + SECTION_GAP;
  }

  for (const section of sections) {
    const hasRows = section.rows && section.rows.length > 0;
    const hasText = section.text && section.text.trim().length > 0;
    const hasLayers = section.layers && section.layers.length > 0;
    if (!hasRows && !hasText && !hasLayers) continue;

    ctx.font = "700 9px Inter, sans-serif";
    if (draw) {
      ctx.fillStyle = "#3a506b";
      ctx.fillText(section.title.toUpperCase(), x, y + 9);
    }
    y += SECTION_TITLE_H;

    // First measure the box's inner content height (rows + layer stack +
    // wrapped text), then draw the box background/border, then draw the
    // content again on top of it.
    const measureInner = (
      innerDraw: boolean,
      innerX: number,
      startY: number,
    ): number => {
      let iy = startY;
      if (hasRows) {
        for (const row of section.rows!) {
          iy += drawRow(
            ctx,
            innerX,
            iy,
            labelW,
            valueW,
            row.key,
            row.value,
            innerDraw,
          );
        }
      }
      if (hasLayers) {
        const layers = section.layers!;
        const innerContentW = contentW - BOX_PAD * 2;
        iy += drawLayerStack(
          ctx,
          innerX,
          iy,
          innerContentW,
          layers,
          layerHeights(layers),
          { sideAccentW: 10, topStripH: 3 },
          innerDraw,
        );
        iy += ROW_GAP;
      }
      if (hasText) {
        ctx.font = "400 11px 'IBM Plex Mono', monospace";
        const lines = wrapText(ctx, section.text!, contentW - BOX_PAD * 2);
        if (innerDraw) {
          ctx.fillStyle = "#3a506b";
          lines.forEach((line, i) =>
            ctx.fillText(line, innerX, iy + 11 + i * ROW_LINE_H),
          );
        }
        iy += lines.length * ROW_LINE_H + ROW_GAP;
      }
      return iy;
    };

    const contentBottom = measureInner(false, x + BOX_PAD, y + BOX_PAD);
    const boxH = contentBottom - y - ROW_GAP + BOX_PAD * 2;
    drawBoxStart(ctx, originX + PAD_X, y, contentW, boxH, draw);
    if (draw) measureInner(true, x + BOX_PAD, y + BOX_PAD);
    y += boxH + SECTION_GAP;
  }

  return y - y0;
}

/**
 * Renders one pinned point's entire card -- header, Origin, Mode, Layer
 * Structure (with Material Class/Base Materials), Metrics, and the personal
 * Note -- onto a canvas and returns it as a PNG data URL, without triggering
 * a download. Split out of exportAnnotationPng so the guide can show a real
 * (not mocked) example of what that export looks like.
 */
export function renderAnnotationPng(
  source: { ref: string; title: string },
  origin: { key: string; value: string } | null,
  sections: AnnotationExportSection[],
): string | null {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return null;
  const height = layoutAndMaybeDraw(
    measureCtx,
    source,
    origin,
    sections,
    false,
  );

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  layoutAndMaybeDraw(ctx, source, origin, sections, true);

  return canvas.toDataURL("image/png");
}

/**
 * Exports one pinned point's entire card as a single PNG file, so a
 * researcher building a report doesn't have to stitch together the per-
 * section downloads by hand.
 */
export function exportAnnotationPng(
  source: { ref: string; title: string },
  origin: { key: string; value: string } | null,
  sections: AnnotationExportSection[],
  filename?: string,
): void {
  const url = renderAnnotationPng(source, origin, sections);
  if (!url) return;
  downloadDataUrl(
    url,
    filename ?? `pin_${source.ref.replace(/[^a-z0-9_-]+/gi, "_")}.png`,
  );
}
