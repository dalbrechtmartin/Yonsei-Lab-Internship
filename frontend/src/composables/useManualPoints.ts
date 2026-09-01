import { computed, ref, type Ref } from "vue";
import {
  applyRowEdit,
  buildManualPointFields,
  findNotesColumn,
  findResonanceWavelengthColumn,
  findSensitivityColumn,
  MANUAL_ROW_FLAG,
  pointShape,
  POINT_SHAPE_FLAG,
  revertToOriginal,
  rowKey,
  rowsEqual,
  type DataRow,
  type PointShape,
} from "@/utils/columnTypes";

/**
 * Active Benchmarking: add/edit/reset CRUD for manually-entered data points
 * (see MANUAL_ROW_FLAG/isManualRow) -- pulled out of VisualizationView.vue
 * since this cluster only touches customPoints and the Add/Edit Point
 * dialogs, not the loaded dataset's own filters or annotations.
 */
export function useManualPoints(deps: {
  fomData: Ref<DataRow[]>;
  fomColumns: Ref<string[]>;
  customPoints: Ref<DataRow[]>;
  selectedXAxis: Ref<string | null>;
  selectedYAxis: Ref<string | null>;
  numericColumns: Ref<string[]>;
}) {
  const {
    fomData,
    fomColumns,
    customPoints,
    selectedXAxis,
    selectedYAxis,
    numericColumns,
  } = deps;

  // Curated fixed-field form for "Add data" -- always resolves against the
  // currently loaded file's real columns and the currently selected axes, so
  // a saved point is guaranteed plottable on the chart the researcher is
  // looking at right now.
  const manualPointFields = computed(() =>
    buildManualPointFields(
      fomColumns.value,
      fomData.value,
      selectedXAxis.value,
      selectedYAxis.value,
      numericColumns.value,
    ),
  );

  // Resolved independently of manualPointFields -- a field there loses its
  // labelKey the moment its column is also the chart's current X/Y axis
  // (see buildManualPointFields), so matching "the wavelength field" by
  // labelKey would miss that common case. Used by AddPointDialog to tell
  // UnitConverterPopover's "Insert" button which `values` key to write into.
  const wavelengthColumn = computed(() =>
    findResonanceWavelengthColumn(fomColumns.value),
  );
  const sensitivityColumn = computed(() =>
    findSensitivityColumn(fomColumns.value),
  );

  let manualPointSeq = 0;
  // Set once right after a point is added, read by FomChart to draw a brief
  // confirmation ring around it (see its pulseTargetRef prop) -- never reset
  // back to null here; each add uses a fresh, unique ref so the watcher
  // always fires again even without an intermediate null.
  const pulseTargetRef = ref<string | null>(null);

  // Permanent -- the only way a manually added point actually disappears for
  // good (as opposed to hideDataRow, which now applies uniformly to manual
  // and literature rows alike and is always reversible from the hidden-rows
  // list).
  const removeCustomPoint = (row: DataRow) => {
    const key = rowKey(row);
    customPoints.value = customPoints.value.filter((r) => rowKey(r) !== key);
  };

  // Builds a manual row from the dialog's raw string values, coercing
  // numeric-kind fields (see buildManualPointFields) -- everything else
  // (Domain/Origin/select values, free text) is stored as-is, already
  // matching the exact column keys the chart/filters/tooltip expect. Notes
  // is handled separately from `values`/`manualPointFields` (see
  // AddPointDialog) since it's a free note about the manual point itself,
  // not a field resolved from a real column of the loaded file -- stored
  // under whichever key the loaded file's own Notes column uses if it has
  // one (so it merges into the exact same column literature rows use), else
  // the literal "Notes" key, matched by buildAnnotation's own fallback.
  const handleAddPointSubmit = (
    values: Record<string, string>,
    label: string,
    notes: string,
    shape: PointShape,
  ) => {
    const row: DataRow = {
      [MANUAL_ROW_FLAG]: true,
      [POINT_SHAPE_FLAG]: shape,
    };
    for (const field of manualPointFields.value) {
      const raw = values[field.column];
      if (raw === undefined || raw === "") continue;
      row[field.column] = field.kind === "numeric" ? Number(raw) : raw;
    }
    if (notes.trim() !== "") {
      row[findNotesColumn(fomColumns.value) ?? "Notes"] = notes.trim();
    }
    manualPointSeq += 1;
    const generatedRef = `M${manualPointSeq}`;
    row.Ref = generatedRef;
    row.ref = generatedRef;
    row.Title = label;
    row.title = label;
    customPoints.value = [...customPoints.value, row];
    pulseTargetRef.value = generatedRef;
  };

  // Locates the actual object living in fomData/customPoints for a row
  // handed back from a click event or a table row -- vue-echarts' click
  // round-trip doesn't reliably preserve object identity, so an edit/reset
  // must re-resolve the live reference by content before mutating it.
  // Mutating that exact reference (rather than replacing it with a new
  // object) is what keeps any existing pin/hidden-row entry pointing at the
  // same point automatically -- both rely on rowsEqual, which checks
  // reference equality first.
  const findLiveRow = (row: DataRow): DataRow | null =>
    fomData.value.find((r) => rowsEqual(r, row, fomColumns.value)) ??
    customPoints.value.find((r) => rowsEqual(r, row, fomColumns.value)) ??
    null;

  const editPointDialogOpen = ref(false);
  const editingRow = ref<DataRow | null>(null);
  const editingInitialLabel = computed(() =>
    String(editingRow.value?.title ?? editingRow.value?.Title ?? ""),
  );
  const editingInitialNotes = computed(() => {
    if (!editingRow.value) return "";
    const notesCol = findNotesColumn(fomColumns.value);
    return String(editingRow.value[notesCol ?? "Notes"] ?? "");
  });
  const editingInitialShape = computed<PointShape>(() =>
    editingRow.value ? pointShape(editingRow.value) : "diamond",
  );

  const openEditDialog = (row: DataRow) => {
    editingRow.value = findLiveRow(row) ?? row;
    editPointDialogOpen.value = true;
  };

  // Same coercion as handleAddPointSubmit's create path, except a field the
  // researcher cleared back to blank must actively overwrite the row's
  // existing value (null, the same "no value" sentinel the rest of the app
  // already checks for) rather than being skipped -- skipping would leave
  // the old value in place, since Object.assign never removes a key that
  // simply isn't present in the patch.
  const handleEditPointSubmit = (
    values: Record<string, string>,
    label: string,
    notes: string,
    shape: PointShape,
  ) => {
    if (!editingRow.value) return;
    const patch: DataRow = {};
    for (const field of manualPointFields.value) {
      const raw = values[field.column];
      patch[field.column] =
        raw === undefined || raw === ""
          ? null
          : field.kind === "numeric"
            ? Number(raw)
            : raw;
    }
    patch[findNotesColumn(fomColumns.value) ?? "Notes"] = notes.trim() || null;
    patch.Title = label;
    patch.title = label;
    patch[POINT_SHAPE_FLAG] = shape;
    applyRowEdit(editingRow.value, patch);
    editPointDialogOpen.value = false;
  };

  const handleResetPoint = (row: DataRow) => {
    const liveRow = findLiveRow(row);
    if (liveRow) revertToOriginal(liveRow);
  };

  return {
    manualPointFields,
    wavelengthColumn,
    sensitivityColumn,
    pulseTargetRef,
    removeCustomPoint,
    handleAddPointSubmit,
    editPointDialogOpen,
    editingRow,
    editingInitialLabel,
    editingInitialNotes,
    editingInitialShape,
    openEditDialog,
    handleEditPointSubmit,
    handleResetPoint,
  };
}
