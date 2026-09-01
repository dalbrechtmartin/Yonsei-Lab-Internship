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
      <span class="flex items-center gap-1.5">
        <!-- SelectItemText's rendered content is what Radix/reka-ui mirrors
             into the closed trigger's SelectValue -- keep it to just the
             plain label, so a decoration like a "Recommandé" badge (see
             #suffix below) shows in the dropdown list without also getting
             echoed into the trigger once that item is the selected value. -->
        <SelectItemText>
          <slot />
        </SelectItemText>
        <slot name="suffix" />
      </span>
      <slot name="description" />
    </span>
  </SelectItem>
</template>
