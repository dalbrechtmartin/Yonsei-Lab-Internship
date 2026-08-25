<template>
  <div
    class="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden"
  >
    <div
      class="flex min-h-0 min-w-0 flex-1 flex-col gap-3 p-5 sm:p-7 lg:min-w-90 lg:overflow-y-auto"
    >
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
        @select="handleSelect"
      />

      <ExtractionReviewEditPanel
        v-if="editing && cursor"
        :record="cursor"
        @save="handleSave"
        @cancel="editing = false"
      />
      <template v-else>
        <ExtractionReviewCallout
          :record="cursor"
          @select-source="activeSource = $event"
        />
        <ExtractionReviewActions
          :disabled="!cursor || loading"
          @validate="handleValidate"
          @correct="editing = true"
          @exclude="handleExclude"
          @previous="emit('previous')"
          @next="emit('next')"
        />
      </template>

      <div class="flex justify-end pt-1">
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

    <div class="hidden w-px shrink-0 bg-secondary/10 lg:block" />

    <div
      class="flex min-h-105 flex-[1.3] flex-col p-5 sm:p-7 lg:min-h-0 lg:min-w-120"
    >
      <ExtractionPdfViewer
        v-if="cursor"
        :job-id="jobId"
        :file-id="cursor.fileId"
        :filename="cursor.filename"
        :location="pdfLocation"
        :evidence="pdfEvidence"
        :get-page-count="getPageCount"
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
import { ArrowRight } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import type { EditableRecordFields, ExtractionRecord } from "@/services/api";
import {
  recordKey,
  type ReviewFilter,
} from "@/composables/useExtractionRecords";
import {
  parseEvidenceSources,
  type EvidenceSource,
} from "@/utils/parseLocation";
import ExtractionReviewTabs from "@/components/extraction/ExtractionReviewTabs.vue";
import ExtractionReviewTable from "@/components/extraction/ExtractionReviewTable.vue";
import ExtractionReviewCallout from "@/components/extraction/ExtractionReviewCallout.vue";
import ExtractionReviewActions from "@/components/extraction/ExtractionReviewActions.vue";
import ExtractionReviewEditPanel from "@/components/extraction/ExtractionReviewEditPanel.vue";
import ExtractionPdfViewer from "@/components/extraction/ExtractionPdfViewer.vue";

const props = defineProps<{
  jobId: string;
  /** Already filtered by activeFilter (see useExtractionRecords.filteredRecords)
   * -- this component composes the table/tabs/actions, it doesn't re-filter. */
  records: ExtractionRecord[];
  cursor: ExtractionRecord | null;
  activeFilter: ReviewFilter;
  /** Tab counts, computed off the full unfiltered list. */
  counts: { all: number; toConfirm: number; excluded: number };
  loading: boolean;
  getPageCount: (fileId: string) => Promise<number>;
}>();

const emit = defineEmits<{
  "update:activeFilter": [filter: ReviewFilter];
  "select-record": [record: ExtractionRecord];
  validate: [];
  correct: [fields: Partial<EditableRecordFields>];
  exclude: [];
  previous: [];
  next: [];
  /** "Continuer vers l'export" -- an explicit action rather than an
   * automatic unlock, since review has no hard "done" condition (a
   * researcher may reasonably export without touching every flagged row). */
  advance: [];
}>();

const { t } = useI18n();

const editing = ref(false);

const selectedIndex = computed(() =>
  props.cursor ? `${props.cursor.fileId}:${props.cursor.index}` : null,
);

// Which of the (possibly several) evidence sources the PDF viewer should
// currently show. Defaults to the first source; a click on any source in
// the callout overrides it. Reset on the cursor's stable identity, not on
// cursor itself -- cursor gets a new object reference on every Valider/
// Corriger/Exclure PATCH even while staying on the same logical record, and
// resetting on that would snap the viewer back to source 1 on every save.
const activeSource = ref<EvidenceSource | null>(null);
watch(
  () => (props.cursor ? recordKey(props.cursor) : null),
  () => {
    activeSource.value = null;
  },
);

const defaultSource = computed(
  () =>
    parseEvidenceSources(
      props.cursor?.evidence ?? null,
      props.cursor?.location ?? null,
    )[0] ?? null,
);
// Never pass the raw cursor.location/cursor.evidence straight through: once
// a record has 2+ sources those are the whole "[...]"-joined strings, and
// searching the PDF's text layer for that joined string would never match
// anything real -- the viewer needs one source's own quote/location.
const pdfLocation = computed(
  () => (activeSource.value ?? defaultSource.value)?.location ?? null,
);
const pdfEvidence = computed(
  () => (activeSource.value ?? defaultSource.value)?.quote ?? null,
);

const cursorPosition = computed(() => {
  if (!props.cursor) return 0;
  return props.records.findIndex((r) => r === props.cursor) + 1;
});

function handleSelect(record: ExtractionRecord) {
  editing.value = false;
  emit("select-record", record);
}

function handleValidate() {
  editing.value = false;
  emit("validate");
}

function handleExclude() {
  editing.value = false;
  emit("exclude");
}

function handleSave(fields: Partial<EditableRecordFields>) {
  editing.value = false;
  emit("correct", fields);
}

// Keyboard shortcuts: V for Valider, Enter for Suivant -- same
// input/textarea guard PhotonDashGame.vue's own global onKeydown already
// uses, so typing in the "Corriger" form never gets hijacked.
function onKeydown(e: KeyboardEvent) {
  if (editing.value || !props.cursor) return;
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
