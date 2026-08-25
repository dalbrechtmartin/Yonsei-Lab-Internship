import { ref, type Ref } from "vue";
import type { DataRow } from "@/utils/columnTypes";

export interface FomChartContextMenuTarget {
  x: number;
  y: number;
  row: DataRow;
}

/**
 * Turns a right-click on a chart point into a target for PointActionsMenu
 * (see FomChart.vue's template) -- positioning and the action list/guards
 * themselves live in that shared component now; this composable only owns
 * reading the echarts click params into `{x, y, row}`.
 */
export function useFomChartContextMenu() {
  const contextMenuTarget: Ref<FomChartContextMenuTarget | null> = ref(null);

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
    contextMenuTarget.value = {
      x: native?.clientX ?? 0,
      y: native?.clientY ?? 0,
      row: params.data.row,
    };
  };

  return { contextMenuTarget, handleChartContextMenu };
}
