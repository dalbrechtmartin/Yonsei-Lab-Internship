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
        <MaterialsTagsField
          v-model="draftTags"
          :options="options"
          :placeholder="t('extraction.review.detail.tags.searchPlaceholder')"
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
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { AlertTriangle, Check, Info, Pencil, Undo2, X } from "@lucide/vue";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MaterialsTagsField from "@/components/visualization/MaterialsTagsField.vue";

// Multi-value counterpart to ExtractionDetailField, for the two composite
// (";"-joined) fields -- Material Class and Base Materials -- that read
// better as a checkbox tag list than a single free-text line. Same
// dt/dd/note/pencil chrome and resetToken contract as ExtractionDetailField,
// so the two read as one consistent field family in the Materiaux section.
const props = withDefaults(
  defineProps<{
    label: string;
    /** ";"-joined, same storage convention as the record field itself. */
    value: string | null;
    /** Wide spans both grid columns -- unused today (both Material Class and
     * Base Materials sit in the default half-width slot) but kept for parity
     * with ExtractionDetailField in case a future field needs it. */
    wide?: boolean;
    editable?: boolean;
    /** Suggested values -- the field's own canonical/job-derived list (see
     * ExtractionReviewDetail's materialClassOptions/baseMaterialsJobOptions).
     * Always creatable (MaterialsTagsField's own "+ Add" row): the LLM's own
     * classification isn't infallible, so a reviewer must be able to add a
     * value that isn't in the suggested list. */
    options: string[];
    note?: { severity: "info" | "warning"; text: string } | null;
    resetToken?: string | number | null;
    showConfirm?: boolean;
    confirmed?: boolean;
  }>(),
  {
    wide: false,
    editable: false,
    options: () => [],
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
  if (props.value === null || props.value === undefined || props.value.trim() === "") return null;
  return props.value;
});

function parseTags(value: string | null): string[] {
  return (value ?? "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

const editing = ref(false);
const draftTags = ref<string[]>([]);

watch(
  () => props.resetToken,
  () => {
    editing.value = false;
  },
);

function startEdit() {
  draftTags.value = parseTags(props.value);
  editing.value = true;
}

function cancel() {
  editing.value = false;
}

function commit() {
  editing.value = false;
  emit("save", draftTags.value.length ? draftTags.value.join("; ") : null);
}
</script>
