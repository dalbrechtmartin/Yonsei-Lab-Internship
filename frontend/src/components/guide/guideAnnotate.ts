/** A single callout ring drawn over a real, live-rendered control -- position
 * and size are measured from the actual DOM at guide-render time (see
 * markRect), never hardcoded pixels, so a callout can't drift out of place
 * just because a component's copy or spacing changes later. */
export interface GuideMark {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** Finds the first element matching `selectors` inside `container` whose
 * trimmed text content starts with `text`. Used to locate a real control by
 * its visible, translated label -- so a callout always points at whatever
 * the label currently says, in whatever language the guide is rendering. */
export function findByText(container: HTMLElement, selectors: string, text: string): HTMLElement | null {
  const needle = text.trim();
  if (!needle) return null;
  const els = Array.from(container.querySelectorAll<HTMLElement>(selectors));
  return els.find((el) => el.textContent?.trim().startsWith(needle)) ?? null;
}

/** Same idea as findByText, but matches an attribute's exact value instead of
 * visible text -- for a control whose only translated label lives in
 * aria-label rather than its own text content (e.g. AxisSelector's Y/X
 * buttons, whose visible text is just a bare "Y"/"X" badge). */
export function findByAttr(container: HTMLElement, selectors: string, attr: string, value: string): HTMLElement | null {
  const needle = value.trim();
  if (!needle) return null;
  const els = Array.from(container.querySelectorAll<HTMLElement>(selectors));
  return els.find((el) => el.getAttribute(attr)?.trim() === needle) ?? null;
}

/** `el`'s bounding box in pixels relative to `container`'s own box, padded
 * out by `pad` on every side -- the shape a callout ring needs to sit
 * snugly (not flush) around the real control it's circling. */
export function markRect(container: HTMLElement, el: HTMLElement, pad = 5): GuideMark {
  const c = container.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  return {
    top: r.top - c.top - pad,
    left: r.left - c.left - pad,
    width: r.width + pad * 2,
    height: r.height + pad * 2,
  };
}

/** A GraphControls/StatsSummaryPanel-style "label + control" row: find the
 * label by its text, then box its immediate parent row (label and control
 * are always siblings under one flex row in these components) rather than
 * just the label text itself, so the callout covers the actual switch/
 * select/button next to it too. */
export function markRow(container: HTMLElement, labelText: string, pad = 5): GuideMark | null {
  const label = findByText(container, "span", labelText);
  const row = label?.parentElement;
  return row ? markRect(container, row, pad) : null;
}

/** A GraphControls Chart-section field: the `<label>` itself already wraps
 * both the caption and its Select, so no parent walk is needed. */
export function markLabel(container: HTMLElement, labelText: string, pad = 5): GuideMark | null {
  const label = findByText(container, "label", labelText);
  return label ? markRect(container, label, pad) : null;
}

/** A single ring spanning several real elements at once -- e.g. AxisSelector's
 * Y row, X row and link/swap column, three separate controls a single figure
 * groups into one bordered block, so one ring around all of them reads
 * better than three overlapping ones. Elements are the loose family of
 * `null`s the various findByText/findByAttr lookups above already return,
 * so callers don't need to filter before passing them in. */
export function markUnion(container: HTMLElement, els: (HTMLElement | null)[], pad = 5): GuideMark | null {
  const valid = els.filter((e): e is HTMLElement => !!e);
  if (valid.length === 0) return null;
  const c = container.getBoundingClientRect();
  const rects = valid.map((e) => e.getBoundingClientRect());
  const top = Math.min(...rects.map((r) => r.top));
  const left = Math.min(...rects.map((r) => r.left));
  const right = Math.max(...rects.map((r) => r.right));
  const bottom = Math.max(...rects.map((r) => r.bottom));
  return { top: top - c.top - pad, left: left - c.left - pad, width: right - left + pad * 2, height: bottom - top + pad * 2 };
}

/** Converts a rect given in a canvas-rendered chart's own logical pixel
 * space (e.g. FomChart's getMedianLineRect/getLegendRect -- content
 * CanvasRenderer draws straight onto a `<canvas>`, with no DOM node of its
 * own to measure) into a GuideMark relative to `container`. `chartDom` is
 * the chart's real DOM node, used only to work out how much the guide has
 * visually shrunk it: comparing its rendered box (getBoundingClientRect,
 * which reflects any ancestor `transform: scale(...)`) against its layout
 * box (offsetWidth/Height, which a CSS transform never changes, and which
 * is what echarts actually renders its canvas at) gives that scale factor
 * without needing to know or hardcode it. */
export function markCanvasRect(
  container: HTMLElement,
  chartDom: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
  pad = 4,
): GuideMark {
  const c = container.getBoundingClientRect();
  const d = chartDom.getBoundingClientRect();
  const scaleX = d.width / chartDom.offsetWidth;
  const scaleY = d.height / chartDom.offsetHeight;
  const left = d.left + rect.left * scaleX;
  const top = d.top + rect.top * scaleY;
  return {
    top: top - c.top - pad,
    left: left - c.left - pad,
    width: rect.width * scaleX + pad * 2,
    height: rect.height * scaleY + pad * 2,
  };
}
