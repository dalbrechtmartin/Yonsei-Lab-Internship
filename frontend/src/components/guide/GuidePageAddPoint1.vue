<template>
  <!-- ============================= PAGE 11 -- Mode 1: add a point, essentials & metrics ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1AddPoint1')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.addPoint1.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.addPoint1.body") }}
    </p>

    <div
      ref="addPoint1Wrap"
      class="guide-callout-region relative mx-auto"
      style="width: 560px"
    >
      <TooltipProvider :delay-duration="200">
        <!-- Step indicator -- hand-copied from AddPointDialog's own header
           markup (same real icons/classes), pinned to step 1. The live
           dialog is a Dialog (teleports outside the `.guide-page` tree
           pdfExport.ts captures), same constraint as CompareDialog. -->
        <div class="flex items-center gap-1.5">
          <template v-for="(s, i) in addPointSteps" :key="s.key">
            <div
              class="flex items-center gap-1.5"
              :class="i === 0 ? '' : 'opacity-55'"
            >
              <span
                class="flex size-6 shrink-0 items-center justify-center rounded-full"
                :class="i === 0 ? 'bg-primary' : 'border-[1.5px] border-ink'"
              >
                <component
                  :is="s.icon"
                  class="size-3"
                  :class="i === 0 ? 'text-primary-foreground' : 'text-ink'"
                />
              </span>
              <span
                class="text-[10.5px] font-bold whitespace-nowrap"
                :class="i === 0 ? 'text-primary' : 'text-ink'"
                >{{ i + 1 }}. {{ s.label }}</span
              >
            </div>
            <div
              v-if="i < addPointSteps.length - 1"
              class="h-0.5 min-w-1.5 flex-1 bg-secondary/15"
            />
          </template>
        </div>

        <h3 class="mt-3 mb-1 text-sm font-semibold text-primary">
          {{ t("guide.steps.addPoint1.essentialsTitle") }}
        </h3>
        <p class="mb-2.5 text-[11px] leading-snug text-secondary">
          {{ t("guide.steps.addPoint1.essentialsBody") }}
        </p>

        <div class="grid grid-cols-2 gap-x-6 gap-y-3">
          <div class="flex flex-col gap-3">
            <div ref="addPointLabelWrap" class="flex flex-col gap-1.5">
              <Label
                class="flex items-center gap-1 text-[11px] text-muted-foreground"
              >
                {{ t("fomcharts.addPoint.labelField") }}
                <span class="text-rose-500">*</span>
              </Label>
              <Input
                :model-value="addPointLabel"
                readonly
                class="h-8 text-sm"
              />
            </div>
            <div ref="addPointAxesWrap" class="grid grid-cols-2 gap-x-3">
              <AddPointField
                v-for="field in addPointRequiredFields"
                :key="field.column"
                v-model="addPointValues[field.column]"
                :field="field"
                :label="addPointFieldLabel(field)"
              />
            </div>
          </div>
          <div class="flex flex-col gap-3">
            <div
              ref="addPointDomainOriginWrap"
              class="flex flex-wrap items-start gap-3"
            >
              <div v-if="addPointDomainField" class="flex flex-col gap-1.5">
                <AddPointField
                  v-model="addPointValues[addPointDomainField.column]"
                  :field="addPointDomainField"
                  :label="addPointFieldLabel(addPointDomainField)"
                />
              </div>
              <div v-if="addPointOriginField" class="flex flex-col gap-1.5">
                <Label class="text-[11px] text-muted-foreground">{{
                  addPointFieldLabel(addPointOriginField)
                }}</Label>
                <div
                  class="inline-flex overflow-hidden rounded-md border border-input"
                >
                  <button
                    v-for="(opt, idx) in addPointOriginField.options"
                    :key="opt"
                    type="button"
                    class="px-3 py-1.5 text-xs font-semibold transition-colors"
                    :class="[
                      addPointValues[addPointOriginField.column] === opt
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-muted-foreground',
                      idx > 0 ? 'border-l border-input' : '',
                    ]"
                  >
                    {{ opt }}
                  </button>
                </div>
              </div>
            </div>
            <div ref="addPointShapeWrap" class="flex flex-col gap-1.5">
              <Label class="text-[11px] text-muted-foreground">{{
                t("fomcharts.addPoint.sections.shape")
              }}</Label>
              <PointShapeField v-model="addPointShape" />
            </div>
          </div>
        </div>

        <div class="mt-4 border-t border-secondary/10 pt-3">
          <h3 class="mb-1 text-sm font-semibold text-primary">
            {{ t("guide.steps.addPoint1.metricsTitle") }}
          </h3>
          <p class="mb-2.5 text-[11px] leading-snug text-secondary">
            {{ t("guide.steps.addPoint1.metricsBody") }}
          </p>
          <div
            ref="addPointMetricsWrap"
            class="grid grid-cols-3 gap-x-4 gap-y-3"
          >
            <AddPointField
              v-for="field in addPointPlainMetricFields"
              :key="field.column"
              v-model="addPointValues[field.column]"
              :field="field"
              :label="addPointFieldLabel(field)"
            />
          </div>
          <div
            v-if="addPointQFactorField"
            ref="addPointQFactorWrap"
            class="mt-3"
          >
            <AddPointField
              v-model="addPointValues[addPointQFactorField.column]"
              :field="addPointQFactorField"
              :label="addPointFieldLabel(addPointQFactorField)"
              :computed-value="addPointComputedQFactor"
              :manual-override="false"
            />
          </div>
        </div>

        <!-- Hand-copied from AddPointDialog's own persistent footer (same
             real Button component and i18n labels) -- step 1's own state:
             no Back button yet, just the discreet "save without more
             details" escape hatch and Next. See footerCaption below. -->
        <div
          class="mt-4 flex items-center justify-between gap-2 border-t border-secondary/10 pt-3"
        >
          <span
            class="text-[11px] font-medium text-muted-foreground underline decoration-dotted underline-offset-2"
          >
            {{ t("fomcharts.addPoint.saveWithoutDetails") }}
          </span>
          <Button
            type="button"
            size="sm"
            class="bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {{ t("fomcharts.addPoint.next") }}
          </Button>
        </div>

        <GuideMarkRing
          v-for="(m, i) in addPoint1Marks"
          :key="i"
          :mark="m"
          :number="i + 1"
          :side="i < 2 ? 'left' : undefined"
        />
      </TooltipProvider>
    </div>
    <p
      class="mx-auto mt-1.5 max-w-120 text-center text-[11px] leading-snug text-secondary"
    >
      {{ t("guide.steps.addPoint1.stepperCaption") }}
    </p>
    <p
      class="mx-auto mt-0.5 max-w-120 text-center text-[11px] leading-snug text-secondary"
    >
      {{ t("guide.steps.addPoint1.footerCaption") }}
    </p>

    <GuideMarkLegend
      class="mt-2"
      :compact="true"
      :items="[
        {
          label: t('guide.steps.addPoint1.marks.label.label'),
          body: t('guide.steps.addPoint1.marks.label.body'),
        },
        {
          label: t('guide.steps.addPoint1.marks.axes.label'),
          body: t('guide.steps.addPoint1.marks.axes.body'),
        },
        {
          label: t('guide.steps.addPoint1.marks.domainOrigin.label'),
          body: t('guide.steps.addPoint1.marks.domainOrigin.body'),
        },
        {
          label: t('guide.steps.addPoint1.marks.shape.label'),
          body: t('guide.steps.addPoint1.marks.shape.body'),
        },
        {
          label: t('guide.steps.addPoint1.marks.metrics.label'),
          body: t('guide.steps.addPoint1.marks.metrics.body'),
        },
        {
          label: t('guide.steps.addPoint1.marks.qFactor.label'),
          body: t('guide.steps.addPoint1.marks.qFactor.body'),
        },
      ]"
    />

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import AddPointField from "@/components/visualization/AddPointField.vue";
import PointShapeField from "@/components/visualization/PointShapeField.vue";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import {
  useAddPointSteps,
  addPointFieldLabel as addPointFieldLabelWithT,
  addPointRequiredFields,
  addPointDomainField,
  addPointOriginField,
  addPointPlainMetricFields,
  addPointQFactorField,
  addPointLabel,
  addPointShape,
  addPointValues,
  addPointComputedQFactor,
} from "./guideSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  addPoint1Marks: GuideMark[];
}>();

const { t } = useI18n();

const addPointSteps = useAddPointSteps(t);
const addPointFieldLabel = (
  field: Parameters<typeof addPointFieldLabelWithT>[0],
) => addPointFieldLabelWithT(field, t);

const addPoint1Wrap = useTemplateRef<HTMLDivElement>("addPoint1Wrap");
const addPointLabelWrap = useTemplateRef<HTMLDivElement>("addPointLabelWrap");
const addPointAxesWrap = useTemplateRef<HTMLDivElement>("addPointAxesWrap");
const addPointDomainOriginWrap = useTemplateRef<HTMLDivElement>(
  "addPointDomainOriginWrap",
);
const addPointShapeWrap = useTemplateRef<HTMLDivElement>("addPointShapeWrap");
const addPointMetricsWrap = useTemplateRef<HTMLDivElement>(
  "addPointMetricsWrap",
);
const addPointQFactorWrap = useTemplateRef<HTMLDivElement>(
  "addPointQFactorWrap",
);

defineExpose({
  addPoint1Wrap,
  addPointLabelWrap,
  addPointAxesWrap,
  addPointDomainOriginWrap,
  addPointShapeWrap,
  addPointMetricsWrap,
  addPointQFactorWrap,
});
</script>
