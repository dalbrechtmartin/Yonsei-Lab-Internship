import { computed, ref } from "vue";
import { Check, Layers, LayoutGrid, Target } from "@lucide/vue";
import { assignGroupColors } from "@/utils/palette";
import { filterPlottable, type TrendType } from "@/utils/stats";
import { parseLayerStructure, formatLayerStructure, type StructureLayer } from "@/utils/layerStructure";
import {
  detectColumnTypes,
  findDomainColumn,
  findOriginColumn,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findModeIdColumn,
  findReviewStatusColumn,
  isNeedsReviewRow,
  distinctValues,
  tokenizedDistinctValues,
  tokenizeValue,
  groupableColumns,
  buildManualPointFields,
  materialsByClass,
  formatUnitSuperscripts,
  MANUAL_ROW_FLAG,
  type DataRow,
  type PointShape,
  type ManualPointField,
} from "@/utils/columnTypes";
import type { Annotation } from "@/components/visualization/AnnotationsPanel.vue";

// ---------------------------------------------------------------------
// Worked example dataset (Mode 1 only) -- six ALL-DIELECTRIC photonic
// resonator sensor designs (the platform this tool's actual users mostly
// work with -- no metal/plasmonic devices), each reported once
// experimentally (EXP) and once from simulation (SIM). FOM (Sensitivity /
// FWHM, the standard RI-sensor figure of merit) is a real computed column
// here rather than left out, so the guide's chart actually plots FOM by
// default and the bubble-size-by-FOM behavior (see FomChart's
// bubbleSizeFor) isn't silently untested. Column names follow the same
// conventions the real app's column detectors (utils/columnTypes.ts) look
// for, so every real component mounted below behaves exactly as it would
// on a real uploaded file, not a hand-faked illustration.
// ---------------------------------------------------------------------
export const sampleColumns = [
  "Ref",
  "Title",
  "Domain",
  "Origin",
  "Material Class",
  "Base Materials",
  "Mode ID",
  "Resonance Wavelength (nm)",
  "Q-factor",
  "FOM (RIU^-1)",
  "Sensitivity (nm/RIU)",
  "FWHM (nm)",
  "Layer Structure",
  "Review status",
  "Notes",
];

// "Approve (AI)" (not bare "Approve") matches backend/prompt.txt's Review
// status vocabulary exactly, since this dataset models what that extractor
// would actually hand back to a researcher.
// Domain defaults to "Wavelength" for every row -- every design in this
// worked example genuinely is a wavelength-domain sensor, so unlike Origin
// (deliberately split EXP/SIM) there's no reason to invent a fictitious
// frequency-domain record just to pad out the Domain filter's checklist.
function sampleRow(data: Record<string, unknown>): DataRow {
  return {
    "Mode ID": 1,
    Domain: "Wavelength",
    "Review status": "Approve (AI)",
    Notes: "",
    ...data,
  };
}

// Layer Structure here follows backend/prompt.txt's own rules: "+"-joined
// bare material names (thickness in parentheses only where stated),
// standard chemical formulas in Base Materials (Si3N4, not SiN; PMMA, not
// the category name "Polymer"), and inert substrates (glass, quartz) never
// appear at all -- rule 3 strictly excludes them, so a genuine extraction
// from this backend would never produce one either.
export const sampleRows: DataRow[] = [
  sampleRow({
    Ref: "R1",
    Title: "High-Q silicon microring resonator RI sensor",
    Origin: "EXP",
    "Material Class": "Dielectric",
    "Base Materials": "Si;SiO2",
    "Resonance Wavelength (nm)": 1550,
    "Q-factor": 42000,
    "FOM (RIU^-1)": 1757,
    "Sensitivity (nm/RIU)": 65,
    "FWHM (nm)": 0.037,
    "Layer Structure": "Si + SiO2",
  }),
  sampleRow({
    Ref: "R1",
    Title: "High-Q silicon microring resonator RI sensor",
    Origin: "SIM",
    "Material Class": "Dielectric",
    "Base Materials": "Si;SiO2",
    "Resonance Wavelength (nm)": 1550,
    "Q-factor": 51000,
    "FOM (RIU^-1)": 2333,
    "Sensitivity (nm/RIU)": 70,
    "FWHM (nm)": 0.03,
    "Layer Structure": "Si + SiO2",
  }),
  sampleRow({
    Ref: "R2",
    Title: "Silicon-nitride ring resonator for biosensing",
    Origin: "EXP",
    "Material Class": "Dielectric",
    "Base Materials": "Si3N4;SiO2",
    "Resonance Wavelength (nm)": 1310,
    "Q-factor": 88000,
    "FOM (RIU^-1)": 2667,
    "Sensitivity (nm/RIU)": 40,
    "FWHM (nm)": 0.015,
    "Layer Structure": "Si3N4 + SiO2",
  }),
  sampleRow({
    Ref: "R2",
    Title: "Silicon-nitride ring resonator for biosensing",
    Origin: "SIM",
    "Material Class": "Dielectric",
    "Base Materials": "Si3N4;SiO2",
    "Resonance Wavelength (nm)": 1310,
    "Q-factor": 96000,
    "FOM (RIU^-1)": 3214,
    "Sensitivity (nm/RIU)": 45,
    "FWHM (nm)": 0.014,
    "Layer Structure": "Si3N4 + SiO2",
  }),
  sampleRow({
    Ref: "R3",
    Title: "All-dielectric guided-mode resonance biosensor",
    Origin: "EXP",
    "Material Class": "Dielectric",
    "Base Materials": "Si3N4;SiO2;Ta2O5",
    "Resonance Wavelength (nm)": 850,
    "Q-factor": 15000,
    "FOM (RIU^-1)": 3158,
    "Sensitivity (nm/RIU)": 180,
    "FWHM (nm)": 0.057,
    "Layer Structure": "Si3N4(200nm) + SiO2(400nm) + Ta2O5(120nm)",
    "Review status": "Edit",
    Notes: "FWHM digitized from a log-scale transmission plot. Flagged for review.",
  }),
  sampleRow({
    Ref: "R3",
    Title: "All-dielectric guided-mode resonance biosensor",
    Origin: "SIM",
    "Material Class": "Dielectric",
    "Base Materials": "Si3N4;SiO2;Ta2O5",
    "Resonance Wavelength (nm)": 850,
    "Q-factor": 18000,
    "FOM (RIU^-1)": 4043,
    "Sensitivity (nm/RIU)": 190,
    "FWHM (nm)": 0.047,
    "Layer Structure": "Si3N4(200nm) + SiO2(400nm) + Ta2O5(120nm)",
  }),
  sampleRow({
    Ref: "R4",
    Title: "All-dielectric silicon disk resonator on a Bragg mirror",
    Origin: "EXP",
    "Material Class": "Dielectric",
    "Base Materials": "Si;SiO2;Ta2O5",
    "Resonance Wavelength (nm)": 1064,
    "Q-factor": 5200,
    "FOM (RIU^-1)": 1050,
    "Sensitivity (nm/RIU)": 210,
    "FWHM (nm)": 0.2,
    "Layer Structure": "Si(300nm) + SiO2(200nm) + Ta2O5(150nm) + SiO2(200nm) + Ta2O5(150nm)",
  }),
  sampleRow({
    Ref: "R4",
    Title: "All-dielectric silicon disk resonator on a Bragg mirror",
    Origin: "SIM",
    "Material Class": "Dielectric",
    "Base Materials": "Si;SiO2;Ta2O5",
    "Resonance Wavelength (nm)": 1064,
    "Q-factor": 6100,
    "FOM (RIU^-1)": 1353,
    "Sensitivity (nm/RIU)": 230,
    "FWHM (nm)": 0.17,
    "Layer Structure": "Si(300nm) + SiO2(200nm) + Ta2O5(150nm) + SiO2(200nm) + Ta2O5(150nm)",
  }),
  sampleRow({
    Ref: "R5",
    Title: "InP Mach-Zehnder interferometer sensor",
    Origin: "EXP",
    "Material Class": "Dielectric;Semiconductor",
    "Base Materials": "InP;SiO2",
    "Resonance Wavelength (nm)": 1550,
    "Q-factor": 1200,
    "FOM (RIU^-1)": 138,
    "Sensitivity (nm/RIU)": 180,
    "FWHM (nm)": 1.3,
    "Layer Structure": "InP + SiO2",
  }),
  sampleRow({
    Ref: "R5",
    Title: "InP Mach-Zehnder interferometer sensor",
    Origin: "SIM",
    "Material Class": "Dielectric;Semiconductor",
    "Base Materials": "InP;SiO2",
    "Resonance Wavelength (nm)": 1550,
    "Q-factor": 1500,
    "FOM (RIU^-1)": 190,
    "Sensitivity (nm/RIU)": 190,
    "FWHM (nm)": 1.0,
    "Layer Structure": "InP + SiO2",
  }),
  sampleRow({
    Ref: "R6",
    Title: "Polymer microring resonator for label-free detection",
    Origin: "EXP",
    "Material Class": "Dielectric;Polymer",
    "Base Materials": "PMMA;SiO2",
    "Resonance Wavelength (nm)": 1300,
    "Q-factor": 2600,
    "FOM (RIU^-1)": 190,
    "Sensitivity (nm/RIU)": 95,
    "FWHM (nm)": 0.5,
    "Layer Structure": "PMMA + SiO2",
  }),
  sampleRow({
    Ref: "R6",
    Title: "Polymer microring resonator for label-free detection",
    Origin: "SIM",
    "Material Class": "Dielectric;Polymer",
    "Base Materials": "PMMA;SiO2",
    "Resonance Wavelength (nm)": 1300,
    "Q-factor": 3100,
    "FOM (RIU^-1)": 238,
    "Sensitivity (nm/RIU)": 100,
    "FWHM (nm)": 0.42,
    "Layer Structure": "PMMA + SiO2",
  }),
];

const columnTypes = detectColumnTypes(sampleRows, sampleColumns);
export const numericColumns = columnTypes.numeric;
const categoricalColumns = columnTypes.categorical;

export const domainColumn = findDomainColumn(sampleColumns);
export const originColumn = findOriginColumn(sampleColumns);
export const materialClassColumn = findMaterialClassColumn(sampleColumns);
export const baseMaterialsColumn = findBaseMaterialsColumn(sampleColumns);
const modeIdColumn = findModeIdColumn(sampleColumns);
// Same detector VisualizationView uses for the chart's dashed-outline
// "needs review" marker and the Filters section's "Hide needs-review"
// switch -- R3/EXP's "Edit" status (the same row already flagged on the
// Reading page) is what lights this up for real, not a hand-picked count.
export const reviewStatusColumn = findReviewStatusColumn(sampleColumns);
export const needsReviewCount = sampleRows.filter((r) =>
  isNeedsReviewRow(r, reviewStatusColumn),
).length;
export const compositeColumns = [materialClassColumn, baseMaterialsColumn].filter(
  (c): c is string => !!c,
);
export const xAxisCategoricalColumns = categoricalColumns.filter(
  (c) => c !== originColumn && !compositeColumns.includes(c),
);

export const domainValues = domainColumn ? distinctValues(sampleRows, domainColumn) : [];
export const originValues = originColumn ? distinctValues(sampleRows, originColumn) : [];
export const materialClassValues = materialClassColumn
  ? tokenizedDistinctValues(sampleRows, materialClassColumn)
  : [];
export const baseMaterialsValues = baseMaterialsColumn
  ? tokenizedDistinctValues(sampleRows, baseMaterialsColumn)
  : [];

function countTokensBy(column: string | null, rows: DataRow[]): Record<string, number> {
  if (!column) return {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const tok of tokenizeValue(row[column])) counts[tok] = (counts[tok] ?? 0) + 1;
  }
  return counts;
}
export const domainCounts = countTokensBy(domainColumn, sampleRows);
export const originCounts = countTokensBy(originColumn, sampleRows);
export const materialClassCounts = countTokensBy(materialClassColumn, sampleRows);
export const baseMaterialsCounts = countTokensBy(baseMaterialsColumn, sampleRows);

const groupByExemptColumns = [...compositeColumns, modeIdColumn].filter(
  (c): c is string => !!c,
);
export const groupByColumns = groupableColumns(sampleRows, categoricalColumns, groupByExemptColumns);

// Fixed illustrative chart configuration -- FOM (log scale) against
// resonance wavelength, colored by Origin (EXP vs SIM), median line on.
export const selectedYAxis = ref<string | null>("FOM (RIU^-1)");
export const selectedXAxis = ref<string | null>("Resonance Wavelength (nm)");
export const groupBy = ref<string | null>(originColumn);
export const yAxisScale = ref<"log" | "value">("log");
export const chartTitle = ref("");
export const showLegend = ref(true);
export const showMedian = ref(true);
// On (Auto-fit) rather than off -- unlike Pareto below, the trend line now
// has its own curve-type picker (see trendType) that only ever renders once
// this is true, so leaving it off would mean the guide's own screenshot
// never shows the control it's documenting.
export const showTrend = ref(true);
export const trendType = ref<TrendType | "auto">("auto");
export const showPareto = ref(false);
export const highlightGroup = ref<string | null>(null);
export const compositeFilterMode = ref<"strict" | "lenient">("lenient");
export const excludeNeedsReview = ref(false);
// Sensitivity, not Q-factor or FWHM -- neither current axis (FOM vs.
// resonance wavelength), so bubble size adds a genuine third dimension
// instead of restating one of the two already-plotted columns.
export const pointSizeMode = ref<"constant" | "byValue">("byValue");
export const pointSizeBy = ref<string | null>("Sensitivity (nm/RIU)");
export const pointSize = ref(16);
export const selectedDomains = ref<string[]>([...domainValues]);
export const selectedOrigins = ref<string[]>([...originValues]);
export const selectedMaterialClasses = ref<string[]>([...materialClassValues]);
export const selectedBaseMaterials = ref<string[]>([...baseMaterialsValues]);

// Page 12's export figures only -- a title, like every axis name in this
// sample dataset, is exactly what a researcher would type/see regardless of
// the guide's own language, so it stays a plain literal rather than an
// i18n key (see the axis names/EXP/SIM literals above).
export const exportChartTitle = "FOM by Material Class";
export const exportChartTitle2 = "FOM by Base Material";

export const groupColorMap = computed<Record<string, string>>(() =>
  originColumn ? assignGroupColors(originValues) : {},
);
export const materialClassColorMap = computed<Record<string, string>>(() =>
  materialClassColumn ? assignGroupColors(materialClassValues) : {},
);
export const baseMaterialsColorMap = computed<Record<string, string>>(() =>
  baseMaterialsColumn ? assignGroupColors(baseMaterialsValues) : {},
);
export const plottableRows = computed(() =>
  filterPlottable(filterPlottable(sampleRows, selectedYAxis.value), selectedXAxis.value),
);

// Page 13's Layer Structure popup preview -- R3's real parsed layers (see
// parseLayerStructure), not hand-typed values, so the popup mockup shows
// genuine data and the same top-to-bottom (incident-light-first) ordering
// the real dialog would.
export const layerPopupLayers = parseLayerStructure(sampleRows[4]["Layer Structure"]);

export const statsOpen = ref(true);
export const annotationsOpen = ref(true);
export const showOnlyAnnotated = ref(false);

// The demo pin ids below are read as hardcoded string literals by
// GuideTemplate.vue's captureGuideArtifacts() (to find/mark these two
// specific cards) -- keep the two in sync if either ever changes.
export const DEMO_PIN_ID_R3_EXP = "demo-r3-exp";
export const DEMO_PIN_ID_R1_SIM = "demo-r1-sim";
export const annotations = ref<Annotation[]>([
  {
    id: DEMO_PIN_ID_R3_EXP,
    ref: "R3",
    title: "All-dielectric guided-mode resonance biosensor",
    row: sampleRows[4],
    note: "FWHM digitized from a log-scale transmission plot. Flagged for review.",
    createdAt: Date.now() - 60_000,
  },
  {
    id: DEMO_PIN_ID_R1_SIM,
    ref: "R1",
    title: "High-Q silicon microring resonator RI sensor",
    row: sampleRows[1],
    note: "",
    createdAt: Date.now(),
  },
]);

// ---------------------------------------------------------------------
// Page 10 (Data points table) -- reuses the same two rows already pinned as
// demo annotations above (R3/EXP, R1/SIM) as this list's own "Pinned" group,
// plus one further row (R6/SIM) hidden HERE ONLY (a separate array, not a
// filter on sampleRows itself) so every other page's chart keeps plotting
// all twelve points regardless of what this one page demonstrates.
// ---------------------------------------------------------------------
export const dataTableHiddenRow = sampleRows[11]; // R6, SIM
export const dataTableVisibleRows = plottableRows.value.filter((r) => r !== dataTableHiddenRow);
export const dataTablePinnedRows = [sampleRows[4], sampleRows[1]]; // R3/EXP, R1/SIM -- same two as the annotations demo above
export const dataTableOpen = ref(true);
export const includeManualInStats = ref(true);

// ---------------------------------------------------------------------
// Pages 11-12 (Add a point manually) -- a realistic, fully filled-in "M1"
// design (a Si3N4/SiO2 ring with thicker cladding than R2/R3) rather than an
// empty form, so every real field component below (AddPointField,
// MaterialsTagsField, LayerStructureField, PointShapeField) has something
// genuine to render. Wavelength/FWHM are picked so Q = λ/FWHM lands on an
// exact round number (1550 / 0.031 = 50000), matching AddPointDialog's own
// calcQFactor formula/rounding -- see addPointComputedQFactor below.
// ---------------------------------------------------------------------
export const addPointFields = buildManualPointFields(
  sampleColumns,
  sampleRows,
  selectedXAxis.value,
  selectedYAxis.value,
  numericColumns,
);
export const addPointRequiredFields = addPointFields.filter((f) => f.required);
export const addPointDomainField = addPointFields.find((f) => f.labelKey === "domain") ?? null;
export const addPointOriginField = addPointFields.find((f) => f.labelKey === "origin") ?? null;
export const addPointMetricFields = addPointFields.filter(
  (f) => !f.required && f.kind === "numeric" && f.labelKey !== "modeId",
);
export const addPointPlainMetricFields = addPointMetricFields.filter(
  (f) => f.labelKey !== "qFactor",
);
export const addPointQFactorField =
  addPointMetricFields.find((f) => f.labelKey === "qFactor") ?? null;
export const addPointWavelengthField =
  addPointFields.find((f) => f.column === selectedXAxis.value) ?? null;
export const addPointBaseMaterialsField =
  addPointFields.find((f) => f.labelKey === "baseMaterials") ?? null;
export const addPointMaterialClassField =
  addPointFields.find((f) => f.labelKey === "materialClass") ?? null;
export const addPointLayerField = addPointFields.find((f) => f.labelKey === "layerStructure") ?? null;

// Step indicator icons -- same four as AddPointDialog's own `steps` computed
// (Target/Layers/LayoutGrid/Check), named WHAT each step covers rather than
// a done/undone trail (see that component's own comment).
export function useAddPointSteps(t: (key: string) => string) {
  return computed(() => [
    { key: 1, label: t("fomcharts.addPoint.steps.essentials"), icon: Target },
    { key: 2, label: t("fomcharts.addPoint.steps.metrics"), icon: Layers },
    { key: 3, label: t("fomcharts.addPoint.steps.structure"), icon: LayoutGrid },
    { key: 4, label: t("fomcharts.addPoint.steps.finish"), icon: Check },
  ]);
}

// Same fallback AddPointDialog's own fieldLabel uses: labelKey is left
// undefined whenever a field is the current chart's X/Y axis (see
// buildManualPointFields), so its label is that column's own name instead.
export function addPointFieldLabel(field: ManualPointField, t: (key: string) => string): string {
  return field.labelKey
    ? t(`fomcharts.addPoint.fields.${field.labelKey}`)
    : formatUnitSuperscripts(field.column);
}

export const addPointLabel = "Si3N4 ring, thicker cladding";
export const addPointShape = ref<PointShape>("diamond");
export const addPointNotes = "Design variant of R2, not yet fabricated.";
export const unitConverterOpen = ref(false);
export const addPointValues = ref<Record<string, string>>({
  ...(selectedYAxis.value ? { [selectedYAxis.value]: "2900" } : {}),
  ...(selectedXAxis.value ? { [selectedXAxis.value]: "1550" } : {}),
  "Sensitivity (nm/RIU)": "85",
  "FWHM (nm)": "0.031",
  // Q-factor's locked display (see AddPointField) renders modelValue, not
  // computedValue, directly -- the real dialog keeps the two in sync via a
  // watcher on computedQFactor; this guide seeds the same result once
  // instead, since nothing here ever changes after mount.
  "Q-factor": "50000",
  Domain: "Wavelength",
  Origin: "SIM",
});
// Q = λ / FWHM, rounded the same way AddPointDialog's own calcQFactor does
// (whole number once >= 100) -- kept as a computed, not a literal, so it's
// a genuine live result of the two values above rather than a hand-typed
// number that could silently drift out of sync with them.
export const addPointComputedQFactor = computed<number | null>(() => {
  if (!addPointWavelengthField) return null;
  const lambda = Number(addPointValues.value[addPointWavelengthField.column]);
  const fwhm = Number(addPointValues.value["FWHM (nm)"]);
  if (!isFinite(lambda) || !isFinite(fwhm) || fwhm <= 0) return null;
  const q = lambda / fwhm;
  return q >= 100 ? Math.round(q) : Math.round(q * 100) / 100;
});
export const addPointTags = ref<Record<string, string[]>>({
  "Base Materials": ["Si3N4", "SiO2"],
  "Material Class": ["Dielectric"],
});
export const addPointLayers = ref<StructureLayer[]>([
  { material: "Si3N4", thicknessNm: 220 },
  { material: "SiO2", thicknessNm: 500 },
]);
// A short, curated list rather than every Base Materials token across the
// whole 12-row dataset (6 distinct) -- keeps this checklist's rendered
// height well under its cap on a page already tight on vertical room.
export const addPointBaseMaterialsOptions = ["Si3N4", "SiO2", "Ta2O5"];
// Same "(preview: Au, SiO2, …)" hint AddPointDialog's own materialClassHints
// computes, next to each Material Class option -- learned from what this
// dataset actually pairs together (see materialsByClass), not a hardcoded
// taxonomy.
const MATERIAL_CLASS_PREVIEW_COUNT = 3;
export const addPointMaterialClassHints: Record<string, string> = {};
for (const [cls, materials] of Object.entries(
  materialsByClass(sampleRows, materialClassColumn, baseMaterialsColumn),
)) {
  if (materials.length === 0) continue;
  const preview = materials.slice(0, MATERIAL_CLASS_PREVIEW_COUNT).join(", ");
  addPointMaterialClassHints[cls] =
    materials.length > MATERIAL_CLASS_PREVIEW_COUNT ? `${preview}…` : preview;
}

// Page 12's "the result" figure -- the M1 design above as an actual row,
// flagged MANUAL_ROW_FLAG so FomChart draws it exactly as a real manually
// added point would (gold-outlined diamond, counted in "N added manually").
// Appended to a COPY of sampleRows, not sampleRows itself, so every other
// page's chart keeps plotting only the twelve literature points.
export const addPointResultRow: DataRow = {
  Ref: "M1",
  Title: addPointLabel,
  Domain: "Wavelength",
  Origin: "SIM",
  "Material Class": addPointTags.value["Material Class"].join(";"),
  "Base Materials": addPointTags.value["Base Materials"].join(";"),
  "Resonance Wavelength (nm)": 1550,
  "Q-factor": 50000,
  "FOM (RIU^-1)": 2900,
  "Sensitivity (nm/RIU)": 85,
  "FWHM (nm)": 0.031,
  "Layer Structure": formatLayerStructure(addPointLayers.value),
  "Review status": "Approve (AI)",
  Notes: addPointNotes,
  [MANUAL_ROW_FLAG]: true,
};
export const addPointResultRows: DataRow[] = [...sampleRows, addPointResultRow];
