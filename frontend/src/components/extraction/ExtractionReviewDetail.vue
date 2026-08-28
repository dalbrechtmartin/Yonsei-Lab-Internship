<template>
  <div
    v-if="record"
    class="flex shrink-0 flex-col gap-3 rounded-[10px] border p-3.5"
    :class="
      record.reviewStatus === 'Edit'
        ? 'border-amber-500/25 bg-amber-500/8'
        : record.reviewStatus === 'Exclude'
          ? 'border-rose-500/25 bg-rose-500/6'
          : 'border-secondary/15 bg-secondary/5'
    "
  >
    <!-- Why this record needs attention, front and center -- never just on
         the "Corriger" panel a reviewer might not open. -->
    <div
      v-if="record.reviewStatus === 'Edit' || record.reviewStatus === 'Exclude'"
      class="flex items-start gap-2 rounded-lg border px-3 py-2"
      :class="
        record.reviewStatus === 'Edit'
          ? 'border-amber-500/30 bg-amber-500/12 text-amber-900'
          : 'border-rose-500/30 bg-rose-500/10 text-rose-900'
      "
    >
      <span class="mt-px shrink-0 text-sm leading-none" aria-hidden="true">
        {{ record.reviewStatus === "Edit" ? "⚠" : "✕" }}
      </span>
      <div class="flex min-w-0 flex-col gap-0.5">
        <p class="text-xs font-semibold">
          {{
            record.reviewStatus === "Edit"
              ? t("extraction.review.detail.status.editHeading")
              : t("extraction.review.detail.status.excludeHeading")
          }}
        </p>
        <p class="text-xs leading-relaxed">
          {{ record.notes || t("extraction.review.detail.status.noReason") }}
        </p>
      </div>
    </div>

    <!-- Always-visible source strip -- a reviewer can jump to any citation
         without ever opening Provenance. One click = jump straight to that
         quote in the PDF viewer (hover shows the quote itself as a native
         tooltip); the full per-source detail (quote + clickable location)
         still lives in Provenance below for a permanent, non-hover view. -->
    <div v-if="sources.length" class="flex flex-wrap items-center gap-1.5">
      <span class="text-[10px] font-semibold tracking-wide text-secondary uppercase">
        {{ t("extraction.review.detail.sources.label") }}
      </span>
      <button
        v-for="(source, i) in sources"
        :key="i"
        type="button"
        :title="source.quote"
        class="flex items-center gap-1 rounded-full border border-secondary/20 bg-secondary/6 px-2 py-0.5 text-[11px] font-medium text-ink transition-colors hover:border-primary/30 hover:bg-primary/8"
        @click="emit('select-source', source)"
      >
        <Quote class="size-3 shrink-0 text-secondary" />
        {{
          sources.length > 1
            ? t("extraction.review.detail.sources.item", { n: i + 1 })
            : t("extraction.review.detail.sources.single")
        }}
      </button>
      <span class="text-[10.5px] text-secondary/70">
        {{ t("extraction.review.detail.sources.hint") }}
      </span>
    </div>

    <CollapsibleSection
      v-model:open="identificationOpen"
      :title="t('extraction.review.detail.sections.identification')"
    >
      <template v-if="sectionHasWarning(IDENTIFICATION_KEYS)" #header-suffix>
        <span
          class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
        >
          <AlertTriangle class="size-3" />
          {{ t("extraction.review.detail.status.editHeading") }}
        </span>
      </template>
      <dl class="grid grid-cols-2 gap-2 pt-2">
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.ref')"
          :value="record.ref"
          editable
          :note="fieldNote('ref')"
          :reset-token="resetToken"
          @save="(v) => saveField('ref', v)"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.origin')"
          :value="record.origin"
          editable
          :note="fieldNote('origin')"
          :reset-token="resetToken"
          @save="(v) => saveField('origin', v)"
        />
        <ExtractionDetailField
          wide
          :label="t('extraction.review.edit.fields.title')"
          :value="record.title"
          editable
          :note="fieldNote('title')"
          :reset-token="resetToken"
          @save="(v) => saveField('title', v)"
        />
        <ExtractionDetailField
          wide
          :label="t('extraction.review.edit.fields.shortTitle')"
          :value="record.shortTitle"
          editable
          :note="fieldNote('shortTitle')"
          :reset-token="resetToken"
          @save="(v) => saveField('shortTitle', v)"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.modeId')"
          :value="record.modeId"
          editable
          :note="fieldNote('modeId')"
          :reset-token="resetToken"
          @save="(v) => saveField('modeId', v)"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.domain')"
          :value="record.domain"
          editable
          :note="fieldNote('domain')"
          :reset-token="resetToken"
          @save="(v) => saveField('domain', v)"
        />
        <ExtractionDetailField
          wide
          :label="t('extraction.review.edit.fields.modeDescription')"
          :value="record.modeDescription"
          editable
          :reset-token="resetToken"
          @save="(v) => saveField('modeDescription', v)"
        />
      </dl>
    </CollapsibleSection>

    <CollapsibleSection
      v-model:open="measurementsOpen"
      :title="t('extraction.review.detail.sections.measurements')"
    >
      <template v-if="sectionHasWarning(MEASUREMENT_KEYS)" #header-suffix>
        <span
          class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
        >
          <AlertTriangle class="size-3" />
          {{ t("extraction.review.detail.status.editHeading") }}
        </span>
      </template>
      <dl class="grid grid-cols-2 gap-2 pt-2">
        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.resonanceWavelengthNm')"
          :value="record.resonanceWavelengthNm"
          editable
          :note="fieldNote('resonanceWavelengthNm')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('resonanceWavelengthNm')"
          @save="(v) => saveField('resonanceWavelengthNm', v)"
          @select-source="emitSelectSourceForField('resonanceWavelengthNm')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.spectralRange')"
          :value="record.spectralRange"
          editable
          :note="fieldNote('spectralRange')"
          :reset-token="resetToken"
          @save="(v) => saveField('spectralRange', v)"
        />
        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.fomRiuInv')"
          :value="record.fomRiuInv"
          editable
          :note="fieldNote('fomRiuInv')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('fomRiuInv')"
          @save="(v) => saveField('fomRiuInv', v)"
          @select-source="emitSelectSourceForField('fomRiuInv')"
        />

        <div
          v-if="jobId && fomDefinitionRecognized"
          class="col-span-2 flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <Label class="text-[10px] font-medium tracking-wide text-secondary uppercase">
              {{ t("extraction.review.detail.recompute.fomLabel") }}
            </Label>
            <Button type="button" variant="ghost" size="sm" @click="fomPanelOpen = !fomPanelOpen">
              {{ t("extraction.review.detail.recompute.toggle") }}
            </Button>
          </div>
          <Button
            v-if="autoFillTarget === 'fomRiuInv' && !fomPanelOpen"
            type="button"
            variant="outline"
            size="sm"
            :disabled="autoFillSubmitting"
            @click="applyAutoFill"
          >
            {{
              t("extraction.review.detail.recompute.autoFill", {
                field: t("extraction.review.edit.fields.fomRiuInv"),
              })
            }}
          </Button>
          <p v-if="autoFillError && autoFillTarget === 'fomRiuInv'" class="text-xs text-rose-700">
            {{ autoFillError }}
          </p>
          <div v-if="fomPanelOpen" class="flex flex-col gap-2 pt-1">
            <div class="grid grid-cols-2 gap-2">
              <Input
                v-model.number="fomInputSensitivity"
                type="number"
                :placeholder="t('extraction.review.edit.fields.sensitivityNmPerRiu')"
              />
              <Input
                v-model.number="fomInputFwhm"
                type="number"
                :placeholder="t('extraction.review.edit.fields.fwhmNm')"
              />
            </div>
            <p v-if="fomError" class="text-xs text-rose-700">{{ fomError }}</p>
            <div class="flex justify-end">
              <Button type="button" size="sm" :disabled="fomSubmitting" @click="applyFomRecompute">
                {{ t("extraction.review.detail.recompute.calculate") }}
              </Button>
            </div>
          </div>
        </div>

        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.definition')"
          :value="record.definition"
          editable
          :reset-token="resetToken"
          @save="(v) => saveField('definition', v)"
        />
        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.sensitivityNmPerRiu')"
          :value="record.sensitivityNmPerRiu"
          editable
          :note="fieldNote('sensitivityNmPerRiu')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('sensitivityNmPerRiu')"
          @save="(v) => saveField('sensitivityNmPerRiu', v)"
          @select-source="emitSelectSourceForField('sensitivityNmPerRiu')"
        />
        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.fwhmNm')"
          :value="record.fwhmNm"
          editable
          :note="fieldNote('fwhmNm')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('fwhmNm')"
          @save="(v) => saveField('fwhmNm', v)"
          @select-source="emitSelectSourceForField('fwhmNm')"
        />

        <div
          v-if="jobId && fomDefinitionRecognized"
          class="col-span-2 flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5"
        >
          <div class="flex items-center justify-between gap-2">
            <Label class="text-[10px] font-medium tracking-wide text-secondary uppercase">
              {{ t("extraction.review.detail.recompute.fwhmLabel") }}
            </Label>
            <Button type="button" variant="ghost" size="sm" @click="fwhmPanelOpen = !fwhmPanelOpen">
              {{ t("extraction.review.detail.recompute.toggle") }}
            </Button>
          </div>
          <Button
            v-if="autoFillTarget === 'fwhmNm' && !fwhmPanelOpen"
            type="button"
            variant="outline"
            size="sm"
            :disabled="autoFillSubmitting"
            @click="applyAutoFill"
          >
            {{
              t("extraction.review.detail.recompute.autoFill", {
                field: t("extraction.review.edit.fields.fwhmNm"),
              })
            }}
          </Button>
          <p v-if="autoFillError && autoFillTarget === 'fwhmNm'" class="text-xs text-rose-700">
            {{ autoFillError }}
          </p>
          <div v-if="fwhmPanelOpen" class="flex flex-col gap-2 pt-1">
            <div class="grid grid-cols-2 gap-2">
              <Input
                v-model.number="fwhmInputFom"
                type="number"
                :placeholder="t('extraction.review.edit.fields.fomRiuInv')"
              />
              <Input
                v-model.number="fwhmInputSensitivity"
                type="number"
                :placeholder="t('extraction.review.edit.fields.sensitivityNmPerRiu')"
              />
            </div>
            <p v-if="fwhmError" class="text-xs text-rose-700">{{ fwhmError }}</p>
            <div class="flex justify-end">
              <Button type="button" size="sm" :disabled="fwhmSubmitting" @click="applyFwhmRecompute">
                {{ t("extraction.review.detail.recompute.calculate") }}
              </Button>
            </div>
          </div>
        </div>

        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.qFactor')"
          :value="record.qFactor"
          editable
          :note="fieldNote('qFactor')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('qFactor')"
          @save="(v) => saveField('qFactor', v)"
          @select-source="emitSelectSourceForField('qFactor')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.sensingMedium')"
          :value="record.sensingMedium"
          editable
          :note="fieldNote('sensingMedium')"
          :reset-token="resetToken"
          @save="(v) => saveField('sensingMedium', v)"
        />
      </dl>

      <div
        v-if="jobId"
        class="mt-2 flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5"
      >
        <div class="flex items-center justify-between gap-2">
          <Label class="text-[10px] font-medium tracking-wide text-secondary uppercase">
            {{ t("extraction.review.detail.recompute.label") }}
          </Label>
          <Button type="button" variant="ghost" size="sm" @click="recomputeOpen = !recomputeOpen">
            {{ t("extraction.review.detail.recompute.toggle") }}
          </Button>
        </div>
        <Button
          v-if="autoFillTarget === 'sensitivityNmPerRiu' && !recomputeOpen"
          type="button"
          variant="outline"
          size="sm"
          :disabled="autoFillSubmitting"
          @click="applyAutoFill"
        >
          {{
            t("extraction.review.detail.recompute.autoFill", {
              field: t("extraction.review.edit.fields.sensitivityNmPerRiu"),
            })
          }}
        </Button>
        <p
          v-if="autoFillError && autoFillTarget === 'sensitivityNmPerRiu'"
          class="text-xs text-rose-700"
        >
          {{ autoFillError }}
        </p>
        <div v-if="recomputeOpen" class="flex flex-col gap-2 pt-1">
          <div class="grid grid-cols-2 gap-2">
            <Select v-model="recomputeFormula">
              <SelectTrigger class="col-span-2 bg-card/80">
                <SelectValue :placeholder="t('extraction.review.detail.recompute.formulaPlaceholder')" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup v-if="gasFormulas.length">
                  <SelectLabel>{{ t("extraction.review.detail.recompute.gasGroup") }}</SelectLabel>
                  <SelectItem v-for="f in gasFormulas" :key="f.key" :value="f.key">
                    {{ f.label }}
                  </SelectItem>
                </SelectGroup>
                <SelectGroup v-if="liquidFormulas.length">
                  <SelectLabel>{{ t("extraction.review.detail.recompute.liquidGroup") }}</SelectLabel>
                  <SelectItem v-for="f in liquidFormulas" :key="f.key" :value="f.key">
                    {{ f.label }}
                  </SelectItem>
                </SelectGroup>
                <SelectGroup v-if="fomDefinitionRecognized">
                  <SelectLabel>{{ t("extraction.review.detail.recompute.relationGroup") }}</SelectLabel>
                  <SelectItem value="fom_relation">
                    {{ t("extraction.review.detail.recompute.relationOption") }}
                  </SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <template v-if="isFomRelationFormula">
              <Input
                v-model.number="recomputeRelationFom"
                type="number"
                :placeholder="t('extraction.review.edit.fields.fomRiuInv')"
              />
              <Input
                v-model.number="recomputeRelationFwhm"
                type="number"
                :placeholder="t('extraction.review.edit.fields.fwhmNm')"
              />
            </template>
            <template v-else>
              <Input
                v-model.number="recomputeMagnitude"
                type="number"
                :placeholder="t('extraction.review.detail.recompute.rawMagnitude')"
              />
              <Input
                v-model="recomputeUnit"
                type="text"
                :placeholder="t('extraction.review.detail.recompute.unitPlaceholder')"
              />
              <Input
                v-if="isCustomFormula"
                v-model.number="recomputeConstant"
                type="number"
                class="col-span-2"
                :placeholder="t('extraction.review.detail.recompute.customConstant')"
              />
            </template>
          </div>
          <p v-if="recomputeError" class="text-xs text-rose-700">{{ recomputeError }}</p>
          <div class="flex items-center justify-end gap-2">
            <Button
              v-if="!isFomRelationFormula"
              type="button"
              variant="ghost"
              size="sm"
              class="mr-auto"
              @click="applyNoConversion"
            >
              {{ t("extraction.review.detail.recompute.noConversion") }}
            </Button>
            <Button
              type="button"
              size="sm"
              :disabled="!canApplyRecompute || recomputeSubmitting"
              @click="applyRecompute"
            >
              {{ t("extraction.review.detail.recompute.apply") }}
            </Button>
          </div>
        </div>
      </div>
    </CollapsibleSection>

    <CollapsibleSection
      v-model:open="materialsOpen"
      :title="t('extraction.review.detail.sections.materials')"
    >
      <template v-if="sectionHasWarning(MATERIALS_KEYS)" #header-suffix>
        <span
          class="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
        >
          <AlertTriangle class="size-3" />
          {{ t("extraction.review.detail.status.editHeading") }}
        </span>
      </template>
      <div class="flex flex-col gap-2 pt-2">
        <dl class="grid grid-cols-2 gap-2">
          <ExtractionDetailField
            :label="t('extraction.review.edit.fields.materialClass')"
            :value="record.materialClass"
            editable
            :note="fieldNote('materialClass')"
            :reset-token="resetToken"
            @save="(v) => saveField('materialClass', v)"
          />
          <ExtractionDetailField
            :label="t('extraction.review.edit.fields.baseMaterials')"
            :value="record.baseMaterials"
            editable
            :note="fieldNote('baseMaterials')"
            :reset-token="resetToken"
            @save="(v) => saveField('baseMaterials', v)"
          />
        </dl>
        <div class="flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5">
          <Label class="text-[10px] font-medium tracking-wide text-secondary uppercase">
            {{ t("extraction.review.edit.fields.layerStructure") }}
          </Label>
          <LayerStructureField v-model="layers" :material-options="baseMaterialOptions" />
          <div v-if="layersDirty" class="flex justify-end">
            <Button type="button" variant="outline" size="sm" @click="saveLayerStructure">
              {{ t("extraction.review.detail.saveLayers") }}
            </Button>
          </div>
        </div>
      </div>
    </CollapsibleSection>

    <CollapsibleSection
      v-model:open="provenanceOpen"
      :title="t('extraction.review.detail.sections.provenance')"
    >
      <div class="flex flex-col gap-2.5 pt-2">
        <dl class="grid grid-cols-2 gap-2">
          <ExtractionDetailField :label="t('extraction.review.detail.fields.modelUsed')" :value="record.modelUsed" />
          <ExtractionDetailField
            wide
            emphasize
            :label="t('extraction.review.edit.fields.notes')"
            :value="record.notes"
            editable
            :reset-token="resetToken"
            @save="(v) => saveField('notes', v)"
          />
        </dl>

        <div v-if="record.rawValue" class="rounded-md bg-secondary/8 px-2.5 py-2 text-xs">
          <p class="text-secondary">
            {{ t("extraction.review.detail.rawValue") }}:
            <span class="text-ink">{{ record.rawValue }}</span>
          </p>
          <p v-if="record.conversionMethod" class="text-secondary">
            {{ t("extraction.review.detail.conversionMethod") }}:
            <span class="text-ink">{{ record.conversionMethod }}</span>
          </p>
        </div>

        <!-- A value the model computed rather than read from the paper --
             flagged on its own field too (see fieldNote/CALCULATED_KEYS
             above), repeated here so it's never missed even if that
             section is collapsed. -->
        <div
          v-if="record.calculatedFields"
          class="flex items-start gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/8 px-2.5 py-2 text-xs text-amber-900"
        >
          <AlertTriangle class="mt-0.5 size-3 shrink-0" />
          <p class="leading-relaxed">
            <span class="font-medium">{{ t("extraction.review.detail.calculatedFields") }}:</span>
            {{ record.calculatedFields }}
          </p>
        </div>

        <!-- Only reconciliation notes that couldn't be pinned to one specific
             field (row-count/extra-row bookkeeping, or a future annotation
             shape this parser doesn't recognize yet) land here -- every note
             that IS about one field is shown right on that field instead
             (see fieldNote below), so nothing gets a duplicate. -->
        <ul v-if="generalNotes.length" class="flex flex-col gap-1.5">
          <li
            v-for="(note, i) in generalNotes"
            :key="i"
            class="flex items-start gap-1.5 rounded-md px-2.5 py-1.5 text-xs leading-relaxed"
            :class="note.severity === 'warning' ? 'bg-amber-500/8 text-amber-900' : 'bg-secondary/6 text-secondary'"
          >
            <AlertTriangle v-if="note.severity === 'warning'" class="mt-0.5 size-3 shrink-0" />
            <Info v-else class="mt-0.5 size-3 shrink-0" />
            <span>{{ noteText(note) }}</span>
          </li>
        </ul>

        <div
          v-for="(source, i) in sources"
          :key="i"
          class="border-t border-secondary/10 pt-2 first:border-t-0 first:pt-0"
        >
          <p
            v-if="sources.length > 1"
            class="text-[11px] font-medium tracking-wide text-secondary uppercase"
          >
            {{
              t("extraction.review.callout.sourceOf", {
                current: i + 1,
                total: sources.length,
              })
            }}
          </p>
          <p class="text-xs leading-relaxed text-ink">
            {{ t("extraction.review.callout.evidenceLabel") }}
            <span
              class="italic transition-colors"
              :class="hoveredIndex === i ? 'rounded-sm bg-primary/15' : ''"
            >
              « {{ source.quote }} »
            </span>
          </p>
          <p v-if="source.location" class="mt-1 text-xs text-secondary">
            {{ t("extraction.review.callout.locationLabel") }}
            <button
              type="button"
              class="cursor-pointer bg-transparent p-0 text-left underline decoration-dotted underline-offset-2 hover:text-ink"
              @mouseenter="hoveredIndex = i"
              @mouseleave="hoveredIndex = null"
              @click="emit('select-source', source)"
            >
              {{ applyPageLabels(source.location, pageLabels) }}
            </button>
          </p>
        </div>
      </div>
    </CollapsibleSection>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { AlertTriangle, Info, Quote } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import LayerStructureField from "@/components/visualization/LayerStructureField.vue";
import ExtractionDetailField from "@/components/extraction/ExtractionDetailField.vue";
import {
  apiService,
  type EditableRecordFields,
  type ExtractionRecord,
  type SensingMediumFormula,
} from "@/services/api";
import {
  applyPageLabels,
  parseEvidenceSources,
  type EvidenceSource,
} from "@/utils/parseLocation";
import { isRecognizedFomDefinition } from "@/utils/fomRelations";
import {
  formatLayerStructure,
  parseLayerStructure,
  type StructureLayer,
} from "@/utils/layerStructure";
import {
  parseReconciliationLog,
  groupReconciliationNotes,
  type ReconciliationNote,
} from "@/utils/parseReconciliationLog";
import { recordKey } from "@/composables/useExtractionRecords";
import { useAccordionPanel } from "@/composables/useAccordionPanel";

const props = defineProps<{
  record: ExtractionRecord | null;
  /** Used by the guide's static worked example: opens only the Provenance
   * section by default (identification/measurements/materials collapsed)
   * so the printed page shows the interesting "why is this flagged" part
   * without needing the full card's height. The live review screen never
   * sets this -- a real reviewer gets Measurements open by default. */
  compact?: boolean;
  /** One entry per physical page of the record's own file (see
   * useExtractionRecords.getPageLabels) -- annotates the displayed Location
   * text with the PDF's own printed page number where it differs from the
   * physical index. Null/omitted (e.g. the guide's static example, still
   * loading) just leaves "Page N" as-is. */
  pageLabels?: (string | null)[] | null;
  /** Needed to call the recompute-field endpoint (see recomputeOpen below)
   * -- null/omitted (the guide's static example) just hides every recompute
   * panel/button, since there's no real job behind a worked example. */
  jobId?: string | null;
}>();
const emit = defineEmits<{
  "select-source": [source: EvidenceSource];
  save: [fields: Partial<EditableRecordFields>];
  /** A full record replacement from a recompute-field/recompute-sensing-
   * medium call -- it writes "Conversion Method"/"Raw Value"/etc, which are
   * machine-only fields the plain `save` event's EDITABLE_RECORD_FIELDS
   * allowlist can't touch, so it goes through its own endpoint/event
   * instead. */
  "record-updated": [record: ExtractionRecord];
  /** Emitted alongside `record-updated` every time ANY recompute call
   * succeeds -- `before` is the full record as it was immediately before
   * the call, `after` is what the API returned. This component does its own
   * API calls but owns no undo/redo state itself; the parent (ultimately
   * ExtractionView, via useExtractionRecords' commitRecompute) is what
   * turns this into the single shared undo/redo slot for the whole review
   * screen. */
  "recompute-applied": [before: ExtractionRecord, after: ExtractionRecord];
}>();
const { t } = useI18n();

// Every field's own pencil commits straight through this record's `save`
// event -- there is no separate "Corriger" form to route through; a click
// on a field's pencil, an Enter/checkmark in its own inline input, and this
// record being PATCHed are the same single step.
function saveField(key: keyof EditableRecordFields, value: string | number | null) {
  emit("save", { [key]: value } as Partial<EditableRecordFields>);
}

// Forces every field's inline editor closed the moment the active record
// changes underneath it -- ExtractionDetailField instances are NOT inside a
// v-for (each is a named, fixed template slot), so Vue reuses the same
// component instance across records instead of remounting it; without this
// an uncommitted draft in field A could still be "open" after navigating to
// a different record entirely.
const resetToken = computed(() => (props.record ? recordKey(props.record) : null));

// Only one of Identification/Measurements/Materials/Provenance stays open
// at a time -- same accordion pattern as VisualizationView's right-side
// panels (see composables/useAccordionPanel.ts), so this card never grows
// tall enough to force a long scroll.
const { panel } = useAccordionPanel<
  "identification" | "measurements" | "materials" | "provenance"
>(props.compact ? "provenance" : "measurements");
const identificationOpen = panel("identification");
const measurementsOpen = panel("measurements");
const materialsOpen = panel("materials");
const provenanceOpen = panel("provenance");

const sources = computed(() =>
  parseEvidenceSources(
    props.record?.evidence ?? null,
    props.record?.location ?? null,
    props.record?.evidenceFieldMap ?? null,
  ),
);

// Which numeric measurement fields' COLUMN_ORDER labels (see
// api.ts's RECORD_FIELD_KEYS) a source fragment's own "Evidence Field Map"
// entry can name -- used to show a per-field "jump to source" icon (see
// ExtractionDetailField's hasSource prop) only for a field a fragment
// actually claims to support.
const SOURCE_FIELD_LABELS = {
  resonanceWavelengthNm: "Resonance Wavelength (nm)",
  fomRiuInv: "FOM (RIU^-1)",
  sensitivityNmPerRiu: "Sensitivity (nm/RIU)",
  fwhmNm: "FWHM (nm)",
  qFactor: "Q-factor",
} as const;

function sourceForField(key: keyof typeof SOURCE_FIELD_LABELS): EvidenceSource | null {
  const label = SOURCE_FIELD_LABELS[key];
  return sources.value.find((s) => s.fields.includes(label)) ?? null;
}

function emitSelectSourceForField(key: keyof typeof SOURCE_FIELD_LABELS) {
  const source = sourceForField(key);
  if (source) emit("select-source", source);
}

// A stale hover highlight must never bleed into a newly-selected record --
// keyed off the record's stable identity, not object identity (cursor gets
// a new object reference on every Valider/Corriger/Exclure PATCH even while
// staying on the same logical record).
const hoveredIndex = ref<number | null>(null);
watch(
  () => (props.record ? recordKey(props.record) : null),
  () => {
    hoveredIndex.value = null;
  },
);

// This point's own already-picked Base Materials -- a layer can't be made
// of a material this record didn't already declare as one of its Base
// Materials (same constraint LayerStructureField already enforces in the
// Visualization Add Point dialog).
const baseMaterialOptions = computed(() =>
  (props.record?.baseMaterials ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean),
);

const layers = ref<StructureLayer[]>([]);
watch(
  () => (props.record ? recordKey(props.record) : null),
  () => {
    layers.value = parseLayerStructure(props.record?.layerStructure ?? null);
  },
  { immediate: true },
);

// Fetched once (the formula registry never changes at runtime) rather than
// per-record -- see apiService.getSensingMediumFormulas.
const sensingMediumFormulas = ref<SensingMediumFormula[]>([]);
onMounted(async () => {
  sensingMediumFormulas.value = await apiService.getSensingMediumFormulas();
});
const gasFormulas = computed(() => sensingMediumFormulas.value.filter((f) => f.medium === "gas"));
const liquidFormulas = computed(() =>
  sensingMediumFormulas.value.filter((f) => f.medium === "liquid"),
);

// --- Sensitivity recompute panel (gas/liquid sensing-medium conversion, OR
// the algebraic "fom_relation" method when the record's Definition is
// recognized -- see isRecognizedFomDefinition) --------------------------
const recomputeOpen = ref(false);
const recomputeFormula = ref<string | undefined>(undefined);
const recomputeMagnitude = ref<number | undefined>(undefined);
const recomputeUnit = ref("");
const recomputeConstant = ref<number | undefined>(undefined);
// Only meaningful when recomputeFormula is the synthetic "fom_relation"
// entry -- pre-filled from the record's own current values (see the watch
// below), still editable before applying.
const recomputeRelationFom = ref<number | undefined>(undefined);
const recomputeRelationFwhm = ref<number | undefined>(undefined);
const recomputeError = ref<string | null>(null);
const recomputeSubmitting = ref(false);

const fomDefinitionRecognized = computed(() =>
  isRecognizedFomDefinition(props.record?.definition ?? null),
);
const isFomRelationFormula = computed(() => recomputeFormula.value === "fom_relation");
const isCustomFormula = computed(
  () => !isFomRelationFormula.value && (recomputeFormula.value?.endsWith(":custom") ?? false),
);
const canApplyRecompute = computed(() => {
  if (isFomRelationFormula.value) {
    return (
      typeof recomputeRelationFom.value === "number" &&
      !Number.isNaN(recomputeRelationFom.value) &&
      typeof recomputeRelationFwhm.value === "number" &&
      !Number.isNaN(recomputeRelationFwhm.value)
    );
  }
  return (
    !!recomputeFormula.value &&
    typeof recomputeMagnitude.value === "number" &&
    !Number.isNaN(recomputeMagnitude.value) &&
    !!recomputeUnit.value.trim() &&
    (!isCustomFormula.value || !!recomputeConstant.value)
  );
});

// `record.rawValue` is free text like "12 nm/%RH" or "0.288 um/RIU" -- a
// leading number then a unit. Returns null when it doesn't match that shape
// (or the number isn't finite), so pre-fill just leaves the inputs blank
// rather than guessing.
// The backend writes Raw Value as `f"{magnitude} {unit}"` (see main.py's
// recompute_field), and Python's float formatting switches to scientific
// notation below 1e-4 (e.g. 0.00001 -> "1e-05") -- a plain [\d.]+ character
// class would cut that off at the "1" and misread "e-05 RIU" as the unit, a
// 100,000x magnitude error silently pre-filled as if it were a real parse.
// This pattern captures the full numeric literal, sign and exponent
// included, before the unit starts.
const RAW_VALUE_RE = /^\s*([+-]?\d*\.?\d+(?:[eE][+-]?\d+)?)\s*(.+)$/;
function parseRawValue(raw: string | null): { magnitude: number; unit: string } | null {
  if (!raw) return null;
  const match = raw.match(RAW_VALUE_RE);
  if (!match) return null;
  const magnitude = Number(match[1]);
  const unit = match[2].trim();
  if (!Number.isFinite(magnitude) || !unit) return null;
  return { magnitude, unit };
}

function resetSensitivityPanel() {
  recomputeFormula.value = undefined;
  recomputeMagnitude.value = undefined;
  recomputeUnit.value = "";
  recomputeConstant.value = undefined;
  recomputeRelationFom.value = undefined;
  recomputeRelationFwhm.value = undefined;
  recomputeError.value = null;
}

// Pre-fills magnitude/unit from the record's own Raw Value, and pre-selects
// whichever gas/liquid formula's label case-insensitively exactly matches
// the record's Sensing Medium -- never guesses when there's no clean match,
// just leaves the formula unselected. Only ever called right after
// resetSensitivityPanel (record change), never on a later panel toggle, so
// an in-progress edit is never clobbered.
function prefillSensitivityPanel() {
  const record = props.record;
  if (!record) return;
  const parsed = parseRawValue(record.rawValue);
  if (parsed) {
    recomputeMagnitude.value = parsed.magnitude;
    recomputeUnit.value = parsed.unit;
  }
  if (record.sensingMedium) {
    const match = sensingMediumFormulas.value.find(
      (f) => f.label.toLowerCase() === record.sensingMedium!.toLowerCase(),
    );
    if (match) recomputeFormula.value = match.key;
  }
}

// The formula list loads asynchronously (see onMounted below) and may still
// be empty the first time prefillSensitivityPanel runs -- retry just the
// formula-match once it arrives. Guarded on "not already chosen" so this
// never overwrites a formula the reviewer (or an earlier, successful match)
// already picked.
watch(sensingMediumFormulas, () => {
  if (recomputeFormula.value) return;
  const record = props.record;
  if (!record?.sensingMedium) return;
  const match = sensingMediumFormulas.value.find(
    (f) => f.label.toLowerCase() === record.sensingMedium!.toLowerCase(),
  );
  if (match) recomputeFormula.value = match.key;
});

// Switching TO the algebraic option pre-fills its two inputs from the
// record's own current fomRiuInv/fwhmNm -- NOT blank -- still editable
// before applying.
watch(recomputeFormula, (formula) => {
  if (formula === "fom_relation") {
    recomputeRelationFom.value = props.record?.fomRiuInv ?? undefined;
    recomputeRelationFwhm.value = props.record?.fwhmNm ?? undefined;
  }
});

// --- FOM / FWHM recompute panels (algebraic only -- shown only when the
// record's Definition is recognized) -------------------------------------
const fomPanelOpen = ref(false);
const fomInputSensitivity = ref<number | undefined>(undefined);
const fomInputFwhm = ref<number | undefined>(undefined);
const fomError = ref<string | null>(null);
const fomSubmitting = ref(false);

const fwhmPanelOpen = ref(false);
const fwhmInputFom = ref<number | undefined>(undefined);
const fwhmInputSensitivity = ref<number | undefined>(undefined);
const fwhmError = ref<string | null>(null);
const fwhmSubmitting = ref(false);

function resetFomPanel() {
  fomInputSensitivity.value = props.record?.sensitivityNmPerRiu ?? undefined;
  fomInputFwhm.value = props.record?.fwhmNm ?? undefined;
  fomError.value = null;
}
function resetFwhmPanel() {
  fwhmInputFom.value = props.record?.fomRiuInv ?? undefined;
  fwhmInputSensitivity.value = props.record?.sensitivityNmPerRiu ?? undefined;
  fwhmError.value = null;
}

// One-click auto-fill: whichever ONE of {fomRiuInv, sensitivityNmPerRiu,
// fwhmNm} is null while the other two both already have a value, when the
// Definition is recognized -- lets the reviewer fill it in with a single
// click, no form to open. Declared BEFORE the record-change watch below --
// that watch runs `immediate: true` (fires synchronously during setup, for
// the very first record shown) and reads autoFillError.value, which would
// otherwise still be in its temporal-dead-zone (a `const` not yet reached)
// and throw "Cannot access 'autoFillError' before initialization".
type FomFieldKey = "fomRiuInv" | "sensitivityNmPerRiu" | "fwhmNm";
const autoFillTarget = computed<FomFieldKey | null>(() => {
  const record = props.record;
  if (!record || !fomDefinitionRecognized.value) return null;
  const values: Record<FomFieldKey, number | null> = {
    fomRiuInv: record.fomRiuInv,
    sensitivityNmPerRiu: record.sensitivityNmPerRiu,
    fwhmNm: record.fwhmNm,
  };
  const nullKeys = (Object.keys(values) as FomFieldKey[]).filter((k) => values[k] === null);
  return nullKeys.length === 1 ? nullKeys[0] : null;
});
const autoFillSubmitting = ref(false);
const autoFillError = ref<string | null>(null);

// Closing/resetting every recompute panel on record change, same reasoning
// as the pencil-editor resetToken above -- an in-progress recompute draft
// must never bleed into a newly-selected record. Runs `immediate` so the
// very first record shown also starts pre-filled, not blank.
watch(
  () => (props.record ? recordKey(props.record) : null),
  () => {
    recomputeOpen.value = false;
    resetSensitivityPanel();
    prefillSensitivityPanel();
    fomPanelOpen.value = false;
    resetFomPanel();
    fwhmPanelOpen.value = false;
    resetFwhmPanel();
    autoFillError.value = null;
  },
  { immediate: true },
);

async function applyAutoFill() {
  const target = autoFillTarget.value;
  const record = props.record;
  const jobId = props.jobId;
  if (!target || !record || !jobId) return;
  autoFillSubmitting.value = true;
  autoFillError.value = null;
  try {
    const updated = await apiService.recomputeField(
      jobId,
      record.fileId,
      record.filename,
      record.index,
      target,
      {
        method: "fom_relation",
        fom: record.fomRiuInv,
        sensitivity: record.sensitivityNmPerRiu,
        fwhm: record.fwhmNm,
      },
    );
    emit("record-updated", updated);
    emit("recompute-applied", record, updated);
  } catch (error) {
    autoFillError.value =
      error instanceof Error ? error.message : t("extraction.review.detail.recompute.error");
  } finally {
    autoFillSubmitting.value = false;
  }
}

async function runRecomputeSensitivity(formulaKey: string | null) {
  const record = props.record;
  const jobId = props.jobId;
  if (!record || !jobId) return;
  recomputeSubmitting.value = true;
  recomputeError.value = null;
  try {
    const updated =
      formulaKey === "fom_relation"
        ? await apiService.recomputeField(
            jobId,
            record.fileId,
            record.filename,
            record.index,
            "sensitivityNmPerRiu",
            {
              method: "fom_relation",
              fom: recomputeRelationFom.value ?? null,
              fwhm: recomputeRelationFwhm.value ?? null,
            },
          )
        : await apiService.recomputeField(
            jobId,
            record.fileId,
            record.filename,
            record.index,
            "sensitivityNmPerRiu",
            {
              method: formulaKey === null ? null : "sensing_medium",
              formulaKey,
              rawMagnitude: recomputeMagnitude.value,
              rawUnit: recomputeUnit.value.trim() || null,
              customConstant: recomputeConstant.value,
            },
          );
    emit("record-updated", updated);
    emit("recompute-applied", record, updated);
    recomputeOpen.value = false;
  } catch (error) {
    recomputeError.value =
      error instanceof Error ? error.message : t("extraction.review.detail.recompute.error");
  } finally {
    recomputeSubmitting.value = false;
  }
}

function applyRecompute() {
  if (!canApplyRecompute.value || !recomputeFormula.value) return;
  runRecomputeSensitivity(recomputeFormula.value);
}

function applyNoConversion() {
  runRecomputeSensitivity(null);
}

async function applyFomRecompute() {
  const record = props.record;
  const jobId = props.jobId;
  if (!record || !jobId) return;
  fomSubmitting.value = true;
  fomError.value = null;
  try {
    const updated = await apiService.recomputeField(
      jobId,
      record.fileId,
      record.filename,
      record.index,
      "fomRiuInv",
      {
        method: "fom_relation",
        sensitivity: fomInputSensitivity.value ?? null,
        fwhm: fomInputFwhm.value ?? null,
      },
    );
    emit("record-updated", updated);
    emit("recompute-applied", record, updated);
    fomPanelOpen.value = false;
  } catch (error) {
    fomError.value =
      error instanceof Error ? error.message : t("extraction.review.detail.recompute.error");
  } finally {
    fomSubmitting.value = false;
  }
}

async function applyFwhmRecompute() {
  const record = props.record;
  const jobId = props.jobId;
  if (!record || !jobId) return;
  fwhmSubmitting.value = true;
  fwhmError.value = null;
  try {
    const updated = await apiService.recomputeField(
      jobId,
      record.fileId,
      record.filename,
      record.index,
      "fwhmNm",
      {
        method: "fom_relation",
        fom: fwhmInputFom.value ?? null,
        sensitivity: fwhmInputSensitivity.value ?? null,
      },
    );
    emit("record-updated", updated);
    emit("recompute-applied", record, updated);
    fwhmPanelOpen.value = false;
  } catch (error) {
    fwhmError.value =
      error instanceof Error ? error.message : t("extraction.review.detail.recompute.error");
  } finally {
    fwhmSubmitting.value = false;
  }
}

const layersDirty = computed(
  () => formatLayerStructure(layers.value) !== (props.record?.layerStructure ?? ""),
);

function saveLayerStructure() {
  emit("save", { layerStructure: formatLayerStructure(layers.value) });
}

const IDENTIFICATION_KEYS = ["ref", "origin", "title", "shortTitle", "modeId", "domain"];
const MEASUREMENT_KEYS = [
  "resonanceWavelengthNm",
  "spectralRange",
  "fomRiuInv",
  "sensitivityNmPerRiu",
  "fwhmNm",
  "qFactor",
  "sensingMedium",
];
const MATERIALS_KEYS = ["materialClass", "baseMaterials"];

// One run through the multi-run reconciliation log per record, split into
// notes that are about one specific field (shown right on that field, see
// fieldNote) vs. record-level bookkeeping with nowhere else to go (shown in
// Provenance, see generalNotes below).
const parsedNotes = computed(() => parseReconciliationLog(props.record?.reconciliationLog));
const grouped = computed(() => groupReconciliationNotes(parsedNotes.value));
const generalNotes = computed(() => grouped.value.general);

// Routed through fieldNote (not grouped.byField directly) so a section's
// header chip lights up for EITHER reason a field might carry a warning --
// a cross-run reconciliation disagreement, or (see fieldNote below) a
// value that was calculated rather than read from the paper.
function sectionHasWarning(keys: string[]): boolean {
  return keys.some((key) => fieldNote(key)?.severity === "warning");
}

function noteText(note: ReconciliationNote): string {
  switch (note.kind) {
    case "disagreement":
      return t("extraction.review.detail.reconciliation.disagreement", { values: note.raw });
    case "partialAgreement":
      return t(
        "extraction.review.detail.reconciliation.partialAgreement",
        { agreed: note.agreed, total: note.total },
        { plural: note.agreed },
      );
    case "fullDisagreement":
      return t("extraction.review.detail.reconciliation.fullDisagreement", { values: note.raw });
    case "rowCount":
      return t(
        "extraction.review.detail.reconciliation.rowCount",
        { count: note.count, total: note.total },
        { plural: note.count },
      );
    case "extraRow":
      return t("extraction.review.detail.reconciliation.extraRow", { total: note.total });
    case "raw":
      return note.raw;
  }
}

// Resonance Wavelength / Sensitivity are the only two fields the extraction
// prompt ever converts (see backend/prompts/extraction.txt) -- a "Raw Value"/
// "Conversion Method" pair is never attributed to one of the two specifically,
// so both fields surface the same conversion note when present.
const CONVERTIBLE_KEYS = new Set(["resonanceWavelengthNm", "sensitivityNmPerRiu"]);

// FWHM is currently the only metric the extraction prompt's Calculation
// Fallback can ever derive from other extracted values instead of reading
// directly from the paper (see backend/prompts/extraction.txt's "Calculated
// Fields" rule) -- extend this if the prompt ever adds another one.
const CALCULATED_KEYS = new Set(["fwhmNm"]);

// A field's own note, prioritizing a multi-run disagreement (the reviewer
// needs to know a value is uncertain), then a calculated-not-extracted flag
// (equally warning-level: this value isn't in the paper's text at all),
// over a plain unit-conversion FYI -- the conversion detail is still
// visible in full in Provenance either way.
function fieldNote(key: string): { severity: "info" | "warning"; text: string } | null {
  const notes = grouped.value.byField.get(key);
  if (notes?.length) return { severity: notes[0].severity, text: noteText(notes[0]) };
  if (CALCULATED_KEYS.has(key) && props.record?.calculatedFields) {
    return {
      severity: "warning",
      text: t("extraction.review.detail.reconciliation.calculated", {
        detail: props.record.calculatedFields,
      }),
    };
  }
  if (CONVERTIBLE_KEYS.has(key) && props.record?.rawValue) {
    return {
      severity: "info",
      text: t("extraction.review.detail.reconciliation.converted", {
        rawValue: props.record.rawValue,
        method: props.record.conversionMethod ?? "",
      }),
    };
  }
  return null;
}
</script>
