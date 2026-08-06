<template>
  <TooltipProvider :delay-duration="200">
    <CollapsibleSection v-model:open="open">
      <template #title>
        <span class="flex items-center gap-1.5">
          {{ t("fomcharts.annotations.title") }}
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
            <InfoTooltip :text="t('fomcharts.annotations.showOnlyPinnedTooltip')" />
            {{ t("fomcharts.annotations.showOnlyPinned") }}
          </span>
          <Switch v-model="showOnlyAnnotated" />
        </div>

        <!-- Only shown once there's something to compare, so this bar doesn't
             take up space with a single (or zero) pin. -->
        <div v-if="annotations.length > 1" class="mb-2.5 flex items-center justify-between gap-2">
          <Button
            size="xs"
            class="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
            :disabled="selectedOrder.length < 2"
            @click="showCompareDialog = true"
          >
            <GitCompare class="size-3.5" />
            {{ t("fomcharts.compare.compareButton", { count: selectedOrder.length }) }}
          </Button>
          <Button variant="link" size="xs" class="h-auto p-0 text-[10.5px]" @click="toggleSelectAll">
            {{ t(allSelected ? "fomcharts.compare.deselectAll" : "fomcharts.compare.selectAll") }}
          </Button>
        </div>

        <div
          v-if="annotations.length > 0"
          class="flex flex-col gap-2 overflow-x-hidden"
          :class="unboundedList ? '' : 'max-h-88 overflow-y-auto'"
        >
          <AnnotationCard
            v-for="note in sortedAnnotations"
            :key="note.id"
            ref="cardRefs"
            :note="note"
            :expanded="isExpanded(note.id)"
            :description-expanded="isDescriptionExpanded(note.id)"
            :selected="selectedOrder.includes(note.id)"
            :compare-limit-reached="selectedOrder.length >= compareMax && !selectedOrder.includes(note.id)"
            :compare-max="compareMax"
            :x-axis="xAxis"
            :y-axis="yAxis"
            :leading-fields="leadingFieldsFor(note)"
            :fold-fields="foldFieldsFor(note)"
            :mode-description-column-name="modeDescriptionColumnName"
            :mode-description="modeDescriptionFor(note)"
            :layer-structure-column-name="layerStructureColumnName"
            :layer-structure-raw="layerStructureRawFor(note)"
            :material-class-column-name="materialClassColumnName"
            :base-materials-column-name="baseMaterialsColumnName"
            :origin-column-name="originColumnName"
            :siblings="siblingsFor(note)"
            :initial-layers="layersFor(note)"
            @toggle-expand="toggleExpanded(note.id)"
            @remove="$emit('remove', note.id)"
            @pin-siblings="(rows) => $emit('pin-rows', rows)"
            @update-note="(value) => $emit('update-note', note.id, value)"
            @toggle-description="toggleDescription(note.id)"
            @toggle-select="toggleSelect(note.id)"
          />
        </div>
        <p v-else class="text-xs leading-relaxed text-muted-foreground">
          {{ t("fomcharts.annotations.empty") }}
        </p>
      </div>
    </CollapsibleSection>

    <CompareDialog v-model:open="showCompareDialog" v-model:order="selectedOrder" :all-pins="allCardData" />
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { GitCompare } from "@lucide/vue";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import AnnotationCard from "./AnnotationCard.vue";
import CompareDialog from "./CompareDialog.vue";
import { annotationFieldColumns } from "@/utils/annotationFields";
import { buildAnnotationCardData, type AnnotationCardData } from "@/utils/annotationCardData";
import type { AnnotationExportSection } from "@/utils/annotationExport";
import { renderComparePng, type ComparePinData } from "@/utils/compareExport";
import {
  findBaseMaterialsColumn,
  findDomainColumn,
  findLayerStructureColumn,
  findMaterialClassColumn,
  findModeDescriptionColumn,
  findModeIdColumn,
  findOriginColumn,
  type DataRow,
} from "@/utils/columnTypes";
import { parseLayerStructure, type StructureLayer } from "@/utils/layerStructure";
import { formatUnitSuperscripts } from "@/utils/columnTypes";

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
  // The real sidebar caps the card list at max-h-88 and scrolls -- the
  // guide's own demo instance needs an expanded card to render in full,
  // uncropped, for its own figure, so it opts out of that cap instead.
  unboundedList?: boolean;
}>();
defineEmits<{
  remove: [id: string];
  clear: [];
  "update-note": [id: string, note: string];
  "pin-rows": [rows: DataRow[]];
}>();

const open = defineModel<boolean>("open", { default: true });
const showOnlyAnnotated = defineModel<boolean>("showOnlyAnnotated", { default: false });
const sort = ref<"newest" | "oldest" | "ref">("newest");

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
const layerStructureColumnName = computed(() => findLayerStructureColumn(props.columns));
const domainColumnName = computed(() => findDomainColumn(props.columns));
const originColumnName = computed(() => findOriginColumn(props.columns));
const materialClassColumnName = computed(() => findMaterialClassColumn(props.columns));
const baseMaterialsColumnName = computed(() => findBaseMaterialsColumn(props.columns));

// Mode ID renders in its own leading grid, immediately followed by its Mode
// Description toggle (see template) -- foldFieldColumns is what's left
// (Sensitivity, Q-factor, ...) shown in the "Metrics" card once expanded.
// The plotted X/Y axes are excluded since they're already shown inline in
// the card header (see AnnotationCard); Layer Structure, Material Class and
// Base Materials are excluded since they render together as their own
// structure card (see layersFor) instead of plain text rows; Origin is
// excluded since it renders in the always-visible header instead, right
// under the title, rather than only once the card is expanded; Domain is
// excluded as near-constant noise -- this tool only ever extracts
// wavelength-domain FOM records (see backend/prompt.txt's scope rule), so
// "Domain: Wavelength" repeats on every single pin without distinguishing
// any of them.
const leadingFieldColumns = computed(() => (modeIdColumnName.value ? [modeIdColumnName.value] : []));
const foldFieldColumns = computed(() =>
  annotationFieldColumns(props.columns, props.xAxis, props.yAxis, props.groupBy).filter(
    (col) =>
      col !== modeDescriptionColumnName.value &&
      col !== modeIdColumnName.value &&
      col !== props.xAxis &&
      col !== props.yAxis &&
      col !== layerStructureColumnName.value &&
      col !== materialClassColumnName.value &&
      col !== baseMaterialsColumnName.value &&
      col !== originColumnName.value &&
      col !== domainColumnName.value,
  ),
);

// formatUnitSuperscripts on the key only -- display text, never used to
// index note.row again once built here.
const fieldRowsFor = (note: Annotation, cols: string[]) =>
  cols.map((col) => ({
    key: formatUnitSuperscripts(col),
    value: note.row[col] === null || note.row[col] === undefined || note.row[col] === "" ? "—" : String(note.row[col]),
  }));
const leadingFieldsFor = (note: Annotation) => fieldRowsFor(note, leadingFieldColumns.value);
const foldFieldsFor = (note: Annotation) => fieldRowsFor(note, foldFieldColumns.value);

const layersFor = (note: Annotation): StructureLayer[] => {
  const col = layerStructureColumnName.value;
  return col ? parseLayerStructure(note.row[col]) : [];
};

const layerStructureRawFor = (note: Annotation): string | null => {
  const col = layerStructureColumnName.value;
  if (!col) return null;
  const v = note.row[col];
  return v === null || v === undefined || v === "" ? null : String(v);
};

// Collapsed by default per pin -- accordion behavior, at most one card open
// at a time, so expanding a pin to compare it against the chart doesn't
// leave a growing stack of previously-opened cards pushing everything else
// out of view in this narrow sidebar list.
const expandedId = ref<string | null>(null);
const isExpanded = (id: string) => expandedId.value === id;
const toggleExpanded = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id;
};

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

// Comparing more than a handful of pins side by side stops being readable
// (columns shrink, the exported PNG gets unwieldy) -- capped well below
// that point rather than left unbounded.
const compareMax = 6;
// An ORDERED array, not a Set -- order here is click/select order (append on
// select, splice on deselect), independent of sortedAnnotations' own sort.
// This is also handed to CompareDialog as a two-way v-model:order, so
// reordering/adding/removing points *inside* the open dialog updates this
// exact same array (see CompareDialog.vue) -- which is also what makes the
// dialog remember its last order if reopened on the same selection, for
// free, without extra state.
const selectedOrder = ref<string[]>([]);
const showCompareDialog = ref(false);

const toggleSelect = (id: string) => {
  const idx = selectedOrder.value.indexOf(id);
  if (idx !== -1) {
    selectedOrder.value = selectedOrder.value.filter((existing) => existing !== id);
  } else if (selectedOrder.value.length < compareMax) {
    selectedOrder.value = [...selectedOrder.value, id];
  }
};

const clearSelection = () => {
  selectedOrder.value = [];
};

// "Select all" is capped at compareMax same as individual toggles above --
// selects the first compareMax pins in the current sort order. Once that cap
// (or the full list, if smaller) is reached, the same button flips to a
// "deselect all" action instead of just becoming a no-op.
const allSelected = computed(() => {
  const selectableCount = Math.min(compareMax, sortedAnnotations.value.length);
  return selectableCount > 0 && selectedOrder.value.length >= selectableCount;
});
const toggleSelectAll = () => {
  if (allSelected.value) {
    clearSelection();
  } else {
    selectedOrder.value = sortedAnnotations.value.slice(0, compareMax).map((a) => a.id);
  }
};

// A pin selected for compare can still be removed from the panel entirely
// (see @remove) -- prune stale ids so the compare count/dialog never holds
// onto a reference to an annotation that no longer exists. The same watcher
// also auto-selects freshly pinned points for comparison (up to compareMax)
// -- pinning is already the "I care about this point" signal, so requiring a
// second, separate click on the compare checkbox just to line it up for
// comparison was redundant busywork.
watch(
  () => props.annotations,
  (list, oldList) => {
    const ids = new Set(list.map((a) => a.id));
    let next = selectedOrder.value;
    let changed = false;
    if (next.some((id) => !ids.has(id))) {
      next = next.filter((id) => ids.has(id));
      changed = true;
    }
    const oldIds = new Set((oldList ?? []).map((a) => a.id));
    const added = list.filter((a) => !oldIds.has(a.id));
    if (added.length > 0 && next.length < compareMax) {
      const updated = [...next];
      for (const a of added) {
        if (updated.length >= compareMax) break;
        updated.push(a.id);
      }
      next = updated;
      changed = true;
    }
    if (changed) selectedOrder.value = next;
  },
);

// Built from the exact same per-note field rules AnnotationCard uses for its
// own single-pin export (see annotationCardData.ts), shared by both
// allCardData below and the guide's getComparePngDataUrl.
const cardDataFor = (note: Annotation): AnnotationCardData =>
  buildAnnotationCardData({
    id: note.id,
    ref: note.ref,
    title: note.title,
    row: note.row,
    note: note.note,
    xAxis: props.xAxis,
    yAxis: props.yAxis,
    layerStructureColumnName: layerStructureColumnName.value,
    materialClassColumnName: materialClassColumnName.value,
    baseMaterialsColumnName: baseMaterialsColumnName.value,
    originColumnName: originColumnName.value,
    leadingFields: leadingFieldsFor(note),
    foldFields: foldFieldsFor(note),
    modeDescription: modeDescriptionFor(note),
    layers: layersFor(note),
    layerStructureRaw: layerStructureRawFor(note),
  });

// Every pin, mapped once -- CompareDialog derives its own working set from
// this plus selectedOrder (its v-model:order), so it can offer the full
// "+ Add point" candidate list (every pin not currently in the comparison)
// without the panel needing to know anything about the dialog's internals.
const allCardData = computed<AnnotationCardData[]>(() => sortedAnnotations.value.map(cardDataFor));

// Guide-only: renders the same side-by-side comparison CompareDialog draws
// (mirroring its own AnnotationCardData -> ComparePinData mapping with every
// section toggle at its default "on"), without needing to actually open the
// dialog -- pdfExport.ts only ever captures `.guide-page` elements, and a
// Dialog's content teleports outside that tree, so a real open/screenshot
// isn't an option here.
const comparePinsFor = (ids: string[]): ComparePinData[] =>
  ids
    .map((id) => sortedAnnotations.value.find((note) => note.id === id))
    .filter((note): note is Annotation => !!note)
    .map(cardDataFor)
    .map((d) => {
      const sections: AnnotationExportSection[] = [];
      if (d.modeRows.length > 0 || d.modeDescription) sections.push({ title: t("fomcharts.annotations.mode"), rows: d.modeRows, text: d.modeDescription ?? undefined });
      if (d.structureExtraFields.length > 0 || d.layers.length > 0) sections.push({ title: t("fomcharts.annotations.layerStructure"), rows: d.structureExtraFields, layers: d.layers });
      if (d.metricsRows.length > 0) sections.push({ title: t("fomcharts.annotations.metrics"), rows: d.metricsRows });
      if (d.note) sections.push({ title: t("fomcharts.annotations.notes"), text: d.note });
      return { ref: d.ref, title: d.title, origin: d.origin, sections };
    });
const getComparePngDataUrl = (ids: string[], title: string | null = null): string | null => renderComparePng(title, comparePinsFor(ids));

// Guide-only: v-for + ref="cardRefs" collects one entry per rendered card,
// in the same order as sortedAnnotations -- looking a note up by id (rather
// than assuming a fixed index) keeps this correct regardless of the current
// sort order.
const cardRefs = ref<InstanceType<typeof AnnotationCard>[]>([]);
const getExportDataUrl = (noteId: string): string | null => {
  const idx = sortedAnnotations.value.findIndex((n) => n.id === noteId);
  return idx >= 0 ? (cardRefs.value[idx]?.getExportDataUrl() ?? null) : null;
};
const getMetricsExportDataUrl = (noteId: string): string | null => {
  const idx = sortedAnnotations.value.findIndex((n) => n.id === noteId);
  return idx >= 0 ? (cardRefs.value[idx]?.getMetricsExportDataUrl() ?? null) : null;
};
defineExpose({ getExportDataUrl, getMetricsExportDataUrl, getComparePngDataUrl });
</script>
