<template>
  <div class="flex min-h-0 w-full flex-col">
    <div class="flex shrink-0 flex-col gap-1.5 mb-2 px-4">
      <div class="flex justify-between items-center gap-3">
        <h2 class="text-lg font-semibold text-ink shrink-0">
          {{ t("fomcharts.type.scatter") }}
        </h2>
        <TooltipProvider :delay-duration="200">
          <div ref="badgesRowRef" class="flex flex-col items-end gap-1.5">
            <!-- Only the two badges worth a glance at any zoom level share the
            title's own line -- everything else (trend stats, origin counts)
            is secondary context and moves to the row below so this row never
            wraps against the title. -->
            <div class="flex items-center gap-1.5">
              <span
                v-if="needsReviewCount > 0"
                class="flex items-center gap-1 bg-amber-500/15 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
              >
                {{ t("fomcharts.reviewWarning", { count: needsReviewCount }) }}
                <InfoTooltip
                  v-if="hasFlaggedPoints"
                  :text="t('fomcharts.flaggedHint')"
                  icon-class="text-amber-800/70 hover:text-amber-800"
                />
              </span>
              <InfoTooltip v-else-if="hasFlaggedPoints" :text="t('fomcharts.flaggedHint')" />
              <span
                v-if="manualCount > 0"
                class="flex items-center gap-1 bg-amber-500/10 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
              >
                <Diamond class="size-2.5 fill-current" />
                {{ t("fomcharts.manualCount", { count: manualCount }) }}
                <InfoTooltip :text="t('fomcharts.manualHint')" icon-class="text-amber-800/70 hover:text-amber-800" />
              </span>
              <span
                class="bg-primary/10 text-primary text-xs font-medium px-2.5 py-0.5 rounded whitespace-nowrap"
              >
                {{ sampleCount }} {{ t("fomcharts.sampleCount") }}
              </span>
            </div>
            <div
              v-if="trendFit || trendUnavailable || originSummary"
              class="flex items-center flex-wrap justify-end gap-1.5"
            >
              <span
                v-if="trendFit"
                class="flex items-center gap-1 bg-secondary/10 text-secondary text-xs font-medium px-2.5 py-0.5 rounded whitespace-nowrap"
              >
                {{ t(`fomcharts.trendType.${trendFit.type}`) }} · R² {{ formatStat(trendFit.r2) }}
              </span>
              <span
                v-if="trendUnavailable"
                class="flex items-center gap-1 bg-amber-500/15 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
              >
                {{ t("fomcharts.controls.trendUnavailable") }}
                <InfoTooltip :text="t('fomcharts.tooltips.trendUnavailable')" icon-class="text-amber-800/70 hover:text-amber-800" />
              </span>
              <span
                v-if="originSummary"
                class="bg-secondary/10 text-secondary text-xs font-medium px-2.5 py-0.5 rounded whitespace-nowrap"
              >
                {{ originSummary }}
              </span>
            </div>
          </div>
        </TooltipProvider>
      </div>
    </div>

    <div
      class="relative w-full rounded-2xl border border-secondary/10 bg-card/90 p-4 shadow-xl shadow-slate-900/5 backdrop-blur-sm"
      :class="fillHeight ? 'min-h-80 flex-1' : 'h-125'"
    >
      <!-- Replaces the chart's old canvas-drawn "save as image" toolbox icon,
           which was a redundant second way to do what the workspace's own
           Export menu already does. -->
      <div class="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-md border border-secondary/15 bg-card/95 p-0.5 shadow-sm">
        <button
          type="button"
          class="rounded p-1 transition"
          :class="zoomLocked ? 'text-primary hover:bg-primary/10' : 'text-secondary hover:bg-secondary/10 hover:text-ink'"
          :aria-label="t(zoomLocked ? 'fomcharts.zoom.unlock' : 'fomcharts.zoom.lock')"
          :aria-pressed="zoomLocked"
          @click="zoomLocked = !zoomLocked"
        >
          <Lock v-if="zoomLocked" class="size-3.5" />
          <Unlock v-else class="size-3.5" />
        </button>
        <div class="mx-0.5 h-4 w-px bg-secondary/15" />
        <button
          type="button"
          class="rounded p-1 text-secondary transition hover:bg-secondary/10 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          :aria-label="t('fomcharts.zoom.zoomOut')"
          :disabled="zoomLocked"
          @click="zoomOut"
        >
          <ZoomOut class="size-3.5" />
        </button>
        <button
          type="button"
          class="rounded p-1 text-secondary transition hover:bg-secondary/10 hover:text-ink disabled:pointer-events-none disabled:opacity-40"
          :aria-label="t('fomcharts.zoom.zoomIn')"
          :disabled="zoomLocked"
          @click="zoomIn"
        >
          <ZoomIn class="size-3.5" />
        </button>
        <div class="mx-0.5 h-4 w-px bg-secondary/15" />
        <button
          type="button"
          class="rounded p-1 text-secondary transition hover:bg-secondary/10 hover:text-ink"
          :aria-label="t('fomcharts.zoom.reset')"
          @click="resetZoom"
        >
          <RotateCcw class="size-3.5" />
        </button>
      </div>
      <v-chart
        ref="chartRef"
        class="chart"
        :option="chartOption"
        autoresize
        @click="handleChartClick"
        @contextmenu="handleChartContextMenu"
      />

      <!-- Right-click on a point offers the same full set of actions as its
           DataPointsTable row menu -- see handleChartContextMenu. Closes on
           outside click, Escape, or picking an action. Position is clamped
           on-screen by useClampedMenuPosition (see menuRef/menuStyle) since
           it's placed at the raw click point, which can otherwise render
           partially off-screen near a viewport edge. Teleported to <body> --
           this component sits inside the workspace Card's backdrop-blur,
           which (like any filter/backdrop-filter/transform ancestor) makes
           `position: fixed` descendants relative to ITS box instead of the
           viewport, silently breaking clientX/clientY-based positioning. -->
      <Teleport to="body">
        <div
          v-if="contextMenuTarget"
          class="fixed inset-0 z-40"
          @click="contextMenuTarget = null"
          @contextmenu.prevent="contextMenuTarget = null"
        />
        <div v-if="contextMenuTarget" ref="menuRef" class="fixed z-50 min-w-36 rounded-md border border-secondary/15 bg-popover p-1 shadow-lg" :style="menuStyle">
          <button type="button" class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10" @click="confirmContextMenuEdit">
            <Pencil class="size-3 text-muted-foreground" />
            {{ t("fomcharts.pointsTable.edit") }}
          </button>
          <button
            v-if="isEditedRow(contextMenuTarget.row)"
            type="button"
            class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
            @click="confirmContextMenuReset"
          >
            <RotateCcw class="size-3 text-muted-foreground" />
            {{ t("fomcharts.pointsTable.resetPoint") }}
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] hover:bg-secondary/10"
            :class="isPinnedRow(contextMenuTarget.row) ? 'bg-amber-50 text-amber-700' : 'text-ink'"
            @click="confirmContextMenuTogglePin"
          >
            <Pin class="size-3" :class="isPinnedRow(contextMenuTarget.row) ? 'fill-amber-600 text-amber-600' : 'text-muted-foreground'" />
            {{ isPinnedRow(contextMenuTarget.row) ? t("fomcharts.pointsTable.unpin") : t("fomcharts.pointsTable.pin") }}
          </button>

          <div class="my-0.5 h-px bg-secondary/10" />

          <div v-if="isPinnedRow(contextMenuTarget.row)" class="mb-0.5 flex items-start gap-1 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800">
            <TriangleAlert class="mt-0.5 size-3 shrink-0" />
            <span>{{ t("fomcharts.pointsTable.pinGuardHint") }}</span>
          </div>

          <button
            type="button"
            class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink transition hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="isPinnedRow(contextMenuTarget.row)"
            @click="confirmContextMenuHide"
          >
            <EyeOff class="size-3 text-muted-foreground" />
            {{ t("fomcharts.pointsTable.hide") }}
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            :disabled="isPinnedRow(contextMenuTarget.row)"
            @click="confirmContextMenuDelete"
          >
            <Trash2 class="size-3" />
            {{ t("fomcharts.pointsTable.deletePermanently") }}
          </button>
        </div>
      </Teleport>

      <!-- Active Benchmarking: a brief expanding ring around a point right
           after "Add data" saves it -- confirms where it landed without
           relying on the researcher to spot a new diamond among dozens of
           existing points. See the pulseTargetRef watcher below. -->
      <div
        v-if="pulseRing"
        class="pointer-events-none absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-manual-pulse"
        :style="{ left: `${pulseRing.left}px`, top: `${pulseRing.top}px`, borderColor: manualPointBorderColor }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from "vue";
import { use, registerTheme, getInstanceByDom } from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import { ScatterChart, LineChart } from "echarts/charts";
import {
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
} from "echarts/components";
import labTheme from "@/assets/themes/okabe-ito-palette.json";
import VChart, { THEME_KEY } from "vue-echarts";
import { ZoomIn, ZoomOut, RotateCcw, Lock, Unlock, Diamond, Trash2, EyeOff, Pencil, Pin, TriangleAlert } from "@lucide/vue";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import { useClampedMenuPosition } from "@/composables/useClampedMenuPosition";
import {
  findOriginColumn,
  findReviewStatusColumn,
  findTooltipExtraColumns,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findModeIdColumn,
  findModeDescriptionColumn,
  isNeedsReviewRow,
  isManualRow,
  isEditedRow,
  pointShape,
  keptTokens,
  formatUnitSuperscripts,
  type DataRow,
} from "@/utils/columnTypes";

// Custom ECharts symbol path (5-point star, arbitrary coordinate space --
// ECharts fits it to symbolSize like any other custom symbol) -- "star" has
// no built-in ECharts symbol name, unlike "circle"/"diamond".
const STAR_SYMBOL_PATH =
  "path://M12 2l2.9 6.9 7.1.6-5.4 4.6 1.7 7-6.3-4-6.3 4 1.7-7L1 9.5l7.1-.6z";
import { computeStats, filterPlottable, fitTrend, sampleTrendCurve, formatStat, computeParetoFrontier, type TrendType } from "@/utils/stats";

use([
  CanvasRenderer,
  ScatterChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  GridComponent,
  LegendComponent,
  DataZoomComponent,
  MarkLineComponent,
]);

registerTheme("Okabe-Ito-palette", labTheme.theme);
provide(THEME_KEY, "Okabe-Ito-palette");

const { t } = useI18n();

// yAxis/xAxis/yAxisScale are selected upstream (GraphControls, via
// VisualizationView) and simply passed down — this component only draws.
const props = withDefaults(
  defineProps<{
    chartData: DataRow[];
    columns: string[];
    yAxis?: string | null;
    xAxis?: string | null;
    groupBy?: string | null;
    yAxisScale?: "log" | "value";
    chartTitle?: string;
    showMedian?: boolean;
    showTrend?: boolean;
    trendType?: TrendType | "auto";
    showLegend?: boolean;
    showPareto?: boolean;
    xAxisNumeric?: boolean;
    yAxisNumeric?: boolean;
    // "Taille des points" (GraphControls' Display section). byValue sizes
    // each point off pointSizeBy's value between a floor and pointSize
    // itself (see bubbleSizeFor); constant draws every point at pointSize
    // flat, ignoring pointSizeBy entirely.
    pointSizeMode?: "constant" | "byValue";
    pointSizeBy?: string | null;
    pointSize?: number;
    // Isolating a group is now driven externally (clicking a card in
    // StatsSummaryPanel) -- this component only reads it to dim the rest.
    highlightGroup?: string | null;
    // Fixed label -> color assignment computed by VisualizationView off the
    // full unfiltered dataset (see utils/palette.ts) -- used instead of a
    // locally-computed index so a group's color never shifts just because a
    // filter temporarily hid some of its rows.
    groupColorMap?: Record<string, string>;
    // The filter chip selection governing groupBy's tokens (Material Class
    // or Base Materials), or null when groupBy isn't a composite column --
    // see VisualizationView's groupBySelectedTokens. Used via keptTokens so
    // a row the lenient composite filter kept alive through one token never
    // re-adds an excluded token as its own group here.
    groupBySelectedTokens?: string[] | null;
    // Renders a row with several kept tokens as a single merged marker
    // instead of one duplicate point per token -- see
    // isGroupingByCompositeColumn and the series-building loop below.
    mergeMultiCategoryPoints?: boolean;
    // The rows currently pinned as annotations (VisualizationView's
    // `annotations`) -- a pinned point's on-chart ref label stays visible
    // even outside hover/isolation, see withItemStyle's showLabel and
    // isPinnedRow (matched by column values, not object identity -- see its
    // own comment for why).
    pinnedRows?: DataRow[];
    // "Inclure mes points ajoutés dans les statistiques" (Active
    // Benchmarking) -- when false, manually added rows (see
    // utils/columnTypes.ts's isManualRow) are still drawn on the chart (own
    // diamond marker, own series membership) but excluded from every
    // derived overlay: median line, trend fit, Pareto frontier, and the
    // sample-count/origin-breakdown/needs-review badges. See highlightedRows.
    includeCustomInStats?: boolean;
    // A manually added row's Ref, set by VisualizationView right after the
    // "Add data" dialog saves it -- triggers a one-off pulse ring around
    // that exact point so its arrival on the chart isn't silent (see the
    // pulseTargetRef watcher below). Cleared back to null by the caller once
    // consumed; a repeat of the *same* ref (re-adding after removing) still
    // re-triggers because VisualizationView always clears it in between.
    pulseTargetRef?: string | null;
    // The row currently hovered in the DataPointsTable panel (VisualizationView's
    // hoveredRow), or null -- previews which point a click there would hide/
    // remove (see isHoveredRow / withItemStyle's ring). Purely a transient
    // preview, unlike isPinned/isManual which persist.
    hoveredRow?: DataRow | null;
    // A currently-hidden row being hovered in the panel's "N masqué(s)"
    // disclosure (VisualizationView's previewRow) -- not part of chartData at
    // all (hidden rows are filtered out upstream), so it's drawn as one
    // extra, faint, dashed-preview point rather than styled through the
    // normal series loop -- see previewPoint/seriesList.
    previewRow?: DataRow | null;
    // The live workspace (VisualizationView) sits the chart inside a flex
    // column with a definite height and wants the plot itself to stretch to
    // fill whatever's left after the title/badges row, rather than sit at a
    // fixed height regardless of viewport size. GuideTemplate's offscreen
    // renders (PDF export, PNG generation) mount this component inside
    // plain, non-flex, fixed-width wrappers with no height of their own to
    // fill -- those need the old fixed height so their hardcoded crop/scale
    // math (see GuideTemplate's guide-callout-region) keeps lining up.
    fillHeight?: boolean;
  }>(),
  {
    yAxis: null,
    xAxis: null,
    groupBy: null,
    yAxisScale: "log",
    chartTitle: "",
    showMedian: false,
    showTrend: false,
    trendType: "auto",
    showLegend: false,
    showPareto: false,
    xAxisNumeric: false,
    yAxisNumeric: true,
    pointSizeMode: "constant",
    pointSizeBy: null,
    pointSize: 16,
    highlightGroup: null,
    groupColorMap: () => ({}),
    groupBySelectedTokens: null,
    mergeMultiCategoryPoints: false,
    pinnedRows: () => [],
    includeCustomInStats: true,
    pulseTargetRef: null,
    hoveredRow: null,
    previewRow: null,
    fillHeight: false,
  },
);

const emit = defineEmits<{
  "point-click": [
    point: {
      ref: string;
      xLabel: string;
      xValue: unknown;
      yLabel: string;
      yValue: unknown;
      extras: Record<string, unknown>;
      row: DataRow;
    },
  ];
  // Right-click on a point opens a menu with the same actions as
  // DataPointsTable's row menu (see contextMenuTarget/handleChartContextMenu).
  // Hide is always reversible, for a manually added point or a literature
  // one alike (see hiddenRows in VisualizationView).
  "point-context-hide": [row: DataRow];
  // Permanently deletes -- for any row now, not just manual ones (see
  // VisualizationView's removeDataRow), gated behind a confirm() first
  // since there's no undo for a literature row.
  "point-context-delete": [row: DataRow];
  "point-context-edit": [row: DataRow];
  "point-context-reset": [row: DataRow];
  "point-context-pin": [row: DataRow];
  "point-context-unpin": [row: DataRow];
}>();

const chartRef = ref<InstanceType<typeof VChart> | null>(null);
const badgesRowRef = ref<HTMLElement | null>(null);

const displayTitle = computed(() => props.chartTitle.trim());

const MAX_AXIS_LABEL_LENGTH = 24;

const palette: string[] = labTheme.theme.color;
const medianLineColor: string = labTheme.theme._custom.accentColor;
const legendColor: string = labTheme.theme._custom.legendColor;
// Kept visually distinct from the median line's accent orange so the two
// dashed overlays never read as the same indicator.
const trendLineColor: string = legendColor;
// Manually added points (Active Benchmarking) always draw as a diamond with
// this gold outline, whatever fill color their group/series assigns them --
// a consistent "this one isn't from a document" cue independent of the
// current Origin/Material grouping, see buildPoint's isManual / withItemStyle.
const manualPointBorderColor = "#C9A227";
// Same blue as the app's own --primary (see style.css) -- reused here so the
// DataPointsTable hover-preview ring reads as "the same UI system", not an
// unrelated ad-hoc color.
const hoverRingColor = "#0072B2";

// Tooltip content is built as an HTML string for echarts (it renders via
// innerHTML), and every interpolated value below can originate from a
// cell in the researcher's uploaded spreadsheet — escape it so a stray
// "<" or a crafted cell value can't inject markup into the tooltip.
const escapeHtml = (value: unknown): string => {
  const str = String(value ?? "");
  return str.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      default:
        return "&#39;";
    }
  });
};

// byValue mode's floor as a fraction of pointSize (the slider value, read
// as the MAX size in this mode) -- 0.375 matches the fixed 6/16 ratio this
// used before the size became user-adjustable, so the default slider
// position (16) reproduces the exact same look as before.
const POINT_SIZE_FLOOR_RATIO = 0.375;

const pointSizeRange = computed(() => {
  const col = props.pointSizeBy;
  if (!col || props.pointSizeMode !== "byValue") return null;
  const values = plottableData.value
    .map((r) => Number(r[col]))
    .filter((v) => !isNaN(v));
  if (values.length === 0) return null;
  return { min: Math.min(...values), max: Math.max(...values) };
});

const bubbleSizeFor = (value: number): number => {
  if (props.pointSizeMode === "constant") return props.pointSize;
  const range = pointSizeRange.value;
  if (range === null || isNaN(value)) return props.pointSize;
  const floor = Math.max(3, props.pointSize * POINT_SIZE_FLOOR_RATIO);
  if (range.max === range.min) return (floor + props.pointSize) / 2;
  const t = (value - range.min) / (range.max - range.min);
  return floor + t * (props.pointSize - floor);
};

// Feeds the on-canvas legend entry explaining what point size encodes (see
// sizeLegendNames/chartOption's third legend row below) -- "bigger = higher
// {column}" instead of an unexplained visual quirk. Only shown in byValue
// mode; a constant size needs no legend, it's self-evident on the chart.
const pointSizeLegend = computed(() => {
  if (props.pointSizeMode !== "byValue" || !props.pointSizeBy) return null;
  const range = pointSizeRange.value;
  if (!range) return null;
  return {
    column: formatUnitSuperscripts(props.pointSizeBy),
    min: formatStat(range.min),
    max: formatStat(range.max),
  };
});

// A currently-hidden row hovered in the panel's "N masqué(s)" disclosure
// (see previewRow prop) -- computes its coordinate the same way buildPoint
// does for a normal point, but this row was already filtered out of
// chartData upstream, so it needs its own value here rather than reusing
// plottableData. Returns null when the row can't actually be placed (a
// blank/non-numeric axis value) -- same rule filterPlottable applies to
// everything else, just inlined since there's only ever at most one of
// these at a time.
const previewPoint = computed(() => {
  const row = props.previewRow;
  if (!row || !props.xAxis || !props.yAxis) return null;
  const rawX = row[props.xAxis];
  const rawY = row[props.yAxis];
  if (props.xAxisNumeric && (rawX === null || rawX === undefined || rawX === "" || isNaN(Number(rawX)))) return null;
  if (props.yAxisNumeric && (rawY === null || rawY === undefined || rawY === "" || isNaN(Number(rawY)))) return null;
  const rawSizeValue = props.pointSizeBy ? Number(row[props.pointSizeBy]) : NaN;
  return {
    value: [
      props.xAxisNumeric ? Number(rawX) : (rawX ?? t("fomcharts.unknownGroup")),
      props.yAxisNumeric ? Number(rawY) : (rawY ?? t("fomcharts.unknownGroup")),
    ],
    refLabel: row.ref ?? row.Ref,
    title: row.title ?? row.Title,
    symbolSize: bubbleSizeFor(rawSizeValue),
  };
});

// Rows with a missing/blank Y value must be dropped, not plotted — a naive
// Number(item[yAxis]) coerces null/"" to 0, which would silently draw a
// fake data point at y=0 for every record whose FOM value wasn't reported
// (e.g. a row correctly left blank because its FOM is frequency-domain).
// requireNumeric is off when Y is a categorical column -- there, a
// non-numeric string is the expected value, not bad data (see
// filterPlottable in utils/stats.ts). When the X axis is itself numeric (as
// opposed to a category label), the same blank-drop rule applies there too,
// or a blank X would plot at x=0; a blank *categorical* X instead survives
// as the "Inconnu" bucket (see buildPoint below), which blank Y never gets.
const plottableData = computed(() => {
  const yFiltered = filterPlottable(props.chartData, props.yAxis, props.yAxisNumeric);
  return props.xAxisNumeric ? filterPlottable(yFiltered, props.xAxis) : yFiltered;
});

// True only when hoveredRow actually corresponds to a point really on the
// chart -- as opposed to hovering a *hidden* row's entry in the panel's
// disclosure, which sets hoveredRow too (see VisualizationView) but has no
// real point here to dim around, only the separate, already-faint ghost
// preview (see previewPoint). Dimming every other point AND showing an
// already-low-opacity ghost at the same time would wash the whole chart out
// with nothing left to clearly stand out.
const hasVisibleHoveredMatch = computed(() => props.hoveredRow !== null && plottableData.value.some((item) => isHoveredRow(item)));

// Reflects the highlighted subset (when a group is isolated) rather than
// the full plotted dataset -- same reasoning as highlightedRows below: a
// badge reading "13 samples" next to a median computed from 5 would be its
// own inconsistency.
const sampleCount = computed(() => highlightedRows.value.length);

const originColumn = computed(() => findOriginColumn(props.columns));
const reviewStatusColumn = computed(() => findReviewStatusColumn(props.columns));
const materialClassColumn = computed(() => findMaterialClassColumn(props.columns));
const baseMaterialsColumn = computed(() => findBaseMaterialsColumn(props.columns));
const modeIdColumn = computed(() => findModeIdColumn(props.columns));
const modeDescriptionColumn = computed(() => findModeDescriptionColumn(props.columns));
// Extra tooltip fields shouldn't repeat whatever's already on an axis/
// group-by — e.g. picking Origin as "Group / Color by" already shows it
// via the legend and the group line below, no need to print it twice.
const extraTooltipColumns = computed(() =>
  findTooltipExtraColumns(props.columns).filter(
    (col) => col !== props.xAxis && col !== props.yAxis && col !== props.groupBy,
  ),
);

// "EXP: 8 · SIM: 14" next to the sample-count badge — the Origin
// breakdown the Phase 1 evaluation plan asks researchers be able to see
// at a glance, independent of whichever axis/group-by is selected.
const originSummary = computed(() => {
  const column = originColumn.value;
  if (!column) return null;
  const counts: Record<string, number> = {};
  for (const item of highlightedRows.value) {
    const v: unknown = item[column];
    if (v === null || v === undefined || v === "") continue;
    const key = String(v);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  const entries = Object.entries(counts);
  return entries.length > 0
    ? entries.map(([key, count]) => `${key}: ${count}`).join(" · ")
    : null;
});

const isEditStatus = (item: DataRow): boolean => isNeedsReviewRow(item, reviewStatusColumn.value);

// Content-based, not reference-based: ECharts' click round-trip (see
// VisualizationView's chartDisplayData comment on the same issue for
// `showOnlyAnnotated`) doesn't guarantee the row VisualizationView captured
// into an annotation (`params.data.row`) stays the exact same object as the
// row reaching buildPoint here on a later render -- a Set-based identity
// lookup silently never matches, which is why a pinned point's label wasn't
// sticking. Column-value comparison is what the rest of the annotations
// feature already relies on for "is this the same row" (rowsEqual).
const isPinnedRow = (item: DataRow): boolean =>
  props.pinnedRows.some((p) => p === item || props.columns.every((col) => p[col] === item[col]));

// Same content-based matching as isPinnedRow -- DataPointsTable's rows are
// the same objects in practice, but never assume identity survives a prop
// hand-off (see isPinnedRow's own comment for why that bit before).
const isHoveredRow = (item: DataRow): boolean => {
  const h = props.hoveredRow;
  if (!h) return false;
  return h === item || props.columns.every((col) => h[col] === item[col]);
};

// "3 to review" next to the sample-count badge -- Review status: Edit means
// a value (usually FWHM) was calculated or estimated rather than read
// directly from the paper, so it's worth a researcher's attention before
// the record is trusted at face value.
const needsReviewCount = computed(() => highlightedRows.value.filter(isEditStatus).length);

// A "Review status: Edit" flag puts a dashed outline on a point (see
// withItemStyle) -- a data-quality signal worth a researcher's attention
// next to the sample count.
const hasFlaggedPoints = computed(() => needsReviewCount.value > 0);

// "2 ajoutés manuellement" badge -- counted off plottableData (everything
// currently drawn), independent of includeCustomInStats, so the badge stays
// accurate even while the toggle hides these rows from the stats overlays.
const manualCount = computed(() => plottableData.value.filter(isManualRow).length);

// Grouping by a composite column (Material Class or Base Materials) is a
// special case: a composite cell like "Dielectric;Metal" should not become
// its own third bucket distinct from "Dielectric" and "Metal" — it should
// count toward *both* of those groups (the same point plotted twice, once
// per token) so the groups stay legible and match the corresponding filter
// chips exactly.
const isGroupingByCompositeColumn = computed(
  () =>
    !!props.groupBy &&
    (props.groupBy === materialClassColumn.value || props.groupBy === baseMaterialsColumn.value),
);

// A row's tokens for the composite groupBy column, restricted to the ones
// still checked in the corresponding filter (see keptTokens and
// VisualizationView's groupBySelectedTokens) -- so a row the lenient
// composite-filter mode kept alive through one token never re-adds an
// excluded token as its own group here. Falls back to the shared "unknown"
// bucket when there's nothing left, same as the non-composite branch below.
const compositeGroupTokens = (item: DataRow): string[] => {
  const tokens = keptTokens(item[props.groupBy as string], props.groupBySelectedTokens);
  return tokens.length === 0 ? [t("fomcharts.unknownGroup")] : tokens;
};

// Single source of truth for "does this row belong to this group" — used
// both to build each series' data (below) and to decide which rows feed
// the median/trend/Pareto overlays (see highlightedRows). Having two
// separate copies of this logic is exactly how the median line drifted out
// of sync with the highlighted group: the series filter respected
// highlightGroup's *dimming*, but the overlays kept reading unfiltered
// plottableData.
const matchesGroup = (item: DataRow, groupName: string): boolean => {
  if (!props.groupBy) return false;
  if (isGroupingByCompositeColumn.value) {
    return compositeGroupTokens(item).includes(groupName);
  }
  const v = item[props.groupBy as string];
  const normalized = v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
  return normalized === groupName;
};

// When a group is isolated (clicking its card in StatsSummaryPanel), every
// stat/overlay derived from "the plotted points" -- median line, trend
// line, Pareto frontier -- must read from that group's rows only, or they
// silently keep describing the whole dataset while the chart visually
// dims everything else, which is exactly the "median always says 42"
// inconsistency this fixes.
// "Inclure mes points ajoutés dans les statistiques" (see the
// includeCustomInStats prop doc) -- everything downstream of
// highlightedRows (median, trend, Pareto, sample count, origin breakdown,
// needs-review count) reads through this one gate, so toggling it off makes
// manually added points invisible to every stat/overlay at once while they
// keep drawing normally in seriesList below (which reads plottableData
// directly, not this).
const statsEligibleRows = computed(() =>
  props.includeCustomInStats ? plottableData.value : plottableData.value.filter((item) => !isManualRow(item)),
);
const highlightedRows = computed(() =>
  props.highlightGroup !== null && props.groupBy
    ? statsEligibleRows.value.filter((item) => matchesGroup(item, props.highlightGroup as string))
    : statsEligibleRows.value,
);

const yValues = computed(() =>
  props.yAxis
    ? highlightedRows.value.map((item) => Number(item[props.yAxis as string])).filter((v) => !isNaN(v))
    : [],
);
const medianValue = computed(() => computeStats(yValues.value).median);

// Computed once here and reused by both the series builder and the
// trendUnavailable badge below -- fitTrend silently returns null when
// there are fewer than 2 points, when every point shares the same X value
// (isolating a single-row group is the common way to hit this), or when
// the chosen model's domain constraints aren't met (e.g. logarithmic/power
// need x > 0, exponential/power need y > 0) -- so "Trend line" can be
// toggled on with nothing to show for it; the badge makes that visible
// instead of a silent no-op. With trendType "auto", fitTrend tries every
// model the data supports and keeps the one with the best R^2, rather than
// always forcing a straight line onto data that's actually curved.
const trendFit = computed(() => {
  if (!(props.showTrend && props.xAxisNumeric && props.yAxisNumeric && props.xAxis && props.yAxis)) return null;
  const points = highlightedRows.value
    .map((item): [number, number] => [Number(item[props.xAxis as string]), Number(item[props.yAxis as string])])
    .filter(([x, y]) => !isNaN(x) && !isNaN(y));
  return fitTrend(points, props.trendType);
});
const trendUnavailable = computed(
  () =>
    props.showTrend &&
    props.xAxisNumeric &&
    props.yAxisNumeric &&
    !!props.xAxis &&
    !!props.yAxis &&
    trendFit.value === null,
);

// When groupBy is set, every distinct value becomes its own series so
// echarts can color and legend them independently — the "categorical
// grouping" the plotting module needs (e.g. color points by Origin/
// Material Class) as opposed to xAxis, which only controls position.
const groupValues = computed(() => {
  if (!props.groupBy) return null;
  const values = new Set<string>();
  for (const row of plottableData.value) {
    if (isGroupingByCompositeColumn.value) {
      compositeGroupTokens(row).forEach((tok) => values.add(tok));
    } else {
      const v = row[props.groupBy as string];
      values.add(v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v));
    }
  }
  return Array.from(values).sort();
});

// How many rows belong to each group -- ranks groupNamesByCount below (most
// prominent groups first, so they land on the on-chart legend's first
// wrapped line instead of an arbitrary alphabetical one) -- same counting
// rule as the composite-token/blank-fallback logic groupValues itself uses
// just above, just tallied instead of merely collected.
const groupCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {};
  if (!props.groupBy || !groupValues.value) return counts;
  for (const row of plottableData.value) {
    if (isGroupingByCompositeColumn.value) {
      compositeGroupTokens(row).forEach((tok) => {
        counts[tok] = (counts[tok] ?? 0) + 1;
      });
    } else {
      const v: unknown = row[props.groupBy as string];
      const name = v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
      counts[name] = (counts[name] ?? 0) + 1;
    }
  }
  return counts;
});

// groupValues sorted by prominence (most rows first, alphabetical tiebreak)
// rather than the plain alphabetical order groupValues itself keeps for
// series construction -- feeds groupLegendNames below, and only affects
// which wrapped line of the on-chart legend a group lands on (see
// chartOption's legend[0]), never which groups actually plot.
const groupNamesByCount = computed(() => {
  if (!props.groupBy || !groupValues.value) return [];
  return [...groupValues.value].sort(
    (a, b) => (groupCounts.value[b] ?? 0) - (groupCounts.value[a] ?? 0) || a.localeCompare(b),
  );
});

// Hidden by default -- with every dot labeled at once the chart reads as a
// wall of overlapping ref numbers. A label only earns its place when a point
// is actually the one being looked at: hovering it (series-level `emphasis`
// below), isolating its group, or pinning it (see withItemStyle's showLabel,
// which sets each point's own `label.show`).
const pointLabel = {
  show: false,
  position: "top",
  formatter: (params: any) => params.data.refLabel,
  fontSize: 10,
  color: legendColor,
};
const pointLabelEmphasis = { label: { show: true } };

const buildPoint = (item: DataRow) => {
  const extras: Record<string, unknown> = {};
  for (const col of extraTooltipColumns.value) {
    const v = item[col];
    if (v !== null && v !== undefined && v !== "") extras[col] = v;
  }
  const needsReview = isEditStatus(item);
  const rawX = props.xAxis ? item[props.xAxis] : undefined;
  const rawY = props.yAxis ? item[props.yAxis] : undefined;
  const rawSizeValue = props.pointSizeBy ? Number(item[props.pointSizeBy]) : NaN;
  // Already shown via the axis/group-by line below when Mode ID happens to
  // be picked as one of those -- no need to print it twice.
  const modeId =
    modeIdColumn.value && modeIdColumn.value !== props.xAxis && modeIdColumn.value !== props.groupBy
      ? item[modeIdColumn.value]
      : null;
  const modeDescription = modeDescriptionColumn.value ? item[modeDescriptionColumn.value] : null;
  const modeCase = [modeId, modeDescription].filter((v) => v !== null && v !== undefined && v !== "").join(" — ");
  // Every group this point belongs to (composite grouping only) -- powers
  // both the tooltip's "also classified as" line and, for a merged marker,
  // the dimming check in withItemStyle below (a merged point anchored on
  // one group must still stay bright when a *different* member group is
  // isolated).
  const groups = isGroupingByCompositeColumn.value ? compositeGroupTokens(item) : null;
  const isManual = isManualRow(item);
  const shape = pointShape(item);
  // A diamond/star reads visually smaller than a circle at the same
  // symbolSize (less filled area for the same bounding box) -- scaled up so
  // neither shape looks small/secondary next to a plain circle at the same
  // underlying size.
  const baseSize = bubbleSizeFor(rawSizeValue);

  return {
    value: [
      props.xAxisNumeric ? Number(rawX) : (rawX ?? t("fomcharts.unknownGroup")),
      props.yAxisNumeric ? Number(rawY) : (rawY ?? t("fomcharts.unknownGroup")),
    ],
    title: item.title ?? item.Title,
    refLabel: item.ref ?? item.Ref,
    modeCase: modeCase || null,
    extras,
    needsReview,
    isFlagged: needsReview,
    isManual,
    isHovered: isHoveredRow(item),
    row: item,
    groups,
    isPinned: isPinnedRow(item),
    symbol: shape === "circle" ? undefined : shape === "diamond" ? "diamond" : STAR_SYMBOL_PATH,
    symbolSize: shape === "circle" ? baseSize : baseSize * 1.2,
    symbolOffset: undefined as [number, number] | undefined,
    label: undefined as { show: boolean } | undefined,
  };
};

// A dashed outline flags points that need a second look — Review status is
// "Edit" (a value like FWHM was calculated/estimated rather than read
// directly from the paper) — a data-quality signal, not a category, so it
// rides on top of whatever fill color the group/series already assigned
// rather than replacing it.
// Isolating one group (via StatsSummaryPanel) dims the rest instead of
// hiding them, so the overall shape of the dataset stays visible. Every
// point's color always matches the series/legend it belongs to — see
// isGroupingByCompositeColumn above for how Material Class points land in
// the right (possibly several) series to begin with.
const withItemStyle = (
  point: ReturnType<typeof buildPoint>,
  color: string | Record<string, unknown>,
  // The group(s) that must include highlightGroup for this exact point to
  // stay bright. Normally just [groupName] of whichever series built this
  // point (dimmed unless it's the isolated group). A merged marker (see
  // seriesList below) passes its *full* member-token list instead, since one
  // marker there really does represent several groups at once and must not
  // dim just because its series/anchor happens not to be the isolated one.
  dimGroups: string[] | null,
) => {
  const memberOfIsolated =
    props.highlightGroup !== null && dimGroups !== null && dimGroups.includes(props.highlightGroup);
  const dimmedByGroup = props.highlightGroup !== null && dimGroups !== null && !memberOfIsolated;
  // Hovering a row in the DataPointsTable panel previews exactly the point a
  // click there would hide/remove -- every OTHER point dims (like isolating a
  // group does) so the hovered one reads unambiguously at a glance, on top of
  // whatever group-dim state was already active.
  const dimmedByHover = hasVisibleHoveredMatch.value && !point.isHovered;
  const dimmed = dimmedByGroup || dimmedByHover;
  const opacity = point.isHovered ? 1 : dimmed ? 0.15 : 0.88;
  // The ref-label above each dot is hidden by default (see pointLabel below)
  // and only forced on for a point that's meaningfully "the one being looked
  // at" right now: isolated via a group click, pinned as an annotation, or
  // hovered from the side panel. Hovering the CHART itself reveals it too,
  // but that's handled by the series-level `emphasis` style, not here. A
  // merge-mode invisible sibling (symbolSize 0) never gets a label
  // regardless -- it isn't drawn, so a label would float unanchored right on
  // top of its visible anchor's own label.
  // Manually added points always stay labeled (their ref, e.g. "M1") for the
  // same reason a pinned/isolated point does -- they're purpose-built to be
  // individually identified while comparing against the literature, not
  // blended anonymously into a series of dozens.
  const showLabel = (point.symbolSize ?? 0) !== 0 && (point.isPinned || memberOfIsolated || point.isManual || point.isHovered);
  // The gold diamond outline takes priority over the dashed "needs review"
  // border -- a manually entered point never carries a Review status to
  // begin with (see isNeedsReviewRow), so the two are not expected to
  // co-occur, but the manual cue is the more important one when they do.
  const baseItemStyle = point.isManual
    ? { color, opacity, borderWidth: 2.5, borderColor: manualPointBorderColor }
    : point.isFlagged
      ? { color, opacity, borderType: "dashed" as const, borderWidth: 1, borderColor: legendColor }
      : { color, opacity };
  // The hover-preview ring wins over every other border treatment (manual
  // gold, flagged dashed) -- while hovering a panel row, unambiguously
  // pointing at the right dot matters more than any other cue that point
  // might also carry.
  const itemStyle = point.isHovered
    ? { ...baseItemStyle, opacity, borderWidth: 1.5, borderColor: hoverRingColor }
    : baseItemStyle;
  return {
    ...point,
    label: { show: showLabel },
    itemStyle,
    // Bumped, not just outlined, so the preview reads clearly even at the
    // small end of the size-by-value range (see bubbleSizeFor).
    symbolSize: point.isHovered ? (point.symbolSize ?? 10) * 1.35 : point.symbolSize,
  };
};

// A single-color style for a normal point; for a merged multi-category point
// (mergeMultiCategoryPoints) a left-to-right sweep of solid color BANDS (one
// per member group, hard edges rather than a smooth blend) communicates
// "this point is more than one category" with no custom rendering -- ECharts
// accepts this plain object directly wherever an itemStyle.color is
// expected. Hard edges instead of a continuous gradient matter here: a
// smoothly blended gradient washes out into a single muddy mid-tone on a
// marker this small (down to pointSize's floor, well under the merged-point
// floor below), making a 3+ way split unreadable -- solid bands stay
// individually identifiable at any size the merged floor allows.
const gradientColor = (colors: string[]): string | Record<string, unknown> =>
  colors.length <= 1
    ? (colors[0] ?? "")
    : {
        type: "linear",
        x: 0,
        y: 0,
        x2: 1,
        y2: 0,
        colorStops: colors.flatMap((c, i) => [
          { offset: i / colors.length, color: c },
          { offset: (i + 1) / colors.length, color: c },
        ]),
      };

// A merged multi-category marker must stay legible at its smallest -- the
// ordinary size-by-value bubble size (see bubbleSizeFor) can go as low as
// pointSize's floor, too small for a multi-band gradient to read as
// anything but a smear. Merged points get floored to pointSize itself
// instead (still scaling up further for a genuinely large value, just
// never below it).
const mergedMinBubbleSize = computed(() => props.pointSize);

// Two distinct rows that happen to share the exact same x/y (a common FOM
// value at a shared x-category, e.g. two "Dielectric" papers both reporting
// FOM=53) render as a single dot otherwise -- N still counts both, but only
// one circle is visible and hideOverlap silently drops the other's ref
// label, so a researcher counting dots undercounts by one. This spreads
// same-coordinate points a few pixels apart vertically (screen space, not
// data space) so every row stays its own visible dot with its own label.
// Runs *after* the composite-column horizontal offset above, which already
// separates a single row's copies across different group series -- this
// pass instead separates different rows that land in the same series at
// the same spot, so it only ever adds a y-offset, never touching x.
const spreadDuplicatePoints = <T extends { value: unknown[]; symbolOffset?: [number, number]; symbolSize?: number }>(
  points: T[],
): T[] => {
  const groups = new Map<string, T[]>();
  for (const point of points) {
    // Keyed on the existing x-offset too, not just the raw coordinate -- a
    // composite-column row's own per-token dots (see the separated-mode
    // branch above) already sit at distinct x-offsets from each other, so
    // without this they'd still share one raw-value key and get a second,
    // needless y-nudge stacked on top of their already-distinct positions,
    // spreading a single row's dots far more than necessary. Genuinely
    // different rows landing on the same coordinate still share both the
    // value and the (usually zero) x-offset, so they're unaffected.
    const key = JSON.stringify([point.value, point.symbolOffset?.[0] ?? 0]);
    const group = groups.get(key);
    if (group) group.push(point);
    else groups.set(key, [point]);
  }
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    // A fixed offset was small enough to still leave large size-by-value
    // bubbles (see bubbleSizeFor, up to pointSize) overlapping each other --
    // basing the step on the group's own bubble size guarantees visible
    // separation regardless of how big the dots are.
    const offsetStep = Math.max(...group.map((p) => p.symbolSize ?? 10)) * 0.7 + 3;
    group.forEach((point, i) => {
      const xOffset = point.symbolOffset?.[0] ?? 0;
      point.symbolOffset = [xOffset, (i - (group.length - 1) / 2) * offsetStep];
    });
  }
  return points;
};

const seriesList = computed(() => {
  const medianMarkLine = {
    lineStyle: { type: "dashed", color: medianLineColor, width: 1 },
    data: props.showMedian
      ? [{ yAxis: medianValue.value, name: t("fomcharts.medianLine.name") }]
      : [],
    label: {
      formatter: t("fomcharts.medianLine.name") + "\n{c}",
      position: "middle",
      color: medianLineColor,
      // Explicit so the label sits vertically CENTERED on the line rather
      // than echarts' default of stacking it entirely above -- without
      // this, getMedianLineRect's symmetric (y ± half-height) guide callout
      // rect only ever covered the bottom half of the two-line label,
      // clipping "Median" off the top.
      align: "center",
      verticalAlign: "middle",
      // A plain center-of-the-line label had the dashed stroke cutting
      // straight through the text, unreadable. A solid backdrop (matching
      // the chart's own canvas background -- see exportPng's white
      // background) sits the line behind the chip instead of through the
      // glyphs, without moving the label off the centered position
      // getMedianLineRect's callout box above assumes.
      backgroundColor: "#fff",
      padding: [2, 5],
      borderRadius: 3,
    },
  };

  const series: any[] = [];

  if (!props.groupBy || !groupValues.value) {
    series.push({
      name: t("fomcharts.type.scatter"),
      symbolSize: 10,
      type: "scatter",
      data: plottableData.value.map((item) => withItemStyle(buildPoint(item), palette[0], null)),
      label: pointLabel,
      emphasis: pointLabelEmphasis,
      // Papers plotted at the same x-tick with close FOM values get
      // stacked ref-labels ("47" printed twice, directly overlapping).
      // hideOverlap keeps whichever label fits and drops the rest rather
      // than rendering illegible stacked text — the point itself and its
      // tooltip are unaffected.
      labelLayout: { hideOverlap: true },
      markLine: medianMarkLine,
    });
  } else {
    groupValues.value.forEach((groupName, idx) => {
      const color = props.groupColorMap[groupName] ?? palette[idx % palette.length];
      series.push({
        name: groupName,
        symbolSize: 10,
        type: "scatter",
        // A series-level color is what the legend icon actually reads —
        // without it, echarts falls back to auto-cycling its own theme
        // colors by series position, which drifts out of sync with our
        // fixed groupColorMap the moment a filter hides an entire category
        // (shrinking the series list and shifting every later series'
        // auto-assigned position/color).
        color,
        itemStyle: { color },
        data: plottableData.value
          .filter((item) => matchesGroup(item, groupName))
          .map((item) => {
            const point = buildPoint(item);
            if (isGroupingByCompositeColumn.value) {
              const tokens = compositeGroupTokens(item);
              if (props.mergeMultiCategoryPoints && tokens.length > 1) {
                // Merge mode: a row with several kept tokens draws as ONE
                // marker instead of one duplicate per token, anchored on a
                // deterministically sorted first token so every series
                // agrees on which copy is the visible one. The other member
                // series still carry an invisible (symbolSize 0) copy of the
                // same row purely so matchesGroup-driven logic (isolate,
                // stats) keeps treating it as a member of every one of its
                // groups -- see the symbolSize-0 filter in
                // spreadDuplicatePoints below, which keeps that invisible
                // sibling from nudging the visible anchor off its true
                // coordinate.
                // Known trade-off: ECharts' own legend row for a non-anchor
                // member group can't hide this marker by itself (it isn't
                // really drawn in that series) -- only the anchor group's
                // legend row can. The sidebar filter chips are unaffected.
                const sortedTokens = [...tokens].sort();
                const anchor = sortedTokens[0];
                point.symbolOffset = [0, 0];
                if (groupName === anchor) {
                  const memberColors = sortedTokens.map((tok) => props.groupColorMap[tok] ?? color);
                  point.symbolSize = Math.max(point.symbolSize, mergedMinBubbleSize.value);
                  return withItemStyle(point, gradientColor(memberColors), sortedTokens);
                }
                point.symbolSize = 0;
                return withItemStyle(point, color, [groupName]);
              }
              // Separated mode (default): a row with several materials (e.g.
              // "Dielectric;Metal") plots once per material at the exact
              // same x/y -- without an offset the duplicates stack perfectly
              // on top of each other and only the last-drawn series' color
              // is ever visible, which is what made the chart's colors look
              // arbitrary/wrong. symbolOffset shifts each duplicate a few
              // pixels apart (screen space, not data space) so every
              // material's dot stays visible without moving the point off
              // its real coordinate. Scales gently with pointSize so bigger
              // bubbles (the Display > point-size slider) still separate
              // cleanly instead of overlapping at the same fixed step.
              const n = Math.max(tokens.length, 1);
              const i = Math.max(tokens.indexOf(groupName), 0);
              const offsetStep = Math.max(7, props.pointSize * 0.4);
              point.symbolOffset = [(i - (n - 1) / 2) * offsetStep, 0];
            }
            return withItemStyle(point, color, [groupName]);
          }),
        label: pointLabel,
        emphasis: pointLabelEmphasis,
        labelLayout: { hideOverlap: true },
        // Only the first series carries the median markLine — echarts draws it
        // across the full plot width regardless of which series owns it, so
        // attaching it to every series would just duplicate the line.
        markLine: idx === 0 ? medianMarkLine : { data: [] },
      });
    });
  }

  // Spread duplicate coordinates across the WHOLE chart, not per series --
  // two points from *different* series (e.g. one EXP, one SIM) landing on
  // the same x/y would otherwise never get separated, since each series only
  // ever saw its own single point at that spot. Points are the same object
  // references inside each series' data array, so mutating them here also
  // updates them in place there. symbolSize-0 points are excluded -- those
  // are merge mode's invisible per-token siblings of an already-visible
  // anchor (see above); they always share their anchor's exact coordinate,
  // so without this filter every merged marker would get needlessly nudged
  // off its true position by its own invisible copy.
  spreadDuplicatePoints(
    series
      .filter((s) => s.type === "scatter")
      .flatMap((s) => s.data)
      .filter((p) => (p.symbolSize ?? 10) !== 0),
  );

  // A least-squares fit over the plotted points — only meaningful when the
  // X axis is itself a numeric quantity (e.g. Sensitivity), not a category
  // label like Material Class. Fit itself is computed once in trendFit
  // above (shared with the trendUnavailable badge). Sampled at many x
  // values rather than drawn as a single 2-point segment: a non-linear
  // model (exponential/logarithmic/power/polynomial) is an actual curve,
  // and even a linear fit needs sampling to render as a straight line once
  // the Y axis itself is log-scaled (echarts interpolates a "line" series
  // in data space between whatever points it's given, so 2 points would
  // draw straight in *pixel* space and come out visibly bent on a log axis).
  if (trendFit.value) {
    const xs = highlightedRows.value
      .map((item) => Number(item[props.xAxis as string]))
      .filter((x) => !isNaN(x));
    const xmin = Math.min(...xs);
    const xmax = Math.max(...xs);
    const fit = trendFit.value;
    series.push({
      name: t("fomcharts.controls.trendLine"),
      type: "line",
      data: sampleTrendCurve(fit, xmin, xmax),
      showSymbol: false,
      silent: true,
      smooth: true,
      z: 5,
      lineStyle: { type: "dashed", width: 2, color: trendLineColor },
    });
  }

  // Pareto frontier (maximize-both-axes non-dominated set) — only meaningful
  // when both X and Y axes are numeric.
  if (props.showPareto && props.xAxisNumeric && props.yAxisNumeric && props.xAxis && props.yAxis) {
    const points = highlightedRows.value
      .map((item) => ({
        x: Number(item[props.xAxis as string]),
        y: Number(item[props.yAxis as string]),
        row: item,
      }))
      .filter((p) => !isNaN(p.x) && !isNaN(p.y));
    const frontier = computeParetoFrontier(points);
    // A frontier of exactly one point has no line segment to draw --
    // `type: "line"` with a single coordinate renders nothing at all, which
    // reads as "the toggle did nothing" even though it worked correctly.
    // Draw it as a visible marker instead so a single non-dominated point
    // is never silently invisible.
    if (frontier.length === 1) {
      series.push({
        name: t("fomcharts.controls.pareto"),
        type: "scatter",
        data: [[frontier[0].x, frontier[0].y]],
        symbol: "diamond",
        symbolSize: 14,
        silent: true,
        z: 6,
        itemStyle: { color: "#009E73", borderColor: "#fff", borderWidth: 1.5 },
      });
    } else if (frontier.length > 1) {
      series.push({
        name: t("fomcharts.controls.pareto"),
        type: "line",
        data: frontier.map((p) => [p.x, p.y]),
        showSymbol: false,
        silent: true,
        step: false,
        z: 6,
        lineStyle: { type: "solid", width: 2, color: "#009E73" },
      });
    }
  }

  // A legend-only entry for "Taille selon une mesure" (Display section) --
  // no data of its own, it exists purely so the point-size encoding gets a
  // row in the chart's own legend (see sizeLegendNames/chartOption's third
  // legend row), the same way Trend line / Pareto frontier do, instead of
  // living only in a floating HTML badge disconnected from the chart itself.
  // name is the full "Taille : {column} ({min}-{max})" text (see
  // sizeLegendFullText), not a short placeholder later swapped in via a
  // legend `formatter` -- echarts sizes a "plain"-type legend item's own
  // box from its DATA name, before any formatter ever runs, so a formatter
  // that rewrites a short name into a much longer string just gets that
  // longer string clipped to the short name's box. Matches this series'
  // name to what the legend row (and legendTooltipFormatter's lookup)
  // actually display.
  if (pointSizeLegend.value) {
    series.push({
      name: sizeLegendFullText.value,
      type: "scatter",
      data: [],
      silent: true,
      symbol: "circle",
      itemStyle: { color: legendColor },
    });
  }

  // Hovering a hidden row in the panel's disclosure previews where it would
  // reappear -- a faint, dashed-ring ghost point rather than a real, styled
  // series member (it isn't actually visible yet, just a preview of a click
  // away). silent: true keeps it out of hover/click/tooltip handling
  // entirely, and it's excluded from the legend (see groupLegendNames etc.
  // below, which never reference this series' name).
  if (previewPoint.value) {
    series.push({
      name: t("fomcharts.pointsTable.unhide"),
      type: "scatter",
      data: [{ value: previewPoint.value.value, refLabel: previewPoint.value.refLabel, title: previewPoint.value.title }],
      symbol: "circle",
      symbolSize: previewPoint.value.symbolSize * 1.35,
      silent: true,
      z: 7,
      label: {
        show: true,
        position: "top",
        formatter: () => String(previewPoint.value?.refLabel ?? ""),
        fontSize: 10,
        color: hoverRingColor,
      },
      itemStyle: { color: hoverRingColor, opacity: 0.35, borderWidth: 1.5, borderColor: hoverRingColor, borderType: "dashed" },
    });
  }

  return series;
});

// The legend should only list names a user can actually make sense of.
// With no groupBy, all points share one series internally named after the
// generic "Scatter Plot" chart type — showing that as a legend chip reads
// as a meaningless label, so it's left out; only real group names (or the
// median/trend/Pareto overlays, when active) are listed.
// Split into two groups -- group-by colors vs. trend/Pareto overlays -- so
// they can render as two visually distinct legend rows (see chartOption's
// `legend` array below) instead of one run-on line that was hard to parse
// when both a color legend and the overlay names were mixed together.
// Every group gets its own legend entry, ranked most-populous-first
// (groupNamesByCount) -- with many groups, legend[0] below wraps onto
// however many lines it needs (see estimateLegendWrapRows/groupLegendRows
// in chartOption) rather than truncating some away: every group is always
// fully listed, at full legible size, right there on the chart. Isolating a
// single group (StatsSummaryPanel's isolate click) narrows the on-chart
// legend down to just that one group instead -- the rest are already
// dimmed on the chart itself, so listing their names alongside adds
// nothing but extra wrapped lines.
const groupLegendNames = computed<string[]>(() => {
  if (!props.groupBy || !groupValues.value) return [];
  if (props.highlightGroup !== null) return [props.highlightGroup];
  return groupNamesByCount.value;
});
const overlayLegendNames = computed(() => {
  const names: string[] = [];
  if (props.showTrend && props.xAxisNumeric && props.yAxisNumeric && props.xAxis && props.yAxis) {
    names.push(t("fomcharts.controls.trendLine"));
  }
  if (props.showPareto && props.xAxisNumeric && props.yAxisNumeric && props.xAxis && props.yAxis) {
    names.push(t("fomcharts.controls.pareto"));
  }
  return names;
});
// Its own legend row (rather than folded into overlayLegendNames) because it
// needs a square, circle-friendly icon box (itemWidth === itemHeight) --
// Trend/Pareto's elongated line-swatch box (14x8) would squash a circle icon
// into an oval.
// The full "Taille : {column} ({min}-{max})" text, computed once and used
// directly as BOTH the legend's data name and the point-size helper
// series' own name below -- see that series' comment for why a `formatter`
// alone isn't enough here.
const sizeLegendFullText = computed(() =>
  pointSizeLegend.value
    ? t("fomcharts.pointSizeLegend", { column: pointSizeLegend.value.column, min: pointSizeLegend.value.min, max: pointSizeLegend.value.max })
    : t("fomcharts.controls.pointSize"),
);
const sizeLegendNames = computed(() => (pointSizeLegend.value ? [sizeLegendFullText.value] : []));

// Hover explanations for the overlay/size legend rows -- "what it shows and
// how it's calculated" for Trend/Pareto/point-size, since a bare "Ligne de
// tendance" swatch name on its own doesn't say anything about the fit method
// or what a bigger dot means. Keyed by the exact legend entry name so the
// formatter below can look an item up regardless of which row it's in.
const legendTooltipFormatter = (params: any): string => {
  const name = params.name;
  if (name === t("fomcharts.controls.trendLine")) {
    return trendFit.value
      ? `${t(`fomcharts.trendType.${trendFit.value.type}`)} · R² ${formatStat(trendFit.value.r2)}<br/>${t("fomcharts.trendLineExplain")}`
      : name;
  }
  if (name === t("fomcharts.controls.pareto")) {
    return t("fomcharts.paretoExplain");
  }
  if (name === sizeLegendFullText.value && pointSizeLegend.value) {
    return t("fomcharts.pointSizeLegendExplain", { column: pointSizeLegend.value.column });
  }
  return name;
};

// Zoom is entirely home-grown rather than ECharts' default dataZoom-inside
// wheel handling (zoomOnMouseWheel is turned off in chartOption's dataZoom
// for exactly this reason): the built-in handler scales the zoom step by
// the browser's own wheel delta, which is wildly inconsistent across mice
// and trackpads -- a light trackpad flick could jump several zoom levels at
// once. Reading only the wheel event's *direction*, never its magnitude,
// gives every notch the same small, predictable step regardless of the
// input device. The +/- buttons below reuse the same zoomBy step function
// with a bigger, single-click-sized step.
const WHEEL_ZOOM_STEP = 0.06;
const BUTTON_ZOOM_STEP = 0.18;
const ZOOM_ANIM_MS = 180;

// Toggled by the lock button next to the zoom controls -- guards the wheel
// listener and the +/- buttons below so an accidental scroll-wheel notch
// over the chart (the most common complaint: scrolling the page while the
// cursor happens to pass over the plot) can't change the zoom window.
const zoomLocked = ref(true);

// chartOption sets animation: false globally -- needed so an axis/groupBy
// change (which rebuilds the series array) doesn't replay ECharts' ~1s
// "grow from nothing" enter animation (see that comment). A dataZoom step
// doesn't touch the series array at all, though, so it's safe to animate it
// ourselves here without reintroducing that problem: each zoom step is
// tweened over a few requestAnimationFrame ticks instead of one instant
// dispatchAction jump, which is what actually made the wheel feel harsh even
// after WHEEL_ZOOM_STEP already capped how far each notch moves.
// Windows Chrome has a known bug where the hardware mouse cursor stops being
// redrawn over a <canvas> after a burst of non-passive `wheel` events with
// preventDefault() (see handleWheelZoom below) -- exactly what each zoom
// step does. The cursor is still tracked correctly (hover/tooltip keep
// working), it's only the OS-drawn icon that goes invisible. Toggling the
// DOM node's CSS `cursor` property forces the browser to recompute and
// repaint it, so nudge it once the zoom settles (i.e. once scrolling has
// paused for ZOOM_ANIM_MS and the animation loop below actually finishes,
// rather than on every intermediate frame).
const nudgeCursor = () => {
  const dom = chartRef.value?.getDom();
  if (!dom) return;
  dom.style.cursor = "none";
  requestAnimationFrame(() => requestAnimationFrame(() => {
    dom.style.cursor = "";
  }));
};

let zoomAnimFrame: number | null = null;
const animateZoomTo = (targetStart: number, targetEnd: number) => {
  const inst = chartRef.value;
  if (!inst) return;
  const dz = (inst.getOption() as any)?.dataZoom?.[0];
  const fromStart = dz?.start ?? 0;
  const fromEnd = dz?.end ?? 100;
  if (zoomAnimFrame !== null) cancelAnimationFrame(zoomAnimFrame);
  const startTime = performance.now();
  const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
  const step = (now: number) => {
    const t = Math.min(1, (now - startTime) / ZOOM_ANIM_MS);
    const e = easeOutCubic(t);
    inst.dispatchAction({
      type: "dataZoom",
      start: fromStart + (targetStart - fromStart) * e,
      end: fromEnd + (targetEnd - fromEnd) * e,
    });
    if (t < 1) {
      zoomAnimFrame = requestAnimationFrame(step);
    } else {
      zoomAnimFrame = null;
      nudgeCursor();
    }
  };
  zoomAnimFrame = requestAnimationFrame(step);
};

// Always zooms around the CURRENT window's own center rather than the
// cursor position -- simpler, and keeps the wheel and the +/- buttons
// behaving identically instead of the wheel suddenly recentering on
// wherever the pointer happens to be. Reads the window mid-animation (its
// own live dataZoom option) rather than the animation's final target, so a
// fast run of wheel notches keeps accelerating smoothly instead of each new
// notch snapping back to where the previous one had only tweened to so far.
const zoomBy = (fraction: number) => {
  if (zoomLocked.value) return;
  const inst = chartRef.value;
  if (!inst) return;
  const dz = (inst.getOption() as any)?.dataZoom?.[0];
  if (!dz) return;
  const start = dz.start ?? 0;
  const end = dz.end ?? 100;
  const span = end - start;
  const newSpan = Math.min(100, Math.max(2, span * (1 - fraction)));
  const center = (start + end) / 2;
  let newStart = center - newSpan / 2;
  let newEnd = center + newSpan / 2;
  if (newStart < 0) {
    newEnd -= newStart;
    newStart = 0;
  }
  if (newEnd > 100) {
    newStart -= newEnd - 100;
    newEnd = 100;
  }
  animateZoomTo(Math.max(0, newStart), Math.min(100, newEnd));
};
const zoomIn = () => zoomBy(BUTTON_ZOOM_STEP);
const zoomOut = () => zoomBy(-BUTTON_ZOOM_STEP);
const resetZoom = () => animateZoomTo(0, 100);

const handleWheelZoom = (event: WheelEvent) => {
  // Locked: let the wheel event through untouched so the page scrolls
  // normally instead of being swallowed by a chart that won't zoom anyway.
  if (zoomLocked.value) return;
  event.preventDefault();
  zoomBy(event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP);
};

// A native listener, not a `@wheel` template binding -- vue-echarts only
// re-emits ECharts' own named chart events (click, legendselectchanged, ...),
// it doesn't forward arbitrary native DOM events like a plain Vue component
// would, so `@wheel` on <v-chart> would never fire.
//
// Registered on the CAPTURE phase, not bubble -- zrender binds its own wheel
// listener directly on the canvas (a descendant of this wrapper), which
// would otherwise see a real wheel event before it ever bubbled up to a
// bubble-phase listener here. Deliberately NOT calling stopPropagation,
// though: zoomOnMouseWheel: false already keeps zrender from *acting* on
// the event once it does see it, and stopping it outright risked starving
// zrender of a raw wheel event its broader gesture tracking may still
// depend on for unrelated interactions (e.g. click).
onMounted(() => {
  chartRef.value?.getDom()?.addEventListener("wheel", handleWheelZoom, { passive: false, capture: true });
});
onBeforeUnmount(() => {
  chartRef.value?.getDom()?.removeEventListener("wheel", handleWheelZoom, { capture: true });
  if (zoomAnimFrame !== null) cancelAnimationFrame(zoomAnimFrame);
});

// chartRef.getWidth() is a live imperative read, not a reactive Vue value --
// calling it inside chartOption's computed wouldn't register as a
// dependency, so a container resize would never re-trigger the group
// legend's wrap-row estimate (see estimateLegendWrapRows/groupLegendRows
// below) even though the actual number of wrapped lines needed changes with
// the chart's width. legendWidthTick is a plain reactive counter bumped by
// a ResizeObserver purely to force that recomputation; chartOption then
// re-reads the chart's current getWidth() fresh each time it fires.
const legendWidthTick = ref(0);
let legendWidthObserver: ResizeObserver | null = null;
onMounted(() => {
  const dom = chartRef.value?.getDom();
  if (!dom) return;
  legendWidthObserver = new ResizeObserver(() => {
    legendWidthTick.value += 1;
  });
  legendWidthObserver.observe(dom);
});
onBeforeUnmount(() => {
  legendWidthObserver?.disconnect();
});

// Pinning a point is meant for comparing metrics across papers, not for
// re-reading the title (already one hover away in the tooltip) -- so the
// annotation carries the two plotted axes plus whatever secondary metrics
// (Sensitivity, Q-factor, ...) the tooltip itself already surfaces.
const handleChartClick = (params: any) => {
  if (params.componentType !== "series" || !params.data || params.data.refLabel === undefined) return;
  emit("point-click", {
    ref: String(params.data.refLabel ?? ""),
    xLabel: props.xAxis ?? "",
    xValue: params.data.value?.[0],
    yLabel: props.yAxis ?? "",
    yValue: params.data.value?.[1],
    extras: params.data.extras ?? {},
    row: params.data.row,
  });
};

// Right-clicking a point opens a menu with the full set of actions
// (Edit/Reset/Pin/Hide/Delete, same as DataPointsTable's row menu -- see the
// template's contextMenuTarget block) instead of acting immediately, so a
// stray right-click never silently drops a point with no way back (hidden
// rows come back via the DataPointsTable panel or the toolbar's Reset -- see
// VisualizationView). Position is clamped on-screen (see
// useClampedMenuPosition) since it's placed at the raw click point.
const contextMenuTarget = ref<{ x: number; y: number; row: DataRow } | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const { menuStyle, show: showContextMenu } = useClampedMenuPosition();
const handleChartContextMenu = (params: any) => {
  if (params.componentType !== "series" || !params.data?.row) {
    contextMenuTarget.value = null;
    return;
  }
  // ECharts re-dispatches the native contextmenu event as `params.event.event`
  // -- preventDefault so the browser's own right-click menu doesn't show
  // underneath/alongside ours.
  (params.event?.event as MouseEvent | undefined)?.preventDefault();
  const native = params.event?.event as MouseEvent | undefined;
  const x = native?.clientX ?? 0;
  const y = native?.clientY ?? 0;
  contextMenuTarget.value = { x, y, row: params.data.row };
  showContextMenu(menuRef, x, y);
};
const confirmContextMenuEdit = () => {
  if (!contextMenuTarget.value) return;
  emit("point-context-edit", contextMenuTarget.value.row);
  contextMenuTarget.value = null;
};
const confirmContextMenuReset = () => {
  if (!contextMenuTarget.value || !isEditedRow(contextMenuTarget.value.row)) return;
  emit("point-context-reset", contextMenuTarget.value.row);
  contextMenuTarget.value = null;
};
const confirmContextMenuTogglePin = () => {
  if (!contextMenuTarget.value) return;
  const row = contextMenuTarget.value.row;
  if (isPinnedRow(row)) emit("point-context-unpin", row);
  else emit("point-context-pin", row);
  contextMenuTarget.value = null;
};
const confirmContextMenuHide = () => {
  if (!contextMenuTarget.value || isPinnedRow(contextMenuTarget.value.row)) return;
  emit("point-context-hide", contextMenuTarget.value.row);
  contextMenuTarget.value = null;
};
// Permanent for any row now, not just manual ones -- guarded a second time
// here (not just by the template's :disabled) since contextMenuTarget's row
// is whatever was right-clicked, and a pinned row must never be deletable
// out from under its own annotation.
const confirmContextMenuDelete = () => {
  if (!contextMenuTarget.value || isPinnedRow(contextMenuTarget.value.row)) return;
  if (!window.confirm(t("fomcharts.pointsTable.deleteConfirm"))) return;
  emit("point-context-delete", contextMenuTarget.value.row);
  contextMenuTarget.value = null;
};

// See pulseTargetRef's prop doc -- a brief ring around a just-added manual
// point. Double nextTick (same pattern as elsewhere in this file's guide
// helpers) so the echarts option update triggered by the new point actually
// lands before convertToPixel is asked to place a ring around it; asking
// too early would still read the *previous* frame's coordinate system.
const pulseRing = ref<{ left: number; top: number } | null>(null);
const PULSE_DURATION_MS = 1300;
let pulseTimeoutId: number | null = null;
watch(
  () => props.pulseTargetRef,
  async (targetRef) => {
    if (!targetRef) return;
    await nextTick();
    await nextTick();
    const inst = chartRef.value;
    const row = props.chartData.find((r) => String(r.ref ?? r.Ref ?? "") === targetRef);
    if (!inst || !row || !props.xAxis || !props.yAxis) return;
    const x: string | number = props.xAxisNumeric
      ? Number(row[props.xAxis])
      : ((row[props.xAxis] as string | number | undefined) ?? t("fomcharts.unknownGroup"));
    const y: string | number = props.yAxisNumeric
      ? Number(row[props.yAxis])
      : ((row[props.yAxis] as string | number | undefined) ?? t("fomcharts.unknownGroup"));
    const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [x, y]) as unknown as number[] | undefined;
    if (!px || px.some((n) => !Number.isFinite(n))) return;
    if (pulseTimeoutId !== null) window.clearTimeout(pulseTimeoutId);
    pulseRing.value = { left: px[0], top: px[1] };
    pulseTimeoutId = window.setTimeout(() => {
      pulseRing.value = null;
      pulseTimeoutId = null;
    }, PULSE_DURATION_MS);
  },
);
onBeforeUnmount(() => {
  if (pulseTimeoutId !== null) window.clearTimeout(pulseTimeoutId);
});

/** The current chart render as a PNG data URL -- split out of exportPng so
 * the guide can show a genuine "Export chart image" example (see
 * GuideTemplate.vue) instead of just the live interactive component. */
const getPngDataUrl = (): string | null =>
  chartRef.value?.getDataURL({ type: "png", pixelRatio: 2, backgroundColor: "#fff" }) ?? null;

/** Downloads the current chart render as a PNG -- used by the workspace's
 * Export menu (the chart no longer carries its own "save as image" toolbox
 * icon; it was a redundant second way to do the same thing). */
const exportPng = (filename = "fom_chart.png") => {
  const url = getPngDataUrl();
  if (!url) return;
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Guide-only: the badges row is real DOM (GuideTemplate can already box it
// with the normal getBoundingClientRect-based helpers once it has this
// element) -- exposed the same way chartRef itself is used internally.
const getBadgesRow = (): HTMLElement | null => badgesRowRef.value;

/** Guide-only: the chart's own DOM node, in whatever CSS transform scale
 * the guide is currently rendering it at -- paired with getMedianLineRect/
 * getLegendRect below (which report positions in echarts' own, pre-scale
 * pixel space) so GuideTemplate can convert one into the other and box
 * canvas-drawn content the same way it boxes real DOM elements everywhere
 * else in the guide. */
const getChartDom = (): HTMLElement | null => chartRef.value?.getDom() ?? null;

type PixelRect = { left: number; top: number; width: number; height: number };

/** Guide-only: the median line's full extent, read from echarts' own live
 * layout rather than guessed -- its vertical position shifts with the
 * plotted data (the median itself), and its horizontal extent spans the
 * whole grid, which itself shifts with the x-axis name's length
 * (nameGap/containLabel grow the grid's right margin for a longer
 * translated name). Spans the full grid width (not just the centered
 * label) so a callout ring encloses the whole dashed line, not only its
 * label. getInstanceByDom + the grid coordinate system's own rect is the
 * only way to read this back, since none of it is real DOM (CanvasRenderer
 * draws it straight onto the canvas). */
const getMedianLineRect = (): PixelRect | null => {
  if (!props.showMedian) return null;
  const dom = chartRef.value?.getDom();
  const raw = dom ? getInstanceByDom(dom) : undefined;
  if (!raw) return null;
  // `getModel`/`coordinateSystem` aren't part of echarts' typed public API
  // surface, but reading a live grid's rendered rect back is a long-standing,
  // stable pattern -- worth it here to avoid re-deriving (and drifting from)
  // the same layout math chartOption above uses to place the grid.
  const grid = (raw as any).getModel?.()?.getComponent?.("grid", 0)?.coordinateSystem?.getRect?.();
  const y = raw.convertToPixel({ yAxisIndex: 0 }, medianValue.value);
  if (!grid || typeof y !== "number" || Number.isNaN(y)) return null;
  return { left: grid.x, top: y - 18, width: grid.width, height: 36 };
};

/** Guide-only: the legend's live top position (see getMedianLineRect for
 * why this can't be read off real DOM) -- horizontally it's always centered
 * on the whole canvas (`left: "center"`, not grid-relative), so only the
 * vertical position needs to be read back; a fixed generous width covers
 * the legend regardless of how long its (locale-invariant, data-literal)
 * group names run. */
const getLegendRect = (): PixelRect | null => {
  if (!props.showLegend) return null;
  const inst = chartRef.value;
  if (!inst) return null;
  const legendOpt = (inst.getOption() as any)?.legend?.[0];
  if (!legendOpt || legendOpt.show === false) return null;
  const width = inst.getWidth();
  const top = typeof legendOpt.top === "number" ? legendOpt.top : 4;
  // Rows sit only 22px apart (see chartOption's overlayLegendTop/
  // sizeLegendTop) -- a shorter, tighter box than this row's neighbors
  // further down used to get away with (back when this was always the
  // LAST row) now keeps the ring from painting over the overlay/size rows
  // that can render directly beneath it.
  return { left: width / 2 - 75, top: top - 4, width: 150, height: 18 };
};

/** Guide-only: the point-size legend row's live top position -- the third
 * (`legend[2]`) of chartOption's three stacked legend rows, see
 * sizeLegendNames/showSizeLegend. Same reasoning as getLegendRect above,
 * EXCEPT for width: getLegendRect's fixed 150px guess is fine for its own
 * row (short, locale-invariant group names), but this row's text is the
 * full "Taille : {column} ({min}-{max})" sentence (see sizeLegendFullText)
 * -- long enough, in some locales, to run past a 150px guess -- so this
 * estimates from the actual string length instead (same charWidth guess
 * estimateLegendWrapRows uses for the group legend's own wrap estimate). */
const getSizeLegendRect = (): PixelRect | null => {
  if (!props.showLegend) return null;
  const inst = chartRef.value;
  if (!inst) return null;
  const legendOpt = (inst.getOption() as any)?.legend?.[2];
  if (!legendOpt || legendOpt.show === false) return null;
  const width = inst.getWidth();
  const top = typeof legendOpt.top === "number" ? legendOpt.top : 4;
  const iconAndGap = 10 + 5;
  const textWidth = sizeLegendFullText.value.length * 6.3;
  const boxWidth = iconAndGap + textWidth + 8;
  return { left: width / 2 - boxWidth / 2, top: top - 4, width: boxWidth, height: 18 };
};

/** Guide-only: a flagged ("Review status: Edit", dashed-outline) point's
 * pixel rect, found by its ref label rather than a fixed index -- reads
 * every series' raw data back off the live option (the same option
 * chartOption below feeds the chart) instead of recomputing bubble
 * positions/sizes independently, so this can't drift from what's actually
 * drawn. Returns the first flagged point found, since the guide's worked
 * example only ever flags one. */
const getFlaggedPointRect = (): PixelRect | null => {
  const inst = chartRef.value;
  if (!inst) return null;
  const series = (inst.getOption() as any)?.series ?? [];
  for (const s of series) {
    for (const d of s.data ?? []) {
      if (d?.isFlagged) {
        const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, d.value) as unknown as number[] | undefined;
        if (!px) return null;
        const r = (d.symbolSize ?? 10) / 2 + 6;
        return { left: px[0] - r, top: px[1] - r, width: r * 2, height: r * 2 };
      }
    }
  }
  return null;
};

/** Guide-only: same idea as getFlaggedPointRect, for the manually-added
 * point's own gold-outlined bubble instead (see isManualRow/manualCount) --
 * the guide's own "Add a point" worked example only ever adds one. */
const getManualPointRect = (): PixelRect | null => {
  const inst = chartRef.value;
  if (!inst) return null;
  const series = (inst.getOption() as any)?.series ?? [];
  for (const s of series) {
    for (const d of s.data ?? []) {
      if (d?.isManual) {
        const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, d.value) as unknown as number[] | undefined;
        if (!px) return null;
        const r = (d.symbolSize ?? 10) / 2 + 6;
        return { left: px[0] - r, top: px[1] - r, width: r * 2, height: r * 2 };
      }
    }
  }
  return null;
};

defineExpose({ exportPng, getPngDataUrl, getBadgesRow, getChartDom, getMedianLineRect, getLegendRect, getSizeLegendRect, getFlaggedPointRect, getManualPointRect });

// Rough pixel-width estimate for reserving grid margin for an axis name --
// echarts' containLabel does not reliably account for axis *names* (as
// opposed to tick labels), so without an explicit reservation a long name
// can render past the canvas edge and simply appear to vanish. This was the
// numeric x-axis name disappearing bug: its old nameGap (32px, "middle"
// location) had no matching grid.bottom reservation the way the category
// axis's nameGap (85px) implicitly got from its rotated tick labels
// growing containLabel's margin anyway.
const estimateAxisNameSpace = (text: string): number => (text ? text.length * 6.2 + 16 : 0);

// Same rough character-count estimate as estimateAxisNameSpace above, just
// summed across every legend entry and wrapped against the chart's actual
// rendered width -- used by chartOption's groupLegendRows to reserve enough
// grid.top space for however many lines the (always-complete, never
// truncated) group legend wraps into. Doesn't need to be pixel-perfect,
// just close enough that a wrapped legend doesn't overlap the plotted
// points below it.
const estimateLegendWrapRows = (names: string[], availableWidth: number): number => {
  if (names.length === 0 || availableWidth <= 0) return 1;
  const itemGap = 20; // echarts legend's own default itemGap
  const swatchAndPadding = 14 + 5; // legend[0]'s itemWidth + icon-to-text gap
  const charWidth = 6.3;
  let rows = 1;
  let rowWidth = 0;
  for (const name of names) {
    const entryWidth = swatchAndPadding + name.length * charWidth + itemGap;
    if (rowWidth > 0 && rowWidth + entryWidth > availableWidth) {
      rows += 1;
      rowWidth = entryWidth;
    } else {
      rowWidth += entryWidth;
    }
  }
  return rows;
};

const chartOption = computed(() => {
  const xName = props.xAxis ? formatUnitSuperscripts(props.xAxis) : "";
  const yName = props.yAxis ? formatUnitSuperscripts(props.yAxis) : "";
  const xNameSpace = estimateAxisNameSpace(xName);
  const yNameSpace = yName ? 26 : 0;

  // The chart title and the legend both default to the top-center of the
  // canvas -- with no reservation for the title's own line height, a
  // non-empty title sat directly on top of (or under) the legend/points.
  // titleSpace pushes everything below it down by one line when a title is
  // actually set.
  const hasTitle = !!displayTitle.value;
  const titleTop = 4;
  const titleSpace = hasTitle ? 26 : 0;

  // Group-by colors, trend/Pareto overlays, and the point-size encoding
  // render as up to three separate legend rows (rather than one run-on line)
  // so a researcher isn't left parsing "Dielectric, Metal, Trend line, Taille
  // des points" as if they were all the same kind of thing.
  const showGroupLegend = props.showLegend && groupLegendNames.value.length > 0;
  const showOverlayLegend = props.showLegend && overlayLegendNames.value.length > 0;
  const showSizeLegend = props.showLegend && sizeLegendNames.value.length > 0;
  // legendWidthTick is read purely to register a reactive dependency (see
  // its own comment) -- chartRef.getWidth() itself is a live, non-reactive
  // read, so without this a container resize would never re-run this
  // estimate even though the real wrap-row count depends on the current
  // width. Unlike the fixed single-row assumption every other legend
  // section gets, the group legend can wrap onto several lines once there
  // are enough groups (see estimateLegendWrapRows) -- undercounting here
  // would let a wrapped line overlap the plotted points below it, so a
  // width unavailable yet (pre-mount) falls back to a conservative 600.
  legendWidthTick.value;
  const chartWidthPx = chartRef.value?.getWidth() ?? 600;
  const groupLegendRows = showGroupLegend
    ? estimateLegendWrapRows(groupLegendNames.value, Math.max(0, chartWidthPx - 48))
    : 0;
  const legendRows = groupLegendRows + (showOverlayLegend ? 1 : 0) + (showSizeLegend ? 1 : 0);
  const groupLegendTop = titleTop + titleSpace;
  const overlayLegendTop = groupLegendTop + groupLegendRows * 22;
  const sizeLegendTop = overlayLegendTop + (showOverlayLegend ? 22 : 0);
  // Trend's swatch stays the bare overlay name in legend.data (identity used
  // for matching); the type + R² only shows via this formatter, which
  // rewrites the DISPLAYED text without touching the underlying name --
  // otherwise "what it shows" (the fit stats) would only ever surface on
  // hover via legendTooltipFormatter, one click of context a researcher
  // shouldn't have to go looking for.
  const overlayLegendFormatter = (name: string): string =>
    name === t("fomcharts.controls.trendLine") && trendFit.value
      ? `${name} (${t(`fomcharts.trendType.${trendFit.value.type}`)}, R² ${formatStat(trendFit.value.r2)})`
      : name;
  return {
  // Changing an axis, groupBy, or the trend-line toggle usually reshapes the
  // series array enough that echarts can't match old vs new series/data and
  // smoothly interpolate -- it tears the series down and replays its
  // default "grow from nothing" enter animation (~1s), during which the
  // chart looks empty/frozen. animationDurationUpdate: 0 alone doesn't
  // cover this case (echarts treats a torn-down-and-rebuilt series as a
  // fresh enter, not an update), so animation is disabled outright --
  // control-driven changes should be instant on a data tool like this one.
  animation: false,
  title: { text: displayTitle.value, left: "center", top: titleTop },
  // Controlled by Display > Show legend (GraphControls) -- on by default so
  // exporting the chart as an image (see exportPng below) still carries a
  // key for which color is which group. Three rows: group-by colors, then
  // trend/Pareto overlays, then the point-size encoding (see
  // groupLegendTop/overlayLegendTop/sizeLegendTop above) -- each with a
  // hover tooltip explaining what it shows and how it's computed
  // (legendTooltipFormatter), since a bare swatch name alone doesn't.
  legend: [
    {
      // Default "plain" type -- wraps onto as many centered lines as it
      // needs instead of paginating, so every group is always fully listed
      // at once (see groupLegendRows/estimateLegendWrapRows above, which
      // reserve enough grid.top space for however many lines that turns out
      // to be).
      show: showGroupLegend,
      data: groupLegendNames.value,
      top: groupLegendTop,
      left: "center",
      selectedMode: false,
      textStyle: { color: legendColor, fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
    },
    {
      show: showOverlayLegend,
      data: overlayLegendNames.value,
      top: overlayLegendTop,
      left: "center",
      selectedMode: false,
      textStyle: { color: legendColor, fontSize: 11 },
      itemWidth: 14,
      itemHeight: 8,
      formatter: overlayLegendFormatter,
      tooltip: { show: true, formatter: legendTooltipFormatter },
    },
    {
      show: showSizeLegend,
      data: sizeLegendNames.value,
      top: sizeLegendTop,
      left: "center",
      selectedMode: false,
      textStyle: { color: legendColor, fontSize: 11 },
      itemWidth: 10,
      itemHeight: 10,
      tooltip: { show: true, formatter: legendTooltipFormatter },
    },
  ],
  // left/right stay modest (containLabel still grows them further if an
  // unusually wide tick label needs it) instead of the ~10% default on
  // both sides, which left a dead strip on the left; too tight on the left
  // and a numeric (value-type) x-axis, which has no category buckets
  // holding points away from x=0, ends up drawing points/labels right
  // through that area. right/top get an explicit reservation for the axis
  // names themselves (see estimateAxisNameSpace above) since they now
  // render at the end of each axis rather than below/beside the ticks.
  grid: {
    // legendRows now already accounts for however many lines the group
    // legend itself wraps onto (see groupLegendRows above), not just a flat
    // one-row assumption -- so this reservation grows automatically with a
    // wider groupBy column instead of the wrapped legend overlapping the
    // plotted points below it.
    top: 16 + titleSpace + legendRows * 24 + yNameSpace,
    left: 56,
    right: 32 + xNameSpace,
    bottom: 8,
    containLabel: true,
  },
  tooltip: {
    trigger: "item",
    // Compact chrome (padding/font/line-height) around the formatted HTML
    // below -- echarts' own tooltip defaults are noticeably roomier than
    // this app's UI text elsewhere, and a hover popup is read at a glance,
    // not a document.
    padding: [7, 10],
    textStyle: { fontSize: 11.5, lineHeight: 15.5 },
    formatter: (params: any) => {
      if (params.componentType === "markLine") {
        return `${t("fomcharts.medianLine.name")}: ${escapeHtml(params.data.value)}`;
      }
      if (params.seriesType === "line") {
        return escapeHtml(params.seriesName);
      }
      const groupLine = props.groupBy
        ? `${escapeHtml(formatUnitSuperscripts(props.groupBy))}: <strong>${escapeHtml(params.seriesName)}</strong><br/>`
        : "";
      // A row with several kept Material Class/Base Materials tokens plots
      // as more than one dot (or, in merge mode, one dot anchored on just
      // one of them) -- without this, two neighboring points (or a single
      // merged marker) give no hint they're actually the *same* row split
      // across categories. Lists every other group this exact point also
      // belongs to, alongside the one groupLine already names.
      const otherGroups = (params.data.groups ?? []).filter((g: string) => g !== params.seriesName);
      const alsoInGroupsLine =
        otherGroups.length > 0
          ? `<em style="opacity:0.75">${t("fomcharts.alsoInGroups", { groups: otherGroups.map(escapeHtml).join(", ") })}</em><br/>`
          : "";
      // Disambiguates which of a paper's several extracted rows this point
      // is -- Mode ID + Mode Description together (e.g. "Mode 1 —
      // Resonance peak P1") -- without it, two points from the same
      // Ref/Title look identical in the tooltip.
      const modeCaseLine = params.data.modeCase
        ? `<em style="opacity:0.75">${escapeHtml(params.data.modeCase)}</em><br/>`
        : "";
      const needsReviewLine = params.data.needsReview
        ? `<span style="color:${medianLineColor}">${t("fomcharts.needsReview")}</span><br/>`
        : "";
      const extraLines = Object.entries(params.data.extras ?? {})
        .map(([key, val]) => `${escapeHtml(formatUnitSuperscripts(key))}: <strong>${escapeHtml(val)}</strong><br/>`)
        .join("");
      // X and Y share one line (· -separated) instead of two -- the plotted
      // axes are the two values a researcher reads first, so keeping them
      // together also puts them right under the title instead of pushed
      // down by every optional line above.
      const axisLine = `${escapeHtml(formatUnitSuperscripts(props.xAxis ?? ""))}: <strong>${escapeHtml(params.data.value[0])}</strong> · ${escapeHtml(formatUnitSuperscripts(props.yAxis ?? ""))}: <strong>${escapeHtml(params.data.value[1])}</strong><br/>`;
      return `<div style="max-width: 260px; white-space: normal;">
                <strong>${escapeHtml(params.data.refLabel ?? "")}</strong> ${escapeHtml(params.data.title ?? "")}<br/>
                ${modeCaseLine}
                ${needsReviewLine}
                ${groupLine}
                ${alsoInGroupsLine}
                ${axisLine}
                ${extraLines}
              </div>`;
    },
  },
  // The visible slider bar sat right under the x-axis name and would overlap
  // it for long names -- "inside" (scroll-wheel/pinch/drag zoom) covers
  // zooming without it. zoomOnMouseWheel is off: the wheel is handled by our
  // own handleWheelZoom listener instead (see its comment for why), so
  // ECharts' own built-in wheel handling would otherwise double up with it.
  // Un-zooming is the +/- buttons or scrolling/dragging back out -- there's
  // no separate reset control.
  dataZoom: [{ type: "inside", zoomOnMouseWheel: false }],
  // nameLocation "end" puts the column name right at the tip of each axis
  // (past the last tick) instead of centered below/beside the tick labels --
  // this both answers "which axis is X and which is Y" directly on the
  // chart, and sidesteps the old clipping bug, since grid.right/top above
  // now reserve dedicated space for it rather than relying on containLabel.
  xAxis: props.xAxisNumeric
    ? { type: "value", name: xName, nameLocation: "end", nameGap: 12 }
    : {
        type: "category",
        name: xName,
        nameLocation: "end",
        nameGap: 12,
        axisLabel: {
          interval: 0,
          rotate: 30,
          // Full layer-structure strings can run to 80+ characters — rotated
          // at full length they sprawl across most of the chart height and
          // still overlap their neighbors. Truncate the tick label; the full
          // text stays available in the tooltip on hover.
          formatter: (value: string) =>
            value.length > MAX_AXIS_LABEL_LENGTH
              ? `${value.slice(0, MAX_AXIS_LABEL_LENGTH)}…`
              : value,
        },
      },
  // Same value/category split as the X axis above -- a categorical Y (e.g.
  // Material Class) can't take a log/linear scale, so it falls back to a
  // plain category axis instead of props.yAxisScale (GraphControls forces
  // the scale toggle to "value" and disables it whenever Y isn't numeric,
  // but this is what actually makes the axis itself render correctly).
  // No rotate here, unlike the X category axis -- Y tick labels are
  // horizontal text stacked vertically, so they don't run into each other
  // the way X's horizontal row of category ticks does.
  yAxis: props.yAxisNumeric
    ? { type: props.yAxisScale, name: yName, nameLocation: "end", nameGap: 12 }
    : {
        type: "category",
        name: yName,
        nameLocation: "end",
        nameGap: 12,
        axisLabel: {
          formatter: (value: string) =>
            value.length > MAX_AXIS_LABEL_LENGTH ? `${value.slice(0, MAX_AXIS_LABEL_LENGTH)}…` : value,
        },
      },
  series: seriesList.value,
  };
});
</script>

<style scoped>
.chart {
  height: 100%;
}

/* Active Benchmarking's "just added" confirmation ring (see pulseRing) --
   expands and fades once, not a looping/infinite pulse, so it reads as a
   one-time confirmation rather than an ongoing alert. */
@keyframes manual-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.6);
    opacity: 0.9;
  }
  100% {
    transform: translate(-50%, -50%) scale(3.2);
    opacity: 0;
  }
}
.animate-manual-pulse {
  /* Shorter than pulseRing's JS-side removal timeout (PULSE_DURATION_MS)
     so the ring always finishes fading out before Vue unmounts it, instead
     of snapping back to fully opaque (the default fill-mode) for one frame. */
  animation: manual-pulse 1.15s ease-out;
}
</style>
