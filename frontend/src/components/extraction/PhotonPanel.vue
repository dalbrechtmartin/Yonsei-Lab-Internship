<template>
  <section
    class="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-secondary/15 bg-card shadow-[0_20px_50px_rgba(15,23,42,0.28)] backdrop-blur-xl"
    role="dialog"
    aria-modal="false"
    :aria-label="t('photon.panel.title')"
  >
    <header
      class="flex shrink-0 items-center gap-2.5 border-b border-secondary/10 px-4 py-3"
    >
      <PhotonMascot :expression="mascotExpression" class="size-7 shrink-0" />
      <div class="min-w-0 flex-1">
        <p class="truncate text-sm font-semibold text-ink">
          {{ t("photon.panel.title") }}
        </p>
        <p v-if="recordLabel" class="truncate text-xs text-secondary">
          {{ recordLabel }}
        </p>
      </div>
      <button
        type="button"
        class="shrink-0 rounded-md p-1.5 text-secondary transition-colors hover:bg-primary/8 hover:text-ink"
        :aria-label="t('photon.panel.closeAria')"
        @click="emit('close')"
      >
        <X class="size-4" />
      </button>
    </header>

    <div class="flex min-h-0 flex-1 flex-col">
      <p v-if="messages.length === 0" class="px-4 py-3 text-sm text-secondary">
        {{ t("photon.panel.emptyHint") }}
      </p>
      <PhotonMessageList
        v-else
        :messages="[...messages]"
        :is-loading="isSending"
        @retry="handleRetry"
      />
    </div>

    <!-- Hand-rolled rather than ui/alert -- this panel's import list is
         deliberately narrow (see PhotonFab.vue's sibling comment); the
         destructive design tokens used here are the same ones ui/alert's
         "destructive" variant applies, just inlined. -->
    <p
      v-if="error"
      class="shrink-0 border-t border-destructive/30 bg-destructive/8 px-4 py-2 text-xs text-destructive"
    >
      {{ t(error) }}
    </p>

    <div
      v-if="visibleChips.length"
      class="shrink-0 border-t border-secondary/10 px-3 py-2"
    >
      <PhotonChipRow
        :chips="visibleChips"
        :disabled="isSending"
        @select="handleChipSelect"
      />
    </div>

    <form
      class="flex shrink-0 items-end gap-2 border-t border-secondary/10 p-3"
      @submit.prevent="handleSend"
    >
      <Textarea
        v-model="draft"
        :placeholder="t('photon.panel.placeholder')"
        class="max-h-32 min-h-9 flex-1 resize-none text-sm"
        rows="1"
        :disabled="isSending"
        @keydown.enter.exact.prevent="handleSend"
      />
      <Button
        type="submit"
        size="icon-sm"
        :disabled="!draft.trim() || isSending"
        :aria-label="t('photon.panel.sendAria')"
      >
        <Send class="size-4" />
      </Button>
    </form>
  </section>
</template>

<script setup lang="ts">
// PhotonPanel -- the chat surface itself (header + conversation + suggested
// chips + composer). Always mounted only while PhotonFab.vue has it open;
// visibility of the whole Photon feature (fab + panel) is PhotonFab's call
// via usePhoton().isAvailable, not this component's -- this one assumes a
// context is already active.
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Send, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { usePhoton, type PhotonMessage } from "@/composables/usePhotonContext";
import PhotonMascot from "./PhotonMascot.vue";
import PhotonMessageList from "./PhotonMessageList.vue";
import PhotonChipRow, { type PhotonChip } from "./PhotonChipRow.vue";

const emit = defineEmits<{
  (e: "close"): void;
}>();

const { t } = useI18n();
const {
  context,
  messages,
  isSending,
  error,
  mascotExpression,
  sendMessage,
  showEvidence,
} = usePhoton();

const draft = ref("");

// Same job/file/record composite key usePhotonContext.ts uses internally
// (contextKeyOf) to decide when to reset the shared conversation --
// mirrored here, not imported, since that helper isn't exported. Watching
// this string (not `context` itself) means the unsent draft only clears on
// an actual record change, not on every unrelated recompute of the
// context getter.
const contextKey = computed(() => {
  const active = context.value;
  return active ? `${active.jobId}:${active.fileId}:${active.recordIndex}` : null;
});
watch(contextKey, () => {
  draft.value = "";
});

const recordLabel = computed(() => {
  const record = context.value?.record;
  return record?.ref ?? record?.title ?? null;
});

// The 4 chips from the plan (item 5), each shown only when the active
// record actually has the data it asks about -- a chip a record can't
// answer would just produce a generic non-answer from Photon. "why this
// metric matters / how it was calculated" has no such precondition (it's
// general domain knowledge grounded by Definition when present, but useful
// even without it), so it's the one chip always visible.
const visibleChips = computed<PhotonChip[]>(() => {
  const record = context.value?.record;
  if (!record) return [];
  const chips: PhotonChip[] = [];
  if (record.reviewStatus === "Exclude") {
    chips.push({
      id: "why-excluded",
      label: t("photon.chips.whyExcluded.label"),
    });
  }
  if (record.rawValue || record.conversionMethod) {
    chips.push({
      id: "explain-conversion",
      label: t("photon.chips.explainConversion.label"),
    });
  }
  if (record.evidence) {
    chips.push({
      id: "show-evidence",
      label: t("photon.chips.showEvidence.label"),
    });
  }
  chips.push({
    id: "why-matters",
    label: t("photon.chips.whyMatters.label"),
  });
  return chips;
});

function handleChipSelect(chip: PhotonChip) {
  // "Show me the proof" re-uses the existing evidence-jump behavior
  // (delegated to whatever the host view registered via
  // provideShowEvidenceHandler) instead of sending a chat turn -- there is
  // nothing for Photon to say here, just somewhere to look. Closing the
  // panel afterward matters, not just tidiness: on any viewport narrower
  // than the review screen's own `lg` two-column breakpoint the PDF viewer
  // sits off-screen below the detail card, and below `sm` this panel is a
  // full-screen overlay that hides the viewer entirely -- so leaving the
  // panel open made the jump look like it silently did nothing.
  if (chip.id === "show-evidence") {
    showEvidence();
    emit("close");
    return;
  }
  const promptKey =
    chip.id === "why-excluded"
      ? "photon.chips.whyExcluded.prompt"
      : chip.id === "explain-conversion"
        ? "photon.chips.explainConversion.prompt"
        : "photon.chips.whyMatters.prompt";
  void sendMessage(t(promptKey));
}

// PhotonMessageList's own retry button (shown after a failed turn) hands
// back the stuck user message; resending its content is the same action the
// composer itself would take, just re-populated from the failed turn
// instead of new input.
function handleRetry(message: PhotonMessage) {
  void sendMessage(message.content);
}

function handleSend() {
  const text = draft.value;
  if (!text.trim() || isSending.value) return;
  draft.value = "";
  void sendMessage(text);
}
</script>
