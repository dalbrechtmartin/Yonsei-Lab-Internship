<template>
  <div>
    <button
      type="button"
      class="flex w-full items-center justify-between py-0.5 text-left select-none"
      @click="open = !open"
    >
      <span class="text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">
        <slot name="title">{{ title }}</slot>
      </span>
      <span class="flex items-center gap-2">
        <slot name="header-suffix" />
        <ChevronDown
          class="size-3.5 text-secondary transition-transform duration-200"
          :class="open ? 'rotate-0' : '-rotate-90'"
        />
      </span>
    </button>

    <div class="grid transition-[grid-template-rows] duration-250 ease-out" :style="{ gridTemplateRows: open ? '1fr' : '0fr' }">
      <div class="min-h-0 overflow-hidden">
        <slot />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ChevronDown } from "@lucide/vue";

defineProps<{
  title?: string;
}>();

const open = defineModel<boolean>("open", { default: true });
</script>
