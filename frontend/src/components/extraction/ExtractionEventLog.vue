<template>
  <div
    class="flex min-h-0 flex-col gap-2.5 rounded-[10px] border border-secondary/12 bg-card/60 p-3.5"
  >
    <div class="flex shrink-0 items-center gap-2">
      <span
        class="text-[11px] font-semibold tracking-[0.3em] text-secondary uppercase"
      >
        {{ t("extraction.running.journal.title") }}
      </span>
      <span
        v-if="warningCount > 0"
        class="inline-flex items-center rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-700"
      >
        {{ t("extraction.running.journal.warnings", { count: warningCount }) }}
      </span>
    </div>
    <div
      class="min-h-0 flex-1 overflow-y-auto rounded-lg border border-secondary/10 bg-background/60 p-3 font-mono text-[11.5px] leading-[18px]"
    >
      <p v-if="!entries.length" class="text-secondary">
        {{ t("extraction.running.journal.empty") }}
      </p>
      <div
        v-for="entry in entries"
        :key="entry.id"
        :class="entry.level === 'warn' ? 'text-amber-800' : 'text-secondary'"
      >
        {{ formatTime(entry.atMs) }} · {{ t(entry.messageKey, entry.params ?? {}) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { ExtractionLogEntry } from "@/composables/useExtractionEventLog";

defineProps<{
  entries: ExtractionLogEntry[];
  warningCount: number;
}>();

const { t } = useI18n();

function formatTime(atMs: number): string {
  return new Date(atMs).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
</script>
