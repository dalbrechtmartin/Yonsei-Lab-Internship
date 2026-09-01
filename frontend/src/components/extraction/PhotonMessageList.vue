<template>
  <div
    ref="scrollRef"
    class="photon-message-list flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-3.5 py-3"
    role="log"
    aria-live="polite"
  >
    <div
      v-if="!messages.length && !isLoading"
      class="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-6 text-center"
    >
      <PhotonMascot expression="neutral" class="size-10" />
      <p class="max-w-[220px] text-[13px] leading-snug text-secondary">
        {{ t("photon.messages.empty") }}
      </p>
    </div>

    <div
      v-for="(message, index) in messages"
      :key="index"
      class="flex items-end gap-2"
      :class="message.role === 'user' ? 'flex-row-reverse' : 'flex-row'"
    >
      <PhotonMascot
        v-if="message.role === 'model'"
        expression="neutral"
        class="size-6 shrink-0"
      />
      <div
        class="max-w-[80%] rounded-2xl px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap break-words shadow-sm"
        :class="
          message.role === 'user'
            ? 'rounded-br-sm bg-primary text-white'
            : 'rounded-bl-sm border border-secondary/15 bg-card text-ink'
        "
      >
        {{ message.content }}
      </div>
    </div>

    <div v-if="isLoading" class="flex items-end gap-2">
      <PhotonMascot expression="thinking" class="size-6 shrink-0" />
      <div
        class="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-secondary/15 bg-card px-3.5 py-2.5 shadow-sm"
        :aria-label="t('photon.messages.thinking')"
      >
        <span class="photon-dot" />
        <span class="photon-dot" />
        <span class="photon-dot" />
      </div>
    </div>

    <!-- A failed turn (usePhotonContext.ts's sendMessage catch) leaves the
         user's message in place with no matching reply and never appends
         anything error-shaped to `messages` itself (the real PhotonMessage
         is just {role, content} -- no per-message error flag). So rather
         than a field that doesn't exist on the real type, a failed turn is
         *derived*: the trailing message is the user's, and we're not
         mid-request. This is unambiguous given how sendMessage is written --
         it pushes the user turn and flips isLoading in the same call, before
         any await, so there's no in-between render where this reads true for
         a message that's merely still in flight. -->
    <div v-if="lastTurnFailed" class="flex items-end gap-2">
      <PhotonMascot expression="confused" class="size-6 shrink-0" />
      <div class="flex max-w-[80%] flex-col items-start gap-1">
        <div
          class="rounded-2xl rounded-bl-sm border border-destructive/30 bg-destructive/8 px-3.5 py-2 text-[13px] leading-relaxed text-destructive shadow-sm"
        >
          {{ t("photon.messages.failed") }}
        </div>
        <button
          type="button"
          class="flex items-center gap-1 rounded px-1 text-[11px] font-medium text-secondary transition-colors hover:bg-secondary/10 hover:text-ink"
          @click="retryLastMessage"
        >
          <RotateCcw class="size-3" />
          {{ t("photon.messages.retry") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// Photon assistant (mentor plan item 5) -- the scrollable conversation
// transcript shown inside PhotonPanel.vue, rendered unconditionally as a
// direct flex child (it owns its own min-h-0 flex-1 flex column + internal
// scroll/padding, and its own empty-state placeholder, so the panel around
// it doesn't need to branch on messages.length itself). Bot messages pair
// with PhotonMascot (one avatar per bot message); user messages mirror the
// app's existing solid-primary pill treatment (see ExtractionExportStep.vue
// / ExtractionStepper.vue's `bg-primary text-white`), bot messages the
// existing card/border chrome panels like ExtractionEventLog.vue already
// use (`border-secondary/15 bg-card`).
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { RotateCcw } from "@lucide/vue";
import type { PhotonMessage } from "@/composables/usePhotonContext";
import PhotonMascot from "@/components/extraction/PhotonMascot.vue";

const props = defineProps<{
  messages: PhotonMessage[];
  /** True while awaiting Photon's reply to the latest message -- renders a
   * trailing typing-indicator bubble instead of a message-list entry. */
  isLoading: boolean;
}>();

const emit = defineEmits<{ retry: [message: PhotonMessage] }>();

const { t } = useI18n();

const scrollRef = ref<HTMLDivElement | null>(null);

const lastTurnFailed = computed(() => {
  if (props.isLoading || !props.messages.length) return false;
  return props.messages[props.messages.length - 1].role === "user";
});

function retryLastMessage() {
  const last = props.messages[props.messages.length - 1];
  if (last) emit("retry", last);
}

// New message, the typing indicator, or the failed-turn notice appearing/
// disappearing -- all three push the reader's eye to the bottom of the
// transcript, same as any chat UI.
watch(
  () => [props.messages.length, props.isLoading, lastTurnFailed.value],
  async () => {
    await nextTick();
    const el = scrollRef.value;
    if (el) el.scrollTop = el.scrollHeight;
  },
);
</script>

<style scoped>
.photon-message-list {
  scrollbar-width: thin;
}
.photon-message-list::-webkit-scrollbar {
  width: 5px;
}
.photon-message-list::-webkit-scrollbar-thumb {
  background-color: var(--secondary);
  opacity: 0.25;
  border-radius: 9999px;
}

.photon-dot {
  width: 5px;
  height: 5px;
  border-radius: 9999px;
  background-color: var(--secondary);
  opacity: 0.5;
  animation: photon-dot-bounce 1.1s ease-in-out infinite;
}
.photon-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.photon-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes photon-dot-bounce {
  0%,
  60%,
  100% {
    transform: translateY(0);
    opacity: 0.35;
  }
  30% {
    transform: translateY(-3px);
    opacity: 0.9;
  }
}
</style>
