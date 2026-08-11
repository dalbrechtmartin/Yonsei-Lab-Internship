import { computed, nextTick, ref, watch, type ComputedRef, type Ref } from "vue";
import type { Input } from "@/components/ui/input";

type InputRef = InstanceType<typeof Input> | null;

/**
 * CompareDialog's title: same auto-fill/stays-in-sync-until-edited pattern
 * as GraphControls' chart title (see VisualizationView's autoChartTitle/
 * chartTitleIsAuto) -- pre-filled with a real, editable title built from the
 * compared refs, stays in sync as chips are added/removed/reordered, and
 * stops the moment the user types or explicitly clears it. Click-to-rename
 * in the footer swaps the plain text/pencil trigger for a real Input.
 *
 * `titleText` itself is owned by the caller (CompareDialog.vue), not this
 * composable -- the render/export pipeline reads it too, so it can't live
 * only here.
 */
export function useCompareTitle(deps: {
  titleText: Ref<string>;
  orderedPins: ComputedRef<{ ref: string }[]>;
  t: (key: string, params?: Record<string, unknown>) => string;
  // Owned by the caller, not this composable -- a plain-string `ref="x"`
  // template ref must be a directly-declared top-level `ref()` binding in
  // the component's own <script setup> for Vue's compiler to wire it up
  // (see useClampedMenuPosition's own doc comment for the same convention).
  titleInlineInputEl: Ref<InputRef>;
}) {
  const { titleText, orderedPins, t, titleInlineInputEl } = deps;

  const titleIsAuto = ref(true);
  const autoTitle = computed(() =>
    orderedPins.value.length > 0
      ? t("fomcharts.compare.titleAuto", { refs: orderedPins.value.map((p) => p.ref).join(", ") })
      : t("fomcharts.compare.titlePlaceholder"),
  );

  watch(orderedPins, () => {
    if (titleIsAuto.value) titleText.value = autoTitle.value;
  });

  // Click-to-rename in the footer -- editingTitleInline swaps the plain
  // text/pencil trigger for a real Input, with a × (shown only once there's
  // text) to clear it in one click. Clearing it and then committing (blur/
  // Enter) reverts to the auto-generated title rather than leaving the
  // comparison unlabeled.
  const editingTitleInline = ref(false);
  let titleTextBeforeEdit = "";
  function startEditTitleInline() {
    titleTextBeforeEdit = titleText.value;
    titleIsAuto.value = false;
    editingTitleInline.value = true;
    nextTick(() => {
      const el = titleInlineInputEl.value?.$el as HTMLInputElement | undefined;
      el?.focus();
      el?.select();
    });
  }
  function clearInlineTitle() {
    titleText.value = "";
    const el = titleInlineInputEl.value?.$el as HTMLInputElement | undefined;
    el?.focus();
  }
  function commitInlineTitle() {
    editingTitleInline.value = false;
    if (titleText.value.trim() === "") {
      titleIsAuto.value = true;
      titleText.value = autoTitle.value;
    }
  }
  function cancelInlineTitle() {
    editingTitleInline.value = false;
    titleText.value = titleTextBeforeEdit;
  }

  /** Called from the dialog's `open` watcher -- a fresh title each reopen. */
  function reset() {
    titleIsAuto.value = true;
    titleText.value = autoTitle.value;
    editingTitleInline.value = false;
  }

  return {
    autoTitle,
    editingTitleInline,
    startEditTitleInline,
    clearInlineTitle,
    commitInlineTitle,
    cancelInlineTitle,
    reset,
  };
}
