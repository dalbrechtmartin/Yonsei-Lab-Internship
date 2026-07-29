<script setup lang="ts">
import type { DialogDescriptionProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { DialogDescription } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DialogDescriptionProps & { class?: HTMLAttributes["class"] }>();
</script>

<template>
  <DialogDescription data-slot="dialog-description" :class="cn('font-sans text-xs text-muted-foreground', props.class)">
    <slot />
  </DialogDescription>
</template>
