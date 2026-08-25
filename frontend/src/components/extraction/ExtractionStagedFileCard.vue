<template>
  <div
    draggable="true"
    class="flex h-full cursor-grab items-center gap-3 rounded-xl border bg-card/70 px-3.5 py-3 text-left transition active:cursor-grabbing"
    :class="[
      dragOver ? 'border-primary bg-primary/5' : 'border-secondary/15',
      dragging ? 'opacity-40' : '',
    ]"
    @dragstart="onDragStart"
    @dragend="emit('dragend')"
    @dragenter="onDragOver"
    @dragover="onDragOver"
    @drop="onDrop"
  >
    <GripVertical class="size-3.5 shrink-0 text-secondary/40" />
    <span
      class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary"
    >
      {{ order }}
    </span>
    <span
      class="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
    >
      <FileText class="size-4.5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-medium text-ink">{{ filename }}</p>
      <p class="truncate text-xs text-secondary">
        {{ pagesLabel }} · {{ formatFileSize(sizeBytes) }} · {{ etaLabel }}
      </p>
    </div>
    <button
      type="button"
      class="shrink-0 text-secondary transition-colors hover:text-rose-600"
      :aria-label="t('extraction.drop.removeFileAria', { filename })"
      @click.stop="emit('remove')"
    >
      <X class="size-3.5" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { FileText, GripVertical, X } from "@lucide/vue";
import { formatFileSize } from "@/utils/formatFileSize";
import { estimateFileDurationMs, formatDuration } from "@/utils/extractionEta";
import { REORDER_MIME, isReorderDrag } from "@/utils/dragReorder";

const props = defineProps<{
  filename: string;
  sizeBytes: number;
  /** null while the page count is still loading or couldn't be read. */
  pageCount: number | null;
  loading: boolean;
  /** 1-based position in the batch -- files are processed in this order. */
  order: number;
  /** True while this card is the one currently being dragged. */
  dragging: boolean;
  /** True while another card is being dragged over this one. */
  dragOver: boolean;
}>();

const emit = defineEmits<{
  remove: [];
  dragstart: [];
  dragend: [];
  "dragover-card": [];
  "drop-here": [];
}>();

const { t } = useI18n();

function onDragStart(event: DragEvent) {
  event.dataTransfer?.setData(REORDER_MIME, "1");
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  emit("dragstart");
}

function onDragOver(event: DragEvent) {
  if (!isReorderDrag(event)) return;
  event.preventDefault();
  event.stopPropagation();
  emit("dragover-card");
}

function onDrop(event: DragEvent) {
  if (!isReorderDrag(event)) return;
  event.preventDefault();
  event.stopPropagation();
  emit("drop-here");
}

const pagesLabel = computed(() => {
  if (props.loading) return "…";
  if (props.pageCount == null) return "—";
  return t("extraction.drop.pages", { count: props.pageCount });
});

const etaLabel = computed(() => {
  if (props.loading) return "…";
  return t("extraction.drop.fileEta", {
    eta: formatDuration(estimateFileDurationMs(props.pageCount)),
  });
});
</script>
