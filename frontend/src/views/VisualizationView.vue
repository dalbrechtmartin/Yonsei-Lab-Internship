<template>
  <ToolActionsBar
    :tool-name="t('nav.visualization')"
    :show-import="false"
    :show-export="false"
  />

  <main
    class="animate-in fade-in flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-4 duration-300 sm:px-4 lg:px-5"
  >
    <div
      class="mx-auto flex max-w-2xl flex-col items-center gap-3 py-16 text-center lg:hidden"
    >
      <MonitorSmartphone class="size-10 text-secondary" />
      <p class="text-sm leading-6 text-secondary">
        {{ t("view.visualization.mobileBlocked") }}
      </p>
    </div>

    <div
      class="mx-auto hidden w-full max-w-[104rem] flex-col gap-4 lg:flex lg:min-h-0 lg:flex-1 2xl:max-w-[150rem]"
    >
      <!-- Persistent regardless of which view is showing -- see
           openImportDialog, which clicks this directly instead of tearing
           down the loaded workspace to get back to FileDropzone's own
           input first. -->
      <input
        ref="reimportInputRef"
        type="file"
        accept=".xlsx, .xls, .csv"
        class="hidden"
        @change="handleReimportFileSelect"
      />

      <AddPointDialog
        v-model:open="addPointDialogOpen"
        :fields="manualPointFields"
        :materials-by-class="materialsByClassMap"
        @submit="handleAddPointSubmit"
      />
      <AddPointDialog
        v-model:open="editPointDialogOpen"
        mode="edit"
        :fields="manualPointFields"
        :materials-by-class="materialsByClassMap"
        :initial-row="editingRow"
        :initial-label="editingInitialLabel"
        :initial-notes="editingInitialNotes"
        :initial-shape="editingInitialShape"
        @submit="handleEditPointSubmit"
      />

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

        <FileDropzone
          ref="dropzoneRef"
          compact
          class="mt-4"
          @files-selected="handleUpload"
        />
      </Card>

      <Card
        v-if="fomData.length > 0"
        class="mt-4 flex min-h-0 flex-1 flex-col gap-0 overflow-x-hidden overflow-y-auto rounded-2xl border-secondary/10 bg-card/70 p-0 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <!-- Sticky, not just shrink-0 -- on a viewport short enough that even
             the chart's min-height floor (see FomChart's fillHeight box)
             doesn't fit the row below, this Card is what actually scrolls
             (overflow-y-auto above) rather than silently clipping the chart's
             bottom half. Keeping this pinned while that happens is what
             stops the toolbar row from scrolling out of reach along with it. -->
        <div
          class="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-secondary/10 bg-card/95 px-5 py-3.5 backdrop-blur-xl"
        >
          <span class="text-sm font-semibold text-ink">{{
            t("fomcharts.workspace.title")
          }}</span>
          <div class="flex items-center gap-2">
            <Button
              variant="outline"
              size="xs"
              class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30"
              @click="openImportDialog"
            >
              <Upload />
              {{ t("actions.import") }}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger as-child>
                <Button
                  variant="outline"
                  size="xs"
                  :disabled="plottableData.length === 0"
                  class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30"
                >
                  <Download />
                  {{ t("actions.export") }}
                  <ChevronDown class="size-2.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem @select="handleExportCsv">{{
                  t("fomcharts.export.csv")
                }}</DropdownMenuItem>
                <DropdownMenuItem @select="handleExportXlsx">{{
                  t("fomcharts.export.xlsx")
                }}</DropdownMenuItem>
                <DropdownMenuItem @select="handleExportPng">{{
                  t("fomcharts.export.png")
                }}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div class="h-5 w-px bg-secondary/15" />

            <Button
              variant="outline"
              size="xs"
              class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30"
              @click="resetWorkspace"
            >
              <RotateCcw />
              {{ t("fomcharts.workspace.reset") }}
            </Button>
          </div>
        </div>

        <div
          class="flex min-h-0 flex-1 flex-col gap-4 p-4 lg:flex-row lg:gap-5 lg:p-5"
        >
          <div
            class="w-full lg:h-full lg:w-56 lg:shrink-0 lg:overflow-x-hidden lg:overflow-y-auto"
          >
            <GraphControls
              v-model:y-axis="selectedYAxis"
              v-model:x-axis="selectedXAxis"
              v-model:axis-linked="axisLinked"
              v-model:scale="yAxisScale"
              v-model:chart-title="chartTitle"
              v-model:title-is-auto="chartTitleIsAuto"
              v-model:show-legend="showLegend"
              v-model:show-median="showMedian"
              v-model:show-trend="showTrend"
              v-model:trend-type="trendType"
              v-model:selected-domains="selectedDomains"
              v-model:selected-origins="selectedOrigins"
              v-model:selected-material-classes="selectedMaterialClasses"
              v-model:selected-base-materials="selectedBaseMaterials"
              v-model:composite-filter-mode="compositeFilterMode"
              v-model:show-pareto="showPareto"
              v-model:exclude-needs-review="excludeNeedsReview"
              v-model:point-size-mode="pointSizeMode"
              v-model:point-size-by="pointSizeBy"
              v-model:point-size="pointSize"
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
              :needs-review-column="reviewStatusColumn"
              :needs-review-count="needsReviewCount"
            />
          </div>

          <div class="flex min-h-0 min-w-0 flex-1 flex-col">
            <FomChart
              ref="fomChartRef"
              class="flex min-h-0 flex-1 flex-col"
              fill-height
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
              :x-axis-numeric="xAxisNumeric"
              :y-axis-numeric="yAxisNumeric"
              :highlight-group="highlightGroup"
              :group-color-map="groupColorMap"
              :group-by-selected-tokens="groupBySelectedTokens"
              :merge-multi-category-points="mergeMultiCategoryPoints"
              :point-size-mode="pointSizeMode"
              :point-size-by="pointSizeBy"
              :point-size="pointSize"
              :pinned-rows="pinnedRows"
              :include-custom-in-stats="includeCustomInStats"
              :pulse-target-ref="pulseTargetRef"
              :hovered-row="hoveredRow"
              :preview-row="previewRow"
              @point-click="handlePointClick"
              @point-context-hide="hideDataRow"
              @point-context-delete="removeDataRow"
              @point-context-edit="openEditDialog"
              @point-context-reset="handleResetPoint"
              @point-context-pin="(row) => pinRows([row])"
              @point-context-unpin="unpinRow"
            />
          </div>

          <aside
            class="flex w-full flex-col gap-4 lg:h-full lg:w-70 lg:shrink-0 lg:overflow-x-hidden lg:overflow-y-auto"
          >
            <StatsSummaryPanel
              v-model:open="statsPanelOpen"
              v-model:group-by="groupBy"
              v-model:merge-multi-category-points="mergeMultiCategoryPoints"
              :rows="statsRows"
              :y-axis="selectedYAxis"
              :y-axis-numeric="yAxisNumeric"
              :x-axis="selectedXAxis"
              :group-by-columns="groupByColumns"
              :highlight-group="highlightGroup"
              :composite-columns="compositeColumns"
              :group-color-map="groupColorMap"
              :group-by-selected-tokens="groupBySelectedTokens"
              @toggle-highlight="toggleHighlight"
            />
            <DataPointsTable
              v-model:open="pointsPanelOpen"
              v-model:include-custom-in-stats="includeCustomInStats"
              :rows="plottableData"
              :hidden-rows="hiddenRows"
              :pinned-rows="pinnedRows"
              :columns="fomColumns"
              :y-axis="selectedYAxis"
              :group-color-map="groupColorMap"
              :group-by="groupBy"
              @hide="hideDataRow"
              @remove="removeDataRow"
              @unhide="unhideRow"
              @pin="(row) => pinRows([row], { openPanel: false })"
              @unpin="unpinRow"
              @edit="openEditDialog"
              @reset-point="handleResetPoint"
              @add-point="addPointDialogOpen = true"
              @hover-row="(row) => (hoveredRow = row)"
              @pin-rows="(rows) => pinRows(rows, { openPanel: false })"
              @unpin-rows="unpinRows"
              @hide-rows="hideDataRows"
              @show-only-rows="showOnlyRows"
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

      <StatusToast
        :status-key="statusKey"
        :status-class="statusClass"
        :fade-style="statusStyle"
        :duration-ms="ringDurationMs"
        :token="statusToken"
        @dismiss="dismissStatus"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  ChevronDown,
  Download,
  MonitorSmartphone,
  RotateCcw,
  Upload,
} from "@lucide/vue";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import StatusToast from "@/components/shared/StatusToast.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import AnnotationsPanel from "@/components/visualization/AnnotationsPanel.vue";
import AddPointDialog from "@/components/visualization/AddPointDialog.vue";
import DataPointsTable from "@/components/visualization/DataPointsTable.vue";
import { apiService, MultipleSheetsError } from "@/services/api";
import { exportRowsAsExcel } from "@/utils/excelExport";
import { exportRowsAsCsv } from "@/utils/csvExport";
import { useTransientStatus } from "@/composables/useTransientStatus";
import { useAccordionPanel } from "@/composables/useAccordionPanel";
import { useFomColumnMeta } from "@/composables/useFomColumnMeta";
import { useManualPoints } from "@/composables/useManualPoints";
import { useAnnotationPins } from "@/composables/useAnnotationPins";
import { filterPlottable, type TrendType } from "@/utils/stats";
import { takeIncomingVisualizationFile } from "@/composables/useIncomingVisualizationFile";
import {
  guessDefaultYAxis,
  guessDefaultXAxis,
  guessDefaultColorGroup,
  groupableColumns,
  filterExportColumns,
  isNeedsReviewRow,
  isManualRow,
  formatUnitSuperscripts,
  tokenizeValue,
  needsAiConversion,
  rowKey,
  type DataRow,
} from "@/utils/columnTypes";

const STATUS_VISIBLE_MS = 5000;

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
} = useTransientStatus(STATUS_VISIBLE_MS);
const fomData = ref<DataRow[]>([]);
const fomColumns = ref<string[]>([]);
const dropzoneRef = ref<InstanceType<typeof FileDropzone> | null>(null);
const fomChartRef = ref<InstanceType<typeof FomChart> | null>(null);

const selectedYAxis = ref<string | null>(null);
const selectedXAxis = ref<string | null>(null);
// AxisSelector's 🔗 toggle, threaded through GraphControls -- see its
// axisLinked model for what this gates.
const axisLinked = ref(true);
const groupBy = ref<string | null>(null);
const yAxisScale = ref<"log" | "value">("value");
const chartTitle = ref("");
// True while chartTitle tracks the axes automatically (see autoChartTitle
// below) -- flipped off the moment the researcher types a custom title or
// explicitly clears it (see GraphControls' titleIsAuto model), so neither
// action gets silently overwritten by the next axis change.
const chartTitleIsAuto = ref(true);
// On by default -- only turned off automatically when there's genuinely
// nothing to show (see GraphControls' legendDisabled watch).
const showLegend = ref(true);
const showMedian = ref(false);
const showTrend = ref(false);
const trendType = ref<TrendType | "auto">("auto");
const highlightGroup = ref<string | null>(null);
const selectedDomains = ref<string[]>([]);
const selectedOrigins = ref<string[]>([]);
const selectedMaterialClasses = ref<string[]>([]);
const selectedBaseMaterials = ref<string[]>([]);
// Strict = a row must keep ALL of its Material Class/Base Materials tokens
// checked to survive (the original behavior). Lenient = a row survives as
// soon as at least one of its tokens is still checked -- so unchecking
// "Metal" no longer silently drops a "Dielectric;Metal" row that's really
// still wanted for its Dielectric side. Defaults to lenient: it's the less
// surprising reading of "exclude Metal" for a multi-valued column, and with
// nothing yet unchecked (the default, everything-selected state) the two
// modes agree anyway. Applies to both composite filters at once -- see
// filteredData below and groupBySelectedTokens, which keeps the chart/stats
// grouping from re-surfacing a token a lenient survivor still carries but
// the user did exclude.
const compositeFilterMode = ref<"strict" | "lenient">("lenient");
// Purely a rendering choice for FomChart (see isGroupingByCompositeColumn
// there) -- a row with several Material Class/Base Materials tokens either
// plots as one duplicate point per token or as a single merged marker.
// Defaults on the moment groupBy becomes a composite column (see the watch
// below) -- the toggle only ever shows in that situation, so it should be
// worth looking at the first time a researcher sees it rather than off by
// default and easy to miss.
const mergeMultiCategoryPoints = ref(false);
const showPareto = ref(false);
// "Masquer les points à vérifier" (Filters section) -- excludes rows whose
// Review status is "Edit" (see isNeedsReviewRow), the same rows FomChart
// already flags with a dashed outline. Off by default: the flag is a
// data-quality hint to look closer, not a reason to hide a record outright.
const excludeNeedsReview = ref(false);
// "Taille des points" (Display section). byValue sizes each point off
// pointSizeBy's value between a floor and pointSize itself (see FomChart's
// bubbleSizeFor); constant draws every point at pointSize flat. Off
// (constant) by default -- sizing by value is opt-in. pointSizeBy itself
// stays null until the researcher turns the toggle on, at which point
// GraphControls fills it with the most logical measure for the current
// axes (see its guessPointSizeBy).
const pointSizeMode = ref<"constant" | "byValue">("constant");
const pointSizeBy = ref<string | null>(null);
const pointSize = ref(16);
// "Afficher uniquement les points épinglés" (AnnotationsPanel) -- narrows
// the chart and stats down to exactly the pinned rows, for comparing a
// handful of specific points (e.g. one paper's several modes) without the
// rest of the dataset competing for attention. See chartDisplayData/
// plottableData below; forced back off whenever there's nothing pinned
// left to show (see the annotations-length watch).
const showOnlyAnnotated = ref(false);

// Active Benchmarking: rows the researcher manually added via "Add data"
// (see MANUAL_ROW_FLAG/isManualRow) -- session-only like annotations, always
// drawn regardless of the Domain/Origin/Material filter chips (see
// chartDisplayData), and removed outright (not "hidden") since there's no
// underlying file record to hide-and-restore.
const customPoints = ref<DataRow[]>([]);
// "Inclure mes points ajoutés dans les statistiques" -- gates whether
// customPoints count toward median/trend/Pareto/N (see FomChart's
// includeCustomInStats prop and statsRows below). On by default: the whole
// point of adding a point is usually to see how it stacks up.
const includeCustomInStats = ref(true);
const addPointDialogOpen = ref(false);
// The row currently hovered in the DataPointsTable panel -- forwarded
// straight to FomChart's own hoveredRow prop so hovering a row previews
// exactly which point a click there would hide/remove (see FomChart's
// isHoveredRow / withItemStyle ring).
const hoveredRow = ref<DataRow | null>(null);

// Active Benchmarking: dataset rows explicitly hidden from the panel/chart
// (via the panel's eye-off icon or a right-click on the chart) -- kept as the
// actual rows (not just a key set) so the DataPointsTable panel can list them
// with a one-click "Réafficher" back to visible, not only via the toolbar's
// full "Réinitialiser". Content-keyed rather than by object reference, same
// reasoning as the annotations feature's sameRow (ECharts' click round-trip
// doesn't reliably preserve object identity, see
// composables/useAnnotationPins.ts). Persists across Domain/Origin/Material
// filter changes by construction (nothing here reacts to those refs) -- only
// cleared by unhiding a row individually, "Réinitialiser", or a fresh upload
// (see handleUpload).
const hiddenRows = ref<DataRow[]>([]);
const isRowHidden = (row: DataRow): boolean =>
  hiddenRows.value.some((r) => rowKey(r) === rowKey(row));
const hideDataRow = (row: DataRow) => {
  if (isRowHidden(row)) return;
  hiddenRows.value = [...hiddenRows.value, row];
};
const unhideRow = (row: DataRow) => {
  const key = rowKey(row);
  hiddenRows.value = hiddenRows.value.filter((r) => rowKey(r) !== key);
};

// DataPointsTable's group context menu "Masquer" -- same guard as
// hideDataRow (skip whatever's already hidden), just applied to every row of
// the group in one reactive update instead of one at a time. Never called
// with a pinned row: category groups are built from unpinnedSorted, so
// group.rows in a non-pinned group can never contain one (see DataPointsTable's
// categoryGroups), and the pinned group's own menu doesn't offer Masquer.
const hideDataRows = (rows: DataRow[]) => {
  const toHide = rows.filter((row) => !isRowHidden(row));
  if (toHide.length === 0) return;
  hiddenRows.value = [...hiddenRows.value, ...toHide];
};

// Whichever row is hovered in the panel, but only when it's currently a
// hidden one -- FomChart draws this as a separate, faint ghost point (see
// its previewRow prop) since a hidden row was already filtered out of
// chartData and has no normal point to style. Hovering a *visible* row
// instead already has one via hoveredRow/isHoveredRow, so this stays null
// then rather than drawing a duplicate on top of it.
const previewRow = computed(() =>
  hoveredRow.value && isRowHidden(hoveredRow.value) ? hoveredRow.value : null,
);

// Right-side panels behave as an accordion -- only one of Stats Summary /
// Data points / Annotations stays open at a time, so the sidebar never grows
// tall enough to force the whole workspace into a long scroll. See
// composables/useAccordionPanel.ts.
const { panel: rightPanel } = useAccordionPanel<"stats" | "points" | "annotations">("stats");
const statsPanelOpen = rightPanel("stats");
const pointsPanelOpen = rightPanel("points");
const annotationsPanelOpen = rightPanel("annotations");

// Column detection, per-value counts, and the group -> color map -- see
// composables/useFomColumnMeta.ts.
const {
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
} = useFomColumnMeta({ fomData, fomColumns, customPoints, groupBy, t });

// Active Benchmarking: add/edit/reset CRUD for manually-entered data points
// -- see composables/useManualPoints.ts.
const {
  manualPointFields,
  pulseTargetRef,
  removeCustomPoint,
  handleAddPointSubmit,
  editPointDialogOpen,
  editingRow,
  editingInitialLabel,
  editingInitialNotes,
  editingInitialShape,
  openEditDialog,
  handleEditPointSubmit,
  handleResetPoint,
} = useManualPoints({
  fomData,
  fomColumns,
  customPoints,
  selectedXAxis,
  selectedYAxis,
  numericColumns,
});

// Pin/unpin CRUD for chart annotations -- see composables/useAnnotationPins.ts.
const {
  annotations,
  sameRow,
  pinnedRows,
  handlePointClick,
  pinRows,
  removeAnnotation,
  unpinRow,
  unpinRows,
  clearAnnotations,
  updateAnnotationNote,
} = useAnnotationPins({ fomColumns, hiddenRows, annotationsPanelOpen });

// Deleting a literature row (DataPointsTable's "Supprimer définitivement",
// now offered for every row, not just manually added ones) drops it from
// fomData itself -- unlike hideDataRow, there's no way back for the rest of
// this session short of re-uploading the file, which is why the panel gates
// it behind a confirm() first. Also prunes it from hiddenRows so a
// previously hidden-then-deleted row doesn't linger there as a dead entry.
const removeDataRow = (row: DataRow) => {
  if (isManualRow(row)) {
    removeCustomPoint(row);
    return;
  }
  const key = rowKey(row);
  fomData.value = fomData.value.filter((r) => rowKey(r) !== key);
  hiddenRows.value = hiddenRows.value.filter((r) => rowKey(r) !== key);
};

// Drives both the X-axis type on the chart (category vs. numeric value
// axis) and whether the "Trend line" control is enabled -- a regression
// line only means something against a numeric X, not a category label.
// Y can independently be numeric or categorical too (e.g. Material Class) --
// yAxisNumeric mirrors the same check for it, gating the Scale toggle,
// median line, and trend/Pareto (both of which need numeric X *and* Y) the
// same way GraphControls disables them.
const xAxisNumeric = computed(() =>
  numericColumns.value.includes(selectedXAxis.value ?? ""),
);
const yAxisNumeric = computed(() =>
  numericColumns.value.includes(selectedYAxis.value ?? ""),
);

// Mirrors FomChart's own legendData gating (group-by colors, or a trend/
// Pareto overlay with both axes numeric) -- with none of these active the
// legend would render empty, so "Show legend" gets disabled rather than
// leaving a switch a researcher can flip with no visible effect.
const hasLegendContent = computed(() => {
  const overlayReady =
    xAxisNumeric.value &&
    yAxisNumeric.value &&
    !!selectedXAxis.value &&
    !!selectedYAxis.value;
  return (
    !!groupBy.value ||
    (showTrend.value && overlayReady) ||
    (showPareto.value && overlayReady)
  );
});

// The filter chip selection that actually governs groupBy's tokens, or null
// when groupBy isn't composite. Passed down to FomChart/StatsSummaryPanel so
// their per-token grouping only ever considers tokens the user still has
// checked (via keptTokens) -- without this, a row kept alive by the lenient
// composite-filter mode above would still tokenize into every one of its
// raw values, silently re-adding a group the user just excluded.
const groupBySelectedTokens = computed<string[] | null>(() => {
  if (groupBy.value === materialClassColumn.value)
    return selectedMaterialClasses.value;
  if (groupBy.value === baseMaterialsColumn.value)
    return selectedBaseMaterials.value;
  return null;
});

const filteredData = computed(() => {
  return fomData.value.filter((row) => {
    if (isRowHidden(row)) return false;
    if (
      excludeNeedsReview.value &&
      isNeedsReviewRow(row, reviewStatusColumn.value)
    )
      return false;
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
      // Strict: unchecking "Dielectric" drops every row that lists
      // Dielectric at all, including composite ones like "Dielectric;Metal"
      // -- a row only survives if ALL of its tokens are still checked.
      // Lenient: a row survives as soon as ANY of its tokens is still
      // checked, so a "Dielectric;Metal" row stays visible for its
      // Dielectric side even after Metal is excluded.
      const survives =
        compositeFilterMode.value === "strict"
          ? tokens.every((tok) => selectedMaterialClasses.value.includes(tok))
          : tokens.some((tok) => selectedMaterialClasses.value.includes(tok));
      if (isSet && !survives) return false;
    }
    if (baseMaterialsColumn.value) {
      const tokens = tokenizeValue(row[baseMaterialsColumn.value]);
      const isSet = tokens.length > 0;
      const survives =
        compositeFilterMode.value === "strict"
          ? tokens.every((tok) => selectedBaseMaterials.value.includes(tok))
          : tokens.some((tok) => selectedBaseMaterials.value.includes(tok));
      if (isSet && !survives) return false;
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
  const combined = [...filteredData.value, ...customPoints.value];
  const yFiltered = filterPlottable(
    combined,
    selectedYAxis.value,
    yAxisNumeric.value,
  );
  return xAxisNumeric.value
    ? filterPlottable(yFiltered, selectedXAxis.value)
    : yFiltered;
});

// Rows actually reaching the chart -- narrowed to just the pinned
// annotations when showOnlyAnnotated is on (see AnnotationsPanel). Reads off
// fomData (the full unfiltered dataset), not filteredData -- a pin is a
// deliberate bookmark of one specific row, so toggling this on must show
// every pinned row regardless of the current Domain/Origin/Material Class
// filter chips. Filtering from filteredData instead silently dropped any
// pinned row the active filters happened to exclude (e.g. pinning a
// frequency-domain row, then the default wavelength-only Domain filter
// hiding it) -- the toggle looked broken, showing fewer points than were
// actually pinned, with no indication why.
//
// Matches by content (rowsEqual), not by object reference -- a pinned row's
// `annotation.row` is captured from the chart's click event (ECharts
// `params.data.row`), which vue-echarts does not guarantee is the exact
// same object identity as the row sitting in fomData by the time this
// recomputes (observed in practice: `fomData.value.some(r => r ===
// annotation.row)` can come back false for a row that was just pinned off
// that very array). Content equality is what the rest of the annotations
// feature already relies on for "is this the same row" (see sameRow in
// composables/useAnnotationPins.ts), so this reuses the same rule instead of
// a reference-based Set that silently drops rows whose identity didn't
// survive the click round-trip.
const chartDisplayData = computed(() =>
  showOnlyAnnotated.value
    ? [...fomData.value, ...customPoints.value].filter((row) =>
        annotations.value.some((a) => sameRow(a.row, row)),
      )
    : [...filteredData.value, ...customPoints.value],
);

// Stats panel reads off the same narrowed set as the chart, so its N/mean/
// median/σ never describe more points than are actually visible.
const plottableData = computed(() => {
  const yFiltered = filterPlottable(
    chartDisplayData.value,
    selectedYAxis.value,
    yAxisNumeric.value,
  );
  return xAxisNumeric.value
    ? filterPlottable(yFiltered, selectedXAxis.value)
    : yFiltered;
});

// Active Benchmarking: "Inclure mes points ajoutés dans les statistiques"
// (includeCustomInStats) applied to the exact same rows StatsSummaryPanel
// reads -- FomChart applies the identical gate independently (its own
// includeCustomInStats prop) to the median/trend/Pareto overlays, so the
// side panel and the chart never disagree about which points count.
const statsRows = computed(() =>
  includeCustomInStats.value
    ? plottableData.value
    : plottableData.value.filter((row) => !isManualRow(row)),
);

// Only offer low-cardinality columns for "Group / Color by" — computed off
// the post-filter data so the list adapts as Domain/Origin filtering
// changes which values are actually still in play. Composite columns and
// Mode ID are exempt from that cap regardless (see groupableColumns) --
// kept as a separate list from compositeColumns itself, since Mode ID
// isn't tokenized like Material Class/Base Materials are (see
// groupColorMap and FomChart's isGroupingByCompositeColumn).
const groupByExemptColumns = computed(() =>
  [...compositeColumns.value, modeIdColumn.value].filter(
    (c): c is string => c !== null,
  ),
);
const groupByColumns = computed(() =>
  groupableColumns(
    filteredData.value,
    categoricalColumns.value,
    groupByExemptColumns.value,
  ),
);

// Isolating a single group by clicking its card in StatsSummaryPanel only
// makes sense for the grouping that was active when it was set -- reset it
// whenever groupBy itself changes or is cleared.
watch(groupBy, (newGroupBy) => {
  highlightGroup.value = null;
  // Picking a "Group / Color by" column is exactly the moment the legend
  // becomes useful (it's what tells the colors apart) -- re-enable it even
  // if the researcher had switched it off earlier (e.g. while ungrouped,
  // when it was disabled anyway), rather than leaving them to notice new
  // colors appeared with no legend to read them against.
  if (newGroupBy !== null) showLegend.value = true;
});

const toggleHighlight = (group: string) => {
  highlightGroup.value = highlightGroup.value === group ? null : group;
};

// A short "Y / X" title, recomputed whenever either axis changes -- kept in
// sync with chartTitle below as long as the researcher hasn't typed a
// custom title or explicitly cleared it (see chartTitleIsAuto and
// GraphControls' titleIsAuto model, flipped off by either action).
// formatUnitSuperscripts turns a raw column name's "RIU^-1" into "RIU⁻¹" --
// display-only, this title is never used to look up a column, just typed
// into the chart's own title text and the GraphControls input mirroring it.
const autoChartTitle = computed(() =>
  selectedYAxis.value && selectedXAxis.value
    ? `${formatUnitSuperscripts(selectedYAxis.value)} / ${formatUnitSuperscripts(selectedXAxis.value)}`
    : "",
);
watch([selectedYAxis, selectedXAxis], () => {
  if (chartTitleIsAuto.value) chartTitle.value = autoChartTitle.value;
});

const isCompositeGroupBy = (col: string | null): boolean =>
  !!col &&
  (col === materialClassColumn.value || col === baseMaterialsColumn.value);
// "Fusionner les points multi-catégories" (StatsSummaryPanel) only ever
// shows once groupBy is a composite column -- default it on right as that
// happens instead of leaving it off and easy to miss the first time. Fires
// only on the transition into a composite groupBy (next is composite, prev
// wasn't), so switching between Material Class and Base Materials while
// already grouped that way doesn't fight a manual "turn it back off".
watch(groupBy, (next, prev) => {
  if (isCompositeGroupBy(next) && !isCompositeGroupBy(prev)) {
    mergeMultiCategoryPoints.value = true;
  }
});

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
  if (
    showOnlyAnnotated.value &&
    rows.length === 0 &&
    annotations.value.length > 0
  ) {
    showOnlyAnnotated.value = false;
    setTransientStatus(
      "status.noMatchingPins",
      "border-amber-500/20 bg-amber-500/12 text-amber-950",
    );
  }
});

/** Re-runs the same best-guess defaulting used right after an upload,
 * against whichever dataset is currently loaded -- shared by handleUpload
 * (first load) and resetWorkspace (same dataset, fresh config). */
const applyDefaults = () => {
  selectedYAxis.value = guessDefaultYAxis(numericColumns.value);
  selectedXAxis.value = guessDefaultXAxis(
    fomData.value,
    xAxisCategoricalColumns.value,
    numericColumns.value,
  );
  axisLinked.value = true;
  // Domain defaults to wavelength-only records, matching Phase 1's
  // "include wavelength-domain FOM records only" requirement — frequency
  // domain / ambiguous rows stay available but opt-in via the checkboxes.
  // Origin (EXP/SIM), Material Class, and Base Materials all default to
  // every available value checked.
  // Set before the groupBy default below, since groupByColumns is
  // computed off the domain/origin-filtered data.
  const wavelengthOnly = domainValues.value.filter((v) =>
    /wavelength/i.test(v),
  );
  selectedDomains.value =
    wavelengthOnly.length > 0 ? wavelengthOnly : domainValues.value;
  selectedOrigins.value = originValues.value;
  selectedMaterialClasses.value = materialClassValues.value;
  selectedBaseMaterials.value = baseMaterialsValues.value;
  compositeFilterMode.value = "lenient";
  excludeNeedsReview.value = false;
  // Origin is the one grouping that's almost always worth seeing by
  // default -- EXP vs. SIM is the first split a researcher checks for any
  // FOM comparison. Falls back to guessDefaultColorGroup's "none" when the
  // sheet has no Origin column or it doesn't qualify as groupable.
  groupBy.value =
    originColumn.value && groupByColumns.value.includes(originColumn.value)
      ? originColumn.value
      : guessDefaultColorGroup(groupByColumns.value);
  // Computed straight from the just-set default groupBy (rather than left
  // for the watch above to catch) -- Origin wins that default almost always,
  // so this is normally false; only true on the rarer sheets where
  // guessDefaultColorGroup itself falls back to a composite column.
  mergeMultiCategoryPoints.value = isCompositeGroupBy(groupBy.value);
  // Auto-fills from the axes just set above (see autoChartTitle) -- reset
  // to auto mode so a previous custom/cleared title doesn't survive into a
  // freshly (re-)defaulted workspace.
  chartTitleIsAuto.value = true;
  chartTitle.value = autoChartTitle.value;
  yAxisScale.value = "value";
  showLegend.value = true;
  showMedian.value = false;
  showTrend.value = false;
  trendType.value = "auto";
  showPareto.value = false;
  highlightGroup.value = null;
  pointSizeMode.value = "constant";
  pointSizeBy.value = null;
  pointSize.value = 16;
};

const handleUpload = async ([file]: File[]) => {
  setStatus(
    "status.uploading",
    "border-amber-500/20 bg-amber-500/12 text-amber-950",
  );

  let columns: string[];
  let data: DataRow[];
  try {
    ({ columns, data } = await apiService.uploadExcel(file));
  } catch (error) {
    setTransientStatus(
      error instanceof MultipleSheetsError
        ? "status.multipleSheets"
        : "status.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
    return;
  }

  // The plain parse above never checks column names -- if what came back
  // doesn't carry what the chart/filters need (see needsAiConversion), try
  // an AI reformat before giving up, rather than silently rendering a
  // near-empty workspace. Kept as a second request instead of folding into
  // uploadExcel so the fast, non-AI path (the common case: a file already
  // in the expected shape) never pays for it.
  let converted = false;
  if (needsAiConversion(columns)) {
    setStatus(
      "status.converting",
      "border-amber-500/20 bg-amber-500/12 text-amber-950",
    );
    try {
      ({ columns, data } = await apiService.convertExcel(columns, data));
      converted = true;
    } catch {
      setTransientStatus(
        "status.conversionFailed",
        "border-rose-500/20 bg-rose-500/12 text-rose-950",
      );
      return;
    }
  }

  fomData.value = data;
  fomColumns.value = columns;
  applyDefaults();
  clearAnnotations();
  // A fresh file makes any previously hidden row or manually added point
  // meaningless (they were calibrated against the dataset just replaced) --
  // clear them the same way a brand-new upload always resets the workspace.
  customPoints.value = [];
  hiddenRows.value = [];
  includeCustomInStats.value = true;
  setTransientStatus(
    converted ? "status.convertedSuccess" : "status.success",
    "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
  );
};

// The Extraction screen's "Visualiser" button hands off its freshly
// downloaded export via useIncomingVisualizationFile, then routes here --
// picking it up and feeding it through the exact same handleUpload path a
// manual drop uses is what makes the switch feel like the researcher
// loaded the file themselves, page change included.
onMounted(() => {
  const incomingFile = takeIncomingVisualizationFile();
  if (incomingFile) handleUpload([incomingFile]);
});
// Opens the OS file picker directly -- while a dataset is already loaded,
// this must NOT touch fomData/the workspace view first (that briefly
// swapped back to the empty dropzone Card before the picker even opened,
// a visible flash for something that should be instant). reimportInputRef
// is a persistent hidden <input> mounted regardless of whether the
// dropzone Card is showing, precisely so this has something to click no
// matter which view is current. The workspace itself only changes once a
// file is actually chosen (see handleReimportFileSelect -> handleUpload).
const reimportInputRef = ref<HTMLInputElement | null>(null);
const openImportDialog = () => {
  if (fomData.value.length > 0) {
    reimportInputRef.value?.click();
  } else {
    dropzoneRef.value?.triggerFileInput();
  }
};
const handleReimportFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  // Reset so picking the exact same file again still fires 'change'.
  target.value = "";
  if (files.length) handleUpload([files[0]]);
};

// Resets chart configuration (axes, scale, display toggles, filters,
// annotations) back to the same smart defaults a fresh upload gets --
// without touching the loaded dataset itself. Distinct from Import, which
// clears the dataset and reopens the file picker.
// Manually added points are deliberately NOT cleared here -- unlike hidden
// rows/annotations (view-level state a researcher expects "Reset" to wipe),
// a manual point is data the researcher typed in themselves; discarding it
// on a config reset would read as data loss, not a workspace reset. It's
// only ever removed via its own explicit "delete permanently" action (see
// removeCustomPoint/permanentlyDeleteCustomPoint).
const resetWorkspace = () => {
  applyDefaults();
  clearAnnotations();
  hiddenRows.value = [];
  includeCustomInStats.value = true;
};

// Both exports read off plottableData -- exactly the rows currently drawn
// on the scatter plot (post filters, post showOnlyAnnotated, and with a
// blank/non-plottable X or Y already dropped), not the broader filteredData
// superset that still counts rows the chart itself never actually draws.
// Columns are curated too: quote paragraphs/page numbers/notes/model name
// are audit trail for one record's tooltip, not something you want repeated
// across dozens of exported rows in a spreadsheet.
// A manually added row has no document to cite -- when the exported set
// contains at least one, a "Source" column makes that traceable in the
// spreadsheet itself too, not just in the app's own UI (see the persistence
// decision behind customPoints: ephemeral in-app, but must still show up in
// exports). Left out entirely when there's nothing manual to distinguish, so
// a plain literature-only export never gains a column the researcher didn't
// ask for.
const MANUAL_SOURCE_EXPORT_COLUMN = "Source";
const exportColumns = computed(() => {
  const base = filterExportColumns(fomColumns.value);
  return plottableData.value.some(isManualRow)
    ? [...base, MANUAL_SOURCE_EXPORT_COLUMN]
    : base;
});
const exportRows = computed(() => {
  if (!plottableData.value.some(isManualRow)) return plottableData.value;
  return plottableData.value.map((row) => ({
    ...row,
    [MANUAL_SOURCE_EXPORT_COLUMN]: isManualRow(row)
      ? t("fomcharts.addPoint.exportSourceManual")
      : t("fomcharts.addPoint.exportSourceDocument"),
  }));
});

const handleExportCsv = () => {
  exportRowsAsCsv(exportColumns.value, exportRows.value, "fom_data_export.csv");
};
const handleExportXlsx = () => {
  exportRowsAsExcel(
    exportColumns.value,
    exportRows.value,
    "fom_data_export.xlsx",
  );
};

const handleExportPng = () => {
  fomChartRef.value?.exportPng();
};

// DataPointsTable's group context menu "Afficher uniquement ces points" --
// a shortcut for pinning every row of the group by hand and then flipping
// the Annotations panel's own "Points épinglés uniquement" toggle. Doesn't
// open the Annotations panel (openPanel: false, same as the group menu's
// own "Épingler") since the researcher is acting from DataPointsTable and
// the toggle's effect (narrowing the chart) is visible without switching
// panels.
const showOnlyRows = (rows: DataRow[]) => {
  pinRows(rows, { openPanel: false });
  showOnlyAnnotated.value = true;
};
</script>
