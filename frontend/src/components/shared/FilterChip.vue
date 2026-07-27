<template>
  <span
    class="lv-chip inline-flex max-w-full items-center gap-0 rounded-md py-1 pr-1 pl-2 text-xs font-medium"
    :class="
      active
        ? 'border border-secondary/20 bg-card text-ink'
        : 'border border-dashed border-secondary/30 text-muted-foreground'
    "
  >
    <span class="truncate whitespace-nowrap">{{ label }}</span>
    <button
      type="button"
      class="ml-1 flex size-4 shrink-0 items-center justify-center rounded"
      :class="active ? 'text-muted-foreground hover:bg-secondary/10' : 'text-primary hover:bg-primary/10'"
      :aria-label="active ? t('fomcharts.filters.remove', { label }) : t('fomcharts.filters.add', { label })"
      @click="$emit('toggle')"
    >
      <X v-if="active" class="size-2.5" />
      <Plus v-else class="size-2.5" />
    </button>
  </span>
</template>

<script setup lang="ts">
import { Plus, X } from "@lucide/vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

defineProps<{
  label: string;
  active: boolean;
}>();
defineEmits<{
  toggle: [];
}>();
</script>
