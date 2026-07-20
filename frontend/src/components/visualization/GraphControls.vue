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
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{
  numericColumns: string[];
  categoricalColumns: string[];
}>();

// defineModel replaces the old prop+emit('update:x') boilerplate: each of
// these is a real two-way v-model from the parent (VisualizationView).
const yAxis = defineModel<string | null>("yAxis");
const xAxis = defineModel<string | null>("xAxis");
const scale = defineModel<"log" | "value">("scale", { default: "log" });
const chartTitle = defineModel<string>("chartTitle", { default: "" });
</script>
