<template>
  <div v-if="job.files.length > 1" class="flex flex-wrap items-center gap-2.5">
    <span
      class="text-[11px] font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("extraction.running.batch") }}
    </span>
    <TooltipProvider :delay-duration="200">
      <span class="flex items-center gap-1.5">
        <Tooltip v-for="file in job.files" :key="file.id">
          <TooltipTrigger as-child>
            <span class="inline-flex">
              <component
                :is="fileIcon(file)"
                class="size-4.5 shrink-0 transition-transform"
                :class="fileIconClass(file)"
              />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            {{ file.filename }} —
            {{ t(`extraction.progress.file.${fileLabelKey(file)}`) }}
          </TooltipContent>
        </Tooltip>
      </span>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { toRef } from "vue";
import { useI18n } from "vue-i18n";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { JobStatusResponse } from "@/services/api";
import { useExtractionProgressDisplay } from "@/composables/useExtractionProgressDisplay";

const { t } = useI18n();
const props = defineProps<{ job: JobStatusResponse }>();
const { fileIcon, fileIconClass, fileLabelKey } = useExtractionProgressDisplay(
  toRef(props, "job"),
);
</script>
