<template>
  <Card class="mb-4 flex-row flex-wrap items-center gap-4 rounded-2xl border-secondary/10 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm">
    <label class="flex items-center gap-2 text-sm text-secondary">
      {{ t("fomcharts.controls.title") }}
      <input
        v-model="chartTitle"
        type="text"
        :placeholder="t('fomcharts.controls.titlePlaceholder')"
        class="border border-secondary/20 rounded-lg px-2 py-1 text-sm bg-background/80 text-ink"
      />
    </label>

    <label class="flex items-center gap-2 text-sm text-secondary">
      {{ t("fomcharts.controls.yAxis") }}
      <Select v-model="yAxis">
        <SelectTrigger size="sm" class="bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="col in numericColumns" :key="col" :value="col">
            {{ col }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>

    <label class="flex items-center gap-2 text-sm text-secondary">
      {{ t("fomcharts.controls.xAxis") }}
      <Select v-model="xAxis">
        <SelectTrigger size="sm" class="bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem v-for="col in categoricalColumns" :key="col" :value="col">
            {{ col }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>

    <label class="flex items-center gap-2 text-sm text-secondary">
      {{ t("fomcharts.controls.groupBy") }}
      <Select v-model="groupBySelectValue">
        <SelectTrigger size="sm" class="bg-background/80">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem :value="NONE_VALUE">{{ t("fomcharts.controls.none") }}</SelectItem>
          <SelectItem v-for="col in groupByOptions" :key="col" :value="col">
            {{ col }}
          </SelectItem>
        </SelectContent>
      </Select>
    </label>

    <div class="flex items-center gap-2">
      <span class="text-sm text-secondary">{{
        t("fomcharts.scale.label")
      }}</span>
      <div class="inline-flex gap-1">
        <Button
          type="button"
          size="sm"
          :variant="scale === 'log' ? 'default' : 'outline'"
          @click="scale = 'log'"
        >
          {{ t("fomcharts.scale.log") }}
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="scale === 'value' ? 'default' : 'outline'"
          @click="scale = 'value'"
        >
          {{ t("fomcharts.scale.linear") }}
        </Button>
      </div>
    </div>

    <label class="flex items-center gap-2 text-sm text-secondary">
      <input
        v-model="showMedian"
        type="checkbox"
        class="h-4 w-4 rounded border-secondary/30 text-primary focus:ring-primary/40"
      />
      {{ t("fomcharts.medianLine.toggle") }}
    </label>

    <div
      v-if="domainColumn && domainValues.length > 0"
      class="flex items-center gap-3 text-sm text-secondary"
    >
      <span>{{ t("fomcharts.filters.domain") }}:</span>
      <label
        v-for="val in domainValues"
        :key="val"
        class="flex items-center gap-1"
      >
        <input
          v-model="selectedDomains"
          type="checkbox"
          :value="val"
          class="h-4 w-4 rounded border-secondary/30 text-primary focus:ring-primary/40"
        />
        {{ val }}
      </label>
    </div>

    <div
      v-if="originColumn && originValues.length > 0"
      class="flex items-center gap-3 text-sm text-secondary"
    >
      <span>{{ t("fomcharts.filters.origin") }}:</span>
      <label
        v-for="val in originValues"
        :key="val"
        class="flex items-center gap-1"
      >
        <input
          v-model="selectedOrigins"
          type="checkbox"
          :value="val"
          class="h-4 w-4 rounded border-secondary/30 text-primary focus:ring-primary/40"
        />
        {{ val }}
      </label>
    </div>
  </Card>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
const selectedDomains = defineModel<string[]>("selectedDomains", {
  default: () => [],
});
const selectedOrigins = defineModel<string[]>("selectedOrigins", {
  default: () => [],
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
