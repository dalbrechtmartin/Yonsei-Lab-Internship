<template>
  <footer
    class="mt-auto flex items-center justify-between border-t border-border pt-2.5 text-xs text-secondary"
  >
    <span>{{ t("app.title") }} — {{ t("guide.meta.subtitle") }}</span>
    <span>{{ t("guide.footer.page") }} {{ page }} / {{ totalPages }}</span>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{ page: number; totalPages: number }>();

const { t } = useI18n();
</script>
