<template>
  <div
    v-if="file"
    class="flex items-center gap-3 rounded-[10px] border border-dashed border-secondary/20 px-3.5 py-3 opacity-45"
  >
    <FileIcon class="size-5 shrink-0 text-secondary" />
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-ink">{{ file.filename }}</p>
      <p class="mt-0.5 text-xs text-secondary">
        {{ t("extraction.running.nextFile.label") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { FileIcon } from "@lucide/vue";
import type { JobFileStatus } from "@/services/api";

defineProps<{ file: JobFileStatus | null }>();
const { t } = useI18n();
</script>
