<template>
  <div class="rounded-2xl border border-secondary/10 bg-secondary/5 p-3.5">
    <div class="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">
      {{ t("fomcharts.stats.title") }}
    </div>
    <div class="flex flex-col gap-2">
      <div
        v-for="group in groups"
        :key="group.label"
        class="flex flex-col gap-0.5 border-b border-secondary/10 pb-2 last:border-0 last:pb-0"
      >
        <div class="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <span class="inline-block size-2 rounded-full" :style="{ background: group.color }" />
          {{ group.label }}
        </div>
        <div class="font-mono text-[11px] leading-relaxed text-secondary">
          {{ t("fomcharts.stats.line1", { n: group.stats.n, mean: formatStat(group.stats.mean) }) }}<br />
          {{ t("fomcharts.stats.line2", { median: formatStat(group.stats.median), std: formatStat(group.stats.std) }) }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import labTheme from "@/assets/themes/okabe-ito-palette.json";
import { computeStats, formatStat } from "@/utils/stats";
import type { DataRow } from "@/utils/columnTypes";

const { t } = useI18n();

const props = defineProps<{
  // Already filtered to rows with a plottable (numeric) yAxis value — see
  // filterPlottable in utils/stats.ts, applied upstream in
  // VisualizationView so the stats here always match what the chart draws.
  rows: DataRow[];
  yAxis: string | null;
  groupBy: string | null;
}>();

const palette: string[] = labTheme.theme.color;

const groups = computed(() => {
  const yAxis = props.yAxis;
  const values = (rows: DataRow[]) =>
    yAxis ? rows.map((row) => Number(row[yAxis])).filter((v) => !isNaN(v)) : [];

  const groupBy = props.groupBy;
  if (!groupBy) {
    return [{ label: t("fomcharts.stats.all"), color: palette[0], stats: computeStats(values(props.rows)) }];
  }

  const labelFor = (row: DataRow) => {
    const v = row[groupBy];
    return v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
  };
  const labels = Array.from(new Set(props.rows.map(labelFor))).sort();

  return labels.map((label, idx) => ({
    label,
    color: palette[idx % palette.length],
    stats: computeStats(values(props.rows.filter((row) => labelFor(row) === label))),
  }));
});
</script>
