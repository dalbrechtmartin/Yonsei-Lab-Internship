<template>
  <div
    class="w-full border-2 border-dashed rounded-2xl bg-card/85 text-center transition cursor-pointer backdrop-blur-sm"
    :class="[
      compact ? 'p-8' : 'max-w-lg p-12',
      isDragging
        ? 'border-primary bg-primary/8'
        : 'border-secondary/25 hover:border-primary hover:bg-background/80',
    ]"
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <p :class="compact ? 'text-base font-semibold text-ink' : 'text-ink font-semibold text-lg'">
      {{ title ?? $t("dropzone.title") }}
    </p>
    <p :class="compact ? 'text-sm text-secondary mt-1.5' : 'text-sm text-secondary mt-2'">
      {{ subtitle ?? $t("dropzone.subtitle") }}
    </p>

    <input
      type="file"
      ref="fileInput"
      class="hidden"
      :accept="accept"
      :multiple="multiple"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    accept?: string;
    multiple?: boolean;
    title?: string | null;
    subtitle?: string | null;
    /** Denser padding/type scale for embedding inline within a card
     * (e.g. between hero copy and info badges) instead of standing
     * alone as a big centered drop target. */
    compact?: boolean;
  }>(),
  {
    accept: ".xlsx, .xls",
    multiple: false,
    title: null,
    subtitle: null,
    compact: false,
  },
);

// Always emits an array so consumers have one shape to handle, whether
// they asked for a single file (visualization tool) or several (PDF
// extraction). Single-file consumers just read files[0].
const emit = defineEmits<{
  "files-selected": [files: File[]];
}>();

const isDragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

const triggerFileInput = () => fileInput.value?.click();

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const files = Array.from(target.files ?? []);
  if (files.length) emit("files-selected", props.multiple ? files : [files[0]]);
};

const handleDrop = (event: DragEvent) => {
  isDragging.value = false;
  const files = Array.from(event.dataTransfer?.files ?? []);
  if (files.length) emit("files-selected", props.multiple ? files : [files[0]]);
};

defineExpose({
  triggerFileInput,
});
</script>
