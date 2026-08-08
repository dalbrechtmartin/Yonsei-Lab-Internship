<template>
  <footer
    class="w-full shrink-0 border-t border-secondary/15 bg-card/60 px-6 py-4 text-center text-xs text-muted-foreground"
  >
    {{ t("footer.copyright", { year }) }}
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const year = new Date().getFullYear();
</script>
