<template>
  <div
    class="sticky top-16 z-10 w-full flex justify-between items-center px-6 py-2 border-b border-secondary/10 bg-card/80 backdrop-blur-xl"
  >
    <span class="text-sm font-semibold tracking-wide text-ink">{{
      toolName
    }}</span>

    <div class="flex items-center gap-2">
      <Button
        v-if="showImport"
        type="button"
        variant="outline"
        size="xs"
        class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30"
        @click="$emit('import')"
      >
        <Upload />
        {{ $t("actions.import") }}
      </Button>

      <Button
        v-if="showExport"
        type="button"
        variant="outline"
        size="xs"
        :disabled="exportDisabled"
        class="border-secondary/20 bg-background/80 text-ink hover:bg-primary/8 hover:border-primary/30"
        @click="$emit('export')"
      >
        <Download />
        {{ $t("actions.export") }}
      </Button>

      <LanguageSelector />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Upload, Download } from "@lucide/vue";
import { Button } from "@/components/ui/button";
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
</script>
