import type { DataRow } from "./columnTypes";

/**
 * Rows with a missing/blank/non-numeric value in `column` must be dropped
 * before computing a chart or a stat off it -- a naive Number(row[column])
 * coerces null/"" to 0, silently faking a data point (or a stat) that the
 * researcher never reported.
 */
export function filterPlottable(rows: DataRow[], column: string | null): DataRow[] {
  if (!column) return rows;
  return rows.filter((row) => {
    const raw = row[column];
    if (raw === null || raw === undefined || raw === "") return false;
    return !isNaN(Number(raw));
  });
}

export interface GroupStats {
  n: number;
  mean: number;
  median: number;
  std: number;
}

export function computeStats(values: number[]): GroupStats {
  const n = values.length;
  if (n === 0) return { n: 0, mean: 0, median: 0, std: 0 };
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(n / 2);
  const median = n % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  return { n, mean, median, std: Math.sqrt(variance) };
}

/** Compact display for a stat value: whole numbers past 100, one decimal below. */
export function formatStat(value: number): string {
  return Math.abs(value) >= 100 ? Math.round(value).toString() : (Math.round(value * 10) / 10).toString();
}

export interface LinearFit {
  slope: number;
  intercept: number;
}

/** Ordinary least-squares fit. Returns null when there aren't enough points, or they're collinear in x (zero variance). */
export function linearRegression(points: Array<[number, number]>): LinearFit | null {
  const n = points.length;
  if (n < 2) return null;
  const sx = points.reduce((sum, p) => sum + p[0], 0);
  const sy = points.reduce((sum, p) => sum + p[1], 0);
  const sxy = points.reduce((sum, p) => sum + p[0] * p[1], 0);
  const sxx = points.reduce((sum, p) => sum + p[0] * p[0], 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export interface ParetoPoint {
  x: number;
  y: number;
  row: DataRow;
}

/**
 * Maximize-X/maximize-Y non-dominated frontier. A point is on the frontier
 * iff no other point has both x' >= x and y' >= y with at least one strictly
 * greater (standard Pareto dominance). Returns the frontier points sorted
 * ascending by x, ready to draw as a step/line series left-to-right.
 *
 * Algorithm: O(n log n) sort-then-sweep. Sort by x descending (tie-break y descending),
 * then sweep keeping a running max y — a point survives only if its y beats every
 * point with x >= it seen so far. Reverse at the end for ascending-x output.
 *
 * Note: if two points share identical x and y, both non-dominated logically, but only
 * the first-in-sort-order one is kept (acceptable for drawing a line).
 */
export function computeParetoFrontier(points: ParetoPoint[]): ParetoPoint[] {
  if (points.length === 0) return [];
  const sorted = [...points].sort((a, b) => (b.x - a.x) || (b.y - a.y));
  const frontier: ParetoPoint[] = [];
  let bestY = -Infinity;
  for (const p of sorted) {
    if (p.y > bestY) {
      frontier.push(p);
      bestY = p.y;
    }
  }
  return frontier.reverse();
}
