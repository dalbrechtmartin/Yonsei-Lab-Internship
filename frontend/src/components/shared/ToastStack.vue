<template>
  <div
    class="pointer-events-none fixed right-4 z-70 flex w-full max-w-sm flex-col-reverse gap-2 sm:right-6"
    :style="{ bottom: `${footerHeightPx + 16}px` }"
  >
    <TransitionGroup name="toast">
      <StatusToast
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto"
        :status-key="toast.key"
        :status-class="toast.className"
        :duration-ms="toast.ringDurationMs"
        :token="toast.token"
        @dismiss="dismissToast(toast.id)"
      />
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import StatusToast from "@/components/shared/StatusToast.vue";
import { useToastStack } from "@/composables/useToastQueue";
import { footerHeightPx } from "@/composables/useFooterHeight";

const { toasts, dismissToast } = useToastStack();
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* Lets the remaining toasts slide into their new slot instead of jumping
   when one above/below is removed from the stack. */
.toast-move {
  transition: transform 0.2s ease;
}
</style>
