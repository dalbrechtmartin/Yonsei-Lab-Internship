<template>
  <ToolActionsBar
    :tool-name="t('view.play.title')"
    :show-import="false"
    :show-export="false"
  />

  <main
    class="animate-in fade-in flex min-h-0 flex-1 flex-col items-center justify-center overflow-x-hidden overflow-y-auto px-3 py-6 duration-300 sm:px-4 lg:px-5"
  >
    <div class="mx-auto flex w-full max-w-250 flex-col gap-3">
      <RouterLink
        to="/"
        class="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-secondary transition-colors hover:text-ink"
      >
        <ArrowLeft class="size-3.5" />
        {{ t("view.play.back") }}
      </RouterLink>

      <PhotonDashGame :collapsible="false" class="w-full" />
    </div>
  </main>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { ArrowLeft } from "@lucide/vue";
import ToolActionsBar from "@/components/layout/ToolActionsBar.vue";
import PhotonDashGame from "@/components/extraction/PhotonDashGame.vue";

const { t } = useI18n();
</script>
