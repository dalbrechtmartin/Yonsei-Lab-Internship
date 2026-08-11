import { computed, ref, type Ref, type WritableComputedRef } from "vue";

/**
 * A named-tab accordion where only one panel is ever open at a time -- a
 * single source of truth (`active`) drives every panel's own v-model:open,
 * so opening one panel auto-closes whichever other one a plain per-panel
 * ref would otherwise leave open alongside it. Each `panel(key)` call
 * returns a writable computed suitable for `v-model:open` directly.
 */
export function useAccordionPanel<T extends string>(initial: T | null = null) {
  const active = ref(initial) as Ref<T | null>;
  const panel = (key: T): WritableComputedRef<boolean> =>
    computed({
      get: () => active.value === key,
      set: (open: boolean) => {
        active.value = open ? key : active.value === key ? null : active.value;
      },
    });
  return { active, panel };
}
