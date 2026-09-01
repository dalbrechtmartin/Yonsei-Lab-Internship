import { ref } from "vue";

/** Live height of AppFooter, in px. ToastStack reads this to sit above the
 * footer instead of covering it, without hardcoding a footer height that
 * would drift out of sync (locale text wrap, font changes, etc). */
export const footerHeightPx = ref(0);
