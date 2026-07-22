<template>
  <Select v-model="locale">
    <SelectTrigger size="sm" class="gap-1.5 bg-background/80 px-2.5 text-xs">
      <SelectValue v-slot="{ modelValue }">
        <span class="flex items-center gap-1.5">
          <span>{{ optionFor(modelValue as string).label }}</span>
          <img
            :src="optionFor(modelValue as string).flag"
            alt=""
            class="h-3 w-4 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
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
          <img
            :src="option.flag"
            alt=""
            class="h-3 w-4 rounded-[2px] object-cover shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
          />
        </span>
      </SelectItem>
    </SelectContent>
  </Select>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// Importing the 4 flags we need directly (instead of the package's global
// CSS, which references all ~250 country flags and bloats the production
// bundle by several MB since Vite can't tree-shake CSS url() references).
import usFlag from "flag-icons/flags/4x3/us.svg";
import frFlag from "flag-icons/flags/4x3/fr.svg";
import krFlag from "flag-icons/flags/4x3/kr.svg";
import cnFlag from "flag-icons/flags/4x3/cn.svg";

const { locale } = useI18n();

const options = [
  { value: "en", label: "EN", flag: usFlag },
  { value: "fr", label: "FR", flag: frFlag },
  { value: "ko", label: "KO", flag: krFlag },
  { value: "zh", label: "ZH", flag: cnFlag },
];

const optionFor = (value: string) => options.find((option) => option.value === value) ?? options[0];
</script>
