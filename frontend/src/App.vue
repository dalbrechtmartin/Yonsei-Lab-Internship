<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-background text-ink">
    <AppNavbar />
    <!-- The one scrollable region in the whole shell -- nav and footer stay
         pinned outside it (see their own shrink-0), so every route gets
         exactly the viewport height minus those two to work with. A route
         whose content fits (VisualizationView, sized to this via its own
         flex-1/min-h-0 chain) never triggers this scroll at all; a taller
         one (HomeView's landing page) scrolls in place here instead of the
         whole document, which is what keeps the footer reachable without
         losing the header. -->
    <div class="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      <RouterView />
    </div>
    <AppFooter />

    <ToastStack />
    <PhotonFab />
  </div>
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import AppNavbar from "./components/layout/AppNavbar.vue";
import AppFooter from "./components/layout/AppFooter.vue";
import ToastStack from "./components/shared/ToastStack.vue";
import PhotonFab from "./components/extraction/PhotonFab.vue";
</script>
