<template>
  <TooltipProvider :delay-duration="200">
    <Dialog v-model:open="open">
      <DialogContent
        class="flex h-[90vh] w-[90vw] max-w-none flex-col overflow-hidden p-5"
      >
        <DialogTitle>{{ t("fomcharts.compare.title") }}</DialogTitle>
        <DialogDescription>{{
          t("fomcharts.compare.description")
        }}</DialogDescription>

        <div class="mt-1 flex min-h-0 flex-1 flex-col gap-3">
          <!-- Reorderable chips -- one per compared point, in the order the
               columns actually render (not the panel's own sort). Mirrors
               LayerStructureField.vue's native HTML5 drag-reorder pattern
               (GripVertical handle, dragover highlight) plus a keyboard
               fallback (◂▸) for anyone not using a mouse. Add/remove happen
               right here too, so the dialog never needs to be closed to
               change who's being compared. "+ Add point" always renders now
               (just disabled when there's nothing left to add) -- it used to
               disappear entirely once every pinned point was already in the
               comparison, which read as a missing feature rather than "you
               have nothing more to add". -->
          <div
            v-if="orderedPins.length > 0 || props.allPins.length > 0"
            class="flex shrink-0 flex-col gap-1.5"
          >
            <!-- Chips wrap freely on their own row -- sort/settings live on a
                 SECOND row below (see next), always right-aligned there
                 instead of sharing this line: with up to 6 chips, letting
                 them compete for space on one flex-wrap row meant "Réglages
                 d'affichage" could get shoved down to its own line anyway,
                 just unpredictably (mid-word-wrap-looking, not a clean
                 second row). -->
            <div class="flex flex-wrap items-center gap-2">
              <span
                v-for="(pin, idx) in orderedPins"
                :key="pin.id"
                class="flex items-center gap-1 rounded-lg border border-primary/35 bg-primary/8 py-1 pr-1.5 pl-1 text-xs font-medium text-ink"
                :class="dragOverIndex === idx ? 'ring-1 ring-primary/50' : ''"
                draggable="true"
                @dragstart="onChipDragStart(idx, $event)"
                @dragover="onChipDragOver(idx, $event)"
                @dragleave="dragOverIndex = null"
                @drop="onChipDrop(idx, $event)"
                @dragend="
                  dragIndex = null;
                  dragOverIndex = null;
                "
              >
                <GripVertical
                  class="size-3 shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  class="size-4 rounded text-muted-foreground hover:bg-secondary/15 disabled:opacity-25"
                  :disabled="idx === 0"
                  :aria-label="t('fomcharts.compare.chips.moveLeft')"
                  @click="moveChip(idx, -1)"
                >
                  <ChevronLeft class="size-3" />
                </Button>
                <span
                  class="inline-flex size-4 shrink-0 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground"
                >
                  {{ idx + 1 }}
                </span>
                <span class="max-w-24 truncate font-mono">{{ pin.ref }}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  class="size-4 rounded text-muted-foreground hover:bg-secondary/15 disabled:opacity-25"
                  :disabled="idx === orderedPins.length - 1"
                  :aria-label="t('fomcharts.compare.chips.moveRight')"
                  @click="moveChip(idx, 1)"
                >
                  <ChevronRight class="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  class="size-4 rounded text-muted-foreground hover:bg-secondary/15"
                  :aria-label="
                    t('fomcharts.compare.chips.remove', { ref: pin.ref })
                  "
                  @click="removeChip(pin.id)"
                >
                  <X class="size-3" />
                </Button>
              </span>

              <DropdownMenu v-model:open="addPointOpen">
                <DropdownMenuTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="gap-1 border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:text-primary"
                    :disabled="
                      availableToAdd.length === 0 ||
                      orderedPins.length >= COMPARE_MAX
                    "
                  >
                    <Plus class="size-3" />
                    {{ t("fomcharts.compare.chips.addPoint") }}
                  </Button>
                </DropdownMenuTrigger>
                <!-- z-60 overrides DropdownMenuContent's default z-30 -- this
                     menu opens from inside CompareDialog (a Dialog, z-50),
                     same fix as UnitConverterPopover.vue's z-60 override for
                     nesting a Popover inside AddPointDialog: without it, the
                     menu renders behind the dialog's own z-40 overlay,
                     technically open but unclickable. -->
                <DropdownMenuContent
                  align="start"
                  class="z-60 max-h-64 min-w-32 overflow-y-auto"
                >
                  <DropdownMenuItem
                    v-for="pin in availableToAdd"
                    :key="pin.id"
                    @select="addPoint(pin.id)"
                  >
                    <span class="font-mono text-xs">{{ pin.ref }}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <!-- Own row, always right-aligned -- see the comment above the
                 chips row for why this doesn't share a line with them. -->
            <div class="flex items-center justify-end gap-2">
              <Select
                :model-value="sortMode"
                @update:model-value="(v) => applySort(v as SortMode)"
              >
                <SelectTrigger size="sm" class="w-auto bg-card text-[10.5px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="selection">{{
                    t("fomcharts.compare.sort.selection")
                  }}</SelectItem>
                  <SelectItem value="ref">{{
                    t("fomcharts.compare.sort.ref")
                  }}</SelectItem>
                  <SelectItem
                    v-if="bestWorstKeys.length > 0"
                    value="metric-asc"
                    >{{
                      t("fomcharts.compare.sort.metricAsc", {
                        metric: bestWorstKeys[0],
                      })
                    }}</SelectItem
                  >
                  <SelectItem
                    v-if="bestWorstKeys.length > 0"
                    value="metric-desc"
                    >{{
                      t("fomcharts.compare.sort.metricDesc", {
                        metric: bestWorstKeys[0],
                      })
                    }}</SelectItem
                  >
                </SelectContent>
              </Select>

              <!-- "Réglages d'affichage" -- both display/analysis settings
                   (which sections show, which metric drives best/worst
                   highlighting) live in this one non-modal popover instead of
                   two always-visible pill rows competing with the toolbar for
                   space. It closes on outside click/Escape on its own (Reka's
                   PopoverRoot default) without dimming the rest of the
                   dialog. -->
              <Popover>
                <PopoverTrigger as-child>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    class="gap-1.5 text-[11px]"
                  >
                    <Settings2 class="size-3.5" />
                    {{ t("fomcharts.compare.displaySettings") }}
                  </Button>
                </PopoverTrigger>
                <!-- z-60 overrides PopoverContent's default z-30 -- same fix
                     as UnitConverterPopover.vue's, needed any time a Popover
                     opens from inside a Dialog (z-50). -->
                <PopoverContent align="end" class="z-60 w-80 p-3.5">
                  <div class="flex flex-col gap-2">
                    <div class="flex items-center justify-between">
                      <span
                        class="text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase"
                        >{{ t("fomcharts.compare.sectionsLabel") }}</span
                      >
                      <Button
                        type="button"
                        variant="link"
                        size="xs"
                        class="h-auto p-0 text-[10.5px]"
                        @click="toggleAllSections"
                        >{{
                          t(
                            allSectionsShown
                              ? "fomcharts.compare.clearAll"
                              : "fomcharts.compare.showAll",
                          )
                        }}</Button
                      >
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                      <Button
                        v-for="opt in sectionToggles"
                        :key="opt.key"
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="gap-1.5 rounded-full border"
                        :class="
                          opt.model.value
                            ? 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                            : 'border-secondary/25 bg-card text-secondary hover:bg-primary/8 hover:text-ink'
                        "
                        @click="opt.model.value = !opt.model.value"
                      >
                        <component :is="opt.icon" class="size-3.5" />
                        {{ opt.label }}
                      </Button>
                    </div>
                  </div>

                  <!-- Toggle pills, not a single-value Select -- several
                       metrics can be highlighted at once (e.g. best/worst by
                       BOTH Q-factor and FOM), each only ever coloring its own
                       row (see compareExport's computeBestWorst). -->
                  <template v-if="candidateMetrics.length > 0">
                    <div class="my-3 h-px bg-secondary/15" />
                    <div class="flex flex-col gap-2">
                      <span
                        class="text-[10.5px] font-bold tracking-wide text-muted-foreground uppercase"
                        >{{ t("fomcharts.compare.bestWorst.label") }}</span
                      >
                      <div class="flex flex-wrap items-center gap-1.5">
                        <Button
                          v-for="key in candidateMetrics"
                          :key="key"
                          type="button"
                          variant="ghost"
                          size="sm"
                          class="rounded-full border text-[10.5px]"
                          :class="
                            bestWorstKeys.includes(key)
                              ? 'border-primary bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                              : 'border-secondary/25 bg-card text-secondary hover:bg-primary/8 hover:text-ink'
                          "
                          @click="toggleBestWorstKey(key)"
                        >
                          {{ key }}
                        </Button>
                      </div>
                    </div>
                  </template>
                </PopoverContent>
              </Popover>
            </div>
            <p class="text-[10.5px] text-muted-foreground italic">
              {{ t("fomcharts.compare.chips.hint") }}
            </p>
          </div>

          <div ref="previewAreaEl" class="relative min-h-0 flex-1">
            <!-- Invisible probe -- same children/sizes as the vertical
                   rail's ALWAYS-present groups (tools/stamps/history; bare
                   divs, not real Button/Tooltip components, so it costs
                   nothing to keep mounted), used purely to measure how tall a
                   vertical rail is at minimum, independent of whichever
                   orientation is actually being shown or which tool is
                   active. updateRailOrientation compares its scrollHeight
                   against the preview area's real available height to decide
                   railHorizontal -- see the script. Deliberately excludes the
                   color-swatches group (only shown for some tools, see
                   showColorPicker) -- sizing the ORIENTATION decision off
                   that made it swing horizontal far more often than needed
                   (most tools -- Pointer/Pan/eraser/stamps -- don't even show
                   it), which read as "it's stuck horizontal, I didn't ask for
                   that". The rarer case where a color-having tool's extra
                   group doesn't quite fit is instead handled by letting the
                   vertical rail scroll internally for just that overflow
                   (max-h-[calc(100%-1.5rem)] overflow-y-auto below) rather
                   than reorienting the whole toolbar over it. -->
            <div
              v-if="plan"
              ref="railProbeEl"
              class="invisible absolute top-0 left-0 flex flex-col items-center gap-1 p-1.5"
              aria-hidden="true"
            >
              <div
                v-for="entry in TOOL_RAIL_TOOLS"
                :key="entry.tool"
                class="size-8"
              />
              <div class="my-0.5 h-px w-8" />
              <div
                v-for="entry in STAMP_RAIL_KINDS"
                :key="entry.kind"
                class="size-8"
              />
              <div class="my-0.5 h-px w-8" />
              <div class="size-8" />
              <div class="size-8" />
            </div>

            <!-- Floating tool rail -- vertical, anchored top-left over the
                 canvas by default (mirroring the floating zoom cluster's own
                 corner-pinned pattern below), and never part of the PNG
                 export (handleDownload redraws purely from `annotations`).
                 On a genuinely short/small screen where even the rail's
                 minimum footprint (see the probe above) would spill past the
                 preview area's bottom edge, it switches to a horizontal row
                 pinned to the BOTTOM instead, lined up with the zoom cluster
                 on the same edge -- preferred over wrapping into multiple
                 columns (tried, read as broken/misaligned rather than
                 intentional). When it STAYS vertical but the current tool's
                 color-swatches group pushes past the available height anyway,
                 max-h-[calc(100%-1.5rem)] + overflow-y-auto lets just that
                 overflow scroll internally instead of reorienting the whole
                 rail over one extra group.
                 Pointer doubles as the selection tool (click a shape, then
                 Delete/Backspace or the floating × removes it, or drag it to
                 move it -- every annotation type is draggable via Konva now,
                 not just postit/stamp). Every other tool's click/drag ADDS
                 one typed annotation -- see the Konva stage handlers below. -->
            <div
              v-if="plan"
              class="absolute z-10 flex items-center gap-1 rounded-lg border border-secondary/20 bg-card/95 p-1.5 shadow-md backdrop-blur"
              :class="
                railHorizontal
                  ? 'bottom-3 left-3 flex-row'
                  : 'top-3 left-3 max-h-[calc(100%-1.5rem)] flex-col overflow-y-auto'
              "
            >
              <Tooltip v-for="entry in TOOL_RAIL_TOOLS" :key="entry.tool">
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :class="toolBtnClass(entry.tool)"
                    :aria-label="t(entry.label)"
                    @click="setTool(entry.tool)"
                  >
                    <component :is="entry.icon" class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent :side="railHorizontal ? 'top' : 'right'">{{
                  t(entry.label)
                }}</TooltipContent>
              </Tooltip>

              <template v-if="showColorPicker">
                <div
                  class="shrink-0 bg-secondary/15"
                  :class="
                    railHorizontal ? 'mx-0.5 h-6 w-px' : 'my-0.5 h-px w-8'
                  "
                />
                <Button
                  v-for="c in ANNOTATION_COLORS"
                  :key="c"
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  class="size-5 shrink-0 rounded-full border-2 p-0"
                  :class="
                    activeColor === c ? 'border-ink' : 'border-transparent'
                  "
                  :style="{ background: c }"
                  :aria-label="t('fomcharts.compare.tools.penColor')"
                  @click="activeColor = c"
                />
              </template>

              <div
                class="shrink-0 bg-secondary/15"
                :class="railHorizontal ? 'mx-0.5 h-6 w-px' : 'my-0.5 h-px w-8'"
              />
              <Tooltip v-for="entry in STAMP_RAIL_KINDS" :key="entry.kind">
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    :class="stampBtnClass(entry.kind)"
                    :aria-label="t(entry.label)"
                    @click="setStampTool(entry.kind)"
                  >
                    <component :is="entry.icon" class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent :side="railHorizontal ? 'top' : 'right'">{{
                  t(entry.label)
                }}</TooltipContent>
              </Tooltip>

              <div
                class="shrink-0 bg-secondary/15"
                :class="railHorizontal ? 'mx-0.5 h-6 w-px' : 'my-0.5 h-px w-8'"
              />
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    class="text-secondary"
                    :disabled="!canUndo"
                    :aria-label="t('fomcharts.compare.tools.undo')"
                    @click="undo"
                  >
                    <Undo2 class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent :side="railHorizontal ? 'top' : 'right'">{{
                  t("fomcharts.compare.tools.undo")
                }}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    class="text-secondary"
                    :disabled="!canRedo"
                    :aria-label="t('fomcharts.compare.tools.redo')"
                    @click="redo"
                  >
                    <Redo2 class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent :side="railHorizontal ? 'top' : 'right'">{{
                  t("fomcharts.compare.tools.redo")
                }}</TooltipContent>
              </Tooltip>
            </div>

            <!-- Extra top padding always (clears the rail's own top-3 start
                 either way, so the column ref/title/badge header -- the part
                 actually looked at first -- never starts right where the
                 rail begins), plus extra bottom padding ONLY when horizontal
                 (that's the one case where the rail sits low enough to cover
                 the LAST visible rows; in vertical mode nothing floats down
                 there, so keeping the bottom compact avoids wasting space).
                 This doesn't fully clear a TALL vertical rail from every row
                 next to it -- that would need reserving hundreds of px of
                 permanent blank space, which is its own kind of bad -- but it
                 keeps the header and (when horizontal) the last rows free. -->
            <div
              ref="previewWrapperEl"
              class="h-full w-full overflow-hidden rounded-md border border-secondary/20 bg-white px-2.5 pt-16"
              :class="railHorizontal ? 'pb-16' : 'pb-2.5'"
              @wheel="onWheel"
              @pointerdown="onWrapperPointerDown"
              @pointermove="onWrapperPointerMove"
              @pointerup="onWrapperPointerUp"
              @pointerleave="onWrapperPointerUp"
            >
              <!-- mx-auto (plain block auto-margins), not flex+justify-center
                   -- centers the comparison when it's narrower than the
                   wrapper (2-3 columns on a wide screen used to sit flush
                   left with a huge dead strip of white space to the right)
                   while staying safely scrollable when it's WIDER than the
                   wrapper (flex's justify-content:center has a well-known
                   bug where it clips the start of overflowing content;
                   auto-margins just collapse to 0 and fall back to normal,
                   fully-scrollable left-aligned flow instead). -->
              <div
                v-if="plan"
                class="relative mx-auto"
                :style="{
                  width: `${plan.width * zoom}px`,
                  height: `${plan.height * zoom}px`,
                }"
              >
                <div
                  class="absolute top-0 left-0"
                  :style="{
                    width: `${plan.width}px`,
                    height: `${plan.height}px`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                  }"
                >
                  <canvas
                    ref="contentCanvasEl"
                    class="absolute top-0 left-0 block"
                    :style="{
                      width: `${plan.width}px`,
                      height: `${plan.height}px`,
                    }"
                  />

                  <!-- Konva stage -- replaces the old hand-rolled ink canvas.
                       Every annotation is a real Konva node (draggable, its
                       own click/dblclick hit-testing) instead of pixels we
                       redrew and hit-tested by hand; the static comparison
                       content above stays a plain raster (drawComparePins is
                       a bespoke pixel-perfect measuring/drawing routine, not
                       a good fit for a scene graph). -->
                  <v-stage
                    ref="stageRef"
                    :config="stageConfig"
                    class="absolute top-0 left-0"
                    :class="overlayCursorClass"
                    @mousedown="onStageMouseDown"
                    @mousemove="onStageMouseMove"
                    @mouseup="onStageMouseUp"
                    @mouseleave="onStageMouseLeave"
                    @click="onStageClick"
                  >
                    <v-layer ref="layerRef">
                      <!-- Column-swap handles -- one per compared column,
                           top-right of its header, horizontal-drag-only.
                           Rendered first (bottom of the stack) so any
                           annotation actually placed near a header still
                           takes priority for clicks. -->
                      <v-group
                        v-for="(pin, index) in orderedPins"
                        :key="`colswap-${pin.id}`"
                        :config="columnSwapGroupConfig(index)"
                        @mouseenter="hoveredColumnIndex = index"
                        @mouseleave="hoveredColumnIndex = null"
                        @dragstart="onColumnSwapDragStart(index)"
                        @dragend="onColumnSwapDragEnd(index, $event)"
                      >
                        <v-rect :config="columnSwapBgConfig(index)" />
                        <v-text :config="columnSwapGlyphConfig(index)" />
                      </v-group>

                      <template v-for="a in annotations" :key="a.id">
                        <v-line
                          v-if="a.type === 'pen'"
                          :config="penConfig(a)"
                          @click="selectAnnotation(a.id)"
                          @dragstart="onAnnotationDragStart"
                          @dragend="onPenDragEnd(a, $event)"
                        />
                        <v-ellipse
                          v-else-if="a.type === 'frame'"
                          :config="frameConfig(a)"
                          @click="selectAnnotation(a.id)"
                          @dragstart="onAnnotationDragStart"
                          @dragend="onFrameDragEnd(a, $event)"
                          @transformend="onFrameTransformEnd(a, $event)"
                        />
                        <v-arrow
                          v-else-if="a.type === 'arrow'"
                          :config="arrowConfig(a)"
                          @click="selectAnnotation(a.id)"
                          @dragstart="onAnnotationDragStart"
                          @dragend="onArrowDragEnd(a, $event)"
                        />
                        <v-line
                          v-else-if="a.type === 'underline'"
                          :config="underlineConfig(a)"
                          @click="selectAnnotation(a.id)"
                          @dragstart="onAnnotationDragStart"
                          @dragend="onUnderlineDragEnd(a, $event)"
                        />
                        <v-group
                          v-else-if="a.type === 'postit'"
                          :config="postitGroupConfig(a)"
                          @click="selectAnnotation(a.id)"
                          @dblclick="startEditPostit(a)"
                          @dragstart="onAnnotationDragStart"
                          @dragmove="onMovableDragMove(a.id, $event)"
                          @dragend="onMovableDragEnd(a, $event)"
                        >
                          <v-rect :config="postitRectConfig(a)" />
                          <v-text :config="postitTextConfig(a)" />
                          <!-- Width resize handle -- only while selected,
                               same "select it, then drag its handle" pattern
                               as the frame's Transformer above. Height is
                               never dragged directly; it's always derived
                               from how the text wraps at the chosen width. -->
                          <v-circle
                            v-if="selectedAnnotationId === a.id"
                            :config="postitResizeHandleConfig(a)"
                            @dragstart="onPostitResizeDragStart"
                            @dragmove="onPostitResizeDragMove(a, $event)"
                            @dragend="onPostitResizeDragEnd"
                          />
                        </v-group>
                        <v-group
                          v-else-if="a.type === 'stamp'"
                          :config="stampGroupConfig(a)"
                          @click="selectAnnotation(a.id)"
                          @dragstart="onAnnotationDragStart"
                          @dragmove="onMovableDragMove(a.id, $event)"
                          @dragend="onMovableDragEnd(a, $event)"
                        >
                          <v-circle :config="stampCircleConfig(a)" />
                          <v-star
                            v-if="a.kind === 'favorite'"
                            :config="STAMP_GLYPH_STAR"
                            :listening="false"
                          />
                          <v-line
                            v-else-if="a.kind === 'validated'"
                            :config="STAMP_GLYPH_CHECK"
                            :listening="false"
                          />
                          <template v-else>
                            <v-line
                              :config="STAMP_GLYPH_CROSS_1"
                              :listening="false"
                            />
                            <v-line
                              :config="STAMP_GLYPH_CROSS_2"
                              :listening="false"
                            />
                          </template>
                        </v-group>
                      </template>

                      <!-- Arrow endpoint handles -- only for a selected
                           arrow, lets either end be re-pointed independently
                           instead of only moving the whole arrow at once. -->
                      <template v-if="selectedArrowEndpoints">
                        <v-circle
                          :config="
                            arrowEndpointConfig(
                              selectedArrowEndpoints.x1,
                              selectedArrowEndpoints.y1,
                            )
                          "
                          @dragstart="onAnnotationDragStart"
                          @dragmove="
                            onArrowEndpointDragMove(
                              'start',
                              selectedArrowEndpoints.ann,
                              $event,
                            )
                          "
                          @dragend="
                            onArrowEndpointDragEnd(
                              'start',
                              selectedArrowEndpoints.ann,
                            )
                          "
                        />
                        <v-circle
                          :config="
                            arrowEndpointConfig(
                              selectedArrowEndpoints.x2,
                              selectedArrowEndpoints.y2,
                            )
                          "
                          @dragstart="onAnnotationDragStart"
                          @dragmove="
                            onArrowEndpointDragMove(
                              'end',
                              selectedArrowEndpoints.ann,
                              $event,
                            )
                          "
                          @dragend="
                            onArrowEndpointDragEnd(
                              'end',
                              selectedArrowEndpoints.ann,
                            )
                          "
                        />
                      </template>

                      <v-circle
                        v-if="activePenPoints && activePenPoints.length === 1"
                        :config="activePenDotConfig"
                        :listening="false"
                      />
                      <v-line
                        v-else-if="
                          activePenPoints && activePenPoints.length > 1
                        "
                        :config="activePenPreviewConfig"
                        :listening="false"
                      />
                      <v-ellipse
                        v-if="previewFrameConfig"
                        :config="previewFrameConfig"
                        :listening="false"
                      />
                      <v-line
                        v-if="previewArrowConfig"
                        :config="previewArrowConfig"
                        :listening="false"
                      />
                      <v-line
                        v-if="previewUnderlineConfig"
                        :config="previewUnderlineConfig"
                        :listening="false"
                      />
                      <v-rect
                        v-if="hoverBandConfig"
                        :config="hoverBandConfig"
                        :listening="false"
                      />
                      <v-rect
                        v-if="postitPreviewConfig"
                        :config="postitPreviewConfig"
                        :listening="false"
                      />
                      <v-circle
                        v-if="eraserCursorConfig"
                        :config="eraserCursorConfig"
                        :listening="false"
                      />
                      <v-rect
                        v-if="selectionOutlineConfig"
                        :config="selectionOutlineConfig"
                        :listening="false"
                      />
                      <v-transformer
                        ref="transformerRef"
                        :config="transformerConfig"
                      />
                    </v-layer>
                  </v-stage>

                  <Textarea
                    v-if="editingPostit"
                    ref="postitInputEl"
                    v-model="editingPostit.text"
                    :placeholder="
                      t('fomcharts.compare.tools.postitPlaceholder')
                    "
                    class="absolute z-10 min-h-0 resize-none rounded-[3px] border-2 border-primary p-1.5 text-[11px] shadow-lg ring-2 ring-primary/30 outline-none"
                    :class="
                      pickTextColor(editingPostit.color) === '#ffffff'
                        ? 'placeholder:text-white/70'
                        : 'placeholder:text-ink/55'
                    "
                    :style="{
                      left: `${editingPostitPos?.x ?? 0}px`,
                      top: `${editingPostitPos?.y ?? 0}px`,
                      width: `${editingPostit.width}px`,
                      height: `${editingPostitHeight}px`,
                      background: editingPostit.color,
                      color: pickTextColor(editingPostit.color),
                    }"
                    @blur="commitPostit"
                    @keydown.enter.exact.prevent="commitPostit"
                    @keydown.esc="cancelPostit"
                  />

                  <!-- Floating pencil/× controls above whatever's selected --
                       position comes straight from the Konva node's own
                       getClientRect (see refreshSelectedBounds), so it can
                       never drift from where the shape actually renders.
                       Every annotation type gets the × now (used to be
                       postit-only, with everything else relying solely on
                       the footer's "Remove annotation" link -- the exact
                       inconsistency that was reported). -->
                  <template v-if="selectedControls">
                    <Button
                      v-if="selectedControls.annotation.type === 'postit'"
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      class="absolute z-20 size-5 rounded-full border border-secondary/30 bg-card p-0 shadow"
                      :style="{
                        left: `${selectedControls.x - 24}px`,
                        top: `${selectedControls.y - 8}px`,
                      }"
                      :aria-label="t('fomcharts.compare.tools.editPostit')"
                      @click="
                        startEditPostit(
                          selectedControls.annotation as PostitAnnotation,
                        )
                      "
                    >
                      <Pencil class="size-2.5" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-xs"
                      class="absolute z-20 size-5 rounded-full border border-secondary/30 bg-card p-0 text-red-600 shadow"
                      :style="{
                        left: `${selectedControls.x - (selectedControls.annotation.type === 'postit' ? -2 : 8)}px`,
                        top: `${selectedControls.y - 8}px`,
                      }"
                      :aria-label="
                        t('fomcharts.compare.tools.removeAnnotation')
                      "
                      @click="removeSelectedAnnotation"
                    >
                      <X class="size-3" />
                    </Button>
                  </template>
                </div>
              </div>
              <p v-else class="p-6 text-center text-xs text-muted-foreground">
                {{ t("fomcharts.compare.empty") }}
              </p>
            </div>

            <!-- Floating zoom cluster -- placed as a sibling of the scroll
                 container (not inside it) so it stays pinned to the corner
                 of the visible preview area regardless of scroll position. -->
            <div
              v-if="plan"
              class="absolute right-3 bottom-3 flex items-center gap-0.5 rounded-lg border border-secondary/25 bg-card/95 p-1 shadow-md backdrop-blur"
            >
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    :disabled="zoom <= MIN_ZOOM"
                    :aria-label="t('fomcharts.compare.tools.zoomOut')"
                    @click="zoomOut"
                  >
                    <ZoomOut class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{{
                  t("fomcharts.compare.tools.zoomOut")
                }}</TooltipContent>
              </Tooltip>
              <span
                class="w-9 text-center font-mono text-[10.5px] text-secondary tabular-nums"
                >{{ zoomPercent }}%</span
              >
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    :disabled="zoom >= MAX_ZOOM"
                    :aria-label="t('fomcharts.compare.tools.zoomIn')"
                    @click="zoomIn"
                  >
                    <ZoomIn class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{{
                  t("fomcharts.compare.tools.zoomIn")
                }}</TooltipContent>
              </Tooltip>
              <div class="mx-0.5 h-5 w-px bg-secondary/20" />
              <Tooltip>
                <TooltipTrigger as-child>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    :class="
                      userAdjustedZoom ? 'text-primary' : 'text-secondary'
                    "
                    :aria-label="t('fomcharts.compare.tools.fitToScreen')"
                    @click="resetZoomToFit"
                  >
                    <Maximize2 class="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{{
                  t("fomcharts.compare.tools.fitToScreen")
                }}</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <!-- Small italic caption under the canvas, echoing whichever tool
               is currently armed (e.g. the pan reminder) -- lives here
               instead of a fixed "drag to pan" note so it stays useful no
               matter which tool from the floating rail above is active. -->
          <p class="shrink-0 text-[10.5px] text-muted-foreground italic">
            {{ toolHint }}
          </p>

          <!-- Comparison title -- pre-filled (see autoTitle) and click-to-
               rename in place, replacing the old always-visible text field
               up top: it's read far more often than it's edited. -->
          <div class="flex shrink-0 items-center justify-between gap-2">
            <div class="flex min-w-0 items-center gap-3">
              <span v-if="editingTitleInline" class="relative inline-flex">
                <Input
                  ref="titleInlineInputEl"
                  v-model="titleText"
                  class="h-7 w-64 pr-6 text-xs"
                  @blur="commitInlineTitle"
                  @keydown.enter.exact.prevent="commitInlineTitle"
                  @keydown.esc="cancelInlineTitle"
                />
                <!-- mousedown.prevent keeps focus in the input (a plain
                     @click would blur it first, committing and unmounting
                     this button before the click itself ever fires). -->
                <Button
                  v-if="titleText"
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  class="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground hover:bg-secondary/10 hover:text-ink"
                  :aria-label="t('fomcharts.compare.clearTitle')"
                  @mousedown.prevent="clearInlineTitle"
                >
                  <X class="size-3" />
                </Button>
              </span>
              <Button
                v-else
                type="button"
                variant="ghost"
                size="xs"
                class="h-auto min-w-0 gap-1.5 p-0 font-normal text-muted-foreground hover:bg-transparent hover:text-ink"
                :aria-label="t('fomcharts.compare.editTitle')"
                @click="startEditTitleInline"
              >
                <Pencil class="size-3 shrink-0 opacity-60" />
                <span class="max-w-64 truncate text-xs">{{
                  titleText || autoTitle
                }}</span>
              </Button>
              <Button
                type="button"
                variant="link"
                size="xs"
                class="h-auto shrink-0 p-0 text-[10.5px]"
                :disabled="!hasMarkup"
                @click="resetAnnotations"
              >
                {{ t("fomcharts.compare.tools.reset") }}
              </Button>
            </div>
            <div class="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                @click="open = false"
                >{{ t("fomcharts.compare.cancel") }}</Button
              >
              <Button
                size="sm"
                :disabled="!plan"
                class="bg-primary text-primary-foreground hover:bg-primary/90"
                @click="handleDownload"
              >
                <Download class="size-3.5" />
                {{ t("fomcharts.compare.downloadPng") }}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  </TooltipProvider>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  watch,
  onUnmounted,
  type Component,
} from "vue";
import { useI18n } from "vue-i18n";
import type { KonvaEventObject } from "konva/lib/Node";
import type Konva from "konva";
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Ellipse,
  Eraser,
  FileText,
  Gauge,
  GripVertical,
  Hand,
  Layers,
  Maximize2,
  MousePointer2,
  Pen,
  Pencil,
  Plus,
  Redo2,
  Rows3,
  Settings2,
  Star,
  StickyNote,
  Tag,
  Underline,
  Undo2,
  Waves,
  X,
  ZoomIn,
  ZoomOut,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import type { AnnotationCardData } from "@/utils/annotationCardData";
import {
  ensureCanvasFontsLoaded,
  type AnnotationExportSection,
} from "@/utils/annotationExport";
import {
  ANNOTATION_COLORS,
  COL_GAP,
  COL_WIDTH,
  PEN_WIDTH,
  POSTIT_MIN_H,
  POSTIT_W,
  STAMP_COLORS,
  candidateBestWorstKeys,
  drawCompareAnnotations,
  drawComparePins,
  metricDirection,
  pickTextColor,
  planComparePins,
  postitHeight,
  resolveAnchor,
  type ArrowAnnotation,
  type CompareAnnotation,
  type ComparePinData,
  type ComparePlan,
  type CompareRowBand,
  type FrameAnnotation,
  type PenAnnotation,
  type PostitAnnotation,
  type StampAnnotation,
  type StampKind,
  type UnderlineAnnotation,
} from "@/utils/compareExport";
import { downloadDataUrl } from "@/utils/saveFile";
import { useCompareZoomPan, MIN_ZOOM, MAX_ZOOM } from "@/composables/useCompareZoomPan";
import { useCompareHistory } from "@/composables/useCompareHistory";
import {
  useCompareKonvaConfigs,
  COLUMN_SWAP_SIZE,
  STAMP_GLYPH_STAR,
  STAMP_GLYPH_CHECK,
  STAMP_GLYPH_CROSS_1,
  STAMP_GLYPH_CROSS_2,
} from "@/composables/useCompareKonvaConfigs";
import { useCompareChips, type SortMode } from "@/composables/useCompareChips";
import { useCompareTitle } from "@/composables/useCompareTitle";

const { t } = useI18n();

const props = defineProps<{
  allPins: AnnotationCardData[];
}>();

const open = defineModel<boolean>("open", { default: false });
// Ordered ids of the points currently in the comparison -- owned by
// AnnotationsPanel (its selectedOrder) and shared two-way, so reordering/
// adding/removing points in here also updates the panel's own selection and
// "Compare (N)" count, and the dialog remembers its order if reopened on the
// same selection for free.
const order = defineModel<string[]>("order", { default: () => [] });

// Same cap AnnotationsPanel enforces on its own selection -- kept here too
// since points can be added without leaving this dialog.
const COMPARE_MAX = 6;

const orderedPins = computed<(AnnotationCardData & { id: string })[]>(() =>
  order.value
    .map((id) => props.allPins.find((p) => p.id === id))
    .filter((p): p is AnnotationCardData & { id: string } => !!p && !!p.id),
);
const availableToAdd = computed<(AnnotationCardData & { id: string })[]>(() =>
  props.allPins.filter(
    (p): p is AnnotationCardData & { id: string } =>
      !!p.id && !order.value.includes(p.id),
  ),
);

const showOrigin = ref(true);
const showMode = ref(true);
const showStructure = ref(true);
const showMetrics = ref(true);
// Off by default, unlike the other four sections -- a personal note is
// scratch content, not necessarily meant for a shared/exported comparison
// unless deliberately switched back on.
const showNotes = ref(false);

const sectionToggles = computed(() => [
  {
    key: "origin",
    icon: Tag,
    label: t("fomcharts.compare.origin"),
    model: showOrigin,
  },
  {
    key: "mode",
    icon: Waves,
    label: t("fomcharts.annotations.mode"),
    model: showMode,
  },
  {
    key: "structure",
    icon: Layers,
    label: t("fomcharts.annotations.layerStructure"),
    model: showStructure,
  },
  {
    key: "metrics",
    icon: Gauge,
    label: t("fomcharts.annotations.metrics"),
    model: showMetrics,
  },
  {
    key: "notes",
    icon: FileText,
    label: t("fomcharts.annotations.notes"),
    model: showNotes,
  },
]);
// A single toggle link rather than a one-way "show all" -- once every
// section is already shown, offer to clear them all back off instead of
// leaving the link sitting there with nothing left to do.
const allSectionsShown = computed(
  () =>
    showOrigin.value &&
    showMode.value &&
    showStructure.value &&
    showMetrics.value &&
    showNotes.value,
);
function toggleAllSections() {
  const next = !allSectionsShown.value;
  showOrigin.value = next;
  showMode.value = next;
  showStructure.value = next;
  showMetrics.value = next;
  showNotes.value = next;
}

const titleText = ref("");

const comparePins = computed<ComparePinData[]>(() =>
  orderedPins.value.map((d) => {
    const sections: AnnotationExportSection[] = [];
    if (showMode.value && (d.modeRows.length > 0 || d.modeDescription)) {
      sections.push({
        title: t("fomcharts.annotations.mode"),
        rows: d.modeRows,
        text: d.modeDescription ?? undefined,
      });
    }
    if (
      showStructure.value &&
      (d.structureExtraFields.length > 0 || d.layers.length > 0)
    ) {
      sections.push({
        title: t("fomcharts.annotations.layerStructure"),
        rows: d.structureExtraFields,
        layers: d.layers,
      });
    }
    if (showMetrics.value && d.metricsRows.length > 0) {
      sections.push({
        title: t("fomcharts.annotations.metrics"),
        rows: d.metricsRows,
      });
    }
    if (showNotes.value && d.note) {
      sections.push({ title: t("fomcharts.annotations.notes"), text: d.note });
    }
    return {
      ref: d.ref,
      title: d.title,
      origin: showOrigin.value ? d.origin : null,
      sections,
    };
  }),
);

const hasContent = computed(() =>
  comparePins.value.some((p) => p.origin || p.sections.length > 0),
);
const hasTitleText = computed(() => titleText.value.trim().length > 0);

// See ensureCanvasFontsLoaded -- forces exactly one re-measure once the
// exact canvas fonts are confirmed loaded, since the very first plan can
// otherwise be measured against fallback-font metrics.
const fontsReadyTick = ref(0);
ensureCanvasFontsLoaded().then(() => {
  fontsReadyTick.value++;
});

const plan = computed<ComparePlan | null>(() => {
  void fontsReadyTick.value;
  return hasContent.value
    ? planComparePins(comparePins.value, hasTitleText.value)
    : null;
});

// Metrics this app actually knows how to call "better/worse" (Sensitivity,
// Q-factor, FOM, FWHM) that are actually present among the compared points
// right now -- see candidateBestWorstKeys. Several can be highlighted at
// once (toggle pills, not a single-value Select) -- each only ever drives
// its OWN row's coloring (see compareExport's computeBestWorst), so picking
// e.g. both Q-factor and FOM never conflicts.
const candidateMetrics = computed(() =>
  candidateBestWorstKeys(comparePins.value),
);
const bestWorstKeys = ref<string[]>([]);
watch(candidateMetrics, (list) => {
  bestWorstKeys.value = bestWorstKeys.value.filter((k) => list.includes(k));
});
function toggleBestWorstKey(key: string) {
  bestWorstKeys.value = bestWorstKeys.value.includes(key)
    ? bestWorstKeys.value.filter((k) => k !== key)
    : [...bestWorstKeys.value, key];
}
const bestWorstList = computed(() =>
  bestWorstKeys.value.map((key) => ({ key, direction: metricDirection(key) })),
);
const badgeLabels = computed(() => ({
  measured: t("fomcharts.compare.badges.measured"),
  simulated: t("fomcharts.compare.badges.simulated"),
}));

const contentCanvasEl = ref<HTMLCanvasElement | null>(null);
const previewWrapperEl = ref<HTMLElement | null>(null);
// previewAreaEl/railProbeEl/railHorizontal -- see useCompareZoomPan's
// updateRailOrientation, and the template comment above the floating tool
// rail.
const previewAreaEl = ref<HTMLElement | null>(null);
const railProbeEl = ref<HTMLElement | null>(null);
const CANVAS_SCALE = 2;

// A throwaway 2D context used purely for text measurement (postit wrap
// height) -- same one-off-canvas trick planComparePins itself uses, kept
// separate since it needs to stay alive for the dialog's whole lifetime
// (Konva's own <v-text> nodes handle their OWN wrapping/rendering fine, but
// have no way to report a wrapped height back before being drawn, so the
// postit rect/hit-area still needs this to size itself up front).
const measureCtx = document.createElement("canvas").getContext("2d")!;

function renderContent() {
  const canvas = contentCanvasEl.value;
  const p = plan.value;
  if (!canvas || !p) return;
  canvas.width = Math.max(1, Math.round(p.width * CANVAS_SCALE));
  canvas.height = Math.max(1, Math.round(p.height * CANVAS_SCALE));
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(CANVAS_SCALE, 0, 0, CANVAS_SCALE, 0, 0);
  drawComparePins(
    ctx,
    comparePins.value,
    p,
    titleText.value || null,
    highlightedKeys.value,
    bestWorstList.value,
    badgeLabels.value,
  );
}

// -- Zoom: auto-fits to the preview wrapper's WIDTH (capped at 100%) whenever
// it opens or the content's size changes, unless the user has manually
// zoomed this session (userAdjustedZoom) -- same "automatic zoom unless
// overridden" pattern PDF viewers use. Only fitting to width (not also
// height, like before) matters here: the comparison is a column layout that
// already scrolls vertically just fine, so fitting to BOTH dimensions let a
// tall-but-narrow comparison (few columns, many rows) get squeezed down to
// fit its height, leaving a wide dead strip of unused white space on the
// right and text far smaller than it needed to be. Manual control via the
// floating +/-/reset cluster, Ctrl+wheel, and the Pan tool/Space-drag for
// when a zoomed-in or many-column comparison needs to scroll around.
// -- Annotations: a flat, typed, undoable list. Every type is now a real
// Konva node (see the stage/layer in the template) -- draggable with its own
// native hit-testing/click/dblclick, instead of pixels we redrew and
// hit-tested by hand on a raw canvas. Pen strokes stay pixel-based (freehand
// has no natural anchor -- see compareExport.ts), everything else anchors to
// a pin ref + percentage position within that pin's column so it survives
// reordering.
type Tool =
  | "pointer"
  | "pan"
  | "pen"
  | "eraser"
  | "highlight"
  | "frame"
  | "arrow"
  | "postit"
  | "stamp"
  | "underline";
// Pan starts active (not Pointer) -- with the preview now panned by hand
// instead of scrolled (see previewWrapperEl's overflow-hidden below), the
// Hand tool is the default way to move around a comparison the moment it
// opens, matching a canvas-navigation-first flow. Switching to Pointer to
// select/edit an annotation is always one click away in the rail below.
const activeTool = ref<Tool>("pan");
const activeColor = ref(ANNOTATION_COLORS[0]);
const activeStampKind = ref<StampKind>("favorite");
// Floating tool rail contents -- data-driven so the template renders one
// Tooltip+Button per entry instead of repeating the same markup by hand for
// every tool/stamp.
const TOOL_RAIL_TOOLS: { tool: Tool; icon: Component; label: string }[] = [
  {
    tool: "pointer",
    icon: MousePointer2,
    label: "fomcharts.compare.tools.pointer",
  },
  { tool: "pan", icon: Hand, label: "fomcharts.compare.tools.pan" },
  { tool: "pen", icon: Pen, label: "fomcharts.compare.tools.pen" },
  {
    tool: "highlight",
    icon: Rows3,
    label: "fomcharts.compare.tools.highlightRow",
  },
  { tool: "frame", icon: Ellipse, label: "fomcharts.compare.tools.frame" },
  { tool: "arrow", icon: ArrowUpRight, label: "fomcharts.compare.tools.arrow" },
  {
    tool: "underline",
    icon: Underline,
    label: "fomcharts.compare.tools.underline",
  },
  { tool: "postit", icon: StickyNote, label: "fomcharts.compare.tools.postit" },
  { tool: "eraser", icon: Eraser, label: "fomcharts.compare.tools.eraser" },
];
const STAMP_RAIL_KINDS: { kind: StampKind; icon: Component; label: string }[] =
  [
    {
      kind: "favorite",
      icon: Star,
      label: "fomcharts.compare.stamps.favorite",
    },
    {
      kind: "validated",
      icon: CheckCircle2,
      label: "fomcharts.compare.stamps.validated",
    },
    { kind: "exclude", icon: X, label: "fomcharts.compare.stamps.exclude" },
  ];
const annotations = ref<CompareAnnotation[]>([]);
// bandKey -> hex color, one entry per highlighted row -- each highlight
// carries its own color (matching the pen/frame/arrow/postit color picker)
// instead of every highlight always being the same fixed amber.
const highlightedKeys = ref<Map<string, string>>(new Map());
const selectedAnnotationId = ref<string | null>(null);
const selectedBounds = ref<{
  x: number;
  y: number;
  width: number;
  height: number;
} | null>(null);
const hasMarkup = computed(
  () => annotations.value.length > 0 || highlightedKeys.value.size > 0,
);
let annotationSeq = 0;
const nextAnnotationId = () => `ann-${annotationSeq++}`;

// -- Zoom/pan + tool-rail orientation -- see composables/useCompareZoomPan.ts.
const {
  zoom,
  zoomPercent,
  userAdjustedZoom,
  railHorizontal,
  isSpacePanning,
  isPanningNow,
  zoomIn,
  zoomOut,
  resetZoomToFit,
  onWheel,
  onWrapperPointerDown,
  onWrapperPointerMove,
  onWrapperPointerUp,
  autoFit,
  init: initZoomPan,
  dispose: disposeZoomPan,
} = useCompareZoomPan({
  plan,
  isPanActive: () => activeTool.value === "pan",
  previewWrapperEl,
  previewAreaEl,
  railProbeEl,
});

// -- Undo/redo -- see composables/useCompareHistory.ts.
const {
  canUndo,
  canRedo,
  pushHistory,
  undo,
  redo,
  reset: resetHistory,
} = useCompareHistory({ annotations, highlightedKeys, selectedAnnotationId, selectedBounds });

function resetAnnotations() {
  if (!hasMarkup.value) return;
  pushHistory();
  annotations.value = [];
  highlightedKeys.value = new Map();
  selectedAnnotationId.value = null;
  selectedBounds.value = null;
}

function removeSelectedAnnotation() {
  if (!selectedAnnotationId.value) return;
  pushHistory();
  annotations.value = annotations.value.filter(
    (a) => a.id !== selectedAnnotationId.value,
  );
  selectedAnnotationId.value = null;
  selectedBounds.value = null;
}

function setTool(tool: Tool) {
  activeTool.value = tool;
  selectedAnnotationId.value = null;
  selectedBounds.value = null;
}
function setStampTool(kind: StampKind) {
  activeTool.value = "stamp";
  activeStampKind.value = kind;
  selectedAnnotationId.value = null;
  selectedBounds.value = null;
}
const toolBtnClass = (tool: Tool) =>
  activeTool.value === tool
    ? "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground"
    : "text-secondary";
const stampBtnClass = (kind: StampKind) =>
  activeTool.value === "stamp" && activeStampKind.value === kind
    ? "bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground"
    : "text-secondary";
const showColorPicker = computed(() =>
  (
    ["pen", "frame", "arrow", "postit", "highlight", "underline"] as Tool[]
  ).includes(activeTool.value),
);

const overlayCursorClass = computed(() => {
  if (activeTool.value === "pan" || isSpacePanning.value)
    return isPanningNow.value ? "cursor-grabbing" : "cursor-grab";
  if (
    activeTool.value === "pen" ||
    activeTool.value === "frame" ||
    activeTool.value === "arrow" ||
    activeTool.value === "underline"
  )
    return "cursor-crosshair";
  if (activeTool.value === "eraser") return "cursor-cell";
  if (
    activeTool.value === "highlight" ||
    activeTool.value === "postit" ||
    activeTool.value === "stamp"
  )
    return "cursor-pointer";
  return "cursor-default";
});

const toolHint = computed(() => {
  switch (activeTool.value) {
    case "pointer":
      return t("fomcharts.compare.tools.pointerHint");
    case "pan":
      return t("fomcharts.compare.tools.panHint");
    case "pen":
      return t("fomcharts.compare.tools.penHint");
    case "eraser":
      return t("fomcharts.compare.tools.eraserHint");
    case "highlight":
      return t("fomcharts.compare.tools.highlightRowHint");
    case "frame":
      return t("fomcharts.compare.tools.frameHint");
    case "arrow":
      return t("fomcharts.compare.tools.arrowHint");
    case "underline":
      return t("fomcharts.compare.tools.underlineHint");
    case "postit":
      return t("fomcharts.compare.tools.postitHint");
    case "stamp":
      return t("fomcharts.compare.tools.stampHint");
    default:
      return "";
  }
});

// ---------------------------------------------------------------------------
// Konva node configs -- one builder per annotation type, each reading the
// same pinRef+percentage anchor compareExport.ts's own draw functions use
// (via resolveAnchor/stampCenter), so the interactive Konva shapes can never
// disagree with the static PNG export below (which still draws with plain
// canvas 2D via drawCompareAnnotations). Draggable only under the Pointer
// tool (and never while Space-panning) so a drag gesture never fights
// whatever tool is actually active. See composables/useCompareKonvaConfigs.ts.
// ---------------------------------------------------------------------------

interface KonvaComponentRef {
  getStage: () => Konva.Stage;
  getNode: () => Konva.Node;
}
const stageRef = ref<KonvaComponentRef | null>(null);

const isDraggableNow = computed(
  () => activeTool.value === "pointer" && !isSpacePanning.value,
);

const stageConfig = computed(() => ({
  width: plan.value?.width ?? 0,
  height: plan.value?.height ?? 0,
  listening: activeTool.value !== "pan" && !isSpacePanning.value,
}));

// Column-swap hover/drag state -- owned here (not the composable) since
// onColumnSwapDragStart/End below mutate it; the composable only reads it
// to style the handle.
const hoveredColumnIndex = ref<number | null>(null);
const draggingColumnIndex = ref<number | null>(null);

const {
  bandAt,
  nearestBand,
  pinRefAt,
  pinIndexAt,
  toBandPct,
  penConfig,
  frameConfig,
  arrowConfig,
  underlineConfig,
  postitGroupConfig,
  postitRectConfig,
  postitTextConfig,
  postitResizeHandleConfig,
  stampGroupConfig,
  stampCircleConfig,
  columnHeaderY,
  columnSwapGroupConfig,
  columnSwapBgConfig,
  columnSwapGlyphConfig,
  columnIndexForX,
} = useCompareKonvaConfigs({
  plan,
  comparePins,
  isDraggableNow,
  activeTool,
  hoveredColumnIndex,
  draggingColumnIndex,
  measureCtx,
});

// Konva bubbles dragstart/dragmove/dragend up the node tree by default, and
// this handle is a CHILD of the postit's own draggable group -- without
// cancelBubble, finishing a resize drag here also fired the GROUP's own
// dragend handler (onMovableDragEnd) with e.target still pointing at THIS
// handle (Konva keeps `target` as the originating node through the whole
// bubble chain). That handler read the handle's post-resize LOCAL x/y --
// which is exactly the note's new width/height, not a position -- as if it
// were a freshly-dropped anchor point, silently teleporting the whole note
// to nonsense coordinates the instant a resize drag ended. Confirmed via
// Konva node inspection: after resizing to 212x48, the note's own group
// jumped to x:212, y:48.
function onPostitResizeDragStart(e: KonvaEventObject<DragEvent>) {
  onAnnotationDragStart();
  e.cancelBubble = true;
}
function onPostitResizeDragMove(
  a: PostitAnnotation,
  e: KonvaEventObject<DragEvent>,
) {
  e.cancelBubble = true;
  // dragBoundFunc already clamped both axes -- reading the node's own
  // (now-local) x/y back just mirrors whatever it settled on.
  const w = e.target.x();
  const h = e.target.y();
  annotations.value = annotations.value.map((x) =>
    x.id === a.id && x.type === "postit" ? { ...x, width: w, height: h } : x,
  );
}
function onPostitResizeDragEnd(e: KonvaEventObject<DragEvent>) {
  e.cancelBubble = true;
  refreshSelectedBounds();
}
// -- Column swap directly on the canvas: a small handle at the top-right of
// each column's header, draggable left/right only (dragBoundFunc locks the
// Y axis -- a column never moves vertically). Dropping it over another
// column swaps the two, reusing the exact same `order` array the chip
// list's own move/drag controls already own -- this is just a second,
// closer-to-the-content entry point into the same reorder, not a separate
// mechanism. Only shown under the Pointer tool, same as selection/drag.
function onColumnSwapDragStart(index: number) {
  draggingColumnIndex.value = index;
}
function onColumnSwapDragEnd(
  fromIndex: number,
  e: KonvaEventObject<DragEvent>,
) {
  draggingColumnIndex.value = null;
  const node = e.target;
  const droppedCenterX = node.x() + COLUMN_SWAP_SIZE / 2;
  const targetIndex = columnIndexForX(droppedCenterX, order.value.length);
  node.position({
    x: fromIndex * (COL_WIDTH + COL_GAP) + COL_WIDTH - COLUMN_SWAP_SIZE - 4,
    y: columnHeaderY(),
  });
  if (targetIndex !== fromIndex) {
    const next = [...order.value];
    [next[fromIndex], next[targetIndex]] = [next[targetIndex], next[fromIndex]];
    order.value = next;
  }
}

// -- Frame resize: Konva's Transformer attaches to the selected frame only
// (rotation disabled -- an axis-aligned ellipse around a value never needed
// rotating, and arrows/postits already have their own, more direct ways to
// reshape/move). Attaching/detaching happens imperatively (Konva's own
// pattern -- Transformer has no declarative "target" prop) in the
// selectedAnnotationId watcher below.
interface TransformerComponentRef {
  getNode: () => Konva.Transformer;
}
const transformerRef = ref<TransformerComponentRef | null>(null);
const transformerConfig = {
  rotateEnabled: false,
  enabledAnchors: ["top-left", "top-right", "bottom-left", "bottom-right"],
  borderStroke: "#0072b2",
  borderDash: [4, 3],
  anchorStroke: "#0072b2",
  anchorFill: "#ffffff",
  anchorSize: 8,
  anchorCornerRadius: 4,
  boundBoxFunc: (
    oldBox: { width: number; height: number },
    newBox: { width: number; height: number },
  ) => (newBox.width < 20 || newBox.height < 20 ? oldBox : newBox),
};
function onFrameTransformEnd(a: FrameAnnotation, e: KonvaEventObject<Event>) {
  const p = plan.value;
  const idx = comparePins.value.findIndex((x) => x.ref === a.pinRef);
  if (!p || idx === -1) return;
  const colX = idx * (COL_WIDTH + COL_GAP);
  const node = e.target as unknown as Konva.Ellipse;
  // The Transformer resizes via scale, not by changing radiusX/Y directly --
  // bake the scale into the radius and reset it to 1 so the next resize
  // starts clean instead of compounding.
  const newRadiusX = Math.max(4, node.radiusX() * node.scaleX());
  const newRadiusY = Math.max(4, node.radiusY() * node.scaleY());
  node.scaleX(1);
  node.scaleY(1);
  node.radiusX(newRadiusX);
  node.radiusY(newRadiusY);
  const cx = node.x();
  const cy = node.y();
  const band = nearestBand(cy);
  const bandY = band ? band.y : 0;
  const bandH = band ? band.height : p.height;
  const w = newRadiusX * 2;
  const h = newRadiusY * 2;
  pushHistory();
  annotations.value = annotations.value.map((x) =>
    x.id === a.id && x.type === "frame"
      ? {
          ...x,
          bandKey: band?.key ?? null,
          xPct: (cx - w / 2 - colX) / COL_WIDTH,
          yPct: (cy - h / 2 - bandY) / bandH,
          wPct: w / COL_WIDTH,
          hPct: h / bandH,
        }
      : x,
  );
  refreshSelectedBounds();
}

// -- Drag handling: Konva's own draggable already gives every shape a
// natural drag gesture (with its own built-in drag-distance threshold, so a
// plain click doesn't also count as a drag) -- this replaces the old manual
// dragCandidate/DRAG_THRESHOLD bookkeeping entirely, and now covers every
// annotation type (frame/arrow/pen included), not just postit/stamp, which
// is what made deleting/moving behave differently depending on what was
// selected.
function onAnnotationDragStart() {
  pushHistory();
}
function onPenDragEnd(a: PenAnnotation, e: KonvaEventObject<DragEvent>) {
  const node = e.target as unknown as Konva.Line;
  const dx = node.x();
  const dy = node.y();
  const newPoints = a.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  // Commits the move onto the node itself immediately (not just into Vue
  // state) so there's no one-frame snap-back while waiting for the reactive
  // config round-trip -- points/x/y always describe the SAME visual spot,
  // just re-based to (0,0) so future drags start from a clean offset again.
  node.position({ x: 0, y: 0 });
  node.points(newPoints.flatMap((p) => [p.x, p.y]));
  annotations.value = annotations.value.map((x) =>
    x.id === a.id && x.type === "pen" ? { ...x, points: newPoints } : x,
  );
  refreshSelectedBounds();
}
// Dragging can move an annotation onto a DIFFERENT row -- each drag-end
// below re-resolves the nearest band at the drop point (not just the old
// band it started in) so it re-glues to wherever it actually landed, the
// same band-relative anchoring new annotations get (see toBandPct).
function onFrameDragEnd(a: FrameAnnotation, e: KonvaEventObject<DragEvent>) {
  const p = plan.value;
  const idx = comparePins.value.findIndex((x) => x.ref === a.pinRef);
  if (!p || idx === -1) return;
  const colX = idx * (COL_WIDTH + COL_GAP);
  const node = e.target;
  const cx = node.x();
  const cy = node.y();
  const oldAnchor = resolveAnchor(comparePins.value, p, a.pinRef, a.bandKey);
  const oldPixelH = oldAnchor ? a.hPct * oldAnchor.h : 0;
  const band = nearestBand(cy);
  const bandY = band ? band.y : 0;
  const bandH = band ? band.height : p.height;
  const w = a.wPct * COL_WIDTH;
  annotations.value = annotations.value.map((x) =>
    x.id === a.id && x.type === "frame"
      ? {
          ...x,
          bandKey: band?.key ?? null,
          xPct: (cx - w / 2 - colX) / COL_WIDTH,
          yPct: (cy - oldPixelH / 2 - bandY) / bandH,
          hPct: oldPixelH / bandH,
        }
      : x,
  );
  refreshSelectedBounds();
}
// Shared by whole-arrow dragging and single-endpoint dragging (below) --
// both end up needing "here are the two endpoints in absolute pixels, figure
// out the row band and percentages from scratch" so an arrow re-glues to
// whatever row it's now next to either way.
function rebandArrow(
  pinRef: string,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): {
  bandKey: string | null;
  x1Pct: number;
  y1Pct: number;
  x2Pct: number;
  y2Pct: number;
} | null {
  const p = plan.value;
  const idx = comparePins.value.findIndex((x) => x.ref === pinRef);
  if (!p || idx === -1) return null;
  const colX = idx * (COL_WIDTH + COL_GAP);
  const band = nearestBand((y1 + y2) / 2);
  const bandY = band ? band.y : 0;
  const bandH = band ? band.height : p.height;
  return {
    bandKey: band?.key ?? null,
    x1Pct: (x1 - colX) / COL_WIDTH,
    y1Pct: (y1 - bandY) / bandH,
    x2Pct: (x2 - colX) / COL_WIDTH,
    y2Pct: (y2 - bandY) / bandH,
  };
}
function onArrowDragEnd(a: ArrowAnnotation, e: KonvaEventObject<DragEvent>) {
  const p = plan.value;
  const oldAnchor = p
    ? resolveAnchor(comparePins.value, p, a.pinRef, a.bandKey)
    : null;
  if (!oldAnchor) return;
  const node = e.target as unknown as Konva.Arrow;
  const dx = node.x();
  const dy = node.y();
  const x1 = oldAnchor.x + a.x1Pct * oldAnchor.w + dx;
  const y1 = oldAnchor.y + a.y1Pct * oldAnchor.h + dy;
  const x2 = oldAnchor.x + a.x2Pct * oldAnchor.w + dx;
  const y2 = oldAnchor.y + a.y2Pct * oldAnchor.h + dy;
  node.position({ x: 0, y: 0 });
  node.points([x1, y1, x2, y2]);
  const rebanded = rebandArrow(a.pinRef, x1, y1, x2, y2);
  if (!rebanded) return;
  annotations.value = annotations.value.map((x) =>
    x.id === a.id && x.type === "arrow" ? { ...x, ...rebanded } : x,
  );
  refreshSelectedBounds();
}
// Dragging moves the whole underline as one rigid horizontal segment --
// reuses rebandArrow with y1=y2 (still keeps it perfectly horizontal, since
// both endpoints get the same dy) rather than duplicating the same
// re-banding math a third time.
function onUnderlineDragEnd(
  a: UnderlineAnnotation,
  e: KonvaEventObject<DragEvent>,
) {
  const p = plan.value;
  const oldAnchor = p
    ? resolveAnchor(comparePins.value, p, a.pinRef, a.bandKey)
    : null;
  if (!oldAnchor) return;
  const node = e.target as unknown as Konva.Line;
  const dx = node.x();
  const dy = node.y();
  const y = oldAnchor.y + a.yPct * oldAnchor.h + dy;
  const x1 = oldAnchor.x + a.x1Pct * oldAnchor.w + dx;
  const x2 = oldAnchor.x + a.x2Pct * oldAnchor.w + dx;
  node.position({ x: 0, y: 0 });
  node.points([x1, y, x2, y]);
  const rebanded = rebandArrow(a.pinRef, x1, y, x2, y);
  if (!rebanded) return;
  annotations.value = annotations.value.map((x) =>
    x.id === a.id && x.type === "underline"
      ? {
          ...x,
          bandKey: rebanded.bandKey,
          x1Pct: rebanded.x1Pct,
          x2Pct: rebanded.x2Pct,
          yPct: rebanded.y1Pct,
        }
      : x,
  );
  refreshSelectedBounds();
}

// Endpoint handles -- shown only for a selected arrow (see the template),
// letting either end be re-pointed independently instead of only being able
// to move the whole arrow as one rigid unit.
const selectedArrowEndpoints = computed(() => {
  if (!selectedAnnotationId.value || !plan.value) return null;
  const ann = annotations.value.find(
    (a) => a.id === selectedAnnotationId.value,
  );
  if (!ann || ann.type !== "arrow") return null;
  const anchor = resolveAnchor(
    comparePins.value,
    plan.value,
    ann.pinRef,
    ann.bandKey,
  );
  if (!anchor) return null;
  return {
    ann,
    x1: anchor.x + ann.x1Pct * anchor.w,
    y1: anchor.y + ann.y1Pct * anchor.h,
    x2: anchor.x + ann.x2Pct * anchor.w,
    y2: anchor.y + ann.y2Pct * anchor.h,
  };
});
function arrowEndpointConfig(x: number, y: number) {
  return {
    x,
    y,
    radius: 6,
    fill: "#ffffff",
    stroke: "#0072b2",
    strokeWidth: 2,
    draggable: isDraggableNow.value,
  };
}
function onArrowEndpointDragMove(
  which: "start" | "end",
  ann: ArrowAnnotation,
  e: KonvaEventObject<DragEvent>,
) {
  const node = e.target;
  annotations.value = annotations.value.map((x) => {
    if (x.id !== ann.id || x.type !== "arrow") return x;
    // Percentages here are provisional (relative to the arrow's CURRENT
    // band) purely so the line visibly follows the handle while dragging;
    // onArrowEndpointDragEnd below re-derives them properly against
    // whichever band the endpoint actually lands on.
    const anchor = plan.value
      ? resolveAnchor(comparePins.value, plan.value, x.pinRef, x.bandKey)
      : null;
    if (!anchor) return x;
    const xPct = (node.x() - anchor.x) / anchor.w;
    const yPct = (node.y() - anchor.y) / anchor.h;
    return which === "start"
      ? { ...x, x1Pct: xPct, y1Pct: yPct }
      : { ...x, x2Pct: xPct, y2Pct: yPct };
  });
}
function onArrowEndpointDragEnd(which: "start" | "end", ann: ArrowAnnotation) {
  const current = annotations.value.find((x) => x.id === ann.id);
  if (!current || current.type !== "arrow") return;
  const anchor = plan.value
    ? resolveAnchor(
        comparePins.value,
        plan.value,
        current.pinRef,
        current.bandKey,
      )
    : null;
  if (!anchor) return;
  const movedX =
    anchor.x + (which === "start" ? current.x1Pct : current.x2Pct) * anchor.w;
  const movedY =
    anchor.y + (which === "start" ? current.y1Pct : current.y2Pct) * anchor.h;
  const otherX =
    anchor.x + (which === "start" ? current.x2Pct : current.x1Pct) * anchor.w;
  const otherY =
    anchor.y + (which === "start" ? current.y2Pct : current.y1Pct) * anchor.h;
  const rebanded = rebandArrow(
    current.pinRef,
    which === "start" ? movedX : otherX,
    which === "start" ? movedY : otherY,
    which === "start" ? otherX : movedX,
    which === "start" ? otherY : movedY,
  );
  if (!rebanded) return;
  annotations.value = annotations.value.map((x) =>
    x.id === ann.id && x.type === "arrow" ? { ...x, ...rebanded } : x,
  );
  refreshSelectedBounds();
}
function onMovableDragMove(id: string, e: KonvaEventObject<DragEvent>) {
  if (selectedAnnotationId.value !== id) return;
  const node = e.target;
  const stage = node.getStage();
  if (stage) selectedBounds.value = node.getClientRect({ relativeTo: stage });
}
function onMovableDragEnd(
  a: PostitAnnotation | StampAnnotation,
  e: KonvaEventObject<DragEvent>,
) {
  const p = plan.value;
  const idx = comparePins.value.findIndex((x) => x.ref === a.pinRef);
  if (!p || idx === -1) return;
  const colX = idx * (COL_WIDTH + COL_GAP);
  const node = e.target;
  const band = nearestBand(node.y());
  const bandY = band ? band.y : 0;
  const bandH = band ? band.height : p.height;
  annotations.value = annotations.value.map((x) =>
    x.id === a.id
      ? {
          ...x,
          bandKey: band?.key ?? null,
          xPct: (node.x() - colX) / COL_WIDTH,
          yPct: (node.y() - bandY) / bandH,
        }
      : x,
  );
  refreshSelectedBounds();
}

// -- Selection: bounds come straight from the Konva node's own
// getClientRect, not a hand-maintained bounds formula -- it can never
// disagree with what's actually on screen. Powers both the dashed outline
// and the floating pencil/× controls, uniformly for every annotation type.
function refreshSelectedBounds() {
  if (!selectedAnnotationId.value) {
    selectedBounds.value = null;
    return;
  }
  const stage = stageRef.value?.getStage();
  const node = stage?.findOne(`#${selectedAnnotationId.value}`);
  selectedBounds.value = node
    ? node.getClientRect({ relativeTo: stage })
    : null;
}
function selectAnnotation(id: string) {
  if (activeTool.value !== "pointer") return;
  selectedAnnotationId.value = id;
  refreshSelectedBounds();
}
// After placing ANY new annotation (pen stroke, frame, arrow, postit,
// stamp), drop back into the Pointer tool with that annotation already
// selected -- matches how most drawing tools behave (draw one thing, land
// back in "select/move" instead of staying armed to draw another). nextTick
// is required: the new annotation's Konva node doesn't exist until the
// v-for reacts to the updated `annotations` array.
function selectNewlyPlaced(id: string) {
  activeTool.value = "pointer";
  selectedAnnotationId.value = id;
  nextTick(refreshSelectedBounds);
}
const selectedControls = computed(() => {
  if (!selectedAnnotationId.value || !selectedBounds.value) return null;
  const ann = annotations.value.find(
    (a) => a.id === selectedAnnotationId.value,
  );
  if (!ann) return null;
  const b = selectedBounds.value;
  return { annotation: ann, x: b.x + b.width, y: b.y };
});
// No dashed outline for a selected frame -- the Transformer attached below
// already draws its own border plus resize handles, and both at once just
// doubled up the same information.
const selectionOutlineConfig = computed(() => {
  // Frames get the Transformer's own border+handles, arrows get their two
  // endpoint handles -- either already shows selection clearly enough on
  // its own, so this generic box would just be visual noise on top.
  const type = selectedControls.value?.annotation.type;
  if (!selectedBounds.value || type === "frame" || type === "arrow")
    return null;
  const b = selectedBounds.value;
  return {
    x: b.x - 4,
    y: b.y - 4,
    width: b.width + 8,
    height: b.height + 8,
    stroke: "#0072b2",
    strokeWidth: 1.5,
    dash: [3, 2],
    cornerRadius: 4,
  };
});

// Attaches the Transformer to the selected shape ONLY when it's a frame
// (see the transformer config/handler above) -- Konva's Transformer has no
// declarative "target" prop, so this is the imperative .nodes([...]) call
// its own docs recommend, run whenever the selection changes.
watch(selectedAnnotationId, (id) => {
  nextTick(() => {
    const tr = transformerRef.value?.getNode();
    if (!tr) return;
    const ann = id ? annotations.value.find((a) => a.id === id) : null;
    const stage = stageRef.value?.getStage();
    const node =
      ann?.type === "frame" && stage ? stage.findOne(`#${id}`) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  });
});

// -- Eraser: drag across shapes to delete every one the pointer touches in
// one gesture, using Konva's own hit-graph (stage.getIntersection) rather
// than re-deriving hit areas by hand -- more accurate than the old manual
// math, and it's what made "just click through everything you don't want"
// finally faster than reset-everything or undo-repeatedly.
const erasedThisGesture = new Set<string>();
let eraserGestureStarted = false;
let isErasing = false;
const eraserCursorPt = ref<{ x: number; y: number } | null>(null);
const eraserCursorConfig = computed(() =>
  activeTool.value === "eraser" && eraserCursorPt.value
    ? {
        x: eraserCursorPt.value.x,
        y: eraserCursorPt.value.y,
        radius: 10,
        stroke: "#d55e00",
        strokeWidth: 1.2,
        dash: [3, 2],
        fill: "rgba(213,94,0,0.12)",
      }
    : null,
);
function eraseAt(pos: { x: number; y: number }) {
  const stage = stageRef.value?.getStage();

  if (stage) {
    let node: Konva.Node | null = stage.getIntersection(pos);
    while (node && !node.id() && node !== stage) node = node.getParent();
    const id = node?.id();
    if (id && !erasedThisGesture.has(id)) {
      if (!eraserGestureStarted) {
        pushHistory();
        eraserGestureStarted = true;
      }
      erasedThisGesture.add(id);
      annotations.value = annotations.value.filter((a) => a.id !== id);
      if (selectedAnnotationId.value === id) {
        selectedAnnotationId.value = null;
        selectedBounds.value = null;
      }
    }
  }

  // Row highlights live on the static content canvas, not as Konva shapes
  // (see highlightedKeys/renderContent), so the eraser needs its own,
  // separate check here to reach them -- without this, dragging the eraser
  // straight through a highlighted row did nothing, since there was no
  // Konva node there for stage.getIntersection to find.
  const band = bandAt(pos.y);
  const gestureKey = band ? `highlight:${band.key}` : null;
  if (
    band &&
    gestureKey &&
    highlightedKeys.value.has(band.key) &&
    !erasedThisGesture.has(gestureKey)
  ) {
    if (!eraserGestureStarted) {
      pushHistory();
      eraserGestureStarted = true;
    }
    erasedThisGesture.add(gestureKey);
    const next = new Map(highlightedKeys.value);
    next.delete(band.key);
    highlightedKeys.value = next;
  }
}

// -- In-progress drawing previews (pen stroke, frame/arrow drag, highlight
// hover) -- plain refs feeding straight into the Konva preview shapes in the
// template, replacing the old manual per-frame canvas redraw.
const hoverBand = ref<CompareRowBand | null>(null);
const activePenPoints = ref<{ x: number; y: number }[] | null>(null);
let dragStart: { x: number; y: number } | null = null;
const previewShape = ref<{
  type: "frame" | "arrow" | "underline";
  start: { x: number; y: number };
  end: { x: number; y: number };
} | null>(null);

const activePenDotConfig = computed(() => {
  const p = activePenPoints.value?.[0];
  return p
    ? {
        x: p.x,
        y: p.y,
        radius: PEN_WIDTH / 2,
        fill: activeColor.value,
        opacity: 0.55,
      }
    : null;
});
const activePenPreviewConfig = computed(() => {
  if (!activePenPoints.value || activePenPoints.value.length < 2) return null;
  return {
    points: activePenPoints.value.flatMap((p) => [p.x, p.y]),
    stroke: activeColor.value,
    strokeWidth: PEN_WIDTH,
    opacity: 0.55,
    lineCap: "round",
    lineJoin: "round",
  };
});
const previewFrameConfig = computed(() => {
  if (!previewShape.value || previewShape.value.type !== "frame") return null;
  const { start, end } = previewShape.value;
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);
  const w = Math.abs(end.x - start.x);
  const h = Math.abs(end.y - start.y);
  return {
    x: x + w / 2,
    y: y + h / 2,
    radiusX: Math.max(4, w / 2),
    radiusY: Math.max(4, h / 2),
    stroke: activeColor.value,
    strokeWidth: 2,
    dash: [4, 3],
  };
});
const previewArrowConfig = computed(() => {
  if (!previewShape.value || previewShape.value.type !== "arrow") return null;
  const { start, end } = previewShape.value;
  return {
    points: [start.x, start.y, end.x, end.y],
    stroke: activeColor.value,
    strokeWidth: 2,
    dash: [4, 3],
  };
});
// Y is locked to the drag's start point (see onStageMouseMove) so this
// always previews as a straight horizontal underline, never a diagonal.
const previewUnderlineConfig = computed(() => {
  if (!previewShape.value || previewShape.value.type !== "underline")
    return null;
  const { start, end } = previewShape.value;
  return {
    points: [start.x, start.y, end.x, start.y],
    stroke: activeColor.value,
    strokeWidth: 3,
    dash: [4, 3],
    lineCap: "round",
  };
});
const hoverBandConfig = computed(() => {
  if (activeTool.value !== "highlight" || !hoverBand.value || !plan.value)
    return null;
  return {
    x: 4,
    y: hoverBand.value.y - 3,
    width: plan.value.width - 8,
    height: hoverBand.value.height + 3,
    stroke: activeColor.value,
    strokeWidth: 1.5,
    dash: [4, 3],
    cornerRadius: 4,
  };
});

// Ghost preview of where a new post-it would land, shown while hovering
// with the Post-it tool armed -- resolves the exact same snapped
// pin/row-band position the actual click handler below will use, so this is
// a true preview (not just "wherever the mouse happens to be").
const hoverPostitPt = ref<{ x: number; y: number } | null>(null);
const postitPreviewConfig = computed(() => {
  // Hidden while a note is actively being written -- the real (opaque)
  // editing box already sits right there, showing the translucent ghost
  // underneath it too would just look like a rendering glitch.
  if (
    activeTool.value !== "postit" ||
    editingPostit.value ||
    !hoverPostitPt.value ||
    !plan.value
  )
    return null;
  const pinRef = pinRefAt(hoverPostitPt.value.x);
  const pct = pinRef ? toBandPct(pinRef, hoverPostitPt.value) : null;
  if (!pinRef || !pct) return null;
  const anchor = resolveAnchor(
    comparePins.value,
    plan.value,
    pinRef,
    pct.bandKey,
  );
  if (!anchor) return null;
  return {
    x: anchor.x + pct.xPct * anchor.w,
    y: anchor.y + pct.yPct * anchor.h,
    width: POSTIT_W,
    height: postitHeight(measureCtx, "", POSTIT_W),
    fill: activeColor.value,
    opacity: 0.3,
    stroke: activeColor.value,
    strokeWidth: 1.5,
    dash: [3, 2],
    cornerRadius: 3,
  };
});

// Editing state for a post-it's text box -- shared between "placing a brand
// new note" (postit tool click) and "re-editing an existing one" (pencil
// icon / double-click), distinguished by editingAnnotationId: null means
// commit creates a new annotation, set means commit updates that one.
const editingPostit = ref<{
  pinRef: string;
  bandKey: string | null;
  xPct: number;
  yPct: number;
  text: string;
  color: string;
  width: number;
  height: number;
} | null>(null);
let editingAnnotationId: string | null = null;
const postitInputEl = ref<InstanceType<typeof Textarea> | null>(null);
const editingPostitPos = computed(() => {
  if (!editingPostit.value || !plan.value) return null;
  const anchor = resolveAnchor(
    comparePins.value,
    plan.value,
    editingPostit.value.pinRef,
    editingPostit.value.bandKey,
  );
  if (!anchor) return null;
  return {
    x: anchor.x + editingPostit.value.xPct * anchor.w,
    y: anchor.y + editingPostit.value.yPct * anchor.h,
  };
});
// Matches whatever height the note will actually render at once committed
// (see postitHeight) -- keeps the editing box from clipping a longer note,
// and reflows live as the resize handle changes editingPostit.width/height.
const editingPostitHeight = computed(() =>
  editingPostit.value
    ? Math.max(
        editingPostit.value.height,
        postitHeight(
          measureCtx,
          editingPostit.value.text,
          editingPostit.value.width,
        ),
      )
    : POSTIT_MIN_H,
);

function startEditPostit(ann: PostitAnnotation) {
  // Commits whatever OTHER note might already be open first -- without this,
  // double-clicking a second postit (or its pencil icon) while a first one
  // was still being written silently discarded the first one's text, the
  // same class of bug the general stage-mousedown guard below fixes for
  // "click anywhere else".
  if (editingPostit.value && editingAnnotationId !== ann.id) commitPostit();
  editingAnnotationId = ann.id;
  editingPostit.value = {
    pinRef: ann.pinRef,
    bandKey: ann.bandKey,
    xPct: ann.xPct,
    yPct: ann.yPct,
    text: ann.text,
    color: ann.color,
    width: ann.width,
    height: ann.height,
  };
  nextTick(() => {
    const el = postitInputEl.value?.$el as HTMLTextAreaElement | undefined;
    el?.focus();
    el?.select();
  });
}

// selectAfter is false only from onStageMouseDown's "a click elsewhere while
// a draft was open" guard -- that click is ALREADY swallowed entirely (it
// returns before reaching any tool's own mousedown branch below), so forcing
// the tool back to Pointer there would silently cancel whatever OTHER tool
// the user had just armed for their next click, for no benefit. Every other
// caller (Enter, blur, switching to a second note) wants the normal
// "land on Pointer with the new note selected" behavior.
function commitPostitInternal(selectAfter: boolean) {
  const editing = editingPostit.value;
  const targetId = editingAnnotationId;
  editingPostit.value = null;
  editingAnnotationId = null;
  if (!editing) return;
  const text = editing.text.trim();

  if (targetId) {
    // Editing an existing note -- clearing all its text removes it (matches
    // the physical act of wiping a sticky note blank), otherwise updates it
    // in place, keeping its original color/anchor.
    pushHistory();
    annotations.value = text
      ? annotations.value.map((a) =>
          a.id === targetId && a.type === "postit" ? { ...a, text } : a,
        )
      : annotations.value.filter((a) => a.id !== targetId);
    return;
  }

  if (!text) return;
  const id = nextAnnotationId();
  pushHistory();
  annotations.value = [
    ...annotations.value,
    {
      id,
      type: "postit",
      color: editing.color,
      pinRef: editing.pinRef,
      bandKey: editing.bandKey,
      xPct: editing.xPct,
      yPct: editing.yPct,
      text,
      width: editing.width,
      height: editing.height,
    },
  ];
  if (selectAfter) selectNewlyPlaced(id);
}
function commitPostit() {
  commitPostitInternal(true);
}
function cancelPostit() {
  editingPostit.value = null;
  editingAnnotationId = null;
}

// ---------------------------------------------------------------------------
// Konva stage-level gestures -- pen/frame/arrow/postit/stamp/eraser/highlight
// all start from a stage "mousedown" (drawing a NEW thing), unlike Pointer's
// per-shape drag/click (moving/selecting an EXISTING one) handled above.
// ---------------------------------------------------------------------------

function stagePointerPos(
  e: KonvaEventObject<MouseEvent>,
): { x: number; y: number } | null {
  const stage = e.target.getStage();
  return stage ? stage.getPointerPosition() : null;
}

function onStageMouseDown(e: KonvaEventObject<MouseEvent>) {
  e.evt.preventDefault();
  // A postit still being written gets saved (or discarded if left blank) the
  // moment you click anywhere else, no matter what that click was for --
  // this is what actually fixes "clicking elsewhere emptied what I wrote":
  // previously a fresh click while the postit tool was still active
  // overwrote the in-progress note with a new blank one before it ever had a
  // chance to save.
  if (editingPostit.value) {
    commitPostitInternal(false);
    return;
  }
  if (activeTool.value === "pan") return;
  const pos = stagePointerPos(e);
  if (!pos) return;

  if (activeTool.value === "eraser") {
    erasedThisGesture.clear();
    eraserGestureStarted = false;
    isErasing = true;
    eraserCursorPt.value = pos;
    eraseAt(pos);
    return;
  }
  if (activeTool.value === "pen") {
    activePenPoints.value = [pos];
    return;
  }
  if (
    activeTool.value === "frame" ||
    activeTool.value === "arrow" ||
    activeTool.value === "underline"
  ) {
    dragStart = pos;
    previewShape.value = { type: activeTool.value, start: pos, end: pos };
    return;
  }
  if (activeTool.value === "postit") {
    const pinRef = pinRefAt(pos.x);
    const pct = pinRef ? toBandPct(pinRef, pos) : null;
    if (!pinRef || !pct) return;
    editingAnnotationId = null;
    editingPostit.value = {
      pinRef,
      bandKey: pct.bandKey,
      xPct: pct.xPct,
      yPct: pct.yPct,
      text: "",
      color: activeColor.value,
      width: POSTIT_W,
      height: POSTIT_MIN_H,
    };
    nextTick(() =>
      (postitInputEl.value?.$el as HTMLTextAreaElement | undefined)?.focus(),
    );
    return;
  }
  if (activeTool.value === "stamp") {
    const pinRef = pinRefAt(pos.x);
    const pct = pinRef ? toBandPct(pinRef, pos) : null;
    if (!pinRef || !pct) return;
    const id = nextAnnotationId();
    pushHistory();
    annotations.value = [
      ...annotations.value,
      {
        id,
        type: "stamp",
        pinRef,
        bandKey: pct.bandKey,
        kind: activeStampKind.value,
        color: STAMP_COLORS[activeStampKind.value],
        xPct: pct.xPct,
        yPct: pct.yPct,
      },
    ];
    selectNewlyPlaced(id);
  }
}

function onStageMouseMove(e: KonvaEventObject<MouseEvent>) {
  const pos = stagePointerPos(e);
  if (!pos) return;

  if (activeTool.value === "eraser") {
    eraserCursorPt.value = pos;
    if (isErasing) eraseAt(pos);
    return;
  }
  if (activeTool.value === "highlight") {
    hoverBand.value = bandAt(pos.y);
    return;
  }
  if (activeTool.value === "postit") {
    hoverPostitPt.value = pos;
    return;
  }
  if (activeTool.value === "pen" && activePenPoints.value) {
    activePenPoints.value = [...activePenPoints.value, pos];
    return;
  }
  if (activeTool.value === "underline" && dragStart) {
    // Y locked to the drag's start -- an underline is always horizontal,
    // never a diagonal like the arrow it otherwise shares its drag gesture
    // with (see previewUnderlineConfig).
    previewShape.value = {
      type: "underline",
      start: dragStart,
      end: { x: pos.x, y: dragStart.y },
    };
    return;
  }
  if (
    (activeTool.value === "frame" || activeTool.value === "arrow") &&
    dragStart
  ) {
    previewShape.value = { type: activeTool.value, start: dragStart, end: pos };
  }
}

function onStageMouseUp() {
  isErasing = false;
  if (activeTool.value === "pen" && activePenPoints.value) {
    const points = activePenPoints.value;
    activePenPoints.value = null;
    // A plain click (no drag -- points never grew past the initial
    // mousedown position) used to still commit a zero-length, invisible
    // stroke that then forced a switch to the Pointer tool for nothing
    // visible to select -- the "bug" reported when just tapping a point.
    // Requiring a real drag fixes that. Pen also deliberately does NOT call
    // selectNewlyPlaced like every other tool: drawing is often a sequence
    // of several strokes in a row, and forcing a switch to Pointer after
    // each one meant re-arming the Pen tool by hand before every next mark.
    if (points.length > 1) {
      const id = nextAnnotationId();
      pushHistory();
      annotations.value = [
        ...annotations.value,
        { id, type: "pen", color: activeColor.value, points },
      ];
    }
    return;
  }
  if (
    (activeTool.value === "frame" ||
      activeTool.value === "arrow" ||
      activeTool.value === "underline") &&
    dragStart &&
    previewShape.value &&
    plan.value
  ) {
    const { start, end } = previewShape.value;
    const pinRef = pinRefAt((start.x + end.x) / 2);
    const idx = pinIndexAt((start.x + end.x) / 2);
    const colX = idx * (COL_WIDTH + COL_GAP);
    // ONE shared band for both endpoints (based on the drag's midpoint) --
    // keeps the shape's own geometry internally consistent even if start/end
    // technically sit in different bands (e.g. a frame drawn slightly across
    // a row boundary).
    const band = nearestBand((start.y + end.y) / 2);
    const bandY = band ? band.y : 0;
    const bandH = band ? band.height : plan.value.height;
    const startPct = {
      xPct: (start.x - colX) / COL_WIDTH,
      yPct: (start.y - bandY) / bandH,
    };
    const endPct = {
      xPct: (end.x - colX) / COL_WIDTH,
      yPct: (end.y - bandY) / bandH,
    };
    if (pinRef) {
      const id = nextAnnotationId();
      pushHistory();
      if (previewShape.value.type === "frame") {
        annotations.value = [
          ...annotations.value,
          {
            id,
            type: "frame",
            color: activeColor.value,
            pinRef,
            bandKey: band?.key ?? null,
            xPct: Math.min(startPct.xPct, endPct.xPct),
            yPct: Math.min(startPct.yPct, endPct.yPct),
            wPct: Math.abs(endPct.xPct - startPct.xPct) || 0.1,
            hPct: Math.abs(endPct.yPct - startPct.yPct) || 0.03,
          },
        ];
      } else if (previewShape.value.type === "arrow") {
        annotations.value = [
          ...annotations.value,
          {
            id,
            type: "arrow",
            color: activeColor.value,
            pinRef,
            bandKey: band?.key ?? null,
            x1Pct: startPct.xPct,
            y1Pct: startPct.yPct,
            x2Pct: endPct.xPct,
            y2Pct: endPct.yPct,
          },
        ];
      } else {
        // A plain click (no real drag) still gets a visible, usable
        // underline instead of a zero-length, invisible one -- same "give a
        // degenerate gesture a sane minimum size" idea as the frame's own
        // `|| 0.1` above.
        const x1Pct = Math.min(startPct.xPct, endPct.xPct);
        const x2Pct =
          Math.abs(endPct.xPct - startPct.xPct) < 0.02
            ? x1Pct + 0.12
            : Math.max(startPct.xPct, endPct.xPct);
        annotations.value = [
          ...annotations.value,
          {
            id,
            type: "underline",
            color: activeColor.value,
            pinRef,
            bandKey: band?.key ?? null,
            x1Pct,
            x2Pct,
            yPct: startPct.yPct,
          },
        ];
      }
      selectNewlyPlaced(id);
    }
    dragStart = null;
    previewShape.value = null;
  }
}

function onStageMouseLeave() {
  onStageMouseUp();
  eraserCursorPt.value = null;
  activePenPoints.value = null;
  dragStart = null;
  previewShape.value = null;
  hoverBand.value = null;
  hoverPostitPt.value = null;
}

function onStageClick(e: KonvaEventObject<MouseEvent>) {
  const stage = e.target.getStage();
  if (activeTool.value === "pointer") {
    if (e.target === stage) {
      selectedAnnotationId.value = null;
      selectedBounds.value = null;
    }
    return;
  }
  if (activeTool.value !== "highlight") return;
  const pos = stagePointerPos(e);
  const band = pos ? bandAt(pos.y) : null;
  if (!band) return;
  pushHistory();
  const next = new Map(highlightedKeys.value);
  const current = next.get(band.key);
  // Not highlighted yet -> highlight it in the active color. Already
  // highlighted in a DIFFERENT color -> recolor it (lets you fix a color
  // without erasing + redrawing first). Already highlighted in the SAME
  // color you've got selected -> toggle it off, same as before.
  if (current === undefined || current !== activeColor.value)
    next.set(band.key, activeColor.value);
  else next.delete(band.key);
  highlightedKeys.value = next;
}

function onKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement | null;
  if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT"))
    return;
  if (e.code === "Space" && !isSpacePanning.value) {
    e.preventDefault();
    isSpacePanning.value = true;
    return;
  }
  if (e.key === "Escape" && selectedAnnotationId.value) {
    selectedAnnotationId.value = null;
    selectedBounds.value = null;
    return;
  }
  if (
    (e.key === "Delete" || e.key === "Backspace") &&
    selectedAnnotationId.value
  ) {
    e.preventDefault();
    removeSelectedAnnotation();
    return;
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
    e.preventDefault();
    if (e.shiftKey) redo();
    else undo();
  }
}
function onKeyup(e: KeyboardEvent) {
  if (e.code === "Space") isSpacePanning.value = false;
}
onUnmounted(() => {
  window.removeEventListener("keydown", onKeydown);
  window.removeEventListener("keyup", onKeyup);
  disposeZoomPan();
});

// -- Chip reordering/add/remove/sort -- see composables/useCompareChips.ts.
const {
  dragIndex,
  dragOverIndex,
  onChipDragStart,
  onChipDragOver,
  onChipDrop,
  moveChip,
  removeChip,
  addPointOpen,
  addPoint,
  sortMode,
  applySort,
} = useCompareChips({ order, orderedPins, comparePins, bestWorstKeys, compareMax: COMPARE_MAX });

// -- Title auto-fill/rename -- see composables/useCompareTitle.ts.
const titleInlineInputEl = ref<InstanceType<typeof Input> | null>(null);
const {
  autoTitle,
  editingTitleInline,
  startEditTitleInline,
  clearInlineTitle,
  commitInlineTitle,
  cancelInlineTitle,
  reset: resetTitle,
} = useCompareTitle({ titleText, orderedPins, t, titleInlineInputEl });

// A fresh compare session each time the dialog reopens -- otherwise
// annotations/highlights from a previous, unrelated comparison would still
// be sitting on the canvas the next time it's opened. `order` itself is
// deliberately left untouched here -- it's owned by the panel and already
// holds whatever selection the user opened the dialog with.
watch(open, (isOpen) => {
  if (!isOpen) {
    window.removeEventListener("keydown", onKeydown);
    window.removeEventListener("keyup", onKeyup);
    disposeZoomPan();
    return;
  }
  window.addEventListener("keydown", onKeydown);
  window.addEventListener("keyup", onKeyup);
  resetTitle();
  editingTitleInline.value = false;
  highlightedKeys.value = new Map();
  activeTool.value = "pan";
  annotations.value = [];
  selectedAnnotationId.value = null;
  selectedBounds.value = null;
  activePenPoints.value = null;
  dragStart = null;
  previewShape.value = null;
  editingPostit.value = null;
  editingAnnotationId = null;
  resetHistory();
  bestWorstKeys.value = [];
  sortMode.value = "selection";
  initZoomPan();
});

// Pen strokes are pixel-tied to this exact layout -- if the content's size
// changes (a section toggled, a point added/removed), keep them from
// silently landing over the wrong row; start that layer over instead. Every
// other annotation type is pinRef+percentage anchored (see
// compareExport.ts) and survives a relayout untouched. The content's size
// changing is also exactly when the preview should re-fit (unless the user
// has manually zoomed).
let lastPlanSize = "";
watch(
  plan,
  (p) => {
    const size = p ? `${p.width}x${p.height}` : "";
    if (size !== lastPlanSize) {
      lastPlanSize = size;
      if (annotations.value.some((a) => a.type === "pen")) {
        annotations.value = annotations.value.filter((a) => a.type !== "pen");
      }
    }
    nextTick(() => {
      renderContent();
      autoFit();
    });
  },
  { immediate: true },
);

watch([titleText, highlightedKeys, bestWorstList], () =>
  nextTick(renderContent),
);

const handleDownload = () => {
  const content = contentCanvasEl.value;
  const p = plan.value;
  if (!content || !p) return;
  const out = document.createElement("canvas");
  out.width = content.width;
  out.height = content.height;
  const ctx = out.getContext("2d");
  if (!ctx) return;
  ctx.drawImage(content, 0, 0);
  // Redraws the committed annotations fresh onto the export canvas rather
  // than reading them back off the Konva layer -- this stays plain canvas
  // 2D purely from `annotations` (the same array Konva renders from), so it
  // naturally excludes every transient, interaction-only overlay (selection
  // outline, hover previews, in-progress drags) without needing to know
  // anything about Konva at all.
  ctx.scale(CANVAS_SCALE, CANVAS_SCALE);
  drawCompareAnnotations(ctx, annotations.value, comparePins.value, p);
  const url = out.toDataURL("image/png");
  const refs = orderedPins.value
    .map((p) => p.ref.replace(/[^a-z0-9_-]+/gi, "_"))
    .join("_");
  downloadDataUrl(url, `compare_${refs}.png`);
};
</script>
