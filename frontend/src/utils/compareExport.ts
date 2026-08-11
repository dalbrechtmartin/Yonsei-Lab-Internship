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
import {
  darkenColor,
  layerLabel,
  materialColor,
  type StructureLayer,
} from "./layerStructure";

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
// More breathing room than a bare font-size gap -- the title/legend used to
// sit almost flush against the columns.
export const TITLE_H = 48;
const DIVIDER = "rgba(58,80,107,0.18)";

// Okabe-Ito colorblind-safe palette -- chosen deliberately over arbitrary
// hex values so every color pairing used for meaning (best/worst, stamps,
// annotation colors) stays distinguishable under the common forms of color
// blindness. The app's own --primary (#0072b2) already IS this palette's
// "Blue", which is why it's reused here rather than picked separately.
export const OKABE_ITO = {
  blue: "#0072b2",
  orange: "#e69f00",
  bluishGreen: "#009e73",
  reddishPurple: "#cc79a7",
  vermillion: "#d55e00",
  yellow: "#f0e442",
} as const;

/** Translucent fill for a given row-highlight color -- each highlighted row
 * now carries its OWN color (see CompareDialog's highlightedKeys, a
 * bandKey -> hex Map instead of a plain Set) rather than always the same
 * fixed amber. */
export function hexToRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
export const WIN_COLOR = OKABE_ITO.bluishGreen;
export const WORST_COLOR = OKABE_ITO.vermillion;

/** Relative-luminance based pick between dark ink and white text -- so a
 * postit's text color always follows its background instead of assuming
 * dark text is always safe (it isn't, e.g. on the darker Okabe-Ito swatches
 * -- this is what "black text on pink is hard to read" was pointing at).
 * Not full sRGB gamma correction (overkill for a UI contrast heuristic), a
 * standard perceptual-weighted average is enough to pick the right side. */
export function pickTextColor(hex: string): string {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return luminance > 0.55 ? "#1c2541" : "#ffffff";
}

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

function unionFieldKeys(
  perPinRows: (Array<{ key: string; value: string }> | undefined)[],
): string[] {
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

function valueMap(
  rows: Array<{ key: string; value: string }> | undefined,
): Map<string, string> {
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
export function planComparePins(
  pins: ComparePinData[],
  hasTitle: boolean,
): ComparePlan {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.textBaseline = "alphabetic";

  const contentW = COL_WIDTH - PAD_X * 2;
  const labelW = Math.round(contentW * 0.38);
  // Subtracts BOX_PAD on BOTH sides -- the box itself is only `contentW`
  // wide, and rows are drawn starting at `x + BOX_PAD`, so a value column
  // sized off `contentW` alone (missing the box's own right-side padding)
  // could use its full wrap width and still overflow the box's right edge
  // by exactly BOX_PAD. This is what let long values (e.g. Base Materials)
  // spill past their box.
  const valueW = contentW - BOX_PAD * 2 - labelW - 10;
  const topY = hasTitle ? TITLE_H : 0;
  const rowBands: CompareRowBand[] = [];

  ctx.font = "400 12px Inter, sans-serif";
  const headerLines = Math.max(
    ...pins.map((p) => wrapText(ctx, p.title, contentW).length),
    1,
  );
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
      maxValueLines = Math.max(
        maxValueLines,
        wrapText(ctx, p.origin.value, valueW).length,
      );
    }
    const rowH = Math.max(labelLines, maxValueLines, 1) * ROW_LINE_H + ROW_GAP;
    const boxH = rowH - ROW_GAP + BOX_PAD * 2;
    rowBands.push({ key: "origin", y, height: boxH });
    sections.push({
      title: null,
      y,
      boxHeight: boxH,
      rows: {
        keys: [key],
        labels: new Map([[key, key]]),
        values,
        heights: [rowH],
      },
      layers: null,
      text: null,
    });
    y += boxH + SECTION_GAP;
  }

  for (const title of unionSectionTitles(pins)) {
    const perPin = pins.map((p) => p.sections.find((s) => s.title === title));

    const rowKeys = unionFieldKeys(perPin.map((s) => s?.rows));
    const rowLabels = new Map<string, string>();
    for (const s of perPin)
      if (s?.rows)
        for (const r of s.rows)
          if (!rowLabels.has(r.key)) rowLabels.set(r.key, r.key);
    const rowValues = perPin.map((s) => valueMap(s?.rows));
    const rowHeights: number[] = [];
    let rowsHeight = 0;
    for (const key of rowKeys) {
      ctx.font = LABEL_FONT;
      const labelLines = wrapText(ctx, key, labelW).length;
      ctx.font = VALUE_FONT;
      let maxValueLines = 1;
      for (const vm of rowValues)
        maxValueLines = Math.max(
          maxValueLines,
          wrapText(ctx, vm.get(key) ?? "—", valueW).length,
        );
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
      rowBands.push({
        key: `${title}:${rowKeys[i]}`,
        y: cursor,
        height: rowHeights[i],
      });
      cursor += rowHeights[i];
    }
    const layersY = cursor - sectionY;
    if (hasLayers) {
      rowBands.push({
        key: `${title}:layers`,
        y: cursor,
        height: layersHeight,
      });
      cursor += layersHeight;
    }
    const textY = cursor - sectionY;
    if (hasText)
      rowBands.push({ key: `${title}:text`, y: cursor, height: textHeight });

    sections.push({
      title,
      y,
      boxHeight: boxH,
      rows: rowKeys.length
        ? {
            keys: rowKeys,
            labels: rowLabels,
            values: rowValues,
            heights: rowHeights,
          }
        : null,
      layers: hasLayers
        ? {
            perPin: perPin.map((s) => s?.layers),
            y: layersY,
            height: layersHeight,
          }
        : null,
      text: hasText
        ? { perPin: textLinesPerPin, y: textY, height: textHeight }
        : null,
    });

    y += SECTION_TITLE_H + boxH + SECTION_GAP;
  }

  const width = pins.length * COL_WIDTH + (pins.length - 1) * COL_GAP;
  return { width, height: y, headerHeight, hasTitle, sections, rowBands };
}

function drawBoxBg(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = BOX_BG;
  ctx.strokeStyle = BORDER;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 8);
  ctx.fill();
  ctx.stroke();
}

function drawRowAt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
  key: string,
  value: string,
  valueColor: string = VALUE_COLOR,
  marker: string | null = null,
) {
  ctx.font = LABEL_FONT;
  ctx.fillStyle = LABEL_COLOR;
  wrapText(ctx, key, labelW).forEach((line, i) =>
    ctx.fillText(line, x, y + 11 + i * ROW_LINE_H),
  );
  ctx.font = VALUE_FONT;
  ctx.fillStyle = valueColor;
  const displayValue = marker ? `${value} ${marker}` : value;
  wrapText(ctx, displayValue, valueW).forEach((line, i) =>
    ctx.fillText(line, x + labelW + 10, y + 11 + i * ROW_LINE_H),
  );
}

function drawLayerStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  layers: StructureLayer[],
) {
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

/** Which pin indices hold the best/worst value for ONE metric row, read
 * straight off ComparePinData (not the plan) since that's where the raw
 * per-pin values already live. Sets, not single indices -- two (or more)
 * pins can genuinely share the exact same value, and silently crowning only
 * the first one "best" while its equally-good twin got no marker at all
 * (see drawComparePins, which renders "=" for anything in a set with more
 * than one member) misrepresented a tie as one pin beating the other. */
function computeBestWorstOne(
  pins: ComparePinData[],
  bestWorst: { key: string; direction: "higher" | "lower" },
): { bestIndices: Set<number>; worstIndices: Set<number> } {
  const values: (number | null)[] = pins.map((p) => {
    for (const s of p.sections) {
      const row = s.rows?.find((r) => r.key === bestWorst.key);
      if (row) return parseMetricNumber(row.value);
    }
    return null;
  });
  const bestIndices = new Set<number>();
  const worstIndices = new Set<number>();
  const nonNull = values.filter((v): v is number => v !== null);
  if (nonNull.length === 0) return { bestIndices, worstIndices };
  const bestVal =
    bestWorst.direction === "higher"
      ? Math.max(...nonNull)
      : Math.min(...nonNull);
  const worstVal =
    bestWorst.direction === "higher"
      ? Math.min(...nonNull)
      : Math.max(...nonNull);
  values.forEach((v, i) => {
    if (v === bestVal) bestIndices.add(i);
  });
  values.forEach((v, i) => {
    // Skips anything already counted as best -- this is what collapses
    // worstIndices to empty when EVERY pin shares the same value
    // (bestVal === worstVal, e.g. only one pin has this metric at all, or
    // every compared pin happens to match), instead of double-marking the
    // same pin as both best and worst.
    if (v !== null && v !== bestVal && v === worstVal) worstIndices.add(i);
  });
  return { bestIndices, worstIndices };
}

/** Same, but for every metric the "Highlight best/worst by" pills currently
 * have active at once (see CompareDialog) -- each metric only ever drives
 * ITS OWN row's coloring (looked up by key while drawing that row), so
 * multiple active metrics never collide with each other even when they land
 * on the same pin. */
function computeBestWorst(
  pins: ComparePinData[],
  bestWorst: { key: string; direction: "higher" | "lower" }[],
): Map<string, { bestIndices: Set<number>; worstIndices: Set<number> }> {
  const map = new Map<
    string,
    { bestIndices: Set<number>; worstIndices: Set<number> }
  >();
  for (const bw of bestWorst) map.set(bw.key, computeBestWorstOne(pins, bw));
  return map;
}

/** Pre-translated labels for the Measured/Simulated badge (see
 * CompareDialog, which owns i18n -- this module never calls t() itself, the
 * same way section titles already arrive pre-translated). */
export interface CompareLabels {
  measured: string;
  simulated: string;
}

/** Small rounded pill + hand-drawn glyph (checkmark for measured, a tilde
 * for simulated/approximate) instead of a tiny "●"/"○" dot -- the dot was
 * barely legible at this size and carried meaning through color alone.
 * Colors come from computeBestWorst's own win/measured color (bluishGreen)
 * and the app's own primary blue for simulated, so text color is picked via
 * pickTextColor rather than assumed. */
function drawOriginBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  label: string,
  measured: boolean,
): void {
  const bg = measured ? WIN_COLOR : OKABE_ITO.blue;
  const textColor = pickTextColor(bg);
  const glyphW = 11;
  const gap = 4;
  const padX = 6;
  const h = 15;
  ctx.font = "700 9px Inter, sans-serif";
  const textW = ctx.measureText(label).width;
  const w = padX * 2 + glyphW + gap + textW;

  ctx.save();
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();

  ctx.strokeStyle = textColor;
  ctx.lineWidth = 1.4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const gx = x + padX;
  const gy = y + h / 2;
  ctx.beginPath();
  if (measured) {
    ctx.moveTo(gx, gy);
    ctx.lineTo(gx + 3, gy + 3);
    ctx.lineTo(gx + 9, gy - 4);
  } else {
    ctx.moveTo(gx, gy);
    ctx.bezierCurveTo(gx + 2.5, gy - 4, gx + 6, gy + 4, gx + 9, gy - 2);
  }
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.fillText(label, gx + glyphW + gap, gy + 3);
  ctx.restore();
}

/**
 * Draws a previously computed plan onto ctx -- pure drawing, no measuring, so
 * it's cheap enough to call on every highlight/title change from an
 * interactive on-screen canvas (see CompareDialog) as well as for the
 * one-shot PNG export below.
 */
export function drawComparePins(
  ctx: CanvasRenderingContext2D,
  pins: ComparePinData[],
  plan: ComparePlan,
  title: string | null,
  highlightedKeys: Map<string, string>,
  bestWorst: { key: string; direction: "higher" | "lower" }[] = [],
  labels: CompareLabels | null = null,
): void {
  const contentW = COL_WIDTH - PAD_X * 2;
  const labelW = Math.round(contentW * 0.38);
  const valueW = contentW - BOX_PAD * 2 - labelW - 10; // see planComparePins for why BOX_PAD*2
  const bestWorstByKey = computeBestWorst(pins, bestWorst);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, plan.width, plan.height);

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
    const refWidth = ctx.measureText(pin.ref).width;

    if (labels && pin.origin) {
      const originValue = pin.origin.value.trim().toUpperCase();
      if (originValue === "EXP" || originValue === "SIM") {
        const measured = originValue === "EXP";
        drawOriginBadge(
          ctx,
          x + refWidth + 10,
          topY + 3,
          measured ? labels.measured : labels.simulated,
          measured,
        );
      }
    }

    ctx.font = "400 12px Inter, sans-serif";
    ctx.fillStyle = "#1c2541";
    wrapText(ctx, pin.title, contentW).forEach((line, li) =>
      ctx.fillText(line, x, topY + 24 + 12 + li * 16),
    );

    for (const section of plan.sections) {
      if (section.title) {
        ctx.font = "700 9px Inter, sans-serif";
        ctx.fillStyle = "#3a506b";
        ctx.fillText(section.title.toUpperCase(), x, section.y + 9);
      }
      const boxY = section.title ? section.y + SECTION_TITLE_H : section.y;
      drawBoxBg(ctx, colX + PAD_X, boxY, contentW, section.boxHeight);

      // Defensive clip on top of the (already fixed) valueW math above --
      // whatever gets drawn inside this box can never visually escape it,
      // regardless of any future measurement edge case.
      ctx.save();
      ctx.beginPath();
      ctx.rect(colX + PAD_X, boxY, contentW, section.boxHeight);
      ctx.clip();

      if (section.rows) {
        let ry = boxY + BOX_PAD;
        const pinValues = section.rows.values[i];
        for (let k = 0; k < section.rows.keys.length; k++) {
          const key = section.rows.keys[k];
          const value = pinValues.get(key) ?? "—";
          let valueColor = VALUE_COLOR;
          let marker: string | null = null;
          const bw = bestWorstByKey.get(key);
          if (bw) {
            // A set with more than one member means two-plus pins are tied
            // for that spot -- "=" instead of a lone ▲/▽ that would wrongly
            // claim one of them beat the other.
            if (bw.bestIndices.has(i)) {
              valueColor = WIN_COLOR;
              marker = bw.bestIndices.size > 1 ? "=" : "▲";
            } else if (bw.worstIndices.has(i)) {
              valueColor = WORST_COLOR;
              marker = bw.worstIndices.size > 1 ? "=" : "▽";
            }
          }
          drawRowAt(
            ctx,
            x + BOX_PAD,
            ry,
            labelW,
            valueW,
            section.rows.labels.get(key)!,
            value,
            valueColor,
            marker,
          );
          ry += section.rows.heights[k];
        }
      }
      if (section.layers) {
        const layers = section.layers.perPin[i];
        if (layers && layers.length > 0)
          drawLayerStack(
            ctx,
            x + BOX_PAD,
            boxY + section.layers.y,
            contentW - BOX_PAD * 2,
            layers,
          );
      }
      if (section.text) {
        const lines = section.text.perPin[i];
        if (lines) {
          ctx.font = "400 11px 'IBM Plex Mono', monospace";
          ctx.fillStyle = "#3a506b";
          lines.forEach((line, li) =>
            ctx.fillText(
              line,
              x + BOX_PAD,
              boxY + section.text!.y + 11 + li * ROW_LINE_H,
            ),
          );
        }
      }
      ctx.restore(); // matches the per-box clip save() above
    }
  });

  // Drawn LAST, on top of everything -- a highlighted row is meant to sit
  // over the content like a real highlighter marker over printed text.
  // Drawing this earlier (before the boxes/text above) put it fully behind
  // each section's opaque box background, making it invisible.
  if (highlightedKeys.size > 0) {
    for (const band of plan.rowBands) {
      const color = highlightedKeys.get(band.key);
      if (!color) continue;
      ctx.fillStyle = hexToRgba(color, 0.22);
      ctx.beginPath();
      ctx.roundRect(4, band.y - 3, plan.width - 8, band.height + 3, 6);
      ctx.fill();
    }
  }
}

/**
 * One-shot render used where no interactivity is needed -- the user guide's
 * static compare preview (see AnnotationsPanel's getComparePngDataUrl).
 * CompareDialog's own live preview instead calls planComparePins +
 * drawComparePins directly against an on-screen canvas (see its
 * renderContent), since it also needs the plan's rowBands for hit-testing.
 */
export function renderComparePng(
  title: string | null,
  pins: ComparePinData[],
  highlightedKeys: Map<string, string> = new Map(),
  bestWorst: { key: string; direction: "higher" | "lower" }[] = [],
  labels: CompareLabels | null = null,
): string | null {
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
  drawComparePins(ctx, pins, plan, title, highlightedKeys, bestWorst, labels);

  return canvas.toDataURL("image/png");
}

// ---------------------------------------------------------------------------
// Typed annotation objects -- frame/ellipse, arrow, post-it and stamps, drawn
// on CompareDialog's separate ink canvas (see its redrawInk). Unlike the pen
// tool (kept as raw pixel strokes -- freehand marks have no natural anchor)
// these anchor to a pin's ref plus a PERCENTAGE position within that pin's
// column box, not an absolute canvas pixel. That's what lets them survive
// reordering the compared columns: resolveAnchor below looks the pin up by
// ref every time it draws/hit-tests, wherever that column currently sits.
// If a pin is removed from the comparison entirely, its annotations simply
// stop drawing (resolveAnchor returns null) rather than being deleted --
// re-adding the same point brings them back, which matches a user's likely
// expectation ("I didn't touch that annotation, I just hid the column").
// ---------------------------------------------------------------------------

export type StampKind = "favorite" | "validated" | "exclude";

// Okabe-Ito again (see the palette block near the top of this file) -- these
// were an arbitrary amber/pink/mint/sky set before, not colorblind-safe and
// not related to the app's own palette.
export const ANNOTATION_COLORS = [
  OKABE_ITO.blue,
  OKABE_ITO.orange,
  OKABE_ITO.bluishGreen,
  OKABE_ITO.reddishPurple,
];
export const STAMP_COLORS: Record<StampKind, string> = {
  favorite: OKABE_ITO.orange,
  validated: OKABE_ITO.bluishGreen,
  exclude: OKABE_ITO.vermillion,
};
export const PEN_WIDTH = 8;
// Exported -- CompareDialog's Konva layer lays out the postit rect/text nodes
// itself (Konva has no equivalent of this module's canvas-based measurement),
// so it reuses these exact constants/formula instead of guessing its own.
export const POSTIT_W = 132;
export const POSTIT_LINE_H = 14;
export const POSTIT_MIN_H = 46;
export const STAMP_R = 12;

interface AnnotationBase {
  id: string;
  color: string;
}

// bandKey ties an annotation to the specific row/section it was placed
// next to (see CompareRowBand) instead of the column as a whole -- yPct is
// a fraction of THAT band's height, not the whole column's. This is what
// lets an annotation stay glued to its row when some OTHER section is
// toggled off/on and the column's total height changes: a plain fraction
// of total height drifted proportionally with every layout change, even
// for rows nowhere near the one that was actually toggled. null means no
// row band was under the click when it was created (e.g. dropped on the
// title bar) -- falls back to the old whole-column fraction for that rare
// case. When the band itself is hidden (its section got toggled off),
// resolveAnchor returns null and the annotation simply stops drawing --
// same "stop drawing, don't delete" behavior as removing a compared pin.
export type PenAnnotation = AnnotationBase & {
  type: "pen";
  points: { x: number; y: number }[];
};
export type FrameAnnotation = AnnotationBase & {
  type: "frame";
  pinRef: string;
  bandKey: string | null;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
};
export type ArrowAnnotation = AnnotationBase & {
  type: "arrow";
  pinRef: string;
  bandKey: string | null;
  x1Pct: number;
  y1Pct: number;
  x2Pct: number;
  y2Pct: number;
};
// width/height are per-note (resizable via a drag handle -- see
// CompareDialog), defaulting to POSTIT_W/POSTIT_MIN_H for any note created
// before that existed. height is a MINIMUM, not a fixed box -- if the text
// wraps taller than the stored height (e.g. after editing in more text, or
// shrinking the width), the note still grows to fit it; see postitHeight.
export type PostitAnnotation = AnnotationBase & {
  type: "postit";
  pinRef: string;
  bandKey: string | null;
  xPct: number;
  yPct: number;
  text: string;
  width: number;
  height: number;
};
// Freely placed exactly where clicked (xPct/yPct), same as frame/arrow/
// postit -- previously stamps always landed in the column's top-right
// corner and stacked downward for a second/third stamp on the same column,
// which didn't let a stamp point at a specific value.
export type StampAnnotation = AnnotationBase & {
  type: "stamp";
  pinRef: string;
  bandKey: string | null;
  kind: StampKind;
  xPct: number;
  yPct: number;
};
// Always horizontal (a single yPct, not two) -- this is meant to underline a
// specific value/word, not a free diagonal line like the pen; locking the Y
// while dragging (see CompareDialog's onStageMouseMove) is what keeps it
// reading as an underline instead of an arbitrary stroke.
export type UnderlineAnnotation = AnnotationBase & {
  type: "underline";
  pinRef: string;
  bandKey: string | null;
  x1Pct: number;
  x2Pct: number;
  yPct: number;
};
export type CompareAnnotation =
  | PenAnnotation
  | FrameAnnotation
  | ArrowAnnotation
  | PostitAnnotation
  | StampAnnotation
  | UnderlineAnnotation;
/** Annotation types anchored to a single point (as opposed to a shape/path)
 * -- these are the ones the Pointer tool can drag to reposition (see
 * CompareDialog's drag handling). */
export type MovableAnnotation = PostitAnnotation | StampAnnotation;

function pinIndexByRef(pins: ComparePinData[], ref: string): number {
  return pins.findIndex((p) => p.ref === ref);
}

/** A pin's column, expressed as the (x, y, w, h) reference frame that every
 * xPct/yPct/wPct/hPct above is relative to. `bandKey` (when given) narrows
 * the vertical reference frame down to just that row band's own (y, height)
 * instead of the whole column -- this is what makes an annotation immune to
 * OTHER sections being toggled on/off (see the CompareAnnotation types
 * above). Returns null if a bandKey was given but that band isn't in the
 * current plan (its section is hidden right now). */
export function resolveAnchor(
  pins: ComparePinData[],
  plan: ComparePlan,
  pinRef: string,
  bandKey?: string | null,
): { x: number; y: number; w: number; h: number } | null {
  const i = pinIndexByRef(pins, pinRef);
  if (i === -1) return null;
  const x = i * (COL_WIDTH + COL_GAP);
  if (bandKey) {
    const band = plan.rowBands.find((b) => b.key === bandKey);
    if (!band) return null;
    return { x, y: band.y, w: COL_WIDTH, h: band.height };
  }
  return { x, y: 0, w: COL_WIDTH, h: plan.height };
}

function drawArrowShape(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
) {
  const headLen = 10;
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(
    x2 - headLen * Math.cos(angle - Math.PI / 6),
    y2 - headLen * Math.sin(angle - Math.PI / 6),
  );
  ctx.lineTo(
    x2 - headLen * Math.cos(angle + Math.PI / 6),
    y2 - headLen * Math.sin(angle + Math.PI / 6),
  );
  ctx.closePath();
  ctx.fill();
}

export function postitHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number = POSTIT_W,
): number {
  ctx.font = "400 11px Inter, sans-serif";
  const lines = wrapText(ctx, text, width - 16);
  return Math.max(POSTIT_MIN_H, lines.length * POSTIT_LINE_H + 20);
}

function drawPostitShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  text: string,
  color: string,
  width: number,
  height: number,
) {
  const h = Math.max(height, postitHeight(ctx, text, width));
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(28,37,65,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, h, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(28,20,10,0.8)";
  ctx.font = "400 11px Inter, sans-serif";
  wrapText(ctx, text, width - 16).forEach((line, i) =>
    ctx.fillText(line, x + 8, y + 18 + i * POSTIT_LINE_H),
  );
  ctx.restore();
}

function drawStarShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
) {
  const points = 5;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const px = cx + r * Math.cos(a);
    const py = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawStampShape(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  kind: StampKind,
  color: string,
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "#1c2541";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, STAMP_R, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (kind === "validated") {
    ctx.beginPath();
    ctx.moveTo(cx - 5, cy);
    ctx.lineTo(cx - 1.5, cy + 4);
    ctx.lineTo(cx + 5.5, cy - 4.5);
    ctx.stroke();
  } else if (kind === "exclude") {
    ctx.beginPath();
    ctx.moveTo(cx - 4.5, cy - 4.5);
    ctx.lineTo(cx + 4.5, cy + 4.5);
    ctx.moveTo(cx + 4.5, cy - 4.5);
    ctx.lineTo(cx - 4.5, cy + 4.5);
    ctx.stroke();
  } else {
    drawStarShape(ctx, cx, cy, 5.5, 2.5);
    ctx.fill();
  }
  ctx.restore();
}

/** Where a freely-placed stamp renders -- single source both
 * drawCompareAnnotations and hitTestAnnotation use, so they can never
 * disagree. Same xPct/yPct-of-column resolution as frame/arrow/postit. */
export function stampCenter(
  pins: ComparePinData[],
  plan: ComparePlan,
  stamp: StampAnnotation,
): { x: number; y: number } | null {
  const anchor = resolveAnchor(pins, plan, stamp.pinRef, stamp.bandKey);
  if (!anchor) return null;
  return {
    x: anchor.x + stamp.xPct * anchor.w,
    y: anchor.y + stamp.yPct * anchor.h,
  };
}

export function drawCompareAnnotations(
  ctx: CanvasRenderingContext2D,
  annotations: CompareAnnotation[],
  pins: ComparePinData[],
  plan: ComparePlan,
): void {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const a of annotations) {
    if (a.type === "pen") {
      if (a.points.length === 0) continue;
      ctx.strokeStyle = a.color;
      ctx.fillStyle = a.color;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = PEN_WIDTH;
      if (a.points.length === 1) {
        ctx.beginPath();
        ctx.arc(a.points[0].x, a.points[0].y, PEN_WIDTH / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(a.points[0].x, a.points[0].y);
        for (const pt of a.points.slice(1)) ctx.lineTo(pt.x, pt.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      continue;
    }

    const anchor = resolveAnchor(pins, plan, a.pinRef, a.bandKey);
    if (!anchor) continue;

    if (a.type === "frame") {
      const x = anchor.x + a.xPct * anchor.w;
      const y = anchor.y + a.yPct * anchor.h;
      const w = a.wPct * anchor.w;
      const h = a.hPct * anchor.h;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(
        x + w / 2,
        y + h / 2,
        Math.max(4, Math.abs(w) / 2),
        Math.max(4, Math.abs(h) / 2),
        0,
        0,
        Math.PI * 2,
      );
      ctx.stroke();
    } else if (a.type === "arrow") {
      drawArrowShape(
        ctx,
        anchor.x + a.x1Pct * anchor.w,
        anchor.y + a.y1Pct * anchor.h,
        anchor.x + a.x2Pct * anchor.w,
        anchor.y + a.y2Pct * anchor.h,
        a.color,
      );
    } else if (a.type === "postit") {
      drawPostitShape(
        ctx,
        anchor.x + a.xPct * anchor.w,
        anchor.y + a.yPct * anchor.h,
        a.text,
        a.color,
        a.width,
        a.height,
      );
    } else if (a.type === "stamp") {
      const center = stampCenter(pins, plan, a);
      if (center)
        drawStampShape(ctx, center.x, center.y, a.kind, STAMP_COLORS[a.kind]);
    } else if (a.type === "underline") {
      const y = anchor.y + a.yPct * anchor.h;
      ctx.strokeStyle = a.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(anchor.x + a.x1Pct * anchor.w, y);
      ctx.lineTo(anchor.x + a.x2Pct * anchor.w, y);
      ctx.stroke();
    }
  }
}

// ---------------------------------------------------------------------------
// Best/worst metric + abbreviation legend -- both scan the ALREADY-FORMATTED
// row keys/values on ComparePinData (produced upstream from this app's real
// columns, see annotationCardData.ts), so they only ever surface metrics
// this app actually knows about instead of guessing at fields that don't
// exist here.
// ---------------------------------------------------------------------------

interface MetricPattern {
  id: string;
  pattern: RegExp;
  direction: "higher" | "lower";
}

// Mirrors columnTypes.ts's findSensitivityColumn/findQFactorColumn/
// findFwhmColumn/findFomValueColumn regexes -- applied here to the
// formatUnitSuperscripts-formatted row key text (which keeps the same
// matched words, just adds unit superscripts), not the raw column name.
// Only decides the higher/lower DIRECTION for a candidate that's already
// been offered by candidateBestWorstKeys below -- unmatched candidates (e.g.
// Resonance Wavelength, which has no universal "better" value) default to
// "higher" via metricDirection's own fallback rather than being excluded
// outright; the user can simply not pick one that doesn't make sense here.
const METRIC_PATTERNS: MetricPattern[] = [
  { id: "sensitivity", pattern: /sensitivity/i, direction: "higher" },
  { id: "qFactor", pattern: /q[-\s]?factor/i, direction: "higher" },
  { id: "fom", pattern: /\bfom\b/i, direction: "higher" },
  { id: "fwhm", pattern: /\bfwhm\b/i, direction: "lower" },
];

export function metricDirection(key: string): "higher" | "lower" {
  return (
    METRIC_PATTERNS.find((m) => m.pattern.test(key))?.direction ?? "higher"
  );
}

// Whole-string numeric test used ONLY to decide candidacy below -- deliberately
// stricter than parseMetricNumber's own substring search (which is meant to
// pull a number out of an already-known-numeric cell, trailing unit and all).
// A chemical formula like "Si3N4;SiO2" contains digits too; parseMetricNumber
// happily extracts "3" from it, which would make Base Materials a bogus
// best/worst candidate. Requiring the ENTIRE trimmed value to be a number
// (no material codes, no partial matches) is what keeps candidates to actual
// numeric measurement cells.
const WHOLE_NUMBER_RE = /^-?\d+(?:\.\d+)?(?:[eE]-?\d+)?$/;

// A numeric row that's still not a real "best/worst" candidate -- Mode ID is
// a plain integer identifier (1, 2, 3...), not a measured quantity, so a
// higher or lower one is never actually "better". Same literal-English-key
// matching as METRIC_PATTERNS above (row keys are raw dataset column names,
// not translated UI text, so this works the same regardless of app locale).
const EXCLUDED_CANDIDATE_PATTERNS: RegExp[] = [/mode\s*id/i];

/** Row keys -- among every compared pin's sections -- offered as candidates
 * for "Highlight best/worst by" (see CompareDialog). Any row where at least
 * one pin's value is ENTIRELY a number counts (not just the fields matched by
 * METRIC_PATTERNS above), so this doesn't need its own allowlist of "known"
 * metric names to stay predictable, MINUS the small denylist above for
 * numeric fields that aren't really measurements. METRIC_PATTERNS still
 * decides the higher/lower DIRECTION for a candidate once picked (see
 * metricDirection), defaulting the rest to "higher is better". */
export function candidateBestWorstKeys(pins: ComparePinData[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const pin of pins) {
    for (const section of pin.sections) {
      if (!section.rows) continue;
      for (const row of section.rows) {
        if (seen.has(row.key)) continue;
        if (EXCLUDED_CANDIDATE_PATTERNS.some((p) => p.test(row.key))) continue;
        if (WHOLE_NUMBER_RE.test(row.value.trim())) {
          seen.add(row.key);
          keys.push(row.key);
        }
      }
    }
  }
  return keys;
}

/** Best-effort numeric read of a formatted metric cell (e.g. "48000",
 * "1.2e6", "0.32"). Returns null for a range ("1.33-1.40"), a dash, or free
 * text -- which simply excludes that pin from the best/worst comparison
 * rather than guessing at what it means. */
export function parseMetricNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "" || trimmed === "—" || trimmed === "-") return null;
  if (/[–—]|\.\.|\bto\b/i.test(trimmed)) return null;
  const match = trimmed.match(/-?\d+(?:\.\d+)?(?:[eE]-?\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}
