import type { DataRow } from "./columnTypes";

/**
 * Exports rows as a downloaded .csv file. Cells are JSON-stringified before
 * joining so commas/quotes/newlines inside a cell (e.g. a pasted abstract
 * sentence) round-trip safely instead of corrupting the CSV structure.
 */
export function exportRowsAsCsv(columns: string[], rows: DataRow[], filename = "export.csv"): void {
  if (!rows.length) return;

  const lines = [columns.map((c) => JSON.stringify(c)).join(",")].concat(
    rows.map((row) => columns.map((c) => JSON.stringify(row[c] ?? "")).join(",")),
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
