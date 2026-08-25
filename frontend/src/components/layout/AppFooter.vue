<template>
  <footer
    class="relative w-full shrink-0 border-t border-secondary/15 bg-card/60 px-6 py-4 text-center text-xs text-muted-foreground"
  >
    <!-- Deliberately unlabeled and low-contrast -- this is an easter egg
         (playing Photon Dash outside of an extraction run), not a listed
         feature, so it stays a quiet icon rather than a real nav entry. -->
    <RouterLink
      to="/play"
      :title="t('footer.play')"
      :aria-label="t('footer.play')"
      class="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground/30 transition-colors hover:text-primary sm:left-4"
    >
      <Gamepad2 class="size-4" aria-hidden="true" />
    </RouterLink>

    {{ t("footer.copyright", { year }) }}
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import { Gamepad2 } from "@lucide/vue";

const { t } = useI18n();
const year = new Date().getFullYear();
</script>
