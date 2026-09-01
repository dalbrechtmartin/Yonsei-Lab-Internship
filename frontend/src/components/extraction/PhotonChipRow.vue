<template>
  <div
    class="photon-chip-row flex gap-1.5 overflow-x-auto px-0.5 py-0.5"
    role="group"
    :aria-label="ariaLabel ?? t('photon.chips.ariaLabel')"
  >
    <button
      v-for="chip in chips"
      :key="chip.id"
      type="button"
      class="shrink-0 whitespace-nowrap rounded-full border border-secondary/20 bg-secondary/6 px-3 py-1.5 text-[12.5px] font-medium text-ink transition-colors hover:border-primary/30 hover:bg-primary/8 disabled:pointer-events-none disabled:opacity-40"
      :disabled="disabled || chip.disabled"
      @click="emit('select', chip)"
    >
      {{ chip.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
// Photon assistant (mentor plan item 5) -- a single horizontally-scrolling
// row of suggested-question chips, shown above the message composer in
// PhotonPanel.vue (see its `visibleChips`, which picks from the plan's 4
// Review-context chips based on what the active record actually has data
// for). Purely presentational: the full chip is emitted back on click, and
// PhotonPanel decides the action -- for most chips, sending a canned
// prompt, but "show-evidence" instead jumps the PDF viewer via
// usePhoton().showEvidence() and sends nothing, so this component cannot
// hardcode "click = send a message" itself. `disabled` is driven entirely
// by the host panel (it passes usePhoton().isSending), so a reply in
// flight grays out the whole row without this component needing its own
// composable dependency.
import { useI18n } from "vue-i18n";

export interface PhotonChip {
  id: string;
  label: string;
  /** Disables just this one chip (e.g. "show evidence" with no source on
   * the current record) without graying out the whole row. */
  disabled?: boolean;
}

withDefaults(
  defineProps<{
    chips: PhotonChip[];
    /** Disables the whole row, e.g. while a reply is in flight and a
     * second question would race the first (see PhotonPanel.vue, which
     * passes its own isSending here). */
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  { disabled: false, ariaLabel: undefined },
);

const emit = defineEmits<{ select: [chip: PhotonChip] }>();

const { t } = useI18n();
</script>

<style scoped>
/* Slim, low-contrast scrollbar for the horizontal chip strip -- a mouse-drag
   or trackpad swipe works without it, this just keeps a stray scrollbar
   from fighting the compact chip row visually. Firefox + WebKit only; any
   other engine just keeps its default scrollbar, which is harmless here. */
.photon-chip-row {
  scrollbar-width: thin;
}
.photon-chip-row::-webkit-scrollbar {
  height: 5px;
}
.photon-chip-row::-webkit-scrollbar-thumb {
  background-color: var(--secondary);
  opacity: 0.25;
  border-radius: 9999px;
}
</style>
