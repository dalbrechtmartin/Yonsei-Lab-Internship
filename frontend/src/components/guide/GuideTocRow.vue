<template>
  <div
    class="guide-toc-row group flex items-center gap-3 px-4 py-1.75"
    :class="[
      idx % 2 === 1 ? 'bg-muted/25' : 'bg-white',
      entry.group === 'mode1' || entry.group === 'mode2' ? 'pl-9' : '',
      idx > 0 ? 'border-t border-border/70' : '',
    ]"
    :data-toc-target="entry.page"
  >
    <span
      class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
    >
      <component :is="entry.icon" class="size-3.5" />
    </span>
    <span class="min-w-0 flex-1">
      <span class="block text-sm font-medium text-ink">{{ entry.label }}</span>
      <span class="block truncate text-[11px] text-secondary">{{
        entry.desc
      }}</span>
    </span>
    <span
      class="h-0 w-6 flex-none -translate-y-1 border-b border-dotted border-secondary/50"
    />
    <span
      class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-white"
    >
      {{ entry.page }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { Component } from "vue";

defineProps<{
  entry: {
    label: string;
    desc: string;
    page: number;
    icon: Component;
    group: "front" | "mode1" | "mode2" | "back";
  };
  idx: number;
}>();
</script>
