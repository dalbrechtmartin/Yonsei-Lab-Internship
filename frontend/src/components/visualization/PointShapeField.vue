<template>
  <!-- Same joined-segment style as the Origin toggle (AddPointDialog) --
       matching height/padding/border so the two controls sitting side by
       side on the same row read as one consistent family of pills instead
       of two differently-sized widgets. -->
  <div class="inline-flex overflow-hidden rounded-md border border-input">
    <button
      v-for="(opt, idx) in shapes"
      :key="opt.value"
      type="button"
      class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
      :class="[
        modelValue === opt.value
          ? 'bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:bg-secondary/10 hover:text-ink',
        idx > 0 ? 'border-l border-input' : '',
      ]"
      @click="modelValue = opt.value"
    >
      <Circle
        v-if="opt.value === 'circle'"
        class="size-3.5"
        :class="modelValue === opt.value ? 'fill-current' : ''"
      />
      <Diamond
        v-else-if="opt.value === 'diamond'"
        class="size-3.5"
        :class="modelValue === opt.value ? 'fill-current' : ''"
      />
      <Star
        v-else
        class="size-3.5"
        :class="modelValue === opt.value ? 'fill-current' : ''"
      />
      {{ opt.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Circle, Diamond, Star } from "@lucide/vue";
import type { PointShape } from "@/utils/columnTypes";

/**
 * Marker-shape picker for a point (any point, not just manually added ones
 * -- see columnTypes.ts's pointShape). Three choices only, matching what
 * FomChart actually knows how to render (circle/diamond/star, the last via
 * a custom SVG path since ECharts has no built-in star symbol).
 */
const { t } = useI18n();

const modelValue = defineModel<PointShape>({ default: "circle" });

const shapes: { value: PointShape; label: string }[] = [
  { value: "circle", label: t("fomcharts.addPoint.shapeCircle") },
  { value: "diamond", label: t("fomcharts.addPoint.shapeDiamond") },
  { value: "star", label: t("fomcharts.addPoint.shapeStar") },
];
</script>
