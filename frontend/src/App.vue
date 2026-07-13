<template>
  <div class="min-h-screen bg-gray-50 flex flex-col">
    <AppNavbar />

    <main class="grow flex flex-col items-center p-10">
      <FileDropzone @file-selected="handleUpload" />

      <div
        v-if="statusKey"
        class="mt-6 p-4 rounded-lg font-medium shadow-sm"
        :class="statusClass"
      >
        {{ translatedStatus }}
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import AppNavbar from "./components/AppNavbar.vue";
import FileDropzone from "./components/FileDropzone.vue";
import { apiService } from "./services/api";

const { t } = useI18n();
const statusKey = ref("");
const statusClass = ref("");

const translatedStatus = computed(() => {
  return statusKey.value ? t(statusKey.value) : "";
});

const handleUpload = async (file) => {
  statusKey.value = "status.uploading";
  statusClass.value = "bg-yellow-100 text-yellow-800";

  try {
    const data = await apiService.uploadExcel(file);
    statusKey.value = "status.success";
    statusClass.value = "bg-green-100 text-green-800";
  } catch (error) {
    statusKey.value = "status.error";
    statusClass.value = "bg-red-100 text-red-800";
  }
};
</script>
