<template>
  <div class="flex flex-col gap-1.5">
    <Input v-model="query" :placeholder="placeholder" class="h-8 text-sm" />
    <div
      class="flex max-h-32.5 flex-col overflow-x-hidden overflow-y-auto rounded-md border border-input"
    >
      <label
        v-for="opt in filteredOptions"
        :key="opt"
        class="flex cursor-pointer items-center gap-2 border-b border-border px-2 py-1.5 text-xs last:border-b-0 hover:bg-secondary/8"
      >
        <Checkbox
          :model-value="modelValue.includes(opt)"
          @update:model-value="() => toggle(opt)"
        />
        <span class="min-w-0 flex-1 truncate text-ink">
          {{ opt }}
          <span v-if="optionHints?.[opt]" class="text-muted-foreground"
            >({{ optionHints[opt] }})</span
          >
        </span>
      </label>
      <button
        v-if="showCreateOption"
        type="button"
        class="flex items-center gap-1.5 border-b border-border px-2 py-1.5 text-left text-xs text-primary last:border-b-0 hover:bg-primary/8"
        @click="createFromQuery"
      >
        <Plus class="size-3.5 shrink-0" />
        <span class="min-w-0 flex-1 truncate"
          >{{ t("fomcharts.addPoint.addNew") }} "{{ query.trim() }}"</span
        >
      </button>
      <p
        v-if="filteredOptions.length === 0 && !showCreateOption"
        class="px-2 py-1.5 text-xs text-muted-foreground"
      >
        {{ t("fomcharts.addPoint.noMatches") }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Plus } from "@lucide/vue";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

/**
 * Inline, always-visible checklist for composite fields (Material Class,
 * Base Materials) -- matches the mockup: a search box filtering a scrollable
 * checkbox list, rather than a popover-only Combobox. Checked state IS the
 * selection (no separate chip row) -- so the option list always includes
 * every already-picked value unioned with the dataset's own suggestions
 * (see allOptions), or an already-selected custom value would have nowhere
 * to render its checked checkbox once its search term is cleared.
 */
const props = defineProps<{
  options: string[];
  placeholder: string;
  /** Optional "(preview)" text shown next to a specific option, e.g. Material
   * Class options previewing which Base Materials they'd narrow down to
   * (see AddPointDialog's materialClassHints) -- undefined/no entry renders
   * nothing extra for that option. */
  optionHints?: Record<string, string>;
}>();

const { t } = useI18n();

const modelValue = defineModel<string[]>({ default: () => [] });

const query = ref("");

const allOptions = computed(() =>
  Array.from(new Set([...props.options, ...modelValue.value])).sort(),
);

const filteredOptions = computed(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allOptions.value;
  return allOptions.value.filter((opt) => opt.toLowerCase().includes(q));
});

// Offered whenever the typed text isn't just re-spelling an existing option
// with different casing -- prevents "Au" and "AU" from silently becoming two
// distinct categories.
const showCreateOption = computed(() => {
  const q = query.value.trim();
  if (!q) return false;
  return !allOptions.value.some((opt) => opt.toLowerCase() === q.toLowerCase());
});

const toggle = (opt: string) => {
  modelValue.value = modelValue.value.includes(opt)
    ? modelValue.value.filter((v) => v !== opt)
    : [...modelValue.value, opt];
};

const createFromQuery = () => {
  const v = query.value.trim();
  if (!v) return;
  toggle(v);
  query.value = "";
};
</script>
