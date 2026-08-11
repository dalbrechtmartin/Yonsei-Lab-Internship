<template>
  <!-- ============================= PAGE 12 -- Mode 1: add a point, structure & notes ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1AddPoint2')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.addPoint2.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.addPoint2.body") }}
    </p>

    <div ref="addPoint2Wrap" class="guide-callout-region relative">
      <h3 class="mb-1 text-sm font-semibold text-primary">
        {{ t("guide.steps.addPoint2.structureTitle") }}
      </h3>
      <p class="mb-2 text-[11px] leading-snug text-secondary">
        {{ t("guide.steps.addPoint2.structureBody") }}
      </p>

      <div class="grid grid-cols-2 gap-x-5">
        <div
          v-if="addPointBaseMaterialsField"
          ref="addPointNode1Wrap"
          class="flex gap-2"
        >
          <span
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground"
            >1</span
          >
          <div class="min-w-0 flex-1">
            <p class="mb-1 text-[11px] font-bold text-ink">
              {{ addPointFieldLabel(addPointBaseMaterialsField) }}
            </p>
            <MaterialsTagsField
              v-model="addPointTags[addPointBaseMaterialsField.column]"
              :options="addPointBaseMaterialsOptions"
              :placeholder="t('fomcharts.addPoint.tagsPlaceholder')"
            />
          </div>
        </div>

        <div
          v-if="addPointMaterialClassField"
          ref="addPointNode2Wrap"
          class="flex gap-2"
        >
          <span
            class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground"
            >2</span
          >
          <div class="min-w-0 flex-1">
            <p class="mb-0.5 text-[11px] font-bold text-ink">
              {{ addPointFieldLabel(addPointMaterialClassField) }}
            </p>
            <p class="mb-0.5 text-[10px] text-muted-foreground">
              {{ t("fomcharts.addPoint.materialClassSuggestedHint") }}
            </p>
            <MaterialsTagsField
              v-model="addPointTags[addPointMaterialClassField.column]"
              :options="addPointMaterialClassField.options ?? []"
              :placeholder="t('fomcharts.addPoint.tagsPlaceholder')"
              :option-hints="addPointMaterialClassHints"
            />
          </div>
        </div>
      </div>

      <div
        v-if="addPointLayerField"
        ref="addPointNode3Wrap"
        class="mt-1.5 flex gap-2 border-t border-secondary/10 pt-1.5"
      >
        <span
          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground"
          >3</span
        >
        <div class="min-w-0 flex-1">
          <p class="mb-1 text-[11px] font-bold text-ink">
            {{ addPointFieldLabel(addPointLayerField) }}
          </p>
          <LayerStructureField
            v-model="addPointLayers"
            :material-options="
              addPointTags[addPointBaseMaterialsField?.column ?? ''] ?? []
            "
          />
        </div>
      </div>

      <GuideMarkRing
        v-for="(m, i) in addPoint2Marks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>
    <p class="mt-1 text-[11px] leading-snug text-secondary">
      {{ t("guide.steps.addPoint2.figureStructureCaption") }}
    </p>
    <GuideMarkLegend
      class="mt-1"
      :compact="true"
      :items="[
        {
          label: t('guide.steps.addPoint2.marks.baseMaterials.label'),
          body: t('guide.steps.addPoint2.marks.baseMaterials.body'),
        },
        {
          label: t('guide.steps.addPoint2.marks.materialClass.label'),
          body: t('guide.steps.addPoint2.marks.materialClass.body'),
        },
        {
          label: t('guide.steps.addPoint2.marks.layerStructure.label'),
          body: t('guide.steps.addPoint2.marks.layerStructure.body'),
        },
      ]"
    />

    <div class="mt-4 flex items-start gap-8">
      <div class="flex-1">
        <h3 class="mb-1 text-sm font-semibold text-primary">
          {{ t("guide.steps.addPoint2.finishTitle") }}
        </h3>
        <p class="mb-2 text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.addPoint2.finishBody") }}
        </p>
        <Textarea :model-value="addPointNotes" readonly class="h-8 text-sm" />
        <Alert variant="info" class="mt-2 gap-1.5 py-1.5">
          <Info class="size-3.5" />
          <AlertDescription class="text-[10.5px] text-ink/80">{{
            t("fomcharts.addPoint.provenanceHint")
          }}</AlertDescription>
        </Alert>
      </div>
      <div class="w-56 shrink-0 pt-9">
        <div class="flex items-center gap-1.5">
          <UnitConverterPopover v-model:open="unitConverterOpen" />
          <p class="text-[10px] leading-snug text-secondary">
            {{ t("guide.steps.addPoint2.converterCaption") }}
          </p>
        </div>
      </div>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Info } from "@lucide/vue";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import MaterialsTagsField from "@/components/visualization/MaterialsTagsField.vue";
import LayerStructureField from "@/components/visualization/LayerStructureField.vue";
import UnitConverterPopover from "@/components/visualization/UnitConverterPopover.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  addPointFieldLabel as addPointFieldLabelWithT,
  addPointBaseMaterialsField,
  addPointMaterialClassField,
  addPointLayerField,
  addPointTags,
  addPointBaseMaterialsOptions,
  addPointMaterialClassHints,
  addPointLayers,
  addPointNotes,
  unitConverterOpen,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  addPoint2Marks: GuideMark[];
}>();

const { t } = useI18n();

const addPointFieldLabel = (
  field: Parameters<typeof addPointFieldLabelWithT>[0],
) => addPointFieldLabelWithT(field, t);

const addPoint2Wrap = useTemplateRef<HTMLDivElement>("addPoint2Wrap");
const addPointNode1Wrap = useTemplateRef<HTMLDivElement>("addPointNode1Wrap");
const addPointNode2Wrap = useTemplateRef<HTMLDivElement>("addPointNode2Wrap");
const addPointNode3Wrap = useTemplateRef<HTMLDivElement>("addPointNode3Wrap");

defineExpose({
  addPoint2Wrap,
  addPointNode1Wrap,
  addPointNode2Wrap,
  addPointNode3Wrap,
});
</script>
