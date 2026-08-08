<template>
  <div class="overflow-hidden rounded-[10px] border border-secondary/20">
    <div class="flex items-stretch gap-1.5 p-2">
      <div class="flex min-w-0 flex-1 flex-col gap-1">
        <button
          v-for="field in fields"
          :key="field.key"
          type="button"
          class="flex min-w-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-left transition-colors"
          :class="
            activeField === field.key
              ? 'border-primary bg-primary/6'
              : 'border-secondary/15 bg-card hover:border-primary/30 hover:bg-primary/5'
          "
          :aria-label="t('fomcharts.controls.editAxis', { axis: field.label })"
          :aria-expanded="activeField === field.key"
          @click="toggleField(field.key)"
        >
          <span
            class="shrink-0 text-[10px] font-bold"
            :class="
              activeField === field.key
                ? 'text-primary'
                : 'text-muted-foreground'
            "
            >{{ field.badge }}</span
          >
          <span
            v-if="field.value"
            class="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-ink"
          >
            {{ splitColumnUnit(field.value).name }}
            <span
              v-if="splitColumnUnit(field.value).unit"
              class="font-mono text-[9.5px] font-normal text-secondary"
            >
              ({{ splitColumnUnit(field.value).unit }})
            </span>
          </span>
          <span
            v-else
            class="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground"
            >{{ t("fomcharts.controls.none") }}</span
          >
          <ChevronDown
            class="size-3 shrink-0 text-muted-foreground transition-transform duration-150"
            :class="activeField === field.key ? 'rotate-180' : ''"
          />
        </button>
      </div>

      <div
        class="flex w-7 shrink-0 flex-col items-center justify-center gap-1.5"
      >
        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-md border transition-colors"
              :class="
                linked
                  ? 'border-primary text-primary bg-primary/8'
                  : 'border-secondary/25 bg-card text-muted-foreground hover:border-primary/30 hover:text-secondary'
              "
              :aria-label="t('fomcharts.controls.axisLinked')"
              :aria-pressed="linked"
              @click="linked = !linked"
            >
              <component :is="linked ? Link2 : Unlink2" class="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>
              {{
                linked
                  ? t("fomcharts.controls.axisLinkedHint")
                  : t("fomcharts.controls.axisUnlinkedHint")
              }}
            </p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger as-child>
            <button
              type="button"
              class="flex size-6 items-center justify-center rounded-full border border-secondary/25 bg-card text-secondary transition-colors hover:border-primary/40 hover:text-primary"
              :aria-label="t('fomcharts.controls.swapAxes')"
              @click="swapAxes"
            >
              <ArrowUpDown class="size-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{{ t("fomcharts.controls.swapAxes") }}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>

    <div
      class="grid transition-[grid-template-rows] duration-250 ease-out"
      :style="{ gridTemplateRows: activeField ? '1fr' : '0fr' }"
    >
      <div class="min-h-0 overflow-hidden">
        <div class="px-2 pb-2">
          <div
            class="flex w-full overflow-hidden rounded-lg border border-secondary/20 bg-card"
          >
            <Button
              v-if="numericColumns.length > 0"
              type="button"
              variant="ghost"
              size="xs"
              class="min-w-0 flex-1 rounded-none px-1 text-[10.5px] hover:bg-primary/10"
              :class="
                typeTab === 'numeric'
                  ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'text-secondary'
              "
              @click="typeTab = 'numeric'"
            >
              <span class="min-w-0 flex-1 truncate"
                >{{ t("fomcharts.controls.axisGroupNumeric") }} ·
                {{ numericColumns.length }}</span
              >
            </Button>
            <Button
              v-if="categoricalColumns.length > 0"
              type="button"
              variant="ghost"
              size="xs"
              class="min-w-0 flex-1 rounded-none px-1 text-[10.5px] hover:bg-primary/10"
              :class="
                typeTab === 'categorical'
                  ? 'bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground'
                  : 'text-secondary'
              "
              @click="typeTab = 'categorical'"
            >
              <span class="min-w-0 flex-1 truncate"
                >{{ t("fomcharts.controls.axisGroupCategorical") }} ·
                {{ categoricalColumns.length }}</span
              >
            </Button>
          </div>

          <div
            class="mt-1.5 flex max-h-44 flex-col gap-0.5 overflow-x-hidden overflow-y-auto rounded-lg border border-secondary/20 bg-card p-1"
          >
            <button
              v-for="col in visibleColumns"
              :key="col"
              type="button"
              class="flex flex-col rounded-md px-2 py-1.5 text-left transition-colors"
              :class="
                col === activeValue
                  ? 'border-l-2 border-primary bg-primary/8 pl-1.75'
                  : 'border-l-2 border-transparent pl-1.75 hover:bg-secondary/8'
              "
              @click="selectColumn(col)"
            >
              <span
                class="truncate text-[12px] leading-tight"
                :class="
                  col === activeValue
                    ? 'font-semibold text-primary'
                    : 'text-ink'
                "
              >
                {{ splitColumnUnit(col).name }}
              </span>
              <span
                v-if="splitColumnUnit(col).unit"
                class="truncate font-mono text-[10px] leading-tight text-secondary"
              >
                {{ splitColumnUnit(col).unit }}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowUpDown, ChevronDown, Link2, Unlink2 } from "@lucide/vue";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { splitColumnUnit } from "@/utils/columnTypes";

const { t } = useI18n();

const props = defineProps<{
  numericColumns: string[];
  categoricalColumns: string[];
}>();

// Two-way bound to the parent (GraphControls, itself proxying VisualizationView) --
// GraphControls owns the actual same-column collision-avoidance watch (gated on
// `linked`), so this component only ever writes the picked value directly.
const xAxis = defineModel<string | null>("xAxis");
const yAxis = defineModel<string | null>("yAxis");
const linked = defineModel<boolean>("linked", { default: true });

// Which row (X or Y) the picker below is expanded for -- null means both rows
// are collapsed (the default: picking an axis shouldn't permanently occupy
// sidebar space with its column list, only while actively being edited).
const activeField = ref<"x" | "y" | null>(null);
const fields = computed(() => [
  {
    key: "y" as const,
    badge: "Y",
    label: t("fomcharts.controls.yAxis"),
    value: yAxis.value,
  },
  {
    key: "x" as const,
    badge: "X",
    label: t("fomcharts.controls.xAxis"),
    value: xAxis.value,
  },
]);
const activeValue = computed(() => {
  if (activeField.value === "x") return xAxis.value;
  if (activeField.value === "y") return yAxis.value;
  return null;
});

// Clicking the already-expanded row folds it back up; clicking the other
// (or a collapsed) row expands it instead.
const toggleField = (field: "x" | "y") => {
  activeField.value = activeField.value === field ? null : field;
};

// The Numeric/Categorical tab follows whichever field is being edited, so
// expanding a row always lands on the tab that already contains its current
// value -- re-picked (not just left alone) every time activeField changes.
const typeTab = ref<"numeric" | "categorical">("numeric");
watch(activeField, () => {
  if (activeField.value === null) return;
  typeTab.value = props.categoricalColumns.includes(activeValue.value ?? "")
    ? "categorical"
    : "numeric";
});

const visibleColumns = computed(() =>
  typeTab.value === "numeric" ? props.numericColumns : props.categoricalColumns,
);

// Picking a column does NOT fold the row back up -- unlike a native Select,
// staying open lets the researcher compare a few columns in a row without
// re-expanding the picker each time. Folding is a deliberate action (see
// toggleField), never a side effect of choosing.
const selectColumn = (column: string) => {
  if (activeField.value === "x") xAxis.value = column;
  else if (activeField.value === "y") yAxis.value = column;
};

const swapAxes = () => {
  const oldX = xAxis.value;
  xAxis.value = yAxis.value;
  yAxis.value = oldX;
};
</script>
