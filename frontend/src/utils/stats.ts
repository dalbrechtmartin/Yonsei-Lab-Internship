import type { DataRow } from "./columnTypes";

/**
 * Rows with a missing/blank value in `column` must be dropped before
 * computing a chart or a stat off it -- a naive Number(row[column]) coerces
 * null/"" to 0, silently faking a data point (or a stat) that the researcher
 * never reported. `requireNumeric` (on by default) additionally drops values
 * that don't parse as a number -- turn it off for a column being plotted as
 * a category (e.g. a categorical Y axis), where a non-numeric string is the
 * expected, plottable value rather than bad data.
 */
export function filterPlottable(rows: DataRow[], column: string | null, requireNumeric = true): DataRow[] {
  if (!column) return rows;
  return rows.filter((row) => {
    const raw = row[column];
    if (raw === null || raw === undefined || raw === "") return false;
    return !requireNumeric || !isNaN(Number(raw));
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

/**
 * Pulls the parenthesized unit out of a column name, e.g. "Sensitivity
 * (nm/RIU)" -> "nm/RIU", "FOM (RIU^-1)" -> "RIU^-1" -- used to label
 * mean/median/σ tiles with the same unit as the Y-axis column, since those
 * are actual measurements in that unit (unlike "n", a plain count).
 * Columns with no parenthesized unit (e.g. "Q-factor") return null.
 */
export function extractUnit(columnName: string | null): string | null {
  if (!columnName) return null;
  const match = columnName.match(/\(([^)]+)\)\s*$/);
  return match ? match[1] : null;
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

export type TrendType = "linear" | "exponential" | "logarithmic" | "power" | "polynomial";

export interface TrendFit {
  type: TrendType;
  /** Coefficient of determination against the *original* (untransformed) y values -- lets "auto" compare models fairly even though exponential/logarithmic/power are fit via a linearized transform. */
  r2: number;
  predict: (x: number) => number;
}

function rSquared(points: Array<[number, number]>, predict: (x: number) => number): number {
  const ys = points.map((p) => p[1]);
  const meanY = ys.reduce((sum, v) => sum + v, 0) / ys.length;
  const ssTot = ys.reduce((sum, v) => sum + (v - meanY) ** 2, 0);
  // Every y identical -- there's no variance for any model to explain, so
  // R^2 is undefined; treat it as 0 rather than dividing by zero.
  if (ssTot === 0) return 0;
  const ssRes = points.reduce((sum, [x, y]) => sum + (y - predict(x)) ** 2, 0);
  return 1 - ssRes / ssTot;
}

function fitLinear(points: Array<[number, number]>): TrendFit | null {
  const fit = linearRegression(points);
  if (!fit) return null;
  const predict = (x: number) => fit.intercept + fit.slope * x;
  return { type: "linear", r2: rSquared(points, predict), predict };
}

/** y = a * e^(b x), fit by linear regression on (x, ln y) -- only valid when every y is strictly positive. */
function fitExponential(points: Array<[number, number]>): TrendFit | null {
  if (points.some(([, y]) => y <= 0)) return null;
  const fit = linearRegression(points.map(([x, y]): [number, number] => [x, Math.log(y)]));
  if (!fit) return null;
  const a = Math.exp(fit.intercept);
  const b = fit.slope;
  const predict = (x: number) => a * Math.exp(b * x);
  return { type: "exponential", r2: rSquared(points, predict), predict };
}

/** y = a + b*ln(x), fit by linear regression on (ln x, y) -- only valid when every x is strictly positive. */
function fitLogarithmic(points: Array<[number, number]>): TrendFit | null {
  if (points.some(([x]) => x <= 0)) return null;
  const fit = linearRegression(points.map(([x, y]): [number, number] => [Math.log(x), y]));
  if (!fit) return null;
  const predict = (x: number) => fit.intercept + fit.slope * Math.log(x);
  return { type: "logarithmic", r2: rSquared(points, predict), predict };
}

/** y = a * x^b, fit by linear regression on (ln x, ln y) -- only valid when every x and y are strictly positive. */
function fitPower(points: Array<[number, number]>): TrendFit | null {
  if (points.some(([x, y]) => x <= 0 || y <= 0)) return null;
  const fit = linearRegression(points.map(([x, y]): [number, number] => [Math.log(x), Math.log(y)]));
  if (!fit) return null;
  const a = Math.exp(fit.intercept);
  const b = fit.slope;
  const predict = (x: number) => a * Math.pow(x, b);
  return { type: "power", r2: rSquared(points, predict), predict };
}

/** Solves a 3x3 linear system via Gaussian elimination with partial pivoting. Returns null if singular. */
function solve3x3(rows: number[][], rhs: number[]): [number, number, number] | null {
  const a = rows.map((row, i) => [...row, rhs[i]]);
  for (let i = 0; i < 3; i++) {
    let pivot = i;
    for (let k = i + 1; k < 3; k++) if (Math.abs(a[k][i]) > Math.abs(a[pivot][i])) pivot = k;
    if (Math.abs(a[pivot][i]) < 1e-12) return null;
    [a[i], a[pivot]] = [a[pivot], a[i]];
    for (let k = i + 1; k < 3; k++) {
      const factor = a[k][i] / a[i][i];
      for (let j = i; j < 4; j++) a[k][j] -= factor * a[i][j];
    }
  }
  const x: [number, number, number] = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    let sum = a[i][3];
    for (let j = i + 1; j < 3; j++) sum -= a[i][j] * x[j];
    x[i] = sum / a[i][i];
  }
  return x;
}

/** y = c0 + c1*x + c2*x^2, fit by least-squares via the normal equations. Needs at least 3 points to be determined. */
function fitPolynomial(points: Array<[number, number]>): TrendFit | null {
  if (points.length < 3) return null;
  let s1 = 0,
    s2 = 0,
    s3 = 0,
    s4 = 0,
    sy = 0,
    sxy = 0,
    sx2y = 0;
  for (const [x, y] of points) {
    const x2 = x * x;
    s1 += x;
    s2 += x2;
    s3 += x2 * x;
    s4 += x2 * x2;
    sy += y;
    sxy += x * y;
    sx2y += x2 * y;
  }
  const n = points.length;
  const coeffs = solve3x3(
    [
      [n, s1, s2],
      [s1, s2, s3],
      [s2, s3, s4],
    ],
    [sy, sxy, sx2y],
  );
  if (!coeffs) return null;
  const [c0, c1, c2] = coeffs;
  const predict = (x: number) => c0 + c1 * x + c2 * x * x;
  return { type: "polynomial", r2: rSquared(points, predict), predict };
}

/**
 * Fits a trend curve to `points`. With an explicit `type`, fits exactly that
 * model (or returns null if the data doesn't satisfy its domain constraints,
 * e.g. logarithmic needs x > 0). With "auto", fits every model whose domain
 * constraints the data satisfies and returns the one with the highest R^2 --
 * the point being that a straight line forced onto a curved relationship
 * (e.g. saturating sensor response, exponential decay) is a worse fit than
 * letting the shape match the data, per the standard curve-fitting practice
 * of comparing candidate models by R^2 rather than assuming linearity.
 */
export function fitTrend(points: Array<[number, number]>, type: TrendType | "auto"): TrendFit | null {
  if (points.length < 2) return null;
  const fitters: Record<TrendType, (pts: Array<[number, number]>) => TrendFit | null> = {
    linear: fitLinear,
    exponential: fitExponential,
    logarithmic: fitLogarithmic,
    power: fitPower,
    polynomial: fitPolynomial,
  };
  if (type !== "auto") return fitters[type](points);
  const fits = (Object.keys(fitters) as TrendType[])
    .map((key) => fitters[key](points))
    .filter((f): f is TrendFit => f !== null);
  if (fits.length === 0) return null;
  return fits.reduce((best, f) => (f.r2 > best.r2 ? f : best));
}

/** Samples a fitted curve at evenly-spaced x values between xmin and xmax -- needed to draw an actual curve (exponential/logarithmic/power/polynomial), since a 2-point line only ever renders straight. */
export function sampleTrendCurve(fit: TrendFit, xmin: number, xmax: number, steps = 60): Array<[number, number]> {
  if (xmin === xmax) return [[xmin, fit.predict(xmin)]];
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= steps; i++) {
    const x = xmin + ((xmax - xmin) * i) / steps;
    points.push([x, fit.predict(x)]);
  }
  return points;
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
