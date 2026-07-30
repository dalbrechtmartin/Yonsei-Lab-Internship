<template>
  <TooltipProvider :delay-duration="200">
    <CollapsibleSection v-model:open="open" :title="t('fomcharts.stats.title')">
      <div class="mt-2.5 flex flex-col gap-2.5">
        <div class="flex items-center gap-2 text-xs text-secondary">
          <span class="flex shrink-0 items-center gap-1">
            {{ t("fomcharts.controls.groupBy") }}
            <InfoTooltip :text="t('fomcharts.tooltips.groupBy')" />
          </span>
          <Select v-model="groupBySelectValue">
            <SelectTrigger size="sm" class="w-full min-w-0 bg-card">
              <SelectValue class="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE_VALUE">{{ t("fomcharts.controls.none") }}</SelectItem>
              <SelectItem v-for="col in groupByOptions" :key="col" :value="col">
                {{ col }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <!-- Only meaningful once grouping by a composite column (Material
             Class/Base Materials) -- that's the only case where a single row
             can land in more than one card/group at once, so it's the only
             case a "merge" choice actually changes anything on the chart. -->
        <div v-if="isCompositeGroupBy" class="flex items-center justify-between gap-2 text-xs">
          <span class="flex items-center gap-1 text-ink">
            {{ t("fomcharts.controls.mergeMultiCategory") }}
            <InfoTooltip :text="t('fomcharts.tooltips.mergeMultiCategory')" />
          </span>
          <Switch v-model="mergeMultiCategoryPoints" />
        </div>

        <div class="h-px w-full bg-secondary/15" />

        <div class="flex min-w-0 flex-1 flex-col gap-1 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
        <!-- Every group renders as a compact one-line row by default -- the full
             tile grid (or the low-N note) only shows once expanded via the
             chevron, so the panel stays scannable even with many groups. -->
        <div
          v-for="group in groups"
          :key="group.label"
          class="group flex flex-col gap-1 rounded-lg border-b border-secondary/10 px-2 pt-2 pb-2 last:border-0"
          :class="[
            groupBy && group.label === highlightGroup ? 'bg-primary/10' : '',
            highlightGroup && group.label !== highlightGroup ? 'opacity-55' : '',
          ]"
        >
          <div class="flex items-center justify-between gap-2">
            <button
              type="button"
              :disabled="!groupBy"
              class="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-semibold text-ink disabled:cursor-default"
              :class="groupBy ? 'cursor-pointer' : ''"
              @click="groupBy && $emit('toggle-highlight', group.label)"
            >
              <span class="inline-block size-2.5 shrink-0 rounded-full" :style="{ background: group.color }" />
              <span class="truncate">{{ group.label }}</span>
              <InfoTooltip
                v-if="groupBy"
                :text="group.label === highlightGroup ? t('fomcharts.stats.isolateActive') : t('fomcharts.stats.isolate')"
                :icon="Target"
                :icon-class="[
                  'shrink-0 transition hover:text-secondary',
                  group.label === highlightGroup ? 'text-primary' : 'text-muted-foreground opacity-0 group-hover:opacity-100',
                ]"
              />
            </button>
            <div class="flex shrink-0 items-center gap-1.5">
              <span class="font-mono text-[11px] text-muted-foreground">{{ group.tiles[0].label }}={{ group.tiles[0].value }}</span>
              <button
                type="button"
                class="text-muted-foreground transition hover:text-secondary"
                :aria-label="isExpanded(group.label) ? t('fomcharts.stats.hideDetails') : t('fomcharts.stats.showDetails')"
                @click="toggleExpanded(group.label)"
              >
                <ChevronDown
                  class="size-3.5 transition-transform duration-200"
                  :class="isExpanded(group.label) ? 'rotate-0' : '-rotate-90'"
                />
              </button>
            </div>
          </div>
          <div
            class="grid transition-[grid-template-rows] duration-250 ease-out"
            :style="{ gridTemplateRows: isExpanded(group.label) ? '1fr' : '0fr' }"
          >
            <div class="min-h-0 overflow-hidden">
              <div class="pt-1 pl-4">
                <div v-if="group.tiles.length > 1" class="grid grid-cols-2 gap-1.5">
                  <div v-for="tile in group.tiles" :key="tile.key" class="rounded-md bg-white/60 px-2 py-1.5">
                    <div class="flex items-center gap-1 text-[9.5px] tracking-wide text-muted-foreground uppercase">
                      {{ tile.label }}
                      <InfoTooltip :text="tile.tooltip" />
                    </div>
                    <div class="font-mono text-[13px] text-ink">{{ tile.value }}</div>
                  </div>
                </div>
                <p v-else class="text-[10.5px] italic text-muted-foreground">
                  {{ t("fomcharts.stats.lowN") }}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </CollapsibleSection>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Target } from "@lucide/vue";
import labTheme from "@/assets/themes/okabe-ito-palette.json";
import { computeStats, formatStat, extractUnit } from "@/utils/stats";
import { keptTokens, type DataRow } from "@/utils/columnTypes";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    // Already filtered to rows with a plottable (numeric) yAxis value — see
    // filterPlottable in utils/stats.ts, applied upstream in
    // VisualizationView so the stats here always match what the chart draws.
    rows: DataRow[];
    yAxis: string | null;
    // Columns eligible for "Group / Color by" (already capped to
    // low-cardinality columns, plus composite/Mode ID exemptions -- see
    // VisualizationView's groupByColumns).
    groupByColumns: string[];
    // The current X-axis column -- picking the same column for group-by
    // just repeats the X-axis labels as a legend, so it's excluded from
    // groupByOptions below.
    xAxis: string | null;
    // Clicking a group card (only enabled when groupBy is set) toggles this,
    // isolating that group on the chart — see VisualizationView, which owns
    // the ref and also passes it to FomChart for the actual dimming.
    highlightGroup: string | null;
    // Composite column names (Material Class, Base Materials), if the sheet
    // has them -- when groupBy matches one, composite cells
    // ("Dielectric;Metal") must be split into their individual tokens the
    // same way FomChart does (see isGroupingByCompositeColumn there), or
    // these cards would show raw combinations as their own groups while the
    // chart's legend shows the clean, split-out values.
    compositeColumns?: string[];
    // Fixed label -> color assignment from VisualizationView (see
    // utils/palette.ts) -- keeps a group's card color identical to its
    // dot/legend color on the chart, and stable across filter changes.
    groupColorMap?: Record<string, string>;
    // The filter chip selection governing groupBy's tokens (Material Class
    // or Base Materials), or null when groupBy isn't composite -- see
    // VisualizationView's groupBySelectedTokens and FomChart's identical use
    // of it. Keeps a token excluded via the lenient composite-filter mode
    // from re-appearing as its own card here just because a surviving row
    // still carries it.
    groupBySelectedTokens?: string[] | null;
  }>(),
  { compositeColumns: () => [], groupColorMap: () => ({}), groupBySelectedTokens: null },
);
defineEmits<{
  "toggle-highlight": [group: string];
}>();

const open = defineModel<boolean>("open", { default: true });
const groupBy = defineModel<string | null>("groupBy", { default: null });
// Renders a row with several kept tokens as a single merged marker on the
// chart instead of one duplicate point per token -- see FomChart's
// isGroupingByCompositeColumn and mergeMultiCategoryPoints. Lives here
// rather than in GraphControls' generic Display section since it's only
// ever relevant right next to the "Group / Color by" choice that decides
// whether it does anything at all.
const mergeMultiCategoryPoints = defineModel<boolean>("mergeMultiCategoryPoints", { default: false });

// The shadcn/Reka Select has no native concept of a null value (unlike a
// plain <option :value="null">, which Vue's v-model specifically supports
// on native <select>) -- so "no group-by column" is represented by this
// sentinel string in the Select itself, and translated back to/from the
// real null-based groupBy model just below.
const NONE_VALUE = "__none__";
const groupBySelectValue = computed<string>({
  get: () => groupBy.value ?? NONE_VALUE,
  set: (value) => {
    groupBy.value = value === NONE_VALUE ? null : value;
  },
});

// Group-by exists to split points into color categories *distinct* from
// their X-axis position — picking the same column for both just repeats
// the X-axis labels as a legend and adds nothing. groupByColumns (from
// VisualizationView) is already capped to low-cardinality columns so the
// palette never has to repeat colors; excluding the current X-axis choice
// on top of that stops the redundant, chart-cluttering combination too.
const groupByOptions = computed(() => props.groupByColumns.filter((col) => col !== props.xAxis));

// Whether the current selection is itself one of the tokenized composite
// columns -- gates the merge/split switch above, and reused below (as
// isCompositeGroup) by the groups computed for its own tokenizing logic.
const isCompositeGroupBy = computed(() => !!groupBy.value && props.compositeColumns.includes(groupBy.value));

// If the X-axis changes onto the current group-by column, or the group-by
// column stops qualifying (e.g. a Domain/Origin filter change pushes its
// cardinality over the cap), fall back to "None" instead of silently
// keeping an invalid/misleading selection.
watch(
  () => [props.xAxis, groupByOptions.value] as const,
  ([, options]) => {
    if (groupBy.value && !options.includes(groupBy.value)) {
      groupBy.value = null;
    }
  },
);

// Each group row collapses its tile grid (or low-N note) behind an expand
// toggle. Accordion behavior -- opening one closes whichever was open --
// keeps the panel from growing tall enough to force a long scroll once
// there are many groups; matches the same single-open-at-a-time pattern
// used elsewhere (GraphControls' sections, the right sidebar panels).
// Local, ephemeral UI state, not worth lifting to the parent.
const expandedGroup = ref<string | null>(null);
const isExpanded = (label: string) => expandedGroup.value === label;
const toggleExpanded = (label: string) => {
  expandedGroup.value = expandedGroup.value === label ? null : label;
};

const palette: string[] = labTheme.theme.color;

// Mean/median/std of 1-2 points aren't statistics, they're just those
// points -- below this count, a card shows N only instead of three tiles
// that look precise but don't mean anything. High-cardinality groupings
// (e.g. Base Materials) hit this constantly, since most materials only
// appear in a handful of records.
const MIN_STATS_N = 3;

const groups = computed(() => {
  const yAxis = props.yAxis;
  const values = (rows: DataRow[]) =>
    yAxis ? rows.map((row) => Number(row[yAxis])).filter((v) => !isNaN(v)) : [];

  // n is a plain count -- no unit. mean/median/σ are actual measurements in
  // whatever unit the Y-axis column itself is in (e.g. "nm/RIU"), so they
  // carry that unit when the column name has one (see extractUnit).
  const unit = extractUnit(yAxis);
  const withUnit = (value: string) => (unit ? `${value} ${unit}` : value);

  const tilesFor = (stats: ReturnType<typeof computeStats>) => {
    const nTile = { key: "n", label: t("fomcharts.stats.n"), tooltip: t("fomcharts.stats.tooltips.n"), value: String(stats.n) };
    if (stats.n < MIN_STATS_N) return [nTile];
    return [
      nTile,
      { key: "mean", label: t("fomcharts.stats.mean"), tooltip: t("fomcharts.stats.tooltips.mean"), value: withUnit(formatStat(stats.mean)) },
      {
        key: "median",
        label: t("fomcharts.stats.median"),
        tooltip: t("fomcharts.stats.tooltips.median"),
        value: withUnit(formatStat(stats.median)),
      },
      { key: "std", label: t("fomcharts.stats.std"), tooltip: t("fomcharts.stats.tooltips.std"), value: withUnit(formatStat(stats.std)) },
    ];
  };

  const groupByCol = groupBy.value;
  if (!groupByCol) {
    return [
      {
        label: t("fomcharts.stats.all"),
        color: palette[0],
        tiles: tilesFor(computeStats(values(props.rows))),
      },
    ];
  }

  if (isCompositeGroupBy.value) {
    // keptTokens (not the raw cell) so a token excluded via the lenient
    // composite-filter mode never re-appears as its own card here just
    // because a surviving row still carries it -- see FomChart's identical
    // compositeGroupTokens and VisualizationView's groupBySelectedTokens.
    const rowTokens = (row: DataRow) => keptTokens(row[groupByCol], props.groupBySelectedTokens);
    const labels = Array.from(new Set(props.rows.flatMap(rowTokens))).sort();
    return labels.map((label, idx) => ({
      label,
      color: props.groupColorMap[label] ?? palette[idx % palette.length],
      tiles: tilesFor(computeStats(values(props.rows.filter((row) => rowTokens(row).includes(label))))),
    }));
  }

  const labelFor = (row: DataRow) => {
    const v = row[groupByCol];
    return v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
  };
  const labels = Array.from(new Set(props.rows.map(labelFor))).sort();

  return labels.map((label, idx) => ({
    label,
    color: props.groupColorMap[label] ?? palette[idx % palette.length],
    tiles: tilesFor(computeStats(values(props.rows.filter((row) => labelFor(row) === label)))),
  }));
});
</script>
