<template>
  <div
    class="flex min-h-0 flex-1 flex-col rounded-[10px] border border-secondary/12 bg-secondary/4"
  >
    <div
      class="flex shrink-0 items-center gap-1.5 border-b border-secondary/10 px-3.5 py-2.5"
    >
      <span class="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{{
        filename
      }}</span>
      <span
        v-if="totalPages"
        class="shrink-0 rounded-full bg-secondary/10 px-2.5 py-0.5 font-mono text-[11px] text-secondary"
      >
        {{ t("extraction.review.pdf.pageOf", { current: pageNumber, total: totalPages }) }}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :disabled="pageNumber <= 1"
        :aria-label="t('extraction.review.pdf.prevPage')"
        @click="pageNumber--"
      >
        <ChevronLeft class="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :disabled="!!totalPages && pageNumber >= totalPages"
        :aria-label="t('extraction.review.pdf.nextPage')"
        @click="pageNumber++"
      >
        <ChevronRight class="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :disabled="zoomIndex === 0"
        :aria-label="t('extraction.review.pdf.zoomOut')"
        @click="zoomIndex--"
      >
        <Minus class="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :disabled="zoomIndex === ZOOM_STEPS.length - 1"
        :aria-label="t('extraction.review.pdf.zoomIn')"
        @click="zoomIndex++"
      >
        <Plus class="size-3.5" />
      </Button>
    </div>
    <div class="min-h-0 flex-1 overflow-auto p-4" ref="scrollContainerEl">
      <div
        class="relative mx-auto"
        :style="{ width: ZOOM_STEPS[zoomIndex] + '%' }"
      >
        <img
          :key="pageUrl"
          ref="imgEl"
          :src="pageUrl"
          :alt="filename"
          class="block w-full max-w-none rounded-md border border-secondary/12 bg-white shadow-[0_10px_20px_-12px_rgba(15,23,42,0.18)]"
          @load="handleImageLoad"
        />
        <div
          v-for="(box, i) in matchBoxes"
          :key="i"
          class="pointer-events-none absolute rounded-sm bg-amber-400/35 ring-2 ring-amber-500/70"
          :style="{
            left: box.left + '%',
            top: box.top + '%',
            width: box.width + '%',
            height: box.height + '%',
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ChevronLeft, ChevronRight, Minus, Plus } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { apiService } from "@/services/api";
import { parsePageNumber } from "@/utils/parseLocation";

const { t } = useI18n();

const props = defineProps<{
  jobId: string;
  fileId: string;
  filename: string;
  location: string | null;
  /** The record's cited passage -- searched for in the page's real text
   * layer (see apiService.getEvidenceMatches) so the viewer can highlight
   * and auto-scroll to it instead of just naming it. */
  evidence: string | null;
  /** Memoized per file by the caller (see useExtractionRecords.getPageCount)
   * so switching between records in the same file doesn't re-fetch. */
  getPageCount: (fileId: string) => Promise<number>;
}>();

const ZOOM_STEPS = [70, 85, 100, 125, 150, 175, 200];
const zoomIndex = ref(2);

const pageNumber = ref(parsePageNumber(props.location));
const totalPages = ref<number | null>(null);

const pageUrl = computed(() =>
  apiService.getPdfPageUrl(props.jobId, props.fileId, pageNumber.value),
);

async function loadTotalPages() {
  totalPages.value = null;
  try {
    totalPages.value = await props.getPageCount(props.fileId);
  } catch (error) {
    console.error("Failed to fetch PDF page count:", error);
  }
}

watch(
  () => props.fileId,
  () => loadTotalPages(),
  { immediate: true },
);

// A newly-selected record (even within the same file) resets the page to
// wherever its own Location points -- the researcher is looking at a
// different value, not still reading the previous one's page. Also fires
// on a bare file switch with no location change (e.g. the extraction
// running step's live preview, which never sets `location`) -- otherwise
// the viewer would keep whatever page number the previous file was on,
// which may not even exist in the new one.
watch(
  [() => props.fileId, () => props.location],
  () => {
    pageNumber.value = parsePageNumber(props.location);
  },
);

const scrollContainerEl = ref<HTMLElement | null>(null);
const imgEl = ref<HTMLImageElement | null>(null);
const imgLoaded = ref(false);
const evidenceMatches = ref<{ pageWidth: number; pageHeight: number; matches: number[][] } | null>(null);

const matchBoxes = computed(() => {
  const result = evidenceMatches.value;
  if (!result || !result.matches.length) return [];
  return result.matches.map(([x0, y0, x1, y1]) => ({
    left: (x0 / result.pageWidth) * 100,
    top: (y0 / result.pageHeight) * 100,
    width: ((x1 - x0) / result.pageWidth) * 100,
    height: ((y1 - y0) / result.pageHeight) * 100,
  }));
});

async function loadEvidenceMatches() {
  evidenceMatches.value = null;
  if (!props.evidence) return;
  try {
    evidenceMatches.value = await apiService.getEvidenceMatches(
      props.jobId,
      props.fileId,
      pageNumber.value,
      props.evidence,
    );
    scrollToFirstMatch();
  } catch (error) {
    console.error("Failed to search for the evidence text:", error);
  }
}

function handleImageLoad() {
  imgLoaded.value = true;
  scrollToFirstMatch();
}

// Only fires once both the image has actually laid out (so imgEl's box has
// real dimensions to scroll against) and a match has come back -- whichever
// of the two async operations (image decode, evidence search) settles last
// triggers the scroll.
function scrollToFirstMatch() {
  if (!imgLoaded.value) return;
  const box = matchBoxes.value[0];
  if (!box || !imgEl.value || !scrollContainerEl.value) return;
  const targetY = imgEl.value.offsetTop + ((box.top + box.height / 2) / 100) * imgEl.value.offsetHeight;
  scrollContainerEl.value.scrollTop = Math.max(
    0,
    targetY - scrollContainerEl.value.clientHeight * 0.35,
  );
}

watch(
  [() => props.fileId, pageNumber, () => props.evidence],
  () => {
    imgLoaded.value = false;
    loadEvidenceMatches();
  },
  { immediate: true },
);

// A zoom change resizes the image (and therefore the match overlay, since
// it's positioned in percentages of the same box) without re-fetching --
// just re-centers the scroll on the already-known match.
watch(zoomIndex, () => nextTick(scrollToFirstMatch));
</script>
