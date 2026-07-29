<template>
  <ToolActionsBar :tool-name="t('nav.visualization')" :show-import="false" :show-export="false" />

  <main class="animate-in fade-in grow px-3 pb-4 duration-300 sm:px-4 lg:px-5">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <Card
        v-if="fomData.length === 0"
        class="mt-4 overflow-hidden rounded-4xl border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <div class="max-w-2xl">
          <p class="text-xs uppercase tracking-[0.3em] text-secondary">
            {{ t("view.visualization.hero.eyebrow") }}
          </p>
          <h2 class="mt-2 text-2xl font-semibold text-ink">
            {{ t("view.visualization.hero.title") }}
          </h2>
          <p class="mt-2 text-sm leading-6 text-secondary">
            {{ t("view.visualization.hero.description") }}
          </p>
        </div>

        <FileDropzone ref="dropzoneRef" compact class="mt-4" @files-selected="handleUpload" />
      </Card>

      <StatusToast
        :status-key="statusKey"
        :status-class="statusClass"
        :fade-style="statusStyle"
        :duration-ms="ringDurationMs"
        :token="statusToken"
        @dismiss="dismissStatus"
      />

      <Card
        v-if="fomData.length > 0"
        class="mt-4 gap-0 overflow-hidden rounded-2xl border-secondary/10 bg-card/70 p-0 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <div class="flex items-center justify-between border-b border-secondary/10 px-5 py-3.5">
          <span class="text-sm font-semibold text-ink">{{ t("fomcharts.workspace.title") }}</span>
          <div class="flex items-center gap-2">
            <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30" @click="openImportDialog">
              <Upload />
              {{ t("actions.import") }}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  size="xs"
                  :disabled="filteredData.length === 0"
                  class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30"
                >
                  <Download />
                  {{ t("actions.export") }}
                  <ChevronDown class="size-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem @select="handleExportCsv">{{ t("fomcharts.export.csv") }}</DropdownMenuItem>
                <DropdownMenuItem @select="handleExportXlsx">{{ t("fomcharts.export.xlsx") }}</DropdownMenuItem>
                <DropdownMenuItem @select="handleExportPng">{{ t("fomcharts.export.png") }}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div class="h-5 w-px bg-secondary/15" />

            <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30" @click="resetWorkspace">
              <RotateCcw />
              {{ t("fomcharts.workspace.reset") }}
            </Button>
          </div>
        </div>

        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:gap-5 lg:p-5">
          <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-legend="showLegend"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:trend-type="trendType"
            v-model:show-axis-names="showAxisNames"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:show-pareto="showPareto"
            :legend-disabled="!hasLegendContent"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :domain-column="domainColumn"
            :domain-values="domainValues"
            :domain-counts="domainCounts"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
          />

          <div class="min-w-0 flex-1">
            <FomChart
              ref="fomChartRef"
              :chart-data="chartDisplayData"
              :columns="fomColumns"
              :y-axis="selectedYAxis"
              :x-axis="selectedXAxis"
              :group-by="groupBy"
              :y-axis-scale="yAxisScale"
              :chart-title="chartTitle"
              :show-legend="showLegend"
              :show-median="showMedian"
              :show-trend="showTrend"
              :trend-type="trendType"
              :show-pareto="showPareto"
              :show-axis-names="showAxisNames"
              :x-axis-numeric="xAxisNumeric"
              :highlight-group="highlightGroup"
              :group-color-map="groupColorMap"
              @point-click="handlePointClick"
            />
          </div>

          <aside class="flex w-full flex-col gap-4 lg:w-70 lg:shrink-0">
            <StatsSummaryPanel
              v-model:open="statsPanelOpen"
              v-model:group-by="groupBy"
              :rows="plottableData"
              :y-axis="selectedYAxis"
              :x-axis="selectedXAxis"
              :group-by-columns="groupByColumns"
              :highlight-group="highlightGroup"
              :composite-columns="compositeColumns"
              :group-color-map="groupColorMap"
              @toggle-highlight="toggleHighlight"
            />
            <AnnotationsPanel
              v-model:open="annotationsPanelOpen"
              v-model:show-only-annotated="showOnlyAnnotated"
              :annotations="annotations"
              :columns="fomColumns"
              :rows="allPlottableData"
              :x-axis="selectedXAxis"
              :y-axis="selectedYAxis"
              :group-by="groupBy"
              @remove="removeAnnotation"
              @clear="clearAnnotations"
              @update-note="updateAnnotationNote"
              @pin-rows="pinRows"
            />
          </aside>
        </div>
      </Card>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Download, RotateCcw, Upload } from "@lucide/vue";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import StatusToast from "@/components/shared/StatusToast.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import AnnotationsPanel, { type Annotation } from "@/components/visualization/AnnotationsPanel.vue";
import { apiService } from "@/services/api";
import { exportRowsAsExcel } from "@/utils/excelExport";
import { exportRowsAsCsv } from "@/utils/csvExport";
import { useTransientStatus } from "@/composables/useTransientStatus";
import { filterPlottable, type TrendType } from "@/utils/stats";
import { assignGroupColors } from "@/utils/palette";
import {
  detectColumnTypes,
  guessDefaultYAxis,
  guessDefaultXAxis,
  guessDefaultColorGroup,
  groupableColumns,
  filterExportColumns,
  findDomainColumn,
  findOriginColumn,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findModeIdColumn,
  findEvidenceColumn,
  findNotesColumn,
  distinctValues,
  tokenizedDistinctValues,
  tokenizeValue,
  type DataRow,
} from "@/utils/columnTypes";

const STATUS_VISIBLE_MS = 15000;

const { t } = useI18n();

const {
  statusKey,
  statusClass,
  statusStyle,
  statusToken,
  ringDurationMs,
  setStatus,
  setTransientStatus,
  dismissStatus,
  clearStatus,
} = useTransientStatus(STATUS_VISIBLE_MS);
const fomData = ref<DataRow[]>([]);
const fomColumns = ref<string[]>([]);
const dropzoneRef = ref<InstanceType<typeof FileDropzone> | null>(null);
const fomChartRef = ref<InstanceType<typeof FomChart> | null>(null);

const selectedYAxis = ref<string | null>(null);
const selectedXAxis = ref<string | null>(null);
const groupBy = ref<string | null>(null);
const yAxisScale = ref<"log" | "value">("log");
const chartTitle = ref("");
// On by default -- only turned off automatically when there's genuinely
// nothing to show (see GraphControls' legendDisabled watch).
const showLegend = ref(true);
const showMedian = ref(false);
const showTrend = ref(false);
const trendType = ref<TrendType | "auto">("auto");
const showAxisNames = ref(false);
const highlightGroup = ref<string | null>(null);
const selectedDomains = ref<string[]>([]);
const selectedOrigins = ref<string[]>([]);
const selectedMaterialClasses = ref<string[]>([]);
const selectedBaseMaterials = ref<string[]>([]);
const showPareto = ref(false);
const annotations = ref<Annotation[]>([]);
// "Afficher uniquement les points épinglés" (AnnotationsPanel) -- narrows
// the chart and stats down to exactly the pinned rows, for comparing a
// handful of specific points (e.g. one paper's several modes) without the
// rest of the dataset competing for attention. See chartDisplayData/
// plottableData below; forced back off whenever there's nothing pinned
// left to show (see the annotations-length watch).
const showOnlyAnnotated = ref(false);
let annotationSeq = 0;

// Right-side panels behave as an accordion -- only one of Stats Summary /
// Annotations stays open at a time, so the sidebar never grows tall enough
// to force the whole workspace into a long scroll. A single source of
// truth (rightPanelOpen) drives both panels' v-model:open.
type RightPanel = "stats" | "annotations" | null;
const rightPanelOpen = ref<RightPanel>("stats");
const statsPanelOpen = computed({
  get: () => rightPanelOpen.value === "stats",
  set: (v: boolean) => {
    rightPanelOpen.value = v ? "stats" : rightPanelOpen.value === "stats" ? null : rightPanelOpen.value;
  },
});
const annotationsPanelOpen = computed({
  get: () => rightPanelOpen.value === "annotations",
  set: (v: boolean) => {
    rightPanelOpen.value = v ? "annotations" : rightPanelOpen.value === "annotations" ? null : rightPanelOpen.value;
  },
});

const columnTypes = computed(() =>
  detectColumnTypes(fomData.value, fomColumns.value),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);
// Drives both the X-axis type on the chart (category vs. numeric value
// axis) and whether the "Trend line" control is enabled -- a regression
// line only means something against a numeric X, not a category label.
const xAxisNumeric = computed(() => numericColumns.value.includes(selectedXAxis.value ?? ""));

// Mirrors FomChart's own legendData gating (group-by colors, or a trend/
// Pareto overlay with both axes numeric) -- with none of these active the
// legend would render empty, so "Show legend" gets disabled rather than
// leaving a switch a researcher can flip with no visible effect.
const hasLegendContent = computed(() => {
  const overlayReady = xAxisNumeric.value && !!selectedXAxis.value && !!selectedYAxis.value;
  return !!groupBy.value || (showTrend.value && overlayReady) || (showPareto.value && overlayReady);
});

// Domain (wavelength/frequency/unclear) and Origin (EXP/SIM) columns power
// the Phase 1 "Domain control" / "Origin control" filters — they only show
// up in richer harmonized exports, so these stay null for the plain
// gold-standard file and the filter UI simply doesn't render.
const domainColumn = computed(() => findDomainColumn(fomColumns.value));
const originColumn = computed(() => findOriginColumn(fomColumns.value));
const materialClassColumn = computed(() => findMaterialClassColumn(fomColumns.value));
const baseMaterialsColumn = computed(() => findBaseMaterialsColumn(fomColumns.value));
const modeIdColumn = computed(() => findModeIdColumn(fomColumns.value));
// Composite (semicolon/comma-separated) columns -- both get the same
// tokenized filter/group-by/color treatment (see utils/columnTypes.ts and
// FomChart's isGroupingByCompositeColumn).
const compositeColumns = computed(() =>
  [materialClassColumn.value, baseMaterialsColumn.value].filter((c): c is string => c !== null),
);
// Origin and the composite columns already have their own dedicated filter
// UI and are meant for grouping/coloring, not for X-axis position -- a
// composite cell's raw, un-tokenized string ("Dielectric;Metal") would just
// clutter the X axis with combinations no one picked individually, and
// Origin's two values (EXP/SIM) make a mostly-empty, uninformative axis.
// categoricalColumns itself stays untouched since groupableColumns (below)
// still needs the full list.
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
// off the full unfiltered dataset (not filteredData) so a chip's count
// doesn't shrink as soon as its own filter group excludes other values;
// it always answers "how many points have this value in the data", not
// "how many are currently visible". Composite columns (Material Class,
// Base Materials) count a row toward every token it lists, same as
// tokenizedDistinctValues does for the chip list itself.
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
  const rawLabels = compositeColumns.value.includes(col)
    ? tokenizedDistinctValues(fomData.value, col)
    : distinctValues(fomData.value, col);
  const hasBlank = fomData.value.some((row) => {
    const v = row[col];
    return v === null || v === undefined || v === "";
  });
  const labels = hasBlank ? [...rawLabels, t("fomcharts.unknownGroup")] : rawLabels;
  return assignGroupColors(labels);
});

const filteredData = computed(() => {
  return fomData.value.filter((row) => {
    if (domainColumn.value) {
      const v = row[domainColumn.value];
      const isSet = v !== null && v !== undefined && v !== "";
      if (isSet && !selectedDomains.value.includes(String(v))) return false;
    }
    if (originColumn.value) {
      const v = row[originColumn.value];
      const isSet = v !== null && v !== undefined && v !== "";
      if (isSet && !selectedOrigins.value.includes(String(v))) return false;
    }
    if (materialClassColumn.value) {
      const tokens = tokenizeValue(row[materialClassColumn.value]);
      const isSet = tokens.length > 0;
      // Unchecking "Dielectric" must drop every row that lists Dielectric
      // at all, including composite ones like "Dielectric;Metal" -- so a
      // row only survives if ALL of its tokens are still checked, not just
      // one of them.
      if (isSet && !tokens.every((tok) => selectedMaterialClasses.value.includes(tok))) return false;
    }
    if (baseMaterialsColumn.value) {
      const tokens = tokenizeValue(row[baseMaterialsColumn.value]);
      const isSet = tokens.length > 0;
      if (isSet && !tokens.every((tok) => selectedBaseMaterials.value.includes(tok))) return false;
    }
    return true;
  });
});

// The same "drop rows with a blank/non-numeric Y (and X, when the X axis is
// itself numeric)" rule the chart itself applies (see FomChart's own
// plottableData) -- computed once here so the stats panel's N always
// matches exactly what's plotted, not a superset that still counts rows
// the chart silently excluded for missing X (e.g. a numeric X axis like
// Sensitivity with some blank cells). Independent of showOnlyAnnotated --
// this is the full candidate pool AnnotationsPanel searches for pin-able
// sibling rows (see allPlottableData below), so "pin the other modes of
// this paper" keeps working even while only pinned points are on screen.
const allPlottableData = computed(() => {
  const yFiltered = filterPlottable(filteredData.value, selectedYAxis.value);
  return xAxisNumeric.value ? filterPlottable(yFiltered, selectedXAxis.value) : yFiltered;
});

// Rows actually reaching the chart -- narrowed to just the pinned
// annotations when showOnlyAnnotated is on (see AnnotationsPanel). Reads off
// fomData (the full unfiltered dataset), not filteredData -- a pin is a
// deliberate bookmark of one specific row, so toggling this on must show
// every pinned row regardless of the current Domain/Origin/Material Class
// filter chips. Filtering from filteredData instead silently dropped any
// pinned row the active filters happened to exclude (e.g. pinning both a
// paper's EXP and SIM modes, then the default "SIM only" Origin filter
// hiding the EXP one) -- the toggle looked broken, showing fewer points
// than were actually pinned, with no indication why.
//
// Matches by content (rowsEqual), not by object reference -- a pinned row's
// `annotation.row` is captured from the chart's click event (ECharts
// `params.data.row`), which vue-echarts does not guarantee is the exact
// same object identity as the row sitting in fomData by the time this
// recomputes (observed in practice: `fomData.value.some(r => r ===
// annotation.row)` can come back false for a row that was just pinned off
// that very array). Content equality is what the rest of the annotations
// feature already relies on for "is this the same row" (see rowsEqual /
// isAlreadyPinned below), so this reuses the same rule instead of a
// reference-based Set that silently drops rows whose identity didn't survive
// the click round-trip.
const chartDisplayData = computed(() =>
  showOnlyAnnotated.value
    ? fomData.value.filter((row) => annotations.value.some((a) => rowsEqual(a.row, row)))
    : filteredData.value,
);

// Stats panel reads off the same narrowed set as the chart, so its N/mean/
// median/σ never describe more points than are actually visible.
const plottableData = computed(() => {
  const yFiltered = filterPlottable(chartDisplayData.value, selectedYAxis.value);
  return xAxisNumeric.value ? filterPlottable(yFiltered, selectedXAxis.value) : yFiltered;
});

// Only offer low-cardinality columns for "Group / Color by" — computed off
// the post-filter data so the list adapts as Domain/Origin filtering
// changes which values are actually still in play. Composite columns and
// Mode ID are exempt from that cap regardless (see groupableColumns) --
// kept as a separate list from compositeColumns itself, since Mode ID
// isn't tokenized like Material Class/Base Materials are (see
// groupColorMap and FomChart's isGroupingByCompositeColumn).
const groupByExemptColumns = computed(() =>
  [...compositeColumns.value, modeIdColumn.value].filter((c): c is string => c !== null),
);
const groupByColumns = computed(() =>
  groupableColumns(filteredData.value, categoricalColumns.value, groupByExemptColumns.value),
);

// Isolating a single group by clicking its card in StatsSummaryPanel only
// makes sense for the grouping that was active when it was set -- reset it
// whenever groupBy itself changes or is cleared.
watch(groupBy, () => {
  highlightGroup.value = null;
});

const toggleHighlight = (group: string) => {
  highlightGroup.value = highlightGroup.value === group ? null : group;
};

// Nothing pinned left to narrow down to -- force the toggle back off rather
// than leave the chart silently empty with no visible explanation why.
watch(
  () => annotations.value.length,
  (len) => {
    if (len === 0) showOnlyAnnotated.value = false;
  },
);

// Even with pins still present, "show only pinned" can still end up with
// nothing to draw -- e.g. a Domain/Origin/Material filter change excludes
// every pinned row from filteredData, or the X/Y axis changes to columns
// where the pinned rows have no valid coordinate (see plottableData).
// Rather than leave a silently blank chart with the toggle still checked,
// switch it back off and explain why.
watch(plottableData, (rows) => {
  if (showOnlyAnnotated.value && rows.length === 0 && annotations.value.length > 0) {
    showOnlyAnnotated.value = false;
    setTransientStatus("status.noMatchingPins", "border-amber-500/20 bg-amber-500/12 text-amber-950");
  }
});

/** Re-runs the same best-guess defaulting used right after an upload,
 * against whichever dataset is currently loaded -- shared by handleUpload
 * (first load) and resetWorkspace (same dataset, fresh config). */
const applyDefaults = () => {
  selectedYAxis.value = guessDefaultYAxis(numericColumns.value);
  selectedXAxis.value = guessDefaultXAxis(fomData.value, xAxisCategoricalColumns.value, numericColumns.value);
  // Domain defaults to wavelength-only records, matching Phase 1's
  // "include wavelength-domain FOM records only" requirement — frequency
  // domain / ambiguous rows stay available but opt-in via the checkboxes.
  // Origin (EXP/SIM) defaults to SIM-only -- EXP starts unchecked, opt-in
  // via the checkbox like the other filters' excluded values.
  // Material Class defaults to all available tokens.
  // Set before the groupBy default below, since groupByColumns is
  // computed off the domain/origin-filtered data.
  const wavelengthOnly = domainValues.value.filter((v) => /wavelength/i.test(v));
  selectedDomains.value = wavelengthOnly.length > 0 ? wavelengthOnly : domainValues.value;
  const nonExpOrigins = originValues.value.filter((v) => !/^exp$/i.test(v));
  selectedOrigins.value = nonExpOrigins.length > 0 ? nonExpOrigins : originValues.value;
  selectedMaterialClasses.value = materialClassValues.value;
  selectedBaseMaterials.value = baseMaterialsValues.value;
  groupBy.value = guessDefaultColorGroup(groupByColumns.value);
  chartTitle.value = "";
  yAxisScale.value = "log";
  showLegend.value = true;
  showMedian.value = false;
  showTrend.value = false;
  trendType.value = "auto";
  showAxisNames.value = false;
  showPareto.value = false;
  highlightGroup.value = null;
};

const handleUpload = async ([file]: File[]) => {
  setStatus(
    "status.uploading",
    "border-amber-500/20 bg-amber-500/12 text-amber-950",
  );

  try {
    const data = await apiService.uploadExcel(file);
    fomData.value = data.data;
    fomColumns.value = data.columns;
    applyDefaults();
    annotations.value = [];
    setTransientStatus(
      "status.success",
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
    );
  } catch (error) {
    setTransientStatus(
      "status.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
  }
};
const resetToDropzone = () => {
  clearStatus();
  fomData.value = [];
  fomColumns.value = [];
  groupBy.value = null;
  selectedDomains.value = [];
  selectedOrigins.value = [];
  selectedMaterialClasses.value = [];
  selectedBaseMaterials.value = [];
  showPareto.value = false;
  annotations.value = [];
};

const openImportDialog = () => {
  if (fomData.value.length > 0) {
    resetToDropzone();
  }
  dropzoneRef.value?.triggerFileInput();
};

// Resets chart configuration (axes, scale, display toggles, filters,
// annotations) back to the same smart defaults a fresh upload gets --
// without touching the loaded dataset itself. Distinct from Import, which
// clears the dataset and reopens the file picker.
const resetWorkspace = () => {
  applyDefaults();
  annotations.value = [];
};

const handleExportCsv = () => {
  exportRowsAsCsv(filterExportColumns(fomColumns.value), filteredData.value, "fom_data_export.csv");
};
const handleExportXlsx = () => {
  // Export the filtered dataset, not the raw upload — matches Phase 1's
  // "export the filtered analysis dataset" requirement. Columns are also
  // curated: quote paragraphs/page numbers/notes/model name are audit
  // trail for one record's tooltip, not something you want repeated
  // across dozens of exported rows in a spreadsheet.
  exportRowsAsExcel(
    filterExportColumns(fomColumns.value),
    filteredData.value,
    "fom_data_export.xlsx",
  );
};
const handleExportPng = () => {
  fomChartRef.value?.exportPng();
};

// Pre-fills a new annotation's note with whatever the Excel already says
// about this record (Notes, then the Evidence quote) instead of only
// surfacing that text in the chart's hover tooltip -- a note is a place to
// actually read it, not a popup that has to stay short. Shared by
// handlePointClick (one row) and pinRows (several at once, e.g. "pin the
// other modes of this paper") so both build annotations the same way.
const buildAnnotation = (row: DataRow): Annotation => {
  const notesCol = findNotesColumn(fomColumns.value);
  const evidenceCol = findEvidenceColumn(fomColumns.value);
  const notesText = notesCol ? String(row[notesCol] ?? "").trim() : "";
  const evidenceText = evidenceCol ? String(row[evidenceCol] ?? "").trim() : "";
  const prefilledNote = [notesText, evidenceText].filter(Boolean).join("\n\n");
  const ref = String(row.ref ?? row.Ref ?? "");
  return {
    id: `${ref}-${annotationSeq++}`,
    ref,
    title: String(row.title ?? row.Title ?? ""),
    row,
    note: prefilledNote,
    createdAt: Date.now(),
  };
};

// Rows are the same PIN candidate either when they're the exact same object
// (re-clicking/re-pinning the identical record -- filtering/mapping never
// clones rows, so reference equality already catches this) OR when every
// column value matches (two genuinely duplicate rows in the source data,
// e.g. the same paper/mode listed twice) -- without the second check, two
// such rows look pinned twice for "the same point" even though they're
// technically distinct row objects.
const rowsEqual = (a: DataRow, b: DataRow): boolean => {
  if (a === b) return true;
  return fomColumns.value.every((col) => a[col] === b[col]);
};
const isAlreadyPinned = (row: DataRow) => annotations.value.some((a) => rowsEqual(a.row, row));

// Pinning is a lightweight, session-only bookmark -- no persistence, no
// backend round-trip. Re-clicking the same (or a content-identical) point
// is a no-op rather than stacking duplicate pins.
const handlePointClick = (point: {
  ref: string;
  xLabel: string;
  xValue: unknown;
  yLabel: string;
  yValue: unknown;
  extras: Record<string, unknown>;
  row: DataRow;
}) => {
  if (isAlreadyPinned(point.row)) return;
  const newAnnotation = buildAnnotation(point.row);
  annotations.value = [...annotations.value, newAnnotation];
  // Pinning a point is the whole point of clicking the chart -- open the
  // Annotations panel automatically so the researcher immediately sees the
  // pin land, instead of having to know to expand the accordion themselves.
  annotationsPanelOpen.value = true;
};

// "Épingler aussi les N autres points de cet article" (AnnotationsPanel,
// per pinned card) -- pins every given row in one go instead of making the
// researcher click each overlapping mode individually on the chart.
const pinRows = (rows: DataRow[]) => {
  const newAnnotations: Annotation[] = [];
  for (const row of rows) {
    // Also guard within this same batch -- siblingsFor can otherwise offer
    // several source rows that are themselves content-duplicates of each
    // other, which would pin the same-looking point more than once in a
    // single click.
    if (isAlreadyPinned(row) || newAnnotations.some((a) => rowsEqual(a.row, row))) continue;
    newAnnotations.push(buildAnnotation(row));
  }
  if (newAnnotations.length === 0) return;
  annotations.value = [...annotations.value, ...newAnnotations];
  annotationsPanelOpen.value = true;
};

const removeAnnotation = (id: string) => {
  annotations.value = annotations.value.filter((a) => a.id !== id);
};

const clearAnnotations = () => {
  annotations.value = [];
};

const updateAnnotationNote = (id: string, note: string) => {
  annotations.value = annotations.value.map((a) => (a.id === id ? { ...a, note } : a));
};
</script>
