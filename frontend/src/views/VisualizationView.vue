<template>
  <ToolActionsBar
    :tool-name="t('nav.visualization')"
    :export-disabled="fomData.length === 0"
    @import="resetToDropzone"
    @export="handleExport"
  />

  <main class="grow px-6 pb-10 pt-6 sm:px-8 lg:px-10">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        class="overflow-hidden rounded-[2rem] border border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
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

      <div v-if="statusKey" class="mx-auto w-full max-w-4xl">
        <div
          class="rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm"
          :class="statusClass"
        >
          {{ t(statusKey) }}
        </div>
      </div>

      <section v-if="fomData.length === 0" class="flex justify-center py-6">
        <FileDropzone
          v-if="fomData.length === 0"
          @files-selected="handleUpload"
        />
      </section>

      <section
        v-else
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
import { computed, ref } from "vue";
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

const { t } = useI18n();

const statusKey = ref("");
const statusClass = ref("");
const fomData = ref<DataRow[]>([]);
const fomColumns = ref<string[]>([]);

const selectedYAxis = ref<string | null>(null);
const selectedXAxis = ref<string | null>(null);
const yAxisScale = ref<"log" | "value">("log");

const columnTypes = computed(() =>
  detectColumnTypes(fomData.value, fomColumns.value),
);
const numericColumns = computed(() => columnTypes.value.numeric);
const categoricalColumns = computed(() => columnTypes.value.categorical);

const handleUpload = async ([file]: File[]) => {
  statusKey.value = "status.uploading";
  statusClass.value = "border-amber-500/20 bg-amber-500/12 text-amber-950";

  try {
    const data = await apiService.uploadExcel(file);
    fomData.value = data.data;
    fomColumns.value = data.columns;
    selectedYAxis.value = guessDefaultYAxis(numericColumns.value);
    selectedXAxis.value = guessDefaultGroup(categoricalColumns.value);
    statusKey.value = "status.success";
    statusClass.value =
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-950";
  } catch (error) {
    statusKey.value = "status.error";
    statusClass.value = "border-rose-500/20 bg-rose-500/12 text-rose-950";
  }
};

// "Import" in the actions bar, once a file is already loaded, just clears
// the current dataset so the dropzone reappears — simplest way to load a
// different file without a separate modal/flow.
const resetToDropzone = () => {
  fomData.value = [];
  fomColumns.value = [];
  statusKey.value = "";
};

const handleExport = () => {
  exportRowsAsCsv(fomColumns.value, fomData.value, "fom_data_export.csv");
};
</script>
