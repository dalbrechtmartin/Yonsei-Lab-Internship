// A dedicated MIME type stamped on the drag payload when a staged file
// card is being reordered -- lets both the card and its containing grid
// tell that apart from an OS file drag (e.g. dropping a new PDF straight
// onto the grid to add it) so only the former is intercepted, and the
// latter is left to bubble up to FileDropzone's own drag/drop handling
// untouched.
export const REORDER_MIME = "application/x-alens-reorder";

export function isReorderDrag(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes(REORDER_MIME) ?? false;
}
