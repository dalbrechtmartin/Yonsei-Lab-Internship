<script setup lang="ts">
import type { DialogTitleProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { DialogTitle } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  DialogTitleProps & { class?: HTMLAttributes["class"] }
>();
</script>

<template>
  <DialogTitle
    data-slot="dialog-title"
    :class="cn('font-sans text-sm font-bold text-ink', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
