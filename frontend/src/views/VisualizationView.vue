<template>
  <ToolActionsBar
    :tool-name="t('nav.visualization')"
    :export-disabled="fomData.length === 0"
    @import="openImportDialog"
    @export="handleExport"
  />

  <main class="grow px-3 pb-8 sm:px-4 lg:px-5">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <Card class="mt-4 overflow-hidden rounded-4xl border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl">
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
          v-show="fomData.length === 0"
          compact
          ref="dropzoneRef"
          class="mt-4"
          @files-selected="handleUpload"
        />
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
        class="gap-0 rounded-4xl border-secondary/10 bg-card/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <GraphControls
          v-model:y-axis="selectedYAxis"
          v-model:x-axis="selectedXAxis"
          v-model:group-by="groupBy"
          v-model:scale="yAxisScale"
          v-model:chart-title="chartTitle"
          v-model:show-median="showMedian"
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

        <FomChart
          :chart-data="filteredData"
          :columns="fomColumns"
          :y-axis="selectedYAxis"
          :x-axis="selectedXAxis"
          :group-by="groupBy"
          :y-axis-scale="yAxisScale"
          :chart-title="chartTitle"
          :show-median="showMedian"
        />
      </Card>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Card } from "@/components/ui/card";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import StatusToast from "@/components/shared/StatusToast.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import { apiService } from "@/services/api";
import { exportRowsAsCsv } from "@/utils/csvExport";
import { useTransientStatus } from "@/composables/useTransientStatus";
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
const selectedDomains = ref<string[]>([]);
const selectedOrigins = ref<string[]>([]);

const columnTypes = computed(() =>
  detectColumnTypes(fomData.value, fomColumns.value),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);

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

// Only offer low-cardinality columns for "Group / Color by" — computed off
// the post-filter data so the list adapts as Domain/Origin filtering
// changes which values are actually still in play.
const groupByColumns = computed(() =>
  groupableColumns(filteredData.value, categoricalColumns.value),
);

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
</script>
