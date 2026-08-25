<template>
  <Transition name="file-fade" mode="out-in">
    <div
      v-if="currentFile"
      :key="currentFile.id"
      class="flex flex-col gap-2 rounded-2xl border border-secondary/15 bg-secondary/5 px-4 py-3.5 text-sm"
    >
      <div class="flex items-center justify-between gap-3">
        <span class="min-w-0 flex-1 truncate font-medium text-ink">{{
          currentFile.filename
        }}</span>
        <span
          v-if="fileEtaLabel(currentFile)"
          class="shrink-0 font-mono text-xs text-secondary"
        >
          {{ t("extraction.progress.etaRemaining", { eta: fileEtaLabel(currentFile) }) }}
        </span>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          :class="pillClass(currentFile)"
        >
          <span
            v-if="currentFile.status === 'processing'"
            class="h-2.5 w-2.5 animate-spin rounded-full border border-primary/40 border-t-primary"
            aria-hidden="true"
          />
          {{ t(`extraction.progress.file.${fileLabelKey(currentFile)}`) }}
        </span>
      </div>
      <div class="h-1.5 overflow-hidden rounded-full bg-secondary/12">
        <div
          class="h-full rounded-full transition-[width] duration-300 ease-linear"
          :class="fileBarClass(currentFile)"
          :style="{ width: fileProgressPct(currentFile) + '%' }"
        />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";
import type { JobStatusResponse } from "@/services/api";
import { useExtractionProgressDisplay } from "@/composables/useExtractionProgressDisplay";

const { t } = useI18n();
const props = defineProps<{ job: JobStatusResponse }>();
const {
  currentFile,
  pillClass,
  fileProgressPct,
  fileBarClass,
  fileLabelKey,
  fileEtaLabel,
} = useExtractionProgressDisplay(toRef(props, "job"));
</script>

<style scoped>
.file-fade-enter-active,
.file-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.file-fade-enter-from,
.file-fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
