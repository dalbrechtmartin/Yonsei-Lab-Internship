const EXPORT_PREFIX = "λLens_Extraction";
const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

/** * Builds the suggested export filename (without extension) from the extracted records. 
 * E.g., "λLens_Extraction_High-Q_Fano_Resonances_2026-07-27" or "λLens_FOM_Batch_3_papers_2026-07-27"
 */
export function buildDefaultExportName(records: any[]): string {
  if (!records || records.length === 0) {
    return `${EXPORT_PREFIX}_Empty`;
  }

  const titles = Array.from(
    new Set(
      records.map((r) => {
        if (typeof r === "string") return r; 
        return r["Ref"] || r["Short Title"] || r["Title"] || "Unknown";
      })
    )
  ).filter(Boolean);

  const timestamp = new Date().toISOString().slice(0, 10); // Format YYYY-MM-DD

  if (titles.length === 1) {
    const sanitizedTitle = String(titles[0])
      .replace(INVALID_FILENAME_CHARS, "") 
      .replace(/\s+/g, "_")                
      .trim()
      .slice(0, 50);                       
      
    return `${EXPORT_PREFIX}_${sanitizedTitle}_${timestamp}`;
  }

  return `λLens_FOM_Batch_${titles.length}_papers_${timestamp}`;
}

/** Sanitizes a user-edited name and guarantees a single extension. */
export function normalizeFilename(raw: string, ext: "xlsx" | "csv"): string {
  const trimmed = raw.replace(INVALID_FILENAME_CHARS, "").trim() || "export";
  const withoutExt = trimmed.replace(/\.(xlsx|csv)$/i, "");
  return `${withoutExt}.${ext}`;
}