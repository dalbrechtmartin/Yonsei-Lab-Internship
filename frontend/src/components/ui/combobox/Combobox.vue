<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex w-full min-w-0 items-center justify-between gap-1.5 rounded-md border border-input bg-card px-2.5 py-1.5 text-left text-sm shadow-xs transition-colors hover:border-primary/40"
        :class="open ? 'border-primary' : ''"
      >
        <span
          class="min-w-0 flex-1 truncate"
          :class="modelValue ? 'text-ink' : 'text-muted-foreground'"
        >
          {{ modelValue || placeholder }}
        </span>
        <ChevronDown
          class="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150"
          :class="open ? 'rotate-180' : ''"
        />
      </button>
    </PopoverTrigger>
    <PopoverContent align="start" class="z-50 w-72 p-0">
      <div class="border-b border-border p-1.5">
        <Input
          ref="queryInputRef"
          v-model="query"
          :placeholder="searchPlaceholder ?? placeholder"
          class="h-8 text-sm"
          @keydown.enter.prevent="commitQuery"
          @keydown.esc="open = false"
        />
      </div>
      <div class="max-h-48 overflow-x-hidden overflow-y-auto p-1">
        <button
          v-for="opt in filteredOptions"
          :key="opt"
          type="button"
          class="flex w-full items-center rounded px-2 py-1.5 text-left text-sm hover:bg-secondary/10"
          :class="
            opt === modelValue
              ? 'bg-primary/10 font-medium text-primary'
              : 'text-ink'
          "
          @click="select(opt)"
        >
          <span class="min-w-0 flex-1 truncate">{{ opt }}</span>
        </button>
        <p
          v-if="filteredOptions.length === 0 && !showCreateOption"
          class="px-2 py-1.5 text-xs text-muted-foreground"
        >
          {{ emptyLabel }}
        </p>
        <button
          v-if="allowCreate && showCreateOption"
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-left text-sm text-primary hover:bg-primary/8"
          @click="commitQuery"
        >
          <Plus class="size-3.5 shrink-0" />
          <span class="min-w-0 flex-1 truncate"
            >{{ createLabel }} "{{ query.trim() }}"</span
          >
        </button>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { ChevronDown, Plus } from "@lucide/vue";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";

/**
 * Single-value creatable combobox: pick one of `options` (existing values
 * seen elsewhere in the dataset) or type free text to use as a brand-new
 * value. Unlike Select, the typed text is always a valid value on its own --
 * this is the "propose existing values, or let me add my own" building block
 * used across the Add Point dialog's structure/material fields, in place of
 * unconstrained text inputs that let a near-duplicate category slip in
 * (e.g. "SiO2" vs "SiO₂") purely from a placeholder hint.
 */
const props = withDefaults(
  defineProps<{
    options: string[];
    placeholder: string;
    searchPlaceholder?: string;
    createLabel: string;
    emptyLabel: string;
    /** false makes this a closed pick-only list (no "add new" row) -- used
     * where the value must come from a smaller, already-chosen set (see
     * LayerStructureField, which only offers this point's own Base
     * Materials, not the whole dataset's). */
    allowCreate?: boolean;
  }>(),
  { allowCreate: true },
);

const modelValue = defineModel<string>({ default: "" });

const open = ref(false);
const query = ref("");
const queryInputRef = ref<InstanceType<typeof Input> | null>(null);

// Search always starts blank on open (not pre-filled with the current value)
// so re-opening to change an already-picked value doesn't require clearing
// text first -- the current pick is still visible via the highlighted row.
watch(open, (isOpen) => {
  if (isOpen) {
    query.value = "";
    nextTick(() => queryInputRef.value?.$el?.focus?.());
  }
});

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return props.options;
  return props.options.filter((opt) => opt.toLowerCase().includes(q));
});

// Offered whenever the typed text isn't just re-spelling an existing option
// with different casing -- prevents "Au" and "AU" from silently becoming two
// distinct categories.
const showCreateOption = computed(() => {
  const q = query.value.trim();
  if (!q) return false;
  return !props.options.some((opt) => opt.toLowerCase() === q.toLowerCase());
});

const select = (value: string) => {
  modelValue.value = value;
  open.value = false;
};

const commitQuery = () => {
  const q = query.value.trim();
  if (!q) return;
  const existing = props.options.find(
    (opt) => opt.toLowerCase() === q.toLowerCase(),
  );
  if (!existing && !props.allowCreate) return;
  select(existing ?? q);
};
</script>
