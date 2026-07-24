<template>
  <TooltipProvider :delay-duration="200">
    <CollapsibleSection v-model:open="open" :title="t('fomcharts.stats.title')">
      <div class="mt-2.5 flex flex-col gap-1 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3">
        <button
          v-for="group in groups"
          :key="group.label"
          type="button"
          :disabled="!groupBy"
          class="flex flex-col gap-2 rounded-lg border-b border-secondary/10 px-2 pt-2 pb-3 text-left last:border-0 last:pb-0 disabled:cursor-default"
          :class="[
            groupBy && group.label === highlightGroup ? 'bg-primary/10' : '',
            groupBy ? 'cursor-pointer' : '',
            highlightGroup && group.label !== highlightGroup ? 'opacity-55' : '',
          ]"
          @click="groupBy && $emit('toggle-highlight', group.label)"
        >
          <div class="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <span class="inline-block size-2.5 shrink-0 rounded-full" :style="{ background: group.color }" />
            {{ group.label }}
          </div>
          <div class="grid grid-cols-2 gap-1.5">
            <div v-for="tile in group.tiles" :key="tile.key" class="rounded-md bg-white/60 px-2 py-1.5">
              <div class="flex items-center gap-1 text-[9.5px] tracking-wide text-muted-foreground uppercase">
                {{ tile.label }}
                <InfoTooltip :text="tile.tooltip" />
              </div>
              <div class="font-mono text-[13px] text-ink">{{ tile.value }}</div>
            </div>
          </div>
        </button>
      </div>
    </CollapsibleSection>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import labTheme from "@/assets/themes/okabe-ito-palette.json";
import { computeStats, formatStat } from "@/utils/stats";
import type { DataRow } from "@/utils/columnTypes";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import { TooltipProvider } from "@/components/ui/tooltip";

const { t } = useI18n();

const props = defineProps<{
  // Already filtered to rows with a plottable (numeric) yAxis value — see
  // filterPlottable in utils/stats.ts, applied upstream in
  // VisualizationView so the stats here always match what the chart draws.
  rows: DataRow[];
  yAxis: string | null;
  groupBy: string | null;
  // Clicking a group card (only enabled when groupBy is set) toggles this,
  // isolating that group on the chart — see VisualizationView, which owns
  // the ref and also passes it to FomChart for the actual dimming.
  highlightGroup: string | null;
}>();
defineEmits<{
  "toggle-highlight": [group: string];
}>();

const open = ref(true);

const palette: string[] = labTheme.theme.color;

const groups = computed(() => {
  const yAxis = props.yAxis;
  const values = (rows: DataRow[]) =>
    yAxis ? rows.map((row) => Number(row[yAxis])).filter((v) => !isNaN(v)) : [];

  const tilesFor = (stats: ReturnType<typeof computeStats>) => [
    { key: "n", label: t("fomcharts.stats.n"), tooltip: t("fomcharts.stats.tooltips.n"), value: String(stats.n) },
    { key: "mean", label: t("fomcharts.stats.mean"), tooltip: t("fomcharts.stats.tooltips.mean"), value: formatStat(stats.mean) },
    { key: "median", label: t("fomcharts.stats.median"), tooltip: t("fomcharts.stats.tooltips.median"), value: formatStat(stats.median) },
    { key: "std", label: t("fomcharts.stats.std"), tooltip: t("fomcharts.stats.tooltips.std"), value: formatStat(stats.std) },
  ];

  const groupBy = props.groupBy;
  if (!groupBy) {
    return [
      {
        label: t("fomcharts.stats.all"),
        color: palette[0],
        tiles: tilesFor(computeStats(values(props.rows))),
      },
    ];
  }

  const labelFor = (row: DataRow) => {
    const v = row[groupBy];
    return v === null || v === undefined || v === "" ? t("fomcharts.unknownGroup") : String(v);
  };
  const labels = Array.from(new Set(props.rows.map(labelFor))).sort();

  return labels.map((label, idx) => ({
    label,
    color: palette[idx % palette.length],
    tiles: tilesFor(computeStats(values(props.rows.filter((row) => labelFor(row) === label)))),
  }));
});
</script>
