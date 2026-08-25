<template>
  <div
    v-if="record && sources.length"
    class="flex shrink-0 items-start gap-2.5 rounded-lg border px-3.5 py-3"
    :class="
      record.reviewStatus === 'Edit'
        ? 'border-amber-500/25 bg-amber-500/8'
        : 'border-secondary/15 bg-secondary/5'
    "
  >
    <span
      class="mt-px shrink-0 text-sm leading-none"
      :class="
        record.reviewStatus === 'Edit' ? 'text-amber-600' : 'text-secondary'
      "
      aria-hidden="true"
    >
      {{ record.reviewStatus === "Edit" ? "⚠" : "❝" }}
    </span>
    <div class="flex min-w-0 flex-1 flex-col gap-2.5">
      <div v-for="(source, i) in sources" :key="i">
        <p
          v-if="sources.length > 1"
          class="text-[11px] font-medium tracking-wide text-secondary uppercase"
        >
          {{
            t("extraction.review.callout.sourceOf", {
              current: i + 1,
              total: sources.length,
            })
          }}
        </p>
        <p
          class="text-xs leading-relaxed"
          :class="
            record.reviewStatus === 'Edit' ? 'text-amber-900' : 'text-ink'
          "
        >
          {{ t("extraction.review.callout.evidenceLabel") }}
          <span
            class="italic transition-colors"
            :class="hoveredIndex === i ? 'rounded-sm bg-primary/15' : ''"
          >
            « {{ source.quote }} »
          </span>
        </p>
        <p v-if="source.location" class="mt-1 text-xs text-secondary">
          {{ t("extraction.review.callout.locationLabel") }}
          <button
            type="button"
            class="cursor-pointer bg-transparent p-0 text-left underline decoration-dotted underline-offset-2 hover:text-ink"
            @mouseenter="hoveredIndex = i"
            @mouseleave="hoveredIndex = null"
            @click="emit('select-source', source)"
          >
            {{ source.location }}
          </button>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { ExtractionRecord } from "@/services/api";
import {
  parseEvidenceSources,
  type EvidenceSource,
} from "@/utils/parseLocation";
import { recordKey } from "@/composables/useExtractionRecords";

const props = defineProps<{ record: ExtractionRecord | null }>();
const emit = defineEmits<{ "select-source": [source: EvidenceSource] }>();
const { t } = useI18n();

const sources = computed(() =>
  parseEvidenceSources(
    props.record?.evidence ?? null,
    props.record?.location ?? null,
  ),
);

// A stale hover highlight must never bleed into a newly-selected record --
// keyed off the record's stable identity, not object identity (cursor gets
// a new object reference on every Valider/Corriger/Exclure PATCH even while
// staying on the same logical record).
const hoveredIndex = ref<number | null>(null);
watch(
  () => (props.record ? recordKey(props.record) : null),
  () => {
    hoveredIndex.value = null;
  },
);
</script>
