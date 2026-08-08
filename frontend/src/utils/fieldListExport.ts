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

  ctx.textBaseline = "alphabetic";
  ctx.font = "700 13px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#0072b2";
  ctx.fillText(source.ref, padX, 22);
  ctx.font = "400 12px Inter, sans-serif";
  ctx.fillStyle = "#52616b";
  const maxWidth = width - padX * 2;
  let title = source.title;
  while (ctx.measureText(title).width > maxWidth && title.length > 1) {
    title = title.slice(0, -1);
  }
  if (title !== source.title) title = title.replace(/.{3}$/, "...");
  ctx.fillText(title, padX, 38);

  ctx.strokeStyle = "rgba(58,80,107,0.2)";
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 8);
  ctx.lineTo(width - padX, headerH - 8);
  ctx.stroke();

  const labelW = 150;
  fields.forEach((f, i) => {
    const y = headerH + rowH * i + rowH / 2 + 4;
    ctx.font = "400 11px Inter, sans-serif";
    ctx.fillStyle = "#52616b";
    ctx.fillText(f.key, padX, y);
    ctx.font = '600 12px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#1c2541";
    let value = f.value;
    while (
      ctx.measureText(value).width > width - padX - (padX + labelW) &&
      value.length > 1
    ) {
      value = value.slice(0, -1);
    }
    if (value !== f.value) value = value.replace(/.{3}$/, "...");
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
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ?? `annotation_${source.ref.replace(/[^a-z0-9_-]+/gi, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
