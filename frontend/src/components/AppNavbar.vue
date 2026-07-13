<template>
  <nav
    class="w-full bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm"
  >
    <h1 class="text-xl font-bold text-gray-800">{{ $t("app.title") }}</h1>

    <select
      v-model="locale"
      class="bg-gray-100 border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
    >
      <option value="en">EN</option>
      <option value="fr">FR</option>
      <option value="ko">KO</option>
      <option value="zh">ZH</option>
    </select>
  </nav>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { locale } = useI18n();
</script>
