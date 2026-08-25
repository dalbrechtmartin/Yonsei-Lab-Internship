<template>
  <Dialog v-model:open="open">
    <DialogContent
      class="flex h-128 max-h-[90vh] max-w-3xl flex-col overflow-hidden"
    >
      <TooltipProvider :delay-duration="200">
        <div class="flex min-h-0 flex-1 flex-col">
          <div class="flex shrink-0 flex-col gap-1">
            <DialogTitle>{{
              mode === "edit"
                ? t("fomcharts.addPoint.editTitle")
                : t("fomcharts.addPoint.title")
            }}</DialogTitle>
            <DialogDescription>
              {{
                mode === "edit"
                  ? t("fomcharts.addPoint.editDescription")
                  : t("fomcharts.addPoint.description")
              }}
            </DialogDescription>
          </div>

          <!-- Step indicator -- a badge per step (icon names what that step
             covers) linked by connector lines, matching the wireframe's
             wizard stepper. Only the current step is picked out (filled
             primary badge, full opacity); every other step -- past or
             future alike -- gets the same muted outline, exactly like the
             mockup: this stepper communicates WHERE you are, not a
             done/not-done trail. -->
          <div class="mt-4 flex shrink-0 items-center gap-1.5">
            <template v-for="(s, i) in steps" :key="s.key">
              <div
                class="flex items-center gap-1.5"
                :class="s.key === step ? '' : 'opacity-55'"
              >
                <span
                  class="flex size-6 shrink-0 items-center justify-center rounded-full"
                  :class="
                    s.key === step ? 'bg-primary' : 'border-[1.5px] border-ink'
                  "
                >
                  <component
                    :is="s.icon"
                    class="size-3"
                    :class="
                      s.key === step ? 'text-primary-foreground' : 'text-ink'
                    "
                  />
                </span>
                <span
                  class="text-[10.5px] font-bold whitespace-nowrap"
                  :class="s.key === step ? 'text-primary' : 'text-ink'"
                >
                  {{ s.key }}. {{ s.label }}
                </span>
              </div>
              <div
                v-if="i < steps.length - 1"
                class="h-0.5 min-w-1.5 flex-1 bg-secondary/15"
              />
            </template>
          </div>

          <form
            class="mt-3.5 flex min-h-0 flex-1 flex-col gap-3.5"
            @submit.prevent="handleSubmit"
          >
            <!-- No fixed vh cap here -- this scroll area simply takes whatever
               room is left after the title/stepper/footer (which never
               shrink), capped overall by DialogContent's own max-h-[88vh].
               A flat vh number here previously clipped content (the char
               counter, the provenance alert) below the fold with no visible
               scrollbar on a short/unmaximized window, even though the rest
               of the dialog had unused space to give it. -->
            <div
              class="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto pr-1"
            >
              <!-- Step 1: Essentiel -->
              <template v-if="step === 1">
                <div class="flex flex-col gap-1.5">
                  <Label
                    for="add-point-label"
                    class="flex items-center gap-1 text-[11px] text-muted-foreground"
                  >
                    {{ t("fomcharts.addPoint.labelField") }}
                    <span class="text-rose-500">*</span>
                  </Label>
                  <span class="relative block">
                    <Input
                      id="add-point-label"
                      v-model="label"
                      :placeholder="t('fomcharts.addPoint.labelPlaceholder')"
                      class="h-8 pr-7 text-sm"
                      required
                    />
                    <button
                      v-if="label"
                      type="button"
                      class="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
                      :aria-label="t('fomcharts.addPoint.clearField')"
                      @click="label = ''"
                    >
                      <X class="size-3.5" />
                    </button>
                  </span>
                </div>

                <!-- Wider-than-tall dialog, so from here on Essentials splits
                   into two columns: left is "the numbers" (axis values +
                   Domain), right is "identification" (optional Mode section
                   + Origin/Shape) -- two natural, independent groups rather
                   than one long single-column stack. -->
                <div class="grid grid-cols-2 gap-x-6 gap-y-3.5">
                  <div class="flex flex-col gap-3.5">
                    <div
                      v-if="requiredFields.length"
                      class="grid grid-cols-2 gap-x-4 gap-y-3"
                    >
                      <AddPointField
                        v-for="field in requiredFields"
                        :key="field.column"
                        v-model="values[field.column]"
                        :field="field"
                        :label="fieldLabel(field)"
                        :computed-value="
                          findQFactorColumn([field.column])
                            ? computedQFactor
                            : undefined
                        "
                        :manual-override="
                          findQFactorColumn([field.column])
                            ? qFactorManualOverride
                            : false
                        "
                        @update:manual-override="
                          (v) => {
                            if (findQFactorColumn([field.column]))
                              qFactorManualOverride = v;
                          }
                        "
                      />
                    </div>

                    <!-- Domain: a quick classification pick like the axes
                       above, so it belongs in Essentials rather than
                       stranded in Finaliser next to the free-text fields. -->
                    <div v-if="domainField" class="flex flex-col gap-1.5">
                      <AddPointField
                        v-model="values[domainField.column]"
                        :field="domainField"
                        :label="fieldLabel(domainField)"
                      />
                    </div>
                  </div>

                  <div class="flex flex-col gap-3.5">
                    <!-- Mode ID + Mode Description: one optional sub-section,
                       folded by default -- a mode already has its own axis
                       values plotting it, so this is precision worth an
                       explicit unfold rather than two more boxes competing
                       with the required fields above. -->
                    <div
                      v-if="modeIdField || modeDescriptionField"
                      class="flex flex-col gap-1.5"
                    >
                      <button
                        type="button"
                        class="flex items-center gap-1.5 text-left"
                        @click="modeSectionOpen = !modeSectionOpen"
                      >
                        <ChevronRight
                          class="size-3 shrink-0 text-muted-foreground transition-transform duration-200"
                          :class="modeSectionOpen ? 'rotate-90' : ''"
                        />
                        <span class="text-[11px] font-bold text-ink">{{
                          t("fomcharts.addPoint.modeSectionLabel")
                        }}</span>
                      </button>
                      <div
                        class="grid transition-[grid-template-rows] duration-250 ease-out"
                        :style="{
                          gridTemplateRows: modeSectionOpen ? '1fr' : '0fr',
                        }"
                      >
                        <div class="min-h-0 overflow-hidden">
                          <div class="flex flex-wrap items-start gap-3 pt-1">
                            <div v-if="modeIdField" class="w-24 shrink-0">
                              <AddPointField
                                v-model="values[modeIdField.column]"
                                :field="modeIdField"
                                :label="fieldLabel(modeIdField)"
                              />
                            </div>
                            <AddPointField
                              v-if="modeDescriptionField"
                              v-model="values[modeDescriptionField.column]"
                              :field="modeDescriptionField"
                              :label="fieldLabel(modeDescriptionField)"
                              class="min-w-40 flex-1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Origin + Point shape share a row -- quick
                       identification, not measurements. Origin is a fused
                       2-3 way toggle rather than the Select every other
                       field uses -- matching the mockup, and reasonable
                       given it's always a short, closed list (SIM/EXP). -->
                    <div class="flex flex-wrap items-start gap-4">
                      <div v-if="originField" class="flex flex-col gap-1.5">
                        <Label class="text-[11px] text-muted-foreground">{{
                          fieldLabel(originField)
                        }}</Label>
                        <div
                          class="inline-flex overflow-hidden rounded-md border border-input"
                        >
                          <button
                            v-for="(opt, idx) in originField.options"
                            :key="opt"
                            type="button"
                            class="px-3 py-1.5 text-xs font-semibold transition-colors"
                            :class="[
                              values[originField.column] === opt
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-card text-muted-foreground hover:bg-secondary/10 hover:text-ink',
                              idx > 0 ? 'border-l border-input' : '',
                            ]"
                            @click="values[originField.column] = opt"
                          >
                            {{ opt }}
                          </button>
                        </div>
                      </div>
                      <div class="flex min-w-0 flex-col gap-1.5">
                        <Label class="text-[11px] text-muted-foreground">{{
                          t("fomcharts.addPoint.sections.shape")
                        }}</Label>
                        <PointShapeField v-model="shape" />
                      </div>
                    </div>
                  </div>
                </div>
              </template>

              <!-- Step 2: Métriques -->
              <template v-else-if="step === 2">
                <template v-if="metricFields.length">
                  <!-- Q-factor gets its own full-width row -- it's not just
                     another manual field, it's a live computation (Q = λ /
                     FWHM), so it shouldn't be squeezed into a grid cell the
                     same as a plain measurement. -->
                  <div
                    v-if="plainMetricFields.length"
                    class="grid grid-cols-3 gap-x-4 gap-y-3"
                  >
                    <AddPointField
                      v-for="field in plainMetricFields"
                      :key="field.column"
                      v-model="values[field.column]"
                      :field="field"
                      :label="fieldLabel(field)"
                    />
                  </div>
                  <AddPointField
                    v-if="qFactorField"
                    v-model="values[qFactorField.column]"
                    :field="qFactorField"
                    :label="fieldLabel(qFactorField)"
                    :computed-value="computedQFactor"
                    :manual-override="qFactorManualOverride"
                    @update:manual-override="(v) => (qFactorManualOverride = v)"
                  />
                </template>
                <p v-else class="text-xs text-muted-foreground">
                  {{ t("fomcharts.addPoint.noMetricFields") }}
                </p>
              </template>

              <!-- Step 3: Structure & matériaux -- a numbered, sequentially
                 locked cascade (Base Materials -> Material Class -> Layer
                 Structure): each node folds/unfolds independently and shows
                 a summary badge once it has a value, but a node stays locked
                 and non-interactive until the previous one has at least one
                 value. Materials come first (what the sensor is physically
                 made of), Material Class second as a verification step
                 (auto-suggested from those materials, see
                 suggestedMaterialClasses) -- unlocking never auto-opens the
                 next node, so picking several materials or classes in a row
                 never gets interrupted mid-selection. -->
              <template v-else-if="step === 3">
                <template v-if="structureFields.length">
                  <p class="text-[11px] text-muted-foreground">
                    {{ t("fomcharts.addPoint.structureIntro") }}
                  </p>
                  <div class="flex flex-col">
                    <div
                      v-for="(field, index) in structureFields"
                      :key="field.column"
                      class="flex gap-2.5"
                    >
                      <div class="flex shrink-0 flex-col items-center">
                        <span
                          class="flex size-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-bold"
                          :class="
                            isStructureNodeLocked(index)
                              ? 'border-[1.5px] border-dashed border-secondary/30 text-muted-foreground/70'
                              : isStructureNodeExpanded(field)
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-ink text-white'
                          "
                        >
                          <Lock
                            v-if="isStructureNodeLocked(index)"
                            class="size-2.5"
                          />
                          <template v-else>{{ index + 1 }}</template>
                        </span>
                        <div
                          v-if="index < structureFields.length - 1"
                          class="mt-0.5 min-h-4 w-[1.5px] flex-1 bg-secondary/20"
                        />
                      </div>

                      <div class="min-w-0 flex-1 pb-4">
                        <button
                          type="button"
                          class="flex w-full min-w-0 items-center gap-1.5 py-0.5 text-left"
                          :class="
                            isStructureNodeLocked(index)
                              ? 'cursor-not-allowed'
                              : ''
                          "
                          :disabled="isStructureNodeLocked(index)"
                          @click="toggleStructureNode(field.column)"
                        >
                          <ChevronRight
                            class="size-3 shrink-0 transition-transform duration-200"
                            :class="[
                              isStructureNodeLocked(index)
                                ? 'opacity-40'
                                : 'text-muted-foreground',
                              isStructureNodeExpanded(field) &&
                              !isStructureNodeLocked(index)
                                ? 'rotate-90'
                                : '',
                            ]"
                          />
                          <span
                            class="min-w-0 flex-1 truncate text-[11px] font-bold text-ink"
                            :class="
                              isStructureNodeLocked(index) ? 'opacity-40' : ''
                            "
                          >
                            {{ fieldLabel(field) }}
                          </span>
                          <span
                            v-if="structureNodeSummary(field)"
                            class="shrink-0 rounded-full bg-secondary/8 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                          >
                            {{ structureNodeSummary(field) }}
                          </span>
                        </button>

                        <p
                          v-if="isStructureNodeLocked(index)"
                          class="mt-1 text-[10.5px] text-muted-foreground/70"
                        >
                          {{
                            t("fomcharts.addPoint.structureLocked", {
                              field: fieldLabel(structureFields[index - 1]),
                            })
                          }}
                        </p>

                        <!-- Same grid-template-rows 0fr/1fr technique as
                           CollapsibleSection (see shared/CollapsibleSection.vue)
                           -- smooth height animation without measuring, and the
                           same feel as every other foldable panel in the app.
                           Rendered (not v-if) whenever unlocked so a search
                           query mid-fold isn't lost, only visually clipped. -->
                        <div
                          v-else
                          class="grid transition-[grid-template-rows] duration-250 ease-out"
                          :style="{
                            gridTemplateRows: isStructureNodeExpanded(field)
                              ? '1fr'
                              : '0fr',
                          }"
                        >
                          <div class="min-h-0 overflow-hidden">
                            <div class="flex flex-col gap-1.5 pt-2">
                              <p
                                v-if="
                                  field.labelKey === 'materialClass' &&
                                  !materialClassTouched &&
                                  suggestedMaterialClasses.length
                                "
                                class="text-[10.5px] text-muted-foreground"
                              >
                                {{
                                  t(
                                    "fomcharts.addPoint.materialClassSuggestedHint",
                                  )
                                }}
                              </p>
                              <MaterialsTagsField
                                v-if="field.kind === 'tags'"
                                :model-value="tagsValues[field.column]"
                                :options="structureFieldOptions(field)"
                                :placeholder="
                                  t('fomcharts.addPoint.tagsPlaceholder')
                                "
                                :option-hints="
                                  field.labelKey === 'materialClass'
                                    ? materialClassHints
                                    : undefined
                                "
                                @update:model-value="
                                  (v) => updateTagsValue(field, v)
                                "
                              />
                              <LayerStructureField
                                v-else-if="field.kind === 'layers'"
                                v-model="layersValues[field.column]"
                                :material-options="structureFieldOptions(field)"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </template>
                <p v-else class="text-xs text-muted-foreground">
                  {{ t("fomcharts.addPoint.noStructureFields") }}
                </p>
              </template>

              <!-- Step 4: Finaliser -- deliberately just Notes (every pick,
                 including Mode Description, already lives in Essentials), so
                 this step reads as room to write rather than more boxes to
                 fill in. -->
              <template v-else>
                <div class="flex min-h-0 flex-1 flex-col gap-1.5">
                  <Label class="text-[11px] text-muted-foreground">{{
                    t("fomcharts.addPoint.sections.notes")
                  }}</Label>
                  <span class="relative block min-h-0 flex-1">
                    <Textarea
                      v-model="notes"
                      :placeholder="t('fomcharts.addPoint.notesPlaceholder')"
                      :maxlength="NOTES_MAX_LENGTH"
                      class="h-full min-h-32 pr-7 text-sm"
                    />
                    <button
                      v-if="notes"
                      type="button"
                      class="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
                      :aria-label="t('fomcharts.addPoint.clearField')"
                      @click="notes = ''"
                    >
                      <X class="size-3.5" />
                    </button>
                  </span>
                  <span class="self-end text-[10px] text-muted-foreground"
                    >{{ notes.length }}/{{ NOTES_MAX_LENGTH }}</span
                  >
                </div>

                <Alert
                  v-if="mode === 'create'"
                  variant="info"
                  class="gap-1.5 py-1.5"
                >
                  <Info class="size-3.5" />
                  <AlertDescription class="text-[10.5px] text-ink/80">
                    {{ t("fomcharts.addPoint.provenanceHint") }}
                  </AlertDescription>
                </Alert>
                <Alert
                  v-else-if="wasPreviouslyEdited"
                  variant="info"
                  class="gap-1.5 py-1.5"
                >
                  <Info class="size-3.5" />
                  <AlertDescription class="text-[10.5px] text-ink/80">
                    {{ t("fomcharts.addPoint.alreadyEditedHint") }}
                  </AlertDescription>
                </Alert>
              </template>
            </div>

            <div
              class="flex items-center justify-between gap-2 border-t border-secondary/10 pt-3"
            >
              <div class="flex min-w-0 items-center gap-2">
                <Button
                  v-if="step > 1"
                  type="button"
                  variant="outline"
                  size="sm"
                  class="px-3.5 font-semibold"
                  @click="goBack"
                >
                  {{ t("fomcharts.addPoint.back") }}
                </Button>
                <!-- Discreet escape hatch for a researcher who really just
                   wants the point plotted -- not a prominent button, so it
                   doesn't suggest the rest of the form is administrative
                   filler. -->
                <button
                  v-else-if="mode === 'create'"
                  type="button"
                  class="text-[11px] font-medium text-muted-foreground transition-colors hover:text-primary hover:underline disabled:pointer-events-none disabled:opacity-40 disabled:hover:no-underline"
                  :disabled="!canSubmitFinal"
                  @click="handleSubmit"
                >
                  {{ t("fomcharts.addPoint.saveWithoutDetails") }}
                </button>
                <!-- A µm/pm value in a paper is converted here, by hand, into
                   whichever field needs it -- every measurement field itself
                   is always edited in its canonical unit now (see
                   AddPointField), so this replaces the old per-field unit
                   toggle rather than sitting alongside it. -->
                <UnitConverterPopover v-model:open="converterOpen" />
              </div>
              <Button
                v-if="step < 4"
                type="button"
                size="sm"
                :disabled="!canGoNext"
                class="bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
                @click="goNext"
              >
                {{ t("fomcharts.addPoint.next") }}
              </Button>
              <Button
                v-else
                type="submit"
                size="sm"
                :disabled="!canSubmitFinal"
                class="bg-primary px-4 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {{
                  mode === "edit"
                    ? t("fomcharts.addPoint.saveChanges")
                    : t("fomcharts.addPoint.save")
                }}
              </Button>
            </div>
          </form>
        </div>
      </TooltipProvider>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Info,
  X,
  Target,
  Layers as LayersIcon,
  LayoutGrid,
  Check,
  Lock,
  ChevronRight,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import AddPointField from "@/components/visualization/AddPointField.vue";
import MaterialsTagsField from "@/components/visualization/MaterialsTagsField.vue";
import LayerStructureField from "@/components/visualization/LayerStructureField.vue";
import PointShapeField from "@/components/visualization/PointShapeField.vue";
import UnitConverterPopover from "@/components/visualization/UnitConverterPopover.vue";
import {
  formatUnitSuperscripts,
  isEditedRow,
  tokenizeValue,
  findQFactorColumn,
  type DataRow,
  type ManualPointField,
  type PointShape,
} from "@/utils/columnTypes";
import { extractUnit } from "@/utils/stats";
import {
  formatLayerStructure,
  parseLayerStructure,
  type StructureLayer,
} from "@/utils/layerStructure";
import { useAddPointSuggestions } from "@/composables/useAddPointSuggestions";

const NOTES_MAX_LENGTH = 500;

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    fields: ManualPointField[];
    /** "edit" hydrates every field from initialRow/initialLabel/initialNotes/initialShape instead of starting blank. */
    mode?: "create" | "edit";
    initialRow?: DataRow | null;
    initialLabel?: string;
    initialNotes?: string;
    initialShape?: PointShape;
    /** Which Base Materials this dataset actually pairs with each Material Class (see columnTypes.ts's materialsByClass) -- narrows the Base Materials suggestions once a class is picked. */
    materialsByClass?: Record<string, string[]>;
  }>(),
  {
    mode: "create",
    initialRow: null,
    initialLabel: "",
    initialNotes: "",
    initialShape: "diamond",
    materialsByClass: () => ({}),
  },
);

const emit = defineEmits<{
  // values keyed by field.column, already the exact keys the chart expects
  // (see utils/columnTypes.ts's buildManualPointFields) -- the caller only
  // needs to coerce numeric-kind values and stamp the manual-row flag/id (or,
  // in edit mode, apply them as a patch -- see VisualizationView).
  submit: [
    values: Record<string, string>,
    label: string,
    notes: string,
    shape: PointShape,
  ];
}>();

const open = defineModel<boolean>("open", { default: false });

const step = ref(1);
// Icon per step names WHAT that step is about (bullseye/layers/grid/check),
// not its completion status -- matching the mockup, only the current step is
// singled out (filled, full opacity); every other step -- past or future --
// gets the same muted/outlined treatment rather than a distinct "done" state.
const steps = computed(() => [
  { key: 1, label: t("fomcharts.addPoint.steps.essentials"), icon: Target },
  { key: 2, label: t("fomcharts.addPoint.steps.metrics"), icon: LayersIcon },
  { key: 3, label: t("fomcharts.addPoint.steps.structure"), icon: LayoutGrid },
  { key: 4, label: t("fomcharts.addPoint.steps.finish"), icon: Check },
]);

const label = ref("");
const notes = ref("");
const shape = ref<PointShape>("diamond");
const converterOpen = ref(false);
// Mode ID + Mode Description live together in one optional, collapsed-by-
// default sub-section of Essentials -- always starts folded (see resetForm),
// an explicit unfold rather than something competing with the required axes
// for attention.
const modeSectionOpen = ref(false);
// "numeric" / "text" / "select" kinds live here as plain strings; "tags" and
// "layers" kinds get their own richer state below and are only flattened
// into this same string shape at submit time (see buildOutputValues) so the
// wire format out of this dialog never changes regardless of field kind.
const values = ref<Record<string, string>>({});
const tagsValues = ref<Record<string, string[]>>({});
const layersValues = ref<Record<string, StructureLayer[]>>({});

const requiredFields = computed(() => props.fields.filter((f) => f.required));
const metricFields = computed(() =>
  props.fields.filter(
    (f) => !f.required && f.kind === "numeric" && f.labelKey !== "modeId",
  ),
);
// Q-factor is part of metricFields but rendered as its own full-width row
// (see the template) rather than inside the plain 2-col grid -- this is the
// grid's complement, everything BUT Q-factor.
const plainMetricFields = computed(() =>
  metricFields.value.filter((f) => f.labelKey !== "qFactor"),
);
const structureFields = computed(() =>
  props.fields.filter((f) => f.kind === "tags" || f.kind === "layers"),
);
// Origin/Domain/Mode ID are all quick, closed-ended picks (a toggle, a
// select, a short number) -- grouped into Essentials alongside the axes so
// step 1 is "everything filled with one click or a short number." Mode
// Description is the opposite (open-ended text), so it stays with Notes in
// Finaliser instead -- that step is deliberately just the two free-text
// fields, room to write rather than more picks.
const originField = computed(
  () => props.fields.find((f) => f.labelKey === "origin") ?? null,
);
const domainField = computed(
  () => props.fields.find((f) => f.labelKey === "domain") ?? null,
);
const modeIdField = computed(
  () => props.fields.find((f) => f.labelKey === "modeId") ?? null,
);
const modeDescriptionField = computed(
  () => props.fields.find((f) => f.labelKey === "modeDescription") ?? null,
);

// Structure cascade (Base Materials -> Material Class -> Layer Structure):
// an accordion -- opening one node folds whichever else was open -- and a
// node is locked until the PRECEDING one in structureFields -- already in
// that exact order, see buildManualPointFields -- has at least one value.
// Unlocking never auto-opens/collapses a node on its own (it used to, on a
// debounce timer, but that fought a deliberate multi-select in progress) --
// the researcher always clicks the node they want next themselves.
const activeStructureNode = ref<string | null>(null);
const toggleStructureNode = (column: string) => {
  activeStructureNode.value =
    activeStructureNode.value === column ? null : column;
};
const isStructureNodeExpanded = (field: ManualPointField): boolean =>
  activeStructureNode.value === field.column;
const isStructureNodeLocked = (index: number): boolean => {
  if (index === 0) return false;
  return !fieldHasValue(structureFields.value[index - 1]);
};

// Folded-state summary chip -- "N selected" for a tags node, "N layers ·
// X.XX µm" for the layer stack, mirroring the mockup's badge count. Null
// (no chip) while the node is still empty.
const structureNodeSummary = (field: ManualPointField): string | null => {
  if (field.kind === "tags") {
    const n = (tagsValues.value[field.column] ?? []).length;
    return n > 0 ? t("fomcharts.addPoint.tagsSelectedCount", { n }) : null;
  }
  if (field.kind === "layers") {
    const layers = (layersValues.value[field.column] ?? []).filter(
      (l) => l.material.trim() !== "",
    );
    if (layers.length === 0) return null;
    // A row with a repeatCount (see LayerStructureField) stands in for that
    // many physical layers -- e.g. a 10-period Bragg mirror is 2 rows but 20
    // real layers -- so both the count and total thickness must scale by it,
    // not just count array entries, or a periodic stack's summary chip would
    // silently understate "N layers · X µm" by up to the repeat factor.
    const physicalLayerCount = layers.reduce(
      (sum, l) => sum + (l.repeatCount ?? 1),
      0,
    );
    const totalUm =
      layers.reduce(
        (sum, l) => sum + (l.thicknessNm ?? 0) * (l.repeatCount ?? 1),
        0,
      ) / 1000;
    return t("fomcharts.addPoint.layersSummary", {
      n: physicalLayerCount,
      thickness: totalUm.toFixed(2),
    });
  }
  return null;
};

// Q-factor auto-compute and Material Class <-> Base Materials suggestion --
// two independent engines pulled out to their own composable since neither
// touches step flow, both keyed off this same values/tagsValues state. See
// composables/useAddPointSuggestions.ts.
const {
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
} = useAddPointSuggestions({
  fields: computed(() => props.fields),
  materialsByClass: computed(() => props.materialsByClass),
  values,
  tagsValues,
});

// Layer Structure narrows to THIS point's own already-picked Base Materials
// (not the dataset-wide list) -- a layer can only be made of a material this
// point already declared as one of its base materials.
const structureFieldOptions = (field: ManualPointField): string[] => {
  if (field.labelKey === "layerStructure" && baseMaterialsField.value) {
    return [
      ...(tagsValues.value[baseMaterialsField.value.column] ?? []),
    ].sort();
  }
  return field.options ?? [];
};

const wasPreviouslyEdited = computed(() =>
  props.initialRow ? isEditedRow(props.initialRow) : false,
);

// Preferred default for a select field with no existing value -- Domain
// defaults to "Wavelength" (this tool's whole focus, see guessDefaultXAxis's
// own reasoning) and Origin to "SIM" (a manually entered point is far more
// often a simulated design than a physically measured one), falling back to
// this field's first option when the dataset doesn't have that value at all.
const preferredSelectDefault = (
  field: ManualPointField,
): string | undefined => {
  if (field.labelKey === "domain") return "Wavelength";
  if (field.labelKey === "origin") return "SIM";
  return undefined;
};

// Create mode starts every field blank (Select fields default to their
// preferred value or first option, since an empty string doesn't match any
// SelectItem); edit mode hydrates from initialRow instead, using each
// field's own real column value -- exactly the inverse of buildOutputValues
// below, so re-submitting unchanged fields round-trips to the same stored
// value. Re-runs whenever the dialog (re)opens or the field list itself
// changes (e.g. a different axis selected, or the row being edited changes).
const resetForm = () => {
  step.value = 1;
  modeSectionOpen.value = false;
  converterOpen.value = false;
  const row = props.mode === "edit" ? props.initialRow : null;
  label.value = row ? props.initialLabel : "";
  notes.value = row ? props.initialNotes : "";
  shape.value = row ? props.initialShape : "diamond";
  const nextValues: Record<string, string> = {};
  const nextTags: Record<string, string[]> = {};
  const nextLayers: Record<string, StructureLayer[]> = {};
  for (const field of props.fields) {
    const raw = row ? row[field.column] : undefined;
    if (field.kind === "tags") {
      nextTags[field.column] = row ? tokenizeValue(raw) : [];
    } else if (field.kind === "layers") {
      nextLayers[field.column] = row ? parseLayerStructure(raw) : [];
    } else if (raw !== undefined && raw !== null && raw !== "") {
      nextValues[field.column] = String(raw);
    } else if (field.kind === "select" && field.options?.length) {
      const preferred = preferredSelectDefault(field);
      nextValues[field.column] =
        preferred && field.options.includes(preferred)
          ? preferred
          : field.options[0];
    } else {
      nextValues[field.column] = "";
    }
  }
  // Q-factor always prefers the live computation (Q = λ / FWHM) the instant
  // both inputs are available, even in edit mode on a point that already
  // carries a stored value -- manual entry is an explicit opt-out ("Enter a
  // different value"), never something the researcher has to opt back INTO
  // just to see a number the form could already compute for them. Seeded
  // here rather than left to useAddPointSuggestions's own auto-sync
  // watcher, since that watcher only fires on a subsequent change and both
  // inputs can already be filled in on the very first render (edit mode).
  seedQFactor(nextValues);

  values.value = nextValues;
  tagsValues.value = nextTags;
  layersValues.value = nextLayers;
  // A Material Class value already present on the row being loaded (edit
  // mode) is authoritative and must not be silently replaced by a guess --
  // only a genuinely empty Material Class starts in auto-suggest mode.
  seedMaterialClassTouched(nextTags);
  // Structure cascade: node 1 always starts open -- it's the immediate next
  // thing to look at, whether or not it already has a value -- never hidden
  // behind a click.
  activeStructureNode.value = structureFields.value[0]?.column ?? null;
};
watch(open, (isOpen) => {
  if (isOpen) resetForm();
});
watch([() => props.fields, () => props.initialRow], () => {
  if (open.value) resetForm();
});

const fieldLabel = (field: ManualPointField): string => {
  const base = field.labelKey
    ? t(`fomcharts.addPoint.fields.${field.labelKey}`)
    : formatUnitSuperscripts(field.column);
  const unit = field.labelKey ? extractUnit(field.column) : null;
  return unit ? `${base} (${formatUnitSuperscripts(unit)})` : base;
};

// Whether a field carries a value, kind-aware -- "tags"/"layers" fields
// never populate `values`, so the required check (only ever the X/Y axis
// fields, but those can resolve to any kind, e.g. Layer Structure as the
// X-axis) has to look at the right piece of state for each kind.
const fieldHasValue = (field: ManualPointField): boolean => {
  if (field.kind === "tags")
    return (tagsValues.value[field.column] ?? []).length > 0;
  if (field.kind === "layers")
    return (layersValues.value[field.column] ?? []).some(
      (l) => l.material.trim() !== "",
    );
  return String(values.value[field.column] ?? "").trim() !== "";
};

// Only step 1 carries required fields (the axis values), so that's the only
// step "Suivant" needs to gate on -- steps 2/3/4 are all optional.
const canGoNext = computed(() => {
  if (step.value !== 1) return true;
  if (label.value.trim() === "") return false;
  return requiredFields.value.every(fieldHasValue);
});
const canSubmitFinal = computed(
  () => label.value.trim() !== "" && requiredFields.value.every(fieldHasValue),
);

const goNext = () => {
  if (canGoNext.value && step.value < 4) step.value += 1;
};
const goBack = () => {
  if (step.value > 1) step.value -= 1;
};

// Flattens every field kind back into the plain Record<string, string> the
// caller (VisualizationView) already knows how to turn into a row -- tags
// join with ";" (matching tokenizeValue's parsing of an imported composite
// cell) and layers serialize through the same "Material(nm) + Material(nm)"
// format parseLayerStructure expects, so a manually built stack round-trips
// through the read-only LayerStack preview identically to one from a paper.
const buildOutputValues = (): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const field of props.fields) {
    if (field.kind === "tags") {
      const joined = (tagsValues.value[field.column] ?? []).join(";");
      if (joined) out[field.column] = joined;
    } else if (field.kind === "layers") {
      const formatted = formatLayerStructure(
        layersValues.value[field.column] ?? [],
      );
      if (formatted) out[field.column] = formatted;
    } else {
      out[field.column] = values.value[field.column] ?? "";
    }
  }
  return out;
};

const handleSubmit = () => {
  if (!canSubmitFinal.value) return;
  emit(
    "submit",
    buildOutputValues(),
    label.value.trim(),
    notes.value.trim(),
    shape.value,
  );
  open.value = false;
};
</script>
