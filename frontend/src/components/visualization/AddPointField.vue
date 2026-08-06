<template>
  <div class="flex flex-col gap-1.5">
    <div class="flex items-center justify-between gap-2">
      <Label :for="`add-point-${field.column}`" class="flex items-center gap-1 text-[11px] text-muted-foreground">
        {{ label }}
        <span v-if="field.required" class="text-rose-500">*</span>
        <InfoTooltip v-if="hint" :text="hint" icon-class="text-muted-foreground/70 hover:text-secondary" />
      </Label>
    </div>

    <!-- Q-factor, once both Resonance Wavelength and FWHM are filled in:
         locked, computed display (Q = λ / FWHM) instead of a free input, so
         it can never silently drift out of sync with the two values it's
         derived from. "Saisir une autre valeur" hands control back for the
         (common enough) case where the paper states Q directly instead. -->
    <div
      v-if="showComputedDisplay"
      class="flex items-center gap-2 rounded-md border border-secondary/20 bg-secondary/5 px-2.5 py-1.5 text-sm"
    >
      <span class="font-medium tabular-nums">{{ modelValue }}</span>
      <span class="text-[10px] text-muted-foreground">{{ t("fomcharts.addPoint.autoComputedBadge") }}</span>
      <button
        type="button"
        class="ml-auto shrink-0 text-[10.5px] font-medium text-primary hover:underline"
        @click="emit('update:manualOverride', true)"
      >
        {{ t("fomcharts.addPoint.useManualQFactor") }}
      </button>
    </div>

    <!-- :model-value/@update:model-value rather than plain v-model -- on
         type="number", Vue's v-model auto-casts to a real JS number even
         without the .number modifier (el.type === "number" alone triggers
         it), which would silently turn this into a number and break
         `modelValue`'s string-only contract (values.value is typed/treated
         as Record<string, string> everywhere else in AddPointDialog). -->
    <span v-else-if="field.kind === 'numeric'" class="relative block">
      <Input
        :id="`add-point-${field.column}`"
        :model-value="modelValue"
        type="number"
        step="any"
        :required="field.required"
        :placeholder="placeholder"
        class="h-8 pr-7 text-sm"
        :class="hideSpinner ? '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none' : ''"
        @update:model-value="(v) => (modelValue = String(v))"
      />
      <button
        v-if="modelValue"
        type="button"
        class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
        :aria-label="t('fomcharts.addPoint.clearField')"
        @click="clear"
      >
        <X class="size-3.5" />
      </button>
    </span>

    <Select v-else-if="field.kind === 'select'" v-model="modelValue">
      <SelectTrigger :id="`add-point-${field.column}`" size="sm" class="w-full min-w-0 bg-card">
        <SelectValue class="min-w-0 truncate" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</SelectItem>
      </SelectContent>
    </Select>

    <span v-else class="relative block">
      <Input
        :id="`add-point-${field.column}`"
        v-model="modelValue"
        type="text"
        :required="field.required"
        :maxlength="maxLength"
        :placeholder="placeholder"
        class="h-8 pr-7 text-sm"
      />
      <button
        v-if="modelValue"
        type="button"
        class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
        :aria-label="t('fomcharts.addPoint.clearField')"
        @click="clear"
      >
        <X class="size-3.5" />
      </button>
    </span>

    <button
      v-if="hasComputed && manualOverride"
      type="button"
      class="self-start text-[10.5px] font-medium text-primary hover:underline"
      @click="emit('update:manualOverride', false)"
    >
      {{ t("fomcharts.addPoint.useComputedQFactor", { value: computedValue }) }}
    </button>
    <span v-if="maxLength" class="self-end text-[10px] text-muted-foreground">{{ modelValue.length }}/{{ maxLength }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { X } from "@lucide/vue";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import {
  findResonanceWavelengthColumn,
  findFomValueColumn,
  findSensitivityColumn,
  findFwhmColumn,
  findQFactorColumn,
  findModeIdColumn,
  findModeDescriptionColumn,
  type ManualPointField,
} from "@/utils/columnTypes";

/**
 * One "simple" Add Point field (numeric / free text / closed select) --
 * factored out of AddPointDialog since the same rendering is needed in
 * several grouped sections (the required axis fields, optional metrics,
 * optional context fields). Structure/material fields (kind "tags"/"layers")
 * are richer widgets (MaterialsTagsField/LayerStructureField) and stay
 * directly in AddPointDialog instead.
 *
 * Matches fields by COLUMN identity via find*Column against a one-element
 * array, not `field.labelKey` -- labelKey is left undefined whenever this
 * exact column also happens to be the current chart's X/Y axis (see
 * buildManualPointFields), which is the common case for Resonance
 * Wavelength/FOM. Matching by column keeps the spinner/hint/placeholder/
 * Q-factor behavior correct even then, instead of silently only working when
 * the field isn't also the plotted axis.
 */
const props = withDefaults(
  defineProps<{
    field: ManualPointField;
    label: string;
    /** Live Q = λ / FWHM, already rounded -- only ever passed for the
     * Q-factor field (see AddPointDialog); undefined/null everywhere else
     * and whenever λ or FWHM isn't filled in yet. */
    computedValue?: number | null;
    /** Whether the researcher has taken back manual control of a
     * computable Q-factor -- owned by AddPointDialog (there's only one
     * Q-factor field per form), toggled here via the two buttons below. */
    manualOverride?: boolean;
  }>(),
  { computedValue: undefined, manualOverride: false },
);

const emit = defineEmits<{
  "update:manualOverride": [value: boolean];
}>();

const { t } = useI18n();

const modelValue = defineModel<string>({ default: "" });

const clear = () => {
  modelValue.value = "";
};

// Small explanatory tooltip -- Q-factor in particular has no obvious "just
// read it off the paper" feel the way a wavelength or FOM number does, and
// gives the one calculation (Q = λ / FWHM) that lets it be filled in even
// when the paper never states it directly (now also done automatically, see
// computedValue above -- this tooltip still matters for the manual-entry case).
// Mode ID gets its own hint for the opposite reason: it's the one field in
// Finaliser that's fine to skip outright (a mode already has its own
// description elsewhere in the form), which isn't obvious from the label
// alone.
const hint = computed(() => {
  if (findQFactorColumn([props.field.column])) return t("fomcharts.addPoint.qFactorHint");
  if (findModeIdColumn([props.field.column])) return t("fomcharts.addPoint.modeIdHint");
  return null;
});

// Mode ID is a small, exact integer (1, 2, 3...) -- the native spinner is
// exactly the right tool there. Every other numeric field here spans a much
// wider, often decimal range (FOM, wavelengths, Q-factor in the thousands),
// where incrementing one unit at a time by clicking a tiny arrow is not a
// realistic way to reach the actual value -- hidden in favor of typing
// (still fully decimal-capable via step="any").
const hideSpinner = computed(() => props.field.kind === "numeric" && !findModeIdColumn([props.field.column]));

// Character cap for Mode Description only -- mirrors the extraction
// prompt's own "maximum 7 words" guidance for this same column (see
// backend/prompt.txt) so a manual point can't drift into a free-form
// paragraph here.
const maxLength = computed(() => (findModeDescriptionColumn([props.field.column]) ? 120 : undefined));

// Q-factor: once computedValue is available, the field renders as a locked,
// computed display instead of a free input unless the researcher explicitly
// asked for manual control (see AddPointDialog's own sync logic, which also
// flips manualOverride on automatically the moment it detects the field
// already holds a value it didn't just write there itself).
const hasComputed = computed(() => props.computedValue !== undefined && props.computedValue !== null);
const showComputedDisplay = computed(() => hasComputed.value && !props.manualOverride);

// A short example value per known quantity -- every field here is always in
// its canonical unit now (nm / nm/RIU / dimensionless), see the standalone
// converter (UnitConverterPopover) for µm/pm entry instead of a per-field
// toggle. Matched by COLUMN identity, not `labelKey` -- same gotcha as hint/
// hideSpinner above: labelKey is left undefined whenever this column is also
// the current chart's X/Y axis, the common case for Resonance Wavelength/FOM.
// A bespoke, dataset-specific column matching none of these gets no
// placeholder rather than a guessed one.
const placeholder = computed(() => {
  const col = [props.field.column];
  if (findResonanceWavelengthColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.resonanceWavelength");
  if (findFomValueColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.fom");
  if (findSensitivityColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.sensitivity");
  if (findFwhmColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.fwhm");
  if (findQFactorColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.qFactor");
  if (findModeIdColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.modeId");
  if (findModeDescriptionColumn(col)) return t("fomcharts.addPoint.fieldPlaceholders.modeDescription");
  return undefined;
});
</script>
