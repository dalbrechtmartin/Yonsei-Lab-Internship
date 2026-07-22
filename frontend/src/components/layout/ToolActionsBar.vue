<template>
  <div
    class="sticky top-16 z-10 w-full flex justify-between items-center px-6 py-2 border-b border-secondary/10 bg-card/80 backdrop-blur-xl"
  >
    <span class="text-sm font-semibold tracking-wide text-ink">{{
      toolName
    }}</span>

    <div class="flex items-center gap-2">
      <button
        v-if="showImport"
        type="button"
        class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-secondary/20 bg-background/80 text-ink transition hover:bg-primary/8 hover:border-primary/30"
        @click="$emit('import')"
      >
        <UploadIcon />
        {{ $t("actions.import") }}
      </button>

      <button
        v-if="showExport"
        type="button"
        :disabled="exportDisabled"
        class="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-secondary/20 bg-background/80 text-ink transition hover:bg-primary/8 hover:border-primary/30 disabled:cursor-not-allowed disabled:opacity-40"
        @click="$emit('export')"
      >
        <DownloadIcon />
        {{ $t("actions.export") }}
      </button>

      <LanguageSelector />
    </div>
  </div>
</template>

<script setup lang="ts">
import LanguageSelector from "./LanguageSelector.vue";

withDefaults(
  defineProps<{
    toolName: string;
    showImport?: boolean;
    showExport?: boolean;
    exportDisabled?: boolean;
  }>(),
  {
    showImport: true,
    showExport: true,
    exportDisabled: false,
  },
);
defineEmits<{
  import: [];
  export: [];
}>();

// Tiny inline icons so this component has zero extra dependency until
// shadcn-vue's Button/lucide icons are wired in.
const UploadIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 8 5-5 5 5"/><path d="M5 21h14"/></svg>`,
};
const DownloadIcon = {
  template: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>`,
};
</script>
