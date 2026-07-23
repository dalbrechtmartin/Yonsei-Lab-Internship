<template>
  <div class="flex min-h-0 flex-1 flex-col rounded-2xl border border-secondary/10 bg-secondary/5 p-3.5">
    <div class="mb-2.5 flex items-center justify-between">
      <span class="text-[11px] font-bold tracking-[0.08em] text-secondary uppercase">
        {{ t("fomcharts.annotations.title") }}
      </span>
      <span class="font-mono text-[11px] text-muted-foreground">{{ annotations.length }}</span>
    </div>

    <div v-if="annotations.length > 0" class="flex max-h-72 flex-col gap-2 overflow-y-auto">
      <div
        v-for="note in annotations"
        :key="note.id"
        class="flex items-start justify-between gap-1.5 rounded-lg border border-secondary/10 bg-white/70 px-2.5 py-2"
      >
        <div class="min-w-0">
          <strong class="text-[11.5px] text-ink">{{ note.ref }}</strong>
          <div class="font-mono text-[11px] leading-relaxed text-secondary">
            {{ note.yLabel }}: <strong class="text-ink">{{ note.yValue }}</strong><br />
            {{ note.xLabel }}: <strong class="text-ink">{{ note.xValue }}</strong>
            <template v-for="(value, key) in note.extras" :key="key">
              <br />{{ key }}: <strong class="text-ink">{{ value }}</strong>
            </template>
          </div>
        </div>
        <button
          type="button"
          class="shrink-0 text-muted-foreground hover:text-ink"
          :aria-label="t('fomcharts.annotations.remove')"
          @click="$emit('remove', note.id)"
        >
          <X class="size-3.5" />
        </button>
      </div>
    </div>
    <p v-else class="text-xs leading-relaxed text-muted-foreground">
      {{ t("fomcharts.annotations.empty") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { X } from "@lucide/vue";

const { t } = useI18n();

export interface Annotation {
  id: string;
  ref: string;
  xLabel: string;
  xValue: unknown;
  yLabel: string;
  yValue: unknown;
  extras: Record<string, unknown>;
}

defineProps<{
  annotations: Annotation[];
}>();
defineEmits<{
  remove: [id: string];
}>();
</script>
