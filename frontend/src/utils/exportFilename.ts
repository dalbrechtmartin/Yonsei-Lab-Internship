const EXPORT_PREFIX = "λLens_Papers-extraction";
const MAX_NAMED_FILES = 3;
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

/** Builds the suggested export filename (without extension) from the
 * source PDFs' names, e.g. "λLens_Papers-extraction_paper1-paper2-etc". */
export function buildDefaultExportName(filenames: string[]): string {
  const shown = filenames
    .slice(0, MAX_NAMED_FILES)
    .map((name) => name.replace(INVALID_FILENAME_CHARS, "").trim())
    .filter(Boolean);
  const suffix = filenames.length > MAX_NAMED_FILES ? "-etc" : "";
  const joined = shown.length ? shown.join("-") : "export";
  return `${EXPORT_PREFIX}_${joined}${suffix}`;
}

/** Sanitizes a user-edited name and guarantees a single extension. */
export function normalizeFilename(raw: string, ext: "xlsx" | "csv"): string {
  const trimmed = raw.replace(INVALID_FILENAME_CHARS, "").trim() || "export";
  const withoutExt = trimmed.replace(/\.(xlsx|csv)$/i, "");
  return `${withoutExt}.${ext}`;
}
