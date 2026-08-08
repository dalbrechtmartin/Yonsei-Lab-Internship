<template>
  <div
    class="guide-mark"
    :style="{
      top: `${mark.top}px`,
      left: `${mark.left}px`,
      width: `${mark.width}px`,
      height: `${mark.height}px`,
    }"
  >
    <span :style="badgeStyle">{{ number }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { markNumBadgeStyle } from "./guideMarkStyles";
import type { GuideMark } from "./guideAnnotate";

const props = defineProps<{
  mark: GuideMark;
  number: number;
  side?: "right" | "left" | "top";
}>();

// `side` controls which edge the numbered badge floats outside of -- it
// must never sit on top of the ring's own interior, since that's exactly
// the real UI content being pointed at. "right" (the default) works for
// every stacked control row/card in this guide (there's always slack
// before the next column); the toolbar figure is the one place a row of
// tightly-packed buttons sits side by side, so its rings use "top" instead
// to avoid landing on the neighboring button.
const badgeStyle = computed(() =>
  props.side === "top"
    ? {
        ...markNumBadgeStyle,
        position: "absolute" as const,
        left: "50%",
        bottom: "100%",
        marginBottom: "6px",
        transform: "translateX(-50%)",
      }
    : props.side === "left"
      ? {
          ...markNumBadgeStyle,
          position: "absolute" as const,
          top: "50%",
          right: "100%",
          marginRight: "6px",
          transform: "translateY(-50%)",
        }
      : {
          ...markNumBadgeStyle,
          position: "absolute" as const,
          top: "50%",
          left: "100%",
          marginLeft: "6px",
          transform: "translateY(-50%)",
        },
);
</script>

<style scoped>
.guide-mark {
  position: absolute;
  border: 2px solid #d6272c;
  border-radius: 10px;
  pointer-events: none;
  box-sizing: border-box;
}
</style>
