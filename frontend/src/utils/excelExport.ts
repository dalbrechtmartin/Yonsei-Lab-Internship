import { utils, writeFile } from "xlsx";
import type { DataRow } from "./columnTypes";

/**
 * Exports rows as a downloaded .xlsx file. Given the same shape the API
 * already returns ({ columns, data }), so both VisualizationView and any
 * future extraction export can call this directly.
 */
export function exportRowsAsExcel(
  columns: string[],
  rows: DataRow[],
  filename = "export.xlsx",
): void {
  if (!rows.length) return;

  const worksheet = utils.json_to_sheet(rows, { header: columns });
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, worksheet, "FOM Data");
  writeFile(workbook, filename);
}
