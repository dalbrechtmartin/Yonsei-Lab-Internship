<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@/lib/utils";
import { alertVariants, type AlertVariants } from ".";

const props = defineProps<{
  class?: HTMLAttributes["class"];
  variant?: AlertVariants["variant"];
}>();
</script>

<template>
  <div data-slot="alert" role="alert" :class="cn(alertVariants({ variant }), props.class)">
    <slot />
  </div>
</template>
