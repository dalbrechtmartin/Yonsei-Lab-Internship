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
        {{
          t(
            "extraction.running.journal.warnings",
            { count: warningCount },
            { plural: warningCount },
          )
        }}
      </span>
      <button
        v-if="entries.length"
        type="button"
        class="ml-auto flex items-center gap-1 rounded-md px-1.5 py-1 text-secondary transition-colors hover:bg-secondary/10 hover:text-ink"
        :title="t('extraction.running.journal.download')"
        :aria-label="t('extraction.running.journal.download')"
        @click="downloadJournal"
      >
        <Download class="h-3.5 w-3.5" />
      </button>
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
        {{ formatTime(entry.atMs) }} · {{ entryText(entry) }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Download } from "@lucide/vue";
import type { ExtractionLogEntry } from "@/composables/useExtractionEventLog";
import { downloadTextFile } from "@/utils/textExport";

const props = defineProps<{
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

function entryText(entry: ExtractionLogEntry): string {
  return t(entry.messageKey, entry.params ?? {}, { plural: entry.plural });
}

/** Exports the same lines the panel already shows (translated, timestamped)
 * as a plain-text file -- so a 429/503 that flew by during a live demo can
 * still be pointed to afterwards instead of only living in this session's
 * memory. See useExtractionEventLog for what gets logged. */
function downloadJournal() {
  const lines = props.entries.map(
    (entry) => `${formatTime(entry.atMs)} - ${entryText(entry)}`,
  );
  downloadTextFile(lines.join("\n"), "extraction-journal.txt");
}
</script>
