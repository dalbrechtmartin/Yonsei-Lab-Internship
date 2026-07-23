<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { TooltipContentEmits, TooltipContentProps } from "reka-ui";
import { reactiveOmit } from "@vueuse/core";
import { TooltipArrow, TooltipContent, TooltipPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<TooltipContentProps & { class?: HTMLAttributes["class"] }>(),
  { sideOffset: 6 },
);
const emits = defineEmits<TooltipContentEmits>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <TooltipPortal>
    <TooltipContent
      data-slot="tooltip-content"
      v-bind="forwarded"
      :class="
        cn(
          'z-50 w-fit max-w-72 origin-(--reka-tooltip-content-transform-origin) rounded-md bg-ink px-3 py-1.5 text-xs text-balance text-white shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          props.class,
        )
      "
    >
      <slot />
      <TooltipArrow class="fill-ink" :width="10" :height="5" />
    </TooltipContent>
  </TooltipPortal>
</template>
