// The backend never reports a duration estimate (Gemini gives no ETA), so
// this is a rough approximation -- ~2 minutes per PDF until real data
// exists, then the actual average pace of the job once at least one file
// has finished. Explicitly approximate ("~"), never claimed exact. Shared
// between the pre-launch estimate (drop step) and the live ETA (running
// step) so both use one number instead of two guesses that can drift apart.
export const ESTIMATED_MS_PER_FILE = 2 * 60 * 1000;

// Fixed per-file overhead (queuing, the 3 consensus API round-trips) plus a
// marginal cost per page -- calibrated so a ~10-page file lands close to the
// flat ESTIMATED_MS_PER_FILE average above, while still giving a visibly
// bigger number for a 20-page file than a 5-page one. Used only for the
// pre-launch staged-file estimate (drop step), which already knows each
// file's page count client-side; the live running step has no per-file page
// count from the backend, so it keeps using the flat constant.
const BASE_MS_PER_FILE = 40 * 1000;
const MS_PER_PAGE = 8 * 1000;

/** Rough per-file duration estimate for the drop step's staged-file cards
 * and aggregate ETA. Falls back to the flat ESTIMATED_MS_PER_FILE while the
 * page count is still loading or couldn't be read. */
export function estimateFileDurationMs(pageCount: number | null): number {
  if (pageCount == null) return ESTIMATED_MS_PER_FILE;
  return BASE_MS_PER_FILE + pageCount * MS_PER_PAGE;
}

export function formatDuration(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
