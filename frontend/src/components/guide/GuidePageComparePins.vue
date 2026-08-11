<template>
  <!-- ============================= PAGE 15 -- Mode 1: compare pinned points ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode1ComparePins')"
  >
    <GuideHeader :app-version="appVersion" />
    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode1.eyebrow") }}
    </p>
    <h2 class="mb-2 text-xl font-semibold">
      {{ t("guide.steps.comparePins.title") }}
    </h2>
    <p class="mb-2 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.comparePins.body") }}
    </p>

    <!-- Chips + sort/display-settings mock -- same real Button/icon
         components as the live dialog's own top bar, same teleport
         constraint as the markup toolbar and comparison image below (see
         their own comments). Reuses R3/R1, the two demo pins already
         pinned on page 13 and shown in the comparison figure, so the chips
         here visibly refer to the same points. -->
    <div ref="comparePinsTopWrap" class="guide-callout-region relative">
      <div
        ref="comparePinsChipsRowWrap"
        class="flex flex-wrap items-center gap-1.5"
      >
        <span
          v-for="(pinRef, i) in ['R3', 'R1']"
          :key="pinRef"
          class="flex items-center gap-1 rounded-lg border border-primary/35 bg-primary/8 py-1 pr-1.5 pl-1 text-xs font-medium text-ink"
        >
          <GripVertical class="size-3 shrink-0 text-muted-foreground/60" />
          <span
            class="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
            >{{ i + 1 }}</span
          >
          <span class="font-mono">{{ pinRef }}</span>
          <X class="size-3 shrink-0 text-muted-foreground" />
        </span>
        <Button
          type="button"
          variant="outline"
          size="xs"
          class="gap-1 border-dashed border-primary/50 text-primary"
          disabled
        >
          <Plus class="size-3" />
          {{ t("fomcharts.compare.chips.addPoint") }}
        </Button>
      </div>
      <div
        ref="comparePinsSortRowWrap"
        class="mt-1 flex items-center justify-end gap-2"
      >
        <div
          class="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[10.5px] text-ink"
        >
          {{ t("fomcharts.compare.sort.selection") }}
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          class="gap-1.5 text-[10.5px]"
          disabled
        >
          <Settings2 class="size-3" />
          {{ t("fomcharts.compare.displaySettings") }}
        </Button>
      </div>
      <GuideMarkRing
        v-for="(m, i) in comparePinsTopMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
        side="top"
      />
    </div>
    <GuideMarkLegend
      class="mb-1.5"
      :compact="true"
      :items="[
        {
          label: t('guide.steps.comparePins.marks.manage.label'),
          body: t('guide.steps.comparePins.marks.manage.body'),
        },
      ]"
    />

    <div class="flex items-start gap-6">
      <div class="shrink-0">
        <!-- A genuine render of the multi-pin "Compare" dialog's own output
             (see AnnotationsPanel's exposed getComparePngDataUrl, which
             mirrors CompareDialog's own AnnotationCardData -> ComparePinData
             mapping with every section toggle at its default "on") for the
             two demo pins pinned on page 13 -- not the live dialog itself,
             since Dialog content teleports outside the `.guide-page` tree
             pdfExport.ts captures. -->
        <div class="guide-callout-region" style="width: 360px">
          <img
            v-if="comparePngUrl"
            :src="comparePngUrl"
            class="block w-full"
            :alt="t('fomcharts.compare.title')"
          />
        </div>
        <p
          class="mx-auto mt-1.5 max-w-90 text-center text-[11px] leading-snug text-secondary"
        >
          {{ t("guide.steps.comparePins.figureCaption") }}
        </p>
      </div>

      <div class="min-w-0 flex-1 pt-1">
        <div class="flex flex-col gap-1.5 text-xs">
          <p class="flex gap-1.5">
            <Check class="mt-0.5 size-3 shrink-0 text-primary" /><span
              ><strong class="text-primary"
                >{{ t("fomcharts.compare.origin") }} :</strong
              >
              {{ t("guide.steps.comparePins.sections.origin") }}</span
            >
          </p>
          <p class="flex gap-1.5">
            <Check class="mt-0.5 size-3 shrink-0 text-primary" /><span
              ><strong class="text-primary"
                >{{ t("fomcharts.annotations.mode") }} :</strong
              >
              {{ t("guide.steps.comparePins.sections.mode") }}</span
            >
          </p>
          <p class="flex gap-1.5">
            <Check class="mt-0.5 size-3 shrink-0 text-primary" /><span
              ><strong class="text-primary"
                >{{ t("fomcharts.annotations.layerStructure") }} :</strong
              >
              {{ t("guide.steps.comparePins.sections.structure") }}</span
            >
          </p>
          <p class="flex gap-1.5">
            <Check class="mt-0.5 size-3 shrink-0 text-primary" /><span
              ><strong class="text-primary"
                >{{ t("fomcharts.annotations.metrics") }} :</strong
              >
              {{ t("guide.steps.comparePins.sections.metrics") }}</span
            >
          </p>
          <p class="flex gap-1.5">
            <Check class="mt-0.5 size-3 shrink-0 text-primary" /><span
              ><strong class="text-primary"
                >{{ t("fomcharts.annotations.notes") }} :</strong
              >
              {{ t("guide.steps.comparePins.sections.notes") }}</span
            >
          </p>
        </div>
      </div>
    </div>

    <!-- Mark-up toolbar -- a hand-assembled mock (same real Button/icon
         components, grouped exactly like CompareDialog's own toolbar)
         rather than the live dialog, same teleport constraint as the
         comparison image above. Full page width, not squeezed into the
         right column above, since the real toolbar now has four groups
         (Konva-based free-form annotations, not just a pen). "Pen" is
         picked as the active tool so its color swatches render. -->
    <div class="mt-1.5">
      <h3 class="mb-1 text-sm font-semibold text-primary">
        {{ t("guide.steps.comparePins.markupTitle") }}
      </h3>
      <p class="mb-1.5 text-xs leading-snug text-secondary">
        {{ t("guide.steps.comparePins.markupBody") }}
      </p>
      <div
        ref="markupBlockWrap"
        class="relative flex flex-wrap items-end gap-x-4 gap-y-1.5"
      >
        <div
          ref="markupToolsWrap"
          class="flex flex-wrap items-end gap-x-3 gap-y-1.5"
        >
          <div class="flex flex-col gap-1">
            <span
              class="pl-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase"
              >{{ t("fomcharts.compare.tools.groupTools") }}</span
            >
            <div
              class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <MousePointer2 class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <Hand class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground"
              >
                <Pen class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <Rows3 class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <Ellipse class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <ArrowUpRight class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <Underline class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <StickyNote class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <Eraser class="size-3.5" />
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span
              class="pl-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase"
              >{{ t("fomcharts.compare.tools.groupStamps") }}</span
            >
            <div
              class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <Star class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <CheckCircle2 class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
              >
                <X class="size-3.5" />
              </Button>
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span
              class="pl-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase"
              >{{ t("fomcharts.compare.tools.groupColor") }}</span
            >
            <div class="flex h-7 items-center gap-1.5">
              <span
                v-for="c in markupPenColors"
                :key="c"
                class="size-4 rounded-full border-2"
                :class="
                  markupPenColor === c ? 'border-ink' : 'border-transparent'
                "
                :style="{ background: c }"
              />
            </div>
          </div>
          <div class="flex flex-col gap-1">
            <span
              class="pl-0.5 text-[9px] font-bold tracking-wider text-muted-foreground uppercase"
              >{{ t("fomcharts.compare.tools.groupHistory") }}</span
            >
            <div
              class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card"
            >
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
                disabled
              >
                <Undo2 class="size-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="rounded-none text-secondary"
                disabled
              >
                <Redo2 class="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="link"
          size="xs"
          class="h-auto shrink-0 pb-1 text-[10.5px]"
        >
          {{ t("fomcharts.compare.tools.reset") }}
        </Button>
        <GuideMarkRing
          v-for="(m, i) in comparePinsMarks"
          :key="i"
          :mark="m"
          :number="i + 1"
          side="top"
        />
      </div>
      <GuideMarkLegend
        class="mt-1.5"
        :compact="true"
        :items="[
          {
            label: t('guide.steps.comparePins.markupMarks.tools.label'),
            body: t('guide.steps.comparePins.markupMarks.tools.body'),
          },
          {
            label: t('guide.steps.comparePins.markupMarks.clear.label'),
            body: t('guide.steps.comparePins.markupMarks.clear.body'),
          },
        ]"
      />
    </div>

    <div class="mt-2.5 rounded-xl border border-border bg-muted/30 px-4 py-2">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.comparePins.note") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import {
  ArrowUpRight,
  Check,
  CheckCircle2,
  Eraser,
  Ellipse,
  GripVertical,
  Hand,
  MousePointer2,
  Pen,
  Plus,
  Redo2,
  Rows3,
  Settings2,
  Star,
  StickyNote,
  Undo2,
  Underline,
  X,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  comparePinsTopMarks: GuideMark[];
  comparePinsMarks: GuideMark[];
  comparePngUrl: string | null;
}>();

const { t } = useI18n();

// Same 4 colorblind-safe Okabe-Ito swatches as the real ANNOTATION_COLORS
// (see utils/compareExport.ts), not invented. "Pen" is the tool styled
// active above (rather than the default "Selection"), so its color
// swatches actually render, since the palette only ever shows while a
// drawing tool is active.
const markupPenColors = ["#0072b2", "#e69f00", "#009e73", "#cc79a7"];
const markupPenColor = markupPenColors[0];

const comparePinsTopWrap = useTemplateRef<HTMLDivElement>(
  "comparePinsTopWrap",
);
const comparePinsChipsRowWrap = useTemplateRef<HTMLDivElement>(
  "comparePinsChipsRowWrap",
);
const comparePinsSortRowWrap = useTemplateRef<HTMLDivElement>(
  "comparePinsSortRowWrap",
);
const markupBlockWrap = useTemplateRef<HTMLDivElement>("markupBlockWrap");
const markupToolsWrap = useTemplateRef<HTMLDivElement>("markupToolsWrap");

defineExpose({
  comparePinsTopWrap,
  comparePinsChipsRowWrap,
  comparePinsSortRowWrap,
  markupBlockWrap,
  markupToolsWrap,
});
</script>
