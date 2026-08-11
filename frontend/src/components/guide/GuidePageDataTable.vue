<template>
  <!-- ============================= PAGE 10 -- Mode 1: manage your data points ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1DataTable')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.dataTable.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.dataTable.body") }}
    </p>

    <div
      ref="dataTableWrap"
      class="mx-auto guide-callout-region relative"
      style="width: 310px"
    >
      <DataPointsTable
        v-model:open="dataTableOpen"
        v-model:include-custom-in-stats="includeManualInStats"
        :rows="dataTableVisibleRows"
        :hidden-rows="[dataTableHiddenRow]"
        :pinned-rows="dataTablePinnedRows"
        :columns="sampleColumns"
        :y-axis="selectedYAxis"
        :group-color-map="groupColorMap"
        :group-by="originColumn"
      />
      <GuideMarkRing
        v-for="(m, i) in dataTableMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>
    <p
      class="mx-auto mt-1.5 max-w-96 text-center text-[11px] leading-snug text-secondary"
    >
      {{ t("guide.steps.dataTable.figureCaption") }}
    </p>

    <GuideMarkLegend
      class="mt-2"
      :items="[
        {
          label: t('guide.steps.dataTable.marks.filters.label'),
          body: t('guide.steps.dataTable.marks.filters.body'),
        },
        {
          label: t('guide.steps.dataTable.marks.addData.label'),
          body: t('guide.steps.dataTable.marks.addData.body'),
        },
        {
          label: t('guide.steps.dataTable.marks.pinnedGroup.label'),
          body: t('guide.steps.dataTable.marks.pinnedGroup.body'),
        },
      ]"
    />

    <div class="mt-3">
      <h3 class="mb-1.5 text-sm font-semibold text-primary">
        {{ t("guide.steps.dataTable.actionsTitle") }}
      </h3>
      <ul class="flex flex-col gap-1 text-sm text-ink">
        <li>{{ t("guide.steps.dataTable.actions.click") }}</li>
        <li>{{ t("guide.steps.dataTable.actions.menu") }}</li>
      </ul>
    </div>

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.dataTable.note") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import DataPointsTable from "@/components/visualization/DataPointsTable.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  dataTableOpen,
  includeManualInStats,
  dataTableVisibleRows,
  dataTableHiddenRow,
  dataTablePinnedRows,
  sampleColumns,
  selectedYAxis,
  groupColorMap,
  originColumn,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  dataTableMarks: GuideMark[];
}>();

const { t } = useI18n();

const dataTableWrap = useTemplateRef<HTMLDivElement>("dataTableWrap");

defineExpose({ dataTableWrap });
</script>
