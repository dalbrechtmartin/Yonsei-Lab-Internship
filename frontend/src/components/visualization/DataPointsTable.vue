<template>
  <TooltipProvider :delay-duration="200">
    <CollapsibleSection v-model:open="open">
      <template #title>
        <span class="flex items-center gap-1.5">
          {{ t("fomcharts.pointsTable.title") }}
        </span>
      </template>
      <template #header-suffix>
        <span class="font-mono text-[11px] font-normal text-muted-foreground">{{
          rows.length + hiddenRows.length
        }}</span>
      </template>

      <div
        class="mt-2.5 rounded-[10px] border border-secondary/15 bg-secondary/5 p-3"
      >
        <!-- Filter chips (Tout/Visibles/Masqués) replace the old separate
             "hidden rows" disclosure at the bottom -- one filterable list
             instead of two, and the counts double as an at-a-glance summary
             the way the header count alone couldn't. Kept on their own line
             -- chips + sort + "+ Ajouter" all on one row (the original
             layout) overflowed the sidebar once French labels ("Visibles",
             "Masqués") ran long enough, silently clipping the add button off
             the edge. Search shares the second line with sort/add instead of
             getting a third line of its own: the input just shrinks (flex-1
             + min-w-0) to make room for the two icon buttons pinned after it. -->
        <div
          v-if="hasAnyRows"
          class="mb-1.5 flex flex-wrap items-center gap-1.5"
        >
          <button
            v-for="f in filterOptions"
            :key="f.key"
            type="button"
            class="shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-semibold transition"
            :class="
              activeFilter === f.key
                ? 'bg-primary text-primary-foreground'
                : 'border border-secondary/25 text-secondary hover:bg-secondary/5'
            "
            @click="activeFilter = f.key"
          >
            {{ f.label }} {{ f.count }}
          </button>
        </div>

        <!-- Only worth a toggle once there's actually a manually added point
             on the chart to include/exclude -- see VisualizationView's
             includeCustomInStats, shared with FomChart's own overlays. -->
        <div
          v-if="hasManualRows"
          class="mb-1.5 flex items-center justify-between gap-2 rounded-md border border-secondary/15 bg-card px-2.5 py-1.5"
        >
          <span class="flex min-w-0 items-center gap-1 text-[10.5px] text-ink">
            <InfoTooltip :text="t('fomcharts.addPoint.includeInStatsHint')" />
            <span class="truncate">{{
              t("fomcharts.addPoint.includeInStats")
            }}</span>
          </span>
          <Switch v-model="includeCustomInStats" class="shrink-0" />
        </div>

        <div class="mb-2 flex items-center gap-1.5">
          <label v-if="hasAnyRows" class="relative min-w-0 flex-1">
            <Search
              class="pointer-events-none absolute top-1/2 left-2 size-3 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              v-model="searchQuery"
              type="text"
              :placeholder="t('fomcharts.pointsTable.searchPlaceholder')"
              class="h-7 bg-card pr-6.5 pl-6.5 text-[11.5px]"
            />
            <button
              v-if="searchQuery"
              type="button"
              class="absolute top-1/2 right-1.5 flex size-4 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-secondary/10 hover:text-ink"
              :aria-label="t('fomcharts.pointsTable.clearSearch')"
              @click="searchQuery = ''"
            >
              <X class="size-3" />
            </button>
          </label>
          <span v-else class="flex-1" />
          <DropdownMenu v-if="hasAnyRows">
            <DropdownMenuTrigger as-child>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="shrink-0 text-secondary hover:bg-secondary/10 hover:text-ink"
                :aria-label="t('fomcharts.pointsTable.sortLabel')"
              >
                <ArrowUpDown class="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                v-for="opt in sortOptions"
                :key="opt.value"
                :class="
                  sort === opt.value
                    ? 'bg-primary/8 font-semibold text-primary'
                    : ''
                "
                @select="sort = opt.value"
              >
                {{ opt.label }}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger as-child>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                class="shrink-0 text-primary hover:bg-primary/8 hover:text-primary/80"
                :aria-label="t('fomcharts.addPoint.toolbarButton')"
                @click="$emit('add-point')"
              >
                <Plus class="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{{
              t("fomcharts.addPoint.toolbarButton")
            }}</TooltipContent>
          </Tooltip>
        </div>

        <!-- Rows are grouped by reference (one group per source paper/record,
             titled with its own display title) exactly like every prior
             iteration of this panel's design explored -- "Épinglés" is just
             another group in the same list, always first, pulling every
             pinned row out of its normal group so it never goes missing
             behind a group collapse or the Masqués filter (see groups /
             pinnedRowsFiltered below). Group order otherwise follows
             whichever row would sort first under the active sort mode. -->
        <div
          v-if="groups.length > 0"
          class="flex max-h-88 flex-col gap-1 overflow-x-hidden overflow-y-auto"
        >
          <div v-for="group in groups" :key="group.key">
            <button
              type="button"
              class="flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left select-none"
              :class="
                group.pinned
                  ? 'bg-amber-50/70 hover:bg-amber-50'
                  : 'hover:bg-card'
              "
              @click="toggleGroup(group.key)"
              @contextmenu.prevent="openGroupMenu($event, group)"
            >
              <ChevronDown
                class="size-3 shrink-0 transition-transform duration-200"
                :class="[
                  isGroupCollapsed(group.key) ? '-rotate-90' : 'rotate-0',
                  group.pinned ? 'text-amber-700' : 'text-secondary',
                ]"
              />
              <Pin
                v-if="group.pinned"
                class="size-2.5 shrink-0 fill-amber-600 text-amber-600"
              />
              <span
                class="min-w-0 flex-1 truncate text-[11.5px] font-semibold"
                :class="group.pinned ? 'text-amber-800' : 'text-ink'"
              >
                {{ group.label }}
              </span>
              <InfoTooltip
                v-if="group.pinned"
                :text="t('fomcharts.pointsTable.pinnedHint')"
              />
              <span
                class="shrink-0 rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold"
                :class="
                  group.pinned
                    ? 'bg-amber-600 text-white'
                    : 'bg-secondary/12 text-secondary'
                "
              >
                {{ group.count }}
              </span>
            </button>

            <div
              class="grid transition-[grid-template-rows] duration-200 ease-out"
              :style="{
                gridTemplateRows: isGroupCollapsed(group.key) ? '0fr' : '1fr',
              }"
            >
              <div class="min-h-0 overflow-hidden">
                <div
                  v-for="row in group.rows"
                  :key="rowKey(row)"
                  class="flex cursor-pointer items-center gap-2 rounded-md bg-card/70 py-1.5 pr-1.5 pl-2.5 text-xs transition hover:bg-card"
                  :class="group.pinned ? 'border-l-2 border-amber-400/70' : ''"
                  @click="toggleHide(row)"
                  @contextmenu.prevent="openRowMenu($event, row)"
                  @mouseenter="$emit('hover-row', row)"
                  @mouseleave="$emit('hover-row', null)"
                >
                  <span
                    class="inline-flex size-2.5 shrink-0 items-center justify-center"
                    :class="
                      isManualRow(row)
                        ? 'rotate-45 border-2 border-amber-500 bg-transparent'
                        : 'rounded-full'
                    "
                    :style="
                      isManualRow(row)
                        ? undefined
                        : { background: dotColor(row) }
                    "
                  />

                  <span
                    class="min-w-0 flex-1 truncate"
                    :class="
                      isHidden(row)
                        ? 'text-muted-foreground line-through'
                        : 'text-ink'
                    "
                    :title="cellText(row, 'title')"
                  >
                    {{ displayTitle(row) }}
                  </span>
                  <span
                    v-if="isEditedRow(row)"
                    class="shrink-0 rounded bg-secondary/15 px-1 py-0.5 text-[9px] font-semibold tracking-wide text-secondary uppercase"
                  >
                    {{ t("fomcharts.pointsTable.editedBadge") }}
                  </span>

                  <!-- Eye/⋯ are always visible (no more hover-to-reveal) --
                       every action a row can take is discoverable at rest.
                       Hide is disabled here (and inside the ⋯ menu below)
                       while the row is pinned, with a tooltip/inline warning
                       explaining why instead of a confirm dialog -- prevents
                       the mistake up front rather than confirming it after
                       the fact. Both stop click propagation so they don't
                       ALSO trigger the row's own click-to-hide right behind
                       them (see the row's own @click above). -->
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary/10 hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                        :disabled="isPinned(row)"
                        :aria-label="
                          isHidden(row)
                            ? t('fomcharts.pointsTable.unhide')
                            : t('fomcharts.pointsTable.hide')
                        "
                        @click.stop="toggleHide(row)"
                      >
                        <EyeOff v-if="isHidden(row)" class="size-3.5" />
                        <Eye v-else class="size-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {{
                        isPinned(row)
                          ? t("fomcharts.pointsTable.pinGuardHint")
                          : isHidden(row)
                            ? t("fomcharts.pointsTable.unhide")
                            : t("fomcharts.pointsTable.hide")
                      }}
                    </TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger as-child>
                      <button
                        type="button"
                        class="flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary/10 hover:text-ink"
                        :aria-label="t('fomcharts.pointsTable.moreActions')"
                        @click.stop
                      >
                        <Ellipsis class="size-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" class="min-w-36">
                      <DropdownMenuItem
                        class="px-2 py-1 text-[11px]"
                        @select="$emit('edit', row)"
                      >
                        <Pencil class="mr-1.5 size-3" />
                        {{ t("fomcharts.pointsTable.edit") }}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        v-if="isEditedRow(row)"
                        class="px-2 py-1 text-[11px]"
                        @select="$emit('reset-point', row)"
                      >
                        <RotateCcw class="mr-1.5 size-3" />
                        {{ t("fomcharts.pointsTable.resetPoint") }}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        class="px-2 py-1 text-[11px]"
                        :class="
                          isPinned(row) ? 'bg-amber-50 text-amber-700' : ''
                        "
                        @select="togglePin(row)"
                      >
                        <Pin
                          class="mr-1.5 size-3"
                          :class="
                            isPinned(row) ? 'fill-amber-600 text-amber-600' : ''
                          "
                        />
                        {{
                          isPinned(row)
                            ? t("fomcharts.pointsTable.unpin")
                            : t("fomcharts.pointsTable.pin")
                        }}
                      </DropdownMenuItem>

                      <div class="my-0.5 h-px bg-secondary/10" />

                      <div
                        v-if="isPinned(row)"
                        class="mb-0.5 flex items-start gap-1 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800"
                      >
                        <TriangleAlert class="mt-0.5 size-3 shrink-0" />
                        <span>{{
                          t("fomcharts.pointsTable.pinGuardHint")
                        }}</span>
                      </div>

                      <DropdownMenuItem
                        class="px-2 py-1 text-[11px]"
                        :disabled="isPinned(row)"
                        @select="toggleHide(row)"
                      >
                        <EyeOff v-if="!isHidden(row)" class="mr-1.5 size-3" />
                        <Eye v-else class="mr-1.5 size-3" />
                        {{
                          isHidden(row)
                            ? t("fomcharts.pointsTable.unhide")
                            : t("fomcharts.pointsTable.hide")
                        }}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        :disabled="isPinned(row)"
                        class="px-2 py-1 text-[11px] text-rose-600 data-highlighted:bg-rose-500/8"
                        @select="confirmDelete(row)"
                      >
                        <Trash2 class="mr-1.5 size-3" />
                        {{ t("fomcharts.pointsTable.deletePermanently") }}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p
          v-else-if="emptyState"
          class="text-xs leading-relaxed text-muted-foreground"
        >
          {{ t(`fomcharts.pointsTable.${emptyState}`) }}
        </p>
      </div>
    </CollapsibleSection>

    <!-- Right-click on a row opens the same actions as its ⋯ menu, at the
         cursor, so a mouse user never has to aim for the small icon button.
         Mirrors FomChart's own on-chart context menu -- fixed overlay that
         closes on outside click, a second right-click, or Escape. Position
         is clamped on-screen (see useClampedMenuPosition) since it's placed
         at the raw click point, which can otherwise render partially
         off-screen near a viewport edge. Teleported to <body> -- this
         component sits inside the workspace Card's backdrop-blur, which
         (like any filter/backdrop-filter/transform ancestor) makes
         `position: fixed` descendants relative to ITS box instead of the
         viewport, silently breaking clientX/clientY-based positioning. -->
    <Teleport to="body">
      <div
        v-if="menuTarget"
        class="fixed inset-0 z-40"
        @click="menuTarget = null"
        @contextmenu.prevent="menuTarget = null"
      />
      <div
        v-if="menuTarget"
        ref="menuRef"
        class="fixed z-50 min-w-36 rounded-md border border-secondary/15 bg-popover p-1 shadow-lg"
        :style="menuStyle"
      >
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
          @click="runMenuAction((row) => $emit('edit', row))"
        >
          <Pencil class="size-3 text-muted-foreground" />
          {{ t("fomcharts.pointsTable.edit") }}
        </button>
        <button
          v-if="isEditedRow(menuTarget.row)"
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
          @click="runMenuAction((row) => $emit('reset-point', row))"
        >
          <RotateCcw class="size-3 text-muted-foreground" />
          {{ t("fomcharts.pointsTable.resetPoint") }}
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] hover:bg-secondary/10"
          :class="
            isPinned(menuTarget.row) ? 'bg-amber-50 text-amber-700' : 'text-ink'
          "
          @click="runMenuAction(togglePin)"
        >
          <Pin
            class="size-3"
            :class="
              isPinned(menuTarget.row)
                ? 'fill-amber-600 text-amber-600'
                : 'text-muted-foreground'
            "
          />
          {{
            isPinned(menuTarget.row)
              ? t("fomcharts.pointsTable.unpin")
              : t("fomcharts.pointsTable.pin")
          }}
        </button>

        <div class="my-0.5 h-px bg-secondary/10" />

        <div
          v-if="isPinned(menuTarget.row)"
          class="mb-0.5 flex items-start gap-1 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-800"
        >
          <TriangleAlert class="mt-0.5 size-3 shrink-0" />
          <span>{{ t("fomcharts.pointsTable.pinGuardHint") }}</span>
        </div>

        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink transition hover:bg-secondary/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          :disabled="isPinned(menuTarget.row)"
          @click="runMenuAction(toggleHide)"
        >
          <EyeOff
            v-if="!isHidden(menuTarget.row)"
            class="size-3 text-muted-foreground"
          />
          <Eye v-else class="size-3 text-muted-foreground" />
          {{
            isHidden(menuTarget.row)
              ? t("fomcharts.pointsTable.unhide")
              : t("fomcharts.pointsTable.hide")
          }}
        </button>
        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-rose-600 transition hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          :disabled="isPinned(menuTarget.row)"
          @click="runMenuAction(confirmDelete)"
        >
          <Trash2 class="size-3" />
          {{ t("fomcharts.pointsTable.deletePermanently") }}
        </button>
      </div>
    </Teleport>

    <!-- Right-click on a group's header (the dépliant itself) opens the same
         kind of menu as a single row, but scoped to every row in that group
         at once -- Épingler/Masquer act on group.rows in one shot instead of
         one row at a time, and there's no Modifier/Supprimer here since
         those only ever make sense for one point. "Afficher uniquement ces
         points" is a shortcut equivalent to pinning the whole group by hand
         and then flipping the Annotations panel's own "Points épinglés
         uniquement" toggle (see showOnlyRows in VisualizationView). -->
    <Teleport to="body">
      <div
        v-if="groupMenuTarget"
        class="fixed inset-0 z-40"
        @click="groupMenuTarget = null"
        @contextmenu.prevent="groupMenuTarget = null"
      />
      <div
        v-if="groupMenuTarget"
        ref="groupMenuRef"
        class="fixed z-50 min-w-44 rounded-md border border-secondary/15 bg-popover p-1 shadow-lg"
        :style="groupMenuStyle"
      >
        <button
          v-if="!groupMenuTarget.group.pinned"
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
          @click="runGroupMenuAction((rows) => $emit('pin-rows', rows))"
        >
          <Pin class="size-3 text-muted-foreground" />
          {{ t("fomcharts.pointsTable.pinGroup") }}
        </button>
        <button
          v-else
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-amber-700 hover:bg-secondary/10"
          @click="runGroupMenuAction((rows) => $emit('unpin-rows', rows))"
        >
          <Pin class="size-3 fill-amber-600 text-amber-600" />
          {{ t("fomcharts.pointsTable.unpinGroup") }}
        </button>
        <button
          v-if="!groupMenuTarget.group.pinned"
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
          @click="runGroupMenuAction((rows) => $emit('hide-rows', rows))"
        >
          <EyeOff class="size-3 text-muted-foreground" />
          {{ t("fomcharts.pointsTable.hideGroup") }}
        </button>

        <div class="my-0.5 h-px bg-secondary/10" />

        <button
          type="button"
          class="flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-[11px] text-ink hover:bg-secondary/10"
          @click="runGroupMenuAction((rows) => $emit('show-only-rows', rows))"
        >
          <Eye class="size-3 text-muted-foreground" />
          {{ t("fomcharts.pointsTable.showOnlyGroup") }}
        </button>
      </div>
    </Teleport>
  </TooltipProvider>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import {
  Trash2,
  EyeOff,
  Eye,
  Pencil,
  RotateCcw,
  Plus,
  Search,
  ChevronDown,
  X,
  ArrowUpDown,
  Ellipsis,
  Pin,
  TriangleAlert,
} from "@lucide/vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import InfoTooltip from "@/components/shared/InfoTooltip.vue";
import CollapsibleSection from "@/components/shared/CollapsibleSection.vue";
import { useClampedMenuPosition } from "@/composables/useClampedMenuPosition";
import {
  isManualRow,
  isEditedRow,
  findShortTitleColumn,
  type DataRow,
} from "@/utils/columnTypes";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    // Exactly the rows currently drawn on the chart (VisualizationView's
    // plottableData) -- this panel is a management view of what's plotted,
    // not the full dataset, so hiding/removing a row here always matches
    // what visibly disappears from the chart.
    rows: DataRow[];
    // Dataset rows currently hidden (VisualizationView's hiddenRows) --
    // folded into the same grouped list as `rows`, filterable via the
    // Tout/Visibles/Masqués chips instead of living in a separate section.
    hiddenRows: DataRow[];
    // Rows currently pinned (VisualizationView's annotations, unwrapped to
    // their source row) -- drives the dedicated "Épinglés" group and the
    // hide/delete guard on a pinned row (see isPinned).
    pinnedRows: DataRow[];
    // Used only to locate a "Short Title" column, if the sheet has one --
    // rows here show that instead of the full Title for a more compact,
    // scannable list (see displayTitle). Also doubles as each group's label.
    columns: string[];
    // The currently plotted Y axis -- used only for the "highest/lowest
    // value" sort options (see sortedRows), never displayed on a row (see
    // the compact-title-only decision this list already follows).
    yAxis?: string | null;
    // Fixed label -> color assignment from VisualizationView (utils/palette.ts)
    // -- the panel's dot must match the same color the point has on the chart.
    groupColorMap?: Record<string, string>;
    groupBy?: string | null;
  }>(),
  { groupColorMap: () => ({}), groupBy: null, yAxis: null },
);

const emit = defineEmits<{
  hide: [row: DataRow];
  remove: [row: DataRow];
  unhide: [row: DataRow];
  pin: [row: DataRow];
  unpin: [row: DataRow];
  edit: [row: DataRow];
  // Only ever fired for a row where isEditedRow(row) is true (see the
  // template's v-if) -- reverts it to its pre-edit snapshot.
  "reset-point": [row: DataRow];
  "add-point": [];
  // Fired on mouseenter (with the row) / mouseleave (null) over a row --
  // VisualizationView forwards this straight to FomChart's own hoveredRow
  // prop so hovering here previews the point on the chart.
  "hover-row": [row: DataRow | null];
  // Group-level equivalents of pin/unpin/hide above, fired from a group
  // header's right-click menu with every row currently in that group (see
  // groupMenuTarget) instead of a single row.
  "pin-rows": [rows: DataRow[]];
  "unpin-rows": [rows: DataRow[]];
  "hide-rows": [rows: DataRow[]];
  // "Afficher uniquement ces points" -- pins the whole group AND turns on
  // the Annotations panel's "Points épinglés uniquement" toggle, handled
  // entirely on VisualizationView's side (see showOnlyRows there).
  "show-only-rows": [rows: DataRow[]];
}>();

const open = defineModel<boolean>("open", { default: false });
const includeCustomInStats = defineModel<boolean>("includeCustomInStats", {
  default: true,
});

const hasManualRows = computed(() => props.rows.some(isManualRow));
const hasAnyRows = computed(
  () => props.rows.length + props.hiddenRows.length > 0,
);

const searchQuery = ref("");

// "Ordre du graphique" (raw dataset order) dropped -- the list is always
// grouped by Ref regardless of sort mode, so once Référence became the
// default it left chart-order with no distinct reason to pick it over Ref's
// own predictable, numeric-aware ordering. The remaining three are genuinely
// different axes a researcher browses this list by: which paper (Ref),
// which paper by name (Titre), or which point performs best (Valeur).
type SortMode = "ref" | "title" | "value-desc" | "value-asc";
const sort = ref<SortMode>("ref");
const sortOptions = computed<{ value: SortMode; label: string }[]>(() => [
  { value: "ref", label: t("fomcharts.pointsTable.sort.ref") },
  { value: "title", label: t("fomcharts.pointsTable.sort.title") },
  { value: "value-desc", label: t("fomcharts.pointsTable.sort.valueDesc") },
  { value: "value-asc", label: t("fomcharts.pointsTable.sort.valueAsc") },
]);

// Defaults to "all" (not "visible") -- hiding a point is a one-click action
// available right from this same list (row click, eye icon, ⋯ menu), so
// starting on "Visibles" would make a just-hidden point vanish from view the
// moment it's acted on, with no obvious way back short of switching chips.
type FilterMode = "all" | "visible" | "hidden";
const activeFilter = ref<FilterMode>("all");
const filterOptions = computed(() => [
  {
    key: "all" as const,
    label: t("fomcharts.pointsTable.filters.all"),
    count: props.rows.length + props.hiddenRows.length,
  },
  {
    key: "visible" as const,
    label: t("fomcharts.pointsTable.filters.visible"),
    count: props.rows.length,
  },
  {
    key: "hidden" as const,
    label: t("fomcharts.pointsTable.filters.hidden"),
    count: props.hiddenRows.length,
  },
]);

const shortTitleColumn = computed(() => findShortTitleColumn(props.columns));

// "title"/"ref" are pseudo-columns here, not real column names -- both are
// checked under either casing (row.title/row.Title, row.ref/row.Ref) the
// same way the rest of the app already reads them (see e.g.
// VisualizationView's buildAnnotation), since a harmonized export always
// capitalizes them ("Ref", "Title") while other call sites in this file
// pass real, arbitrarily-cased column names straight through.
const cellText = (row: DataRow, column: string): string => {
  const v =
    column === "title"
      ? (row.title ?? row.Title)
      : column === "ref"
        ? (row.ref ?? row.Ref)
        : row[column];
  return v === null || v === undefined || v === "" ? "" : String(v);
};

// Short Title when the sheet has one (a hand-curated <=6-word version meant
// exactly for compact UI, see findShortTitleColumn) -- falls back to the
// full Title, then a placeholder, so this list stays scannable at the
// sidebar's width without every row wrapping to two lines. Also used as a
// group's label (the first row's title stands in for its whole reference).
const displayTitle = (row: DataRow): string => {
  const short = shortTitleColumn.value
    ? cellText(row, shortTitleColumn.value)
    : "";
  return short || cellText(row, "title") || t("fomcharts.pointsTable.untitled");
};

// Content-based, not reference-based -- rows here can come from either the
// uploaded dataset or the customPoints array, both plain objects with no
// guaranteed stable identity across re-renders (see VisualizationView's
// rowsEqual for the same reasoning). Ref/title alone isn't guaranteed
// unique (two rows can share a blank ref), so the key folds in every value.
const rowKey = (row: DataRow): string => JSON.stringify(row);

const hiddenKeySet = computed(() => new Set(props.hiddenRows.map(rowKey)));
const isHidden = (row: DataRow): boolean => hiddenKeySet.value.has(rowKey(row));

const pinnedKeySet = computed(() => new Set(props.pinnedRows.map(rowKey)));
const isPinned = (row: DataRow): boolean => pinnedKeySet.value.has(rowKey(row));

const toggleHide = (row: DataRow) => {
  if (isPinned(row)) return;
  if (isHidden(row)) emit("unhide", row);
  else emit("hide", row);
};
const togglePin = (row: DataRow) => {
  if (isPinned(row)) emit("unpin", row);
  else emit("pin", row);
};

// Permanent for a literature row too now (previously manual points only) --
// there's no undo once this fires (unlike hide, which just moves the row to
// the Masqués filter), so it's gated behind a confirmation rather than firing
// straight off a single click the way hide/pin do.
const confirmDelete = (row: DataRow) => {
  if (isPinned(row)) return;
  if (window.confirm(t("fomcharts.pointsTable.deleteConfirm")))
    emit("remove", row);
};

// Right-click on a row opens a menu at the cursor with the same actions as
// its ⋯ dropdown (see the template's menuTarget block) -- an alternative to
// aiming for the small icon button, mirroring FomChart's own on-chart
// right-click menu.
const menuTarget = ref<{ x: number; y: number; row: DataRow } | null>(null);
const menuRef = ref<HTMLElement | null>(null);
const { menuStyle, show: showRowMenu } = useClampedMenuPosition();
const openRowMenu = (event: MouseEvent, row: DataRow) => {
  menuTarget.value = { x: event.clientX, y: event.clientY, row };
  showRowMenu(menuRef, event.clientX, event.clientY);
};
// Takes the action as a callback (rather than reading menuTarget.value.row
// itself) so template call sites never need a non-null assertion on a ref
// that's only known non-null via the surrounding v-if.
const runMenuAction = (action: (row: DataRow) => void) => {
  if (!menuTarget.value) return;
  action(menuTarget.value.row);
  menuTarget.value = null;
};
const closeMenuOnEscape = (event: KeyboardEvent) => {
  if (event.key !== "Escape") return;
  menuTarget.value = null;
  groupMenuTarget.value = null;
};
onMounted(() => window.addEventListener("keydown", closeMenuOnEscape));
onBeforeUnmount(() => window.removeEventListener("keydown", closeMenuOnEscape));

// Right-click on a group's header -- same positioning approach as a row's
// own menu (openRowMenu above), just keyed by group instead of row so its
// actions can act on every row in group.rows at once (see the template's
// groupMenuTarget block).
const groupMenuTarget = ref<{ x: number; y: number; group: RowGroup } | null>(
  null,
);
const groupMenuRef = ref<HTMLElement | null>(null);
const { menuStyle: groupMenuStyle, show: showGroupMenu } =
  useClampedMenuPosition();
const openGroupMenu = (event: MouseEvent, group: RowGroup) => {
  groupMenuTarget.value = { x: event.clientX, y: event.clientY, group };
  showGroupMenu(groupMenuRef, event.clientX, event.clientY);
};
const runGroupMenuAction = (action: (rows: DataRow[]) => void) => {
  if (!groupMenuTarget.value) return;
  action(groupMenuTarget.value.group.rows);
  groupMenuTarget.value = null;
};

// Ref doubles as the source PDF's filename (see backend/llm.py, which sets
// Ref = the uploaded PDF's name minus extension when the paper itself names
// none) -- searching it is exactly "search by PDF name" as much as by
// citation marker. Title and Short Title (when the sheet has one) cover
// "search by article name" -- checked independently of what's actually
// displayed, so a Short Title sheet is still searchable by its full Title.
const matchesSearch = (row: DataRow): boolean => {
  const q = searchQuery.value.trim().toLowerCase();
  if (!q) return true;
  const haystack =
    `${cellText(row, "title")} ${shortTitleColumn.value ? cellText(row, shortTitleColumn.value) : ""} ${cellText(row, "ref")}`.toLowerCase();
  return haystack.includes(q);
};

// yAxis's raw value, or NaN when blank/non-numeric (a categorical Y, or a
// row that just never reported it) -- kept out of numericValue's callers'
// way by sorting every NaN to the end regardless of direction, rather than
// let it silently scramble the rest of the order (NaN comparisons are never
// true, so a naive `a - b` comparator leaves them in an unspecified spot).
const numericValue = (row: DataRow): number => {
  if (!props.yAxis) return NaN;
  const v = row[props.yAxis];
  return v === null || v === undefined || v === "" ? NaN : Number(v);
};

// Shared by both the pinned bucket and the regular groups below, so a sort
// mode orders rows the same way whichever bucket they land in -- and,
// because grouping happens *after* sorting (see categoryGroups), a group's
// row order and a group's position among other groups both fall out of this
// same pass rather than needing their own separate ordering rule.
const sortRows = (list: DataRow[]): DataRow[] => {
  const arr = [...list];
  switch (sort.value) {
    case "ref":
      return arr.sort((a, b) =>
        cellText(a, "ref").localeCompare(cellText(b, "ref"), undefined, {
          numeric: true,
        }),
      );
    case "title":
      return arr.sort((a, b) => displayTitle(a).localeCompare(displayTitle(b)));
    case "value-desc":
    case "value-asc": {
      const dir = sort.value === "value-desc" ? -1 : 1;
      return arr.sort((a, b) => {
        const av = numericValue(a);
        const bv = numericValue(b);
        if (isNaN(av) && isNaN(bv)) return 0;
        if (isNaN(av)) return 1;
        if (isNaN(bv)) return -1;
        return dir * (av - bv);
      });
    }
  }
};

const allRows = computed(() => [...props.rows, ...props.hiddenRows]);
const searchedRows = computed(() => allRows.value.filter(matchesSearch));

// Pinned rows always show up here, independent of the Tout/Visibles/Masqués
// chip -- pinning a row also clears its hidden state (see pinRows in
// VisualizationView), so a pinned row is never masked and never needs the
// Masqués filter to be reachable in the first place.
const pinnedRowsFiltered = computed(() =>
  sortRows(searchedRows.value.filter((row) => isPinned(row))),
);

const unpinnedRowsFiltered = computed(() => {
  const base = searchedRows.value.filter((row) => !isPinned(row));
  switch (activeFilter.value) {
    case "all":
      return base;
    case "hidden":
      return base.filter((row) => isHidden(row));
    default:
      return base.filter((row) => !isHidden(row));
  }
});
const unpinnedSorted = computed(() => sortRows(unpinnedRowsFiltered.value));

interface RowGroup {
  key: string;
  label: string;
  count: number;
  pinned: boolean;
  rows: DataRow[];
}

// One group per Ref (a source paper/record can extract several modes/cases,
// see AnnotationsPanel's siblingsFor for the same notion) -- labeled with the
// Ref code itself (see displayTitle's own use for the row/title split), and
// ordered by whichever row of that group sorts first (see
// sortRows/unpinnedSorted), so e.g. "highest value first" surfaces the group
// holding the best point.
const categoryGroups = computed<RowGroup[]>(() => {
  const order: string[] = [];
  const buckets = new Map<string, DataRow[]>();
  for (const row of unpinnedSorted.value) {
    const key = cellText(row, "ref") || " none";
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key)!.push(row);
  }
  return order.map((key) => {
    const groupRows = buckets.get(key)!;
    return {
      key,
      label: key === " none" ? t("fomcharts.pointsTable.otherGroup") : key,
      count: groupRows.length,
      pinned: false,
      rows: groupRows,
    };
  });
});

const groups = computed<RowGroup[]>(() => {
  const list: RowGroup[] = [];
  if (pinnedRowsFiltered.value.length > 0) {
    list.push({
      key: " pinned",
      label: t("fomcharts.pointsTable.pinnedGroup"),
      count: pinnedRowsFiltered.value.length,
      pinned: true,
      rows: pinnedRowsFiltered.value,
    });
  }
  list.push(...categoryGroups.value);
  return list;
});

// Collapsed by default, except the very first group in the current list --
// with dozens of points folded one group per paper, starting fully expanded
// is a wall of rows to scroll past before the list is even useful, but
// starting *everything* collapsed left the list looking empty at a glance.
// Only an explicit user toggle (collapseOverrides) is remembered past that;
// re-sorting/filtering picks a new "first" group each time rather than
// keeping whichever one happened to be first before.
const firstGroupKey = computed(() => groups.value[0]?.key ?? null);
const collapseOverrides = ref<Map<string, boolean>>(new Map());
const isGroupCollapsed = (key: string): boolean =>
  collapseOverrides.value.get(key) ?? key !== firstGroupKey.value;
const toggleGroup = (key: string) => {
  const next = new Map(collapseOverrides.value);
  next.set(key, !isGroupCollapsed(key));
  collapseOverrides.value = next;
};

const emptyState = computed<"empty" | "noHidden" | "noResults" | null>(() => {
  if (!hasAnyRows.value) return "empty";
  if (groups.value.length > 0) return null;
  if (activeFilter.value === "hidden" && !searchQuery.value.trim())
    return "noHidden";
  return "noResults";
});

// Matches the chart's own series color for this row's group -- falls back
// to a neutral dot when there's no active grouping, same convention as
// StatsSummaryPanel/FomChart.
const dotColor = (row: DataRow): string => {
  if (!props.groupBy) return "var(--color-secondary)";
  const v = row[props.groupBy];
  const label = v === null || v === undefined || v === "" ? null : String(v);
  return (label && props.groupColorMap[label]) || "var(--color-secondary)";
};
</script>
