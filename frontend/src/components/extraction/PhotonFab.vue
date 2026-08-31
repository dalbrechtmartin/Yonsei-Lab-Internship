<template>
  <!-- Nothing renders at all while Photon has no active context (e.g. on
       Home, or on Visualization until/unless it gets an equivalent
       selection point -- see usePhotonContext.ts) -- this is the single
       gate for the whole feature, which is exactly why App.vue only ever
       needs to mount this one component. -->
  <button
    v-if="isAvailable && !isOpen"
    type="button"
    class="fixed right-4 bottom-4 z-40 flex size-14 items-center justify-center rounded-full border border-secondary/15 bg-card shadow-[0_10px_30px_rgba(15,23,42,0.28)] backdrop-blur-xl transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-primary/40 focus-visible:outline-none sm:right-6 sm:bottom-6"
    :aria-label="t('photon.fab.openAria')"
    @click="isOpen = true"
  >
    <PhotonMascot :expression="mascotExpression" class="size-8" />
    <!-- Quiet "something happened while you weren't looking" cue for a
         reply that arrived (or is arriving) while the panel is closed --
         not a full unread-count badge, since Photon has exactly one
         conversation and no notion of "unseen" messages to count. -->
    <span
      v-if="isSending"
      class="absolute top-0 right-0 size-3 animate-pulse rounded-full bg-primary ring-2 ring-card"
      aria-hidden="true"
    />
  </button>

  <!-- Mobile: near-fullscreen (inset-0) per the plan's touch-target/space
       guidance. Desktop (sm+): a compact card pinned to the same bottom-
       right corner the fab occupies when closed. The exact size here is a
       starting point (the plan itself flags this kind of sizing as
       something to adjust by eye against a live conversation), not a
       fixed spec. -->
  <div
    v-else-if="isAvailable && isOpen"
    class="fixed inset-0 z-40 sm:inset-auto sm:right-6 sm:bottom-6 sm:h-[min(32rem,70vh)] sm:w-96"
  >
    <PhotonPanel @close="isOpen = false" />
  </div>
</template>

<script setup lang="ts">
// PhotonFab -- the single mount point ExtractionReviewStep's ancestor
// (App.vue) needs for the whole Photon feature: a floating launcher that
// swaps itself for the full PhotonPanel.vue while open, and disappears
// entirely wherever no view has registered a Photon context (see
// providePhotonContext in usePhotonContext.ts). Nothing else in this file
// touches the conversation itself -- that's all PhotonPanel/usePhoton.
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import { usePhoton } from "@/composables/usePhotonContext";
import PhotonMascot from "./PhotonMascot.vue";
import PhotonPanel from "./PhotonPanel.vue";

const { t } = useI18n();
const { isAvailable, isSending, mascotExpression } = usePhoton();

const isOpen = ref(false);
</script>
