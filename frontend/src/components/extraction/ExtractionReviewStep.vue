<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
  >
    <div class="flex min-h-0 min-w-0 flex-1 flex-col lg:min-w-90">
      <!-- Everything that grows/shrinks with the record's own content
           (table + accordion detail card) lives in this scrollable region;
           the actions row below is a plain sibling, never inside it -- a
           `sticky` footer only pins to the visible bottom edge once its
           content actually overflows, so collapsing to a short section
           (e.g. Matériaux) used to leave it stranded right under the short
           content with a dead gap below, then it would jump back down once
           a taller section (e.g. Identification) pushed the panel into
           overflow again. A flex sibling has no such conditional behavior:
           this region's flex-1 always claims the full remaining height
           first, so the actions row after it is always at the true bottom. -->
      <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-5 pb-3 sm:p-7 sm:pb-3">
        <div class="flex flex-wrap items-center gap-3">
          <ExtractionReviewTabs
            :model-value="activeFilter"
            :counts="counts"
            @update:model-value="emit('update:activeFilter', $event)"
          />
          <span class="ml-auto shrink-0 font-mono text-xs text-secondary">
            {{
              t("extraction.review.rowOf", {
                current: cursorPosition,
                total: records.length,
              })
            }}
          </span>
        </div>

        <ExtractionReviewTable
          :records="records"
          :selected-index="selectedIndex"
          :sort-by-ref="sortByRef"
          @select="handleSelect"
          @toggle-sort-by-ref="emit('toggle-sort-by-ref')"
        />

        <ExtractionReviewDetail
          :record="cursor"
          :all-records="allRecords"
          :page-labels="pageLabels"
          :job-id="jobId"
          :confirmed-field-keys="confirmedFields"
          @select-source="handleSelectSource"
          @save="handleSave"
          @record-updated="emit('record-updated', $event)"
          @recompute-applied="(before, after) => emit('recompute-applied', before, after)"
          @flagged-fields="flaggedFieldKeys = $event"
          @toggle-confirm-field="handleToggleConfirmField"
        />
      </div>

      <div
        class="flex shrink-0 flex-col gap-2 border-t border-secondary/10 bg-card/95 px-5 pt-2 pb-3 sm:px-7"
      >
        <div v-if="recomputeCanUndo || recomputeCanRedo" class="flex items-center gap-1">
          <Button
            v-if="recomputeCanUndo"
            type="button"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-secondary"
            @click="emit('undo-recompute')"
          >
            <Undo2 class="size-3.5" />
            {{ t("extraction.review.actions.undo") }}
          </Button>
          <Button
            v-if="recomputeCanRedo"
            type="button"
            variant="ghost"
            size="sm"
            class="gap-1.5 text-secondary"
            @click="emit('redo-recompute')"
          >
            <Redo2 class="size-3.5" />
            {{ t("extraction.review.actions.redo") }}
          </Button>
        </div>
        <!-- Soft, non-blocking reminder -- never disables Valider, matching
             this app's existing "flag, never force" convention (e.g. an
             unrecognized formula never blocks saving, it's marked Edit and
             left to the reviewer). Disappears entirely once every currently
             flagged field on this record has been confirmed. -->
        <span
          v-if="unconfirmedCount > 0"
          class="self-start rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-800"
        >
          {{
            t(
              "extraction.review.actions.unconfirmedCount",
              { count: unconfirmedCount },
              { plural: unconfirmedCount },
            )
          }}
        </span>
        <ExtractionReviewActions
          :disabled="!cursor || loading"
          @validate="handleValidate"
          @exclude="handleExclude"
          @previous="emit('previous')"
          @next="emit('next')"
        />
        <div class="flex justify-end">
          <Button
            type="button"
            class="shrink-0 whitespace-nowrap"
            @click="emit('advance')"
          >
            <span class="inline-flex items-center gap-1.5 whitespace-nowrap">
              {{ t("extraction.review.continueToExport") }}
              <ArrowRight class="size-3.5 shrink-0" />
            </span>
          </Button>
        </div>
      </div>
    </div>

    <div class="hidden w-px shrink-0 bg-secondary/10 lg:block" />

    <div
      class="flex min-h-105 flex-[1.3] flex-col p-5 sm:p-7 lg:min-h-0 lg:min-w-120"
    >
      <ExtractionPdfViewer
        v-if="cursor"
        :job-id="jobId"
        :file-id="cursor.fileId"
        :filename="cursor.filename"
        :sources="sources"
        :active-source-index="activeSourceIndex"
        :focus-value="activeFocusValue"
        :get-page-count="getPageCount"
        :get-page-labels="getPageLabels"
      />
      <div
        v-else
        class="flex flex-1 items-center justify-center text-sm text-secondary"
      >
        {{ t("extraction.review.empty") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowRight, Redo2, Undo2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import type { EditableRecordFields, ExtractionRecord } from "@/services/api";
import {
  recordKey,
  type ReviewFilter,
  type SortDirection,
} from "@/composables/useExtractionRecords";
import {
  parseEvidenceSources,
  type EvidenceSource,
} from "@/utils/parseLocation";
import ExtractionReviewTabs from "@/components/extraction/ExtractionReviewTabs.vue";
import ExtractionReviewTable from "@/components/extraction/ExtractionReviewTable.vue";
import ExtractionReviewDetail from "@/components/extraction/ExtractionReviewDetail.vue";
import ExtractionReviewActions from "@/components/extraction/ExtractionReviewActions.vue";
import ExtractionPdfViewer from "@/components/extraction/ExtractionPdfViewer.vue";

const props = defineProps<{
  jobId: string;
  /** Already filtered by activeFilter (see useExtractionRecords.filteredRecords)
   * -- this component composes the table/tabs/actions, it doesn't re-filter. */
  records: ExtractionRecord[];
  /** The job's full, unfiltered record list -- used only to derive
   * job-wide autocomplete suggestions (Sensing Medium, Material Class, Base
   * Materials) in ExtractionReviewDetail, which need every record's values
   * regardless of the active review-status tab. */
  allRecords: ExtractionRecord[];
  cursor: ExtractionRecord | null;
  activeFilter: ReviewFilter;
  /** Tab counts, computed off the full unfiltered list. */
  counts: { all: number; toConfirm: number; excluded: number };
  loading: boolean;
  sortByRef: SortDirection;
  getPageCount: (fileId: string) => Promise<number>;
  getPageLabels: (fileId: string) => Promise<(string | null)[]>;
  /** Whether the shared recompute undo/redo slot (see useExtractionRecords)
   * currently holds something for the CURRENT cursor record -- the
   * composable itself already clears both the moment the cursor moves to a
   * different record, so by the time this component renders, a non-null
   * slot always belongs to the record on screen. */
  recomputeCanUndo: boolean;
  recomputeCanRedo: boolean;
}>();

const emit = defineEmits<{
  "update:activeFilter": [filter: ReviewFilter];
  "toggle-sort-by-ref": [];
  "select-record": [record: ExtractionRecord];
  validate: [];
  correct: [fields: Partial<EditableRecordFields>];
  "record-updated": [record: ExtractionRecord];
  /** Forwarded verbatim from ExtractionReviewDetail -- see its own
   * `recompute-applied` emit. ExtractionView is what actually owns the
   * undo/redo bookkeeping (via useExtractionRecords' commitRecompute); this
   * component is just relaying it up, same as `record-updated`. */
  "recompute-applied": [before: ExtractionRecord, after: ExtractionRecord];
  "undo-recompute": [];
  "redo-recompute": [];
  exclude: [];
  previous: [];
  next: [];
  /** "Continuer vers l'export" -- an explicit action rather than an
   * automatic unlock, since review has no hard "done" condition (a
   * researcher may reasonably export without touching every flagged row). */
  advance: [];
}>();

const { t } = useI18n();

const selectedIndex = computed(() =>
  props.cursor ? `${props.cursor.fileId}:${props.cursor.index}` : null,
);

// Which of the (possibly several) evidence sources the PDF viewer should
// currently show. Defaults to the first source; a click on any source in
// the callout overrides it. Reset on the cursor's stable identity, not on
// cursor itself -- cursor gets a new object reference on every Valider/
// Exclure/field-save PATCH even while staying on the same logical record,
// and resetting on that would snap the viewer back to source 1 on every save.
const activeSource = ref<EvidenceSource | null>(null);
// The specific field value (as text) a per-field "jump to source" click
// asked to be pinpointed within activeSource's own passage -- null for any
// click that isn't about one specific field (a "Source N" pill, the
// Provenance list's own Location link), which should always show the whole
// passage. See ExtractionReviewDetail's own `select-source` emit doc.
const activeFocusValue = ref<string | null>(null);
function handleSelectSource(source: EvidenceSource, focusValue?: string | null) {
  activeSource.value = source;
  activeFocusValue.value = focusValue ?? null;
}
watch(
  () => (props.cursor ? recordKey(props.cursor) : null),
  () => {
    activeSource.value = null;
    activeFocusValue.value = null;
  },
);

// Per-field "confirmed" state for the flagged-fields checklist -- session
// local only (never sent to the backend, never in the export), keyed
// `${recordKey}:${fieldKey}` so the same Set can hold entries for every
// record visited this session without them colliding. Owned here (not
// inside ExtractionReviewDetail) because the unconfirmed-count badge below
// is a SIBLING of the detail card, not a descendant -- this component is
// their common ancestor.
const confirmedFields = ref<Set<string>>(new Set());
// Which field keys ExtractionReviewDetail currently considers flagged on
// the record on screen -- reported via its own `flagged-fields` emit rather
// than duplicated here, so this component never needs its own copy of
// fieldNote's warning logic.
const flaggedFieldKeys = ref<string[]>([]);
watch(
  () => (props.cursor ? recordKey(props.cursor) : null),
  () => {
    confirmedFields.value = new Set();
  },
);

const unconfirmedCount = computed(() => {
  if (!props.cursor) return 0;
  const prefix = `${recordKey(props.cursor)}:`;
  return flaggedFieldKeys.value.filter((key) => !confirmedFields.value.has(prefix + key)).length;
});

function handleToggleConfirmField(fieldKey: string) {
  if (!props.cursor) return;
  const full = `${recordKey(props.cursor)}:${fieldKey}`;
  const next = new Set(confirmedFields.value);
  const wasConfirmed = next.has(full);
  if (wasConfirmed) next.delete(full);
  else next.add(full);
  confirmedFields.value = next;
  // Confirming the LAST outstanding flagged field auto-validates the record
  // -- reading through and ticking off every flagged item already IS the
  // review; a further manual click on "Valider" right after would just be
  // repeating a decision already made. Only fires on the >0 -> 0 transition
  // (never on an un-confirm, and never for a record with no flagged fields
  // at all -- unconfirmedCount is already 0 there with nothing to complete),
  // and never overrides a record a reviewer already excluded on purpose.
  if (
    !wasConfirmed &&
    flaggedFieldKeys.value.length > 0 &&
    unconfirmedCount.value === 0 &&
    props.cursor.reviewStatus !== "Exclude"
  ) {
    emit("validate");
  }
}

// Resolved page labels for the cursor's own file, for ExtractionReviewDetail
// to annotate its Location text with (ExtractionPdfViewer fetches its own
// copy independently for the badge -- same memoized function/cache, see
// useExtractionRecords.getPageLabels, so this doesn't double the network cost
// once either has resolved it).
const pageLabels = ref<(string | null)[] | null>(null);
watch(
  () => props.cursor?.fileId ?? null,
  async (fileId) => {
    pageLabels.value = null;
    if (!fileId) return;
    try {
      pageLabels.value = await props.getPageLabels(fileId);
    } catch (error) {
      console.error("Failed to fetch PDF page labels:", error);
    }
  },
  { immediate: true },
);

// Every evidence source for the cursor record -- ExtractionPdfViewer now
// renders all of them (lightly tinted) plus the active one (accented)
// itself, rather than this component pre-resolving down to a single
// {location, evidence} pair the way it used to.
const sources = computed(() =>
  parseEvidenceSources(
    props.cursor?.evidence ?? null,
    props.cursor?.location ?? null,
    props.cursor?.evidenceFieldMap ?? null,
  ),
);
// `activeSource` holds the selected EvidenceSource *object* (unchanged
// contract from ExtractionReviewDetail's @select-source) -- resolved back
// to an index by VALUE, not reference, since ExtractionReviewDetail computes
// its own independent `sources` array from the same pure function and the
// two are never `===`. Defaults to the first source.
const activeSourceIndex = computed(() => {
  if (!activeSource.value) return 0;
  const idx = sources.value.findIndex(
    (s) => s.quote === activeSource.value!.quote && s.location === activeSource.value!.location,
  );
  return idx === -1 ? 0 : idx;
});

const cursorPosition = computed(() => {
  if (!props.cursor) return 0;
  return props.records.findIndex((r) => r === props.cursor) + 1;
});

function handleSelect(record: ExtractionRecord) {
  emit("select-record", record);
}

function handleValidate() {
  emit("validate");
}

function handleExclude() {
  emit("exclude");
}

function handleSave(fields: Partial<EditableRecordFields>) {
  emit("correct", fields);
}

// Keyboard shortcuts: V for Valider, Enter for Suivant -- guarded against
// any focused input/textarea (same pattern PhotonDashGame.vue's own global
// onKeydown already uses), so typing into one of the detail card's own
// inline field editors never gets hijacked.
function onKeydown(e: KeyboardEvent) {
  if (!props.cursor) return;
  const target = e.target as HTMLElement | null;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable)
  ) {
    return;
  }
  if (e.key.toLowerCase() === "v") {
    e.preventDefault();
    handleValidate();
  } else if (e.key === "Enter") {
    e.preventDefault();
    emit("next");
  }
}

window.addEventListener("keydown", onKeydown);
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>
