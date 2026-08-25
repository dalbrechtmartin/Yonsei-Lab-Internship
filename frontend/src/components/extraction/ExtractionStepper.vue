<template>
  <div
    class="flex shrink-0 items-center gap-3.5 border-b border-secondary/10 px-5 py-3.5 sm:px-7"
  >
    <template v-for="(step, i) in steps" :key="step.key">
      <button
        type="button"
        class="flex items-center gap-2 text-xs font-medium sm:text-sm"
        :class="[
          stepState(i + 1) === 'todo' ? 'text-secondary/60' : 'text-ink',
          i + 1 <= furthestStep
            ? 'cursor-pointer'
            : 'cursor-default opacity-70',
        ]"
        :disabled="i + 1 > furthestStep"
        :aria-current="i + 1 === currentStep ? 'step' : undefined"
        :aria-label="t(step.labelKey)"
        @click="i + 1 <= furthestStep && emit('select-step', i + 1)"
      >
        <span
          class="flex size-5.5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold"
          :class="circleClass(i + 1)"
        >
          <Check v-if="stepState(i + 1) === 'done'" class="size-3" />
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="hidden sm:inline">{{ t(step.labelKey) }}</span>
      </button>
      <span
        v-if="i < steps.length - 1"
        class="h-px flex-1 bg-secondary/12"
        aria-hidden="true"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Check } from "@lucide/vue";

export interface ExtractionStepDef {
  key: string;
  labelKey: string;
}

const props = defineProps<{
  steps: ExtractionStepDef[];
  currentStep: number;
  /** Highest step ever reached -- steps up to this one are clickable for
   * back-navigation, anything beyond stays inert until the wizard itself
   * advances (not skippable forward). */
  furthestStep: number;
}>();

const emit = defineEmits<{
  "select-step": [step: number];
}>();

const { t } = useI18n();

type StepState = "done" | "current" | "todo";

function stepState(step: number): StepState {
  if (step < props.currentStep) return "done";
  if (step === props.currentStep) return "current";
  return "todo";
}

function circleClass(step: number): string {
  switch (stepState(step)) {
    case "done":
      return "border-ink bg-ink text-white";
    case "current":
      return "border-primary bg-primary text-white";
    default:
      return "border-secondary/30 bg-transparent text-secondary/60";
  }
}
</script>
