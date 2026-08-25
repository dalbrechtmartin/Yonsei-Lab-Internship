/** Human-readable file size for a staged upload's `File.size` (bytes). PDFs
 * in this app are never small enough for a KB tier to matter, so this only
 * ever renders MB -- matches the "taille en Mo" the Déposer step's file
 * cards ask for. */
export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
