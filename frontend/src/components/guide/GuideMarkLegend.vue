<template>
  <div
    class="flex flex-col leading-snug"
    :class="compact ? 'gap-1 text-[10.5px]' : 'gap-1.5 text-xs'"
  >
    <p v-for="(item, i) in items" :key="i">
      <span
        :style="{
          ...markNumBadgeStyle,
          display: 'inline-flex',
          marginRight: '6px',
          verticalAlign: 'middle',
          boxShadow: 'none',
        }"
      >
        {{ i + 1 }}
      </span>
      <strong class="text-ink">{{ item.label }}</strong>
      — {{ item.body }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { markNumBadgeStyle } from "./guideMarkStyles";

// `compact` tightens the row gap (used on pages whose legend has grown to
// more rows than this fixed-height A4 page has slack for, e.g. the
// Controls page's Display column) rather than shortening body copy past
// the point of being useful.
defineProps<{
  items: { label: string; body: string }[];
  compact?: boolean;
}>();

// A plain SFC (unlike the old h()-based version) gets Vue's default
// attribute fallthrough for free -- a `class="..."` passed by a caller
// merges onto the root div automatically, no manual `ctx.attrs.class`
// plumbing needed.
</script>
