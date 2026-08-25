<template>
  <!-- Teleported to <body> -- both call sites sit inside the workspace
       Card's backdrop-blur, which (like any filter/backdrop-filter/transform
       ancestor) makes `position: fixed` descendants relative to ITS box
       instead of the viewport, silently breaking clientX/clientY-based
       positioning. -->
  <Teleport to="body">
    <div
      v-if="target"
      class="fixed inset-0 z-40"
      @click="target = null"
      @contextmenu.prevent="target = null"
    />
    <div
      v-if="target"
      ref="menuRef"
      class="fixed z-50 min-w-36 rounded-md border border-secondary/15 bg-popover p-1 shadow-lg"
      :style="menuStyle"
    >
      <button
        type="button"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
        @click="runAction((row) => emit('edit', row))"
      >
        <Pencil class="size-3 text-muted-foreground" />
        {{ t("fomcharts.pointsTable.edit") }}
      </button>
      <button
        v-if="isEditedRow(target.row)"
        type="button"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
        @click="runAction((row) => emit('reset', row))"
      >
        <RotateCcw class="size-3 text-muted-foreground" />
        {{ t("fomcharts.pointsTable.resetPoint") }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] hover:bg-secondary/10"
        :class="
          isPinnedRow(target.row) ? 'bg-amber-50 text-amber-700' : 'text-ink'
        "
        @click="runAction((row) => emit('toggle-pin', row))"
      >
        <Pin
          class="size-3"
          :class="
            isPinnedRow(target.row)
              ? 'fill-amber-600 text-amber-600'
              : 'text-muted-foreground'
          "
        />
        {{
          isPinnedRow(target.row)
            ? t("fomcharts.pointsTable.unpin")
            : t("fomcharts.pointsTable.pin")
        }}
      </button>

      <div class="my-0.5 h-px bg-secondary/10" />

      <div
        v-if="isPinnedRow(target.row)"
        class="mb-0.5 flex items-start gap-1 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800"
      >
        <TriangleAlert class="mt-0.5 size-3 shrink-0" />
        <span>{{ t("fomcharts.pointsTable.pinGuardHint") }}</span>
      </div>

      <button
        type="button"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink transition hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        :disabled="isPinnedRow(target.row)"
        @click="runAction(guardedToggleHide)"
      >
        <EyeOff v-if="!isHiddenRow(target.row)" class="size-3 text-muted-foreground" />
        <Eye v-else class="size-3 text-muted-foreground" />
        {{
          isHiddenRow(target.row)
            ? t("fomcharts.pointsTable.unhide")
            : t("fomcharts.pointsTable.hide")
        }}
      </button>
      <button
        type="button"
        class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        :disabled="isPinnedRow(target.row)"
        @click="runAction(guardedConfirmDelete)"
      >
        <Trash2 class="size-3" />
        {{ t("fomcharts.pointsTable.deletePermanently") }}
      </button>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
// Right-click row-action menu shared by FomChart's on-chart context menu and
// DataPointsTable's row menu -- both offered the exact same Edit/Reset/Pin/
// Hide/Delete action set on a single DataRow before this was extracted, one
// maintained (and kept in sync) twice. Owns its own positioning
// (useClampedMenuPosition) and closes itself (target -> null) on an outside
// click/contextmenu or once any action runs -- opening the menu is just
// setting the v-model target, no separate `show()` call needed from the
// caller.
//
// DataPointsTable's separate GROUP menu (Pin/Hide/"show only" applied to
// every row in a Ref group at once) is deliberately NOT folded in here --
// its action set and DataRow[] (not DataRow) target are different enough
// that merging would need as much parameterization as just leaving it its
// own thing.
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Pencil,
  RotateCcw,
  Pin,
  TriangleAlert,
  EyeOff,
  Eye,
  Trash2,
} from "@lucide/vue";
import { useClampedMenuPosition } from "@/composables/useClampedMenuPosition";
import { isEditedRow, type DataRow } from "@/utils/columnTypes";

export interface PointActionsMenuTarget {
  x: number;
  y: number;
  row: DataRow;
}

const target = defineModel<PointActionsMenuTarget | null>("target", {
  default: null,
});

const props = defineProps<{
  isPinnedRow: (row: DataRow) => boolean;
  // Omitted for a menu whose target is always currently-visible (FomChart's
  // on-chart menu never targets an already-hidden row, since a hidden row
  // isn't drawn to begin with) -- the Hide button then always reads as
  // one-way "Hide" rather than gaining an "Unhide" state it never had.
  isHiddenRow?: (row: DataRow) => boolean;
}>();

const emit = defineEmits<{
  edit: [row: DataRow];
  reset: [row: DataRow];
  "toggle-pin": [row: DataRow];
  "toggle-hide": [row: DataRow];
  delete: [row: DataRow];
}>();

const { t } = useI18n();

const isHiddenRow = (row: DataRow): boolean => props.isHiddenRow?.(row) ?? false;

const menuRef = ref<HTMLElement | null>(null);
const { menuStyle, show } = useClampedMenuPosition();

// Positions itself the moment a caller opens the menu (sets target via
// v-model) -- see useClampedMenuPosition's own doc comment for why this is a
// measure-then-reveal dance rather than a synchronous placement.
watch(
  () => target.value,
  (next) => {
    if (next) show(menuRef, next.x, next.y);
  },
);

// Takes the action as a callback (rather than reading target.value.row
// inside every handler) so template call sites never need a non-null
// assertion on a model that's only known non-null via the surrounding v-if.
const runAction = (action: (row: DataRow) => void) => {
  if (!target.value) return;
  action(target.value.row);
  target.value = null;
};

// Hide/Delete stay guarded here too, not just via the template's :disabled --
// a pinned row must never be hidden/deleted out from under its own
// annotation, defense in depth against a stray click somehow still reaching
// a disabled button.
const guardedToggleHide = (row: DataRow) => {
  if (props.isPinnedRow(row)) return;
  emit("toggle-hide", row);
};
const guardedConfirmDelete = (row: DataRow) => {
  if (props.isPinnedRow(row)) return;
  if (!window.confirm(t("fomcharts.pointsTable.deleteConfirm"))) return;
  emit("delete", row);
};
</script>
