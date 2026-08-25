import { drawExportHeader, ellipsisTruncate } from "./layerStackExport";
import { downloadDataUrl } from "./saveFile";

/**
 * Renders a pinned point's metric/tag fields (Origin, Material Class,
 * Sensitivity, ...) as a label/value list onto a canvas -- same approach as
 * layerStackExport's exportLayerStackPng, with a header identifying which
 * paper/mode the values came from so the image is self-contained once it
 * leaves the app. Returns the canvas's data URL, or null if 2D canvas isn't
 * available.
 */
export function renderFieldListPng(
  source: { ref: string; title: string },
  fields: { key: string; value: string }[],
): string | null {
  const width = 440;
  const padX = 20;
  const headerH = 56;
  const rowH = 26;
  const height = headerH + rowH * fields.length + padX;

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

  drawExportHeader(ctx, source, width, padX, headerH);

  const labelW = 150;
  fields.forEach((f, i) => {
    const y = headerH + rowH * i + rowH / 2 + 4;
    ctx.font = "400 11px Inter, sans-serif";
    ctx.fillStyle = "#52616b";
    ctx.fillText(f.key, padX, y);
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#1c2541";
    const value = ellipsisTruncate(
      ctx,
      f.value,
      width - padX - (padX + labelW),
    );
    ctx.fillText(value, padX + labelW, y);
  });

  return canvas.toDataURL("image/png");
}

/** Downloads the metric/tag field list as a PNG file -- see renderFieldListPng. */
export function exportFieldListPng(
  source: { ref: string; title: string },
  fields: { key: string; value: string }[],
  filename?: string,
): void {
  const url = renderFieldListPng(source, fields);
  if (!url) return;
  downloadDataUrl(
    url,
    filename ?? `annotation_${source.ref.replace(/[^a-z0-9_-]+/gi, "_")}.png`,
  );
}
