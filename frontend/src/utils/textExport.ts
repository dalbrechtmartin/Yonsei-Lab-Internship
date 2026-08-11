import { downloadBlob } from "./saveFile";

/** Downloads plain text as a .txt file -- used for exporting a pin's personal note on its own, independent of the full-card PNG export. */
export function downloadTextFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  downloadBlob(blob, filename);
}
