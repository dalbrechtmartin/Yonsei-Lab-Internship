<template>
  <div class="flex shrink-0 flex-wrap items-center gap-2">
    <Button
      type="button"
      variant="success"
      class="gap-1.5"
      :disabled="disabled"
      @click="emit('validate')"
    >
      <Check class="size-3.5" />
      {{ t("extraction.review.actions.validate") }}
      <span
        class="ml-0.5 rounded bg-white/20 px-1.5 py-0.5 font-mono text-[10px] leading-none"
        >{{ t("extraction.review.actions.shortcuts.validate") }}</span
      >
    </Button>
    <Button
      type="button"
      variant="outline"
      class="gap-1.5"
      :disabled="disabled"
      @click="emit('correct')"
    >
      <Pencil class="size-3.5" />
      {{ t("extraction.review.actions.correct") }}
    </Button>
    <Button
      type="button"
      variant="outline"
      class="gap-1.5 border-rose-300 text-rose-600 hover:border-rose-400 hover:bg-rose-500/8 hover:text-rose-700"
      :disabled="disabled"
      @click="emit('exclude')"
    >
      <X class="size-3.5" />
      {{ t("extraction.review.actions.exclude") }}
    </Button>

    <span class="flex-1" />

    <Button
      type="button"
      variant="outline"
      class="gap-1.5"
      :disabled="disabled"
      @click="emit('previous')"
    >
      <ArrowLeft class="size-3.5" />
      {{ t("extraction.review.actions.previous") }}
    </Button>
    <Button
      type="button"
      variant="outline"
      class="gap-1.5"
      :disabled="disabled"
      @click="emit('next')"
    >
      {{ t("extraction.review.actions.next") }}
      <ArrowRight class="size-3.5" />
      <span
        class="ml-0.5 rounded bg-secondary/12 px-1.5 py-0.5 font-mono text-[10px] leading-none"
        >{{ t("extraction.review.actions.shortcuts.next") }}</span
      >
    </Button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { ArrowLeft, ArrowRight, Check, Pencil, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";

withDefaults(defineProps<{ disabled?: boolean }>(), { disabled: false });
const emit = defineEmits<{
  validate: [];
  correct: [];
  exclude: [];
  previous: [];
  next: [];
}>();
const { t } = useI18n();
</script>
