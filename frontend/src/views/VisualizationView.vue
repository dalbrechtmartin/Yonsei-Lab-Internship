<template>
  <ToolActionsBar
    :tool-name="t('nav.visualization')"
    :export-disabled="fomData.length === 0"
    @import="openImportDialog"
    @export="handleExport"
  />

  <main class="grow px-6 pb-10 sm:px-8 lg:px-10">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        class="mt-6 overflow-hidden rounded-[2rem] border border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <div
          class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div class="max-w-2xl">
            <p class="text-xs uppercase tracking-[0.3em] text-secondary">
              Analysis workspace
            </p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">
              Visualize FOM data
            </h2>
            <p class="mt-2 text-sm leading-6 text-secondary">
              Import an Excel file to inspect the dataset, compare axes, and
              export the scatter data as CSV.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-secondary">
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">Excel</div>
              <div>Upload .xlsx or .xls</div>
            </div>
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">Charts</div>
              <div>Scatter + median line</div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="statusKey" class="w-full">
        <div
          class="w-full rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm transition-all duration-300 ease-out"
          :class="statusClass"
          :style="statusStyle"
        >
          <div class="flex items-start justify-between gap-4">
            <p class="min-w-0 flex-1 leading-6">
              {{ t(statusKey) }}
            </p>
            <button
              type="button"
              class="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-current/70 transition hover:bg-black/5 hover:text-current focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/25"
              :aria-label="t('status.dismiss')"
              @click="dismissStatus"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                class="h-4 w-4"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <section v-show="fomData.length === 0" class="flex justify-center py-6">
        <FileDropzone ref="dropzoneRef" @files-selected="handleUpload" />
      </section>

      <section
        v-if="fomData.length > 0"
        class="rounded-[2rem] border border-secondary/10 bg-card/70 p-5 shadow-xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <GraphControls
          v-model:y-axis="selectedYAxis"
          v-model:x-axis="selectedXAxis"
          v-model:scale="yAxisScale"
          :numeric-columns="numericColumns"
          :categorical-columns="categoricalColumns"
        />

        <FomChart
          :chart-data="fomData"
          :columns="fomColumns"
          :y-axis="selectedYAxis"
          :x-axis="selectedXAxis"
          :y-axis-scale="yAxisScale"
        />
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import { apiService } from "@/services/api";
import { exportRowsAsCsv } from "@/utils/csvExport";
import {
  detectColumnTypes,
  guessDefaultYAxis,
  guessDefaultGroup,
  type DataRow,
} from "@/utils/columnTypes";

const STATUS_VISIBLE_MS = 3200;
const STATUS_FADE_MS = 250;

const { t } = useI18n();

const statusKey = ref("");
const statusClass = ref("");
const statusVisible = ref(false);
const statusExiting = ref(false);
const statusTimeout = ref<number | null>(null);
const statusClearTimeout = ref<number | null>(null);
const fomData = ref<DataRow[]>([]);
const fomColumns = ref<string[]>([]);
const dropzoneRef = ref<InstanceType<typeof FileDropzone> | null>(null);

const selectedYAxis = ref<string | null>(null);
const selectedXAxis = ref<string | null>(null);
const yAxisScale = ref<"log" | "value">("log");

const columnTypes = computed(() =>
  detectColumnTypes(fomData.value, fomColumns.value),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);

const clearStatusTimeout = () => {
  if (statusTimeout.value !== null) {
    window.clearTimeout(statusTimeout.value);
    statusTimeout.value = null;
  }
  if (statusClearTimeout.value !== null) {
    window.clearTimeout(statusClearTimeout.value);
    statusClearTimeout.value = null;
  }
};

const setTransientStatus = (key: string, className: string) => {
  clearStatusTimeout();
  statusVisible.value = true;
  statusExiting.value = false;
  statusKey.value = key;
  statusClass.value = className;
  statusTimeout.value = window.setTimeout(() => {
    dismissStatus();
  }, STATUS_VISIBLE_MS);
};

const dismissStatus = () => {
  if (!statusVisible.value || statusExiting.value) {
    return;
  }

  clearStatusTimeout();
  statusExiting.value = true;
  statusVisible.value = true;
  statusClearTimeout.value = window.setTimeout(() => {
    statusKey.value = "";
    statusClass.value = "";
    statusVisible.value = false;
    statusExiting.value = false;
    statusClearTimeout.value = null;
  }, STATUS_FADE_MS);
};

const statusStyle = computed(() => ({
  opacity: statusExiting.value ? 0 : 1,
  transform: statusExiting.value ? "translateY(-4px)" : "translateY(0)",
}));

const handleUpload = async ([file]: File[]) => {
  clearStatusTimeout();
  statusKey.value = "status.uploading";
  statusClass.value = "border-amber-500/20 bg-amber-500/12 text-amber-950";

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

// "Import" in the actions bar, once a file is already loaded, just clears
// the current dataset so the dropzone reappears — simplest way to load a
// different file without a separate modal/flow.
const resetToDropzone = () => {
  clearStatusTimeout();
  fomData.value = [];
  fomColumns.value = [];
  statusKey.value = "";
  statusClass.value = "";
  statusVisible.value = false;
  statusExiting.value = false;
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

onUnmounted(() => {
  clearStatusTimeout();
});
</script>
