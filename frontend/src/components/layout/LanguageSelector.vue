<template>
  <Select v-model="locale">
    <SelectTrigger size="sm" class="gap-1.5 bg-background/80 px-2.5 text-xs">
      <SelectValue v-slot="{ modelValue }">
        <span class="flex items-center gap-1.5">
          <span>{{ optionFor(modelValue as string).label }}</span>
          <span
            class="fi rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            :class="optionFor(modelValue as string).flagClass"
          />
        </span>
      </SelectValue>
    </SelectTrigger>
    <SelectContent align="end">
      <SelectItem
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :text-value="option.label"
      >
        <span class="flex w-full items-center justify-between gap-3">
          <span>{{ option.label }}</span>
          <span
            class="fi rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
            :class="option.flagClass"
          />
        </span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const { locale } = useI18n();

const options = [
  { value: "en", label: "EN", flagClass: "fi-us" },
  { value: "fr", label: "FR", flagClass: "fi-fr" },
  { value: "ko", label: "KO", flagClass: "fi-kr" },
  { value: "zh", label: "ZH", flagClass: "fi-cn" },
];

const optionFor = (value: string) => options.find((option) => option.value === value) ?? options[0];
</script>
