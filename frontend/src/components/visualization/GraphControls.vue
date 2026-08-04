<template>
  <TooltipProvider :delay-duration="200">
    <aside class="flex w-full flex-col gap-3.5 lg:w-56 lg:shrink-0">
      <CollapsibleSection v-model:open="chartSectionOpen" :title="t('fomcharts.sections.chart')">
        <div class="mt-2.5 flex flex-col gap-2.5 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.title") }}
            <span class="relative">
              <Input
                v-model="chartTitle"
                type="text"
                :placeholder="titlePlaceholder"
                class="h-auto bg-card py-1.5 pr-7 pl-2 text-sm text-ink"
                @input="titleIsAuto = false"
              />
              <button
                v-if="chartTitle"
                type="button"
                class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
                :aria-label="t('fomcharts.controls.clearTitle')"
                @click="clearTitle"
              >
                <X class="size-3.5" />
              </button>
            </span>
          </label>

          <AxisSelector
            v-model:y-axis="yAxis"
            v-model:x-axis="xAxis"
            v-model:linked="axisLinked"
            :numeric-columns="numericColumns"
            :categorical-columns="categoricalColumns"
          />

        </div>
      </CollapsibleSection>

      <div class="h-px bg-secondary/10" />

      <CollapsibleSection v-model:open="displaySectionOpen" :title="t('fomcharts.sections.display')">
        <div class="mt-2.5 flex flex-col gap-3 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="scaleDisabled ? 'text-muted-foreground' : 'text-secondary'">
              <InfoTooltip :text="t('fomcharts.tooltips.scale')" />
              {{ t("fomcharts.scale.label") }}
            </span>
            <div class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                :disabled="scaleDisabled"
                class="rounded-none text-[11.5px] hover:bg-primary/10"
                :class="scale === 'log' ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-secondary'"
                @click="scale = 'log'"
              >
                {{ t("fomcharts.scale.log") }}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                :disabled="scaleDisabled"
                class="rounded-none text-[11.5px] hover:bg-primary/10"
                :class="scale === 'value' ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-secondary'"
                @click="scale = 'value'"
              >
                {{ t("fomcharts.scale.linear") }}
              </Button>
            </div>
          </div>

          <div class="h-px bg-secondary/10" />

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="trendDisabled ? 'text-muted-foreground' : 'text-ink'">
              <InfoTooltip :text="t('fomcharts.tooltips.trendLine')" />
              {{ t("fomcharts.controls.trendLine") }}
            </span>
            <Switch v-model="showTrend" :disabled="trendDisabled" />
          </div>

          <label v-if="showTrend && !trendDisabled" class="flex flex-col gap-1 pl-1 text-xs text-secondary">
            {{ t("fomcharts.controls.trendType") }}
            <Select v-model="trendType">
              <SelectTrigger size="sm" class="w-full min-w-0 bg-card">
                <SelectValue class="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">{{ t("fomcharts.trendType.auto") }}</SelectItem>
                <SelectItem value="linear">{{ t("fomcharts.trendType.linear") }}</SelectItem>
                <SelectItem value="exponential">{{ t("fomcharts.trendType.exponential") }}</SelectItem>
                <SelectItem value="logarithmic">{{ t("fomcharts.trendType.logarithmic") }}</SelectItem>
                <SelectItem value="power">{{ t("fomcharts.trendType.power") }}</SelectItem>
                <SelectItem value="polynomial">{{ t("fomcharts.trendType.polynomial") }}</SelectItem>
              </SelectContent>
            </Select>
          </label>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="paretoDisabled ? 'text-muted-foreground' : 'text-ink'">
              <InfoTooltip :text="t('fomcharts.tooltips.pareto')" />
              {{ t("fomcharts.controls.pareto") }}
            </span>
            <Switch v-model="showPareto" :disabled="paretoDisabled" />
          </div>
          <!-- Trend line and Pareto share the same precondition (numeric X
               and Y axes) -- one shared hint instead of repeating the same
               sentence under each toggle. -->
          <Alert v-if="trendDisabled" variant="info" class="gap-1.5 py-1.5">
            <Info class="size-3.5" />
            <AlertDescription class="text-[10.5px] text-ink/80">
              {{ t("fomcharts.controls.trendLineHint") }}
            </AlertDescription>
          </Alert>

          <div class="h-px bg-secondary/10" />

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="legendDisabled ? 'text-muted-foreground' : 'text-ink'">
              <InfoTooltip :text="t('fomcharts.tooltips.legend')" />
              {{ t("fomcharts.legend.toggle") }}
            </span>
            <Switch v-model="showLegend" :disabled="legendDisabled" />
          </div>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="medianDisabled ? 'text-muted-foreground' : 'text-ink'">
              <InfoTooltip :text="t('fomcharts.tooltips.median')" />
              {{ t("fomcharts.medianLine.toggle") }}
            </span>
            <Switch v-model="showMedian" :disabled="medianDisabled" />
          </div>

          <div class="h-px bg-secondary/10" />

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <span class="flex items-center gap-1 text-xs" :class="pointSizeMode === 'byValue' ? 'text-ink' : 'text-secondary'">
                <InfoTooltip :text="t('fomcharts.tooltips.pointSizeMode')" />
                {{ t("fomcharts.controls.pointSizeByValue") }}
              </span>
              <Switch :model-value="pointSizeMode === 'byValue'" @update:model-value="togglePointSizeMode" />
            </div>

            <label v-if="pointSizeMode === 'byValue' && numericColumns.length > 0" class="flex flex-col gap-1 pl-1 text-xs text-secondary">
              {{ t("fomcharts.controls.pointSizeBy") }}
              <Select v-model="pointSizeBy">
                <SelectTrigger size="sm" class="w-full min-w-0 bg-card">
                  <SelectValue class="min-w-0 truncate" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="col in numericColumns" :key="col" :value="col">{{ formatUnitSuperscripts(col) }}</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <div class="flex flex-col gap-1.5">
              <span class="flex items-center justify-between text-xs text-secondary">
                <span class="flex items-center gap-1">
                  <InfoTooltip :text="t('fomcharts.tooltips.pointSize')" />
                  {{ t("fomcharts.controls.pointSize") }}
                </span>
                <span class="font-mono text-[10.5px] text-muted-foreground">{{ pointSize }}px</span>
              </span>
              <Slider :model-value="[pointSize]" :min="POINT_SIZE_MIN" :max="POINT_SIZE_MAX" :step="1" @update:model-value="setPointSize" />
            </div>
          </div>

        </div>
      </CollapsibleSection>

      <template v-if="domainColumn || originColumn || materialClassColumn || baseMaterialsColumn || needsReviewColumn">
        <div class="h-px bg-secondary/10" />

        <CollapsibleSection v-model:open="filtersSectionOpen" :title="t('fomcharts.sections.filters')">
          <div class="mt-2.5 flex flex-col gap-3 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
            <template v-if="needsReviewColumn && needsReviewCount > 0">
              <div class="flex items-center justify-between gap-2">
                <span class="flex items-center gap-1 text-xs text-ink">
                  <InfoTooltip :text="t('fomcharts.tooltips.excludeNeedsReview')" />
                  {{ t("fomcharts.filters.excludeNeedsReview", { count: needsReviewCount }) }}
                </span>
                <Switch v-model="excludeNeedsReview" />
              </div>
              <div class="h-px bg-secondary/10" />
            </template>

            <!-- Stacked one-per-row, not the wireframe's 2x2 grid -- this
                 sidebar column is a fixed 224px (lg:w-56), noticeably
                 narrower than the 288px wireframe mockup assumed, and French
                 labels like "Matériaux de base (7)" have nowhere left to
                 breathe in a half-width cell. -->
            <div class="flex flex-col gap-1.5">
              <FilterDropdown
                v-if="domainColumn && domainValues.length > 0"
                v-model:selected="selectedDomains"
                :label="t('fomcharts.filters.domain')"
                :values="domainValues"
                :counts="domainCounts"
              />
              <FilterDropdown
                v-if="originColumn && originValues.length > 0"
                v-model:selected="selectedOrigins"
                :label="t('fomcharts.filters.origin')"
                :values="originValues"
                :counts="originCounts"
              />
              <FilterDropdown
                v-if="materialClassColumn && materialClassValues.length > 0"
                v-model:selected="selectedMaterialClasses"
                :label="t('fomcharts.filters.materialClass')"
                :values="materialClassValues"
                :counts="materialClassCounts"
              />
              <FilterDropdown
                v-if="baseMaterialsColumn && baseMaterialsValues.length > 0"
                v-model:selected="selectedBaseMaterials"
                :label="t('fomcharts.filters.baseMaterials')"
                :values="baseMaterialsValues"
                :counts="baseMaterialsCounts"
              />
            </div>

            <!-- Sits directly below the category list and above the active-
                 filter chips -- only the tokenized composite columns
                 (Material Class, Base Materials) have an "exclude some but
                 not all tokens" question to answer. Stacked (label above a
                 full-width segmented control) rather than side-by-side --
                 "Mode d'exclusion" plus both option labels don't fit on one
                 row at this sidebar's width without cropping the buttons
                 (see FilterDropdown's own single-column layout, same
                 constraint). -->
            <template v-if="materialClassColumn || baseMaterialsColumn">
              <div class="h-px bg-secondary/10" />

              <div class="flex flex-col gap-1.5">
                <span class="flex items-center gap-1 text-xs font-semibold text-secondary">
                  <InfoTooltip :text="t('fomcharts.tooltips.exclusionMode')" />
                  {{ t("fomcharts.filters.exclusionMode.label") }}
                </span>
                <div class="inline-flex w-full overflow-hidden rounded-lg border border-secondary/20 bg-card">
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class="flex-1 rounded-none text-[11.5px] hover:bg-primary/10"
                    :class="compositeFilterMode === 'strict' ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-secondary'"
                    @click="compositeFilterMode = 'strict'"
                  >
                    {{ t("fomcharts.filters.exclusionMode.strict") }}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    class="flex-1 rounded-none text-[11.5px] hover:bg-primary/10"
                    :class="compositeFilterMode === 'lenient' ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground' : 'text-secondary'"
                    @click="compositeFilterMode = 'lenient'"
                  >
                    {{ t("fomcharts.filters.exclusionMode.lenient") }}
                  </Button>
                </div>
              </div>
            </template>

            <!-- One chip per available category, always -- either an
                 informational "All X" summary (dashed, no remove button)
                 when nothing's excluded, or one removable chip per value
                 still checked once the category is narrowed down. Each
                 removable chip's × reuses the same toggle as its checkbox
                 in the popover above. -->
            <div v-if="activeFilterChips.length > 0" class="flex flex-wrap gap-1.5 border-t border-dashed border-secondary/20 pt-2.5">
              <span
                v-for="chip in activeFilterChips"
                :key="chip.key"
                class="inline-flex max-w-full items-center gap-1 rounded-md py-1 text-[11px] font-medium"
                :class="
                  chip.onRemove
                    ? 'border border-secondary/20 bg-card pr-1 pl-2 text-ink'
                    : 'border border-dashed border-secondary/30 px-2 text-muted-foreground'
                "
              >
                <span class="truncate">{{ chip.label }}</span>
                <button
                  v-if="chip.onRemove"
                  type="button"
                  class="flex size-4 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10"
                  :aria-label="t('fomcharts.filters.remove', { label: chip.label })"
                  @click="chip.onRemove"
                >
                  <X class="size-2.5" />
                </button>
              </span>
            </div>
          </div>
        </CollapsibleSection>
      </template>
    </aside>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Info, X } from "@lucide/vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import FilterDropdown from "@/components/visualization/FilterDropdown.vue";
import AxisSelector from "@/components/visualization/AxisSelector.vue";
import { formatUnitSuperscripts, findFomValueColumn } from "@/utils/columnTypes";
import type { TrendType } from "@/utils/stats";

const POINT_SIZE_MIN = 6;
const POINT_SIZE_MAX = 28;

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    numericColumns: string[];
    categoricalColumns: string[];
    domainColumn?: string | null;
    domainValues?: string[];
    domainCounts?: Record<string, number>;
    originColumn?: string | null;
    originValues?: string[];
    originCounts?: Record<string, number>;
    materialClassColumn?: string | null;
    materialClassValues?: string[];
    materialClassCounts?: Record<string, number>;
    baseMaterialsColumn?: string | null;
    baseMaterialsValues?: string[];
    baseMaterialsCounts?: Record<string, number>;
    // Review status column name, if the sheet has one -- gates the "hide
    // points needing review" filter row (see needsReviewCount below).
    needsReviewColumn?: string | null;
    needsReviewCount?: number;
    // True when the chart's legend would have nothing to show (no group-by,
    // and no numeric-axis trend/Pareto overlay active) -- see
    // VisualizationView's hasLegendContent.
    legendDisabled?: boolean;
  }>(),
  {
    domainColumn: null,
    domainValues: () => [],
    domainCounts: () => ({}),
    originColumn: null,
    originValues: () => [],
    originCounts: () => ({}),
    materialClassColumn: null,
    materialClassValues: () => [],
    materialClassCounts: () => ({}),
    baseMaterialsColumn: null,
    baseMaterialsValues: () => [],
    baseMaterialsCounts: () => ({}),
    needsReviewColumn: null,
    needsReviewCount: 0,
    legendDisabled: false,
  },
);

// defineModel replaces the old prop+emit('update:x') boilerplate: each of
// these is a real two-way v-model from the parent (VisualizationView).
const yAxis = defineModel<string | null>("yAxis");
const xAxis = defineModel<string | null>("xAxis");
// AxisSelector's 🔗 toggle -- true (default) keeps the collision-avoidance
// swap below active; toggled off, X and Y are free to both point at the
// same column.
const axisLinked = defineModel<boolean>("axisLinked", { default: true });

// Neither axis Select excludes the other's current value (X and Y draw
// from overlapping/different column lists, so a name-based exclusion
// would be awkward) -- picking the same column on both would otherwise
// just plot a meaningless Y=X diagonal. Instead of forbidding it, swap:
// picking Y = the current X moves the old Y onto X (and vice versa), so
// the two axes always land on two different columns. Gated on axisLinked
// so AxisSelector's "independent" mode can deliberately allow the overlap.
watch(xAxis, (newX, oldX) => {
  if (axisLinked.value && newX !== null && newX === yAxis.value) yAxis.value = oldX ?? null;
});
watch(yAxis, (newY, oldY) => {
  if (axisLinked.value && newY !== null && newY === xAxis.value) xAxis.value = oldY ?? null;
});
const scale = defineModel<"log" | "value">("scale", { default: "log" });
const chartTitle = defineModel<string>("chartTitle", { default: "" });
// True while chartTitle auto-fills from the axes (see VisualizationView's
// autoChartTitle) -- flipped off by either typing (the @input handler on
// the Input below) or explicitly clearing (clearTitle), so neither is ever
// silently overwritten by the next axis change.
const titleIsAuto = defineModel<boolean>("titleIsAuto", { default: true });
const clearTitle = () => {
  chartTitle.value = "";
  titleIsAuto.value = false;
};
const showLegend = defineModel<boolean>("showLegend", { default: true });
const showMedian = defineModel<boolean>("showMedian", { default: false });
const showTrend = defineModel<boolean>("showTrend", { default: false });
const trendType = defineModel<TrendType | "auto">("trendType", { default: "auto" });
const selectedDomains = defineModel<string[]>("selectedDomains", {
  default: () => [],
});
const selectedOrigins = defineModel<string[]>("selectedOrigins", {
  default: () => [],
});
const selectedMaterialClasses = defineModel<string[]>("selectedMaterialClasses", {
  default: () => [],
});
const selectedBaseMaterials = defineModel<string[]>("selectedBaseMaterials", {
  default: () => [],
});
const compositeFilterMode = defineModel<"strict" | "lenient">("compositeFilterMode", { default: "lenient" });
const showPareto = defineModel<boolean>("showPareto", { default: false });
const excludeNeedsReview = defineModel<boolean>("excludeNeedsReview", { default: false });
const pointSizeMode = defineModel<"constant" | "byValue">("pointSizeMode", { default: "constant" });
const pointSizeBy = defineModel<string | null>("pointSizeBy", { default: null });
const pointSize = defineModel<number>("pointSize", { default: 16 });
// Best-guess measure for "Taille selon une mesure" the moment it's switched
// on: the axis actually being plotted is the most relevant quantity to size
// by, so prefer Y (the chart's primary measure) then X, before falling back
// to a FOM-like column or just the first numeric column. Only fires when
// pointSizeBy isn't already a valid choice, so re-toggling off/on preserves
// a researcher's own pick.
const guessPointSizeBy = (): string | null => {
  if (yAxis.value && props.numericColumns.includes(yAxis.value)) return yAxis.value;
  if (xAxis.value && props.numericColumns.includes(xAxis.value)) return xAxis.value;
  return findFomValueColumn(props.numericColumns) ?? props.numericColumns[0] ?? null;
};
const togglePointSizeMode = (byValue: boolean) => {
  pointSizeMode.value = byValue ? "byValue" : "constant";
  if (byValue && (!pointSizeBy.value || !props.numericColumns.includes(pointSizeBy.value))) {
    pointSizeBy.value = guessPointSizeBy();
  }
};
const setPointSize = (value: number[] | undefined) => {
  if (value && value[0] !== undefined) pointSize.value = value[0];
};

const toggleDomain = (val: string) => {
  selectedDomains.value = selectedDomains.value.includes(val)
    ? selectedDomains.value.filter((v) => v !== val)
    : [...selectedDomains.value, val];
};
const toggleOrigin = (val: string) => {
  selectedOrigins.value = selectedOrigins.value.includes(val)
    ? selectedOrigins.value.filter((v) => v !== val)
    : [...selectedOrigins.value, val];
};
const toggleMaterialClass = (val: string) => {
  selectedMaterialClasses.value = selectedMaterialClasses.value.includes(val)
    ? selectedMaterialClasses.value.filter((v) => v !== val)
    : [...selectedMaterialClasses.value, val];
};
const toggleBaseMaterial = (val: string) => {
  selectedBaseMaterials.value = selectedBaseMaterials.value.includes(val)
    ? selectedBaseMaterials.value.filter((v) => v !== val)
    : [...selectedBaseMaterials.value, val];
};

// One chip per available category, always -- either an informational
// "all checked" summary (no onRemove -- the template renders those as a
// plain dashed chip with no × button) or one removable chip per value still
// checked once a category is narrowed down. Each removable chip's remove
// handler reuses the same toggle used by its checkbox in the popover.
// Exclusion mode deliberately has no chip here -- it's not a per-value
// selection like the four categories below, and its own segmented control
// right above this strip is already the one place that shows and changes it.
type FilterChipEntry = { key: string; label: string; onRemove?: () => void };
const categoryChips = (
  column: string | null,
  selected: string[],
  allValues: string[],
  allLabel: string,
  keyPrefix: string,
  toggle: (val: string) => void,
): FilterChipEntry[] => {
  if (!column || allValues.length === 0) return [];
  if (selected.length === allValues.length) {
    return [{ key: `${keyPrefix}:all`, label: allLabel }];
  }
  return selected.map((val) => ({ key: `${keyPrefix}:${val}`, label: val, onRemove: () => toggle(val) }));
};
const activeFilterChips = computed<FilterChipEntry[]>(() => [
  ...categoryChips(
    props.domainColumn,
    selectedDomains.value,
    props.domainValues,
    t("fomcharts.filters.allDomains"),
    "domain",
    toggleDomain,
  ),
  ...categoryChips(
    props.originColumn,
    selectedOrigins.value,
    props.originValues,
    t("fomcharts.filters.allOrigins"),
    "origin",
    toggleOrigin,
  ),
  ...categoryChips(
    props.materialClassColumn,
    selectedMaterialClasses.value,
    props.materialClassValues,
    t("fomcharts.filters.allMaterialClasses"),
    "materialClass",
    toggleMaterialClass,
  ),
  ...categoryChips(
    props.baseMaterialsColumn,
    selectedBaseMaterials.value,
    props.baseMaterialsValues,
    t("fomcharts.filters.allBaseMaterials"),
    "baseMaterials",
    toggleBaseMaterial,
  ),
]);

// The three sections behave as an accordion -- opening one collapses the
// others, so the sidebar never grows tall enough to force the whole
// workspace into a long scroll. A single active-key ref backs all three
// v-model:open bindings instead of three independent booleans.
type SectionKey = "chart" | "display" | "filters" | null;
const activeSection = ref<SectionKey>("chart");
function sectionModel(key: Exclude<SectionKey, null>) {
  return computed({
    get: () => activeSection.value === key,
    set: (v: boolean) => {
      activeSection.value = v ? key : activeSection.value === key ? null : activeSection.value;
    },
  });
}
const chartSectionOpen = sectionModel("chart");
const displaySectionOpen = sectionModel("display");
const filtersSectionOpen = sectionModel("filters");

// Both axes can independently hold a numeric or a categorical column --
// the Select for each groups its options under the same two headings (see
// template) rather than listing them as one flat, unsorted list; only
// Origin and the composite columns are excluded from either group, since
// those are for filtering/grouping, not plotting.
const xAxisIsNumeric = computed(() => props.numericColumns.includes(xAxis.value ?? ""));
const yAxisIsNumeric = computed(() => props.numericColumns.includes(yAxis.value ?? ""));

// A trend line/Pareto frontier need both axes to be an actual coordinate,
// not a category label -- fitting a line against, say, Material Class would
// draw a meaningless curve through unrelated buckets.
const trendDisabled = computed(() => !xAxisIsNumeric.value || !yAxisIsNumeric.value);

// Switching either axis away from a numeric column makes any active trend
// line meaningless -- turn it off rather than leave a stale checked-but-
// disabled control.
watch(trendDisabled, (disabled) => {
  if (disabled && showTrend.value) showTrend.value = false;
});

// Pareto frontier shares trend line's precondition (both axes numeric).
const paretoDisabled = trendDisabled;
watch(paretoDisabled, (disabled) => {
  if (disabled && showPareto.value) showPareto.value = false;
});

// Log/linear scale and the median line both only make sense against a
// numeric Y -- a category axis has no "order of magnitude" to compress and
// no midpoint to draw a median line through.
const scaleDisabled = computed(() => !yAxisIsNumeric.value);
watch(scaleDisabled, (disabled) => {
  if (disabled) scale.value = "value";
});
const medianDisabled = computed(() => !yAxisIsNumeric.value);
watch(medianDisabled, (disabled) => {
  if (disabled && showMedian.value) showMedian.value = false;
});

// Placeholder for the title field once it's genuinely empty -- normally
// that only happens right after clearTitle (see above), since otherwise
// chartTitle auto-fills for as long as titleIsAuto stays true. Reuses the
// same short "Y / X" wording chartTitle itself gets auto-filled with, so
// the hint stays accurate even while blank.
const titlePlaceholder = computed(() => {
  if (!yAxis.value || !xAxis.value) return t("fomcharts.controls.titlePlaceholder");
  return t("fomcharts.controls.titlePlaceholderExample", { y: yAxis.value, x: xAxis.value });
});

// Same reasoning as trend/Pareto above -- once nothing would actually show
// up in the legend, leave it off rather than a checked-but-inert switch.
// immediate: true also covers the very first render -- showLegend defaults
// to true, but a freshly uploaded file usually starts with no groupBy and
// no trend/Pareto active, so legendDisabled is already true before any
// prop ever *changes*; without immediate this watch would never fire and
// the switch would look "on" despite showing nothing.
watch(
  () => props.legendDisabled,
  (disabled) => {
    if (disabled && showLegend.value) showLegend.value = false;
  },
  { immediate: true },
);
</script>
