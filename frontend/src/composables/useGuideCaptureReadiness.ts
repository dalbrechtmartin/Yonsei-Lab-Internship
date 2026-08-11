import { onMounted, watch, type Ref } from "vue";

/**
 * downloadGuide() in HomeView.vue only knows GuideTemplate is *mounted*, not
 * that its async rings/PNG exports (captureGuideArtifacts) have actually
 * finished -- captureGuideArtifacts re-runs on every locale switch too, so a
 * download fired right after switching language could otherwise snapshot
 * pages mid-capture (missing images, rings from the previous locale).
 * Tracking the latest run's promise lets `waitUntilReady()` make that wait
 * explicit instead of relying on how much real time happens to pass first.
 */
export function useGuideCaptureReadiness(
  captureGuideArtifacts: () => Promise<void>,
  locale: Ref<string>,
) {
  let captureTask: Promise<void> = Promise.resolve();
  function scheduleCapture() {
    captureTask = captureGuideArtifacts();
  }

  onMounted(() => {
    scheduleCapture();
  });

  // Re-run on a live language switch -- see captureGuideArtifacts' own
  // comment for why a fresh capture is needed rather than relying on the
  // initial one.
  watch(locale, () => {
    scheduleCapture();
  });

  async function waitUntilReady() {
    await captureTask;
  }

  return { waitUntilReady };
}
