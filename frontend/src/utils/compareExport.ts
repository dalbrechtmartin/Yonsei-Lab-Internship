import { utils, writeFile } from "xlsx";

export interface CompareRow {
  label: string;
  values: string[];
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCompareCsv(cols: string[], rows: CompareRow[], filename = "compare_pinned_points.csv"): void {
  const lines = [["", ...cols].map((c) => JSON.stringify(c)).join(",")].concat(
    rows.map((r) => [r.label, ...r.values].map((v) => JSON.stringify(v ?? "")).join(",")),
  );
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv" }), filename);
}

export function exportCompareXlsx(cols: string[], rows: CompareRow[], filename = "compare_pinned_points.xlsx"): void {
  const data = [["", ...cols], ...rows.map((r) => [r.label, ...r.values])];
  const worksheet = utils.aoa_to_sheet(data);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "Compare");
  writeFile(workbook, filename);
}

/**
 * Renders the compare table as a flat label/value grid onto a canvas and
 * downloads it as a PNG — a lightweight "image export" that doesn't require
 * pulling in a DOM-to-image library just for this one table.
 */
export function exportComparePng(cols: string[], rows: CompareRow[], filename = "compare_pinned_points.png"): void {
  const padX = 16;
  const padY = 12;
  const rowH = 26;
  const labelW = 130;
  const colW = 150;
  const width = labelW + colW * cols.length + padX * 2;
  const height = rowH * (rows.length + 1) + padY * 2;

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

  ctx.font = "700 12px Inter, sans-serif";
  ctx.fillStyle = "#0072b2";
  ctx.textBaseline = "middle";
  cols.forEach((c, i) => ctx.fillText(c, padX + labelW + i * colW, padY + rowH / 2));

  ctx.strokeStyle = "rgba(58,80,107,0.2)";
  ctx.beginPath();
  ctx.moveTo(padX, padY + rowH);
  ctx.lineTo(width - padX, padY + rowH);
  ctx.stroke();

  rows.forEach((r, ri) => {
    const y = padY + rowH * (ri + 1) + rowH / 2;
    ctx.font = "400 11px Inter, sans-serif";
    ctx.fillStyle = "#52616b";
    ctx.fillText(r.label, padX, y);
    ctx.font = '400 12px "IBM Plex Mono", monospace';
    ctx.fillStyle = "#1c2541";
    r.values.forEach((val, i) => ctx.fillText(String(val ?? ""), padX + labelW + i * colW, y));
  });

  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
