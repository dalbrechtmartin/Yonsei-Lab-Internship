<template>
  <div v-if="displayValue !== null || editable" :class="wide ? 'col-span-2' : ''">
    <div
      class="flex flex-col gap-0.5 rounded-md border border-secondary/20 bg-card px-2.5 py-1.5 transition-colors"
      :class="hasWarning ? 'border-amber-500/30 bg-amber-500/6' : ''"
    >
      <dt class="text-[10px] font-medium tracking-wide text-secondary uppercase">
        {{ label }}
      </dt>
      <dd v-if="editing" class="flex items-start gap-1.5">
        <textarea
          v-if="wide"
          ref="inputRef"
          v-model="draft"
          rows="2"
          class="min-w-0 flex-1 resize-none rounded border border-primary/40 bg-transparent px-1 py-0.5 text-[13px] font-medium text-ink outline-none focus:border-primary"
          @keydown.esc="cancel"
          @keydown.enter.ctrl="commit"
          @keydown.enter.meta="commit"
        />
        <input
          v-else
          ref="inputRef"
          v-model="draft"
          :type="type === 'number' ? 'number' : 'text'"
          class="min-w-0 flex-1 rounded border border-primary/40 bg-transparent px-1 py-0.5 text-[13px] font-medium text-ink outline-none focus:border-primary"
          @keydown.enter="commit"
          @keydown.esc="cancel"
        />
        <button
          type="button"
          class="mt-0.5 shrink-0 rounded p-0.5 text-emerald-600 hover:bg-emerald-500/15"
          :aria-label="t('extraction.review.edit.save')"
          @click="commit"
        >
          <Check class="size-3.5" />
        </button>
        <button
          type="button"
          class="mt-0.5 shrink-0 rounded p-0.5 text-secondary hover:bg-secondary/15"
          :aria-label="t('extraction.review.edit.cancel')"
          @click="cancel"
        >
          <X class="size-3.5" />
        </button>
      </dd>
      <dd v-else class="flex items-start gap-1.5">
        <span
          class="min-w-0 flex-1 text-[13px] font-medium break-words"
          :class="displayValue !== null ? 'text-ink' : 'text-secondary/50 italic'"
          >{{ displayValue !== null ? displayValue : "—" }}</span
        >

        <Popover v-if="note">
          <PopoverTrigger as-child>
            <button
              type="button"
              class="mt-0.5 shrink-0 rounded p-0.5"
              :class="
                note.severity === 'warning'
                  ? 'text-amber-600 hover:bg-amber-500/15'
                  : 'text-secondary hover:bg-secondary/15'
              "
              :aria-label="t('extraction.review.detail.reconciliation.aria')"
            >
              <AlertTriangle v-if="note.severity === 'warning'" class="size-3.5" />
              <Info v-else class="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" class="w-72 p-2.5 text-xs leading-relaxed text-ink">
            {{ note.text }}
          </PopoverContent>
        </Popover>

        <button
          v-if="hasSource"
          type="button"
          class="mt-0.5 shrink-0 rounded p-0.5 text-secondary/70 transition-colors hover:bg-secondary/15 hover:text-ink"
          :aria-label="t('extraction.review.detail.jumpToSource', { field: label })"
          @click="emit('select-source')"
        >
          <Quote class="size-3.5" />
        </button>

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
import { AlertTriangle, Check, Info, Pencil, Quote, X } from "@lucide/vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// Read-only (or, for `editable` fields, inline-editable) label/value pair
// for ExtractionReviewDetail's field grid -- hides itself entirely when
// there's nothing to show AND it isn't editable, so a record missing an
// optional non-editable field doesn't leave a dangling empty label behind.
// An editable-but-empty field (e.g. no Q-factor yet) still renders, with a
// muted placeholder, so a reviewer can fill it in via its own pencil rather
// than it being unreachable just because the AI left it blank.
const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number | null;
    /** Spans both grid columns, for a field too long for the half-width slot
     * (e.g. Title) -- also switches the inline editor to a multi-line
     * textarea instead of a single-line input. */
    wide?: boolean;
    /** Shows the pencil affordance; parent decides which fields are actually correctable. */
    editable?: boolean;
    /** Value type for the inline editor -- 'number' renders a numeric input
     * and commits `Number(draft)` (or null if left blank). */
    type?: "text" | "number";
    /** Pre-rendered (already-translated) note text -- e.g. a multi-run
     * disagreement or a unit conversion -- surfaced right on this field
     * instead of only inside the Provenance accordion. */
    note?: { severity: "info" | "warning"; text: string } | null;
    /** Forces the amber "needs attention" styling even without a `note` --
     * used for Notes, which is always worth a reviewer's attention when
     * non-empty regardless of cross-run reconciliation status. */
    emphasize?: boolean;
    /** Any value that changes when the active record changes (e.g. a
     * fileId:index key) -- resets a field out of mid-edit state so an
     * in-progress, uncommitted edit never bleeds into the next record
     * navigated to. */
    resetToken?: string | number | null;
    /** Shows a "jump to source" affordance (the same Quote icon as the
     * always-visible Sources strip) -- the parent already knows which
     * source, if any, backs this specific field (see ExtractionReviewDetail's
     * sourceForField), this is just the click target. */
    hasSource?: boolean;
  }>(),
  {
    wide: false,
    editable: false,
    type: "text",
    note: null,
    emphasize: false,
    resetToken: null,
    hasSource: false,
  },
);
const emit = defineEmits<{
  save: [value: string | number | null];
  /** No payload -- the parent already knows which field this is (see
   * hasSource above), it just needs to know the icon was clicked. */
  "select-source": [];
}>();
const { t } = useI18n();

const hasWarning = computed(() => props.note?.severity === "warning" || props.emphasize);

const displayValue = computed(() => {
  if (props.value === null || props.value === undefined || props.value === "")
    return null;
  return String(props.value);
});

const editing = ref(false);
const draft = ref("");
const inputRef = ref<HTMLInputElement | HTMLTextAreaElement | null>(null);

watch(
  () => props.resetToken,
  () => {
    editing.value = false;
  },
);

async function startEdit() {
  draft.value = props.value === null || props.value === undefined ? "" : String(props.value);
  editing.value = true;
  await nextTick();
  inputRef.value?.focus();
}

function cancel() {
  editing.value = false;
}

function commit() {
  const raw = draft.value.trim();
  const value = raw === "" ? null : props.type === "number" ? Number(raw) : raw;
  editing.value = false;
  emit("save", value);
}
</script>
