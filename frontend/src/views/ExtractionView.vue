<template>
  <ToolActionsBar
    :tool-name="t('nav.extraction')"
    :show-export="false"
    @import="openImportDialog"
  />

  <main class="grow px-6 pb-10 sm:px-8 lg:px-10">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <section
        class="mt-6 overflow-hidden rounded-4xl border border-white/50 bg-card/80 p-6 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <div
          class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
        >
          <div class="max-w-2xl">
            <p class="text-xs uppercase tracking-[0.3em] text-secondary">
              {{ t("view.extraction.batchExtraction.legend") }}
            </p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">
              {{ t("view.extraction.batchExtraction.title") }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-secondary">
              {{ t("view.extraction.batchExtraction.description") }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-secondary">
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">
                {{ t("view.extraction.pdfInput.title") }}
              </div>
              <div>{{ t("view.extraction.pdfInput.description") }}</div>
            </div>
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">
                {{ t("view.extraction.excelOutput.title") }}
              </div>
              <div>{{ t("view.extraction.excelOutput.description") }}</div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="isProcessing" class="flex flex-col items-center gap-3 py-8">
        <div
          class="h-10 w-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin"
        />
        <p class="text-sm text-secondary">
          {{ t("extraction.processing", { count: fileCount }) }}
        </p>
      </div>

      <div v-if="statusKey && !isProcessing" class="w-full">
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

        <button
          type="button"
          class="mt-4 inline-flex items-center rounded-full border border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/8"
          @click="resetToDropzone"
        >
          {{ t("extraction.newBatch") }}
        </button>
      </div>

      <section
        v-show="!isProcessing && !statusKey && fileCount === 0"
        class="flex justify-center py-6"
      >
        <FileDropzone
          ref="dropzoneRef"
          accept=".pdf"
          multiple
          :title="t('extraction.dropzone.title')"
          :subtitle="t('extraction.dropzone.subtitle')"
          @files-selected="handleExtract"
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
import { apiService } from "@/services/api";

const STATUS_VISIBLE_MS = 3200;
const STATUS_FADE_MS = 250;

const { t } = useI18n();

const isProcessing = ref(false);
const statusKey = ref("");
const statusClass = ref("");
const statusVisible = ref(false);
const statusExiting = ref(false);
const statusTimeout = ref<number | null>(null);
const statusClearTimeout = ref<number | null>(null);
const fileCount = ref(0);
const dropzoneRef = ref<InstanceType<typeof FileDropzone> | null>(null);

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

const handleExtract = async (files: File[]) => {
  fileCount.value = files.length;
  clearStatusTimeout();
  isProcessing.value = true;
  statusKey.value = "";

  try {
    const blob = await apiService.extractPdfs(files);
    downloadBlob(blob, "Gold_Standard_Data.xlsx");
    setTransientStatus(
      "extraction.success",
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
    );
  } catch (error) {
    setTransientStatus(
      "extraction.error",
      "border-rose-500/20 bg-rose-500/12 text-rose-950",
    );
  } finally {
    isProcessing.value = false;
  }
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const resetToDropzone = () => {
  clearStatusTimeout();
  statusKey.value = "";
  statusClass.value = "";
  statusVisible.value = false;
  statusExiting.value = false;
  fileCount.value = 0;
};

const openImportDialog = () => {
  if (fileCount.value > 0 || statusKey.value) {
    resetToDropzone();
  }
  dropzoneRef.value?.triggerFileInput();
};

onUnmounted(() => {
  clearStatusTimeout();
});
</script>
