<template>
  <TooltipProvider :delay-duration="200">
    <Dialog v-model:open="open">
      <DialogContent class="flex max-h-[92vh] w-[96vw] max-w-350 flex-col overflow-x-hidden overflow-y-auto">
        <DialogTitle>{{ t("fomcharts.compare.title") }}</DialogTitle>
        <DialogDescription>{{ t("fomcharts.compare.description") }}</DialogDescription>

        <div class="mt-1 flex flex-col gap-3.5">
          <div class="flex flex-col gap-1.5">
            <Label for="compare-title" class="text-[11px] text-muted-foreground">{{ t("fomcharts.compare.titleLabel") }}</Label>
            <span class="relative block max-w-md">
              <Input id="compare-title" v-model="titleText" :placeholder="autoTitle" class="pr-7 text-sm" @input="titleIsAuto = false" />
              <button
                v-if="titleText"
                type="button"
                class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
                :aria-label="t('fomcharts.compare.clearTitle')"
                @click="clearTitle"
              >
                <X class="size-3.5" />
              </button>
            </span>
          </div>

          <div class="flex flex-col gap-1.5">
            <span class="text-[11px] text-muted-foreground">{{ t("fomcharts.compare.sectionsLabel") }}</span>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
              <label class="flex items-center gap-1.5 text-xs text-ink select-none">
                <Checkbox v-model="showOrigin" />
                {{ t("fomcharts.compare.origin") }}
              </label>
              <label class="flex items-center gap-1.5 text-xs text-ink select-none">
                <Checkbox v-model="showMode" />
                {{ t("fomcharts.annotations.mode") }}
              </label>
              <label class="flex items-center gap-1.5 text-xs text-ink select-none">
                <Checkbox v-model="showStructure" />
                {{ t("fomcharts.annotations.layerStructure") }}
              </label>
              <label class="flex items-center gap-1.5 text-xs text-ink select-none">
                <Checkbox v-model="showMetrics" />
                {{ t("fomcharts.annotations.metrics") }}
              </label>
              <label class="flex items-center gap-1.5 text-xs text-ink select-none">
                <Checkbox v-model="showNotes" />
                {{ t("fomcharts.annotations.notes") }}
              </label>
            </div>
          </div>

          <!-- Markup toolbar -- tool choice on the left (view / pen / eraser /
               highlight-a-row), a single "clear" action on the right once
               there's anything to clear. Mirrors GraphControls' own
               segmented ghost-button toggle (see its scale Log/Linear
               control) for visual consistency. -->
          <div v-if="plan" class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-secondary/15 bg-secondary/5 px-2.5 py-2">
            <div class="flex flex-wrap items-center gap-2.5">
              <div class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card">
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button type="button" variant="ghost" size="icon-xs" class="rounded-none hover:bg-primary/10" :class="toolBtnClass('none')" :aria-label="t('fomcharts.compare.tools.none')" @click="activeTool = 'none'">
                      <MousePointer2 class="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.compare.tools.none") }}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button type="button" variant="ghost" size="icon-xs" class="rounded-none hover:bg-primary/10" :class="toolBtnClass('pen')" :aria-label="t('fomcharts.compare.tools.pen')" @click="activeTool = 'pen'">
                      <Pen class="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.compare.tools.pen") }}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button type="button" variant="ghost" size="icon-xs" class="rounded-none hover:bg-primary/10" :class="toolBtnClass('eraser')" :aria-label="t('fomcharts.compare.tools.eraser')" @click="activeTool = 'eraser'">
                      <Eraser class="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.compare.tools.eraser") }}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger as-child>
                    <Button type="button" variant="ghost" size="icon-xs" class="rounded-none hover:bg-primary/10" :class="toolBtnClass('highlight')" :aria-label="t('fomcharts.compare.tools.highlightRow')" @click="activeTool = 'highlight'">
                      <Rows3 class="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{{ t("fomcharts.compare.tools.highlightRow") }}</TooltipContent>
                </Tooltip>
              </div>

              <div v-if="activeTool === 'pen'" class="flex items-center gap-1.5">
                <button
                  v-for="c in penColors"
                  :key="c"
                  type="button"
                  class="size-5 rounded-full border-2 transition"
                  :class="penColor === c ? 'border-ink' : 'border-transparent'"
                  :style="{ background: c }"
                  :aria-label="t('fomcharts.compare.tools.penColor')"
                  @click="penColor = c"
                />
              </div>

              <span class="text-[10.5px] text-muted-foreground">{{ toolHint }}</span>
            </div>

            <Button v-if="hasMarkup" variant="link" size="xs" class="h-auto shrink-0 p-0 text-[10.5px]" @click="clearMarkup">
              {{ t("fomcharts.compare.tools.clear") }}
            </Button>
          </div>

          <div class="max-h-[62vh] overflow-auto rounded-md border border-secondary/20 bg-white p-2.5">
            <div v-if="plan" class="relative" :style="{ width: `${plan.width}px`, height: `${plan.height}px` }">
              <canvas ref="contentCanvasEl" class="absolute top-0 left-0 block" :style="{ width: `${plan.width}px`, height: `${plan.height}px` }" />
              <canvas
                ref="inkCanvasEl"
                class="absolute top-0 left-0 block"
                :class="overlayCursorClass"
                :style="{ width: `${plan.width}px`, height: `${plan.height}px`, pointerEvents: activeTool === 'none' ? 'none' : 'auto' }"
                @pointerdown="onPointerDown"
                @pointermove="onPointerMove"
                @pointerup="onPointerUp"
                @pointerleave="onPointerLeave"
                @click="onCanvasClick"
              />
            </div>
            <p v-else class="p-6 text-center text-xs text-muted-foreground">{{ t("fomcharts.compare.empty") }}</p>
          </div>

          <div class="flex justify-end">
            <Button size="sm" :disabled="!plan" class="bg-primary text-primary-foreground hover:bg-primary/90" @click="handleDownload">
              <Download class="size-3.5" />
              {{ t("fomcharts.compare.downloadPng") }}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Download, Eraser, MousePointer2, Pen, Rows3, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import type { AnnotationCardData } from "@/utils/annotationCardData";
import { ensureCanvasFontsLoaded, type AnnotationExportSection } from "@/utils/annotationExport";
import { drawComparePins, planComparePins, type ComparePinData, type ComparePlan, type CompareRowBand } from "@/utils/compareExport";

const { t } = useI18n();

const props = defineProps<{
  pins: AnnotationCardData[];
}>();

const open = defineModel<boolean>("open", { default: false });

const showOrigin = ref(true);
const showMode = ref(true);
const showStructure = ref(true);
const showMetrics = ref(true);
const showNotes = ref(true);
const titleText = ref("");

const comparePins = computed<ComparePinData[]>(() =>
  props.pins.map((d) => {
    const sections: AnnotationExportSection[] = [];
    if (showMode.value && (d.modeRows.length > 0 || d.modeDescription)) {
      sections.push({ title: t("fomcharts.annotations.mode"), rows: d.modeRows, text: d.modeDescription ?? undefined });
    }
    if (showStructure.value && (d.structureExtraFields.length > 0 || d.layers.length > 0)) {
      sections.push({ title: t("fomcharts.annotations.layerStructure"), rows: d.structureExtraFields, layers: d.layers });
    }
    if (showMetrics.value && d.metricsRows.length > 0) {
      sections.push({ title: t("fomcharts.annotations.metrics"), rows: d.metricsRows });
    }
    if (showNotes.value && d.note) {
      sections.push({ title: t("fomcharts.annotations.notes"), text: d.note });
    }
    return { ref: d.ref, title: d.title, origin: showOrigin.value ? d.origin : null, sections };
  }),
);

const hasContent = computed(() => comparePins.value.some((p) => p.origin || p.sections.length > 0));
const hasTitleText = computed(() => titleText.value.trim().length > 0);

// See ensureCanvasFontsLoaded -- forces exactly one re-measure once the
// exact canvas fonts are confirmed loaded, since the very first plan can
// otherwise be measured against fallback-font metrics.
const fontsReadyTick = ref(0);
ensureCanvasFontsLoaded().then(() => {
  fontsReadyTick.value++;
});

const plan = computed<ComparePlan | null>(() => {
  void fontsReadyTick.value;
  return hasContent.value ? planComparePins(comparePins.value, hasTitleText.value) : null;
});

const contentCanvasEl = ref<HTMLCanvasElement | null>(null);
const inkCanvasEl = ref<HTMLCanvasElement | null>(null);
const CANVAS_SCALE = 2;

function renderContent() {
  const canvas = contentCanvasEl.value;
  const p = plan.value;
  if (!canvas || !p) return;
  canvas.width = Math.max(1, Math.round(p.width * CANVAS_SCALE));
  canvas.height = Math.max(1, Math.round(p.height * CANVAS_SCALE));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
  drawComparePins(ctx, comparePins.value, p, titleText.value || null, highlightedKeys.value);
}

// -- Markup: a freehand pen/eraser layer plus a click-to-highlight-a-row
// tool, both living on their own transparent canvas above the content one so
// neither redraws the (more expensive) comparison content itself. Pen/eraser
// strokes are pixel data tied to this exact layout -- kept in a plain
// (non-reactive) array and redrawn imperatively on every pointer move rather
// than routed through Vue's reactivity, since a mutation-per-point would
// otherwise mean either a full reactive deep-clone per frame or silently
// missed updates from mutating a pre-proxy reference. Highlighted rows, by
// contrast, are identified by field key (not pixels) and stay valid across
// re-layouts, so they're a normal reactive Set.
type Tool = "none" | "pen" | "eraser" | "highlight";
const activeTool = ref<Tool>("none");
const penColors = ["#ffca28", "#ff8a65", "#f06292"];
const penColor = ref(penColors[0]);
const PEN_WIDTH = 8;
const ERASER_WIDTH = 20;

interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  erase: boolean;
}
let strokesData: Stroke[] = [];
let activeStroke: Stroke | null = null;
const hasInk = ref(false);
const hoverBand = ref<CompareRowBand | null>(null);
const highlightedKeys = ref<Set<string>>(new Set());
const hasMarkup = computed(() => hasInk.value || highlightedKeys.value.size > 0);

function resizeAndRedrawInk() {
  const canvas = inkCanvasEl.value;
  const p = plan.value;
  if (!canvas || !p) return;
  canvas.width = Math.max(1, Math.round(p.width * CANVAS_SCALE));
  canvas.height = Math.max(1, Math.round(p.height * CANVAS_SCALE));
  redrawInk();
}

function redrawInk() {
  const canvas = inkCanvasEl.value;
  const p = plan.value;
  if (!canvas || !p) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
  ctx.clearRect(0, 0, p.width, p.height);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const stroke of strokesData) {
    if (stroke.points.length === 0) continue;
    ctx.globalCompositeOperation = stroke.erase ? "destination-out" : "source-over";
    ctx.strokeStyle = stroke.color;
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = stroke.erase ? 1 : 0.55;
    ctx.lineWidth = stroke.erase ? ERASER_WIDTH : PEN_WIDTH;
    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(stroke.points[0].x, stroke.points[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (const pt of stroke.points.slice(1)) ctx.lineTo(pt.x, pt.y);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;

  if (activeTool.value === "highlight" && hoverBand.value) {
    ctx.save();
    ctx.strokeStyle = "#0072b2";
    ctx.setLineDash([4, 3]);
    ctx.lineWidth = 1.5;
    ctx.strokeRect(4, hoverBand.value.y - 3, p.width - 8, hoverBand.value.height + 3);
    ctx.restore();
  }
}

function canvasPoint(e: PointerEvent | MouseEvent): { x: number; y: number } {
  const rect = inkCanvasEl.value!.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function bandAt(y: number): CompareRowBand | null {
  const p = plan.value;
  if (!p) return null;
  return p.rowBands.find((b) => y >= b.y - 3 && y <= b.y + b.height + 3) ?? null;
}

function onPointerDown(e: PointerEvent) {
  if (activeTool.value !== "pen" && activeTool.value !== "eraser") return;
  const pt = canvasPoint(e);
  activeStroke = { points: [pt], color: activeTool.value === "eraser" ? "#000000" : penColor.value, erase: activeTool.value === "eraser" };
  strokesData.push(activeStroke);
  hasInk.value = true;
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  redrawInk();
}

function onPointerMove(e: PointerEvent) {
  if (activeTool.value === "highlight") {
    hoverBand.value = bandAt(canvasPoint(e).y);
    redrawInk();
    return;
  }
  if (!activeStroke) return;
  activeStroke.points.push(canvasPoint(e));
  redrawInk();
}

function onPointerUp() {
  activeStroke = null;
}

function onPointerLeave() {
  activeStroke = null;
  if (hoverBand.value) {
    hoverBand.value = null;
    redrawInk();
  }
}

function onCanvasClick(e: MouseEvent) {
  if (activeTool.value !== "highlight") return;
  const band = bandAt(canvasPoint(e).y);
  if (!band) return;
  const next = new Set(highlightedKeys.value);
  if (next.has(band.key)) next.delete(band.key);
  else next.add(band.key);
  highlightedKeys.value = next;
}

function clearMarkup() {
  strokesData = [];
  activeStroke = null;
  hasInk.value = false;
  highlightedKeys.value = new Set();
  redrawInk();
}

const toolBtnClass = (tool: Tool) =>
  activeTool.value === tool ? "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground" : "text-secondary";

const overlayCursorClass = computed(() => {
  if (activeTool.value === "pen" || activeTool.value === "eraser") return "cursor-crosshair";
  if (activeTool.value === "highlight") return "cursor-pointer";
  return "";
});

const toolHint = computed(() => {
  switch (activeTool.value) {
    case "pen":
      return t("fomcharts.compare.tools.penHint");
    case "eraser":
      return t("fomcharts.compare.tools.eraserHint");
    case "highlight":
      return t("fomcharts.compare.tools.highlightRowHint");
    default:
      return "";
  }
});

// -- Title auto-fill: same logic as GraphControls' chart title (see
// VisualizationView's autoChartTitle/chartTitleIsAuto) -- the field starts
// pre-filled with a real, editable auto-generated title (not just a grey
// placeholder) built from the compared refs, stays in sync if the selection
// changes, and stops the moment the user types or explicitly clears it.
const titleIsAuto = ref(true);
const autoTitle = computed(() =>
  props.pins.length > 0 ? t("fomcharts.compare.titleAuto", { refs: props.pins.map((p) => p.ref).join(", ") }) : t("fomcharts.compare.titlePlaceholder"),
);

watch(
  () => props.pins,
  () => {
    if (titleIsAuto.value) titleText.value = autoTitle.value;
  },
);

const clearTitle = () => {
  titleText.value = "";
  titleIsAuto.value = false;
};

// A fresh compare session each time the dialog reopens -- otherwise ink/row
// highlights from a previous, unrelated comparison would still be sitting on
// the canvas the next time it's opened.
watch(open, (isOpen) => {
  if (!isOpen) return;
  titleIsAuto.value = true;
  titleText.value = autoTitle.value;
  highlightedKeys.value = new Set();
  activeTool.value = "none";
  strokesData = [];
  activeStroke = null;
  hasInk.value = false;
  nextTick(resizeAndRedrawInk);
});

// Pen/eraser strokes are pixel-tied to this exact layout -- if the content's
// size changes (a section toggled, more/fewer rows), keep the existing
// strokes from silently landing over the wrong row; start that layer over
// instead. Row highlights aren't pixel-based (see above) so they survive.
let lastPlanSize = "";
watch(
  plan,
  (p) => {
    const size = p ? `${p.width}x${p.height}` : "";
    if (size !== lastPlanSize) {
      lastPlanSize = size;
      strokesData = [];
      activeStroke = null;
      hasInk.value = false;
    }
    nextTick(() => {
      renderContent();
      resizeAndRedrawInk();
    });
  },
  { immediate: true },
);

watch([titleText, highlightedKeys], () => nextTick(renderContent));

const handleDownload = () => {
  const content = contentCanvasEl.value;
  const ink = inkCanvasEl.value;
  if (!content || !plan.value) return;
  const out = document.createElement("canvas");
  out.width = content.width;
  out.height = content.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(content, 0, 0);
  if (ink) ctx.drawImage(ink, 0, 0);
  const url = out.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  const refs = props.pins.map((p) => p.ref.replace(/[^a-z0-9_-]+/gi, "_")).join("_");
  a.download = `compare_${refs}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
</script>
