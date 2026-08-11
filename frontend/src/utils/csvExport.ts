import type { DataRow } from "./columnTypes";
import { downloadBlob } from "./saveFile";

/**
 * Exports rows as a downloaded .csv file. Cells are JSON-stringified before
 * joining so commas/quotes/newlines inside a cell (e.g. a pasted abstract
 * sentence) round-trip safely instead of corrupting the CSV structure.
 */
export function exportRowsAsCsv(
  columns: string[],
  rows: DataRow[],
  filename = "export.csv",
): void {
  if (!rows.length) return;

  const lines = [columns.map((c) => JSON.stringify(c)).join(",")].concat(
    rows.map((row) =>
      columns.map((c) => JSON.stringify(row[c] ?? "")).join(","),
    ),
  );
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  downloadBlob(blob, filename);
}
