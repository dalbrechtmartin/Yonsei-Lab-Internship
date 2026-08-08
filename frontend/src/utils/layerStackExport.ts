import {
  layerLabel,
  materialColor,
  type StructureLayer,
} from "./layerStructure";

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

  const known = layers
    .map((l) => l.thicknessNm)
    .filter((v): v is number => v !== null);
  const min = known.length ? Math.min(...known) : 0;
  const max = known.length ? Math.max(...known) : 0;
  const heightFor = (l: StructureLayer): number => {
    if (l.thicknessNm === null || known.length === 0 || max === min)
      return minRowH;
    return Math.round(
      minRowH + ((l.thicknessNm - min) / (max - min)) * extraRowH,
    );
  };
  const rowHeights = layers.map(heightFor);
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

  ctx.textBaseline = "alphabetic";
  ctx.font = "700 13px 'IBM Plex Mono', monospace";
  ctx.fillStyle = "#0072b2";
  ctx.fillText(source.ref, padX, 22);
  ctx.font = "400 12px Inter, sans-serif";
  ctx.fillStyle = "#52616b";
  const titleMaxWidth = width - padX * 2;
  let title = source.title;
  while (ctx.measureText(title).width > titleMaxWidth && title.length > 1) {
    title = title.slice(0, -1);
  }
  if (title !== source.title) title = title.replace(/.{3}$/, "...");
  ctx.fillText(title, padX, 38);

  ctx.strokeStyle = "rgba(58,80,107,0.2)";
  ctx.beginPath();
  ctx.moveTo(padX, headerH - 8);
  ctx.lineTo(width - padX, headerH - 8);
  ctx.stroke();

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
      let value = f.value;
      while (
        ctx.measureText(value).width > width - padX - (padX + labelW) &&
        value.length > 1
      ) {
        value = value.slice(0, -1);
      }
      if (value !== f.value) value = value.replace(/.{3}$/, "...");
      ctx.fillText(value, padX + labelW, ry);
    });
    y += extraH;
  }

  const barW = width - padX * 2;
  layers.forEach((layer, i) => {
    const h = rowHeights[i];
    const color = materialColor(layer.material);
    ctx.fillStyle = color;
    ctx.fillRect(padX, y, barW, h);
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.strokeRect(padX, y, barW, h);

    const label = layerLabel(layer);
    ctx.font = "600 12px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillText(label, padX + 10, y + h / 2 + 4);

    y += h;
  });

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `layer_structure_${source.ref.replace(/[^a-z0-9_-]+/gi, "_")}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
