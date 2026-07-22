<template>
  <div
    class="flex flex-wrap items-center gap-4 mb-4 rounded-2xl border border-secondary/10 bg-card/80 px-4 py-3 shadow-sm backdrop-blur-sm"
  >
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
      <select
        v-model="yAxis"
        class="border border-secondary/20 rounded-lg px-2 py-1 text-sm bg-background/80 text-ink"
      >
        <option v-for="col in numericColumns" :key="col" :value="col">
          {{ col }}
        </option>
      </select>
    </label>

    <label class="flex items-center gap-2 text-sm text-secondary">
      {{ t("fomcharts.controls.xAxis") }}
      <select
        v-model="xAxis"
        class="border border-secondary/20 rounded-lg px-2 py-1 text-sm bg-background/80 text-ink"
      >
        <option v-for="col in categoricalColumns" :key="col" :value="col">
          {{ col }}
        </option>
      </select>
    </label>

    <label class="flex items-center gap-2 text-sm text-secondary">
      {{ t("fomcharts.controls.groupBy") }}
      <select
        v-model="groupBy"
        class="border border-secondary/20 rounded-lg px-2 py-1 text-sm bg-background/80 text-ink"
      >
        <option :value="null">{{ t("fomcharts.controls.none") }}</option>
        <option v-for="col in groupByOptions" :key="col" :value="col">
          {{ col }}
        </option>
      </select>
    </label>

    <div class="flex items-center gap-2">
      <span class="text-sm text-secondary">{{
        t("fomcharts.scale.label")
      }}</span>
      <div
        class="inline-flex rounded-md border border-secondary/20 overflow-hidden bg-background/80"
      >
        <button
          type="button"
          class="px-3 py-1 text-sm"
          :class="
            scale === 'log'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent text-secondary hover:bg-primary/8 hover:text-ink'
          "
          @click="scale = 'log'"
        >
          {{ t("fomcharts.scale.log") }}
        </button>
        <button
          type="button"
          class="px-3 py-1 text-sm border-l border-secondary/20"
          :class="
            scale === 'value'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-transparent text-secondary hover:bg-primary/8 hover:text-ink'
          "
          @click="scale = 'value'"
        >
          {{ t("fomcharts.scale.linear") }}
        </button>
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
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

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
