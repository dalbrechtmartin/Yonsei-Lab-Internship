<template>
  <Dialog v-model:open="open">
    <DialogContent class="max-w-2xl">
      <DialogTitle>{{ t("fomcharts.compare.title") }}</DialogTitle>
      <DialogDescription>{{ t("fomcharts.compare.description") }}</DialogDescription>

      <div class="mt-1 flex flex-col gap-3.5">
        <div class="flex flex-col gap-1.5">
          <Label for="compare-title" class="text-[11px] text-muted-foreground">{{ t("fomcharts.compare.titleLabel") }}</Label>
          <Input id="compare-title" v-model="titleText" :placeholder="t('fomcharts.compare.titlePlaceholder')" class="text-sm" />
        </div>

        <div class="flex flex-col gap-1.5">
          <span class="text-[11px] text-muted-foreground">{{ t("fomcharts.compare.sectionsLabel") }}</span>
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            <label class="flex items-center gap-1.5 text-xs text-ink select-none">
              <Checkbox v-model="showOrigin" />
              {{ t("fomcharts.compare.origin") }}
            </label>
            <label class="flex items-center gap-1.5 text-xs text-ink select-none">
              <Checkbox v-model="showMode" />
              {{ t("fomcharts.annotations.mode") }}
            </label>
            <label class="flex items-center gap-1.5 text-xs text-ink select-none">
              <Checkbox v-model="showStructure" />
              {{ t("fomcharts.annotations.layerStructure") }}
            </label>
            <label class="flex items-center gap-1.5 text-xs text-ink select-none">
              <Checkbox v-model="showMetrics" />
              {{ t("fomcharts.annotations.metrics") }}
            </label>
            <label class="flex items-center gap-1.5 text-xs text-ink select-none">
              <Checkbox v-model="showNotes" />
              {{ t("fomcharts.annotations.notes") }}
            </label>
          </div>
        </div>

        <div class="max-h-[50vh] overflow-auto rounded-md border border-secondary/20 bg-white p-2.5">
          <img v-if="previewUrl" :src="previewUrl" :alt="t('fomcharts.compare.title')" class="block" />
          <p v-else class="p-6 text-center text-xs text-muted-foreground">{{ t("fomcharts.compare.empty") }}</p>
        </div>

        <div class="flex justify-end">
          <Button
            size="sm"
            :disabled="!previewUrl"
            class="bg-primary text-primary-foreground hover:bg-primary/90"
            @click="handleDownload"
          >
            <Download class="size-3.5" />
            {{ t("fomcharts.compare.downloadPng") }}
          </Button>
        </div>
      </div>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Download } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { AnnotationCardData } from "@/utils/annotationCardData";
import type { AnnotationExportSection } from "@/utils/annotationExport";
import { exportComparePng, renderComparePng, type ComparePinData } from "@/utils/compareExport";

const { t } = useI18n();

const props = defineProps<{
  pins: AnnotationCardData[];
}>();

const open = defineModel<boolean>("open", { default: false });

// Each toggle defaults on -- an empty comparison on first open would look
// broken, and unchecking a section a user doesn't care about is one click.
const showOrigin = ref(true);
const showMode = ref(true);
const showStructure = ref(true);
const showMetrics = ref(true);
const showNotes = ref(true);
const titleText = ref("");

// Mirrors AnnotationCard's buildExportSections (same section titles, same
// Origin/Mode/Structure/Metrics/Notes split, see annotationCardData.ts) --
// just gated per-section by these toggles instead of always including all.
const comparePins = computed<ComparePinData[]>(() =>
  props.pins.map((d) => {
    const sections: AnnotationExportSection[] = [];
    if (showMode.value && (d.modeRows.length > 0 || d.modeDescription)) {
      sections.push({ title: t("fomcharts.annotations.mode"), rows: d.modeRows, text: d.modeDescription ?? undefined });
    }
    if (showStructure.value && (d.structureExtraFields.length > 0 || d.layers.length > 0)) {
      sections.push({ title: t("fomcharts.annotations.layerStructure"), rows: d.structureExtraFields, layers: d.layers });
    }
    if (showMetrics.value && d.metricsRows.length > 0) {
      sections.push({ title: t("fomcharts.annotations.metrics"), rows: d.metricsRows });
    }
    if (showNotes.value && d.note) {
      sections.push({ title: t("fomcharts.annotations.notes"), text: d.note });
    }
    return { ref: d.ref, title: d.title, origin: showOrigin.value ? d.origin : null, sections };
  }),
);

const hasContent = computed(() => comparePins.value.some((p) => p.origin || p.sections.length > 0));
const previewUrl = computed(() => (hasContent.value ? renderComparePng(titleText.value, comparePins.value) : null));

const handleDownload = () => {
  if (!hasContent.value) return;
  exportComparePng(titleText.value || null, comparePins.value);
};
</script>
