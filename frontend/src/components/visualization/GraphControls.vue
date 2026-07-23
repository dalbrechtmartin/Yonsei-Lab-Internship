<template>
  <TooltipProvider :delay-duration="200">
    <aside class="flex w-full flex-col gap-4 lg:w-56 lg:shrink-0">
      <div>
        <button
          type="button"
          class="flex w-full items-center justify-between py-0.5 text-left select-none"
          @click="sectionOpen.chart = !sectionOpen.chart"
        >
          <span class="text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">{{
            t("fomcharts.sections.chart")
          }}</span>
          <component :is="sectionOpen.chart ? ChevronDown : ChevronRight" class="size-3.5 text-secondary" />
        </button>

        <div v-if="sectionOpen.chart" class="mt-2.5 flex flex-col gap-2.5">
          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.title") }}
            <input
              v-model="chartTitle"
              type="text"
              :placeholder="t('fomcharts.controls.titlePlaceholder')"
              class="rounded-lg border border-secondary/20 bg-background/80 px-2 py-1.5 text-sm text-ink"
            />
          </label>

          <label class="flex flex-col gap-1 text-xs text-secondary">
            {{ t("fomcharts.controls.yAxis") }}
            <Select v-model="yAxis">
              <SelectTrigger size="sm" class="w-full bg-background/80">
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
              <SelectTrigger size="sm" class="w-full bg-background/80">
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
              <SelectTrigger size="sm" class="w-full bg-background/80">
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
      </div>

      <div class="h-px bg-secondary/10" />

      <div>
        <button
          type="button"
          class="flex w-full items-center justify-between py-0.5 text-left select-none"
          @click="sectionOpen.display = !sectionOpen.display"
        >
          <span class="text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">{{
            t("fomcharts.sections.display")
          }}</span>
          <component :is="sectionOpen.display ? ChevronDown : ChevronRight" class="size-3.5 text-secondary" />
        </button>

        <div v-if="sectionOpen.display" class="mt-2.5 flex flex-col gap-3">
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-1 text-xs text-secondary">
              {{ t("fomcharts.scale.label") }}
              <InfoTooltip :text="t('fomcharts.tooltips.scale')" />
            </span>
            <RadioGroup v-model="scale" class="flex flex-row gap-3">
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                <RadioGroupItem id="scale-log" value="log" />
                {{ t("fomcharts.scale.log") }}
              </label>
              <label class="flex cursor-pointer items-center gap-1.5 text-xs text-ink">
                <RadioGroupItem id="scale-linear" value="value" />
                {{ t("fomcharts.scale.linear") }}
              </label>
            </RadioGroup>
          </div>

          <div class="flex items-center gap-2 text-xs text-ink">
            <label class="flex cursor-pointer items-center gap-2">
              <Checkbox v-model="showMedian" />
              {{ t("fomcharts.medianLine.toggle") }}
            </label>
            <InfoTooltip :text="t('fomcharts.tooltips.median')" />
          </div>

          <div class="flex items-center gap-2 text-xs" :class="trendDisabled ? 'text-muted-foreground' : 'text-ink'">
            <label class="flex items-center gap-2" :class="trendDisabled ? 'cursor-not-allowed' : 'cursor-pointer'">
              <Checkbox v-model="showTrend" :disabled="trendDisabled" />
              {{ t("fomcharts.controls.trendLine") }}
            </label>
            <InfoTooltip :text="t('fomcharts.tooltips.trendLine')" />
          </div>
          <Alert v-if="trendDisabled" variant="info" class="py-2">
            <Info />
            <AlertDescription class="text-[11px] text-ink/80">
              {{ t("fomcharts.controls.trendLineHint") }}
            </AlertDescription>
          </Alert>
        </div>
      </div>

      <template v-if="domainColumn || originColumn">
        <div class="h-px bg-secondary/10" />

        <div>
          <button
            type="button"
            class="flex w-full items-center justify-between py-0.5 text-left select-none"
            @click="sectionOpen.filters = !sectionOpen.filters"
          >
            <span class="text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">{{
              t("fomcharts.sections.filters")
            }}</span>
            <component :is="sectionOpen.filters ? ChevronDown : ChevronRight" class="size-3.5 text-secondary" />
          </button>

          <div v-if="sectionOpen.filters" class="mt-2.5 flex flex-col gap-3">
            <div v-if="domainColumn && domainValues.length > 0">
              <div class="mb-1.5 text-[11px] text-muted-foreground">{{ t("fomcharts.filters.domain") }}</div>
              <div class="flex flex-col gap-1.5">
                <label
                  v-for="val in domainValues"
                  :key="val"
                  class="flex cursor-pointer items-center gap-2 text-xs text-ink"
                >
                  <Checkbox :model-value="selectedDomains.includes(val)" @update:model-value="toggleDomain(val)" />
                  {{ val }}
                </label>
              </div>
            </div>

            <div v-if="originColumn && originValues.length > 0">
              <div class="mb-1.5 text-[11px] text-muted-foreground">{{ t("fomcharts.filters.origin") }}</div>
              <div class="flex flex-col gap-1.5">
                <label
                  v-for="val in originValues"
                  :key="val"
                  class="flex cursor-pointer items-center gap-2 text-xs text-ink"
                >
                  <Checkbox :model-value="selectedOrigins.includes(val)" @update:model-value="toggleOrigin(val)" />
                  {{ val }}
                </label>
              </div>
            </div>
          </div>
        </div>
      </template>
    </aside>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, ChevronRight, Info } from "@lucide/vue";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";

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

const sectionOpen = reactive({ chart: true, display: true, filters: true });

// A trend line needs an X axis that's actually a coordinate, not a category
// label -- offering it against, say, Material Class would draw a
// meaningless line through unrelated buckets.
const xAxisColumns = computed(() => [...props.categoricalColumns, ...props.numericColumns]);
const trendDisabled = computed(() => !props.numericColumns.includes(xAxis.value ?? ""));

// Switching the X axis away from a numeric column makes any active trend
// line meaningless -- turn it off rather than leave a stale checked-but-
// disabled checkbox.
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
