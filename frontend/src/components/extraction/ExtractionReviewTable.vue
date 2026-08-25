<template>
  <div
    class="min-h-0 flex-1 overflow-auto rounded-[10px] border border-secondary/14 bg-card/70"
  >
    <table class="w-full border-collapse text-sm">
      <thead class="sticky top-0 z-10 bg-card/95 backdrop-blur-xl">
        <tr class="border-b border-secondary/10">
          <th
            v-for="col in columns"
            :key="col.key"
            class="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground"
          >
            {{ t(col.labelKey) }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="record in records"
          :key="`${record.fileId}:${record.index}`"
          tabindex="0"
          class="cursor-pointer border-t border-secondary/10 outline-none transition-colors hover:bg-primary/5 focus-visible:bg-primary/8"
          :class="[rowClass(record), isSelected(record) && 'bg-primary/8']"
          @click="emit('select', record)"
          @keydown.enter="emit('select', record)"
        >
          <td class="px-3 py-2 text-ink">
            <span class="flex items-center gap-1.5">
              <AlertTriangle
                v-if="record.reviewStatus === 'Edit'"
                class="size-3 shrink-0 text-amber-600"
                :aria-label="t('extraction.review.flaggedAria')"
              />
              <span class="truncate">{{ record.ref || "—" }}</span>
            </span>
          </td>
          <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
            {{ record.resonanceWavelengthNm ?? "—" }}
          </td>
          <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
            {{ record.fomRiuInv ?? "—" }}
          </td>
          <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
            {{ record.fwhmNm ?? "—" }}
          </td>
          <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
            {{ record.qFactor ?? "—" }}
          </td>
          <td class="px-3 py-2 text-secondary">{{ record.origin || "—" }}</td>
        </tr>
        <tr v-if="!records.length">
          <td colspan="6" class="px-3 py-8 text-center text-sm text-secondary">
            {{ t("extraction.review.empty") }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { AlertTriangle } from "@lucide/vue";
import type { ExtractionRecord } from "@/services/api";

const props = defineProps<{
  /** Already filtered by the active tab -- this component just renders. */
  records: ExtractionRecord[];
  selectedIndex: string | null;
}>();
const emit = defineEmits<{
  select: [record: ExtractionRecord];
}>();

const { t } = useI18n();

const columns: { key: string; labelKey: string }[] = [
  { key: "ref", labelKey: "extraction.review.table.columns.ref" },
  { key: "wavelength", labelKey: "extraction.review.table.columns.wavelength" },
  { key: "fom", labelKey: "extraction.review.table.columns.fom" },
  { key: "fwhm", labelKey: "extraction.review.table.columns.fwhm" },
  { key: "q", labelKey: "extraction.review.table.columns.q" },
  { key: "origin", labelKey: "extraction.review.table.columns.origin" },
];

function rowKey(record: ExtractionRecord): string {
  return `${record.fileId}:${record.index}`;
}

function isSelected(record: ExtractionRecord): boolean {
  return props.selectedIndex === rowKey(record);
}

// Backend has no structured "which field is disputed" data -- only the
// row-level Review status + a free-text Reconciliation Log -- so a flagged
// row is signaled as a whole (amber tint + warning icon on Ref), not one
// specific cell.
function rowClass(record: ExtractionRecord): string {
  if (record.reviewStatus === "Exclude") return "text-secondary/60 line-through";
  if (record.reviewStatus === "Approve (Manual)") return "bg-emerald-500/5";
  if (record.reviewStatus === "Edit") return "bg-amber-500/6";
  return "";
}
</script>
