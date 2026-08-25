<template>
  <div
    v-if="job.notice"
    class="flex items-start gap-2 rounded-[10px] border border-amber-500/20 bg-amber-500/10 px-3 py-2.5"
  >
    <span class="mt-px text-sm leading-none">⚠</span>
    <p class="text-xs leading-relaxed text-amber-900">
      {{
        t(`extraction.notice.${job.notice.reason}`, {
          count: job.notice.pendingCount,
        })
      }}
      {{ t("extraction.notice.retryIn", { seconds: retrySecondsLeft }) }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";
import type { JobStatusResponse } from "@/services/api";
import { useExtractionProgressDisplay } from "@/composables/useExtractionProgressDisplay";

const { t } = useI18n();
const props = defineProps<{ job: JobStatusResponse }>();
const { retrySecondsLeft } = useExtractionProgressDisplay(toRef(props, "job"));
</script>
