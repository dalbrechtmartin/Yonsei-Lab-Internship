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
              <InfoTooltip
                v-else-if="hasFlaggedPoints"
                :text="t('fomcharts.flaggedHint')"
              />
              <span
                v-if="manualCount > 0"
                class="flex items-center gap-1 bg-amber-500/10 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
              >
                <Diamond class="size-2.5 fill-current" />
                {{
                  t(
                    "fomcharts.manualCount",
                    { count: manualCount },
                    { plural: manualCount },
                  )
                }}
                <InfoTooltip
                  :text="t('fomcharts.manualHint')"
                  icon-class="text-amber-800/70 hover:text-amber-800"
                />
              </span>
              <span
                v-if="missingAxisCount > 0"
                class="flex items-center gap-1 bg-amber-500/10 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
              >
                {{
                  t(
                    "fomcharts.missingAxisCount",
                    { count: missingAxisCount },
                    { plural: missingAxisCount },
                  )
                }}
                <InfoTooltip
                  :text="t('fomcharts.missingAxisHint')"
                  icon-class="text-amber-800/70 hover:text-amber-800"
                />
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
                {{ t(`fomcharts.trendType.${trendFit.type}`) }} · R²
                {{ formatStat(trendFit.r2) }}
              </span>
              <span
                v-if="trendUnavailable"
                class="flex items-center gap-1 bg-amber-500/15 text-amber-800 text-xs font-medium pl-2.5 pr-1.5 py-0.5 rounded whitespace-nowrap"
              >
                {{ t("fomcharts.controls.trendUnavailable") }}
                <InfoTooltip
                  :text="t('fomcharts.tooltips.trendUnavailable')"
                  icon-class="text-amber-800/70 hover:text-amber-800"
                />
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
      <div
        class="absolute right-3 top-3 z-10 flex items-center gap-0.5 rounded-md border border-secondary/15 bg-card/95 p-0.5 shadow-sm"
      >
        <button
          type="button"
          class="rounded p-1 transition"
          :class="
            zoomLocked
              ? 'text-primary hover:bg-primary/10'
              : 'text-secondary hover:bg-secondary/10 hover:text-ink'
          "
          :aria-label="
            t(zoomLocked ? 'fomcharts.zoom.unlock' : 'fomcharts.zoom.lock')
          "
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
           DataPointsTable row menu -- see handleChartContextMenu and
           PointActionsMenu (shared with that row menu). -->
      <PointActionsMenu
        v-model:target="contextMenuTarget"
        :is-pinned-row="isPinnedRow"
        @edit="(row) => emit('point-context-edit', row)"
        @reset="(row) => emit('point-context-reset', row)"
        @toggle-pin="onContextMenuTogglePin"
        @toggle-hide="(row) => emit('point-context-hide', row)"
        @delete="(row) => emit('point-context-delete', row)"
      />

      <!-- Active Benchmarking: a brief expanding ring around a point right
           after "Add data" saves it -- confirms where it landed without
           relying on the researcher to spot a new diamond among dozens of
           existing points. See the pulseTargetRef watcher below. -->
      <div
        v-if="pulseRing"
        class="pointer-events-none absolute z-10 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 animate-manual-pulse"
        :style="{
          left: `${pulseRing.left}px`,
          top: `${pulseRing.top}px`,
          borderColor: manualPointBorderColor,
        }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  provide,
  ref,
  watch,
} from "vue";
import { use, registerTheme } from "echarts/core";
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
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Lock,
  Unlock,
  Diamond,
} from "@lucide/vue";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import PointActionsMenu from "@/components/visualization/PointActionsMenu.vue";
import { useFomChartZoom } from "@/composables/useFomChartZoom";
import { useFomChartContextMenu } from "@/composables/useFomChartContextMenu";
import { useFomChartSeries } from "@/composables/useFomChartSeries";
import { useFomChartOption } from "@/composables/useFomChartOption";
import { useFomChartGuideApi } from "@/composables/useFomChartGuideApi";
import { downloadDataUrl } from "@/utils/saveFile";
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
  keptTokens,
  formatUnitSuperscripts,
  rowsEqual,
  type DataRow,
} from "@/utils/columnTypes";
import {
  computeStats,
  filterPlottable,
  fitTrend,
  formatStat,
  type TrendType,
} from "@/utils/stats";

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
  if (
    props.xAxisNumeric &&
    (rawX === null || rawX === undefined || rawX === "" || isNaN(Number(rawX)))
  )
    return null;
  if (
    props.yAxisNumeric &&
    (rawY === null || rawY === undefined || rawY === "" || isNaN(Number(rawY)))
  )
    return null;
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
  const yFiltered = filterPlottable(
    props.chartData,
    props.yAxis,
    props.yAxisNumeric,
  );
  return props.xAxisNumeric
    ? filterPlottable(yFiltered, props.xAxis)
    : yFiltered;
});

// True only when hoveredRow actually corresponds to a point really on the
// chart -- as opposed to hovering a *hidden* row's entry in the panel's
// disclosure, which sets hoveredRow too (see VisualizationView) but has no
// real point here to dim around, only the separate, already-faint ghost
// preview (see previewPoint). Dimming every other point AND showing an
// already-low-opacity ghost at the same time would wash the whole chart out
// with nothing left to clearly stand out.
const hasVisibleHoveredMatch = computed(
  () =>
    props.hoveredRow !== null &&
    plottableData.value.some((item) => isHoveredRow(item)),
);

// Reflects the highlighted subset (when a group is isolated) rather than
// the full plotted dataset -- same reasoning as highlightedRows below: a
// badge reading "13 samples" next to a median computed from 5 would be its
// own inconsistency.
const sampleCount = computed(() => highlightedRows.value.length);

const originColumn = computed(() => findOriginColumn(props.columns));
const reviewStatusColumn = computed(() =>
  findReviewStatusColumn(props.columns),
);
const materialClassColumn = computed(() =>
  findMaterialClassColumn(props.columns),
);
const baseMaterialsColumn = computed(() =>
  findBaseMaterialsColumn(props.columns),
);
const modeIdColumn = computed(() => findModeIdColumn(props.columns));
const modeDescriptionColumn = computed(() =>
  findModeDescriptionColumn(props.columns),
);
// Extra tooltip fields shouldn't repeat whatever's already on an axis/
// group-by — e.g. picking Origin as "Group / Color by" already shows it
// via the legend and the group line below, no need to print it twice.
const extraTooltipColumns = computed(() =>
  findTooltipExtraColumns(props.columns).filter(
    (col) =>
      col !== props.xAxis && col !== props.yAxis && col !== props.groupBy,
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

const isEditStatus = (item: DataRow): boolean =>
  isNeedsReviewRow(item, reviewStatusColumn.value);

// Content-based, not reference-based: ECharts' click round-trip (see
// VisualizationView's chartDisplayData comment on the same issue for
// `showOnlyAnnotated`) doesn't guarantee the row VisualizationView captured
// into an annotation (`params.data.row`) stays the exact same object as the
// row reaching buildPoint here on a later render -- a Set-based identity
// lookup silently never matches, which is why a pinned point's label wasn't
// sticking. Column-value comparison is what the rest of the annotations
// feature already relies on for "is this the same row" (rowsEqual).
const isPinnedRow = (item: DataRow): boolean =>
  props.pinnedRows.some((p) => rowsEqual(p, item, props.columns));

// Same content-based matching as isPinnedRow -- DataPointsTable's rows are
// the same objects in practice, but never assume identity survives a prop
// hand-off (see isPinnedRow's own comment for why that bit before).
const isHoveredRow = (item: DataRow): boolean => {
  const h = props.hoveredRow;
  if (!h) return false;
  return rowsEqual(h, item, props.columns);
};

// "3 to review" next to the sample-count badge -- Review status: Edit means
// a value (usually FWHM) was calculated or estimated rather than read
// directly from the paper, so it's worth a researcher's attention before
// the record is trusted at face value.
const needsReviewCount = computed(
  () => highlightedRows.value.filter(isEditStatus).length,
);

// A "Review status: Edit" flag puts a dashed outline on a point (see
// withItemStyle) -- a data-quality signal worth a researcher's attention
// next to the sample count.
const hasFlaggedPoints = computed(() => needsReviewCount.value > 0);

// "2 ajoutés manuellement" badge -- counted off plottableData (everything
// currently drawn), independent of includeCustomInStats, so the badge stays
// accurate even while the toggle hides these rows from the stats overlays.
const manualCount = computed(
  () => plottableData.value.filter(isManualRow).length,
);

// Rows that survived every other filter (domain/origin/material/needs-review/
// hidden -- see chartData, built upstream in VisualizationView) but still
// can't be drawn because they have no value for the selected X or Y axis
// (see plottableData's own blank-drop rule above). Without this badge these
// rows just vanish from the chart, the sample count, AND DataPointsTable
// (which is fed plottableData too) with no trace they were ever imported --
// e.g. a paper where only one mode reports FOM while the others only report
// wavelength, plotted against FOM.
const missingAxisCount = computed(
  () => props.chartData.length - plottableData.value.length,
);

// Grouping by a composite column (Material Class or Base Materials) is a
// special case: a composite cell like "Dielectric;Metal" should not become
// its own third bucket distinct from "Dielectric" and "Metal" — it should
// count toward *both* of those groups (the same point plotted twice, once
// per token) so the groups stay legible and match the corresponding filter
// chips exactly.
const isGroupingByCompositeColumn = computed(
  () =>
    !!props.groupBy &&
    (props.groupBy === materialClassColumn.value ||
      props.groupBy === baseMaterialsColumn.value),
);

// A row's tokens for the composite groupBy column, restricted to the ones
// still checked in the corresponding filter (see keptTokens and
// VisualizationView's groupBySelectedTokens) -- so a row the lenient
// composite-filter mode kept alive through one token never re-adds an
// excluded token as its own group here. Falls back to the shared "unknown"
// bucket when there's nothing left, same as the non-composite branch below.
const compositeGroupTokens = (item: DataRow): string[] => {
  const tokens = keptTokens(
    item[props.groupBy as string],
    props.groupBySelectedTokens,
  );
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
  const normalized =
    v === null || v === undefined || v === ""
      ? t("fomcharts.unknownGroup")
      : String(v);
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
  props.includeCustomInStats
    ? plottableData.value
    : plottableData.value.filter((item) => !isManualRow(item)),
);
const highlightedRows = computed(() =>
  props.highlightGroup !== null && props.groupBy
    ? statsEligibleRows.value.filter((item) =>
        matchesGroup(item, props.highlightGroup as string),
      )
    : statsEligibleRows.value,
);

const yValues = computed(() =>
  props.yAxis
    ? highlightedRows.value
        .map((item) => Number(item[props.yAxis as string]))
        .filter((v) => !isNaN(v))
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
  if (!(
    props.showTrend &&
    props.xAxisNumeric &&
    props.yAxisNumeric &&
    props.xAxis &&
    props.yAxis
  ))
    return null;
  const points = highlightedRows.value
    .map((item): [number, number] => [
      Number(item[props.xAxis as string]),
      Number(item[props.yAxis as string]),
    ])
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
      values.add(
        v === null || v === undefined || v === ""
          ? t("fomcharts.unknownGroup")
          : String(v),
      );
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
      const name =
        v === null || v === undefined || v === ""
          ? t("fomcharts.unknownGroup")
          : String(v);
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
    (a, b) =>
      (groupCounts.value[b] ?? 0) - (groupCounts.value[a] ?? 0) ||
      a.localeCompare(b),
  );
});

const { zoomLocked, zoomIn, zoomOut, resetZoom } = useFomChartZoom(chartRef);

// Turns this component's already-derived data model above into echarts
// series + legend name lists -- see useFomChartSeries.ts for point-building/
// item-style/grouping logic pulled out of what used to be this file's own
// chartOption computed.
const {
  seriesList,
  groupLegendNames,
  overlayLegendNames,
  sizeLegendFullText,
  sizeLegendNames,
  legendTooltipFormatter,
} = useFomChartSeries({
  props,
  t,
  palette,
  medianLineColor,
  legendColor,
  trendLineColor,
  manualPointBorderColor,
  hoverRingColor,
  plottableData,
  highlightedRows,
  medianValue,
  trendFit,
  previewPoint,
  groupValues,
  groupNamesByCount,
  isGroupingByCompositeColumn,
  compositeGroupTokens,
  matchesGroup,
  extraTooltipColumns,
  modeIdColumn,
  modeDescriptionColumn,
  isEditStatus,
  isPinnedRow,
  isHoveredRow,
  hasVisibleHoveredMatch,
  bubbleSizeFor,
  pointSizeLegend,
});

// Pinning a point is meant for comparing metrics across papers, not for
// re-reading the title (already one hover away in the tooltip) -- so the
// annotation carries the two plotted axes plus whatever secondary metrics
// (Sensitivity, Q-factor, ...) the tooltip itself already surfaces.
const handleChartClick = (params: any) => {
  if (
    params.componentType !== "series" ||
    !params.data ||
    params.data.refLabel === undefined
  )
    return;
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
// (Edit/Reset/Pin/Hide/Delete, same as DataPointsTable's row menu -- see
// PointActionsMenu in the template, shared by both) instead of acting
// immediately, so a stray right-click never silently drops a point with no
// way back (hidden rows come back via the DataPointsTable panel or the
// toolbar's Reset -- see VisualizationView). See
// composables/useFomChartContextMenu.ts.
const { contextMenuTarget, handleChartContextMenu } = useFomChartContextMenu();
const onContextMenuTogglePin = (row: DataRow) => {
  if (isPinnedRow(row)) emit("point-context-unpin", row);
  else emit("point-context-pin", row);
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
    const row = props.chartData.find(
      (r) => String(r.ref ?? r.Ref ?? "") === targetRef,
    );
    if (!inst || !row || !props.xAxis || !props.yAxis) return;
    const x: string | number = props.xAxisNumeric
      ? Number(row[props.xAxis])
      : ((row[props.xAxis] as string | number | undefined) ??
        t("fomcharts.unknownGroup"));
    const y: string | number = props.yAxisNumeric
      ? Number(row[props.yAxis])
      : ((row[props.yAxis] as string | number | undefined) ??
        t("fomcharts.unknownGroup"));
    const px = inst.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [
      x,
      y,
    ]) as unknown as number[] | undefined;
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

// Guide-only measurement/export API consumed by GuideTemplate.vue -- see
// composables/useFomChartGuideApi.ts. The returned function names are part
// of this component's defineExpose surface below and must not be renamed
// without updating GuideTemplate.vue too.
const guideApi = useFomChartGuideApi({
  chartRef,
  badgesRowRef,
  medianValue,
  sizeLegendFullText,
  showMedian: () => props.showMedian,
  showLegend: () => props.showLegend,
});

/** Downloads the current chart render as a PNG -- used by the workspace's
 * Export menu (the chart no longer carries its own "save as image" toolbox
 * icon; it was a redundant second way to do the same thing). */
const exportPng = (filename = "fom_chart.png") => {
  const url = guideApi.getPngDataUrl();
  if (!url) return;
  downloadDataUrl(url, filename);
};

defineExpose({
  exportPng,
  ...guideApi,
});

// Assembles the actual echarts option (title/legend/grid layout math, the
// tooltip formatter, axis config) off of seriesList/the legend name lists
// above -- see useFomChartOption.ts, split out of this file's own chartOption
// computed since axis/tooltip/legend assembly is a distinct concern from
// building the series themselves.
const { chartOption } = useFomChartOption({
  props,
  t,
  medianLineColor,
  legendColor,
  displayTitle,
  chartRef,
  seriesList,
  groupLegendNames,
  overlayLegendNames,
  sizeLegendNames,
  legendTooltipFormatter,
  trendFit,
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
