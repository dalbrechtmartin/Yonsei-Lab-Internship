<script setup lang="ts">
import type { DropdownMenuItemEmits, DropdownMenuItemProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DropdownMenuItem, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<DropdownMenuItemProps & { class?: HTMLAttributes["class"] }>();
const emits = defineEmits<DropdownMenuItemEmits>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DropdownMenuItem
    data-slot="dropdown-menu-item"
    v-bind="forwarded"
    :class="
      cn(
        'flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-xs text-ink outline-hidden select-none',
        'data-highlighted:bg-primary/8',
        'data-disabled:pointer-events-none data-disabled:opacity-50',
        props.class,
      )
    "
  >
    <slot />
  </DropdownMenuItem>
</template>
