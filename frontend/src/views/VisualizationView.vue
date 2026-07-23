<template>
  <ToolActionsBar
    :tool-name="t('nav.visualization')"
    :export-disabled="fomData.length === 0"
    @import="openImportDialog"
    @export="handleExport"
  />

  <main class="grow px-3 pb-8 sm:px-4 lg:px-5">
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
        class="gap-0 overflow-hidden rounded-2xl border-secondary/10 bg-card/70 p-0 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <div class="flex items-center justify-between border-b border-secondary/10 px-5 py-3.5">
          <span class="text-sm font-semibold text-ink">{{ t("fomcharts.workspace.title") }}</span>
          <span class="text-[11px] text-muted-foreground">{{ t("fomcharts.workspace.pinHint") }}</span>
        </div>

        <div class="flex flex-col gap-4 p-4 lg:flex-row lg:items-start lg:gap-5 lg:p-5">
          <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:group-by="groupBy"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            :numeric-columns="numericColumns"
            :categorical-columns="categoricalColumns"
            :group-by-columns="groupByColumns"
            :domain-column="domainColumn"
            :domain-values="domainValues"
            :origin-column="originColumn"
            :origin-values="originValues"
          />

          <div class="min-w-0 flex-1">
            <FomChart
              v-model:highlight-group="highlightGroup"
              :chart-data="filteredData"
              :columns="fomColumns"
              :y-axis="selectedYAxis"
              :x-axis="selectedXAxis"
              :group-by="groupBy"
              :y-axis-scale="yAxisScale"
              :chart-title="chartTitle"
              :show-median="showMedian"
              :show-trend="showTrend"
              :x-axis-numeric="xAxisNumeric"
              @point-click="handlePointClick"
            />
          </div>

          <aside class="flex w-full flex-col gap-4 lg:w-64 lg:shrink-0">
            <StatsSummaryPanel :rows="plottableData" :y-axis="selectedYAxis" :group-by="groupBy" />
            <AnnotationsPanel :annotations="annotations" @remove="removeAnnotation" />
          </aside>
        </div>
      </Card>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Card } from "@/components/ui/card";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import StatusToast from "@/components/shared/StatusToast.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import AnnotationsPanel, { type Annotation } from "@/components/visualization/AnnotationsPanel.vue";
import { apiService } from "@/services/api";
import { exportRowsAsCsv } from "@/utils/csvExport";
import { useTransientStatus } from "@/composables/useTransientStatus";
import { filterPlottable } from "@/utils/stats";
import {
  detectColumnTypes,
  guessDefaultYAxis,
  guessDefaultXAxis,
  guessDefaultColorGroup,
  groupableColumns,
  filterExportColumns,
  findDomainColumn,
  findOriginColumn,
  distinctValues,
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

const selectedYAxis = ref<string | null>(null);
const selectedXAxis = ref<string | null>(null);
const groupBy = ref<string | null>(null);
const yAxisScale = ref<"log" | "value">("log");
const chartTitle = ref("");
const showMedian = ref(true);
const showTrend = ref(true);
const highlightGroup = ref<string | null>(null);
const selectedDomains = ref<string[]>([]);
const selectedOrigins = ref<string[]>([]);
const annotations = ref<Annotation[]>([]);
let annotationSeq = 0;

const columnTypes = computed(() =>
  detectColumnTypes(fomData.value, fomColumns.value),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);
// Drives both the X-axis type on the chart (category vs. numeric value
// axis) and whether the "Trend line" control is enabled -- a regression
// line only means something against a numeric X, not a category label.
const xAxisNumeric = computed(() => numericColumns.value.includes(selectedXAxis.value ?? ""));

// Domain (wavelength/frequency/unclear) and Origin (EXP/SIM) columns power
// the Phase 1 "Domain control" / "Origin control" filters — they only show
// up in richer harmonized exports, so these stay null for the plain
// gold-standard file and the filter UI simply doesn't render.
const domainColumn = computed(() => findDomainColumn(fomColumns.value));
const originColumn = computed(() => findOriginColumn(fomColumns.value));
const domainValues = computed(() =>
  domainColumn.value ? distinctValues(fomData.value, domainColumn.value) : [],
);
const originValues = computed(() =>
  originColumn.value ? distinctValues(fomData.value, originColumn.value) : [],
);

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
    return true;
  });
});

// The same "drop rows with a blank/non-numeric Y" rule the chart itself
// applies (see FomChart's plottableData) -- computed once here so the
// stats panel always summarizes exactly what's plotted, not the raw
// filtered set.
const plottableData = computed(() => filterPlottable(filteredData.value, selectedYAxis.value));

// Only offer low-cardinality columns for "Group / Color by" — computed off
// the post-filter data so the list adapts as Domain/Origin filtering
// changes which values are actually still in play.
const groupByColumns = computed(() =>
  groupableColumns(filteredData.value, categoricalColumns.value),
);

// Isolating a single group by clicking its chip on the chart only makes
// sense for the grouping that was active when it was set -- reset it
// whenever groupBy itself changes or is cleared.
watch(groupBy, () => {
  highlightGroup.value = null;
});

const handleUpload = async ([file]: File[]) => {
  setStatus(
    "status.uploading",
    "border-amber-500/20 bg-amber-500/12 text-amber-950",
  );

  try {
    const data = await apiService.uploadExcel(file);
    fomData.value = data.data;
    fomColumns.value = data.columns;
    selectedYAxis.value = guessDefaultYAxis(numericColumns.value);
    selectedXAxis.value = guessDefaultXAxis(fomData.value, categoricalColumns.value);
    // Domain defaults to wavelength-only records, matching Phase 1's
    // "include wavelength-domain FOM records only" requirement — frequency
    // domain / ambiguous rows stay available but opt-in via the checkboxes.
    // Origin (EXP/SIM) has no such restriction, so it defaults to "all".
    // Set before the groupBy default below, since groupByColumns is
    // computed off the domain/origin-filtered data.
    const wavelengthOnly = domainValues.value.filter((v) => /wavelength/i.test(v));
    selectedDomains.value = wavelengthOnly.length > 0 ? wavelengthOnly : domainValues.value;
    selectedOrigins.value = originValues.value;
    groupBy.value = guessDefaultColorGroup(groupByColumns.value);
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
  annotations.value = [];
};

const openImportDialog = () => {
  if (fomData.value.length > 0) {
    resetToDropzone();
  }
  dropzoneRef.value?.triggerFileInput();
};

const handleExport = () => {
  // Export the filtered dataset, not the raw upload — matches Phase 1's
  // "export the filtered analysis dataset" requirement. Columns are also
  // curated: quote paragraphs/page numbers/notes/model name are audit
  // trail for one record's tooltip, not something you want repeated
  // across dozens of exported rows in a spreadsheet.
  exportRowsAsCsv(
    filterExportColumns(fomColumns.value),
    filteredData.value,
    "fom_data_export.csv",
  );
};

// Pinning is a lightweight, session-only bookmark -- no persistence, no
// backend round-trip. Re-clicking the same point (same ref/axis values) is
// a no-op rather than stacking duplicate pins.
const handlePointClick = (point: {
  ref: string;
  xLabel: string;
  xValue: unknown;
  yLabel: string;
  yValue: unknown;
  extras: Record<string, unknown>;
}) => {
  const isDuplicate = annotations.value.some(
    (a) => a.ref === point.ref && a.xValue === point.xValue && a.yValue === point.yValue,
  );
  if (isDuplicate) return;
  annotations.value = [
    ...annotations.value,
    { id: `${point.ref}-${annotationSeq++}`, ...point },
  ];
};

const removeAnnotation = (id: string) => {
  annotations.value = annotations.value.filter((a) => a.id !== id);
};
</script>
