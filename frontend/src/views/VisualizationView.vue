<template>
  <ToolActionsBar
    :tool-name="t('nav.visualization')"
    :export-disabled="fomData.length === 0"
    @import="openImportDialog"
    @export="handleExport"
  />

  <main class="grow px-3 pb-8 sm:px-4 lg:px-5">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4">
      <section
        class="mt-4 overflow-hidden rounded-4xl border border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
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
          v-show="fomData.length === 0"
          compact
          ref="dropzoneRef"
          class="mt-4"
          @files-selected="handleUpload"
        />
      </section>

      <StatusToast
        :status-key="statusKey"
        :status-class="statusClass"
        :fade-style="statusStyle"
        :duration-ms="ringDurationMs"
        :token="statusToken"
        @dismiss="dismissStatus"
      />

      <section
        v-if="fomData.length > 0"
        class="rounded-[2rem] border border-secondary/10 bg-card/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <GraphControls
          v-model:y-axis="selectedYAxis"
          v-model:x-axis="selectedXAxis"
          v-model:scale="yAxisScale"
          v-model:chart-title="chartTitle"
          v-model:show-median="showMedian"
          :numeric-columns="numericColumns"
          :categorical-columns="categoricalColumns"
        />

        <FomChart
          :chart-data="fomData"
          :columns="fomColumns"
          :y-axis="selectedYAxis"
          :x-axis="selectedXAxis"
          :y-axis-scale="yAxisScale"
          :chart-title="chartTitle"
          :show-median="showMedian"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
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
  guessDefaultGroup,
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
const yAxisScale = ref<"log" | "value">("log");
const chartTitle = ref("");
const showMedian = ref(true);

const columnTypes = computed(() =>
  detectColumnTypes(fomData.value, fomColumns.value),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);

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
    selectedXAxis.value = guessDefaultGroup(categoricalColumns.value);
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
};

const openImportDialog = () => {
  if (fomData.value.length > 0) {
    resetToDropzone();
  }
  dropzoneRef.value?.triggerFileInput();
};

const handleExport = () => {
  exportRowsAsCsv(fomColumns.value, fomData.value, "fom_data_export.csv");
};
</script>
