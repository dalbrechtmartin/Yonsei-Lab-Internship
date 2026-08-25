<template>
  <div
    class="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-5 sm:p-7 md:flex-row md:items-stretch md:gap-8"
  >
    <div class="flex min-h-0 flex-col md:w-2/3">
      <p class="shrink-0 text-xs uppercase tracking-[0.3em] text-secondary">
        {{ t("view.extraction.batchExtraction.legend") }}
      </p>
      <h2 class="mt-2 shrink-0 text-2xl font-semibold text-ink">
        {{ t("view.extraction.batchExtraction.title") }}
      </h2>
      <p class="mt-2 shrink-0 text-sm leading-6 text-secondary">
        {{ t("view.extraction.batchExtraction.description") }}
      </p>

      <!-- One adaptive box instead of a dropzone + a separate list, always
           the same height (flex-1, fills the remaining column space)
           whether empty or full -- only its content changes: the drop
           prompt centered when empty, the card grid top-aligned once files
           are staged. Still the same drag/drop + click-to-browse target
           throughout (see FileDropzone's slot), so adding more files never
           means finding a different spot to drop onto, and dropping the
           first file never resizes the box. Each card's own remove button
           stops propagation so removing a file doesn't also reopen the
           file picker. -->
      <FileDropzone
        compact
        :tight-padding="staged.length > 0"
        accept=".pdf"
        multiple
        class="mt-4 flex min-h-0 flex-1 flex-col"
        :class="staged.length ? '' : 'items-center justify-center'"
        :title="t('extraction.dropzone.title')"
        :subtitle="t('extraction.dropzone.subtitle')"
        @files-selected="handleFilesSelected"
      >
        <template v-if="staged.length" #default>
          <div
            class="grid w-full grid-cols-1 gap-2.5 sm:grid-cols-2 md:min-h-0 md:flex-1 md:grid-rows-5"
            @dragenter="onGridDragOver"
            @dragover="onGridDragOver"
            @drop="onGridDrop"
          >
            <ExtractionStagedFileCard
              v-for="(entry, index) in staged"
              :key="`${entry.file.name}-${entry.file.size}`"
              :order="index + 1"
              :filename="entry.file.name"
              :size-bytes="entry.file.size"
              :page-count="entry.pageCount"
              :loading="entry.counting"
              :dragging="dragIndex === index"
              :drag-over="dragOverIndex === index && dragIndex !== null && dragIndex !== index"
              @remove="removeFile(entry.file)"
              @dragstart="dragIndex = index"
              @dragend="handleDragEnd"
              @dragover-card="dragOverIndex = index"
              @drop-here="handleDrop(index)"
            />
            <div
              v-for="n in MAX_FILES - staged.length"
              :key="`empty-${n}`"
              class="hidden items-center justify-center gap-1.5 rounded-xl border border-dashed border-secondary/20 text-xs text-secondary/50 md:flex"
            >
              <Plus class="size-3.5" />
              {{ t("extraction.drop.addFile") }}
            </div>
          </div>
        </template>
      </FileDropzone>
    </div>

    <div class="h-px w-full shrink-0 bg-secondary/10 md:h-auto md:w-px" />

    <div class="flex flex-col gap-3 md:w-1/3 md:shrink-0">
      <ModelSelector v-model:model-choice="modelChoiceModel" />

      <div class="mt-auto flex flex-col gap-2 pt-3">
        <p
          v-if="resuming"
          class="flex items-center gap-1.5 text-xs text-secondary"
        >
          <Loader2 class="size-3 animate-spin" />
          {{ t("extraction.drop.resuming") }}
        </p>
        <p v-else class="text-xs text-secondary">
          {{
            stagedFiles.length
              ? t("extraction.drop.stagedCount", { count: stagedFiles.length }) +
                " · " +
                t("extraction.drop.etaEstimate", { eta: etaEstimate }) +
                (atMaxFiles ? " · " + t("extraction.drop.maxReached") : "")
              : t("extraction.drop.empty")
          }}
        </p>
        <Button
          type="button"
          :disabled="!stagedFiles.length || resuming"
          @click="launch"
        >
          {{ t("extraction.drop.launch") }}
        </Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Loader2, Plus } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import ModelSelector from "@/components/extraction/ModelSelector.vue";
import ExtractionStagedFileCard from "@/components/extraction/ExtractionStagedFileCard.vue";
import { apiService, type ModelChoice } from "@/services/api";
import { estimateFileDurationMs, formatDuration } from "@/utils/extractionEta";
import { isReorderDrag } from "@/utils/dragReorder";

withDefaults(
  defineProps<{
    /** True while useExtractionJob is reattaching to a stored job on
     * mount -- this screen is a brief flash at most (a resumed job always
     * jumps past it, see ExtractionView.vue), so this just holds off
     * interaction rather than building a dedicated loading layout. */
    resuming?: boolean;
  }>(),
  { resuming: false },
);

const emit = defineEmits<{
  launch: [files: File[]];
}>();

const { t } = useI18n();

const modelChoiceModel = defineModel<ModelChoice>("modelChoice", {
  default: "default",
});

interface StagedFile {
  file: File;
  /** null while still counting, or once counting settles on "couldn't be
   * read" -- purely informational for the file card, so it never blocks
   * launching. */
  pageCount: number | null;
  counting: boolean;
}

// Files are staged locally rather than uploaded immediately on drop -- the
// mockup shows a removable file list + an ETA estimate next to an explicit
// "Lancer l'extraction" button, which only makes sense once there's
// something to review before committing. Re-selecting via the dropzone
// (or another "browse") adds to this set rather than replacing it, same as
// a user would expect from a normal multi-file upload widget; an exact
// name+size duplicate is skipped rather than staged twice.
// Matches the dropzone's own "jusqu'à 10 fichiers" copy.
const MAX_FILES = 10;

const staged = ref<StagedFile[]>([]);
const stagedFiles = computed(() => staged.value.map((s) => s.file));
const atMaxFiles = computed(() => staged.value.length >= MAX_FILES);

const etaEstimate = computed(() =>
  formatDuration(
    staged.value.reduce(
      (total, entry) => total + estimateFileDurationMs(entry.pageCount),
      0,
    ),
  ),
);

function fileKey(file: File): string {
  return `${file.name}:${file.size}`;
}

const handleFilesSelected = async (files: File[]) => {
  const seen = new Set(staged.value.map((s) => fileKey(s.file)));
  const deduped = files.filter((file) => {
    const key = fileKey(file);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const availableSlots = MAX_FILES - staged.value.length;
  const newFiles = deduped.slice(0, Math.max(0, availableSlots));
  if (!newFiles.length) return;

  staged.value = [
    ...staged.value,
    ...newFiles.map((file) => ({ file, pageCount: null, counting: true })),
  ];

  // Looked up by file reference (not index) once the response lands --
  // staged.value may have been reordered/pruned by a remove in the
  // meantime, and a removed file's lookup simply comes back empty.
  function markSettled(file: File, pageCount: number | null) {
    const target = staged.value.find((s) => s.file === file);
    if (target) {
      target.pageCount = pageCount;
      target.counting = false;
    }
  }

  try {
    const counts = await apiService.getPdfPageCounts(newFiles);
    newFiles.forEach((file, i) => markSettled(file, counts[i] ?? null));
  } catch (error) {
    console.error("Failed to count PDF pages:", error);
    for (const file of newFiles) markSettled(file, null);
  }
};

const removeFile = (file: File) => {
  staged.value = staged.value.filter((s) => s.file !== file);
};

// Files process sequentially in this array's order (see jobs.py), so
// dragging a card to reorder it directly controls which PDF gets analyzed
// first. dragIndex/dragOverIndex are set from ExtractionStagedFileCard's
// native HTML5 drag events (see its dragstart/dragover-card/drop-here
// emits) -- kept here rather than in the card itself since reordering needs
// the whole array, not just one card's local state.
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const handleDragEnd = () => {
  dragIndex.value = null;
  dragOverIndex.value = null;
};

const handleDrop = (targetIndex: number) => {
  const from = dragIndex.value;
  if (from === null || from === targetIndex) {
    handleDragEnd();
    return;
  }
  const next = [...staged.value];
  const [moved] = next.splice(from, 1);
  next.splice(targetIndex, 0, moved);
  staged.value = next;
  handleDragEnd();
};

// Fallback for the grid area a card's own handlers don't cover -- the gaps
// between cells and the ghost "add more" placeholders. Without this, a
// reorder drag whose pointer passes over one of those on the way to a card
// (or is dropped there outright) would bubble up to FileDropzone and get
// stuck showing its own "drop files here" highlight, since that drop event
// never reaches FileDropzone's handler to clear it (see the cards'
// onDrop/onDragOver, which stop propagation for the same reason). Dropping
// here (not on a specific card) just cancels the reorder.
const onGridDragOver = (event: DragEvent) => {
  if (!isReorderDrag(event)) return;
  event.preventDefault();
  event.stopPropagation();
};

const onGridDrop = (event: DragEvent) => {
  if (!isReorderDrag(event)) return;
  event.preventDefault();
  event.stopPropagation();
  handleDragEnd();
};

const launch = () => {
  if (!staged.value.length) return;
  emit("launch", stagedFiles.value);
};
</script>
