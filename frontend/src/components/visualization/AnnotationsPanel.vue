<template>
  <TooltipProvider :delay-duration="200">
    <CollapsibleSection v-model:open="open">
      <template #title>
        <span class="flex items-center gap-1.5">
          {{ t("fomcharts.annotations.title") }}
          <InfoTooltip :text="t('fomcharts.annotations.tooltip')" />
        </span>
      </template>
      <template #header-suffix>
        <span class="font-mono text-[11px] font-normal text-muted-foreground">{{ annotations.length }}</span>
      </template>

      <div class="mt-2.5 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
        <div v-if="annotations.length > 0" class="mb-2.5 flex items-center justify-between gap-2">
          <select
            v-model="sort"
            class="rounded-md border border-secondary/20 bg-card px-1.5 py-1 font-sans text-[10.5px] text-secondary"
          >
            <option value="newest">{{ t("fomcharts.annotations.sort.newest") }}</option>
            <option value="oldest">{{ t("fomcharts.annotations.sort.oldest") }}</option>
            <option value="ref">{{ t("fomcharts.annotations.sort.ref") }}</option>
          </select>
          <button type="button" class="text-[10.5px] text-primary" @click="$emit('clear')">
            {{ t("fomcharts.annotations.clearAll") }}
          </button>
        </div>

        <div v-if="annotations.length > 0" class="flex max-h-105 flex-col gap-2 overflow-y-auto">
          <div
            v-for="note in sortedAnnotations"
            :key="note.id"
            class="flex flex-col gap-2.5 rounded-[10px] border border-secondary/15 bg-white/70 p-3.5"
          >
            <div class="flex items-center justify-between gap-2">
              <label class="flex min-w-0 cursor-pointer items-center gap-2">
                <Checkbox
                  :model-value="compareIds.includes(note.id)"
                  :aria-label="t('fomcharts.annotations.compareLabel')"
                  @update:model-value="toggleCompare(note.id)"
                />
                <span class="shrink-0 font-mono text-xs font-bold text-primary">{{ note.ref }}</span>
                <span class="truncate text-xs text-secondary">{{ note.title }}</span>
              </label>
              <button
                type="button"
                class="shrink-0 text-muted-foreground hover:text-ink"
                :aria-label="t('fomcharts.annotations.remove')"
                @click="$emit('remove', note.id)"
              >
                <X class="size-3.5" />
              </button>
            </div>

            <div v-if="fieldsFor(note).length" class="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-xs">
              <template v-for="f in fieldsFor(note)" :key="f.key">
                <span class="text-muted-foreground">{{ f.key }}</span>
                <span class="font-mono" :class="f.bold ? 'font-semibold text-ink' : 'text-secondary'">{{ f.value }}</span>
              </template>
            </div>

            <textarea
              :value="note.note"
              :placeholder="t('fomcharts.annotations.notePlaceholder')"
              class="w-full resize-y rounded-lg border border-secondary/20 bg-card px-2.5 py-2 font-sans text-xs text-ink"
              rows="2"
              @change="$emit('update-note', note.id, ($event.target as HTMLTextAreaElement).value)"
            />
          </div>
        </div>
        <p v-else class="text-xs leading-relaxed text-muted-foreground">
          {{ t("fomcharts.annotations.empty") }}
        </p>
      </div>
    </CollapsibleSection>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { X } from "@lucide/vue";
import { Checkbox } from "@/components/ui/checkbox";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import { annotationFieldColumns } from "@/utils/annotationFields";
import type { DataRow } from "@/utils/columnTypes";

const { t } = useI18n();

export interface Annotation {
  id: string;
  ref: string;
  title: string;
  /** Full source row snapshot -- lets the field grid / compare table read
   * whichever columns are relevant generically, instead of freezing a
   * fixed set of values at pin time. */
  row: DataRow;
  note: string;
  createdAt: number;
}

const props = defineProps<{
  annotations: Annotation[];
  columns: string[];
  xAxis: string | null;
  yAxis: string | null;
  groupBy: string | null;
}>();
defineEmits<{
  remove: [id: string];
  clear: [];
  "update-note": [id: string, note: string];
}>();

const compareIds = defineModel<string[]>("compareIds", { default: () => [] });
const open = ref(true);
const sort = ref<"newest" | "oldest" | "ref">("newest");

const toggleCompare = (id: string) => {
  compareIds.value = compareIds.value.includes(id)
    ? compareIds.value.filter((x) => x !== id)
    : [...compareIds.value, id];
};

const sortedAnnotations = computed(() => {
  const sorted = [...props.annotations];
  if (sort.value === "ref") {
    sorted.sort((a, b) => a.ref.localeCompare(b.ref, undefined, { numeric: true }));
  } else if (sort.value === "oldest") {
    sorted.sort((a, b) => a.createdAt - b.createdAt);
  } else {
    sorted.sort((a, b) => b.createdAt - a.createdAt);
  }
  return sorted;
});

const fieldColumns = computed(() => annotationFieldColumns(props.columns, props.xAxis, props.yAxis, props.groupBy));

const fieldsFor = (note: Annotation) =>
  fieldColumns.value.map((col) => ({
    key: col,
    value: note.row[col] === null || note.row[col] === undefined || note.row[col] === "" ? "—" : String(note.row[col]),
    bold: col === props.xAxis || col === props.yAxis,
  }));
</script>
