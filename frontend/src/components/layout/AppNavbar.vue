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

    <div class="flex items-center gap-4">
      <div
        class="flex items-center gap-2 rounded-full border border-secondary/10 bg-background/70 p-1 shadow-sm"
      >
        <template v-for="tool in tools" :key="tool.path">
          <RouterLink
            v-if="!tool.locked"
            :to="tool.path"
            class="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-secondary transition duration-200 hover:bg-secondary/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            active-class="!bg-primary !text-primary-foreground shadow-md shadow-primary/15 hover:!bg-primary"
          >
            {{ $t(tool.labelKey) }}
          </RouterLink>

          <div
            v-else
            class="group relative inline-flex cursor-not-allowed items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-secondary/50"
          >
            <span>{{ $t(tool.labelKey) }}</span>
            <Lock class="size-3.5" />

            <span
              class="pointer-events-none absolute top-full left-1/2 z-30 mt-2 -translate-x-1/2 rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium whitespace-nowrap text-white opacity-0 shadow-lg transition duration-150 group-hover:opacity-100"
            >
              {{ $t("nav.comingSoon") }}
            </span>
          </div>
        </template>
      </div>

      <LanguageSelector />
    </div>
  </nav>
</template>

<script setup lang="ts">
import { Lock } from "@lucide/vue";
import { RouterLink } from "vue-router";
import LanguageSelector from "./LanguageSelector.vue";

interface ToolTab {
  path: string;
  labelKey: string;
  locked?: boolean;
}

const tools: ToolTab[] = [
  { path: "/", labelKey: "nav.home" },
  { path: "/visualization", labelKey: "nav.visualization" },
  // Extraction is locked in deployed builds (test + prod, both run through
  // `vite build` per Dockerfile.frontend) while its next version is being
  // reworked -- import.meta.env.PROD is false only under `vite dev`, which
  // is exactly the local/dev-only access the app owner wants to keep.
  { path: "/extraction", labelKey: "nav.extraction", locked: import.meta.env.PROD },
];
</script>
