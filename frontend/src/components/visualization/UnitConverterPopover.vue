<template>
  <Popover v-model:open="open">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="flex shrink-0 items-center gap-1.5 rounded-md border border-input px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-secondary/10 hover:text-ink"
      >
        <Calculator class="size-3.5" />
        {{ t("fomcharts.addPoint.converter.trigger") }}
      </button>
    </PopoverTrigger>
    <!-- z-60 overrides PopoverContent's default z-30 -- this popover is
         opened from inside AddPointDialog (a Dialog, z-50), the first place
         in the app nesting a Popover inside a Dialog, and without this it
         renders behind the dialog panel: technically open, but invisible. -->
    <PopoverContent align="start" side="top" class="z-60 w-72 p-3">
      <div class="flex flex-col gap-2.5">
        <p class="text-[11px] font-bold text-ink">
          {{ t("fomcharts.addPoint.converter.title") }}
        </p>
        <p class="text-[10.5px] text-muted-foreground">
          {{ t("fomcharts.addPoint.converter.hint") }}
        </p>

        <div class="flex items-center gap-1.5">
          <Input
            :model-value="rawValue"
            type="number"
            step="any"
            class="h-8 flex-1 text-sm"
            :placeholder="t('fomcharts.addPoint.converter.valuePlaceholder')"
            @update:model-value="(v) => (rawValue = String(v))"
          />
          <Select v-model="unitKey">
            <SelectTrigger size="sm" class="h-8 w-32 shrink-0 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="u in UNITS" :key="u.key" :value="u.key">{{
                u.label
              }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          v-if="result !== null"
          class="flex items-center gap-2 rounded-md border border-secondary/20 bg-secondary/5 px-2.5 py-1.5"
        >
          <span class="flex-1 truncate text-sm font-medium tabular-nums"
            >{{ result }} {{ activeUnit.targetLabel }}</span
          >
          <button
            type="button"
            class="shrink-0 text-[10.5px] font-medium text-primary hover:underline"
            @click="copyResult"
          >
            {{
              copied
                ? t("fomcharts.addPoint.converter.copied")
                : t("fomcharts.addPoint.converter.copy")
            }}
          </button>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Calculator } from "@lucide/vue";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/**
 * Standalone scratch converter, opened from the Add Point dialog's footer --
 * every measurement field in that form is always edited in its canonical
 * unit now (nm / nm/RIU, see AddPointField, which dropped its old per-field
 * unit toggle), so a paper stating a value in µm or pm gets converted HERE
 * and typed into the field by hand. Deliberately read-only/disconnected from
 * any field: opening it can never silently overwrite whatever the researcher
 * is mid-typing elsewhere in the form.
 */
const { t } = useI18n();

const open = defineModel<boolean>("open", { default: false });

const UNITS = [
  { key: "um", label: "µm → nm", factor: 1000, targetLabel: "nm" },
  { key: "pm", label: "pm → nm", factor: 0.001, targetLabel: "nm" },
  {
    key: "um_riu",
    label: "µm/RIU → nm/RIU",
    factor: 1000,
    targetLabel: "nm/RIU",
  },
] as const;

// Bound via :model-value/@update:model-value rather than a plain v-model --
// on a type="number" Input, Vue hands back a real JS number (not a string)
// once the value round-trips through a prop, so this coerces it back to a
// string on every update. Without it rawValue.value can silently stop being
// a string, and rawValue.value.trim() below throws.
const rawValue = ref("");
const unitKey = ref<(typeof UNITS)[number]["key"]>("um");
const activeUnit = computed(
  () => UNITS.find((u) => u.key === unitKey.value) ?? UNITS[0],
);

const result = computed<string | null>(() => {
  if (rawValue.value.trim() === "") return null;
  const n = Number(rawValue.value);
  if (!isFinite(n)) return null;
  // toPrecision(10) then back through Number() strips float noise (e.g.
  // 1.55 * 1000 landing on 1550.0000000000002) without hardcoding a fixed
  // decimal count that would be wrong for both a 4-digit wavelength and a
  // sub-1 pm value.
  return Number((n * activeUnit.value.factor).toPrecision(10)).toString();
});

const copied = ref(false);
let copiedTimer: ReturnType<typeof setTimeout> | null = null;
const copyResult = () => {
  if (result.value === null) return;
  navigator.clipboard.writeText(result.value);
  copied.value = true;
  if (copiedTimer) clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copied.value = false), 1500);
};

// Fresh every time it's reopened -- this is a scratch calculator, not a
// field that should remember what was last converted.
watch(open, (isOpen) => {
  if (isOpen) {
    rawValue.value = "";
    copied.value = false;
  }
});
</script>
