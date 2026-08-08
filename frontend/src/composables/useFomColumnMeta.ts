import { computed, type Ref } from "vue";
import { assignGroupColors } from "@/utils/palette";
import {
  detectColumnTypes,
  distinctValues,
  findBaseMaterialsColumn,
  findDomainColumn,
  findMaterialClassColumn,
  findModeIdColumn,
  findOriginColumn,
  findReviewStatusColumn,
  isNeedsReviewRow,
  materialsByClass,
  tokenizeValue,
  tokenizedDistinctValues,
  type DataRow,
} from "@/utils/columnTypes";

const countBy = (column: string | null, rows: DataRow[]): Record<string, number> => {
  if (!column) return {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const v = row[column];
    if (v === null || v === undefined || v === "") continue;
    const key = String(v);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
};

const countTokensBy = (column: string | null, rows: DataRow[]): Record<string, number> => {
  if (!column) return {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const tok of tokenizeValue(row[column])) counts[tok] = (counts[tok] ?? 0) + 1;
  }
  return counts;
};

/**
 * Column detection + per-value counts for the loaded dataset (Domain,
 * Origin, Material Class, Base Materials, Mode ID, Review status) and the
 * fixed group -> color assignment derived from them -- all pure derivations
 * of fomData/fomColumns (plus customPoints and groupBy, which groupColorMap
 * needs), pulled out of VisualizationView.vue since this cluster doesn't
 * touch chart-config, filters, or annotations at all.
 */
export function useFomColumnMeta(deps: {
  fomData: Ref<DataRow[]>;
  fomColumns: Ref<string[]>;
  customPoints: Ref<DataRow[]>;
  groupBy: Ref<string | null>;
  t: (key: string) => string;
}) {
  const { fomData, fomColumns, customPoints, groupBy, t } = deps;

  const columnTypes = computed(() => detectColumnTypes(fomData.value, fomColumns.value));
  const numericColumns = computed(() => columnTypes.value.numeric);
  const categoricalColumns = computed(() => columnTypes.value.categorical);

  const domainColumn = computed(() => findDomainColumn(fomColumns.value));
  const originColumn = computed(() => findOriginColumn(fomColumns.value));
  const materialClassColumn = computed(() => findMaterialClassColumn(fomColumns.value));
  const baseMaterialsColumn = computed(() => findBaseMaterialsColumn(fomColumns.value));
  // Which Base Materials this dataset actually pairs with each Material
  // Class -- feeds the Add Point dialog's cascading Material Class -> Base
  // Materials suggestion, computed off the full dataset since the pairing
  // itself is a property of the loaded file, not of whichever point is
  // currently being added/edited.
  const materialsByClassMap = computed(() =>
    materialsByClass(fomData.value, materialClassColumn.value, baseMaterialsColumn.value),
  );
  const modeIdColumn = computed(() => findModeIdColumn(fomColumns.value));
  const reviewStatusColumn = computed(() => findReviewStatusColumn(fomColumns.value));
  // Counted off the full unfiltered dataset, same convention as
  // domainCounts/originCounts below -- always "how many rows have this
  // flag", not "how many are still visible".
  const needsReviewCount = computed(() =>
    reviewStatusColumn.value
      ? fomData.value.filter((row) => isNeedsReviewRow(row, reviewStatusColumn.value)).length
      : 0,
  );
  // Composite (semicolon/comma-separated) columns -- both get the same
  // tokenized filter/group-by/color treatment.
  const compositeColumns = computed(() =>
    [materialClassColumn.value, baseMaterialsColumn.value].filter(
      (c): c is string => c !== null,
    ),
  );
  // Origin and the composite columns already have their own dedicated
  // filter UI and are meant for grouping/coloring, not for X-axis position.
  const xAxisCategoricalColumns = computed(() =>
    categoricalColumns.value.filter(
      (col) => col !== originColumn.value && !compositeColumns.value.includes(col),
    ),
  );

  const domainValues = computed(() =>
    domainColumn.value ? distinctValues(fomData.value, domainColumn.value) : [],
  );
  const originValues = computed(() =>
    originColumn.value ? distinctValues(fomData.value, originColumn.value) : [],
  );
  const materialClassValues = computed(() =>
    materialClassColumn.value ? tokenizedDistinctValues(fomData.value, materialClassColumn.value) : [],
  );
  const baseMaterialsValues = computed(() =>
    baseMaterialsColumn.value ? tokenizedDistinctValues(fomData.value, baseMaterialsColumn.value) : [],
  );

  // How many rows each filter chip actually covers, e.g. "Au (3)" -- counted
  // off the full unfiltered dataset so a chip's count doesn't shrink as soon
  // as its own filter group excludes other values.
  const domainCounts = computed(() => countBy(domainColumn.value, fomData.value));
  const originCounts = computed(() => countBy(originColumn.value, fomData.value));
  const materialClassCounts = computed(() => countTokensBy(materialClassColumn.value, fomData.value));
  const baseMaterialsCounts = computed(() => countTokensBy(baseMaterialsColumn.value, fomData.value));

  // A fixed color per group label, assigned once from the full unfiltered
  // dataset -- so "Dielectric" stays orange whether or not a Domain/Origin/
  // Material Class filter currently hides some of its rows. Computed here
  // (not inside FomChart/StatsSummaryPanel) so both consume the exact same
  // map and can never disagree with each other. See utils/palette.ts.
  const groupColorMap = computed<Record<string, string>>(() => {
    const col = groupBy.value;
    if (!col) return {};
    // Folds in customPoints too -- a manually added row can carry a
    // brand-new category value the uploaded file never had, and without
    // this it would fall back to a palette slot already claimed by an
    // existing group instead of a stable color of its own.
    const sourceRows = [...fomData.value, ...customPoints.value];
    const rawLabels = compositeColumns.value.includes(col)
      ? tokenizedDistinctValues(sourceRows, col)
      : distinctValues(sourceRows, col);
    const hasBlank = sourceRows.some((row) => {
      const v = row[col];
      return v === null || v === undefined || v === "";
    });
    const labels = hasBlank ? [...rawLabels, t("fomcharts.unknownGroup")] : rawLabels;
    return assignGroupColors(labels);
  });

  return {
    columnTypes,
    numericColumns,
    categoricalColumns,
    domainColumn,
    originColumn,
    materialClassColumn,
    baseMaterialsColumn,
    materialsByClassMap,
    modeIdColumn,
    reviewStatusColumn,
    needsReviewCount,
    compositeColumns,
    xAxisCategoricalColumns,
    domainValues,
    originValues,
    materialClassValues,
    baseMaterialsValues,
    domainCounts,
    originCounts,
    materialClassCounts,
    baseMaterialsCounts,
    groupColorMap,
  };
}
