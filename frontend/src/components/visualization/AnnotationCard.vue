<template>
  <div class="flex flex-col rounded-[10px] border border-secondary/15 bg-white/70" :class="selected ? 'ring-1 ring-primary/40' : ''">
    <div class="flex flex-col gap-2 p-3">
      <div class="flex items-start gap-1.5">
        <button
          type="button"
          class="-m-1 min-w-0 flex-1 rounded-md p-1 text-left transition-colors hover:bg-secondary/8"
          :aria-label="expanded ? t('fomcharts.annotations.collapseDetails') : t('fomcharts.annotations.expandDetails')"
          @click="$emit('toggle-expand')"
        >
          <span class="flex items-center gap-1.5">
            <span class="shrink-0 font-mono text-xs font-bold text-primary">{{ note.ref }}</span>
            <span class="truncate text-xs text-ink">{{ note.title }}</span>
            <ChevronDown
              class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200"
              :class="expanded ? '' : '-rotate-90'"
            />
          </span>
          <span v-if="axisBadges.length" class="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10.5px] text-secondary">
            <span v-for="badge in axisBadges" :key="badge.key">{{ badge.key }} <b class="font-mono text-ink">{{ badge.value }}</b></span>
          </span>
        </button>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-xs"
              class="shrink-0 text-primary hover:bg-primary/8 hover:text-primary/80"
              :aria-label="t('fomcharts.annotations.exportPin')"
              @click="downloadAllPng"
            >
              <Download class="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t("fomcharts.annotations.exportPin") }}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-xs"
              class="shrink-0 text-muted-foreground hover:text-ink"
              :aria-label="t('fomcharts.annotations.remove')"
              @click="$emit('remove')"
            >
              <X class="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t("fomcharts.annotations.remove") }}</TooltipContent>
        </Tooltip>
      </div>

      <div class="flex items-center justify-between gap-2">
        <label
          class="flex min-w-0 items-center gap-1.5 rounded py-0.5 text-[10.5px] select-none"
          :class="compareLimitReached ? 'cursor-not-allowed text-muted-foreground/50' : 'cursor-pointer text-primary hover:text-primary/80'"
        >
          <Checkbox :model-value="selected" :disabled="compareLimitReached" @update:model-value="$emit('toggle-select')" />
          <span class="truncate">{{ compareLimitReached ? t("fomcharts.annotations.compareLimitReached", { max: compareMax }) : t("fomcharts.annotations.compareLabel") }}</span>
        </label>
        <Tooltip v-if="siblings.length > 0">
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon-xs"
              class="shrink-0 text-primary hover:bg-primary/8 hover:text-primary/80"
              :aria-label="t('fomcharts.annotations.pinSiblings', { count: siblings.length })"
              @click="$emit('pin-siblings', siblings)"
            >
              <PinIcon class="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{{ t("fomcharts.annotations.pinSiblings", { count: siblings.length }) }}</TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div class="grid transition-[grid-template-rows] duration-200 ease-out" :style="{ gridTemplateRows: expanded ? '1fr' : '0fr' }">
      <div class="min-h-0 overflow-hidden">
        <div class="flex flex-col gap-2.5 px-3.5 pb-3.5">
          <div v-if="originField" class="grid grid-cols-[auto_1fr] gap-x-2.5 rounded-md border border-secondary/20 bg-card px-2.5 py-2 text-xs">
            <span class="text-muted-foreground">{{ originField.key }}</span>
            <span class="font-mono font-semibold text-ink">{{ originField.value }}</span>
          </div>

          <div
            v-if="leadingFields.length || modeDescription"
            class="flex flex-col gap-1.5 rounded-md border border-secondary/20 bg-card px-2.5 py-2"
          >
            <div v-if="leadingFields.length" class="grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-xs">
              <template v-for="f in leadingFields" :key="f.key">
                <span class="text-muted-foreground">{{ f.key }}</span>
                <span class="font-mono font-semibold text-ink">{{ f.value }}</span>
              </template>
            </div>

            <div v-if="modeDescription">
              <button
                type="button"
                class="-mx-1.5 flex w-[calc(100%+0.75rem)] items-center justify-between rounded-md px-1.5 py-0.5 text-left transition-colors select-none hover:bg-secondary/10"
                @click="$emit('toggle-description')"
              >
                <span class="text-xs text-muted-foreground">{{ modeDescriptionColumnName }}</span>
                <ChevronDown
                  class="size-3.5 text-muted-foreground transition-transform duration-200"
                  :class="descriptionExpanded ? 'rotate-0' : '-rotate-90'"
                />
              </button>
              <div
                class="grid transition-[grid-template-rows] duration-200 ease-out"
                :style="{ gridTemplateRows: descriptionExpanded ? '1fr' : '0fr' }"
              >
                <div class="min-h-0 overflow-hidden">
                  <p class="pt-1 font-mono text-xs text-secondary">{{ modeDescription }}</p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="initialLayers.length > 0" class="flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2 py-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-[10.5px] text-secondary">{{ t("fomcharts.annotations.layerStructure") }} ({{ initialLayers.length }})</span>
              <Dialog>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <DialogTrigger as-child>
                      <button
                        type="button"
                        class="flex size-6 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/8 hover:text-primary/80"
                        :aria-label="t('fomcharts.annotations.zoomLayers')"
                      >
                        <ZoomIn class="size-3.5" />
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.annotations.zoomLayers") }}</TooltipContent>
                </Tooltip>
                <DialogContent class="max-w-sm">
                  <DialogTitle class="pr-6">
                    <span class="font-mono text-primary">{{ note.ref }}</span>
                    <span class="ml-1.5 font-normal text-ink">{{ note.title }}</span>
                  </DialogTitle>
                  <DialogDescription>{{ t("fomcharts.annotations.layerStructure") }}</DialogDescription>
                  <div v-if="structureExtraFields.length" class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                    <template v-for="f in structureExtraFields" :key="f.key">
                      <span class="text-muted-foreground">{{ f.key }}</span>
                      <span class="font-mono font-semibold wrap-break-word text-ink">{{ f.value }}</span>
                    </template>
                  </div>
                  <div class="mt-3">
                    <LayerStack :layers="initialLayers" />
                  </div>
                  <div class="mt-3 flex justify-end">
                    <Button variant="outline" size="xs" class="border-primary/30 bg-card text-primary hover:border-primary/50 hover:bg-primary/8 hover:text-primary" @click="downloadLayersPng">
                      <Download class="size-3" />
                      {{ t("fomcharts.annotations.downloadPng") }}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p v-if="layerStructureRaw" class="truncate font-mono text-[10px] text-muted-foreground">{{ layerStructureRaw }}</p>
            <div v-if="structureExtraFields.length" class="flex flex-col gap-0.5">
              <p v-for="f in structureExtraFields" :key="f.key" class="truncate text-[10px] text-muted-foreground">
                {{ f.key }} <b class="font-mono text-secondary">{{ f.value }}</b>
              </p>
            </div>
          </div>

          <div v-if="exportMetricsRows.length" class="flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2 py-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="truncate text-[10.5px] text-secondary">{{ t("fomcharts.annotations.metrics") }} ({{ exportMetricsRows.length }})</span>
              <Dialog>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <DialogTrigger as-child>
                      <button
                        type="button"
                        class="flex size-6 shrink-0 items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/8 hover:text-primary/80"
                        :aria-label="t('fomcharts.annotations.zoomMetrics')"
                      >
                        <ZoomIn class="size-3.5" />
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.annotations.zoomMetrics") }}</TooltipContent>
                </Tooltip>
                <DialogContent class="max-w-sm">
                  <DialogTitle class="pr-6">
                    <span class="font-mono text-primary">{{ note.ref }}</span>
                    <span class="ml-1.5 font-normal text-ink">{{ note.title }}</span>
                  </DialogTitle>
                  <DialogDescription>{{ t("fomcharts.annotations.metrics") }}</DialogDescription>
                  <div class="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                    <template v-for="f in exportMetricsRows" :key="f.key">
                      <span class="text-muted-foreground">{{ f.key }}</span>
                      <span class="font-mono font-semibold wrap-break-word text-ink">{{ f.value }}</span>
                    </template>
                  </div>
                  <div class="mt-3 flex justify-end">
                    <Button variant="outline" size="xs" class="border-primary/30 bg-card text-primary hover:border-primary/50 hover:bg-primary/8 hover:text-primary" @click="downloadFieldsPng">
                      <Download class="size-3" />
                      {{ t("fomcharts.annotations.downloadPng") }}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p class="truncate text-[10px] text-muted-foreground">{{ foldFieldsPreview }}</p>
          </div>

          <div class="flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2 py-1.5">
            <div class="flex items-center justify-between gap-2">
              <span class="text-[10.5px] text-secondary">{{ t("fomcharts.annotations.notes") }}</span>
              <Dialog>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <DialogTrigger as-child>
                      <button
                        type="button"
                        class="flex size-6 shrink-0 items-center justify-center rounded-md transition-colors"
                        :class="note.note ? 'text-primary hover:bg-primary/8 hover:text-primary/80' : 'text-muted-foreground hover:bg-secondary/10 hover:text-ink'"
                        :aria-label="t('fomcharts.annotations.notes')"
                      >
                        <NotebookPen class="size-3.5" />
                      </button>
                    </DialogTrigger>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.annotations.notes") }}</TooltipContent>
                </Tooltip>
                <DialogContent class="max-w-sm">
                  <DialogTitle class="pr-6">
                    <span class="font-mono text-primary">{{ note.ref }}</span>
                    <span class="ml-1.5 font-normal text-ink">{{ note.title }}</span>
                  </DialogTitle>
                  <DialogDescription>{{ t("fomcharts.annotations.notes") }}</DialogDescription>
                  <Textarea
                    :model-value="note.note"
                    :placeholder="t('fomcharts.annotations.notePlaceholder')"
                    class="mt-3 w-full resize-y text-xs"
                    rows="6"
                    @update:model-value="(value) => $emit('update-note', String(value))"
                  />
                  <div class="mt-3 flex justify-end">
                    <Button
                      variant="outline"
                      size="xs"
                      class="border-primary/30 bg-card text-primary hover:border-primary/50 hover:bg-primary/8 hover:text-primary"
                      :disabled="!note.note"
                      @click="downloadNoteTxt"
                    >
                      <Download class="size-3" />
                      {{ t("fomcharts.annotations.downloadTxt") }}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p v-if="note.note" class="line-clamp-2 font-mono text-[10px] text-muted-foreground">{{ note.note }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Download, NotebookPen, Pin as PinIcon, X, ZoomIn } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import LayerStack from "./LayerStack.vue";
import type { Annotation } from "./AnnotationsPanel.vue";
import type { DataRow } from "@/utils/columnTypes";
import type { StructureLayer } from "@/utils/layerStructure";
import { exportLayerStackPng } from "@/utils/layerStackExport";
import { exportFieldListPng, renderFieldListPng } from "@/utils/fieldListExport";
import { exportAnnotationPng, renderAnnotationPng, type AnnotationExportSection } from "@/utils/annotationExport";
import { buildAnnotationCardData } from "@/utils/annotationCardData";
import { downloadTextFile } from "@/utils/textExport";

const { t } = useI18n();

const props = defineProps<{
  note: Annotation;
  expanded: boolean;
  descriptionExpanded: boolean;
  selected: boolean;
  compareLimitReached: boolean;
  compareMax: number;
  xAxis: string | null;
  yAxis: string | null;
  leadingFields: { key: string; value: string }[];
  foldFields: { key: string; value: string }[];
  modeDescriptionColumnName: string | null;
  modeDescription: string | null;
  layerStructureColumnName: string | null;
  layerStructureRaw: string | null;
  materialClassColumnName: string | null;
  baseMaterialsColumnName: string | null;
  originColumnName: string | null;
  siblings: DataRow[];
  initialLayers: StructureLayer[];
}>();
defineEmits<{
  "toggle-expand": [];
  remove: [];
  "pin-siblings": [rows: DataRow[]];
  "update-note": [note: string];
  "toggle-description": [];
  "toggle-select": [];
}>();

// Shared with the multi-pin compare export (see annotationCardData.ts) so
// "what counts as Origin/Mode/Structure/Metrics" can't drift between the two.
const cardData = computed(() =>
  buildAnnotationCardData({
    ref: props.note.ref,
    title: props.note.title,
    row: props.note.row,
    note: props.note.note,
    xAxis: props.xAxis,
    yAxis: props.yAxis,
    layerStructureColumnName: props.layerStructureColumnName,
    materialClassColumnName: props.materialClassColumnName,
    baseMaterialsColumnName: props.baseMaterialsColumnName,
    originColumnName: props.originColumnName,
    leadingFields: props.leadingFields,
    foldFields: props.foldFields,
    modeDescription: props.modeDescription,
    layers: props.initialLayers,
    layerStructureRaw: props.layerStructureRaw,
  }),
);

// Origin (EXP/SIM) gets its own bordered box, same treatment as Mode/Layer
// Structure/Metrics/Notes -- it's the first thing worth knowing about a pin
// (is this measured or simulated data?), so it sits above Mode, not as a
// small inline label easy to miss next to the plotted axis values.
const originField = computed(() => cardData.value.origin);

// The plotted X/Y axes render here as compact "label value" badges -- but
// when an axis is Layer Structure itself, its value is the full
// material/thickness string (already rendered below as the layer stack, see
// LayerStack), so showing it again here would just repeat the same data as
// an unreadable wrapped line of text.
const axisBadges = computed(() => cardData.value.axisBadges);

// Material Class and Base Materials describe the same physical structure as
// Layer Structure, so they live in that same card/dialog/export instead of
// mixed in among unrelated numeric measurements.
const structureExtraFields = computed(() => cardData.value.structureExtraFields);

// axisBadges + foldFields -- the plotted X/Y axes plus every other
// measurement not already shown elsewhere on the card. Used for the
// Metrics section's count/preview/zoom-dialog on screen AND for its
// export/PNG, so what a researcher sees before exporting is exactly what
// the PNG contains -- previously the on-screen Metrics box only showed
// foldFields (deliberately excluding the axes, already visible as the
// header badges right above it), while the actual export used this fuller
// list, so opening "Metrics" showed fewer fields than the PNG it exported.
const exportMetricsRows = computed(() => cardData.value.metricsRows);

const downloadLayersPng = () =>
  exportLayerStackPng({ ref: props.note.ref, title: props.note.title }, props.initialLayers, structureExtraFields.value);
const downloadFieldsPng = () => exportFieldListPng({ ref: props.note.ref, title: props.note.title }, exportMetricsRows.value);
const downloadNoteTxt = () => downloadTextFile(props.note.note, `notes_${props.note.ref.replace(/[^a-z0-9_-]+/gi, "_")}.txt`);

// Collapsed preview line under the metrics trigger (same convention as Layer
// Structure's raw-text preview) -- a quick glance without opening the dialog.
const foldFieldsPreview = computed(() => exportMetricsRows.value.map((f) => f.value).join(" · "));

const buildExportSections = (): AnnotationExportSection[] => [
  { title: t("fomcharts.annotations.mode"), rows: props.leadingFields, text: props.modeDescription ?? undefined },
  {
    title: t("fomcharts.annotations.layerStructure"),
    rows: structureExtraFields.value,
    layers: props.initialLayers,
  },
  { title: t("fomcharts.annotations.metrics"), rows: exportMetricsRows.value },
  { title: t("fomcharts.annotations.notes"), text: props.note.note || undefined },
];

const downloadAllPng = () =>
  exportAnnotationPng({ ref: props.note.ref, title: props.note.title }, originField.value, buildExportSections());

/** Guide-only: renders this card's full "Export this pin" PNG without
 * triggering a download, so the guide can show a real example instead of a
 * mockup (see GuideTemplate.vue's export page). */
const getExportDataUrl = (): string | null =>
  renderAnnotationPng({ ref: props.note.ref, title: props.note.title }, originField.value, buildExportSections());

/** Guide-only: renders this card's "Metrics" zoom-dialog PNG without
 * triggering a download -- same source data as downloadFieldsPng (see
 * GuideTemplate.vue's export page). */
const getMetricsExportDataUrl = (): string | null =>
  renderFieldListPng({ ref: props.note.ref, title: props.note.title }, exportMetricsRows.value);

defineExpose({ getExportDataUrl, getMetricsExportDataUrl });
</script>
