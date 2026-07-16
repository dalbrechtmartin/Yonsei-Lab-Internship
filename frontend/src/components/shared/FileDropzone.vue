<template>
  <div
    class="w-full max-w-lg p-12 border-2 border-dashed rounded-2xl bg-card/85 text-center transition cursor-pointer shadow-xl shadow-slate-900/5 backdrop-blur-sm"
    :class="
      isDragging
        ? 'border-primary bg-primary/8 shadow-primary/10'
        : 'border-secondary/25 hover:border-primary hover:bg-background/80'
    "
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <p class="text-ink font-semibold text-lg">
      {{ title ?? $t("dropzone.title") }}
    </p>
    <p class="text-sm text-secondary mt-2">
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
  }>(),
  {
    accept: ".xlsx, .xls",
    multiple: false,
    title: null,
    subtitle: null,
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
