import { ref, type Ref } from "vue";
import { useClampedMenuPosition } from "@/composables/useClampedMenuPosition";
import { isEditedRow, type DataRow } from "@/utils/columnTypes";

/**
 * Right-clicking a chart point opens a menu with the full set of row
 * actions (Edit/Reset/Pin/Hide/Delete, same as DataPointsTable's row menu)
 * instead of acting immediately, so a stray right-click never silently
 * drops a point with no way back. Position is clamped on-screen (see
 * useClampedMenuPosition) since it's placed at the raw click point.
 */
export function useFomChartContextMenu(deps: {
  // Owned by the caller, not this composable -- a plain-string `ref="x"`
  // template ref must be a directly-declared top-level `ref()` binding in
  // the component's own <script setup> for Vue's compiler to wire it up
  // (see useClampedMenuPosition's own doc comment for the same convention).
  menuRef: Ref<HTMLElement | null>;
  isPinnedRow: (row: DataRow) => boolean;
  confirmDeleteMessage: () => string;
  onEdit: (row: DataRow) => void;
  onReset: (row: DataRow) => void;
  onPin: (row: DataRow) => void;
  onUnpin: (row: DataRow) => void;
  onHide: (row: DataRow) => void;
  onDelete: (row: DataRow) => void;
}) {
  const { menuRef } = deps;
  const contextMenuTarget: Ref<{ x: number; y: number; row: DataRow } | null> = ref(null);
  const { menuStyle, show: showContextMenu } = useClampedMenuPosition();

  const handleChartContextMenu = (params: any) => {
    if (params.componentType !== "series" || !params.data?.row) {
      contextMenuTarget.value = null;
      return;
    }
    // ECharts re-dispatches the native contextmenu event as
    // `params.event.event` -- preventDefault so the browser's own
    // right-click menu doesn't show underneath/alongside ours.
    (params.event?.event as MouseEvent | undefined)?.preventDefault();
    const native = params.event?.event as MouseEvent | undefined;
    const x = native?.clientX ?? 0;
    const y = native?.clientY ?? 0;
    contextMenuTarget.value = { x, y, row: params.data.row };
    showContextMenu(menuRef, x, y);
  };

  const confirmContextMenuEdit = () => {
    if (!contextMenuTarget.value) return;
    deps.onEdit(contextMenuTarget.value.row);
    contextMenuTarget.value = null;
  };
  const confirmContextMenuReset = () => {
    if (!contextMenuTarget.value || !isEditedRow(contextMenuTarget.value.row)) return;
    deps.onReset(contextMenuTarget.value.row);
    contextMenuTarget.value = null;
  };
  const confirmContextMenuTogglePin = () => {
    if (!contextMenuTarget.value) return;
    const row = contextMenuTarget.value.row;
    if (deps.isPinnedRow(row)) deps.onUnpin(row);
    else deps.onPin(row);
    contextMenuTarget.value = null;
  };
  const confirmContextMenuHide = () => {
    if (!contextMenuTarget.value || deps.isPinnedRow(contextMenuTarget.value.row)) return;
    deps.onHide(contextMenuTarget.value.row);
    contextMenuTarget.value = null;
  };
  // Permanent for any row now, not just manual ones -- guarded a second
  // time here (not just by the template's :disabled) since
  // contextMenuTarget's row is whatever was right-clicked, and a pinned row
  // must never be deletable out from under its own annotation.
  const confirmContextMenuDelete = () => {
    if (!contextMenuTarget.value || deps.isPinnedRow(contextMenuTarget.value.row)) return;
    if (!window.confirm(deps.confirmDeleteMessage())) return;
    deps.onDelete(contextMenuTarget.value.row);
    contextMenuTarget.value = null;
  };

  return {
    contextMenuTarget,
    menuStyle,
    handleChartContextMenu,
    confirmContextMenuEdit,
    confirmContextMenuReset,
    confirmContextMenuTogglePin,
    confirmContextMenuHide,
    confirmContextMenuDelete,
  };
}
