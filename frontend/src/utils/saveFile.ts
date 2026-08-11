const PICKER_TYPES: Record<
  "xlsx" | "csv",
  { description: string; mime: string }
> = {
  xlsx: {
    description: "Excel Workbook",
    mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  csv: { description: "CSV file", mime: "text/csv" },
};

/** Saves a blob letting the user pick the name and location, via the File
 * System Access API where available (must be called directly from a user
 * gesture, e.g. a button click -- browsers reject it otherwise). Falls
 * back to a classic same-origin download (saved to the browser's default
 * downloads folder under `suggestedName`) on browsers without support. */
export async function saveBlobWithPicker(
  blob: Blob,
  suggestedName: string,
  ext: "xlsx" | "csv" = "xlsx",
): Promise<void> {
  const showSaveFilePicker = (
    window as unknown as {
      showSaveFilePicker?: (
        options: unknown,
      ) => Promise<FileSystemFileHandleLike>;
    }
  ).showSaveFilePicker;
  const { description, mime } = PICKER_TYPES[ext];

  if (typeof showSaveFilePicker === "function") {
    try {
      const handle = await showSaveFilePicker({
        suggestedName,
        types: [{ description, accept: { [mime]: [`.${ext}`] } }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error; // user cancelled the picker -- caller decides what to do
      }
      // Any other failure (permission, unsupported flow, ...) -- fall
      // through to the classic download below instead of losing the file.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = suggestedName;
  link.click();
  URL.revokeObjectURL(url);
}

/** Downloads a data: URL (a canvas/chart PNG export, typically) under
 * `filename` -- a temporary same-origin `<a download>` click, since data:
 * URLs need neither `URL.createObjectURL` nor a revoke. */
export function downloadDataUrl(url: string, filename: string): void {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/** Downloads a Blob under `filename` -- backs it with a short-lived object
 * URL (unlike downloadDataUrl's data: URLs, a Blob needs one to become a
 * clickable href) and revokes it right after the click has queued the
 * download. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  downloadDataUrl(url, filename);
  URL.revokeObjectURL(url);
}

interface FileSystemFileHandleLike {
  createWritable(): Promise<{
    write(data: Blob): Promise<void>;
    close(): Promise<void>;
  }>;
}

/** Converts the backend's .xlsx export blob to a .csv blob (first sheet)
 * client-side, so offering a CSV format doesn't need a separate backend
 * endpoint. */
export async function convertXlsxBlobToCsv(blob: Blob): Promise<Blob> {
  const { read, utils } = await import("xlsx");
  const workbook = read(await blob.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return new Blob([utils.sheet_to_csv(sheet)], { type: "text/csv" });
}
