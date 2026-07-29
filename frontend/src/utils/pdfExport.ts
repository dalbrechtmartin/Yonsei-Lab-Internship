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
export async function exportGuideToPdf(root: HTMLElement, filename: string, meta: GuidePdfMeta): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pages = Array.from(root.querySelectorAll<HTMLElement>(".guide-page"));
  if (pages.length === 0) return;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  pdf.setProperties({ title: meta.title, subject: meta.title, creator: "λLens" });
  pdf.setLanguage(meta.language as Parameters<typeof pdf.setLanguage>[0]);

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);

    const outlineTitle = pages[i].dataset.outlineTitle;
    if (outlineTitle) pdf.outline.add(null, outlineTitle, { pageNumber: i + 1 });
  }

  // Second pass: clickable table-of-contents rows (elements tagged with
  // `data-toc-target="<page number>"`) become real PDF link annotations.
  // Needs every page image to already exist (pdf.link targets a page
  // number), so this runs after the loop above rather than inline with it.
  pages.forEach((pageEl, i) => {
    const links = pageEl.querySelectorAll<HTMLElement>("[data-toc-target]");
    if (links.length === 0) return;

    const pageRect = pageEl.getBoundingClientRect();
    const mmPerPxX = A4_WIDTH_MM / pageRect.width;
    const mmPerPxY = A4_HEIGHT_MM / pageRect.height;

    pdf.setPage(i + 1);
    links.forEach((linkEl) => {
      const r = linkEl.getBoundingClientRect();
      const targetPage = Number(linkEl.dataset.tocTarget);
      if (!targetPage) return;
      pdf.link(
        (r.left - pageRect.left) * mmPerPxX,
        (r.top - pageRect.top) * mmPerPxY,
        r.width * mmPerPxX,
        r.height * mmPerPxY,
        { pageNumber: targetPage },
      );
    });
  });

  pdf.save(filename);
}
