import type { DataRow } from "./columnTypes";

/**
 * Exports rows as a downloaded CSV file. Given the same shape the API
 * already returns ({ columns, data }), so both VisualizationView and any
 * future extraction export can call this directly.
 */
export function exportRowsAsCsv(
  columns: string[],
  rows: DataRow[],
  filename = "export.csv",
): void {
  if (!rows.length) return;

  const header = columns.join(",");
  const csvRows = rows.map((row) =>
    columns
      .map((col) => {
        const val = row[col] ?? "";
        const escaped = String(val).replace(/"/g, '""');
        return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
      })
      .join(","),
  );
  const csvContent = [header, ...csvRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}