<template>
  <div class="flex flex-col gap-2">
    <p
      v-if="materialOptions.length === 0 && modelValue.length === 0"
      class="text-xs text-muted-foreground"
    >
      {{ t("fomcharts.addPoint.noBaseMaterialsYet") }}
    </p>
    <div v-else class="flex flex-col gap-3 sm:flex-row">
      <div class="flex min-w-0 flex-1 flex-col gap-2">
        <!-- Reminder for any Base Material not yet given a layer row -- the
             whole point is that nothing picked earlier gets forgotten here. -->
        <p
          v-if="unplacedMaterials.length"
          class="text-[10.5px] font-medium text-amber-700"
        >
          {{
            t("fomcharts.addPoint.materialsRemaining", {
              materials: unplacedMaterials.join(", "),
            })
          }}
        </p>

        <!-- "+ Add layer" is the container's own last row (not a separate
             button below it) -- it scrolls with the list instead of getting
             pushed further down the form as more layers are added, and
             reads as "one more row" rather than a disconnected element. -->
        <div
          class="flex max-h-40 flex-col overflow-x-hidden overflow-y-auto rounded-md border border-input"
        >
          <TransitionGroup tag="div" name="layer-row" class="flex flex-col">
            <div
              v-for="(layer, index) in modelValue"
              :key="layerKeys[index]"
              class="flex items-center gap-1.5 border-b border-border px-1.5 py-1"
              :class="dragOverIndex === index ? 'bg-primary/5' : ''"
              draggable="true"
              @dragstart="onDragStart(index, $event)"
              @dragover="onDragOver(index, $event)"
              @dragleave="dragOverIndex = null"
              @drop="onDrop(index, $event)"
              @dragend="
                dragIndex = null;
                dragOverIndex = null;
              "
            >
              <GripVertical
                class="size-3.5 shrink-0 cursor-grab text-muted-foreground/60 active:cursor-grabbing"
              />
              <div class="min-w-0 flex-1">
                <Combobox
                  :model-value="layer.material"
                  :options="materialOptions"
                  :allow-create="false"
                  :placeholder="
                    t('fomcharts.addPoint.layerMaterialPlaceholder')
                  "
                  :create-label="t('fomcharts.addPoint.addNew')"
                  :empty-label="t('fomcharts.addPoint.noMatches')"
                  @update:model-value="
                    (v) => updateLayer(index, { material: v })
                  "
                />
              </div>
              <Input
                type="number"
                step="any"
                min="0"
                :model-value="
                  layer.thicknessNm === null ? '' : String(layer.thicknessNm)
                "
                :placeholder="t('fomcharts.addPoint.layerThicknessPlaceholder')"
                class="h-8 w-20 shrink-0 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                @update:model-value="
                  (v) =>
                    updateLayer(index, {
                      thicknessNm: v === '' ? null : Number(v),
                    })
                "
              />
              <span class="w-5 shrink-0 text-[10.5px] text-muted-foreground"
                >nm</span
              >
              <span class="shrink-0 text-[10.5px] text-muted-foreground"
                >×</span
              >
              <Input
                type="number"
                step="1"
                min="1"
                :model-value="
                  layer.repeatCount === undefined
                    ? ''
                    : String(layer.repeatCount)
                "
                placeholder="1"
                :aria-label="
                  t('fomcharts.addPoint.layerRepeatLabel', { n: index + 1 })
                "
                :title="t('fomcharts.addPoint.layerRepeatHint')"
                class="h-8 w-12 shrink-0 text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                @update:model-value="
                  (v) =>
                    updateLayer(index, {
                      repeatCount: v === '' ? undefined : Number(v),
                    })
                "
              />
              <button
                type="button"
                class="shrink-0 rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                :aria-label="
                  t('fomcharts.addPoint.removeLayer', { n: index + 1 })
                "
                @click="removeLayer(index)"
              >
                <X class="size-3.5" />
              </button>
            </div>
          </TransitionGroup>
          <button
            type="button"
            class="flex shrink-0 items-center justify-center gap-1.5 border-t border-dashed border-input px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary disabled:pointer-events-none disabled:opacity-40"
            :class="modelValue.length === 0 ? 'border-t-0' : ''"
            :disabled="materialOptions.length === 0"
            @click="addLayer"
          >
            <Plus class="size-3.5" />
            {{ t("fomcharts.addPoint.addLayer") }}
          </button>
        </div>
        <p
          v-if="materialOptions.length === 0"
          class="text-[10.5px] text-muted-foreground"
        >
          {{ t("fomcharts.addPoint.noBaseMaterialsYet") }}
        </p>
      </div>

      <div v-if="modelValue.length" class="w-28 shrink-0">
        <LayerStack :layers="modelValue" />
        <p class="mt-1 text-center text-[9.5px] text-muted-foreground">
          {{ t("fomcharts.addPoint.layerPreview") }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { GripVertical, Plus, X } from "@lucide/vue";
import { Input } from "@/components/ui/input";
import { Combobox } from "@/components/ui/combobox";
import LayerStack from "@/components/visualization/LayerStack.vue";
import type { StructureLayer } from "@/utils/layerStructure";

/**
 * Editable stack builder for "Layer Structure" -- one row per layer
 * (material + thickness in nm, top/incident-light first, same order the
 * read-only LayerStack visualization and parseLayerStructure/prompt.txt's
 * format both already assume), with a live LayerStack preview so a
 * researcher sees the same stack rendering their point will carry once
 * pinned, instead of guessing at the "Material(nm) + Material(nm)" text
 * format blind. The "×" field next to thickness is a repeat count (see
 * StructureLayer.repeatCount) -- consecutive rows sharing the same count
 * collapse into a single periodic "(A(t)/B(t)) xN" block on save
 * (formatLayerStructure), for a paper that states a repeated stack like a
 * 10-period Bragg mirror instead of 20 individually written layers.
 * `materialOptions` is deliberately this POINT's own already-picked Base
 * Materials (see AddPointDialog), not every material in the dataset, and the
 * Combobox is closed (no "add new") -- a layer can't be made of a material
 * this point didn't already declare as one of its Base Materials.
 */
const props = defineProps<{ materialOptions: string[] }>();

const modelValue = defineModel<StructureLayer[]>({ default: () => [] });

const { t } = useI18n();

// Base Materials picked (see MaterialsTagsField) but not yet given a layer
// row -- the reminder above the list exists precisely so this never
// silently stays non-empty.
const unplacedMaterials = computed(() => {
  const placed = new Set(
    modelValue.value
      .filter((l) => l.material.trim() !== "")
      .map((l) => l.material),
  );
  return props.materialOptions.filter((m) => !placed.has(m));
});

// Stable per-row identity for TransitionGroup's FLIP reorder animation --
// array index alone can't serve as the key here (splicing/reordering keeps
// the same indices 0..n-1 while the CONTENT at each index changes, so Vue
// would just patch each row in place instead of animating a move). Every
// mutation below goes through `commit`, which keeps `layerKeys` in lockstep
// with `modelValue` by construction; the watch only exists to re-key from
// scratch on a wholesale external replace (AddPointDialog's resetForm
// loading a different point), where there's nothing to animate FROM anyway.
//
// Guarded by a boolean flag, NOT by comparing the watched array against the
// array `commit` just wrote (as this used to do): `modelValue` is bound to
// AddPointDialog's `layersValues[field.column]`, a property of a reactive
// ref -- assigning a plain array into it makes Vue wrap it in a NEW Proxy,
// so the value `commit` writes and the value this watcher later reads back
// are never `===`. That reference check always failed, so every single
// keystroke (via updateLayer) re-keyed every row from scratch, unmounting
// and remounting the whole row list -- which is what silently stole focus
// off the thickness/repeat inputs after their very first character.
let nextKey = 0;
const layerKeys = ref<number[]>(modelValue.value.map(() => nextKey++));
let isCommitting = false;
const commit = (layers: StructureLayer[], keys: number[]) => {
  isCommitting = true;
  layerKeys.value = keys;
  modelValue.value = layers;
  nextTick(() => {
    isCommitting = false;
  });
};
watch(modelValue, (layers) => {
  if (isCommitting) return;
  layerKeys.value = layers.map(() => nextKey++);
});

const updateLayer = (index: number, patch: Partial<StructureLayer>) => {
  const layers = [...modelValue.value];
  layers[index] = { ...layers[index], ...patch };
  commit(layers, layerKeys.value);
};

const addLayer = () => {
  commit(
    [...modelValue.value, { material: "", thicknessNm: null }],
    [...layerKeys.value, nextKey++],
  );
};

const removeLayer = (index: number) => {
  commit(
    modelValue.value.filter((_, i) => i !== index),
    layerKeys.value.filter((_, i) => i !== index),
  );
};

// Native HTML5 drag-and-drop reordering -- dragIndex is the row being
// carried, dragOverIndex only drives the hover highlight (see the template)
// and is never read for the actual move, which always resolves against the
// drop target's own index.
const dragIndex = ref<number | null>(null);
const dragOverIndex = ref<number | null>(null);

const onDragStart = (index: number, ev: DragEvent) => {
  dragIndex.value = index;
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = "move";
};

const onDragOver = (index: number, ev: DragEvent) => {
  ev.preventDefault();
  if (ev.dataTransfer) ev.dataTransfer.dropEffect = "move";
  dragOverIndex.value = index;
};

const onDrop = (index: number, ev: DragEvent) => {
  ev.preventDefault();
  const from = dragIndex.value;
  dragIndex.value = null;
  dragOverIndex.value = null;
  if (from === null || from === index) return;
  const layers = [...modelValue.value];
  const keys = [...layerKeys.value];
  const [movedLayer] = layers.splice(from, 1);
  const [movedKey] = keys.splice(from, 1);
  layers.splice(index, 0, movedLayer);
  keys.splice(index, 0, movedKey);
  commit(layers, keys);
};
</script>

<style scoped>
/* FLIP move animation for TransitionGroup -- Vue auto-toggles this class
   while a row's flexbox position is settling into its new slot, so a
   drag-drop reorder (or a remove that shifts rows up) glides instead of
   snapping. */
.layer-row-move {
  transition: transform 0.25s ease;
}
</style>
