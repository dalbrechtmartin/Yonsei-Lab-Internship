import { darkenColor, materialColor, type StructureLayer } from "./layerStructure";

export interface AnnotationExportSection {
  title: string;
  rows?: { key: string; value: string }[];
  text?: string;
  layers?: StructureLayer[];
}

const WIDTH = 460;
const PAD_X = 20;
const BOX_PAD = 12;
const ROW_LINE_H = 15;
const ROW_GAP = 8;
const SECTION_GAP = 16;
const SECTION_TITLE_H = 16;
const MIN_LAYER_H = 26;
const EXTRA_LAYER_H = 34;
const BORDER = "rgba(58,80,107,0.22)";
const BOX_BG = "#f8fafc";
const LABEL_FONT = "400 11px Inter, sans-serif";
const VALUE_FONT = '600 12px "IBM Plex Mono", monospace';
const LABEL_COLOR = "#52616b";
const VALUE_COLOR = "#1c2541";

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
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

function layerHeights(layers: StructureLayer[]): number[] {
  const known = layers.map((l) => l.thicknessNm).filter((v): v is number => v !== null);
  const min = known.length ? Math.min(...known) : 0;
  const max = known.length ? Math.max(...known) : 0;
  return layers.map((l) => {
    if (l.thicknessNm === null || known.length === 0 || max === min) return MIN_LAYER_H;
    return Math.round(MIN_LAYER_H + ((l.thicknessNm - min) / (max - min)) * EXTRA_LAYER_H);
  });
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
    labelLines.forEach((line, i) => ctx.fillText(line, x, y + 11 + i * ROW_LINE_H));
    ctx.font = VALUE_FONT;
    ctx.fillStyle = VALUE_COLOR;
    valueLines.forEach((line, i) => ctx.fillText(line, x + labelW + 10, y + 11 + i * ROW_LINE_H));
  }
  return lineCount * ROW_LINE_H + ROW_GAP;
}

function drawBoxStart(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, draw: boolean) {
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
 */
function layoutAndMaybeDraw(
  ctx: CanvasRenderingContext2D,
  source: { ref: string; title: string },
  origin: { key: string; value: string } | null,
  sections: AnnotationExportSection[],
  draw: boolean,
): number {
  const contentW = WIDTH - PAD_X * 2;
  const labelW = Math.round(contentW * 0.38);
  const valueW = contentW - labelW - 10;
  let y = 0;

  ctx.textBaseline = "alphabetic";
  ctx.font = "700 15px 'IBM Plex Mono', monospace";
  if (draw) {
    ctx.fillStyle = "#0072b2";
    ctx.fillText(source.ref, PAD_X, y + 18);
  }
  y += 24;

  ctx.font = "400 12px Inter, sans-serif";
  const titleLines = wrapText(ctx, source.title, contentW);
  if (draw) {
    ctx.fillStyle = "#1c2541";
    titleLines.forEach((line, i) => ctx.fillText(line, PAD_X, y + 12 + i * 16));
  }
  y += titleLines.length * 16 + SECTION_GAP;

  if (origin) {
    const rowH = drawRow(ctx, PAD_X + BOX_PAD, y + BOX_PAD, labelW, valueW, origin.key, origin.value, false);
    const boxH = rowH - ROW_GAP + BOX_PAD * 2;
    drawBoxStart(ctx, PAD_X, y, contentW, boxH, draw);
    if (draw) drawRow(ctx, PAD_X + BOX_PAD, y + BOX_PAD, labelW, valueW, origin.key, origin.value, true);
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
      ctx.fillText(section.title.toUpperCase(), PAD_X, y + 9);
    }
    y += SECTION_TITLE_H;

    // First measure the box's inner content height (rows + layer stack +
    // wrapped text), then draw the box background/border, then draw the
    // content again on top of it.
    const measureInner = (innerDraw: boolean, innerX: number, startY: number): number => {
      let iy = startY;
      if (hasRows) {
        for (const row of section.rows!) {
          iy += drawRow(ctx, innerX, iy, labelW, valueW, row.key, row.value, innerDraw);
        }
      }
      if (hasLayers) {
        const layers = section.layers!;
        const heights = layerHeights(layers);
        const innerContentW = contentW - BOX_PAD * 2;
        const sideW = 10;
        const mainW = innerContentW - sideW;
        if (innerDraw) {
          const topColor = materialColor(layers[0].material);
          ctx.fillStyle = topColor;
          ctx.fillRect(innerX, iy, innerContentW, 3);
        }
        iy += 3;
        layers.forEach((layer, i) => {
          const h = heights[i];
          const color = materialColor(layer.material);
          if (innerDraw) {
            ctx.fillStyle = color;
            ctx.fillRect(innerX, iy, mainW, h);
            ctx.fillStyle = darkenColor(color, 40);
            ctx.fillRect(innerX + mainW, iy, sideW, h);
            ctx.strokeStyle = "rgba(0,0,0,0.15)";
            ctx.strokeRect(innerX, iy, innerContentW, h);
            const label = layer.thicknessNm !== null ? `${layer.material} · ${layer.thicknessNm}nm` : layer.material;
            ctx.font = "600 11px 'IBM Plex Mono', monospace";
            ctx.fillStyle = "rgba(0,0,0,0.72)";
            ctx.fillText(label, innerX + 8, iy + h / 2 + 4);
          }
          iy += h;
        });
        iy += ROW_GAP;
      }
      if (hasText) {
        ctx.font = "400 11px 'IBM Plex Mono', monospace";
        const lines = wrapText(ctx, section.text!, contentW - BOX_PAD * 2);
        if (innerDraw) {
          ctx.fillStyle = "#3a506b";
          lines.forEach((line, i) => ctx.fillText(line, innerX, iy + 11 + i * ROW_LINE_H));
        }
        iy += lines.length * ROW_LINE_H + ROW_GAP;
      }
      return iy;
    };

    const contentBottom = measureInner(false, PAD_X + BOX_PAD, y + BOX_PAD);
    const boxH = contentBottom - y - ROW_GAP + BOX_PAD * 2;
    drawBoxStart(ctx, PAD_X, y, contentW, boxH, draw);
    if (draw) measureInner(true, PAD_X + BOX_PAD, y + BOX_PAD);
    y += boxH + SECTION_GAP;
  }

  return y;
}

/**
 * Exports one pinned point's entire card -- header, Origin, Mode, Layer
 * Structure (with Material Class/Base Materials), Metrics, and the personal
 * Note -- as a single PNG, so a researcher building a report doesn't have
 * to stitch together the per-section downloads by hand.
 */
export function exportAnnotationPng(
  source: { ref: string; title: string },
  origin: { key: string; value: string } | null,
  sections: AnnotationExportSection[],
  filename?: string,
): void {
  const measureCanvas = document.createElement("canvas");
  const measureCtx = measureCanvas.getContext("2d");
  if (!measureCtx) return;
  const height = layoutAndMaybeDraw(measureCtx, source, origin, sections, false);

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = WIDTH * scale;
  canvas.height = height * scale;
  canvas.style.width = `${WIDTH}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, height);
  layoutAndMaybeDraw(ctx, source, origin, sections, true);

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `pin_${source.ref.replace(/[^a-z0-9_-]+/gi, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
