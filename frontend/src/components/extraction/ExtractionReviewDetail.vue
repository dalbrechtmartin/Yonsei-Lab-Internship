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
        <p
          v-if="record.reviewStatus === 'Edit' && !flaggedFieldKeys.length"
          class="text-[11px] text-amber-800/75"
        >
          {{ t("extraction.review.detail.status.noFieldFlag") }}
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
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('ref')"
          @save="(v) => saveField('ref', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'ref')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.origin')"
          :value="record.origin"
          editable
          :note="fieldNote('origin')"
          :reset-token="resetToken"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('origin')"
          @save="(v) => saveField('origin', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'origin')"
        />
        <ExtractionDetailField
          wide
          :label="t('extraction.review.edit.fields.title')"
          :value="record.title"
          editable
          :note="fieldNote('title')"
          :reset-token="resetToken"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('title')"
          @save="(v) => saveField('title', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'title')"
        />
        <ExtractionDetailField
          wide
          :label="t('extraction.review.edit.fields.shortTitle')"
          :value="record.shortTitle"
          editable
          :note="fieldNote('shortTitle')"
          :reset-token="resetToken"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('shortTitle')"
          @save="(v) => saveField('shortTitle', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'shortTitle')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.modeId')"
          :value="record.modeId"
          editable
          :note="fieldNote('modeId')"
          :reset-token="resetToken"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('modeId')"
          @save="(v) => saveField('modeId', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'modeId')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.domain')"
          :value="record.domain"
          editable
          :note="fieldNote('domain')"
          :reset-token="resetToken"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('domain')"
          @save="(v) => saveField('domain', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'domain')"
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
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('resonanceWavelengthNm')"
          @save="(v) => saveField('resonanceWavelengthNm', v)"
          @select-source="emitSelectSourceForField('resonanceWavelengthNm')"
          @toggle-confirm="emit('toggle-confirm-field', 'resonanceWavelengthNm')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.spectralRange')"
          :value="record.spectralRange"
          editable
          :note="fieldNote('spectralRange')"
          :reset-token="resetToken"
          :options="spectralRangeOptions"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('spectralRange')"
          @save="(v) => saveField('spectralRange', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'spectralRange')"
        />
        <ExtractionDetailField
          type="number"
          :label="formatUnitSuperscripts(t('extraction.review.edit.fields.fomRiuInv'))"
          :value="record.fomRiuInv"
          editable
          :note="fieldNote('fomRiuInv')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('fomRiuInv')"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('fomRiuInv')"
          @save="(v) => saveField('fomRiuInv', v)"
          @select-source="emitSelectSourceForField('fomRiuInv')"
          @toggle-confirm="emit('toggle-confirm-field', 'fomRiuInv')"
        >
          <template v-if="jobId && fomDefinitionRecognized" #extra>
            <Popover v-model:open="fomPanelOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="mt-0.5 shrink-0 rounded p-0.5 transition-colors"
                  :class="
                    autoFillTarget === 'fomRiuInv'
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-secondary/70 hover:bg-secondary/15 hover:text-ink'
                  "
                  :aria-label="t('extraction.review.detail.recompute.fomLabel')"
                >
                  <Calculator class="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" class="flex w-80 flex-col gap-2.5 p-3">
                <div>
                  <p class="font-mono text-[13px] font-semibold text-ink">
                    {{ t("extraction.review.detail.recompute.fomFormula") }}
                  </p>
                  <p class="text-[11px] leading-snug text-secondary">
                    {{ t("extraction.review.detail.recompute.fomHint") }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex flex-col gap-0.5">
                    <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                      {{ t("extraction.review.edit.fields.sensitivityNmPerRiu") }}
                    </Label>
                    <Input v-model.number="fomInputSensitivity" type="number" />
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                      {{ t("extraction.review.edit.fields.fwhmNm") }}
                    </Label>
                    <Input v-model.number="fomInputFwhm" type="number" />
                  </div>
                </div>
                <p v-if="fomError" class="text-xs text-rose-700">{{ fomError }}</p>
                <p v-if="fomSuccessMessage" class="flex items-center gap-1 text-xs text-emerald-700">
                  <Check class="size-3.5 shrink-0" />
                  {{ fomSuccessMessage }}
                </p>
                <div class="flex justify-end">
                  <Button type="button" size="sm" :disabled="fomSubmitting" @click="applyFomRecompute">
                    {{ t("extraction.review.detail.recompute.calculate") }}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </template>
        </ExtractionDetailField>

        <ExtractionDefinitionField
          :label="t('extraction.review.edit.fields.definition')"
          :value="record.definition"
          editable
          :note="fieldNote('definition')"
          :reset-token="resetToken"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('definition')"
          @save="(v) => saveField('definition', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'definition')"
        />
        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.sensitivityNmPerRiu')"
          :value="record.sensitivityNmPerRiu"
          editable
          :note="fieldNote('sensitivityNmPerRiu')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('sensitivityNmPerRiu')"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('sensitivityNmPerRiu')"
          @save="(v) => saveField('sensitivityNmPerRiu', v)"
          @select-source="emitSelectSourceForField('sensitivityNmPerRiu')"
          @toggle-confirm="emit('toggle-confirm-field', 'sensitivityNmPerRiu')"
        >
          <template v-if="jobId" #extra>
            <Popover v-model:open="recomputeOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="mt-0.5 shrink-0 rounded p-0.5 transition-colors"
                  :class="
                    autoFillTarget === 'sensitivityNmPerRiu'
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-secondary/70 hover:bg-secondary/15 hover:text-ink'
                  "
                  :aria-label="t('extraction.review.detail.recompute.label')"
                >
                  <Calculator class="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" class="flex w-96 flex-col gap-2.5 p-3">
                <div>
                  <p class="text-[13px] font-semibold text-ink">
                    {{ t("extraction.review.detail.recompute.label") }}
                  </p>
                  <p class="text-[11px] leading-snug text-secondary">
                    {{
                      isFomRelationFormula
                        ? t("extraction.review.detail.recompute.relationFormula")
                        : t("extraction.review.detail.recompute.sensitivityHint")
                    }}
                  </p>
                </div>
                <div class="flex flex-col gap-0.5">
                  <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                    {{ t("extraction.review.detail.recompute.formulaPlaceholder") }}
                  </Label>
                  <Select v-model="recomputeFormula">
                    <SelectTrigger class="bg-card/80">
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
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <template v-if="isFomRelationFormula">
                    <div class="flex flex-col gap-0.5">
                      <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                        {{ t("extraction.review.edit.fields.fomRiuInv") }}
                      </Label>
                      <Input v-model.number="recomputeRelationFom" type="number" />
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                        {{ t("extraction.review.edit.fields.fwhmNm") }}
                      </Label>
                      <Input v-model.number="recomputeRelationFwhm" type="number" />
                    </div>
                  </template>
                  <template v-else>
                    <div class="flex flex-col gap-0.5">
                      <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                        {{ t("extraction.review.detail.recompute.rawMagnitude") }}
                      </Label>
                      <Input v-model.number="recomputeMagnitude" type="number" />
                    </div>
                    <div class="flex flex-col gap-0.5">
                      <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                        {{ t("extraction.review.detail.recompute.unitLabel") }}
                      </Label>
                      <Input
                        v-model="recomputeUnit"
                        type="text"
                        :placeholder="t('extraction.review.detail.recompute.unitPlaceholder')"
                      />
                    </div>
                    <div v-if="isCustomFormula" class="col-span-2 flex flex-col gap-0.5">
                      <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                        {{ t("extraction.review.detail.recompute.customConstant") }}
                      </Label>
                      <Input v-model.number="recomputeConstant" type="number" />
                    </div>
                  </template>
                </div>
                <p v-if="recomputeError" class="text-xs text-rose-700">{{ recomputeError }}</p>
                <p v-if="recomputeSuccessMessage" class="flex items-center gap-1 text-xs text-emerald-700">
                  <Check class="size-3.5 shrink-0" />
                  {{ recomputeSuccessMessage }}
                </p>
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
              </PopoverContent>
            </Popover>
          </template>
        </ExtractionDetailField>
        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.fwhmNm')"
          :value="record.fwhmNm"
          editable
          :note="fieldNote('fwhmNm')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('fwhmNm')"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('fwhmNm')"
          @save="(v) => saveField('fwhmNm', v)"
          @select-source="emitSelectSourceForField('fwhmNm')"
          @toggle-confirm="emit('toggle-confirm-field', 'fwhmNm')"
        >
          <template v-if="jobId && fomDefinitionRecognized" #extra>
            <Popover v-model:open="fwhmPanelOpen">
              <PopoverTrigger as-child>
                <button
                  type="button"
                  class="mt-0.5 shrink-0 rounded p-0.5 transition-colors"
                  :class="
                    autoFillTarget === 'fwhmNm'
                      ? 'text-primary hover:bg-primary/10'
                      : 'text-secondary/70 hover:bg-secondary/15 hover:text-ink'
                  "
                  :aria-label="t('extraction.review.detail.recompute.fwhmLabel')"
                >
                  <Calculator class="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" class="flex w-80 flex-col gap-2.5 p-3">
                <div>
                  <p class="font-mono text-[13px] font-semibold text-ink">
                    {{ t("extraction.review.detail.recompute.fwhmFormula") }}
                  </p>
                  <p class="text-[11px] leading-snug text-secondary">
                    {{ t("extraction.review.detail.recompute.fwhmHint") }}
                  </p>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="flex flex-col gap-0.5">
                    <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                      {{ t("extraction.review.edit.fields.fomRiuInv") }}
                    </Label>
                    <Input v-model.number="fwhmInputFom" type="number" />
                  </div>
                  <div class="flex flex-col gap-0.5">
                    <Label class="text-[9.5px] font-medium tracking-wide text-secondary uppercase">
                      {{ t("extraction.review.edit.fields.sensitivityNmPerRiu") }}
                    </Label>
                    <Input v-model.number="fwhmInputSensitivity" type="number" />
                  </div>
                </div>
                <p v-if="fwhmError" class="text-xs text-rose-700">{{ fwhmError }}</p>
                <p v-if="fwhmSuccessMessage" class="flex items-center gap-1 text-xs text-emerald-700">
                  <Check class="size-3.5 shrink-0" />
                  {{ fwhmSuccessMessage }}
                </p>
                <div class="flex justify-end">
                  <Button type="button" size="sm" :disabled="fwhmSubmitting" @click="applyFwhmRecompute">
                    {{ t("extraction.review.detail.recompute.calculate") }}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </template>
        </ExtractionDetailField>

        <ExtractionDetailField
          type="number"
          :label="t('extraction.review.edit.fields.qFactor')"
          :value="record.qFactor"
          editable
          :note="fieldNote('qFactor')"
          :reset-token="resetToken"
          :has-source="!!sourceForField('qFactor')"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('qFactor')"
          @save="(v) => saveField('qFactor', v)"
          @select-source="emitSelectSourceForField('qFactor')"
          @toggle-confirm="emit('toggle-confirm-field', 'qFactor')"
        />
        <ExtractionDetailField
          :label="t('extraction.review.edit.fields.sensingMedium')"
          :value="record.sensingMedium"
          editable
          :note="fieldNote('sensingMedium')"
          :reset-token="resetToken"
          :options="sensingMediumOptions"
          :show-confirm="canConfirmFields"
          :confirmed="isConfirmed('sensingMedium')"
          @save="(v) => saveField('sensingMedium', v)"
          @toggle-confirm="emit('toggle-confirm-field', 'sensingMedium')"
        />
      </dl>
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
          <ExtractionTagsField
            :label="t('extraction.review.edit.fields.materialClass')"
            :value="record.materialClass"
            editable
            :note="fieldNote('materialClass')"
            :reset-token="resetToken"
            :options="materialClassOptions"
            :show-confirm="canConfirmFields"
            :confirmed="isConfirmed('materialClass')"
            @save="(v) => saveField('materialClass', v)"
            @toggle-confirm="emit('toggle-confirm-field', 'materialClass')"
          />
          <ExtractionTagsField
            :label="t('extraction.review.edit.fields.baseMaterials')"
            :value="record.baseMaterials"
            editable
            :note="fieldNote('baseMaterials')"
            :reset-token="resetToken"
            :options="baseMaterialsJobOptions"
            :show-confirm="canConfirmFields"
            :confirmed="isConfirmed('baseMaterials')"
            @save="(v) => saveField('baseMaterials', v)"
            @toggle-confirm="emit('toggle-confirm-field', 'baseMaterials')"
          />
        </dl>
        <div class="flex flex-col gap-1 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5">
          <Label class="text-[10px] font-medium tracking-wide text-secondary uppercase">
            {{ t("extraction.review.edit.fields.layerStructure") }}
          </Label>
          <LayerStructureField
            v-model="layers"
            :material-options="baseMaterialOptions"
            allow-create-material
            @material-created="handleMaterialCreated"
          />
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
            :emphasize="!!record.notes"
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
import { AlertTriangle, Calculator, Check, Info, Quote } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import ExtractionDefinitionField from "@/components/extraction/ExtractionDefinitionField.vue";
import ExtractionTagsField from "@/components/extraction/ExtractionTagsField.vue";
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
import { formatUnitSuperscripts, tokenizeValue } from "@/utils/columnTypes";
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

const props = defineProps<{
  record: ExtractionRecord | null;
  /** The job's full, unfiltered record list -- used only to derive job-wide
   * autocomplete suggestions (Sensing Medium, Material Class, Base
   * Materials). Omitted by the guide's static worked example, which has no
   * real job behind it -- every suggestion list just degrades to whatever
   * canonical/hardcoded values exist on their own (see materialClassOptions). */
  allRecords?: ExtractionRecord[];
  /** Used by the guide's static worked example: starts with only the
   * Provenance section open (identification/measurements/materials
   * collapsed) so the printed page shows the interesting "why is this
   * flagged" part without needing the full card's height. The live review
   * screen never sets this -- a real reviewer gets every section open, so
   * every field's edit affordance is reachable without first having to
   * discover which section it lives in (a fully collapsed section's fields
   * are still in the DOM, just visually clipped, so clicking where an
   * invisible field's pencil "should" be silently does nothing -- this is
   * exactly what a real reviewer hit before this prop's default changed:
   * everything outside "Mesures" looked entirely unresponsive). */
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
  /** Session-local "confirmed" keys for THIS record, keyed
   * `${recordKey}:${fieldKey}` -- owned by ExtractionReviewStep (the common
   * ancestor of this card and the bottom action bar's unconfirmed-count
   * badge), never persisted. Omitted (the guide's static example) just
   * leaves every confirm toggle unchecked and non-interactive-looking. */
  confirmedFieldKeys?: Set<string>;
}>();
const emit = defineEmits<{
  /** `focusValue`, when given, is the specific field's own current value
   * (as plain text) -- lets the PDF viewer pinpoint just that number within
   * the source's passage instead of highlighting the whole thing. Omitted
   * by every click that isn't about one specific field (the "Voir la
   * source"/"Source N" pills, the per-citation Location link in
   * Provenance), which should always highlight the full passage. */
  "select-source": [source: EvidenceSource, focusValue?: string | null];
  save: [fields: Partial<EditableRecordFields>];
  /** One entry per currently-flagged field on the record now displayed --
   * recomputed (and re-emitted) every time the set of warnings changes, so
   * the parent's unconfirmed-count badge stays accurate without needing to
   * duplicate fieldNote's own warning logic. */
  "flagged-fields": [keys: string[]];
  "toggle-confirm-field": [key: string];
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

// Every section starts open on a real review screen -- see `compact`'s own
// doc comment above for why this must NOT be an exclusive accordion (a
// collapsed section's fields are unreachable, not just visually tucked
// away). Independent per-section state (not the exclusive
// useAccordionPanel.ts pattern VisualizationView's own side panels use) so
// opening one never silently closes another. Only the guide's static
// example (`compact`) starts with anything collapsed, to keep its printed
// page short.
const identificationOpen = ref(!props.compact);
const measurementsOpen = ref(!props.compact);
const materialsOpen = ref(!props.compact);
const provenanceOpen = ref(true);

const sources = computed(() =>
  parseEvidenceSources(
    props.record?.evidence ?? null,
    props.record?.location ?? null,
    props.record?.evidenceFieldMap ?? null,
  ),
);

// Autocomplete suggestions for the "assisted editing" fields below, drawn
// from the job's OTHER records (allRecords, unfiltered by review status) --
// never from a hardcoded list for Sensing Medium/Base Materials, since
// prompts/extraction.txt treats both as genuinely open-ended free text (no
// fixed vocabulary the LLM is constrained to).
const sensingMediumOptions = computed(() =>
  Array.from(
    new Set(
      (props.allRecords ?? [])
        .map((r) => r.sensingMedium)
        .filter((v): v is string => !!v),
    ),
  ).sort(),
);

// Same reasoning as sensingMediumOptions -- Spectral Range is free text too
// (prompts/extraction.txt gives it no fixed vocabulary, papers phrase it as
// anything from "Visible" to "800-1000 nm" to "Near-infrared"), so
// suggestions come only from what this job's own other records already
// used, not a hardcoded list.
const spectralRangeOptions = computed(() =>
  Array.from(
    new Set(
      (props.allRecords ?? [])
        .map((r) => r.spectralRange)
        .filter((v): v is string => !!v),
    ),
  ).sort(),
);

// Material Class DOES have a fixed 6-value enum the LLM is instructed to
// pick from (prompts/extraction.txt) -- seeded here so a reviewer editing
// this field sees every value extraction could legitimately have produced,
// even on a job where none of them happen to be in use yet. Still unioned
// with whatever's actually in the job (and still creatable) in case the
// model drifted from that list or a paper needs a value outside it.
const CANONICAL_MATERIAL_CLASSES = [
  "Dielectric",
  "Metal",
  "Phase-change",
  "Polymer",
  "Semiconductor",
  "2D Material",
];
const materialClassOptions = computed(() => {
  const seen = new Set(CANONICAL_MATERIAL_CLASSES);
  for (const r of props.allRecords ?? []) {
    for (const token of tokenizeValue(r.materialClass)) seen.add(token);
  }
  return Array.from(seen).sort();
});

// Base Materials has no fixed vocabulary at all (chemical formulas, common
// names for 2D materials, polymer abbreviations -- prompts/extraction.txt)
// -- purely job-derived, same as Sensing Medium.
const baseMaterialsJobOptions = computed(() => {
  const seen = new Set<string>();
  for (const r of props.allRecords ?? []) {
    for (const token of tokenizeValue(r.baseMaterials)) seen.add(token);
  }
  return Array.from(seen).sort();
});

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
  if (!source) return;
  const value = props.record?.[key] ?? null;
  emit("select-source", source, typeof value === "number" ? String(value) : null);
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

// A material typed into the layer editor that the AI never listed under
// Base Materials (allow-create-material on LayerStructureField below) --
// synced back into Base Materials itself so it isn't left "unplaced"
// relative to that field's own reminder text once this save round-trips.
function handleMaterialCreated(name: string) {
  if (baseMaterialOptions.value.some((m) => m.toLowerCase() === name.toLowerCase())) return;
  saveField("baseMaterials", [...baseMaterialOptions.value, name].join("; "));
}

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
// Shown inline for a beat after a successful calculation, THEN the popover
// closes -- confirming a recompute actually did something used to be only
// the popover silently vanishing while a number changed somewhere else on
// the card, easy to miss entirely.
const recomputeSuccessMessage = ref<string | null>(null);
let recomputeSuccessTimer: ReturnType<typeof setTimeout> | null = null;

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

// True only while recomputeFormula holds the algebraic "fom_relation"
// fallback picked automatically by prefillSensitivityPanel below (never when
// the reviewer picked it themselves via the Select) -- lets the async
// sensing-medium-match retry watch still override it once the formula list
// arrives, since a formula the paper actually names is more trustworthy
// than the generic algebraic fallback.
const sensitivityFormulaIsAutoFallback = ref(false);

function resetSensitivityPanel() {
  recomputeFormula.value = undefined;
  recomputeMagnitude.value = undefined;
  recomputeUnit.value = "";
  recomputeConstant.value = undefined;
  recomputeRelationFom.value = undefined;
  recomputeRelationFwhm.value = undefined;
  recomputeError.value = null;
  sensitivityFormulaIsAutoFallback.value = false;
  recomputeSuccessMessage.value = null;
  if (recomputeSuccessTimer) clearTimeout(recomputeSuccessTimer);
}

// Pre-fills magnitude/unit from the record's own Raw Value, and pre-selects
// whichever gas/liquid formula's label case-insensitively exactly matches
// the record's Sensing Medium -- never guesses when there's no clean match,
// just leaves the formula unselected. Only ever called right after
// resetSensitivityPanel (record change), never on a later panel toggle, so
// an in-progress edit is never clobbered.
//
// When no sensing-medium match is available but the algebraic relation
// would auto-fill this field anyway (autoFillTarget), pre-select that
// instead -- so opening the popover is always "already filled in, ready to
// calculate" whenever it can be, matching the one-click auto-fill this
// replaced. Marked via sensitivityFormulaIsAutoFallback so the retry watch
// below can still swap in a real sensing-medium match that arrives later.
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
  if (!recomputeFormula.value && autoFillTarget.value === "sensitivityNmPerRiu") {
    recomputeFormula.value = "fom_relation";
    sensitivityFormulaIsAutoFallback.value = true;
  }
}

// The formula list loads asynchronously (see onMounted below) and may still
// be empty the first time prefillSensitivityPanel runs -- retry just the
// formula-match once it arrives. Guarded on "not already chosen" so this
// never overwrites a formula the reviewer (or an earlier, successful match)
// already picked -- EXCEPT the auto-fallback above, which a real match here
// should still win over.
watch(sensingMediumFormulas, () => {
  if (recomputeFormula.value && !sensitivityFormulaIsAutoFallback.value) return;
  const record = props.record;
  if (!record?.sensingMedium) return;
  const match = sensingMediumFormulas.value.find(
    (f) => f.label.toLowerCase() === record.sensingMedium!.toLowerCase(),
  );
  if (match) {
    recomputeFormula.value = match.key;
    sensitivityFormulaIsAutoFallback.value = false;
  }
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
const fomSuccessMessage = ref<string | null>(null);
let fomSuccessTimer: ReturnType<typeof setTimeout> | null = null;

const fwhmPanelOpen = ref(false);
const fwhmInputFom = ref<number | undefined>(undefined);
const fwhmInputSensitivity = ref<number | undefined>(undefined);
const fwhmError = ref<string | null>(null);
const fwhmSuccessMessage = ref<string | null>(null);
let fwhmSuccessTimer: ReturnType<typeof setTimeout> | null = null;
const fwhmSubmitting = ref(false);

function resetFomPanel() {
  fomInputSensitivity.value = props.record?.sensitivityNmPerRiu ?? undefined;
  fomInputFwhm.value = props.record?.fwhmNm ?? undefined;
  fomError.value = null;
  fomSuccessMessage.value = null;
  if (fomSuccessTimer) clearTimeout(fomSuccessTimer);
}
function resetFwhmPanel() {
  fwhmInputFom.value = props.record?.fomRiuInv ?? undefined;
  fwhmInputSensitivity.value = props.record?.sensitivityNmPerRiu ?? undefined;
  fwhmError.value = null;
  fwhmSuccessMessage.value = null;
  if (fwhmSuccessTimer) clearTimeout(fwhmSuccessTimer);
}

// Whichever ONE of {fomRiuInv, sensitivityNmPerRiu, fwhmNm} is null while
// the other two both already have a value, when the Definition is
// recognized -- drives the matching field's calculator icon to its accent
// color (see the #extra templates above) so a reviewer sees at a glance
// which one is "ready to compute in one click": opening that field's
// popover is already pre-filled by prefillSensitivityPanel/resetFomPanel/
// resetFwhmPanel below, so there is no separate one-click action to trigger
// here anymore -- the popover's own "Calculer" button IS the one click.
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

// Closing/resetting every recompute popover on record change, same reasoning
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
  },
  { immediate: true },
);

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
    if (formulaKey === null) {
      // "Ne pas convertir" is a deliberate opt-out, not a calculation --
      // closes immediately, same as before, no success message to show.
      recomputeOpen.value = false;
    } else {
      recomputeSuccessMessage.value = t("extraction.review.detail.recompute.successMessage", {
        field: t("extraction.review.edit.fields.sensitivityNmPerRiu"),
        value: updated.sensitivityNmPerRiu ?? "—",
      });
      if (recomputeSuccessTimer) clearTimeout(recomputeSuccessTimer);
      recomputeSuccessTimer = setTimeout(() => {
        recomputeOpen.value = false;
      }, 1400);
    }
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
    fomSuccessMessage.value = t("extraction.review.detail.recompute.successMessage", {
      field: t("extraction.review.edit.fields.fomRiuInv"),
      value: updated.fomRiuInv ?? "—",
    });
    if (fomSuccessTimer) clearTimeout(fomSuccessTimer);
    fomSuccessTimer = setTimeout(() => {
      fomPanelOpen.value = false;
    }, 1400);
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
    fwhmSuccessMessage.value = t("extraction.review.detail.recompute.successMessage", {
      field: t("extraction.review.edit.fields.fwhmNm"),
      value: updated.fwhmNm ?? "—",
    });
    if (fwhmSuccessTimer) clearTimeout(fwhmSuccessTimer);
    fwhmSuccessTimer = setTimeout(() => {
      fwhmPanelOpen.value = false;
    }, 1400);
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
// value that was calculated rather than read from the paper. Reads from
// flaggedFieldKeys (not fieldNote directly) so this can never disagree with
// the bottom-bar counter or a field's own confirm affordance about which
// keys actually count -- one shared definition, including the reviewStatus
// === "Edit" gate that keeps this from lighting up on a record the AI
// itself already considers resolved. A key the reviewer has already
// confirmed no longer counts either -- otherwise the chip would keep
// reading "À vérifier" even after every flagged field in the section has
// been individually checked off.
function sectionHasWarning(keys: string[]): boolean {
  return keys.some((key) => flaggedFieldKeys.value.includes(key) && !isConfirmed(key));
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

// Every field this card CAN flag a warning on -- deliberately excludes
// Model Used/Layer Structure/Evidence-Location (never carry a fieldNote) and
// Reconciliation Log/Raw Value/Conversion Method (record-level, shown in
// Provenance directly, not through a field's own warning icon).
const FLAGGABLE_KEYS = [
  "ref",
  "origin",
  "title",
  "shortTitle",
  "modeId",
  "domain",
  "resonanceWavelengthNm",
  "spectralRange",
  "fomRiuInv",
  "definition",
  "sensitivityNmPerRiu",
  "fwhmNm",
  "qFactor",
  "sensingMedium",
  "materialClass",
  "baseMaterials",
];

// Notes is deliberately NOT included here -- it's something to read, not a
// specific value to double-check and tick off. Counting it toward "N champs
// à confirmer" forced a click with no real Provenance-section "À vérifier"
// badge pointing there in the first place (Provenance has no such header
// chip, unlike Measures/Materials/Identification), which just felt like an
// unexplained, un-clearable item stuck in the count. Its amber emphasis
// (see the Provenance section's ExtractionDetailField usage, `:emphasize`
// now tied to actually having content) still makes it visually stand out
// on its own, without turning it into a checklist item.
//
// Only ever populated for a record the AI itself flagged "Edit" -- the SAME
// condition the "À confirmer" tab already uses (useExtractionRecords'
// `counts.toConfirm`). Without this gate, a record already "Approve (AI)"/
// "Approve (Manual)" (so absent from that tab entirely) could still surface
// "⚠ À vérifier" section chips and a "N champs à confirmer" bottom badge
// from an unrelated reconciliation-disagreement or calculated-value note --
// a real reported confusion: the record reads as "nothing to do" in one
// place and "you have things to confirm" in another, from two systems that
// were never actually tied to the same definition of "needs attention" .
const flaggedFieldKeys = computed(() => {
  if (props.record?.reviewStatus !== "Edit") return [];
  return FLAGGABLE_KEYS.filter((key) => fieldNote(key)?.severity === "warning");
});
watch(flaggedFieldKeys, (keys) => emit("flagged-fields", keys), { immediate: true });

// Gates every field's confirm affordance (the `showConfirm` prop passed to
// each ExtractionDetailField/ExtractionTagsField/ExtractionDefinitionField
// below) -- kept as one shared computed so it can never drift out of sync
// with flaggedFieldKeys' own reviewStatus condition above.
const canConfirmFields = computed(() => !!props.jobId && props.record?.reviewStatus === "Edit");

function isConfirmed(key: string): boolean {
  if (!props.record || !props.confirmedFieldKeys) return false;
  return props.confirmedFieldKeys.has(`${recordKey(props.record)}:${key}`);
}
</script>
