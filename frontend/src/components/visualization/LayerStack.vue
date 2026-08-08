<template>
  <!-- overflow-hidden crops the skewed side strip's transform (which intentionally
       overshoots the stack's own bounds) to a single clean rounded shape. -->
  <div class="flex flex-col overflow-hidden rounded-md">
    <div class="h-0.75 w-full" :style="{ background: topCapColor }" />

    <div class="flex items-stretch">
      <div class="flex min-w-0 flex-1 flex-col">
        <div
          v-for="(layer, index) in renderLayers"
          :key="index"
          class="flex items-center gap-1.5 px-1.5 leading-none"
          :style="{
            background: layer.frontBg,
            minHeight: layer.heightPx + 'px',
            boxShadow:
              'inset 0 2px 0 rgba(255,255,255,0.45), inset 0 -3px 4px rgba(0,0,0,0.18)',
          }"
        >
          <span
            class="min-w-0 flex-1 truncate font-mono text-[10px]"
            style="
              color: rgba(0, 0, 0, 0.72);
              text-shadow: 0 1px 0 rgba(255, 255, 255, 0.3);
            "
          >
            {{ layerLabel(layer) }}
          </span>
        </div>
      </div>
      <div class="relative -ml-px w-3 shrink-0 overflow-hidden">
        <div class="absolute inset-[-6px_0]" :style="sideStripStyle" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import {
  darkenColor,
  isMetal,
  layerLabel,
  lightenColor,
  materialColor,
  type StructureLayer,
} from "@/utils/layerStructure";

const props = defineProps<{
  layers: StructureLayer[];
}>();

const MIN_HEIGHT = 22;
const MAX_EXTRA = 20;

// Segment height scales with thickness relative to the stack's own thinnest/thickest
// layer, so a wildly disproportionate sheet (e.g. 5nm next to 180nm) still reads as a
// stack rather than uniform bars, without any one segment dominating the popover.
const heightFor = (layer: StructureLayer): number => {
  const known = props.layers
    .map((l) => l.thicknessNm)
    .filter((v): v is number => v !== null);
  if (layer.thicknessNm === null || known.length === 0) return MIN_HEIGHT;
  const min = Math.min(...known);
  const max = Math.max(...known);
  if (max === min) return MIN_HEIGHT;
  const ratio = (layer.thicknessNm - min) / (max - min);
  return Math.round(MIN_HEIGHT + ratio * MAX_EXTRA);
};

// Metals get a brushed-sheen overlay (diagonal hairline gradient + soft highlight sweep)
// on top of their base color, so a gold/silver/copper layer reads as reflective metal
// rather than a flat swatch, consistent with the rest of the stack's 3D lighting.
const frontBackground = (color: string, material: string): string => {
  if (!isMetal(material)) return color;
  return (
    "repeating-linear-gradient(97deg, rgba(255,255,255,0.32) 0px, rgba(255,255,255,0.32) 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 2.5px), " +
    "linear-gradient(115deg, rgba(255,255,255,0.55), rgba(255,255,255,0) 35%, rgba(0,0,0,0.08) 75%), " +
    color
  );
};

const renderLayers = computed(() =>
  props.layers.map((layer) => {
    const color = materialColor(layer.material);
    return {
      ...layer,
      color,
      heightPx: heightFor(layer),
      frontBg: frontBackground(color, layer.material),
    };
  }),
);

const topCapColor = computed(() =>
  renderLayers.value.length
    ? lightenColor(renderLayers.value[0].color, 20)
    : "#ccc",
);

// The stack's right edge, rendered as one continuous skewed strip (rather than a
// separate side face per layer) so the darkened bands line up seamlessly into a
// single receding face instead of visibly seamed rectangles.
const sideStripStyle = computed(() => {
  const total = renderLayers.value.reduce((sum, l) => sum + l.heightPx, 0) || 1;
  let acc = 0;
  const stops = renderLayers.value
    .map((l) => {
      const start = (acc / total) * 100;
      acc += l.heightPx;
      const end = (acc / total) * 100;
      const shade = darkenColor(l.color, 40);
      return `${shade} ${start.toFixed(2)}%, ${shade} ${end.toFixed(2)}%`;
    })
    .join(", ");
  return {
    transform: "skewY(-38deg)",
    transformOrigin: "top left",
    background: `linear-gradient(to bottom, ${stops})`,
    boxShadow: "inset -2px 0 4px rgba(0,0,0,0.28)",
  };
});
</script>
