/**
 * Detects which columns are numeric vs categorical by sampling the data.
 * This is what makes the app work with ANY uploaded spreadsheet — the
 * golden 4-column file, the richer harmonized export, or anything a
 * researcher drags in — without hardcoding column names anywhere.
 *
 * @param {Array<Object>} rows - array of row objects (from the API response)
 * @param {Array<string>} columns - column names (from the API response)
 * @returns {{ numeric: string[], categorical: string[] }}
 */
export function detectColumnTypes(rows, columns) {
  const numeric = [];
  const categorical = [];

  for (const col of columns) {
    const sample = rows
      .map((row) => row[col])
      .filter((v) => v !== null && v !== undefined && v !== "");

    if (sample.length === 0) {
      categorical.push(col); // nothing to judge by, default to categorical
      continue;
    }

    const numericCount = sample.filter(
      (v) =>
        typeof v === "number" ||
        (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v))),
    ).length;

    // Consider it numeric if most non-empty values parse as numbers.
    if (numericCount / sample.length > 0.8) {
      numeric.push(col);
    } else {
      categorical.push(col);
    }
  }

  return { numeric, categorical };
}

/**
 * Best-effort guess for a sensible default Y-axis column: prefers a
 * numeric column whose name contains "FOM", falls back to the first
 * numeric column found.
 */
export function guessDefaultYAxis(numericColumns) {
  const fomLike = numericColumns.find((c) => /fom/i.test(c));
  return fomLike || numericColumns[0] || null;
}

/**
 * Best-effort guess for a sensible default grouping column: prefers a
 * categorical column whose name suggests a structure/material grouping,
 * falls back to the first categorical column found.
 */
export function guessDefaultGroup(categoricalColumns) {
  const preferred = categoricalColumns.find((c) =>
    /material|structure|layer|층|class/i.test(c),
  );
  return preferred || categoricalColumns[0] || null;
}
