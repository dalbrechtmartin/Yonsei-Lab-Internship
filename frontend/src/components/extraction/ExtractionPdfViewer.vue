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
        <span v-if="currentPageLabel" class="opacity-70">{{
          t("extraction.review.pdf.printedAs", { label: currentPageLabel })
        }}</span>
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
      <Button
        type="button"
        :variant="searchOpen ? 'default' : 'outline'"
        size="icon-xs"
        :aria-label="t('extraction.review.pdf.searchToggleAria')"
        @click="searchOpen ? closeSearch() : openSearch()"
      >
        <Search class="size-3.5" />
      </Button>
    </div>
    <div
      v-if="searchOpen"
      class="flex shrink-0 items-center gap-1.5 border-b border-secondary/10 bg-secondary/4 px-3.5 py-2"
    >
      <Input
        ref="searchInputEl"
        v-model="searchQuery"
        type="text"
        :placeholder="t('extraction.review.pdf.searchPlaceholder')"
        class="h-7 flex-1 text-xs"
        @keydown.enter.prevent="(e: KeyboardEvent) => (e.shiftKey ? previousMatch() : nextMatch())"
        @keydown.esc="closeSearch"
      />
      <span class="shrink-0 font-mono text-[11px] text-secondary">
        {{ t("extraction.review.pdf.searchCount", { current: totalMatches ? searchMatchIndex + 1 : 0, total: totalMatches }) }}
      </span>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :disabled="!totalMatches"
        :aria-label="t('extraction.review.pdf.searchPrevAria')"
        @click="previousMatch"
      >
        <ChevronUp class="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :disabled="!totalMatches"
        :aria-label="t('extraction.review.pdf.searchNextAria')"
        @click="nextMatch"
      >
        <ChevronDown class="size-3.5" />
      </Button>
      <Button
        type="button"
        variant="outline"
        size="icon-xs"
        :aria-label="t('extraction.review.pdf.searchCloseAria')"
        @click="closeSearch"
      >
        <X class="size-3.5" />
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
          class="pointer-events-none absolute rounded-sm"
          :class="
            box.current
              ? 'bg-amber-400/55 ring-2 ring-amber-600'
              : 'bg-amber-400/30 ring-1 ring-amber-500/60'
          "
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
import { computed, nextTick, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Minus,
  Plus,
  Search,
  X,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  /** Same memoization pattern as getPageCount, one entry per physical page
   * (see useExtractionRecords.getPageLabels) -- optional so callers with no
   * page-label needs (e.g. the running step's live preview) can omit it. */
  getPageLabels?: (fileId: string) => Promise<(string | null)[]>;
}>();

const ZOOM_STEPS = [70, 85, 100, 125, 150, 175, 200];
const zoomIndex = ref(2);

const pageNumber = ref(parsePageNumber(props.location));
const totalPages = ref<number | null>(null);
const pageLabels = ref<(string | null)[] | null>(null);

const pageUrl = computed(() =>
  apiService.getPdfPageUrl(props.jobId, props.fileId, pageNumber.value),
);

const currentPageLabel = computed(
  () => pageLabels.value?.[pageNumber.value - 1] ?? null,
);

async function loadTotalPages() {
  totalPages.value = null;
  try {
    totalPages.value = await props.getPageCount(props.fileId);
  } catch (error) {
    console.error("Failed to fetch PDF page count:", error);
  }
}

async function loadPageLabels() {
  pageLabels.value = null;
  if (!props.getPageLabels) return;
  try {
    pageLabels.value = await props.getPageLabels(props.fileId);
  } catch (error) {
    console.error("Failed to fetch PDF page labels:", error);
  }
}

watch(
  () => props.fileId,
  () => {
    loadTotalPages();
    loadPageLabels();
  },
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

// -- Ctrl+F document search -------------------------------------------
// While open, this owns the highlight/scroll behavior entirely (see
// activeHighlight below) -- the reviewer explicitly asked to search, so the
// record's own auto-highlighted Evidence steps aside rather than the two
// fighting over which match to scroll to. Closing search returns to plain
// evidence auto-highlight, unchanged from before this feature existed.
const searchOpen = ref(false);
const searchQuery = ref("");
const searchInputEl = ref<InstanceType<typeof Input> | null>(null);
const searchResults = ref<
  { page: number; pageWidth: number; pageHeight: number; matches: number[][] }[]
>([]);
const searchMatchIndex = ref(0);
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

// One entry per match across every result page, in page order -- lets
// "next/previous match" walk the whole document instead of just one page.
const matchLocations = computed(() => {
  const locations: { page: number; localIndex: number }[] = [];
  for (const result of searchResults.value) {
    result.matches.forEach((_, localIndex) => locations.push({ page: result.page, localIndex }));
  }
  return locations;
});
const totalMatches = computed(() => matchLocations.value.length);
const currentMatch = computed(() => matchLocations.value[searchMatchIndex.value] ?? null);

function openSearch() {
  searchOpen.value = true;
  // Input.vue's root element IS the <input> itself (no wrapper div).
  nextTick(() => (searchInputEl.value?.$el as HTMLInputElement | undefined)?.focus());
}

function closeSearch() {
  searchOpen.value = false;
  searchQuery.value = "";
  searchResults.value = [];
  searchMatchIndex.value = 0;
}

function nextMatch() {
  if (!totalMatches.value) return;
  searchMatchIndex.value = (searchMatchIndex.value + 1) % totalMatches.value;
}

function previousMatch() {
  if (!totalMatches.value) return;
  searchMatchIndex.value = (searchMatchIndex.value - 1 + totalMatches.value) % totalMatches.value;
}

// Debounced so every keystroke doesn't fire a request, and a 1-character
// query (which could match almost every word on a dense scientific page)
// never fires at all -- mirrors the backend's own _MIN_SEARCH_QUERY_LENGTH.
watch(searchQuery, (query) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  searchMatchIndex.value = 0;
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    searchResults.value = [];
    return;
  }
  searchDebounceTimer = setTimeout(async () => {
    try {
      searchResults.value = await apiService.searchDocument(props.jobId, props.fileId, trimmed);
    } catch (error) {
      console.error("Failed to search the document:", error);
      searchResults.value = [];
    }
  }, 280);
});

// The current match's page becoming the active page re-triggers
// handleImageLoad (via the pageNumber watch below), which does the actual
// scroll once the new page has laid out -- jumping pageNumber here is what
// drives that, same page-change path "Suivant"/manual navigation already use.
watch([searchResults, searchMatchIndex], () => {
  if (!searchOpen.value) return;
  const match = currentMatch.value;
  if (!match) return;
  if (pageNumber.value === match.page) {
    nextTick(() => scrollToBoxIndex(match.localIndex));
  } else {
    pageNumber.value = match.page;
  }
});

// This page's own slice of the multi-page search results, in the same
// {pageWidth, pageHeight, matches} shape evidenceMatches already uses --
// letting matchBoxes/activeHighlight treat both sources identically.
const currentPageSearchMatches = computed(() => {
  const result = searchResults.value.find((r) => r.page === pageNumber.value);
  return result
    ? { pageWidth: result.pageWidth, pageHeight: result.pageHeight, matches: result.matches }
    : null;
});

const activeHighlight = computed(() =>
  searchOpen.value ? currentPageSearchMatches.value : evidenceMatches.value,
);

const matchBoxes = computed(() => {
  const result = activeHighlight.value;
  if (!result || !result.matches.length) return [];
  const currentLocalIndex =
    searchOpen.value && currentMatch.value?.page === pageNumber.value
      ? currentMatch.value.localIndex
      : null;
  return result.matches.map(([x0, y0, x1, y1], i) => ({
    left: (x0 / result.pageWidth) * 100,
    top: (y0 / result.pageHeight) * 100,
    width: ((x1 - x0) / result.pageWidth) * 100,
    height: ((y1 - y0) / result.pageHeight) * 100,
    current: i === currentLocalIndex,
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
    if (!searchOpen.value) scrollToBoxIndex(0);
  } catch (error) {
    console.error("Failed to search for the evidence text:", error);
  }
}

function handleImageLoad() {
  imgLoaded.value = true;
  if (searchOpen.value) {
    if (currentMatch.value?.page === pageNumber.value) scrollToBoxIndex(currentMatch.value.localIndex);
  } else {
    scrollToBoxIndex(0);
  }
}

// Only fires once both the image has actually laid out (so imgEl's box has
// real dimensions to scroll against) and a match has come back -- whichever
// of the two async operations (image decode, evidence/text search) settles
// last triggers the scroll.
function scrollToBoxIndex(index: number) {
  if (!imgLoaded.value) return;
  const box = matchBoxes.value[index];
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
watch(zoomIndex, () =>
  nextTick(() =>
    scrollToBoxIndex(
      searchOpen.value && currentMatch.value?.page === pageNumber.value
        ? currentMatch.value.localIndex
        : 0,
    ),
  ),
);

// Ctrl/Cmd+F opens (and focuses) the search bar instead of the browser's own
// native find, scoped to whenever this viewer is mounted -- same
// input/textarea-guarded window-listener pattern ExtractionReviewStep.vue
// already uses for its own shortcuts.
function onKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
    e.preventDefault();
    openSearch();
  } else if (e.key === "Escape" && searchOpen.value) {
    closeSearch();
  }
}
window.addEventListener("keydown", onKeydown);
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
</script>
