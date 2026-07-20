<template>
  <nav
    class="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-secondary/15 bg-card/90 px-6 shadow-[0_1px_0_rgba(58,80,107,0.08)] backdrop-blur-xl"
  >
    <div class="flex items-center gap-2">
      <img src="@/assets/logo.svg" class="h-7 w-7" alt="" />
      <h1 class="text-lg font-semibold tracking-wide text-ink">
        {{ $t("app.title") }}
      </h1>
    </div>

    <div
      class="flex items-center gap-2 rounded-full border border-secondary/10 bg-background/70 p-1 shadow-sm"
    >
      <RouterLink
        v-for="tool in tools"
        :key="tool.path"
        :to="tool.path"
        class="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-secondary transition duration-200 hover:bg-secondary/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        active-class="!bg-primary !text-primary-foreground shadow-md shadow-primary/15 hover:!bg-primary"
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
