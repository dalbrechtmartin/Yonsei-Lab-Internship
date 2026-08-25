<template>
  <div
    class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto rounded-[10px] border border-secondary/15 bg-card/80 p-4"
  >
    <p class="text-xs font-semibold tracking-[0.2em] text-secondary uppercase">
      {{ t("extraction.review.edit.title") }}
    </p>

    <div class="grid grid-cols-2 gap-3">
      <div v-for="f in primaryFields" :key="f.key" class="flex flex-col gap-1">
        <Label :for="`edit-${f.key}`" class="text-xs text-secondary">{{
          t(f.labelKey)
        }}</Label>
        <Input
          :id="`edit-${f.key}`"
          v-model="form[f.key]"
          :type="f.type === 'number' ? 'number' : 'text'"
          class="h-8 text-sm"
        />
      </div>
    </div>

    <CollapsibleSection
      v-model:open="moreOpen"
      :title="t('extraction.review.edit.moreFields')"
    >
      <div class="grid grid-cols-2 gap-3 pt-2">
        <div v-for="f in moreFields" :key="f.key" class="flex flex-col gap-1">
          <Label :for="`edit-${f.key}`" class="text-xs text-secondary">{{
            t(f.labelKey)
          }}</Label>
          <Input
            :id="`edit-${f.key}`"
            v-model="form[f.key]"
            :type="f.type === 'number' ? 'number' : 'text'"
            class="h-8 text-sm"
          />
        </div>
      </div>
    </CollapsibleSection>

    <div class="mt-auto flex shrink-0 gap-2 pt-2">
      <Button type="button" class="flex-1" @click="handleSave">
        {{ t("extraction.review.edit.save") }}
      </Button>
      <Button
        type="button"
        variant="outline"
        class="flex-1"
        @click="emit('cancel')"
      >
        {{ t("extraction.review.edit.cancel") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import type { EditableRecordFields, ExtractionRecord } from "@/services/api";

interface FieldDef {
  key: keyof EditableRecordFields;
  labelKey: string;
  type: "text" | "number";
}

const props = defineProps<{ record: ExtractionRecord }>();
const emit = defineEmits<{
  save: [fields: Partial<EditableRecordFields>];
  cancel: [];
}>();

const { t } = useI18n();

// The fields already visible in the review table, front and center --
// the rest (17 possible editable columns total) are tucked behind "Plus de
// champs" so this doesn't become a wall of inputs by default.
const primaryFields: FieldDef[] = [
  { key: "ref", labelKey: "extraction.review.edit.fields.ref", type: "text" },
  {
    key: "resonanceWavelengthNm",
    labelKey: "extraction.review.edit.fields.resonanceWavelengthNm",
    type: "number",
  },
  { key: "fomRiuInv", labelKey: "extraction.review.edit.fields.fomRiuInv", type: "number" },
  { key: "fwhmNm", labelKey: "extraction.review.edit.fields.fwhmNm", type: "number" },
  { key: "qFactor", labelKey: "extraction.review.edit.fields.qFactor", type: "number" },
  { key: "origin", labelKey: "extraction.review.edit.fields.origin", type: "text" },
  { key: "materialClass", labelKey: "extraction.review.edit.fields.materialClass", type: "text" },
  { key: "baseMaterials", labelKey: "extraction.review.edit.fields.baseMaterials", type: "text" },
  { key: "notes", labelKey: "extraction.review.edit.fields.notes", type: "text" },
];

const moreFields: FieldDef[] = [
  { key: "title", labelKey: "extraction.review.edit.fields.title", type: "text" },
  { key: "shortTitle", labelKey: "extraction.review.edit.fields.shortTitle", type: "text" },
  { key: "modeId", labelKey: "extraction.review.edit.fields.modeId", type: "text" },
  {
    key: "modeDescription",
    labelKey: "extraction.review.edit.fields.modeDescription",
    type: "text",
  },
  {
    key: "layerStructure",
    labelKey: "extraction.review.edit.fields.layerStructure",
    type: "text",
  },
  { key: "domain", labelKey: "extraction.review.edit.fields.domain", type: "text" },
  {
    key: "spectralRange",
    labelKey: "extraction.review.edit.fields.spectralRange",
    type: "text",
  },
  { key: "definition", labelKey: "extraction.review.edit.fields.definition", type: "text" },
  {
    key: "sensitivityNmPerRiu",
    labelKey: "extraction.review.edit.fields.sensitivityNmPerRiu",
    type: "number",
  },
];

const moreOpen = ref(false);
const form = reactive<Record<string, string>>({});

function resetForm(record: ExtractionRecord) {
  for (const f of [...primaryFields, ...moreFields]) {
    const value = record[f.key];
    form[f.key] = value === null || value === undefined ? "" : String(value);
  }
}
watch(() => props.record, resetForm, { immediate: true });

function handleSave() {
  const fields: Partial<EditableRecordFields> = {};
  for (const f of [...primaryFields, ...moreFields]) {
    const raw = form[f.key].trim();
    (fields as Record<string, unknown>)[f.key] =
      raw === "" ? null : f.type === "number" ? Number(raw) : raw;
  }
  emit("save", fields);
}
</script>
