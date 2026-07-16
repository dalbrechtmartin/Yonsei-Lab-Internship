<template>
  <ToolActionsBar
    :tool-name="t('nav.extraction')"
    :show-export="false"
    @import="resetToDropzone"
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
              Batch extraction
            </p>
            <h2 class="mt-2 text-2xl font-semibold text-ink">
              Extract paper data from PDFs
            </h2>
            <p class="mt-2 text-sm leading-6 text-secondary">
              Drop one or more PDFs to generate a structured Excel export. The
              app stays focused on the research workflow, not generic file
              handling.
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs text-secondary">
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">PDF input</div>
              <div>Multiple files supported</div>
            </div>
            <div
              class="rounded-2xl border border-secondary/10 bg-background/70 px-3 py-2"
            >
              <div class="font-semibold text-ink">Excel output</div>
              <div>Auto-downloaded result</div>
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

      <div v-if="statusKey && !isProcessing" class="mx-auto w-full max-w-4xl">
        <div
          class="rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm"
          :class="statusClass"
        >
          {{ t(statusKey) }}
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
        v-if="!isProcessing && !statusKey"
        class="flex justify-center py-6"
      >
        <FileDropzone
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
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import { apiService } from "@/services/api";

const { t } = useI18n();

const isProcessing = ref(false);
const statusKey = ref("");
const statusClass = ref("");
const fileCount = ref(0);

const handleExtract = async (files: File[]) => {
  fileCount.value = files.length;
  isProcessing.value = true;
  statusKey.value = "";

  try {
    const blob = await apiService.extractPdfs(files);
    downloadBlob(blob, "Gold_Standard_Data.xlsx");
    statusKey.value = "extraction.success";
    statusClass.value =
      "border-emerald-500/20 bg-emerald-500/12 text-emerald-950";
  } catch (error) {
    statusKey.value = "extraction.error";
    statusClass.value = "border-rose-500/20 bg-rose-500/12 text-rose-950";
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
  statusKey.value = "";
  fileCount.value = 0;
};
</script>
