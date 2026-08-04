<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex w-full min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left text-[11.5px] font-medium transition-colors"
        :class="
          open
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-secondary/25 bg-card text-ink hover:border-primary/40 hover:bg-primary/5'
        "
      >
        <span class="min-w-0 flex-1 truncate">{{ label }}</span>
        <span class="shrink-0" :class="open ? 'text-primary-foreground/70' : 'text-muted-foreground'">({{ values.length }})</span>
        <ChevronDown class="size-3 shrink-0 transition-transform duration-150" :class="open ? 'rotate-180' : ''" />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="w-52 p-2.5">
      <div class="mb-1.5 flex items-center justify-between gap-2">
        <span class="text-[10px] font-bold tracking-[0.08em] text-secondary uppercase">{{ label }}</span>
        <button type="button" class="shrink-0 text-[10px] font-medium text-primary hover:underline" @click="toggleAll">
          {{ allSelected ? t("fomcharts.filters.deselectAll") : t("fomcharts.filters.selectAll") }}
        </button>
      </div>
      <div class="flex max-h-56 flex-col gap-0.5 overflow-x-hidden overflow-y-auto">
        <label
          v-for="val in values"
          :key="val"
          class="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs hover:bg-secondary/8"
        >
          <Checkbox :model-value="selected.includes(val)" @update:model-value="toggle(val)" />
          <span class="min-w-0 flex-1 truncate text-ink">{{ val }}</span>
          <span class="text-[10.5px] text-muted-foreground">{{ counts[val] ?? 0 }}</span>
        </label>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronDown } from "@lucide/vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

const { t } = useI18n();

const props = defineProps<{
  label: string;
  values: string[];
  counts: Record<string, number>;
}>();

const selected = defineModel<string[]>("selected", { default: () => [] });
const open = ref(false);

const toggle = (val: string) => {
  selected.value = selected.value.includes(val)
    ? selected.value.filter((v) => v !== val)
    : [...selected.value, val];
};

const allSelected = computed(() => props.values.length > 0 && selected.value.length === props.values.length);
const toggleAll = () => {
  selected.value = allSelected.value ? [] : [...props.values];
};
</script>
