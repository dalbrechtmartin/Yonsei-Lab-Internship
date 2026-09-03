import {
  darkenColor,
  layerLabel,
  materialColor,
  type StructureLayer,
} from "./layerStructure";
import { downloadDataUrl } from "./saveFile";

/**
 * Ellipsis-truncates `text` to fit `maxWidth` under ctx's current font --
 * shared by every canvas export that has to fit a paper title or a metric
 * value into a fixed-width column (this file's own header/rows, and
 * fieldListExport.ts's field values).
 */
export function ellipsisTruncate(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  let result = text;
  while (ctx.measureText(result).width > maxWidth && result.length > 1) {
    result = result.slice(0, -1);
  }
  return result === text ? result : result.replace(/.{3}$/, "...");
}

/**
 * Draws the reference (blue mono) + title (gray, ellipsis-truncated) +
 * divider line that every canvas PNG export in this app opens with, so the
 * image is self-contained about which paper/mode it came from once it
 * leaves the app. Shared by this file's own exportLayerStackPng and
 * fieldListExport.ts's renderFieldListPng.
 */
export function drawExportHeader(
  ctx: CanvasRenderingContext2D,
  source: { ref: string; title: string },
  width: number,
  padX: number,
  headerH: number,
): void {
  ctx.textBaseline = "alphabetic";
  ctx.font = "700 13px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#0072b2";
  ctx.fillText(source.ref, padX, 22);

  ctx.font = "400 12px Inter, sans-serif";
  ctx.fillStyle = "#52616b";
  ctx.fillText(ellipsisTruncate(ctx, source.title, width - padX * 2), padX, 38);

  ctx.strokeStyle = "rgba(58,80,107,0.2)";
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 8);
  ctx.lineTo(width - padX, headerH - 8);
  ctx.stroke();
}

/**
 * Row height for one layer in a stack diagram, proportional to its
 * thickness within the stack's own min/max (a layer with no stated
 * thickness, or a stack where every known thickness is equal, gets `minH`)
 * -- shared height math for compareExport's per-pin columns,
 * annotationExport's card layout, and this file's own standalone PNG
 * export. Each caller tunes minH/extraH to its own diagram scale, which is
 * why they're parameters rather than fixed constants.
 */
export function layerHeights(
  layers: StructureLayer[],
  minH = 26,
  extraH = 34,
): number[] {
  const known = layers
    .map((l) => l.thicknessNm)
    .filter((v): v is number => v !== null);
  const min = known.length ? Math.min(...known) : 0;
  const max = known.length ? Math.max(...known) : 0;
  return layers.map((l) => {
    if (l.thicknessNm === null || known.length === 0 || max === min)
      return minH;
    return Math.round(minH + ((l.thicknessNm - min) / (max - min)) * extraH);
  });
}

export interface LayerStackStyle {
  /** Width of the darkened side "edge" accent; 0 (default) draws a flat bar with no accent. */
  sideAccentW?: number;
  /** Height of the top color strip (first layer's material); 0 (default) omits it. */
  topStripH?: number;
  labelFont?: string;
  labelOffsetX?: number;
}

/**
 * Draws (or, with draw=false, only measures) a layer stack -- one filled/
 * outlined bar per layer, labeled via layerLabel -- the drawing math shared
 * by compareExport's per-pin columns, annotationExport's card layout, and
 * this file's own standalone PNG export. Those three render the stack with
 * slightly different chrome (a beveled side accent + top color strip for
 * the first two, a flat bar for this file's own export), controlled by
 * `style`. `heights` is precomputed by the caller (see layerHeights) since
 * compareExport/annotationExport measure with one set of constants and this
 * file's own export uses another. Returns the total height drawn so the
 * caller can advance its own layout cursor.
 */
export function drawLayerStack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  layers: StructureLayer[],
  heights: number[],
  style: LayerStackStyle = {},
  draw = true,
): number {
  const {
    sideAccentW = 0,
    topStripH = 0,
    labelFont = "600 11px 'IBM Plex Mono', monospace",
    labelOffsetX = 8,
  } = style;

  let iy = y;
  if (topStripH > 0) {
    if (draw) {
      ctx.fillStyle = materialColor(layers[0].material);
      ctx.fillRect(x, iy, width, topStripH);
    }
    iy += topStripH;
  }

  const mainW = width - sideAccentW;
  layers.forEach((layer, i) => {
    const h = heights[i];
    if (draw) {
      const color = materialColor(layer.material);
      ctx.fillStyle = color;
      ctx.fillRect(x, iy, mainW, h);
      if (sideAccentW > 0) {
        ctx.fillStyle = darkenColor(color, 40);
        ctx.fillRect(x + mainW, iy, sideAccentW, h);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.strokeRect(x, iy, width, h);
      ctx.font = labelFont;
      ctx.fillStyle = "rgba(0,0,0,0.72)";
      const label = ellipsisTruncate(
        ctx,
        layerLabel(layer),
        mainW - labelOffsetX - 6,
      );
      ctx.fillText(label, x + labelOffsetX, iy + h / 2 + 4);
    }
    iy += h;
  });

  return iy - y;
}

/**
 * Renders a pinned point's Layer Structure as a labeled stack diagram onto a
 * canvas and downloads it as a PNG -- same lightweight "draw on canvas, no
 * DOM-to-image library" approach as compareExport's exportComparePng, with a
 * header identifying which paper/mode the structure came from so the image
 * is self-contained once it leaves the app. `extraFields` (Material Class,
 * Base Materials) print as label/value lines between the header and the
 * stack -- they describe the same physical structure, so the export keeps
 * them on one image instead of a separate download per field.
 */
export function exportLayerStackPng(
  source: { ref: string; title: string },
  layers: StructureLayer[],
  extraFields: { key: string; value: string }[] = [],
  filename?: string,
): void {
  const width = 440;
  const padX = 20;
  const headerH = 56;
  const extraRowH2 = 22;
  const extraH =
    extraFields.length * extraRowH2 + (extraFields.length > 0 ? 8 : 0);
  const minRowH = 34;
  const extraRowH = 46;

  const rowHeights = layerHeights(layers, minRowH, extraRowH);
  const stackH = rowHeights.reduce((a, b) => a + b, 0);
  const height = headerH + extraH + stackH + padX;

  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);

  drawExportHeader(ctx, source, width, padX, headerH);

  let y = headerH;
  if (extraFields.length > 0) {
    const labelW = 110;
    extraFields.forEach((f, i) => {
      const ry = y + i * extraRowH2 + 14;
      ctx.font = "400 11px Inter, sans-serif";
      ctx.fillStyle = "#52616b";
      ctx.fillText(f.key, padX, ry);
      ctx.font = '600 12px "IBM Plex Mono", monospace';
      ctx.fillStyle = "#1c2541";
      const value = ellipsisTruncate(
        ctx,
        f.value,
        width - padX - (padX + labelW),
      );
      ctx.fillText(value, padX + labelW, ry);
    });
    y += extraH;
  }

  drawLayerStack(ctx, padX, y, width - padX * 2, layers, rowHeights, {
    labelFont: "600 12px 'IBM Plex Mono', monospace",
    labelOffsetX: 10,
  });

  const url = canvas.toDataURL("image/png");
  downloadDataUrl(
    url,
    filename ??
      `layer_structure_${source.ref.replace(/[^a-z0-9_-]+/gi, "_")}.png`,
  );
}
