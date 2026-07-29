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

/** A GraphControls Filters block: the section header span sits inside its
 * own `.mb-2` wrapper, itself a sibling of the chip row -- two levels up
 * from the header text is the block that contains both. */
export function markFilterBlock(container: HTMLElement, headerText: string, pad = 6): GuideMark | null {
  const header = findByText(container, "span", headerText);
  const block = header?.parentElement?.parentElement;
  return block ? markRect(container, block, pad) : null;
}
