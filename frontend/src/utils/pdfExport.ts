const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

export interface GuidePdfMeta {
  /** PDF document Title/Subject metadata, and the outline (bookmarks) root label. */
  title: string;
  /** BCP-47 language tag (e.g. "en", "fr", "ko", "zh") -- stored in the PDF's
   * document catalog so assistive tools know how to announce its content. */
  language: string;
}

/** Renders an off-screen DOM node's `.guide-page` children to an A4 PDF, one
 * page per element, and downloads it -- must be called from a user gesture
 * (e.g. a button click), same constraint as `saveBlobWithPicker`.
 *
 * Uses html2canvas-pro rather than plain html2canvas: Tailwind v4's
 * opacity-modifier utilities (e.g. `bg-primary/10`) compile to
 * `color-mix(in oklab, ...)`, which the unmaintained html2canvas can't
 * parse and silently aborts on -- html2canvas-pro is the maintained fork
 * that understands oklch/oklab/color-mix.
 *
 * Each page is still a flattened raster image (jsPDF has no way to embed a
 * real CJK-capable text layer without shipping a multi-MB embedded font, out
 * of scope here), so this can't be a fully tagged/screen-reader PDF -- but
 * every page carries a translated document title/language and a bookmark
 * (see the `data-outline-title` attribute on each `.guide-page`), so a
 * low-vision reader can at least navigate it via their PDF viewer's outline
 * panel and zoom the page images without hunting through unlabeled pages. */
export async function exportGuideToPdf(
  root: HTMLElement,
  filename: string,
  meta: GuidePdfMeta,
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pages = Array.from(root.querySelectorAll<HTMLElement>(".guide-page"));
  if (pages.length === 0) return;

  // html2canvas re-implements text layout on its own canvas rather than
  // reusing the browser's rendering, so it only matches the live DOM once
  // every custom font has actually finished loading -- capturing a page
  // while a web font is still swapping in (FOUT) rasterizes text at
  // slightly different metrics/position than what getBoundingClientRect
  // reports for that same text a moment later. That mismatch between the
  // PICTURE a reader sees and the LINK HOTSPOT measured from the live DOM
  // (see addLink below) is exactly what makes a link's clickable area read
  // as offset from its visible text. Waiting for `document.fonts.ready`
  // first removes that source of drift for every page at once.
  await document.fonts.ready;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.setProperties({
    title: meta.title,
    subject: meta.title,
    creator: "λLens",
  });
  pdf.setLanguage(meta.language as Parameters<typeof pdf.setLanguage>[0]);

  // Link annotations are added in the SAME pass as each page's image, right
  // after that page is captured -- not in a separate pass once every page
  // has already been rasterized. A second pass re-measures
  // getBoundingClientRect() at a later point in time, which is only safe if
  // nothing on the page could have shifted between the two passes; keeping
  // capture and measurement together removes that assumption entirely.
  for (let i = 0; i < pages.length; i++) {
    const pageEl = pages[i];
    const canvas = await html2canvas(pageEl, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

    const outlineTitle = pageEl.dataset.outlineTitle;
    if (outlineTitle)
      pdf.outline.add(null, outlineTitle, { pageNumber: i + 1 });

    // Clickable table-of-contents rows (elements tagged with
    // `data-toc-target="<page number>"`) become real PDF link annotations,
    // and elements tagged with `data-external-link="<path>"` (e.g. the
    // sample dataset download on the Import page) become clickable links
    // out to the live app's own origin -- resolved at export time rather
    // than baked in, so the PDF always points at wherever this build is
    // actually hosted.
    const tocLinks = pageEl.querySelectorAll<HTMLElement>("[data-toc-target]");
    const externalLinks = pageEl.querySelectorAll<HTMLElement>(
      "[data-external-link]",
    );
    if (tocLinks.length === 0 && externalLinks.length === 0) continue;

    const pageRect = pageEl.getBoundingClientRect();
    const mmPerPxX = A4_WIDTH_MM / pageRect.width;
    const mmPerPxY = A4_HEIGHT_MM / pageRect.height;

    // html2canvas re-implements text layout on its own canvas rather than
    // reusing the browser's text engine, so the glyphs it rasterizes for a
    // reader to click near can land a couple of px off from where
    // getBoundingClientRect (measured from the live DOM) says that text is
    // -- a known html2canvas limitation, not something document.fonts.ready
    // alone fixes. Padding every hotspot out by a fixed margin on all four
    // sides absorbs that drift directly: the target keeps its true visual
    // position, but the clickable zone around it becomes more forgiving
    // than the tight text bounds, so a click near the visible link still
    // lands inside it.
    const LINK_PAD_MM = 1.5;
    const addLink = (
      el: HTMLElement,
      target: { pageNumber: number } | { url: string },
    ) => {
      const r = el.getBoundingClientRect();
      pdf.link(
        (r.left - pageRect.left) * mmPerPxX - LINK_PAD_MM,
        (r.top - pageRect.top) * mmPerPxY - LINK_PAD_MM,
        r.width * mmPerPxX + 2 * LINK_PAD_MM,
        r.height * mmPerPxY + 2 * LINK_PAD_MM,
        target,
      );
    };
    tocLinks.forEach((linkEl) => {
      const targetPage = Number(linkEl.dataset.tocTarget);
      // Every PAGE_* constant behind data-toc-target is a hand-maintained
      // GuideTemplate.vue literal -- nothing here re-derives it from actual
      // DOM order, so a page inserted/reordered without updating every
      // downstream constant would otherwise silently mislink the TOC to the
      // wrong page (or one that doesn't exist) instead of failing loudly.
      if (!targetPage || targetPage < 1 || targetPage > pages.length) {
        console.warn(
          `Guide PDF: ignoring data-toc-target="${linkEl.dataset.tocTarget}" -- out of range for a ${pages.length}-page document.`,
        );
        return;
      }
      addLink(linkEl, { pageNumber: targetPage });
    });
    externalLinks.forEach((linkEl) => {
      const path = linkEl.dataset.externalLink;
      if (path)
        addLink(linkEl, {
          url: new URL(path, window.location.origin).toString(),
        });
    });
  }

  pdf.save(filename);
}
