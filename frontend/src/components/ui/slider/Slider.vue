<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from "reka-ui";
import { cn } from "@/lib/utils";

const props = withDefaults(defineProps<SliderRootProps & { class?: HTMLAttributes["class"] }>(), {
  modelValue: () => [0],
});
const emits = defineEmits<SliderRootEmits>();

const delegatedProps = reactiveOmit(props, "class");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <SliderRoot
    data-slot="slider"
    v-bind="forwarded"
    :class="
      cn(
        'relative flex w-full touch-none items-center select-none cursor-pointer data-disabled:opacity-50 data-disabled:cursor-default',
        props.class,
      )
    "
  >
    <SliderTrack data-slot="slider-track" class="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary/25">
      <SliderRange data-slot="slider-range" class="absolute h-full bg-primary" />
    </SliderTrack>
    <SliderThumb
      v-for="(_, key) in modelValue"
      :key="key"
      data-slot="slider-thumb"
      class="block size-4 shrink-0 cursor-pointer rounded-full border border-primary bg-background shadow-sm transition-colors hover:ring-4 hover:ring-ring/50 focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 disabled:cursor-default"
    />
  </SliderRoot>
</template>
