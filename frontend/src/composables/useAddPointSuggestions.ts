import { computed, ref, watch, type Ref } from "vue";
import {
  findFwhmColumn,
  findQFactorColumn,
  findResonanceWavelengthColumn,
  type ManualPointField,
} from "@/utils/columnTypes";

const MATERIAL_CLASS_PREVIEW_COUNT = 3;

/**
 * Two independent suggestion/computation engines pulled out of
 * AddPointDialog.vue's step-navigation code -- both key off the wizard's own
 * values/tagsValues maps but don't otherwise touch step flow:
 *
 * - Q-factor auto-compute (Q = λ / FWHM), wired here rather than inside
 *   AddPointField since it needs both Resonance Wavelength and FWHM, which
 *   can each land in requiredFields (if picked as an axis) or metricFields
 *   depending on the current chart, but always share the same `values` map.
 *   Matched by COLUMN identity (find*Column), not `labelKey` -- labelKey is
 *   left undefined whenever one of these three columns is also the current
 *   chart's X/Y axis (see buildManualPointFields/AddPointField's own doc
 *   comment on this exact gotcha), which is a common case for Resonance
 *   Wavelength in particular.
 *
 * - Material Class <-> Base Materials suggestion: Base Materials comes first
 *   in the structure cascade (see buildManualPointFields), so Material Class
 *   is a verification step -- pre-suggest the classes this dataset
 *   associates with those materials (materialsByClass prop) and let the
 *   researcher confirm/adjust rather than pick blind.
 */
export function useAddPointSuggestions(deps: {
  fields: Ref<ManualPointField[]>;
  materialsByClass: Ref<Record<string, string[]>>;
  values: Ref<Record<string, string>>;
  tagsValues: Ref<Record<string, string[]>>;
}) {
  const { fields, materialsByClass, values, tagsValues } = deps;

  const wavelengthField = computed(
    () => fields.value.find((f) => findResonanceWavelengthColumn([f.column])) ?? null,
  );
  const fwhmField = computed(
    () => fields.value.find((f) => findFwhmColumn([f.column])) ?? null,
  );
  const qFactorField = computed(
    () => fields.value.find((f) => findQFactorColumn([f.column])) ?? null,
  );

  // Shared by computedQFactor below and seedQFactor, so a point that already
  // has both inputs filled in (typically edit mode) gets the exact same
  // number from the very first render as it would from typing FWHM live --
  // no separate "seed" formula to keep in sync with this one.
  const calcQFactor = (lambda: number, fwhm: number): number => {
    const q = lambda / fwhm;
    return q >= 100 ? Math.round(q) : Math.round(q * 100) / 100;
  };

  const computedQFactor = computed<number | null>(() => {
    if (!wavelengthField.value || !fwhmField.value) return null;
    const lambdaRaw = values.value[wavelengthField.value.column];
    const fwhmRaw = values.value[fwhmField.value.column];
    if (!lambdaRaw || !fwhmRaw) return null;
    const lambda = Number(lambdaRaw);
    const fwhm = Number(fwhmRaw);
    if (!isFinite(lambda) || !isFinite(fwhm) || fwhm <= 0) return null;
    return calcQFactor(lambda, fwhm);
  });
  const qFactorManualOverride = ref(false);
  // Remembers the last value THIS sync wrote, so a later re-run of the watcher
  // below can tell "the field still holds what we last computed" (safe to keep
  // recomputing) apart from "the researcher typed their own number in the
  // meantime" (hand back control instead of clobbering it).
  const lastAutoQFactorValue = ref<string | null>(null);
  watch(computedQFactor, (q) => {
    const field = qFactorField.value;
    if (!field || qFactorManualOverride.value || q === null) return;
    const current = values.value[field.column] ?? "";
    if (current !== "" && current !== lastAutoQFactorValue.value) {
      qFactorManualOverride.value = true;
      return;
    }
    const next = String(q);
    values.value[field.column] = next;
    lastAutoQFactorValue.value = next;
  });

  /**
   * Called from AddPointDialog's resetForm once nextValues is built --
   * Q-factor always prefers the live computation the instant both inputs
   * are available, even in edit mode on a point that already carries a
   * stored value -- manual entry is an explicit opt-out ("Enter a different
   * value"), never something the researcher has to opt back INTO just to
   * see a number the form could already compute for them. Called explicitly
   * here rather than left to the watch(computedQFactor, ...) above, since
   * that watcher only fires on a subsequent change and both inputs can
   * already be filled in on the very first render (edit mode).
   */
  const seedQFactor = (nextValues: Record<string, string>) => {
    if (qFactorField.value && wavelengthField.value && fwhmField.value) {
      const lambdaRaw = nextValues[wavelengthField.value.column];
      const fwhmRaw = nextValues[fwhmField.value.column];
      const lambda = Number(lambdaRaw);
      const fwhm = Number(fwhmRaw);
      if (lambdaRaw && fwhmRaw && isFinite(lambda) && isFinite(fwhm) && fwhm > 0) {
        const q = calcQFactor(lambda, fwhm);
        nextValues[qFactorField.value.column] = String(q);
        lastAutoQFactorValue.value = String(q);
      } else {
        lastAutoQFactorValue.value = null;
      }
    } else {
      lastAutoQFactorValue.value = null;
    }
    qFactorManualOverride.value = false;
  };

  const materialClassField = computed(
    () => fields.value.find((f) => f.labelKey === "materialClass") ?? null,
  );
  const baseMaterialsField = computed(
    () => fields.value.find((f) => f.labelKey === "baseMaterials") ?? null,
  );

  // Preview of which Base Materials each Material Class option typically
  // covers in this dataset (materialsByClass prop, see AddPointDialog's own
  // doc comment on it) -- shown in parentheses next to the class name so
  // verifying a suggested (or picking a manual) class is an informed choice,
  // not a blind guess.
  const materialClassHints = computed<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const [cls, materials] of Object.entries(materialsByClass.value)) {
      if (materials.length === 0) continue;
      const preview = materials.slice(0, MATERIAL_CLASS_PREVIEW_COUNT).join(", ");
      out[cls] =
        materials.length > MATERIAL_CLASS_PREVIEW_COUNT ? `${preview}…` : preview;
    }
    return out;
  });

  // Reverse of the materialsByClass prop -- which Material Class(es) this
  // dataset associates with a given Base Material, e.g. "Graphene" -> ["2D
  // Material"]. Drives the auto-suggested Material Class checkboxes below.
  const classesByMaterial = computed<Record<string, string[]>>(() => {
    const out: Record<string, string[]> = {};
    for (const [cls, materials] of Object.entries(materialsByClass.value)) {
      for (const material of materials) (out[material] ??= []).push(cls);
    }
    return out;
  });

  // Union of classes this dataset associates with every Base Material picked
  // so far -- the researcher already knows what their sensor is made of
  // (Base Materials comes first in the cascade, see buildManualPointFields),
  // so Material Class is a verification step: pre-suggest the classes that
  // go with those materials and let them confirm/adjust rather than pick
  // blind.
  const suggestedMaterialClasses = computed<string[]>(() => {
    if (!baseMaterialsField.value) return [];
    const selected = tagsValues.value[baseMaterialsField.value.column] ?? [];
    const out = new Set<string>();
    for (const material of selected)
      for (const cls of classesByMaterial.value[material] ?? []) out.add(cls);
    return Array.from(out).sort();
  });

  // Once the researcher edits Material Class themselves (any add/remove, see
  // updateTagsValue), the auto-sync below stops -- same "manual wins, for
  // good" precedent as Q-factor's manualOverride above, so a deliberate edit
  // is never silently clobbered by a later Base Materials change.
  const materialClassTouched = ref(false);
  watch(suggestedMaterialClasses, (suggested) => {
    if (materialClassTouched.value) return;
    const field = materialClassField.value;
    if (!field) return;
    tagsValues.value[field.column] = [...suggested];
  });

  // Routes every tags-field edit (Base Materials, Material Class) through one
  // place so Material Class specifically can flip materialClassTouched the
  // moment the researcher edits it directly -- a plain v-model on tagsValues
  // can't tell "the auto-sync watcher wrote this" apart from "the researcher
  // clicked a checkbox."
  const updateTagsValue = (field: ManualPointField, value: string[]) => {
    if (field.labelKey === "materialClass") materialClassTouched.value = true;
    tagsValues.value[field.column] = value;
  };

  /**
   * Called from AddPointDialog's resetForm once nextTags is built -- a
   * Material Class value already present on the row being loaded (edit
   * mode) is authoritative and must not be silently replaced by a guess, so
   * only a genuinely empty Material Class starts in auto-suggest mode.
   */
  const seedMaterialClassTouched = (nextTags: Record<string, string[]>) => {
    materialClassTouched.value =
      (materialClassField.value
        ? (nextTags[materialClassField.value.column] ?? [])
        : []
      ).length > 0;
  };

  return {
    qFactorField,
    computedQFactor,
    qFactorManualOverride,
    seedQFactor,
    baseMaterialsField,
    materialClassHints,
    suggestedMaterialClasses,
    materialClassTouched,
    updateTagsValue,
    seedMaterialClassTouched,
  };
}
