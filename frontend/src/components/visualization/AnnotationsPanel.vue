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
          <Select v-model="sort">
            <SelectTrigger size="sm" class="w-auto bg-card text-[10.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{{ t("fomcharts.annotations.sort.newest") }}</SelectItem>
              <SelectItem value="oldest">{{ t("fomcharts.annotations.sort.oldest") }}</SelectItem>
              <SelectItem value="ref">{{ t("fomcharts.annotations.sort.ref") }}</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="link" size="xs" class="h-auto p-0 text-[10.5px]" @click="$emit('clear')">
            {{ t("fomcharts.annotations.clearAll") }}
          </Button>
        </div>

        <div v-if="annotations.length > 0" class="mb-2.5 flex items-center justify-between gap-2">
          <span class="flex items-center gap-1 text-xs text-ink">
            {{ t("fomcharts.annotations.showOnlyPinned") }}
            <InfoTooltip :text="t('fomcharts.annotations.showOnlyPinnedTooltip')" />
          </span>
          <Switch v-model="showOnlyAnnotated" />
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
              <Button
                variant="ghost"
                size="icon-xs"
                class="shrink-0 text-muted-foreground hover:text-ink"
                :aria-label="t('fomcharts.annotations.remove')"
                @click="$emit('remove', note.id)"
              >
                <X class="size-3.5" />
              </Button>
            </div>

            <Button
              v-if="siblingsFor(note).length > 0"
              variant="link"
              size="xs"
              class="h-auto justify-start p-0 text-left text-[10.5px]"
              @click="$emit('pin-rows', siblingsFor(note))"
            >
              {{ t("fomcharts.annotations.pinSiblings", { count: siblingsFor(note).length }) }}
            </Button>

            <!-- Mode ID first, then its own Mode Description right below it
                 (see leadingFieldsFor/restFieldsFor) -- the two are directly
                 related (which configuration this pin is, and what it is),
                 so they read together instead of Mode ID being separated
                 from its description by unrelated fields like Domain/Origin. -->
            <div v-if="leadingFieldsFor(note).length" class="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-xs">
              <template v-for="f in leadingFieldsFor(note)" :key="f.key">
                <span class="text-muted-foreground">{{ f.key }}</span>
                <span class="font-mono" :class="f.bold ? 'font-semibold text-ink' : 'text-secondary'">{{ f.value }}</span>
              </template>
            </div>

            <div v-if="modeDescriptionFor(note)">
              <button
                type="button"
                class="flex w-full items-center justify-between text-left select-none"
                @click="toggleDescription(note.id)"
              >
                <span class="text-xs text-muted-foreground">{{ modeDescriptionColumnName }}</span>
                <ChevronDown
                  class="size-3.5 text-muted-foreground transition-transform duration-200"
                  :class="isDescriptionExpanded(note.id) ? 'rotate-0' : '-rotate-90'"
                />
              </button>
              <div
                class="grid transition-[grid-template-rows] duration-200 ease-out"
                :style="{ gridTemplateRows: isDescriptionExpanded(note.id) ? '1fr' : '0fr' }"
              >
                <div class="min-h-0 overflow-hidden">
                  <p class="pt-1 font-mono text-xs text-secondary">{{ modeDescriptionFor(note) }}</p>
                </div>
              </div>
            </div>

            <div v-if="restFieldsFor(note).length" class="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-xs">
              <template v-for="f in restFieldsFor(note)" :key="f.key">
                <span class="text-muted-foreground">{{ f.key }}</span>
                <span class="font-mono" :class="f.bold ? 'font-semibold text-ink' : 'text-secondary'">{{ f.value }}</span>
              </template>
            </div>

            <Textarea
              :model-value="note.note"
              :placeholder="t('fomcharts.annotations.notePlaceholder')"
              class="w-full resize-y text-xs"
              rows="2"
              @update:model-value="(value) => $emit('update-note', note.id, String(value))"
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
import { ChevronDown, X } from "@lucide/vue";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import { annotationFieldColumns } from "@/utils/annotationFields";
import { findModeDescriptionColumn, findModeIdColumn, type DataRow } from "@/utils/columnTypes";

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
  // Candidate rows to search for pin-able siblings (see siblingsFor) --
  // always the full plottable set, independent of showOnlyAnnotated, so
  // "pin the other modes of this paper" keeps finding them even while the
  // chart itself is narrowed down to just the pinned points.
  rows: DataRow[];
  xAxis: string | null;
  yAxis: string | null;
  groupBy: string | null;
}>();
defineEmits<{
  remove: [id: string];
  clear: [];
  "update-note": [id: string, note: string];
  "pin-rows": [rows: DataRow[]];
}>();

const compareIds = defineModel<string[]>("compareIds", { default: () => [] });
const open = defineModel<boolean>("open", { default: true });
const showOnlyAnnotated = defineModel<boolean>("showOnlyAnnotated", { default: false });
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

// Mode Description is a longer free-text field -- shown collapsed by
// default (see expandedDescriptions below) in its own toggle instead of
// alongside the compact key/value field grid, so a long description
// doesn't push every other field down the card.
const modeDescriptionColumnName = computed(() => findModeDescriptionColumn(props.columns));
const modeDescriptionFor = (note: Annotation): string | null => {
  const col = modeDescriptionColumnName.value;
  if (!col) return null;
  const v = note.row[col];
  return v === null || v === undefined || v === "" ? null : String(v);
};

const modeIdColumnName = computed(() => findModeIdColumn(props.columns));

// Mode ID renders in its own leading grid, immediately followed by its
// Mode Description toggle (see template) -- restFieldColumns is everything
// else (Domain, Origin, the plotted axes, ...), rendered as a second grid
// below the description.
const leadingFieldColumns = computed(() => (modeIdColumnName.value ? [modeIdColumnName.value] : []));
const restFieldColumns = computed(() =>
  annotationFieldColumns(props.columns, props.xAxis, props.yAxis, props.groupBy).filter(
    (col) => col !== modeDescriptionColumnName.value && col !== modeIdColumnName.value,
  ),
);

const fieldRowsFor = (note: Annotation, cols: string[]) =>
  cols.map((col) => ({
    key: col,
    value: note.row[col] === null || note.row[col] === undefined || note.row[col] === "" ? "—" : String(note.row[col]),
    bold: col === props.xAxis || col === props.yAxis,
  }));
const leadingFieldsFor = (note: Annotation) => fieldRowsFor(note, leadingFieldColumns.value);
const restFieldsFor = (note: Annotation) => fieldRowsFor(note, restFieldColumns.value);

// Collapsed by default per pin -- a Set of the *expanded* ids rather than
// collapsed ones, since new pins should start collapsed with no extra
// bookkeeping when they're created.
const expandedDescriptions = ref<Set<string>>(new Set());
const isDescriptionExpanded = (id: string) => expandedDescriptions.value.has(id);
const toggleDescription = (id: string) => {
  const next = new Set(expandedDescriptions.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  expandedDescriptions.value = next;
};

// Same "same pin candidate" rule VisualizationView's pinRows actually pins
// by (see its rowsEqual/isAlreadyPinned) -- not just reference equality.
// Without this, a row that's a content-duplicate of an already-pinned row
// (but a different object) would count here as a pinnable sibling, showing
// "pin 1 other point", yet pinRows would then silently skip it as already
// pinned -- the button looked broken because the two dedup rules disagreed.
const rowsEqual = (a: DataRow, b: DataRow): boolean => {
  if (a === b) return true;
  return props.columns.every((col) => a[col] === b[col]);
};

// Other currently-plottable rows sharing this pin's Ref that aren't pinned
// yet -- e.g. a paper's other extracted modes/cases -- offered as a
// one-click "pin these too" shortcut instead of hunting each one down on
// the chart (which is exactly what's hard when they overlap).
const siblingsFor = (note: Annotation): DataRow[] =>
  props.rows.filter((row) => {
    if (rowsEqual(row, note.row)) return false;
    if (String(row.ref ?? row.Ref ?? "") !== note.ref) return false;
    return !props.annotations.some((a) => rowsEqual(a.row, row));
  });
</script>
