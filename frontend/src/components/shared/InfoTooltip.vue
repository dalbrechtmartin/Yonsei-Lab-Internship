<template>
  <Tooltip>
    <TooltipTrigger as-child>
      <button
        type="button"
        tabindex="-1"
        class="inline-flex text-muted-foreground transition hover:text-secondary"
        :aria-label="text"
      >
        <Info class="size-3.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent>
      <p>{{ text }}</p>
    </TooltipContent>
  </Tooltip>
</template>

<script setup lang="ts">
import { Info } from "@lucide/vue";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

defineProps<{ text: string }>();
</script>
