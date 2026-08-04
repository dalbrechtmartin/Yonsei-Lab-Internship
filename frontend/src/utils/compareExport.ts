import {
  BORDER,
  BOX_BG,
  BOX_PAD,
  LABEL_COLOR,
  LABEL_FONT,
  PAD_X,
  ROW_GAP,
  ROW_LINE_H,
  SECTION_GAP,
  SECTION_TITLE_H,
  VALUE_COLOR,
  VALUE_FONT,
  layerHeights,
  wrapText,
  type AnnotationExportSection,
} from "./annotationExport";
import { darkenColor, layerLabel, materialColor, type StructureLayer } from "./layerStructure";

export interface ComparePinData {
  ref: string;
  title: string;
  origin: { key: string; value: string } | null;
  sections: AnnotationExportSection[];
}

export const COL_WIDTH = 300;
export const COL_GAP = 22;
const TITLE_FONT = "700 20px Inter, sans-serif";
const TITLE_COLOR = "#1c2541";
export const TITLE_H = 34;
const DIVIDER = "rgba(58,80,107,0.18)";
export const HIGHLIGHT_FILL = "rgba(255, 179, 0, 0.24)";

/** One horizontal band shared by every column -- a candidate for the
 * "highlight this row across all columns" tool (see CompareDialog). Not
 * every visual element gets one: only rows/diagrams/text blocks that are
 * meaningful "data" to flag, never the header (ref/title) or a section's own
 * heading. */
export interface CompareRowBand {
  key: string;
  y: number;
  height: number;
}

interface RowsPart {
  keys: string[];
  labels: Map<string, string>;
  values: Map<string, string>[];
  heights: number[];
}

interface LayersPart {
  perPin: (StructureLayer[] | undefined)[];
  y: number;
  height: number;
}

interface TextPart {
  perPin: (string[] | undefined)[];
  y: number;
  height: number;
}

interface SectionPlan {
  title: string | null;
  y: number;
  boxHeight: number;
  rows: RowsPart | null;
  layers: LayersPart | null;
  text: TextPart | null;
}

export interface ComparePlan {
  width: number;
  height: number;
  headerHeight: number;
  hasTitle: boolean;
  sections: SectionPlan[];
  rowBands: CompareRowBand[];
}

function unionFieldKeys(perPinRows: (Array<{ key: string; value: string }> | undefined)[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const rows of perPinRows) {
    if (!rows) continue;
    for (const r of rows) {
      if (!seen.has(r.key)) {
        seen.add(r.key);
        keys.push(r.key);
      }
    }
  }
  return keys;
}

function valueMap(rows: Array<{ key: string; value: string }> | undefined): Map<string, string> {
  const m = new Map<string, string>();
  if (rows) for (const r of rows) m.set(r.key, r.value);
  return m;
}

function unionSectionTitles(pins: ComparePinData[]): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const pin of pins) {
    for (const s of pin.sections) {
      if (!seen.has(s.title)) {
        seen.add(s.title);
        titles.push(s.title);
      }
    }
  }
  return titles;
}

/**
 * Measures how tall every row, section and column needs to be across ALL
 * pins at once (rather than each pin's column independently, which is what
 * let one column's longer content silently push its own later sections down
 * while a neighboring column's sections stayed put -- the exact "data isn't
 * aligned" complaint this replaces). A row/section renders at the SAME y for
 * every column; a pin simply missing a given field shows "--" in its slot
 * rather than the whole row shifting.
 */
export function planComparePins(pins: ComparePinData[], hasTitle: boolean): ComparePlan {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  const contentW = COL_WIDTH - PAD_X * 2;
  const labelW = Math.round(contentW * 0.38);
  const valueW = contentW - labelW - 10;
  const topY = hasTitle ? TITLE_H : 0;
  const rowBands: CompareRowBand[] = [];

  ctx.font = "400 12px Inter, sans-serif";
  const headerLines = Math.max(...pins.map((p) => wrapText(ctx, p.title, contentW).length), 1);
  const headerHeight = 24 + headerLines * 16 + SECTION_GAP;

  let y = topY + headerHeight;
  const sections: SectionPlan[] = [];

  if (pins.some((p) => p.origin)) {
    const originPin = pins.find((p) => p.origin)!;
    const key = originPin.origin!.key;
    const values = pins.map((p) => {
      const m = new Map<string, string>();
      if (p.origin) m.set(key, p.origin.value);
      return m;
    });
    ctx.font = LABEL_FONT;
    const labelLines = wrapText(ctx, key, labelW).length;
    ctx.font = VALUE_FONT;
    let maxValueLines = 1;
    for (const p of pins) {
      if (!p.origin) continue;
      maxValueLines = Math.max(maxValueLines, wrapText(ctx, p.origin.value, valueW).length);
    }
    const rowH = Math.max(labelLines, maxValueLines, 1) * ROW_LINE_H + ROW_GAP;
    const boxH = rowH - ROW_GAP + BOX_PAD * 2;
    rowBands.push({ key: "origin", y, height: boxH });
    sections.push({
      title: null,
      y,
      boxHeight: boxH,
      rows: { keys: [key], labels: new Map([[key, key]]), values, heights: [rowH] },
      layers: null,
      text: null,
    });
    y += boxH + SECTION_GAP;
  }

  for (const title of unionSectionTitles(pins)) {
    const perPin = pins.map((p) => p.sections.find((s) => s.title === title));

    const rowKeys = unionFieldKeys(perPin.map((s) => s?.rows));
    const rowLabels = new Map<string, string>();
    for (const s of perPin) if (s?.rows) for (const r of s.rows) if (!rowLabels.has(r.key)) rowLabels.set(r.key, r.key);
    const rowValues = perPin.map((s) => valueMap(s?.rows));
    const rowHeights: number[] = [];
    let rowsHeight = 0;
    for (const key of rowKeys) {
      ctx.font = LABEL_FONT;
      const labelLines = wrapText(ctx, key, labelW).length;
      ctx.font = VALUE_FONT;
      let maxValueLines = 1;
      for (const vm of rowValues) maxValueLines = Math.max(maxValueLines, wrapText(ctx, vm.get(key) ?? "—", valueW).length);
      const h = Math.max(labelLines, maxValueLines, 1) * ROW_LINE_H + ROW_GAP;
      rowHeights.push(h);
      rowsHeight += h;
    }

    const hasLayers = perPin.some((s) => s?.layers && s.layers.length > 0);
    let layersHeight = 0;
    if (hasLayers) {
      for (const s of perPin) {
        if (!s?.layers || s.layers.length === 0) continue;
        const heights = layerHeights(s.layers);
        layersHeight = Math.max(
          layersHeight,
          3 + heights.reduce((a, b) => a + b, 0) + ROW_GAP,
        );
      }
    }

    const hasText = perPin.some((s) => s?.text && s.text.trim().length > 0);
    let textHeight = 0;
    const textLinesPerPin: (string[] | undefined)[] = [];
    if (hasText) {
      ctx.font = "400 11px 'IBM Plex Mono', monospace";
      for (const s of perPin) {
        if (!s?.text || !s.text.trim()) {
          textLinesPerPin.push(undefined);
          continue;
        }
        const lines = wrapText(ctx, s.text, contentW - BOX_PAD * 2);
        textLinesPerPin.push(lines);
        textHeight = Math.max(textHeight, lines.length * ROW_LINE_H + ROW_GAP);
      }
    }

    if (rowKeys.length === 0 && !hasLayers && !hasText) continue;

    const innerHeight = rowsHeight + layersHeight + textHeight;
    const boxH = innerHeight - ROW_GAP + BOX_PAD * 2;
    const sectionY = y + SECTION_TITLE_H;

    let cursor = sectionY + BOX_PAD;
    for (let i = 0; i < rowKeys.length; i++) {
      rowBands.push({ key: `${title}:${rowKeys[i]}`, y: cursor, height: rowHeights[i] });
      cursor += rowHeights[i];
    }
    const layersY = cursor - sectionY;
    if (hasLayers) {
      rowBands.push({ key: `${title}:layers`, y: cursor, height: layersHeight });
      cursor += layersHeight;
    }
    const textY = cursor - sectionY;
    if (hasText) rowBands.push({ key: `${title}:text`, y: cursor, height: textHeight });

    sections.push({
      title,
      y,
      boxHeight: boxH,
      rows: rowKeys.length ? { keys: rowKeys, labels: rowLabels, values: rowValues, heights: rowHeights } : null,
      layers: hasLayers ? { perPin: perPin.map((s) => s?.layers), y: layersY, height: layersHeight } : null,
      text: hasText ? { perPin: textLinesPerPin, y: textY, height: textHeight } : null,
    });

    y += SECTION_TITLE_H + boxH + SECTION_GAP;
  }

  const width = pins.length * COL_WIDTH + (pins.length - 1) * COL_GAP;
  return { width, height: y, headerHeight, hasTitle, sections, rowBands };
}

function drawBoxBg(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = BOX_BG;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function drawRowAt(ctx: CanvasRenderingContext2D, x: number, y: number, labelW: number, valueW: number, key: string, value: string) {
  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  wrapText(ctx, key, labelW).forEach((line, i) => ctx.fillText(line, x, y + 11 + i * ROW_LINE_H));
  ctx.font = VALUE_FONT;
  ctx.fillStyle = VALUE_COLOR;
  wrapText(ctx, value, valueW).forEach((line, i) => ctx.fillText(line, x + labelW + 10, y + 11 + i * ROW_LINE_H));
}

function drawLayerStack(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, layers: StructureLayer[]) {
  const heights = layerHeights(layers);
  const sideW = 10;
  const mainW = w - sideW;
  ctx.fillStyle = materialColor(layers[0].material);
  ctx.fillRect(x, y, w, 3);
  let iy = y + 3;
  layers.forEach((layer, i) => {
    const h = heights[i];
    const color = materialColor(layer.material);
    ctx.fillStyle = color;
    ctx.fillRect(x, iy, mainW, h);
    ctx.fillStyle = darkenColor(color, 40);
    ctx.fillRect(x + mainW, iy, sideW, h);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.strokeRect(x, iy, w, h);
    const label = layerLabel(layer);
    ctx.font = "600 11px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillText(label, x + 8, iy + h / 2 + 4);
    iy += h;
  });
}

/**
 * Draws a previously computed plan onto ctx -- pure drawing, no measuring, so
 * it's cheap enough to call on every highlight/title change from an
 * interactive on-screen canvas (see CompareDialog) as well as for the
 * one-shot PNG export below.
 */
export function drawComparePins(ctx: CanvasRenderingContext2D, pins: ComparePinData[], plan: ComparePlan, title: string | null, highlightedKeys: Set<string>): void {
  const contentW = COL_WIDTH - PAD_X * 2;
  const labelW = Math.round(contentW * 0.38);
  const valueW = contentW - labelW - 10;

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, plan.width, plan.height);

  if (highlightedKeys.size > 0) {
    ctx.fillStyle = HIGHLIGHT_FILL;
    for (const band of plan.rowBands) {
      if (!highlightedKeys.has(band.key)) continue;
      ctx.beginPath();
      ctx.roundRect(4, band.y - 3, plan.width - 8, band.height + 3, 6);
      ctx.fill();
    }
  }

  if (plan.hasTitle && title) {
    ctx.font = TITLE_FONT;
    ctx.fillStyle = TITLE_COLOR;
    ctx.fillText(title.trim(), PAD_X, 24);
  }

  const topY = plan.hasTitle ? TITLE_H : 0;

  pins.forEach((pin, i) => {
    const colX = i * (COL_WIDTH + COL_GAP);
    const x = colX + PAD_X;
    if (i > 0) {
      ctx.strokeStyle = DIVIDER;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(colX - COL_GAP / 2, topY);
      ctx.lineTo(colX - COL_GAP / 2, plan.height);
      ctx.stroke();
    }

    ctx.font = "700 15px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#0072b2";
    ctx.fillText(pin.ref, x, topY + 18);

    ctx.font = "400 12px Inter, sans-serif";
    ctx.fillStyle = "#1c2541";
    wrapText(ctx, pin.title, contentW).forEach((line, li) => ctx.fillText(line, x, topY + 24 + 12 + li * 16));

    for (const section of plan.sections) {
      if (section.title) {
        ctx.font = "700 9px Inter, sans-serif";
        ctx.fillStyle = "#3a506b";
        ctx.fillText(section.title.toUpperCase(), x, section.y + 9);
      }
      const boxY = section.title ? section.y + SECTION_TITLE_H : section.y;
      drawBoxBg(ctx, colX + PAD_X, boxY, contentW, section.boxHeight);

      if (section.rows) {
        let ry = boxY + BOX_PAD;
        const pinValues = section.rows.values[i];
        for (let k = 0; k < section.rows.keys.length; k++) {
          const key = section.rows.keys[k];
          drawRowAt(ctx, x + BOX_PAD, ry, labelW, valueW, section.rows.labels.get(key)!, pinValues.get(key) ?? "—");
          ry += section.rows.heights[k];
        }
      }
      if (section.layers) {
        const layers = section.layers.perPin[i];
        if (layers && layers.length > 0) drawLayerStack(ctx, x + BOX_PAD, boxY + section.layers.y, contentW - BOX_PAD * 2, layers);
      }
      if (section.text) {
        const lines = section.text.perPin[i];
        if (lines) {
          ctx.font = "400 11px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "#3a506b";
          lines.forEach((line, li) => ctx.fillText(line, x + BOX_PAD, boxY + section.text!.y + 11 + li * ROW_LINE_H));
        }
      }
    }
  });
}

/**
 * One-shot render used where no interactivity is needed -- the user guide's
 * static compare preview (see AnnotationsPanel's getComparePngDataUrl).
 * CompareDialog's own live preview instead calls planComparePins +
 * drawComparePins directly against an on-screen canvas (see its
 * renderContent), since it also needs the plan's rowBands for hit-testing.
 */
export function renderComparePng(title: string | null, pins: ComparePinData[], highlightedKeys: Set<string> = new Set()): string | null {
  if (pins.length === 0) return null;
  const hasTitle = !!title && title.trim().length > 0;
  const plan = planComparePins(pins, hasTitle);

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = plan.width * scale;
  canvas.height = plan.height * scale;
  canvas.style.width = `${plan.width}px`;
  canvas.style.height = `${plan.height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);
  drawComparePins(ctx, pins, plan, title, highlightedKeys);

  return canvas.toDataURL("image/png");
}
