<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <button
        type="button"
        tabindex="-1"
        class="inline-flex transition"
        :class="iconClass"
        :aria-label="text"
      >
        <component :is="icon" class="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="left">
      <p>{{ text }}</p>
    </TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import { Info } from "@lucide/vue";
import type { Component } from "vue";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

withDefaults(
  defineProps<{
    text: string;
    iconClass?: string | string[];
    icon?: Component;
  }>(),
  { iconClass: "text-muted-foreground hover:text-secondary", icon: () => Info },
);
</script>
