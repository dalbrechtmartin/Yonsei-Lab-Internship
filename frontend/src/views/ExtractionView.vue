<template>
  <ToolActionsBar
    :tool-name="t('nav.extraction')"
    :show-export="false"
    :show-import="false"
  />

  <main
    class="animate-in fade-in flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto px-3 pb-4 duration-300 sm:px-4 lg:px-5"
  >
    <div
      class="mx-auto flex min-h-0 w-full max-w-[104rem] flex-1 flex-col gap-4 2xl:max-w-[150rem]"
    >
      <Card
        class="mt-4 flex min-h-130 flex-1 flex-col gap-0 overflow-hidden rounded-[14px] border-white/50 bg-card/80 p-0 shadow-2xl shadow-slate-900/5 backdrop-blur-xl"
      >
        <ExtractionStepper
          :steps="STEPS"
          :current-step="currentStep"
          :furthest-step="furthestStep"
          @select-step="goToStep"
        />

        <ExtractionDropStep
          v-if="currentStep === 1"
          v-model:model-choice="modelChoice"
          :resuming="resuming"
          @launch="handleLaunch"
        />

        <ExtractionRunningStep
          v-else-if="currentStep === 2 && jobStatus"
          :job="jobStatus"
          :entries="entries"
          :warning-count="warningCount"
          @game-expanded-change="onGameExpandedChange"
        />

        <ExtractionReviewStep
          v-else-if="currentStep === 3 && jobStatus"
          v-model:active-filter="activeFilter"
          :job-id="jobStatus.jobId"
          :records="filteredRecords"
          :all-records="records"
          :cursor="cursor"
          :counts="counts"
          :loading="recordsLoading"
          :sort-by-ref="sortByRef"
          :get-page-count="getPageCount"
          :get-page-labels="getPageLabels"
          :recompute-can-undo="!!recomputeUndo"
          :recompute-can-redo="!!recomputeRedo"
          @toggle-sort-by-ref="toggleSortByRef"
          @select-record="selectRecord"
          @validate="handleValidate"
          @correct="handleCorrect"
          @record-updated="replaceRecord"
          @recompute-applied="commitRecompute"
          @undo-recompute="handleUndoRecompute"
          @redo-recompute="handleRedoRecompute"
          @exclude="handleExclude"
          @previous="previousRecord"
          @next="nextRecord"
          @advance="goToExport"
        />

        <ExtractionExportStep
          v-else-if="currentStep === 4 && jobStatus && exportInfo"
          :job="jobStatus"
          :records="records"
          :default-export-name="exportInfo.defaultName"
          :partial="exportInfo.partial"
          @save-success="handleSaveSuccess"
          @save-error="handleSaveError"
          @visualize-error="handleVisualizeError"
        />
      </Card>

      <ExtractionSummaryInterstitial
        v-if="showSummary && jobStatus"
        :job="jobStatus"
        :warning-count="warningCount"
        @continue="handleSummaryContinue"
      />
    </div>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Card } from "@/components/ui/card";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import ExtractionStepper from "@/components/extraction/ExtractionStepper.vue";
import ExtractionDropStep from "@/components/extraction/ExtractionDropStep.vue";
import ExtractionRunningStep from "@/components/extraction/ExtractionRunningStep.vue";
import ExtractionSummaryInterstitial from "@/components/extraction/ExtractionSummaryInterstitial.vue";
import ExtractionReviewStep from "@/components/extraction/ExtractionReviewStep.vue";
import ExtractionExportStep from "@/components/extraction/ExtractionExportStep.vue";
import {
  QuotaExceededError,
  type EditableRecordFields,
  type ModelChoice,
} from "@/services/api";
import { useToastQueue } from "@/composables/useToastQueue";
import { useExtractionJob } from "@/composables/useExtractionJob";
import { useExtractionEventLog } from "@/composables/useExtractionEventLog";
import { useExtractionRecords } from "@/composables/useExtractionRecords";

const ERROR_STATUS_CLASS = "border-rose-500/20 bg-rose-500/12 text-rose-950";

const { t } = useI18n();

const STEPS = [
  { key: "drop", labelKey: "extraction.stepper.deposer" },
  { key: "running", labelKey: "extraction.stepper.extraire" },
  { key: "review", labelKey: "extraction.stepper.verifier" },
  { key: "export", labelKey: "extraction.stepper.exporter" },
];

const { setTransientStatus, clearStatus } = useToastQueue();

const currentStep = ref(1);
const furthestStep = ref(1);
const modelChoice = ref<ModelChoice>("default");
// True only for the brief window between mount and reattach() resolving --
// a resumed job always jumps past step 1 (see onMounted below), so this is
// a flash at most, not a real loading state for this screen.
const resuming = ref(false);
// Mirrors PhotonDashGame's own expanded state (see ExtractionRunningStep's
// game-expanded-change emit) so the summary interstitial can hold off
// popping over an active round -- see onGameExpandedChange below.
const gameExpanded = ref(false);
const pendingSummary = ref(false);
const showSummary = ref(false);

function resetWizard() {
  currentStep.value = 1;
  furthestStep.value = 1;
  showSummary.value = false;
  pendingSummary.value = false;
}

const { jobStatus, exportInfo, startExtraction, stopPolling, resetJob, reattach } =
  useExtractionJob({
    onNoData: () => {
      setTransientStatus("extraction.noData", ERROR_STATUS_CLASS);
      resetWizard();
    },
  });

const { entries, warningCount, reset: resetEventLog } = useExtractionEventLog(jobStatus);

const {
  records,
  loading: recordsLoading,
  activeFilter,
  sortByRef,
  toggleSortByRef,
  filteredRecords,
  counts,
  cursor,
  loadForJob,
  selectRecord,
  next: nextRecord,
  previous: previousRecord,
  updateReviewStatus,
  replaceRecord,
  getPageCount,
  getPageLabels,
  recomputeUndo,
  recomputeRedo,
  commitRecompute,
  undoRecompute,
  redoRecompute,
  reset: resetRecords,
} = useExtractionRecords();

function goToStep(step: number) {
  if (step <= furthestStep.value) currentStep.value = step;
}

async function handleLaunch(files: File[]) {
  clearStatus();
  resetRecords();
  resetEventLog();
  showSummary.value = false;
  pendingSummary.value = false;
  try {
    await startExtraction(files, modelChoice.value);
    // A job that finished (or was found empty) before this resolves already
    // ran its own terminal handling above -- onNoData reset the wizard back
    // to step 1, and forcing step 2 here would strand it on a blank screen
    // (jobStatus is null once resetJob has run).
    if (jobStatus.value) {
      currentStep.value = 2;
      furthestStep.value = 2;
    }
  } catch (error) {
    setTransientStatus(
      error instanceof QuotaExceededError
        ? "extraction.quotaExceeded"
        : "extraction.error",
      ERROR_STATUS_CLASS,
    );
  }
}

function revealSummary() {
  if (jobStatus.value) loadForJob(jobStatus.value);
  showSummary.value = true;
}

/** The single integration point with PhotonDashGame.vue (via
 * ExtractionRunningStep's forwarded emit) -- when a round is active while
 * extraction finishes, the summary interstitial waits for it to fold
 * rather than covering it mid-play. */
function onGameExpandedChange(expanded: boolean) {
  gameExpanded.value = expanded;
  if (!expanded && pendingSummary.value) {
    pendingSummary.value = false;
    revealSummary();
  }
}

watch(exportInfo, (info, prev) => {
  if (info && !prev && currentStep.value === 2) {
    if (gameExpanded.value) {
      pendingSummary.value = true;
    } else {
      revealSummary();
    }
  }
});

function handleSummaryContinue() {
  showSummary.value = false;
  currentStep.value = 3;
  if (furthestStep.value < 3) furthestStep.value = 3;
}

function goToExport() {
  if (furthestStep.value < 4) furthestStep.value = 4;
  currentStep.value = 4;
}

async function handleValidate() {
  const record = cursor.value;
  if (!record) return;
  try {
    await updateReviewStatus(record, "Approve (Manual)");
    nextRecord();
  } catch (error) {
    console.error("Failed to validate record:", error);
    setTransientStatus("extraction.error", ERROR_STATUS_CLASS);
  }
}

async function handleExclude() {
  const record = cursor.value;
  if (!record) return;
  try {
    await updateReviewStatus(record, "Exclude");
  } catch (error) {
    console.error("Failed to exclude record:", error);
    setTransientStatus("extraction.error", ERROR_STATUS_CLASS);
  }
}

async function handleCorrect(fields: Partial<EditableRecordFields>) {
  const record = cursor.value;
  if (!record) return;
  try {
    await updateReviewStatus(record, "Approve (Manual)", fields);
  } catch (error) {
    console.error("Failed to save correction:", error);
    setTransientStatus("extraction.error", ERROR_STATUS_CLASS);
  }
}

async function handleUndoRecompute() {
  try {
    await undoRecompute();
  } catch (error) {
    console.error("Failed to undo recompute:", error);
    setTransientStatus("extraction.error", ERROR_STATUS_CLASS);
  }
}

async function handleRedoRecompute() {
  try {
    await redoRecompute();
  } catch (error) {
    console.error("Failed to redo recompute:", error);
    setTransientStatus("extraction.error", ERROR_STATUS_CLASS);
  }
}

function handleSaveSuccess(partial: boolean) {
  setTransientStatus(
    partial ? "extraction.partialSuccess" : "extraction.success",
    partial
      ? "border-amber-500/20 bg-amber-500/12 text-amber-950"
      : "border-emerald-500/20 bg-emerald-500/12 text-emerald-950",
  );
  resetJob();
  resetRecords();
  resetEventLog();
  resetWizard();
}

function handleSaveError() {
  setTransientStatus("extraction.error", ERROR_STATUS_CLASS);
}

function handleVisualizeError() {
  setTransientStatus("extraction.export.visualizeError", ERROR_STATUS_CLASS);
}

onMounted(async () => {
  resuming.value = true;
  try {
    const outcome = await reattach();
    if (outcome === "resumed-running") {
      currentStep.value = 2;
      furthestStep.value = 2;
      setTransientStatus(
        "extraction.drop.resumedToast",
        "border-primary/20 bg-primary/10 text-primary",
      );
    } else if (outcome === "resumed-done") {
      currentStep.value = 3;
      furthestStep.value = 3;
      setTransientStatus(
        "extraction.drop.resumedToast",
        "border-primary/20 bg-primary/10 text-primary",
      );
      if (jobStatus.value) await loadForJob(jobStatus.value);
    }
  } finally {
    resuming.value = false;
  }
});

onUnmounted(() => {
  stopPolling();
});
</script>
