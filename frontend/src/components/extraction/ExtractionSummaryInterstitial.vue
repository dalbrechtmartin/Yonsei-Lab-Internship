<template>
  <Dialog :open="true">
    <DialogContent
      class="flex w-full max-w-lg flex-col items-center gap-4 rounded-[14px] border-white/60 bg-card/95 p-9 text-center shadow-2xl [&>button]:hidden"
      @escape-key-down.prevent
      @pointer-down-outside.prevent
    >
      <span
        class="flex size-13 items-center justify-center rounded-full bg-emerald-500/12"
      >
        <Check class="size-6.5 text-emerald-600" stroke-width="2.5" />
      </span>

      <div>
        <p class="text-xl font-semibold text-ink">
          {{ t("extraction.summary.heading") }}
        </p>
        <p class="mt-1.5 text-sm text-secondary">
          {{ t("extraction.summary.subheading") }}
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-center gap-2">
        <span
          class="inline-flex items-center rounded-full bg-secondary/8 px-3 py-1 text-xs text-secondary"
        >
          {{
            t(
              "extraction.summary.stats.filesProcessed",
              { files: job.totalFiles },
              { plural: job.totalFiles },
            )
          }}
          ·
          {{
            t(
              "extraction.summary.stats.rowsExtracted",
              { records: recordCount },
              { plural: recordCount },
            )
          }}
        </span>
        <span
          class="inline-flex items-center rounded-full bg-secondary/8 px-3 py-1 font-mono text-xs text-secondary"
        >
          {{ durationLabel }}
        </span>
        <span
          v-if="warningCount > 0"
          class="inline-flex items-center rounded-full bg-amber-500/12 px-3 py-1 text-xs text-amber-700"
        >
          {{
            t(
              "extraction.summary.stats.warnings",
              { count: warningCount },
              { plural: warningCount },
            )
          }}
        </span>
      </div>

      <div class="h-1.5 w-45 overflow-hidden rounded-full bg-secondary/12">
        <div
          class="h-full rounded-full bg-primary transition-[width] ease-linear"
          :style="{ width: fillPct + '%', transitionDuration: autoAdvanceMs + 'ms' }"
        />
      </div>

      <Button type="button" variant="outline" @click="emit('continue')">
        {{ t("extraction.summary.cta") }}
      </Button>
    </DialogContent>
  </Dialog>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Check } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { JobStatusResponse } from "@/services/api";
import { formatDuration } from "@/utils/extractionEta";

const props = withDefaults(
  defineProps<{
    job: JobStatusResponse;
    warningCount: number;
    autoAdvanceMs?: number;
  }>(),
  { autoAdvanceMs: 2500 },
);

const emit = defineEmits<{
  continue: [];
}>();

const { t } = useI18n();

const recordCount = props.job.files.reduce((sum, f) => sum + f.recordCount, 0);
const durationLabel = formatDuration(
  Date.now() - new Date(props.job.createdAt).getTime(),
);

// Visual countdown toward the auto-advance -- starts at 0% and the CSS
// transition (duration bound to autoAdvanceMs) animates it to 100%,
// giving a concrete cue for the same timer that fires `continue` below.
const fillPct = ref(0);
let advanceTimer: number | null = null;
let fillFrame: number | null = null;

onMounted(() => {
  fillFrame = requestAnimationFrame(() => {
    fillPct.value = 100;
  });
  advanceTimer = window.setTimeout(() => {
    emit("continue");
  }, props.autoAdvanceMs);
});

onUnmounted(() => {
  if (advanceTimer !== null) window.clearTimeout(advanceTimer);
  if (fillFrame !== null) cancelAnimationFrame(fillFrame);
});
</script>
