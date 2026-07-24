<template>
  <TooltipProvider :delay-duration="200">
    <aside class="flex w-full flex-col gap-3.5 lg:w-56 lg:shrink-0">
      <CollapsibleSection v-model:open="sectionOpen.chart" :title="t('fomcharts.sections.chart')">
        <div class="mt-2.5 flex flex-col gap-2.5 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.title") }}
            <input
              v-model="chartTitle"
              type="text"
              :placeholder="t('fomcharts.controls.titlePlaceholder')"
              class="rounded-lg border border-secondary/20 bg-background/60 px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.yAxis") }}
            <Select v-model="yAxis">
              <SelectTrigger size="sm" class="w-full bg-background/60">
                <SelectValue />
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
              <SelectTrigger size="sm" class="w-full bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="col in xAxisColumns" :key="col" :value="col">
                  {{ col }}
                </SelectItem>
              </SelectContent>
            </Select>
          </label>

          <div class="flex flex-col gap-1 text-xs text-secondary">
            <span class="flex items-center gap-1">
              {{ t("fomcharts.controls.groupBy") }}
              <InfoTooltip :text="t('fomcharts.tooltips.groupBy')" />
            </span>
            <Select v-model="groupBySelectValue">
              <SelectTrigger size="sm" class="w-full bg-background/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="NONE_VALUE">{{ t("fomcharts.controls.none") }}</SelectItem>
                <SelectItem v-for="col in groupByOptions" :key="col" :value="col">
                  {{ col }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CollapsibleSection>

      <div class="h-px bg-secondary/10" />

      <CollapsibleSection v-model:open="sectionOpen.display" :title="t('fomcharts.sections.display')">
        <div class="mt-2.5 flex flex-col gap-3 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-secondary">
              {{ t("fomcharts.scale.label") }}
              <InfoTooltip :text="t('fomcharts.tooltips.scale')" />
            </span>
            <div class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card">
              <button
                type="button"
                class="px-3 py-1.5 text-[11.5px] font-semibold transition-colors"
                :class="scale === 'log' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-secondary'"
                @click="scale = 'log'"
              >
                {{ t("fomcharts.scale.log") }}
              </button>
              <button
                type="button"
                class="px-3 py-1.5 text-[11.5px] font-medium transition-colors"
                :class="scale === 'value' ? 'bg-primary text-primary-foreground' : 'bg-transparent text-secondary'"
                @click="scale = 'value'"
              >
                {{ t("fomcharts.scale.linear") }}
              </button>
            </div>
          </div>

          <div class="h-px bg-secondary/10" />

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-ink">
              {{ t("fomcharts.legend.toggle") }}
              <InfoTooltip :text="t('fomcharts.tooltips.legend')" />
            </span>
            <Switch v-model="showLegend" />
          </div>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-ink">
              {{ t("fomcharts.medianLine.toggle") }}
              <InfoTooltip :text="t('fomcharts.tooltips.median')" />
            </span>
            <Switch v-model="showMedian" />
          </div>

          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs" :class="trendDisabled ? 'text-muted-foreground' : 'text-ink'">
              {{ t("fomcharts.controls.trendLine") }}
              <InfoTooltip :text="t('fomcharts.tooltips.trendLine')" />
            </span>
            <Switch v-model="showTrend" :disabled="trendDisabled" />
          </div>
          <Alert v-if="trendDisabled" variant="info" class="py-2">
            <Info />
            <AlertDescription class="text-[11px] text-ink/80">
              {{ t("fomcharts.controls.trendLineHint") }}
            </AlertDescription>
          </Alert>
        </div>
      </CollapsibleSection>

      <template v-if="domainColumn || originColumn">
        <div class="h-px bg-secondary/10" />

        <CollapsibleSection v-model:open="sectionOpen.filters" :title="t('fomcharts.sections.filters')">
          <div class="mt-2.5 flex flex-col gap-3.5 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
            <div v-if="domainColumn && domainValues.length > 0">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[11px] font-semibold text-secondary">{{ t("fomcharts.filters.domain") }}</span>
                <button type="button" class="text-[10.5px] text-primary" @click="toggleAllDomains">
                  {{ domainToggleAllLabel }}
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <FilterChip
                  v-for="val in domainValues"
                  :key="val"
                  :label="val"
                  :active="selectedDomains.includes(val)"
                  @toggle="toggleDomain(val)"
                />
              </div>
            </div>

            <div v-if="domainColumn && originColumn" class="h-px bg-secondary/10" />

            <div v-if="originColumn && originValues.length > 0">
              <div class="mb-2 flex items-center justify-between">
                <span class="text-[11px] font-semibold text-secondary">{{ t("fomcharts.filters.origin") }}</span>
                <button type="button" class="text-[10.5px] text-primary" @click="toggleAllOrigins">
                  {{ originToggleAllLabel }}
                </button>
              </div>
              <div class="flex flex-wrap gap-1.5">
                <FilterChip
                  v-for="val in originValues"
                  :key="val"
                  :label="val"
                  :active="selectedOrigins.includes(val)"
                  @toggle="toggleOrigin(val)"
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
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Info } from "@lucide/vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import FilterChip from "@/components/shared/FilterChip.vue";

const { t } = useI18n();

// The shadcn/Reka Select has no native concept of a null value (unlike a
// plain <option :value="null">, which Vue's v-model specifically supports
// on native <select>) -- so "no group-by column" is represented by this
// sentinel string in the Select itself, and translated back to/from the
// real null-based groupBy model just below.
const NONE_VALUE = "__none__";

const props = withDefaults(
  defineProps<{
    numericColumns: string[];
    categoricalColumns: string[];
    groupByColumns: string[];
    domainColumn?: string | null;
    domainValues?: string[];
    originColumn?: string | null;
    originValues?: string[];
  }>(),
  {
    domainColumn: null,
    domainValues: () => [],
    originColumn: null,
    originValues: () => [],
  },
);

// defineModel replaces the old prop+emit('update:x') boilerplate: each of
// these is a real two-way v-model from the parent (VisualizationView).
const yAxis = defineModel<string | null>("yAxis");
const xAxis = defineModel<string | null>("xAxis");
const groupBy = defineModel<string | null>("groupBy", { default: null });
const groupBySelectValue = computed<string>({
  get: () => groupBy.value ?? NONE_VALUE,
  set: (value) => {
    groupBy.value = value === NONE_VALUE ? null : value;
  },
});
const scale = defineModel<"log" | "value">("scale", { default: "log" });
const chartTitle = defineModel<string>("chartTitle", { default: "" });
const showLegend = defineModel<boolean>("showLegend", { default: true });
const showMedian = defineModel<boolean>("showMedian", { default: true });
const showTrend = defineModel<boolean>("showTrend", { default: true });
const selectedDomains = defineModel<string[]>("selectedDomains", {
  default: () => [],
});
const selectedOrigins = defineModel<string[]>("selectedOrigins", {
  default: () => [],
});

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

// "Select all" collapses back to "Select one" (just the first value) once
// every value is already selected, and vice versa -- a single link doing
// double duty instead of two separate buttons.
const domainToggleAllLabel = computed(() =>
  selectedDomains.value.length >= props.domainValues.length ? t("fomcharts.filters.selectOne") : t("fomcharts.filters.selectAll"),
);
const toggleAllDomains = () => {
  if (props.domainValues.length === 0) return;
  selectedDomains.value =
    selectedDomains.value.length >= props.domainValues.length ? [props.domainValues[0]] : [...props.domainValues];
};
const originToggleAllLabel = computed(() =>
  selectedOrigins.value.length >= props.originValues.length ? t("fomcharts.filters.selectOne") : t("fomcharts.filters.selectAll"),
);
const toggleAllOrigins = () => {
  if (props.originValues.length === 0) return;
  selectedOrigins.value =
    selectedOrigins.value.length >= props.originValues.length ? [props.originValues[0]] : [...props.originValues];
};

const sectionOpen = reactive({ chart: true, display: true, filters: true });

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

// Group-by exists to split points into color categories *distinct* from
// their X-axis position — picking the same column for both just repeats
// the X-axis labels as a legend and adds nothing. groupByColumns (from
// VisualizationView) is already capped to low-cardinality columns so the
// palette never has to repeat colors; excluding the current X-axis choice
// on top of that stops the redundant, chart-cluttering combination too.
const groupByOptions = computed(() =>
  props.groupByColumns.filter((col) => col !== xAxis.value),
);

// If the X-axis changes onto the current group-by column, or the group-by
// column stops qualifying (e.g. a Domain/Origin filter change pushes its
// cardinality over the cap), fall back to "None" instead of silently
// keeping an invalid/misleading selection.
watch([xAxis, groupByOptions], ([, options]) => {
  if (groupBy.value && !options.includes(groupBy.value)) {
    groupBy.value = null;
  }
});
</script>
