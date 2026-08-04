import { nextTick, ref, type Ref } from "vue";

const VIEWPORT_MARGIN = 8;

/**
 * Positions a fixed, raw-coordinate context menu (a right-click point/row
 * menu built from clientX/clientY, not a Popper-based component) so it never
 * renders partially off-screen -- a menu's real size is only known once its
 * actual content (which varies: Reset/pin-guard items only show up
 * sometimes) has mounted, so `show` renders it invisible at the raw click
 * point first, measures it on the next tick, then nudges the position back
 * inside the viewport before revealing it. Avoids both a visible jump
 * (clamping only after it was already shown at the wrong spot) and a stale
 * guess (estimating a fixed size that drifts as menu content changes).
 *
 * IMPORTANT: the menu element this positions must be rendered via
 * `<Teleport to="body">`. `position: fixed` is normally viewport-relative,
 * but any ancestor with `backdrop-filter`/`filter`/`transform` (this app's
 * `backdrop-blur-xl` workspace Card, in particular) makes fixed descendants
 * relative to THAT ancestor instead -- exactly the bug this composable was
 * introduced to fix ("menu appears far from the click, off-screen"). Without
 * the Teleport, `x`/`y` here are still correct clientX/clientY viewport
 * coordinates, but the browser renders them relative to the wrong box.
 */
export function useClampedMenuPosition() {
  const menuStyle = ref<{ left: string; top: string; visibility: "hidden" | "visible" }>({
    left: "0px",
    top: "0px",
    visibility: "hidden",
  });

  // Takes the menu's own template ref REF OBJECT (not its .value) -- callers
  // declare `const menuRef = ref<HTMLElement | null>(null)` locally and bind
  // it to the menu with `ref="menuRef"`, the same plain pattern every other
  // template ref in this codebase already uses. Reading .value must happen
  // AFTER the `await nextTick()` below, not before: `show` is normally
  // called in the very same synchronous tick as setting the v-if condition
  // that mounts the menu, so a caller passing `menuRef.value` (a snapshot
  // taken before Vue has actually mounted it) would hand this function a
  // stale null that a later nextTick can't un-capture.
  const show = async (menuElRef: Ref<HTMLElement | null>, x: number, y: number) => {
    menuStyle.value = { left: `${x}px`, top: `${y}px`, visibility: "hidden" };
    await nextTick();
    const menuEl = menuElRef.value;
    if (!menuEl) return;
    const { width, height } = menuEl.getBoundingClientRect();
    const left = Math.min(Math.max(x, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerWidth - width - VIEWPORT_MARGIN));
    const top = Math.min(Math.max(y, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, window.innerHeight - height - VIEWPORT_MARGIN));
    menuStyle.value = { left: `${left}px`, top: `${top}px`, visibility: "visible" };
  };

  return { menuStyle, show };
}
