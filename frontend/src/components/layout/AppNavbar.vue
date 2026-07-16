<template>
  <nav
    class="sticky top-0 z-20 w-full border-b border-secondary/15 bg-card/90 px-6 py-3 flex justify-between items-center shadow-[0_1px_0_rgba(58,80,107,0.08)] backdrop-blur-xl"
  >
    <div class="flex items-center gap-2">
      <img src="@/assets/logo.svg" class="h-7 w-7" alt="" />
      <h1 class="text-lg font-semibold tracking-wide text-ink">
        {{ $t("app.title") }}
      </h1>
    </div>

    <div class="flex gap-1">
      <RouterLink
        v-for="tool in tools"
        :key="tool.path"
        :to="tool.path"
        class="px-3 py-1.5 text-sm rounded-lg text-secondary transition hover:bg-primary/8 hover:text-ink"
        active-class="bg-primary text-primary-foreground font-medium shadow-sm hover:bg-primary"
      >
        {{ $t(tool.labelKey) }}
      </RouterLink>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

interface ToolTab {
  path: string;
  labelKey: string;
}

const tools: ToolTab[] = [
  { path: "/", labelKey: "nav.visualization" },
  { path: "/extraction", labelKey: "nav.extraction" },
];
</script>
