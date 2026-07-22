<script setup lang="ts">
import type { SelectItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { SelectItem, SelectItemText, useForwardProps } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<
  SelectItemProps & { class?: HTMLAttributes["class"] }
>();

const delegatedProps = reactiveOmit(props, "class");

const forwardedProps = useForwardProps(delegatedProps);
</script>

<template>
  <SelectItem
    data-slot="select-item"
    v-bind="forwardedProps"
    :class="
      cn(
        'relative flex w-full cursor-pointer items-start gap-2 rounded-lg px-2.5 py-2 text-sm outline-hidden select-none transition-colors',
        'data-highlighted:bg-primary/8 data-highlighted:text-ink',
        'data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary data-[state=checked]:font-semibold',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <span class="flex min-w-0 flex-col gap-0.5">
      <SelectItemText>
        <slot />
      </SelectItemText>
      <slot name="description" />
    </span>
  </SelectItem>
</template>
