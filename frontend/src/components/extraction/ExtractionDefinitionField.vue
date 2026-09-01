<template>
  <div v-if="displayValue !== null || editable" :class="wide ? 'col-span-2' : ''">
    <div
      class="flex flex-col gap-0.5 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5 transition-colors"
      :class="hasWarning && !confirmed ? 'border-amber-500/30 bg-amber-500/6' : ''"
    >
      <dt class="text-[10px] font-medium tracking-wide text-secondary uppercase">
        {{ label }}
      </dt>
      <dd v-if="editing" class="flex flex-col gap-1.5">
        <RadioGroup v-model="mode" class="gap-1.5">
          <label class="flex items-center gap-1.5 text-[13px] text-ink">
            <RadioGroupItem value="recognized" />
            {{ t("extraction.review.detail.definition.recognized") }}
          </label>
          <label class="flex items-center gap-1.5 text-[13px] text-ink">
            <RadioGroupItem value="custom" />
            {{ t("extraction.review.detail.definition.custom") }}
          </label>
        </RadioGroup>
        <input
          v-if="mode === 'custom'"
          ref="inputRef"
          v-model="customDraft"
          type="text"
          class="min-w-0 flex-1 rounded border border-primary/40 bg-transparent px-1 py-0.5 text-[13px] font-medium text-ink outline-none focus:border-primary"
          @keydown.enter="commit"
          @keydown.esc="cancel"
        />
        <div class="flex justify-end gap-1">
          <button
            type="button"
            class="shrink-0 rounded p-0.5 text-emerald-600 hover:bg-emerald-500/15"
            :aria-label="t('extraction.review.edit.save')"
            @click="commit"
          >
            <Check class="size-3.5" />
          </button>
          <button
            type="button"
            class="shrink-0 rounded p-0.5 text-secondary hover:bg-secondary/15"
            :aria-label="t('extraction.review.edit.cancel')"
            @click="cancel"
          >
            <X class="size-3.5" />
          </button>
        </div>
      </dd>
      <dd v-else class="flex items-start gap-1.5">
        <span
          class="min-w-0 flex-1 text-[13px] font-medium break-words"
          :class="displayValue !== null ? 'text-ink' : 'text-secondary/50 italic'"
          >{{ displayValue !== null ? displayValue : "—" }}</span
        >

        <!-- The warning/info icon IS the confirm toggle -- one icon instead
             of two, and it visibly changes (amber triangle -> green check)
             the moment it's confirmed. -->
        <Popover v-if="note">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="mt-0.5 shrink-0 rounded p-0.5"
              :class="
                confirmed
                  ? 'text-emerald-600 hover:bg-emerald-500/15'
                  : note.severity === 'warning'
                    ? 'text-amber-600 hover:bg-amber-500/15'
                    : 'text-secondary hover:bg-secondary/15'
              "
              :aria-label="t('extraction.review.detail.reconciliation.aria')"
            >
              <Check v-if="confirmed" class="size-3.5" />
              <AlertTriangle v-else-if="note.severity === 'warning'" class="size-3.5" />
              <Info v-else class="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" class="flex w-72 flex-col gap-2 p-2.5 text-xs leading-relaxed text-ink">
            <p>{{ note.text }}</p>
            <button
              v-if="showConfirm && hasWarning"
              type="button"
              class="flex w-fit items-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-colors"
              :class="
                confirmed
                  ? 'text-secondary hover:bg-secondary/10'
                  : 'text-emerald-700 hover:bg-emerald-500/10'
              "
              @click="emit('toggle-confirm')"
            >
              <Undo2 v-if="confirmed" class="size-3.5" />
              <Check v-else class="size-3.5" />
              {{
                confirmed
                  ? t("extraction.review.detail.unconfirmField", { field: label })
                  : t("extraction.review.detail.confirmField", { field: label })
              }}
            </button>
          </PopoverContent>
        </Popover>

        <button
          v-if="editable"
          type="button"
          class="mt-0.5 shrink-0 rounded p-0.5 text-secondary/70 transition-colors hover:bg-secondary/15 hover:text-ink"
          :aria-label="t('extraction.review.detail.editField', { field: label })"
          @click="startEdit"
        >
          <Pencil class="size-3.5" />
        </button>
      </dd>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { AlertTriangle, Check, Info, Pencil, Undo2, X } from "@lucide/vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { isRecognizedFomDefinition } from "@/utils/fomRelations";

// Definition-specific editor: the backend/frontend FOM-relation solver only
// ever recognizes ONE formula ("FOM = Sensitivity / FWHM", see
// isRecognizedFomDefinition) -- so this isn't really a free-text field with
// many valid shapes, it's a binary choice between "the one formula the app
// can actually compute with" and "whatever the paper actually states,
// verbatim". A typo in free text silently breaks the FOM/Sensitivity/FWHM
// auto-fill/recompute feature elsewhere in this card without any visible
// sign why -- this editor makes that distinction explicit instead.
const CANONICAL_DEFINITION = "FOM = Sensitivity / FWHM";

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | null;
    wide?: boolean;
    editable?: boolean;
    note?: { severity: "info" | "warning"; text: string } | null;
    resetToken?: string | number | null;
    showConfirm?: boolean;
    confirmed?: boolean;
  }>(),
  {
    wide: false,
    editable: false,
    note: null,
    resetToken: null,
    showConfirm: false,
    confirmed: false,
  },
);
const emit = defineEmits<{ save: [value: string | null]; "toggle-confirm": [] }>();
const { t } = useI18n();

const hasWarning = computed(() => props.note?.severity === "warning");

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === "") return null;
  return props.value;
});

const editing = ref(false);
const mode = ref<"recognized" | "custom">("custom");
const customDraft = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

watch(
  () => props.resetToken,
  () => {
    editing.value = false;
  },
);

async function startEdit() {
  if (isRecognizedFomDefinition(props.value)) {
    mode.value = "recognized";
    customDraft.value = "";
  } else {
    mode.value = "custom";
    customDraft.value = props.value ?? "";
  }
  editing.value = true;
  await nextTick();
  if (mode.value === "custom") inputRef.value?.focus();
}

function cancel() {
  editing.value = false;
}

// Only overwrites the stored text with the canonical spelling when actually
// switching INTO "recognized" from something else -- confirming an already-
// recognized Definition unchanged emits the original text verbatim, so
// opening then saving without touching anything never produces a diff.
function commit() {
  editing.value = false;
  if (mode.value === "recognized") {
    emit("save", isRecognizedFomDefinition(props.value) ? props.value : CANONICAL_DEFINITION);
    return;
  }
  const raw = customDraft.value.trim();
  emit("save", raw === "" ? null : raw);
}
</script>
