<template>
  <div class="w-full max-w-2xl">
    <div class="flex items-center justify-between text-sm text-secondary">
      <span>
        {{
          t("extraction.progress.overall", {
            done: job.completedCount,
            total: job.totalFiles,
          })
        }}
      </span>
      <span v-if="showResume" class="font-medium text-rose-700">
        {{ t("extraction.quotaHit") }}
      </span>
    </div>

    <ul class="mt-3 flex flex-col gap-1.5">
      <li
        v-for="file in job.files"
        :key="file.id"
        class="flex items-center justify-between gap-3 rounded-xl border border-secondary/10 bg-background/70 px-3 py-2 text-sm"
      >
        <span class="min-w-0 flex-1 truncate text-ink">{{ file.filename }}</span>
        <span
          class="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
          :class="pillClass(file.status)"
        >
          <span
            v-if="file.status === 'processing'"
            class="h-2.5 w-2.5 animate-spin rounded-full border border-primary/40 border-t-primary"
            aria-hidden="true"
          />
          {{ t(`extraction.progress.file.${file.status}`) }}
        </span>
      </li>
    </ul>

    <Button v-if="showResume" type="button" class="mt-4" @click="$emit('resume')">
      {{ t("extraction.progress.resume") }}
    </Button>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Button } from "@/components/ui/button";
import type { JobFileStatusValue, JobStatusResponse } from "@/services/api";

const { t } = useI18n();

const props = defineProps<{ job: JobStatusResponse }>();
defineEmits<{ resume: [] }>();

const showResume = computed(
  () =>
    (["quota_hit", "interrupted", "error"] as const).includes(
      props.job.status as "quota_hit" | "interrupted" | "error",
    ) && props.job.completedCount < props.job.totalFiles,
);

const pillClass = (status: JobFileStatusValue) => {
  switch (status) {
    case "done":
      return "bg-emerald-500/10 text-emerald-700";
    case "failed":
      return "bg-rose-500/10 text-rose-700";
    case "processing":
      return "bg-primary/10 text-primary";
    default:
      return "bg-secondary/10 text-secondary";
  }
};
</script>
