<template>
  <div class="flex min-h-0 flex-1 flex-col">
    <ExtractionProgressHeader :job="job" />

    <div class="flex min-h-0 flex-1 gap-6 overflow-y-auto p-5 sm:gap-7 sm:p-7">
      <div class="flex min-h-0 min-w-0 flex-[1.1] flex-col gap-3.5">
        <ExtractionFileIconStrip :job="job" />
        <ExtractionNoticeBanner :job="job" />
        <ExtractionCurrentFileCard :job="job" />
        <ExtractionNextFileCard :file="nextFile" />

        <ExtractionEventLog
          class="min-h-40 flex-1"
          :entries="entries"
          :warning-count="warningCount"
        />
      </div>

      <div class="hidden w-px shrink-0 bg-secondary/10 sm:block" />

      <div class="flex min-h-0 min-w-0 flex-[1.15] flex-col gap-3">
        <PhotonDashGame
          :extraction-done="job.status === 'done'"
          @expanded-change="onGameExpandedChange"
        />
        <!-- Folded by default (see PhotonDashGame's own `expanded` default)
             -- while it's tucked away, the space it vacates shows a live
             preview of whatever file is currently being analyzed, so the
             researcher has the paper itself to read instead of empty
             space. Swaps to a different file automatically as the batch
             progresses, since `currentFile` just follows the job. -->
        <ExtractionPdfViewer
          v-if="!gameExpanded && currentFile"
          class="min-h-0 flex-1"
          :job-id="job.jobId"
          :file-id="currentFile.id"
          :filename="currentFile.filename"
          :location="null"
          :evidence="null"
          :get-page-count="getPageCount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue";
import { apiService, type JobStatusResponse } from "@/services/api";
import type { ExtractionLogEntry } from "@/composables/useExtractionEventLog";
import { useExtractionProgressDisplay } from "@/composables/useExtractionProgressDisplay";
import PhotonDashGame from "@/components/extraction/PhotonDashGame.vue";
import ExtractionProgressHeader from "@/components/extraction/ExtractionProgressHeader.vue";
import ExtractionFileIconStrip from "@/components/extraction/ExtractionFileIconStrip.vue";
import ExtractionCurrentFileCard from "@/components/extraction/ExtractionCurrentFileCard.vue";
import ExtractionNextFileCard from "@/components/extraction/ExtractionNextFileCard.vue";
import ExtractionNoticeBanner from "@/components/extraction/ExtractionNoticeBanner.vue";
import ExtractionEventLog from "@/components/extraction/ExtractionEventLog.vue";
import ExtractionPdfViewer from "@/components/extraction/ExtractionPdfViewer.vue";

const props = defineProps<{
  job: JobStatusResponse;
  entries: ExtractionLogEntry[];
  warningCount: number;
}>();

const emit = defineEmits<{
  /** Bubbles PhotonDashGame's own expanded-change up to ExtractionView, so
   * it can hold off popping the summary interstitial over an active round
   * -- the mockup's own note ("la bascule attend la fin") mirrors this
   * app's original single-screen behavior of never yanking the game away
   * mid-round. */
  "game-expanded-change": [expanded: boolean];
}>();

const { nextFile, currentFile } = useExtractionProgressDisplay(toRef(props, "job"));

// Also drives the PDF-preview swap above, not just the summary-interstitial
// gating that `game-expanded-change` originally existed for.
const gameExpanded = ref(false);
function onGameExpandedChange(expanded: boolean) {
  gameExpanded.value = expanded;
  emit("game-expanded-change", expanded);
}

// Memoized per file, same as the review step's own getPageCount
// (useExtractionRecords) -- a file's page count never changes mid-job.
const pageCountCache = new Map<string, number>();
async function getPageCount(fileId: string): Promise<number> {
  const cached = pageCountCache.get(fileId);
  if (cached !== undefined) return cached;
  const total = await apiService.getFilePageCount(props.job.jobId, fileId);
  pageCountCache.set(fileId, total);
  return total;
}
</script>
