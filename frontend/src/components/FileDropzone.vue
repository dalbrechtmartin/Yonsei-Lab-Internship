<template>
  <div
    class="w-full max-w-lg p-12 border-2 border-dashed rounded-xl bg-white text-center transition cursor-pointer"
    :class="
      isDragging
        ? 'border-blue-500 bg-blue-50'
        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
    "
    @dragover.prevent="isDragging = true"
    @dragleave.prevent="isDragging = false"
    @drop.prevent="handleDrop"
    @click="triggerFileInput"
  >
    <p class="text-gray-600 font-medium text-lg">
      {{ $t("dropzone.title") }}
    </p>
    <p class="text-sm text-gray-400 mt-2">{{ $t("dropzone.subtitle") }}</p>

    <input
      type="file"
      ref="fileInput"
      class="hidden"
      accept=".xlsx, .xls"
      @change="handleFileSelect"
    />
  </div>
</template>

<script setup>
import { ref } from "vue";

const emit = defineEmits(["file-selected"]);

const isDragging = ref(false);
const fileInput = ref(null);

const triggerFileInput = () => fileInput.value.click();

const handleFileSelect = (event) => {
  const file = event.target.files[0];
  if (file) emit("file-selected", file);
};

const handleDrop = (event) => {
  isDragging.value = false;
  const file = event.dataTransfer.files[0];
  if (file) emit("file-selected", file);
};
</script>
