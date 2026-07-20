<template>
  <div class="min-h-screen bg-background text-ink flex flex-col">
    <AppNavbar />
    <RouterView />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import AppNavbar from "./components/layout/AppNavbar.vue";
</script>
