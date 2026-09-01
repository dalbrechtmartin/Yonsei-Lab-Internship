import { onBeforeUnmount, onMounted, ref, type Ref } from "vue";
import type VChart from "vue-echarts";

// Zoom is entirely home-grown rather than ECharts' default dataZoom-inside
// wheel handling: the built-in handler scales the zoom step by the
// browser's own wheel delta, which is wildly inconsistent across mice and
// trackpads -- a light trackpad flick could jump several zoom levels at
// once. Reading only the wheel event's *direction*, never its magnitude,
// gives every notch the same small, predictable step regardless of the
// input device. The +/- buttons reuse the same zoomBy step function with a
// bigger, single-click-sized step.
const WHEEL_ZOOM_STEP = 0.06;
const BUTTON_ZOOM_STEP = 0.18;
const ZOOM_ANIM_MS = 180;

/**
 * FomChart's home-grown zoom: a clamped step function animated over a few
 * frames (chartOption sets animation: false globally, so a dataZoom step
 * needs its own tween or it'd jump instantly), plus a lock toggle and the
 * wheel listener that drives it. Owns and self-cleans its wheel listener and
 * animation frame, same pattern as useToastQueue's timer.
 */
export function useFomChartZoom(chartRef: Ref<InstanceType<typeof VChart> | null>) {
  // Toggled by the lock button next to the zoom controls -- guards the wheel
  // listener and the +/- buttons so an accidental scroll-wheel notch over
  // the chart (the most common complaint: scrolling the page while the
  // cursor happens to pass over the plot) can't change the zoom window.
  const zoomLocked = ref(true);

  // Windows Chrome has a known bug where the hardware mouse cursor stops
  // being redrawn over a <canvas> after a burst of non-passive `wheel`
  // events with preventDefault() (see handleWheelZoom below) -- exactly
  // what each zoom step does. The cursor is still tracked correctly (hover/
  // tooltip keep working), it's only the OS-drawn icon that goes invisible.
  // Toggling the DOM node's CSS `cursor` property forces the browser to
  // recompute and repaint it, so nudge it once the zoom settles.
  const nudgeCursor = () => {
    const dom = chartRef.value?.getDom();
    if (!dom) return;
    dom.style.cursor = "none";
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        dom.style.cursor = "";
      }),
    );
  };

  let zoomAnimFrame: number | null = null;
  const animateZoomTo = (targetStart: number, targetEnd: number) => {
    const inst = chartRef.value;
    if (!inst) return;
    const dz = (inst.getOption() as any)?.dataZoom?.[0];
    const fromStart = dz?.start ?? 0;
    const fromEnd = dz?.end ?? 100;
    if (zoomAnimFrame !== null) cancelAnimationFrame(zoomAnimFrame);
    const startTime = performance.now();
    const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / ZOOM_ANIM_MS);
      const e = easeOutCubic(t);
      inst.dispatchAction({
        type: "dataZoom",
        start: fromStart + (targetStart - fromStart) * e,
        end: fromEnd + (targetEnd - fromEnd) * e,
      });
      if (t < 1) {
        zoomAnimFrame = requestAnimationFrame(step);
      } else {
        zoomAnimFrame = null;
        nudgeCursor();
      }
    };
    zoomAnimFrame = requestAnimationFrame(step);
  };

  // Always zooms around the CURRENT window's own center rather than the
  // cursor position -- simpler, and keeps the wheel and the +/- buttons
  // behaving identically instead of the wheel suddenly recentering on
  // wherever the pointer happens to be. Reads the window mid-animation (its
  // own live dataZoom option) rather than the animation's final target, so
  // a fast run of wheel notches keeps accelerating smoothly instead of each
  // new notch snapping back to where the previous one had only tweened to.
  const zoomBy = (fraction: number) => {
    if (zoomLocked.value) return;
    const inst = chartRef.value;
    if (!inst) return;
    const dz = (inst.getOption() as any)?.dataZoom?.[0];
    if (!dz) return;
    const start = dz.start ?? 0;
    const end = dz.end ?? 100;
    const span = end - start;
    const newSpan = Math.min(100, Math.max(2, span * (1 - fraction)));
    const center = (start + end) / 2;
    let newStart = center - newSpan / 2;
    let newEnd = center + newSpan / 2;
    if (newStart < 0) {
      newEnd -= newStart;
      newStart = 0;
    }
    if (newEnd > 100) {
      newStart -= newEnd - 100;
      newEnd = 100;
    }
    animateZoomTo(Math.max(0, newStart), Math.min(100, newEnd));
  };
  const zoomIn = () => zoomBy(BUTTON_ZOOM_STEP);
  const zoomOut = () => zoomBy(-BUTTON_ZOOM_STEP);
  const resetZoom = () => animateZoomTo(0, 100);

  const handleWheelZoom = (event: WheelEvent) => {
    // Locked: let the wheel event through untouched so the page scrolls
    // normally instead of being swallowed by a chart that won't zoom anyway.
    if (zoomLocked.value) return;
    event.preventDefault();
    zoomBy(event.deltaY < 0 ? WHEEL_ZOOM_STEP : -WHEEL_ZOOM_STEP);
  };

  // A native listener, not a `@wheel` template binding -- vue-echarts only
  // re-emits ECharts' own named chart events, it doesn't forward arbitrary
  // native DOM events like a plain Vue component would, so `@wheel` on
  // <v-chart> would never fire.
  //
  // Registered on the CAPTURE phase, not bubble -- zrender binds its own
  // wheel listener directly on the canvas (a descendant of this wrapper),
  // which would otherwise see a real wheel event before it ever bubbled up
  // to a bubble-phase listener here. Deliberately NOT calling
  // stopPropagation, though: zoomOnMouseWheel: false already keeps zrender
  // from *acting* on the event once it does see it, and stopping it
  // outright risked starving zrender of a raw wheel event its broader
  // gesture tracking may still depend on for unrelated interactions (e.g.
  // click).
  onMounted(() => {
    chartRef.value?.getDom()?.addEventListener("wheel", handleWheelZoom, {
      passive: false,
      capture: true,
    });
  });
  onBeforeUnmount(() => {
    chartRef.value?.getDom()?.removeEventListener("wheel", handleWheelZoom, {
      capture: true,
    });
    if (zoomAnimFrame !== null) cancelAnimationFrame(zoomAnimFrame);
  });

  return { zoomLocked, zoomIn, zoomOut, resetZoom };
}
