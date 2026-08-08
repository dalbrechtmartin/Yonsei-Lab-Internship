<template>
  <TooltipProvider :delay-duration="200">
    <CollapsibleSection v-model:open="open" :title="t('fomcharts.stats.title')">
      <div class="mt-2.5 flex flex-col gap-2.5">
        <div class="flex items-center gap-2 text-xs text-secondary">
          <span class="flex shrink-0 items-center gap-1">
            <InfoTooltip :text="t('fomcharts.tooltips.groupBy')" />
            {{ t("fomcharts.controls.groupBy") }}
          </span>
          <Select v-model="groupBySelectValue">
            <SelectTrigger size="sm" class="w-full min-w-0 bg-card">
              <SelectValue class="min-w-0 truncate" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem :value="NONE_VALUE">{{
                t("fomcharts.controls.none")
              }}</SelectItem>
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
        <div
          v-if="isCompositeGroupBy"
          class="flex items-center justify-between gap-2 text-xs"
        >
          <span class="flex items-center gap-1 text-ink">
            <InfoTooltip :text="t('fomcharts.tooltips.mergeMultiCategory')" />
            {{ t("fomcharts.controls.mergeMultiCategory") }}
          </span>
          <Switch v-model="mergeMultiCategoryPoints" />
        </div>

        <div class="h-px w-full bg-secondary/15" />

        <div
          class="flex min-w-0 flex-1 flex-col gap-1 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3"
        >
          <!-- Only worth the extra chrome once there are enough groups that
             scanning/scrolling the full list gets tedious -- with a handful
             of groups, the plain list below is already the fastest way to
             scan them. -->
          <label
            v-if="groups.length > VISIBLE_GROUP_LIMIT"
            class="relative mb-1 block"
          >
            <Search
              class="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="searchQuery"
              type="text"
              :placeholder="t('fomcharts.stats.searchPlaceholder')"
              class="h-7 bg-card pr-6.5 pl-6.5 text-[11.5px]"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute top-1/2 right-1.5 flex size-4 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
              :aria-label="t('fomcharts.pointsTable.clearSearch')"
              @click="searchQuery = ''"
            >
              <X class="size-3" />
            </button>
          </label>
          <p
            v-if="groups.length > 0 && filteredGroups.length === 0"
            class="px-1 py-2 text-center text-[11px] text-muted-foreground"
          >
            {{ t("fomcharts.stats.noMatch") }}
          </p>
          <!-- Capped + internally scrollable, same system as DataPointsTable's
             own group list (see its max-h-88 wrapper) -- otherwise "Show
             more" on a high-cardinality group-by (e.g. Base Materials) could
             render dozens of cards and grow this whole panel, and the
             Espace d'analyse card around it, well past the chart's height. -->
          <div
            class="flex max-h-88 flex-col gap-1 overflow-x-hidden overflow-y-auto"
          >
            <!-- Every group renders as a compact one-line row by default -- the full
             tile grid (or the low-N note) only shows once expanded via the
             chevron, so the panel stays scannable even with many groups. -->
            <div
              v-for="group in visibleGroups"
              :key="group.label"
              class="group flex flex-col gap-1 rounded-lg border-b border-secondary/10 px-2 pt-2 pb-2 last:border-0"
              :class="[
                groupBy && group.label === highlightGroup
                  ? 'bg-primary/10'
                  : '',
                highlightGroup && group.label !== highlightGroup
                  ? 'opacity-55'
                  : '',
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
                  <span
                    class="inline-block size-2.5 shrink-0 rounded-full"
                    :style="{ background: group.color }"
                  />
                  <span class="truncate">{{ group.label }}</span>
                  <InfoTooltip
                    v-if="groupBy"
                    :text="
                      group.label === highlightGroup
                        ? t('fomcharts.stats.isolateActive')
                        : t('fomcharts.stats.isolate')
                    "
                    :icon="Target"
                    :icon-class="[
                      'shrink-0 transition hover:text-secondary',
                      group.label === highlightGroup
                        ? 'text-primary'
                        : 'text-muted-foreground opacity-0 group-hover:opacity-100',
                    ]"
                  />
                </button>
                <div class="flex shrink-0 items-center gap-1.5">
                  <span class="font-mono text-[11px] text-muted-foreground"
                    >{{ group.tiles[0].label }}={{ group.tiles[0].value }}</span
                  >
                  <button
                    type="button"
                    class="text-muted-foreground transition hover:text-secondary"
                    :aria-label="
                      isExpanded(group.label)
                        ? t('fomcharts.stats.hideDetails')
                        : t('fomcharts.stats.showDetails')
                    "
                    @click="toggleExpanded(group.label)"
                  >
                    <ChevronDown
                      class="size-3.5 transition-transform duration-200"
                      :class="
                        isExpanded(group.label) ? 'rotate-0' : '-rotate-90'
                      "
                    />
                  </button>
                </div>
              </div>
              <div
                class="grid transition-[grid-template-rows] duration-250 ease-out"
                :style="{
                  gridTemplateRows: isExpanded(group.label) ? '1fr' : '0fr',
                }"
              >
                <div class="min-h-0 overflow-hidden">
                  <div class="pt-1 pl-4">
                    <div
                      v-if="group.tiles.length > 1"
                      class="grid grid-cols-2 gap-1.5"
                    >
                      <div
                        v-for="tile in group.tiles"
                        :key="tile.key"
                        class="rounded-md bg-white/60 px-2 py-1.5"
                      >
                        <div
                          class="flex items-center gap-1 text-[9.5px] tracking-wide text-muted-foreground uppercase"
                        >
                          <InfoTooltip :text="tile.tooltip" />
                          {{ tile.label }}
                        </div>
                        <div class="font-mono text-[13px] text-ink">
                          {{ tile.value }}
                        </div>
                      </div>
                    </div>
                    <p
                      v-else
                      class="text-[10.5px] italic text-muted-foreground"
                    >
                      {{ t("fomcharts.stats.lowN") }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <!-- Collapsed groups stay reachable without scrolling the whole list
             -- hidden only while the search box is empty (a search should
             never hide a match the researcher was specifically looking for,
             see visibleGroups/hiddenGroupsCount). -->
            <button
              v-if="
                hiddenGroupsCount > 0 ||
                (showAllGroups &&
                  groups.length > VISIBLE_GROUP_LIMIT &&
                  !searchQuery.trim())
              "
              type="button"
              class="mt-1 flex items-center justify-center gap-1 rounded-md px-2 py-1.5 text-[11px] font-medium text-secondary transition hover:bg-secondary/10 hover:text-ink"
              @click="showAllGroups = !showAllGroups"
            >
              <ChevronDown
                class="size-3 transition-transform duration-200"
                :class="showAllGroups ? 'rotate-180' : ''"
              />
              {{
                showAllGroups
                  ? t("fomcharts.stats.showLess")
                  : t("fomcharts.stats.showMore", { count: hiddenGroupsCount })
              }}
            </button>
          </div>
        </div>
      </div>
    </CollapsibleSection>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Search, Target, X } from "@lucide/vue";
import labTheme from "@/assets/themes/okabe-ito-palette.json";
import { computeStats, formatStat, extractUnit } from "@/utils/stats";
import { keptTokens, type DataRow } from "@/utils/columnTypes";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import { TooltipProvider } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    // Already filtered to rows with a plottable yAxis value — see
    // filterPlottable in utils/stats.ts, applied upstream in
    // VisualizationView so the stats here always match what the chart draws.
    rows: DataRow[];
    yAxis: string | null;
    // False when yAxis is a categorical column (e.g. Material Class) --
    // mean/median/σ are meaningless there, so tilesFor below shows n only.
    yAxisNumeric?: boolean;
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
  {
    compositeColumns: () => [],
    groupColorMap: () => ({}),
    groupBySelectedTokens: null,
    yAxisNumeric: true,
  },
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
const mergeMultiCategoryPoints = defineModel<boolean>(
  "mergeMultiCategoryPoints",
  { default: false },
);

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
const groupByOptions = computed(() =>
  props.groupByColumns.filter((col) => col !== props.xAxis),
);

// Whether the current selection is itself one of the tokenized composite
// columns -- gates the merge/split switch above, and reused below (as
// isCompositeGroup) by the groups computed for its own tokenizing logic.
const isCompositeGroupBy = computed(
  () => !!groupBy.value && props.compositeColumns.includes(groupBy.value),
);

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

  // n is a plain count -- no unit. mean/median/σ are actual measurements in
  // whatever unit the Y-axis column itself is in (e.g. "nm/RIU"), so they
  // carry that unit when the column name has one (see extractUnit).
  const unit = extractUnit(yAxis);
  const withUnit = (value: string) => (unit ? `${value} ${unit}` : value);

  // n is always just how many rows are in this group -- computed off the
  // rows themselves, not off however many of them happened to parse as a
  // number, so a categorical Y (where none of them do) doesn't read as an
  // empty group. mean/median/σ stay numeric-only: meaningless for a
  // category axis, so a categorical Y shows n alone, same as a numeric Y
  // with too few points for MIN_STATS_N to bother with real statistics.
  const tilesFor = (rows: DataRow[]) => {
    const nTile = {
      key: "n",
      label: t("fomcharts.stats.n"),
      tooltip: t("fomcharts.stats.tooltips.n"),
      value: String(rows.length),
    };
    if (!props.yAxisNumeric || rows.length < MIN_STATS_N || !yAxis)
      return [nTile];
    const stats = computeStats(
      rows.map((row) => Number(row[yAxis])).filter((v) => !isNaN(v)),
    );
    return [
      nTile,
      {
        key: "mean",
        label: t("fomcharts.stats.mean"),
        tooltip: t("fomcharts.stats.tooltips.mean"),
        value: withUnit(formatStat(stats.mean)),
      },
      {
        key: "median",
        label: t("fomcharts.stats.median"),
        tooltip: t("fomcharts.stats.tooltips.median"),
        value: withUnit(formatStat(stats.median)),
      },
      {
        key: "std",
        label: t("fomcharts.stats.std"),
        tooltip: t("fomcharts.stats.tooltips.std"),
        value: withUnit(formatStat(stats.std)),
      },
    ];
  };

  const groupByCol = groupBy.value;
  if (!groupByCol) {
    return [
      {
        label: t("fomcharts.stats.all"),
        color: palette[0],
        tiles: tilesFor(props.rows),
      },
    ];
  }

  // Ranked most-populous-first (alphabetical tiebreak) rather than plain
  // alphabetical -- this order is what decides which groups stay visible by
  // default once there are more than VISIBLE_GROUP_LIMIT of them (see
  // visibleGroups below), so the ones collapsed away are consistently the
  // rarest, least-informative ones rather than an arbitrary alphabetical
  // tail. The idx-based palette fallback below only ever matters for a
  // label groupColorMap doesn't cover, so re-ordering it doesn't change any
  // color actually shown in practice.
  const rank = (entries: { label: string; rows: DataRow[] }[]) =>
    [...entries]
      .sort(
        (a, b) =>
          b.rows.length - a.rows.length || a.label.localeCompare(b.label),
      )
      .map(({ label, rows }, idx) => ({
        label,
        color: props.groupColorMap[label] ?? palette[idx % palette.length],
        tiles: tilesFor(rows),
      }));

  if (isCompositeGroupBy.value) {
    // keptTokens (not the raw cell) so a token excluded via the lenient
    // composite-filter mode never re-appears as its own card here just
    // because a surviving row still carries it -- see FomChart's identical
    // compositeGroupTokens and VisualizationView's groupBySelectedTokens.
    const rowTokens = (row: DataRow) =>
      keptTokens(row[groupByCol], props.groupBySelectedTokens);
    const labels = Array.from(new Set(props.rows.flatMap(rowTokens)));
    return rank(
      labels.map((label) => ({
        label,
        rows: props.rows.filter((row) => rowTokens(row).includes(label)),
      })),
    );
  }

  const labelFor = (row: DataRow) => {
    const v = row[groupByCol];
    return v === null || v === undefined || v === ""
      ? t("fomcharts.unknownGroup")
      : String(v);
  };
  const labels = Array.from(new Set(props.rows.map(labelFor)));

  return rank(
    labels.map((label) => ({
      label,
      rows: props.rows.filter((row) => labelFor(row) === label),
    })),
  );
});

// Search + collapse-beyond-N only earn their place once there are enough
// groups that the plain list becomes tedious to scan/scroll (see the
// template's own v-if gating the search box) -- VISIBLE_GROUP_LIMIT matches
// FomChart's own on-chart-legend cap (MAX_INLINE_GROUP_LEGEND) so both
// surface the same "top groups" by default.
const VISIBLE_GROUP_LIMIT = 6;
const searchQuery = ref("");
// Local, ephemeral UI state -- reset per mount, not worth lifting to the
// parent (same reasoning as expandedGroup above).
const showAllGroups = ref(false);

const filteredGroups = computed(() => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return groups.value;
  return groups.value.filter((g) => g.label.toLowerCase().includes(q));
});

// A search is always shown in full -- collapsing search RESULTS would hide
// the exact group a researcher typed a name to find, defeating the point of
// searching in the first place. The collapse only ever applies to the
// unfiltered, full list.
const visibleGroups = computed(() => {
  if (
    searchQuery.value.trim() ||
    showAllGroups.value ||
    filteredGroups.value.length <= VISIBLE_GROUP_LIMIT
  ) {
    return filteredGroups.value;
  }
  return filteredGroups.value.slice(0, VISIBLE_GROUP_LIMIT);
});

const hiddenGroupsCount = computed(() =>
  searchQuery.value.trim()
    ? 0
    : Math.max(0, filteredGroups.value.length - visibleGroups.value.length),
);

// A stale search string surviving a groupBy switch could otherwise silently
// hide every card with no way back -- if the new column has few enough
// values that the search box itself no longer renders (see the template's
// own VISIBLE_GROUP_LIMIT gate), the leftover query would keep filtering
// filteredGroups down to nothing behind a search box the researcher can no
// longer see or clear.
watch(groupBy, () => {
  searchQuery.value = "";
  showAllGroups.value = false;
});
</script>
