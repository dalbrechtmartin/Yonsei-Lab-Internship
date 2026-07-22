<template>
  <div class="w-full">
    <p class="text-xs uppercase tracking-[0.3em] text-secondary">
      {{ t("extraction.modelSelector.title") }}
    </p>
    <p class="mt-1 text-sm text-secondary">
      {{ t("extraction.modelSelector.description") }}
    </p>

    <Select v-model="modelChoice">
      <SelectTrigger class="mt-2 w-full bg-card/80">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem
          v-for="option in options"
          :key="option.value"
          :value="option.value"
          :text-value="t(option.titleKey)"
        >
          {{ t(option.titleKey) }}
          <template #description>
            <span class="text-xs leading-4 text-muted-foreground">
              {{ t(option.descriptionKey) }}
            </span>
          </template>
        </SelectItem>
      </SelectContent>
    </Select>

    <p class="mt-1.5 text-xs leading-5 text-secondary">
      {{ t(selectedOption.descriptionKey) }}
    </p>
    <p
      v-if="selectedOption.warningKey"
      class="mt-1 text-xs leading-5 text-amber-700"
    >
      {{ t(selectedOption.warningKey) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ModelChoice } from "@/services/api";

const { t } = useI18n();

const modelChoice = defineModel<ModelChoice>("modelChoice", { default: "default" });

const options: {
  value: ModelChoice;
  titleKey: string;
  descriptionKey: string;
  warningKey?: string;
}[] = [
  {
    value: "default",
    titleKey: "extraction.modelSelector.default.title",
    descriptionKey: "extraction.modelSelector.default.description",
    warningKey: "extraction.modelSelector.default.warning",
  },
  {
    value: "gemini-3.5-flash",
    titleKey: "extraction.modelSelector.flash.title",
    descriptionKey: "extraction.modelSelector.flash.description",
  },
  {
    value: "gemini-3.1-flash-lite",
    titleKey: "extraction.modelSelector.lite.title",
    descriptionKey: "extraction.modelSelector.lite.description",
  },
];

const selectedOption = computed(
  () => options.find((option) => option.value === modelChoice.value) ?? options[0],
);
</script>
