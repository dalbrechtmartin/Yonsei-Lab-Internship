<template>
  <Alert variant="info">
    <Info class="size-4" />
    <div class="flex min-w-0 flex-col gap-2.5">
      <div class="flex items-start justify-between gap-2">
        <AlertDescription class="text-xs leading-relaxed">
          <p class="font-semibold text-ink">
            {{ t("view.visualization.conversionPreview.title") }}
          </p>
          <p>
            {{
              t(
                "view.visualization.conversionPreview.summary",
                { rows: totalRowCount, shown: previewRowCount },
                { plural: previewRowCount },
              )
            }}
          </p>
        </AlertDescription>
        <button
          type="button"
          class="shrink-0 rounded p-1 text-secondary transition-colors hover:bg-secondary/15 hover:text-ink"
          :aria-label="t('view.visualization.conversionPreview.dismiss')"
          @click="emit('dismiss')"
        >
          <X class="size-3.5" />
        </button>
      </div>

      <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div class="min-w-0">
          <p class="mb-1 text-[10px] font-semibold tracking-wide text-secondary uppercase">
            {{ t("view.visualization.conversionPreview.before") }}
          </p>
          <div class="overflow-x-auto rounded-md border border-secondary/20">
            <table class="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th
                    v-for="col in originalColumns"
                    :key="col"
                    class="border-b border-secondary/15 px-2 py-1 text-left font-medium whitespace-nowrap text-secondary"
                  >
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in originalRows" :key="i">
                  <td
                    v-for="col in originalColumns"
                    :key="col"
                    class="border-b border-secondary/10 px-2 py-1 whitespace-nowrap text-ink last:border-b-0"
                  >
                    {{ formatCell(row[col]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="min-w-0">
          <p class="mb-1 text-[10px] font-semibold tracking-wide text-secondary uppercase">
            {{ t("view.visualization.conversionPreview.after") }}
          </p>
          <div class="overflow-x-auto rounded-md border border-secondary/20">
            <table class="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th
                    v-for="col in convertedColumns"
                    :key="col"
                    class="border-b border-secondary/15 px-2 py-1 text-left font-medium whitespace-nowrap text-secondary"
                  >
                    {{ col }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, i) in convertedRows" :key="i">
                  <td
                    v-for="col in convertedColumns"
                    :key="col"
                    class="border-b border-secondary/10 px-2 py-1 whitespace-nowrap text-ink last:border-b-0"
                  >
                    {{ formatCell(row[col]) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </Alert>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Info, X } from "@lucide/vue";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { DataRow } from "@/utils/columnTypes";

/**
 * Shown once, right after a non-standard spreadsheet gets AI-reformatted
 * (see VisualizationView's handleUpload/needsAiConversion) -- the old
 * behavior silently swapped fomData/fomColumns with no way to tell what the
 * AI actually did to your file short of eyeballing the chart. This is a
 * factual before/after preview of the same first few rows, not a narrated
 * "converted X from µm to nm"-style summary: the app has no per-column
 * mapping from the conversion (see backend's convert_table_to_viz_schema,
 * which returns a same-row-count array with no changelog), so inventing
 * specific per-field claims here would risk being wrong. Row/column counts
 * are the only things this can state with certainty. Columns are never
 * truncated (an arbitrary uploaded sheet can have many) -- each table just
 * scrolls horizontally instead, so nothing is hidden from the comparison.
 */
const props = defineProps<{
  originalColumns: string[];
  originalRows: DataRow[];
  convertedColumns: string[];
  convertedRows: DataRow[];
  /** Full dataset size (the preview rows above are only the first few). */
  totalRowCount: number;
}>();
const emit = defineEmits<{ dismiss: [] }>();
const { t } = useI18n();

const previewRowCount = computed(() =>
  Math.min(props.originalRows.length, props.convertedRows.length),
);

function formatCell(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}
</script>
