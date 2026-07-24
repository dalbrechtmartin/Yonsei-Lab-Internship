<template>
  <div class="overflow-x-auto rounded-[10px] border border-secondary/15 bg-secondary/5 p-3.5">
    <div class="mb-2.5 flex items-center justify-between gap-3">
      <span class="text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">
        {{ t("fomcharts.compare.title") }}
      </span>
      <div class="flex items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger as-child>
            <button
              type="button"
              class="flex items-center gap-1.5 rounded-lg border border-secondary/20 bg-card px-2.5 py-1 text-[11px] font-medium text-ink"
            >
              <Download class="size-3" />
              {{ t("actions.export") }}
              <ChevronDown class="size-2.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem @select="handleExportCsv">{{ t("fomcharts.compare.export.csv") }}</DropdownMenuItem>
            <DropdownMenuItem @select="handleExportXlsx">{{ t("fomcharts.compare.export.xlsx") }}</DropdownMenuItem>
            <DropdownMenuItem @select="handleExportPng">{{ t("fomcharts.compare.export.png") }}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button type="button" class="text-[10.5px] text-primary" @click="$emit('clear-compare')">
          {{ t("fomcharts.compare.clearSelection") }}
        </button>
      </div>
    </div>

    <table class="min-w-full border-collapse font-sans text-xs">
      <thead>
        <tr>
          <td class="py-1.5 pr-3"></td>
          <td
            v-for="ref in refs"
            :key="ref"
            class="border-b border-secondary/15 px-3.5 py-1.5 font-mono font-bold whitespace-nowrap text-primary"
          >
            {{ ref }}
          </td>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.label">
          <td class="py-1.5 pr-3 whitespace-nowrap text-muted-foreground">{{ row.label }}</td>
          <td
            v-for="(val, i) in row.values"
            :key="i"
            class="border-b border-secondary/15 px-3.5 py-1.5 font-mono whitespace-nowrap text-ink"
          >
            {{ val }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown, Download } from "@lucide/vue";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { annotationFieldColumns } from "@/utils/annotationFields";
import { exportCompareCsv, exportCompareXlsx, exportComparePng, type CompareRow } from "@/utils/compareExport";
import type { Annotation } from "./AnnotationsPanel.vue";

const { t } = useI18n();

const props = defineProps<{
  annotations: Annotation[];
  columns: string[];
  xAxis: string | null;
  yAxis: string | null;
  groupBy: string | null;
}>();
defineEmits<{
  "clear-compare": [];
}>();

const EMPTY = "—";
const display = (v: unknown) => (v === null || v === undefined || v === "" ? EMPTY : String(v));

const refs = computed(() => props.annotations.map((a) => a.ref));

const rows = computed<CompareRow[]>(() => {
  const fieldCols = annotationFieldColumns(props.columns, props.xAxis, props.yAxis, props.groupBy);
  const defs: { label: string; get: (a: Annotation) => unknown }[] = [
    { label: t("fomcharts.compare.titleRow"), get: (a) => a.title },
    ...fieldCols.map((col) => ({ label: col, get: (a: Annotation) => a.row[col] })),
    { label: t("fomcharts.compare.noteRow"), get: (a) => a.note },
  ];
  return defs.map((def) => ({
    label: def.label,
    values: props.annotations.map((a) => display(def.get(a))),
  }));
});

const handleExportCsv = () => exportCompareCsv(refs.value, rows.value);
const handleExportXlsx = () => exportCompareXlsx(refs.value, rows.value);
const handleExportPng = () => exportComparePng(refs.value, rows.value);
</script>
