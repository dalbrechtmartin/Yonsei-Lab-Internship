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
                :placeholder="t('fomcharts.controls.titlePlaceholder')"
                class="h-auto bg-card py-1.5 pr-7 pl-2 text-sm text-ink"
              />
              <button
                v-if="chartTitle"
                type="button"
                class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
                :aria-label="t('fomcharts.controls.clearTitle')"
                @click="chartTitle = ''"
              >
                <X class="size-3.5" />
              </button>
            </span>
          </label>

          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.yAxis") }}
            <Select v-model="yAxis">
              <SelectTrigger size="sm" class="w-full min-w-0 bg-card">
                <SelectValue class="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="col in numericColumns" :key="col" :value="col">
                  {{ col }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>

          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.xAxis") }}
            <Select v-model="xAxis">
              <SelectTrigger size="sm" class="w-full min-w-0 bg-card">
                <SelectValue class="min-w-0 truncate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="col in xAxisColumns" :key="col" :value="col">
                  {{ col }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>

        </div>
      </CollapsibleSection>

      <div class="h-px bg-secondary/10" />

      <CollapsibleSection v-model:open="displaySectionOpen" :title="t('fomcharts.sections.display')">
        <div class="mt-2.5 flex flex-col gap-3 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-secondary">
              {{ t("fomcharts.scale.label") }}
              <InfoTooltip :text="t('fomcharts.tooltips.scale')" />
            </span>
            <div class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card">
              <Button
                type="button"
                variant="ghost"
                size="xs"
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
              {{ t("fomcharts.controls.trendLine") }}
              <InfoTooltip :text="t('fomcharts.tooltips.trendLine')" />
            </span>
            <Switch v-model="showTrend" :disabled="trendDisabled" />
          </div>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="paretoDisabled ? 'text-muted-foreground' : 'text-ink'">
              {{ t("fomcharts.controls.pareto") }}
              <InfoTooltip :text="t('fomcharts.tooltips.pareto')" />
            </span>
            <Switch v-model="showPareto" :disabled="paretoDisabled" />
          </div>
          <!-- Trend line and Pareto share the same precondition (a numeric X
               axis) -- one shared hint instead of repeating the same
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
              {{ t("fomcharts.legend.toggle") }}
              <InfoTooltip :text="t('fomcharts.tooltips.legend')" />
            </span>
            <Switch v-model="showLegend" :disabled="legendDisabled" />
          </div>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-ink">
              {{ t("fomcharts.medianLine.toggle") }}
              <InfoTooltip :text="t('fomcharts.tooltips.median')" />
            </span>
            <Switch v-model="showMedian" />
          </div>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-ink">
              {{ t("fomcharts.controls.axisNames") }}
              <InfoTooltip :text="t('fomcharts.tooltips.axisNames')" />
            </span>
            <Switch v-model="showAxisNames" />
          </div>
        </div>
      </CollapsibleSection>

      <template v-if="domainColumn || originColumn || materialClassColumn || baseMaterialsColumn">
        <div class="h-px bg-secondary/10" />

        <CollapsibleSection v-model:open="filtersSectionOpen" :title="t('fomcharts.sections.filters')">
          <div class="mt-2.5 flex flex-col gap-3.5 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
            <div v-if="domainColumn && domainValues.length > 0">
              <div class="mb-2">
                <span class="text-[11px] font-semibold text-secondary">{{ t("fomcharts.filters.domain") }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <FilterChip
                  v-for="val in domainValues"
                  :key="val"
                  :label="val"
                  :count="domainCounts[val]"
                  :active="selectedDomains.includes(val)"
                  @toggle="toggleDomain(val)"
                />
              </div>
            </div>

            <div v-if="domainColumn && originColumn" class="h-px bg-secondary/10" />

            <div v-if="originColumn && originValues.length > 0">
              <div class="mb-2">
                <span class="text-[11px] font-semibold text-secondary">{{ t("fomcharts.filters.origin") }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <FilterChip
                  v-for="val in originValues"
                  :key="val"
                  :label="val"
                  :count="originCounts[val]"
                  :active="selectedOrigins.includes(val)"
                  @toggle="toggleOrigin(val)"
                />
              </div>
            </div>

            <div v-if="originColumn && materialClassColumn" class="h-px bg-secondary/10" />

            <div v-if="materialClassColumn && materialClassValues.length > 0">
              <div class="mb-2">
                <span class="text-[11px] font-semibold text-secondary">{{ t("fomcharts.filters.materialClass") }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <FilterChip
                  v-for="val in materialClassValues"
                  :key="val"
                  :label="val"
                  :count="materialClassCounts[val]"
                  :active="selectedMaterialClasses.includes(val)"
                  @toggle="toggleMaterialClass(val)"
                />
              </div>
            </div>

            <div v-if="materialClassColumn && baseMaterialsColumn" class="h-px bg-secondary/10" />

            <div v-if="baseMaterialsColumn && baseMaterialsValues.length > 0">
              <div class="mb-2">
                <span class="text-[11px] font-semibold text-secondary">{{ t("fomcharts.filters.baseMaterials") }}</span>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <FilterChip
                  v-for="val in baseMaterialsValues"
                  :key="val"
                  :label="val"
                  :count="baseMaterialsCounts[val]"
                  :active="selectedBaseMaterials.includes(val)"
                  @toggle="toggleBaseMaterial(val)"
                />
              </div>
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import FilterChip from "@/components/shared/FilterChip.vue";

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
    legendDisabled: false,
  },
);

// defineModel replaces the old prop+emit('update:x') boilerplate: each of
// these is a real two-way v-model from the parent (VisualizationView).
const yAxis = defineModel<string | null>("yAxis");
const xAxis = defineModel<string | null>("xAxis");
const scale = defineModel<"log" | "value">("scale", { default: "log" });
const chartTitle = defineModel<string>("chartTitle", { default: "" });
const showLegend = defineModel<boolean>("showLegend", { default: true });
const showMedian = defineModel<boolean>("showMedian", { default: false });
const showTrend = defineModel<boolean>("showTrend", { default: false });
const showAxisNames = defineModel<boolean>("showAxisNames", { default: false });
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
const showPareto = defineModel<boolean>("showPareto", { default: false });

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

// A trend line needs an X axis that's actually a coordinate, not a category
// label -- offering it against, say, Material Class would draw a
// meaningless line through unrelated buckets.
const xAxisColumns = computed(() => [...props.categoricalColumns, ...props.numericColumns]);
const trendDisabled = computed(() => !props.numericColumns.includes(xAxis.value ?? ""));

// Switching the X axis away from a numeric column makes any active trend
// line meaningless -- turn it off rather than leave a stale checked-but-
// disabled control.
watch(trendDisabled, (disabled) => {
  if (disabled && showTrend.value) showTrend.value = false;
});

// Pareto frontier also requires a numeric X axis (same precondition as trend line).
const paretoDisabled = trendDisabled;
watch(paretoDisabled, (disabled) => {
  if (disabled && showPareto.value) showPareto.value = false;
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
