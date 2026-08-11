import { computed, ref, type Ref, type WritableComputedRef } from "vue";
import {
  findEvidenceColumn,
  findNotesColumn,
  rowKey,
  rowsEqual,
  type DataRow,
} from "@/utils/columnTypes";
import type { Annotation } from "@/components/visualization/AnnotationsPanel.vue";

/**
 * Pin/unpin CRUD for chart annotations -- a lightweight, session-only
 * bookmark of specific rows (no persistence, no backend round-trip), pulled
 * out of VisualizationView.vue since this cluster only touches the
 * annotations list itself, not the loaded dataset or manual points.
 */
export function useAnnotationPins(deps: {
  fomColumns: Ref<string[]>;
  hiddenRows: Ref<DataRow[]>;
  annotationsPanelOpen: WritableComputedRef<boolean>;
}) {
  const { fomColumns, hiddenRows, annotationsPanelOpen } = deps;

  const annotations = ref<Annotation[]>([]);
  let annotationSeq = 0;

  // Rows are the same PIN candidate either when they're the exact same
  // object (re-clicking/re-pinning the identical record -- filtering/mapping
  // never clones rows, so reference equality already catches this) OR when
  // every column value matches (two genuinely duplicate rows in the source
  // data, e.g. the same paper/mode listed twice) -- without the second
  // check, two such rows look pinned twice for "the same point" even though
  // they're technically distinct row objects. See utils/columnTypes.ts's
  // rowsEqual.
  const sameRow = (a: DataRow, b: DataRow): boolean =>
    rowsEqual(a, b, fomColumns.value);
  const isAlreadyPinned = (row: DataRow) =>
    annotations.value.some((a) => sameRow(a.row, row));

  // FomChart's pinnedRows prop -- keeps a pinned point's on-chart ref label
  // visible even outside hover/isolation (see its withItemStyle).
  const pinnedRows = computed(() => annotations.value.map((a) => a.row));

  // Pre-fills a new annotation's note with whatever the Excel already says
  // about this record (Notes, then the Evidence quote) instead of only
  // surfacing that text in the chart's hover tooltip -- a note is a place to
  // actually read it, not a popup that has to stay short. Shared by
  // handlePointClick (one row) and pinRows (several at once, e.g. "pin the
  // other modes of this paper") so both build annotations the same way.
  const buildAnnotation = (row: DataRow): Annotation => {
    // Falls back to the literal "Notes" key when the loaded file has no
    // Notes column of its own -- the only way a manually added point's note
    // can still get here, since it was never part of `fomColumns` to begin
    // with.
    const notesCol = findNotesColumn(fomColumns.value);
    const evidenceCol = findEvidenceColumn(fomColumns.value);
    const notesText = String(row[notesCol ?? "Notes"] ?? "").trim();
    const evidenceText = evidenceCol
      ? String(row[evidenceCol] ?? "").trim()
      : "";
    const prefilledNote = [notesText, evidenceText]
      .filter(Boolean)
      .join("\n\n");
    const ref = String(row.ref ?? row.Ref ?? "");
    return {
      id: `${ref}-${annotationSeq++}`,
      ref,
      title: String(row.title ?? row.Title ?? ""),
      row,
      note: prefilledNote,
      createdAt: Date.now(),
    };
  };

  // Pinning is a lightweight, session-only bookmark -- no persistence, no
  // backend round-trip. Re-clicking the same (or a content-identical) point
  // is a no-op rather than stacking duplicate pins.
  const handlePointClick = (point: {
    ref: string;
    xLabel: string;
    xValue: unknown;
    yLabel: string;
    yValue: unknown;
    extras: Record<string, unknown>;
    row: DataRow;
  }) => {
    if (isAlreadyPinned(point.row)) return;
    const newAnnotation = buildAnnotation(point.row);
    annotations.value = [...annotations.value, newAnnotation];
    // Pinning a point is the whole point of clicking the chart -- open the
    // Annotations panel automatically so the researcher immediately sees the
    // pin land, instead of having to know to expand the accordion themselves.
    annotationsPanelOpen.value = true;
  };

  // "Épingler aussi les N autres points de cet article" (AnnotationsPanel,
  // per pinned card) -- pins every given row in one go instead of making the
  // researcher click each overlapping mode individually on the chart.
  // openPanel defaults to true (jumping to the Annotations panel is exactly
  // the point when a chart click or a "pin siblings" shortcut lands a new
  // pin), but DataPointsTable's own "Épingler" menu action opts out of it --
  // pinning is now visible directly in that panel too (its own "Épinglés"
  // group), so switching the sidebar away from under the researcher there
  // would only lose their place for no benefit.
  const pinRows = (
    rows: DataRow[],
    { openPanel = true }: { openPanel?: boolean } = {},
  ) => {
    const newAnnotations: Annotation[] = [];
    for (const row of rows) {
      // Also guard within this same batch -- siblingsFor can otherwise offer
      // several source rows that are themselves content-duplicates of each
      // other, which would pin the same-looking point more than once in a
      // single click.
      if (
        isAlreadyPinned(row) ||
        newAnnotations.some((a) => sameRow(a.row, row))
      )
        continue;
      newAnnotations.push(buildAnnotation(row));
    }
    if (newAnnotations.length === 0) return;
    annotations.value = [...annotations.value, ...newAnnotations];
    // Pinned rows must never be hidden (Hide is disabled in the panel/menu
    // the moment a row is pinned) -- but a row can arrive here already
    // hidden, e.g. pinned from DataPointsTable's Masqués filter, so enforce
    // the invariant here too. Otherwise it lingers in hiddenRows: still
    // counted by the Masqués chip, yet unreachable there since Épinglés
    // always takes pinned rows out of that filtered list, and its own eye
    // toggle is disabled while pinned -- a hidden row with no way left to
    // unhide it.
    const newlyPinnedKeys = new Set(newAnnotations.map((a) => rowKey(a.row)));
    hiddenRows.value = hiddenRows.value.filter(
      (r) => !newlyPinnedKeys.has(rowKey(r)),
    );
    if (openPanel) annotationsPanelOpen.value = true;
  };

  const removeAnnotation = (id: string) => {
    annotations.value = annotations.value.filter((a) => a.id !== id);
  };

  // DataPointsTable's "Désépingler" menu action -- same removal as
  // removeAnnotation, just keyed by row (what that panel has) instead of
  // annotation id (which it deliberately doesn't need to know about).
  const unpinRow = (row: DataRow) => {
    annotations.value = annotations.value.filter((a) => !sameRow(a.row, row));
  };

  // DataPointsTable's group context menu "Désépingler" -- same removal as
  // unpinRow, applied to every row of the (already all-pinned) group at once.
  const unpinRows = (rows: DataRow[]) => {
    annotations.value = annotations.value.filter(
      (a) => !rows.some((row) => sameRow(a.row, row)),
    );
  };

  const clearAnnotations = () => {
    annotations.value = [];
  };

  const updateAnnotationNote = (id: string, note: string) => {
    annotations.value = annotations.value.map((a) =>
      a.id === id ? { ...a, note } : a,
    );
  };

  return {
    annotations,
    sameRow,
    pinnedRows,
    handlePointClick,
    pinRows,
    removeAnnotation,
    unpinRow,
    unpinRows,
    clearAnnotations,
    updateAnnotationNote,
  };
}
