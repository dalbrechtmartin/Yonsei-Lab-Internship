const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

/** Renders an off-screen DOM node's `.guide-page` children to an A4 PDF, one
 * page per element, and downloads it -- must be called from a user gesture
 * (e.g. a button click), same constraint as `saveBlobWithPicker`.
 *
 * Uses html2canvas-pro rather than plain html2canvas: Tailwind v4's
 * opacity-modifier utilities (e.g. `bg-primary/10`) compile to
 * `color-mix(in oklab, ...)`, which the unmaintained html2canvas can't
 * parse and silently aborts on -- html2canvas-pro is the maintained fork
 * that understands oklch/oklab/color-mix. */
export async function exportGuideToPdf(root: HTMLElement, filename: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const pages = Array.from(root.querySelectorAll<HTMLElement>(".guide-page"));
  if (pages.length === 0) return;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  }

  pdf.save(filename);
}
