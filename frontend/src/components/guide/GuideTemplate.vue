<template>
  <!--
    Hidden single source of truth for the multilingual PDF user guide.
    Never shown on screen -- positioned off-canvas and captured by
    html2canvas-pro/jsPDF (utils/pdfExport.ts) on demand.

    Mode 1's illustrations are genuine renders of the real production
    components (FileDropzone, GraphControls, FomChart, StatsSummaryPanel,
    AnnotationsPanel), fed by a fixed worked-example dataset defined below
    -- not mockups -- so the guide can never drift from what the app
    actually looks like, and stays multilingual for free since those
    components read the same vue-i18n instance as the rest of the app.

    Every annotated figure below draws numbered callout rings measured
    from the REAL rendered DOM at guide-render time (see guideAnnotate.ts)
    rather than hardcoded pixel coordinates, so a ring can't drift out of
    place just because a component's copy or spacing changes later.

    Cover + introduction + a clickable table of contents (see
    data-toc-target below, resolved into real PDF link annotations by
    pdfExport.ts) come first. Pages also carry a translated PDF outline
    (data-outline-title) so the document stays easy to skim and navigate.

    Each `.guide-page` section below is its own GuidePageXxx.vue component
    (see components/guide/) -- this file stays a slim orchestrator: it owns
    the fixed page numbering, the worked-example capture state (callout
    marks, generated PNGs) and captureGuideArtifacts, the single DOM-
    measurement pass that populates them once every page has mounted. Pages
    that host a measured control expose their own template refs (see each
    GuidePageXxx.vue's own defineExpose) so captureGuideArtifacts can still
    reach into their real rendered DOM, the same way it did when all of this
    lived in one file.
  -->
  <div
    ref="rootEl"
    class="fixed top-0 left-[-9999px] font-sans text-ink"
    aria-hidden="true"
    inert
  >
    <GuidePageCover :app-version="appVersion" />

    <GuidePageIntro
      :app-version="appVersion"
      :page="PAGE_INTRO"
      :total-pages="TOTAL_PAGES"
    />

    <GuidePageToc
      :app-version="appVersion"
      :page="PAGE_TOC"
      :total-pages="TOTAL_PAGES"
      :entries="tocEntries"
    />

    <GuidePageToc2
      :app-version="appVersion"
      :page="PAGE_TOC2"
      :total-pages="TOTAL_PAGES"
      :entries="mode2TocEntries"
    />

    <GuidePageMode1Divider
      :app-version="appVersion"
      :page="PAGE_MODE1_DIVIDER"
      :total-pages="TOTAL_PAGES"
      :entries="mode1TocEntries"
      :first-page="PAGE_MODE1_IMPORT"
    />

    <GuidePageImport
      ref="pageImportRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_IMPORT"
      :total-pages="TOTAL_PAGES"
      :toolbar-marks="toolbarMarks"
    />

    <GuidePageControlsChart
      ref="pageControlsChartRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_CONTROLS_CHART"
      :total-pages="TOTAL_PAGES"
      :chart-marks="chartMarks"
    />

    <GuidePageControlsDisplay
      ref="pageControlsDisplayRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_CONTROLS_DISPLAY"
      :total-pages="TOTAL_PAGES"
      :display-marks="displayMarks"
    />

    <GuidePageFilters
      ref="pageFiltersRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_FILTERS"
      :total-pages="TOTAL_PAGES"
      :filter-marks="filterMarks"
    />

    <GuidePageReading
      ref="pageReadingRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_READING"
      :total-pages="TOTAL_PAGES"
      :reading-marks="readingMarks"
      :reading-chart-img-url="readingChartImgUrl"
      :reading-chart-full-rect="readingChartFullRect"
      :reading-size-legend-rect="readingSizeLegendRect"
    />

    <GuidePageReadingInteract
      :app-version="appVersion"
      :page="PAGE_MODE1_READING_INTERACT"
      :total-pages="TOTAL_PAGES"
    />

    <GuidePageCompareGroups
      ref="pageCompareGroupsRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_COMPARE"
      :total-pages="TOTAL_PAGES"
      :stats-marks="statsMarks"
    />

    <GuidePageDataTable
      ref="pageDataTableRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_DATATABLE"
      :total-pages="TOTAL_PAGES"
      :data-table-marks="dataTableMarks"
    />

    <GuidePageAddPoint1
      ref="pageAddPoint1Ref"
      :app-version="appVersion"
      :page="PAGE_MODE1_ADDPOINT1"
      :total-pages="TOTAL_PAGES"
      :add-point1-marks="addPoint1Marks"
    />

    <GuidePageAddPoint2
      ref="pageAddPoint2Ref"
      :app-version="appVersion"
      :page="PAGE_MODE1_ADDPOINT2"
      :total-pages="TOTAL_PAGES"
      :add-point2-marks="addPoint2Marks"
    />

    <GuidePageAddPoint3
      ref="pageAddPoint3Ref"
      :app-version="appVersion"
      :page="PAGE_MODE1_ADDPOINT3"
      :total-pages="TOTAL_PAGES"
      :add-point3-marks="addPoint3Marks"
    />

    <GuidePageAnnotate
      ref="pageAnnotateRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_ANNOTATE"
      :total-pages="TOTAL_PAGES"
      :annotation-marks="annotationMarks"
    />

    <GuidePageComparePins
      ref="pageComparePinsRef"
      :app-version="appVersion"
      :page="PAGE_MODE1_COMPARE_PINS"
      :total-pages="TOTAL_PAGES"
      :compare-pins-top-marks="comparePinsTopMarks"
      :compare-pins-marks="comparePinsMarks"
      :compare-png-url="comparePngUrl"
    />

    <GuidePageExportChart
      :app-version="appVersion"
      :page="PAGE_MODE1_EXPORT_CHART"
      :total-pages="TOTAL_PAGES"
      :export-chart-png-url="exportChartPngUrl"
      :export-chart-png-url2="exportChartPngUrl2"
    />

    <GuidePageExportPin
      :app-version="appVersion"
      :page="PAGE_MODE1_EXPORT_PIN"
      :total-pages="TOTAL_PAGES"
      :pin-export-data-url="pinExportDataUrl"
      :metrics-export-data-url="metricsExportDataUrl"
    />

    <GuidePageMode2Divider
      :app-version="appVersion"
      :page="PAGE_MODE2_DIVIDER"
      :total-pages="TOTAL_PAGES"
      :entries="mode2TocEntries"
      :first-page="PAGE_MODE2_DROP"
    />

    <GuidePageMode2Drop
      ref="pageMode2DropRef"
      :app-version="appVersion"
      :page="PAGE_MODE2_DROP"
      :total-pages="TOTAL_PAGES"
      :drop-marks="mode2DropMarks"
    />

    <GuidePageMode2Running
      ref="pageMode2RunningRef"
      :app-version="appVersion"
      :page="PAGE_MODE2_RUNNING"
      :total-pages="TOTAL_PAGES"
      :running-marks="mode2RunningMarks"
    />

    <GuidePageMode2Review
      ref="pageMode2ReviewRef"
      :app-version="appVersion"
      :page="PAGE_MODE2_REVIEW"
      :total-pages="TOTAL_PAGES"
      :review-marks="mode2ReviewMarks"
    />

    <GuidePageMode2Correct
      ref="pageMode2CorrectRef"
      :app-version="appVersion"
      :page="PAGE_MODE2_CORRECT"
      :total-pages="TOTAL_PAGES"
      :correct-marks="mode2CorrectMarks"
    />

    <GuidePagePhoton
      ref="pagePhotonRef"
      :app-version="appVersion"
      :page="PAGE_MODE2_PHOTON"
      :total-pages="TOTAL_PAGES"
      :photon-marks="photonMarks"
    />

    <GuidePageMode2Export
      ref="pageMode2ExportRef"
      :app-version="appVersion"
      :page="PAGE_MODE2_EXPORT"
      :total-pages="TOTAL_PAGES"
      :export-marks="mode2ExportMarks"
    />

    <GuidePageAbout />

    <!-- Generator-only: renders off to the side of every real `.guide-page`
         (pdfExport.ts only ever captures `.guide-page` elements, so this
         never appears in the PDF itself) purely so the export-chart page's
         two figures can show genuine "Export chart image (.png)" renders
         instead of the live interactive component. Grouped by the two
         composite columns (Material Class merged into one marker per point,
         Base Materials left unmerged so every token gets its own colored
         marker), so the export page doubles as the guide's worked example
         of the merge/un-merge feature. See exportChartPngUrl /
         exportChartPngUrl2 below. -->
    <div style="width: 700px">
      <FomChart
        ref="exportChartGenRef"
        :chart-data="sampleRows"
        :columns="sampleColumns"
        :y-axis="selectedYAxis"
        :x-axis="selectedXAxis"
        :group-by="materialClassColumn"
        :group-by-selected-tokens="materialClassValues"
        :merge-multi-category-points="true"
        y-axis-scale="value"
        :chart-title="exportChartTitle"
        :show-legend="true"
        :show-median="false"
        :show-trend="false"
        :show-pareto="false"
        :x-axis-numeric="true"
        :group-color-map="materialClassColorMap"
      />
    </div>
    <div style="width: 700px">
      <FomChart
        ref="exportChartGenRef2"
        :chart-data="sampleRows"
        :columns="sampleColumns"
        :y-axis="selectedYAxis"
        :x-axis="selectedXAxis"
        :group-by="baseMaterialsColumn"
        :group-by-selected-tokens="baseMaterialsValues"
        :merge-multi-category-points="false"
        :y-axis-scale="yAxisScale"
        :chart-title="exportChartTitle2"
        :show-legend="true"
        :show-median="false"
        :show-trend="false"
        :show-pareto="false"
        :x-axis-numeric="true"
        :group-color-map="baseMaterialsColorMap"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import {
  Activity,
  ClipboardCheck,
  Columns3,
  Diamond,
  Download,
  FileImage,
  Filter,
  Info,
  Layers,
  LineChart,
  MessageCircle,
  MousePointerClick,
  Pencil,
  Pin,
  PlusCircle,
  Settings2,
  SlidersHorizontal,
  Table2,
  Upload,
  Users,
} from "@lucide/vue";
import FomChart from "@/components/visualization/FomChart.vue";
import {
  findByText,
  findByAttr,
  markRect,
  markRow,
  markLabel,
  markUnion,
  markCanvasRect,
  type GuideMark,
} from "./guideAnnotate";
import { useGuideCaptureReadiness } from "@/composables/useGuideCaptureReadiness";
import GuidePageCover from "./GuidePageCover.vue";
import GuidePageIntro from "./GuidePageIntro.vue";
import GuidePageToc from "./GuidePageToc.vue";
import GuidePageToc2 from "./GuidePageToc2.vue";
import GuidePageMode1Divider from "./GuidePageMode1Divider.vue";
import GuidePageImport from "./GuidePageImport.vue";
import GuidePageControlsChart from "./GuidePageControlsChart.vue";
import GuidePageControlsDisplay from "./GuidePageControlsDisplay.vue";
import GuidePageFilters from "./GuidePageFilters.vue";
import GuidePageReading from "./GuidePageReading.vue";
import GuidePageReadingInteract from "./GuidePageReadingInteract.vue";
import GuidePageCompareGroups from "./GuidePageCompareGroups.vue";
import GuidePageDataTable from "./GuidePageDataTable.vue";
import GuidePageAddPoint1 from "./GuidePageAddPoint1.vue";
import GuidePageAddPoint2 from "./GuidePageAddPoint2.vue";
import GuidePageAddPoint3 from "./GuidePageAddPoint3.vue";
import GuidePageAnnotate from "./GuidePageAnnotate.vue";
import GuidePageComparePins from "./GuidePageComparePins.vue";
import GuidePageExportChart from "./GuidePageExportChart.vue";
import GuidePageExportPin from "./GuidePageExportPin.vue";
import GuidePageMode2Divider from "./GuidePageMode2Divider.vue";
import GuidePageMode2Drop from "./GuidePageMode2Drop.vue";
import GuidePageMode2Running from "./GuidePageMode2Running.vue";
import GuidePageMode2Review from "./GuidePageMode2Review.vue";
import GuidePageMode2Correct from "./GuidePageMode2Correct.vue";
import GuidePagePhoton from "./GuidePagePhoton.vue";
import GuidePageMode2Export from "./GuidePageMode2Export.vue";
import GuidePageAbout from "./GuidePageAbout.vue";
import {
  sampleColumns,
  sampleRows,
  materialClassColumn,
  baseMaterialsColumn,
  needsReviewCount,
  selectedYAxis,
  selectedXAxis,
  yAxisScale,
  materialClassValues,
  baseMaterialsValues,
  exportChartTitle,
  exportChartTitle2,
  materialClassColorMap,
  baseMaterialsColorMap,
  DEMO_PIN_ID_R3_EXP,
  DEMO_PIN_ID_R1_SIM,
} from "./guideSampleData";

const { t, locale } = useI18n();

// Kept as a plain constant (rather than importing package.json, which sits
// outside the tsconfig `src` root) -- release-please rewrites this line, see
// x-release-please-version below.
const appVersion = "1.3.0"; // x-release-please-version
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

// Fixed page numbers -- referenced both in each page's own footer and by
// the clickable table of contents (see tocEntries + data-toc-target below,
// resolved into real PDF link annotations by pdfExport.ts).
const PAGE_INTRO = 2;
const PAGE_TOC = 3;
// The table of contents spans two pages -- 19 entries split 15/5 across two
// side-by-side columns looked visibly lopsided, so it's back to one full-
// width list per page (Mode 1 here, Mode 2 on PAGE_TOC2) like every other
// list page in the guide.
const PAGE_TOC2 = 4;
const PAGE_MODE1_DIVIDER = 5;
const PAGE_MODE1_IMPORT = 6;
const PAGE_MODE1_CONTROLS_CHART = 7;
const PAGE_MODE1_CONTROLS_DISPLAY = 8;
const PAGE_MODE1_FILTERS = 9;
const PAGE_MODE1_READING = 10;
// PAGE_MODE1_READING_INTERACT (11), like PAGE_MODE2_CORRECT/PAGE_MODE2_PHOTON
// below, has no numbered "step" of its own -- interacting with the chart is
// part of reading it, not a distinct wizard stage -- but it's still a real
// page with its own PDF bookmark, footer and TOC entry.
const PAGE_MODE1_READING_INTERACT = 11;
const PAGE_MODE1_COMPARE = 12;
const PAGE_MODE1_DATATABLE = 13;
const PAGE_MODE1_ADDPOINT1 = 14;
const PAGE_MODE1_ADDPOINT2 = 15;
const PAGE_MODE1_ADDPOINT3 = 16;
const PAGE_MODE1_ANNOTATE = 17;
const PAGE_MODE1_COMPARE_PINS = 18;
const PAGE_MODE1_EXPORT_CHART = 19;
const PAGE_MODE1_EXPORT_PIN = 20;
const PAGE_MODE2_DIVIDER = 21;
const PAGE_MODE2_DROP = 22;
const PAGE_MODE2_RUNNING = 23;
const PAGE_MODE2_REVIEW = 24;
// PAGE_MODE2_CORRECT (25) has no numbered "step" of its own -- correcting a
// row is an inline mode of the Review step, not a distinct wizard stage the
// real ExtractionStepper ever shows (see guide.outline.mode2Correct's own
// unnumbered label) -- but it's still a real page with its own PDF bookmark,
// footer and TOC entry, so it keeps a PAGE_ constant like every other page.
const PAGE_MODE2_CORRECT = 25;
// PAGE_MODE2_PHOTON (26), like PAGE_MODE2_CORRECT above, has no numbered
// "step" of its own -- Photon is a companion available throughout Review,
// not a wizard stage -- but it's still a real page with its own PDF
// bookmark, footer and TOC entry.
const PAGE_MODE2_PHOTON = 26;
const PAGE_MODE2_EXPORT = 27;
// Page 28 (About the author) is a colophon: it gets its own PDF bookmark
// (data-outline-title, like every other page) but no GuideFooter/page
// number and no tocEntries listing, matching a book colophon's usual quiet,
// unlisted convention -- so it has no PAGE_ constant of its own here.
const TOTAL_PAGES = 28;

// Every outline label follows "<Mode N> — <rest>" in all four locales
// (checked en/fr/ko/zh -- always the same em-dash separator), so the
// section prefix can be stripped generically for the TOC's own display
// without needing per-language substring logic. The full label (with
// prefix) is still what's used for the PDF outline/bookmark title
// elsewhere, since that one benefits from staying fully self-descriptive.
function tocLabel(fullLabel: string): string {
  const parts = fullLabel.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : fullLabel;
}

const tocEntries = computed(() => [
  {
    label: tocLabel(t("guide.outline.intro")),
    desc: t("guide.toc.desc.intro"),
    page: PAGE_INTRO,
    icon: Info,
    group: "front" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1Import")),
    desc: t("guide.toc.desc.mode1Import"),
    page: PAGE_MODE1_IMPORT,
    icon: Upload,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1ControlsChart")),
    desc: t("guide.toc.desc.mode1ControlsChart"),
    page: PAGE_MODE1_CONTROLS_CHART,
    icon: Settings2,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1ControlsDisplay")),
    desc: t("guide.toc.desc.mode1ControlsDisplay"),
    page: PAGE_MODE1_CONTROLS_DISPLAY,
    icon: SlidersHorizontal,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1Filters")),
    desc: t("guide.toc.desc.mode1Filters"),
    page: PAGE_MODE1_FILTERS,
    icon: Filter,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1Reading")),
    desc: t("guide.toc.desc.mode1Reading"),
    page: PAGE_MODE1_READING,
    icon: LineChart,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1ReadingInteract")),
    desc: t("guide.toc.desc.mode1ReadingInteract"),
    page: PAGE_MODE1_READING_INTERACT,
    icon: MousePointerClick,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1Compare")),
    desc: t("guide.toc.desc.mode1Compare"),
    page: PAGE_MODE1_COMPARE,
    icon: Users,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1DataTable")),
    desc: t("guide.toc.desc.mode1DataTable"),
    page: PAGE_MODE1_DATATABLE,
    icon: Table2,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1AddPoint1")),
    desc: t("guide.toc.desc.mode1AddPoint1"),
    page: PAGE_MODE1_ADDPOINT1,
    icon: PlusCircle,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1AddPoint2")),
    desc: t("guide.toc.desc.mode1AddPoint2"),
    page: PAGE_MODE1_ADDPOINT2,
    icon: Layers,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1AddPoint3")),
    desc: t("guide.toc.desc.mode1AddPoint3"),
    page: PAGE_MODE1_ADDPOINT3,
    icon: Diamond,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1Annotate")),
    desc: t("guide.toc.desc.mode1Annotate"),
    page: PAGE_MODE1_ANNOTATE,
    icon: Pin,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1ComparePins")),
    desc: t("guide.toc.desc.mode1ComparePins"),
    page: PAGE_MODE1_COMPARE_PINS,
    icon: Columns3,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1ExportChart")),
    desc: t("guide.toc.desc.mode1ExportChart"),
    page: PAGE_MODE1_EXPORT_CHART,
    icon: Download,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode1ExportPin")),
    desc: t("guide.toc.desc.mode1ExportPin"),
    page: PAGE_MODE1_EXPORT_PIN,
    icon: FileImage,
    group: "mode1" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode2Drop")),
    desc: t("guide.toc.desc.mode2Drop"),
    page: PAGE_MODE2_DROP,
    icon: Upload,
    group: "mode2" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode2Running")),
    desc: t("guide.toc.desc.mode2Running"),
    page: PAGE_MODE2_RUNNING,
    icon: Activity,
    group: "mode2" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode2Review")),
    desc: t("guide.toc.desc.mode2Review"),
    page: PAGE_MODE2_REVIEW,
    icon: ClipboardCheck,
    group: "mode2" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode2Correct")),
    desc: t("guide.toc.desc.mode2Correct"),
    page: PAGE_MODE2_CORRECT,
    icon: Pencil,
    group: "mode2" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode2Photon")),
    desc: t("guide.toc.desc.mode2Photon"),
    page: PAGE_MODE2_PHOTON,
    icon: MessageCircle,
    group: "mode2" as const,
  },
  {
    label: tocLabel(t("guide.outline.mode2Export")),
    desc: t("guide.toc.desc.mode2Export"),
    page: PAGE_MODE2_EXPORT,
    icon: Download,
    group: "mode2" as const,
  },
]);

// Mode 1's own divider page previews exactly these entries -- reusing
// tocEntries rather than a second hand-maintained list keeps the two in sync
// automatically if a Mode 1 step is ever added, renamed or reordered.
const mode1TocEntries = computed(() =>
  tocEntries.value.filter((e) => e.group === "mode1"),
);
// Same idea for Mode 2's own divider page.
const mode2TocEntries = computed(() =>
  tocEntries.value.filter((e) => e.group === "mode2"),
);

// Guide-only: page 17's "full point export" example -- a genuine render of
// "Export this pin" for the R3 (guided-mode resonance) demo annotation,
// fetched from AnnotationsPanel's exposed getExportDataUrl once it's
// mounted (see captureGuideArtifacts below) rather than faked.
const pinExportDataUrl = ref<string | null>(null);

// Guide-only: page 17's "Metrics" zoom-dialog export example -- a genuine
// render of the same numeric-fields-only PNG the real Metrics zoom dialog's
// "Download PNG" button produces (see AnnotationCard's exposed
// getMetricsExportDataUrl), for the same R3 demo annotation.
const metricsExportDataUrl = ref<string | null>(null);

// Guide-only: page 15's "Compare (2)" example -- a genuine render of the same
// multi-pin comparison the live app's CompareDialog produces (see
// AnnotationsPanel's exposed getComparePngDataUrl), fetched once mounted
// (see captureGuideArtifacts below) for the same demo-r3-exp/demo-r1-sim
// pins pinned on the previous page.
const comparePngUrl = ref<string | null>(null);

// Guide-only: page 16's chart image export examples -- genuine
// "Export chart image (.png)" renders from the hidden generator FomChart
// instances below the last page (see their exposed getPngDataUrl), fetched
// once mounted (see captureGuideArtifacts below) rather than showing the
// live component.
const exportChartGenRef =
  useTemplateRef<InstanceType<typeof FomChart>>("exportChartGenRef");
const exportChartPngUrl = ref<string | null>(null);
const exportChartGenRef2 =
  useTemplateRef<InstanceType<typeof FomChart>>("exportChartGenRef2");
const exportChartPngUrl2 = ref<string | null>(null);

// -----------------------------------------------------------------------
// Callout rings -- every mark below is measured from the real rendered DOM
// (see guideAnnotate.ts) rather than a hardcoded pixel guess, so a ring
// can't silently drift out of place if a component's copy or layout
// changes later. Each measured page component instance is reached via its
// own template ref below and exposes (see its own defineExpose) the plain
// element refs captureGuideArtifacts needs to query, the same DOM nodes it
// measured when all of this lived in one file.
// -----------------------------------------------------------------------
const pageImportRef =
  useTemplateRef<InstanceType<typeof GuidePageImport>>("pageImportRef");
const pageControlsChartRef = useTemplateRef<
  InstanceType<typeof GuidePageControlsChart>
>("pageControlsChartRef");
const pageControlsDisplayRef = useTemplateRef<
  InstanceType<typeof GuidePageControlsDisplay>
>("pageControlsDisplayRef");
const pageFiltersRef =
  useTemplateRef<InstanceType<typeof GuidePageFilters>>("pageFiltersRef");
const pageReadingRef =
  useTemplateRef<InstanceType<typeof GuidePageReading>>("pageReadingRef");
const pageCompareGroupsRef = useTemplateRef<
  InstanceType<typeof GuidePageCompareGroups>
>("pageCompareGroupsRef");
const pageDataTableRef =
  useTemplateRef<InstanceType<typeof GuidePageDataTable>>("pageDataTableRef");
const pageAddPoint1Ref =
  useTemplateRef<InstanceType<typeof GuidePageAddPoint1>>("pageAddPoint1Ref");
const pageAddPoint2Ref =
  useTemplateRef<InstanceType<typeof GuidePageAddPoint2>>("pageAddPoint2Ref");
const pageAddPoint3Ref =
  useTemplateRef<InstanceType<typeof GuidePageAddPoint3>>("pageAddPoint3Ref");
const pageAnnotateRef =
  useTemplateRef<InstanceType<typeof GuidePageAnnotate>>("pageAnnotateRef");
const pageComparePinsRef =
  useTemplateRef<InstanceType<typeof GuidePageComparePins>>(
    "pageComparePinsRef",
  );
const pageMode2DropRef =
  useTemplateRef<InstanceType<typeof GuidePageMode2Drop>>("pageMode2DropRef");
const pageMode2RunningRef = useTemplateRef<
  InstanceType<typeof GuidePageMode2Running>
>("pageMode2RunningRef");
const pageMode2ReviewRef =
  useTemplateRef<InstanceType<typeof GuidePageMode2Review>>(
    "pageMode2ReviewRef",
  );
const pageMode2CorrectRef = useTemplateRef<
  InstanceType<typeof GuidePageMode2Correct>
>("pageMode2CorrectRef");
const pagePhotonRef =
  useTemplateRef<InstanceType<typeof GuidePagePhoton>>("pagePhotonRef");
const pageMode2ExportRef =
  useTemplateRef<InstanceType<typeof GuidePageMode2Export>>(
    "pageMode2ExportRef",
  );

// See the point-size-legend "peephole" patch's own template comment (in
// GuidePageReading.vue) for why these exist -- readingChartFullRect is the
// whole (correctly rendered) canvas snapshot's own rect,
// readingSizeLegendRect is just the broken row's, both in the reading
// page's own wrap coordinate space like every other mark here.
const readingChartImgUrl = ref<string | null>(null);
const readingChartFullRect = ref<GuideMark | null>(null);
const readingSizeLegendRect = ref<GuideMark | null>(null);

const toolbarMarks = ref<GuideMark[]>([]);
const chartMarks = ref<GuideMark[]>([]);
const displayMarks = ref<GuideMark[]>([]);
const filterMarks = ref<GuideMark[]>([]);
const statsMarks = ref<GuideMark[]>([]);
const dataTableMarks = ref<GuideMark[]>([]);
const addPoint1Marks = ref<GuideMark[]>([]);
const addPoint2Marks = ref<GuideMark[]>([]);
const addPoint3Marks = ref<GuideMark[]>([]);
const annotationMarks = ref<GuideMark[]>([]);
const comparePinsTopMarks = ref<GuideMark[]>([]);
const comparePinsMarks = ref<GuideMark[]>([]);
const mode2DropMarks = ref<GuideMark[]>([]);
const mode2RunningMarks = ref<GuideMark[]>([]);
const mode2ReviewMarks = ref<GuideMark[]>([]);
const mode2CorrectMarks = ref<GuideMark[]>([]);
const photonMarks = ref<GuideMark[]>([]);
const mode2ExportMarks = ref<GuideMark[]>([]);
// Badges are real DOM (measured the normal way, via FomChart's exposed
// getBadgesRow); the legend and median line are pixels ECharts draws
// straight onto its canvas, so FomChart exposes their live layout instead
// (see getLegendRect/getMedianLineRect) and markCanvasRect converts that
// into a ring relative to this figure. All three used to be a fixed pixel
// guess -- the median line's extent shifts with the plotted data and with
// the x-axis name's length (a much longer translated name grows the grid's
// right margin), so a hardcoded box drifted out of ring in some locales.
// Populated once in captureGuideArtifacts below.
const readingMarks = ref<GuideMark[]>([]);

// Idempotent -- must be safe to call again after a live language switch
// (see the locale watcher below), by which point a section this already
// opened on a previous run is still open under its NEW-locale button label.
// CollapsibleSection has no exposed open state to read, but the click
// handler's own `:style="{ gridTemplateRows: open ? '1fr' : '0fr' }"` on the
// very next sibling is an unambiguous, translation-independent signal of
// its current state -- clicking unconditionally would otherwise re-close a
// section that was already open, since the button just toggles.
function openSection(root: HTMLElement | null, title: string) {
  const button = root
    ? Array.from(root.querySelectorAll("button")).find(
        (b) => b.textContent?.trim() === title,
      )
    : undefined;
  if (!button) return;
  const body = button.nextElementSibling as HTMLElement | null;
  if (body?.style.gridTemplateRows === "1fr") return;
  button.click();
}

// CollapsibleSection animates open/closed over 250ms (grid-template-rows
// transition) -- measuring a row's rect before that finishes catches it
// mid-collapse/expand and produces wrong, squashed callout rects. Waiting
// out the transition (a plain timeout, since there's no 'transitionend'
// to await here across every affected row at once) before measuring is
// simplest and safe.
const settle = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

// Every ring, measurement and captured PNG below is derived from rendered,
// translated text -- correct only for whatever locale was active the moment
// this ran. GuideTemplate is mounted once for the app's whole session (see
// HomeView.vue), so a user switching language later via the app's own
// switcher does NOT remount it -- without re-running this after `locale`
// changes (see the watcher below), every ring and PNG would silently keep
// showing the language active at first mount instead of the current one.
async function captureGuideArtifacts() {
  await nextTick();

  openSection(
    pageControlsDisplayRef.value?.displayControlsWrap ?? null,
    t("fomcharts.sections.display"),
  );
  openSection(
    pageFiltersRef.value?.filtersWrap ?? null,
    t("fomcharts.sections.filters"),
  );
  // Page 24 (Mode 2 -- correct a record): ExtractionReviewDetail now mounts
  // `compact` here (see GuidePageMode2Correct.vue's own comment) so
  // Identification/Materials stay collapsed and this page doesn't overflow,
  // but the fwhmField ring below needs Measurements visible -- click it back
  // open, the same technique used for GraphControls' own sections above.
  openSection(
    pageMode2CorrectRef.value?.detailWrap ?? null,
    t("extraction.review.detail.sections.measurements"),
  );
  // Also open the Y-axis column picker -- the actual mechanism for changing
  // an axis, otherwise never shown (see the Chart page's own body text,
  // which now describes clicking a row to open it). Guarded by
  // aria-expanded so a later locale-switch re-run of this whole function
  // doesn't toggle it back closed.
  const chartControlsWrapForOpen =
    pageControlsChartRef.value?.chartControlsWrap;
  if (chartControlsWrapForOpen) {
    const yAxisBtn = findByAttr(
      chartControlsWrapForOpen,
      "button",
      "aria-label",
      t("fomcharts.controls.editAxis", { axis: t("fomcharts.controls.yAxis") }),
    );
    if (yAxisBtn && yAxisBtn.getAttribute("aria-expanded") !== "true") {
      yAxisBtn.click();
    }
  }
  await nextTick();
  await settle();

  // Reset before repopulating -- this function re-runs on every locale
  // switch (see the watcher below), and `push` only ever appends.
  for (const marks of [
    toolbarMarks,
    chartMarks,
    displayMarks,
    filterMarks,
    statsMarks,
    dataTableMarks,
    addPoint1Marks,
    addPoint2Marks,
    addPoint3Marks,
    annotationMarks,
    comparePinsTopMarks,
    comparePinsMarks,
    readingMarks,
    mode2DropMarks,
    mode2RunningMarks,
    mode2ReviewMarks,
    mode2CorrectMarks,
    photonMarks,
    mode2ExportMarks,
  ]) {
    marks.value = [];
  }

  const push = (arr: typeof toolbarMarks, mark: GuideMark | null) => {
    if (mark) arr.value.push(mark);
  };

  // Toolbar: Import / Export / Reset buttons.
  const toolbarWrap = pageImportRef.value?.toolbarWrap;
  if (toolbarWrap) {
    const c = toolbarWrap;
    [
      t("actions.import"),
      t("actions.export"),
      t("fomcharts.workspace.reset"),
    ].forEach((label) => {
      const btn = findByText(c, "button", label);
      push(toolbarMarks, btn ? markRect(c, btn, 4) : null);
    });
  }

  // Chart section: title, then Y/X/link/swap as one ring -- AxisSelector's Y
  // and X rows are buttons whose only translated label lives in aria-label
  // (their visible text is just a bare "Y"/"X" badge, see AxisSelector.vue),
  // so they're found by attribute rather than markLabel's text search, and
  // boxed together with the link/swap column via markUnion since all four
  // controls sit inside one bordered block.
  const chartControlsWrap = pageControlsChartRef.value?.chartControlsWrap;
  if (chartControlsWrap) {
    const c = chartControlsWrap;
    push(chartMarks, markLabel(c, t("fomcharts.controls.title")));
    const yBtn = findByAttr(
      c,
      "button",
      "aria-label",
      t("fomcharts.controls.editAxis", { axis: t("fomcharts.controls.yAxis") }),
    );
    const xBtn = findByAttr(
      c,
      "button",
      "aria-label",
      t("fomcharts.controls.editAxis", { axis: t("fomcharts.controls.xAxis") }),
    );
    const swapBtn = findByAttr(
      c,
      "button",
      "aria-label",
      t("fomcharts.controls.swapAxes"),
    );
    push(chartMarks, markUnion(c, [yBtn, xBtn, swapBtn]));
    // The Y-axis picker opened above (see the openSection-style click near
    // the top of this function) -- AxisSelector's own collapsible panel is
    // its button column's next (and only other) sibling within its root.
    const axisSelectorRoot = yBtn?.parentElement?.parentElement?.parentElement;
    const pickerPanel = axisSelectorRoot?.lastElementChild as
      HTMLElement | null | undefined;
    push(chartMarks, pickerPanel ? markRect(c, pickerPanel, 4) : null);
  }

  // Display section: scale / trend line / pareto / legend / median / point
  // size -- in the same top-to-bottom order GraphControls.vue actually
  // renders them. Curve type (only shown once Trend line is on, which it
  // now always is here) is explained in the Trend line row's own legend
  // text rather than getting a separate ring. Point size similarly rings
  // its WHOLE block (the size-by-value toggle, the measurement picker, and
  // the slider together, all one shared wrapper) as a single numbered
  // callout instead of three, since they're one coherent control group.
  const displayControlsWrap = pageControlsDisplayRef.value?.displayControlsWrap;
  if (displayControlsWrap) {
    const c = displayControlsWrap;
    [
      t("fomcharts.scale.label"),
      t("fomcharts.controls.trendLine"),
      t("fomcharts.controls.pareto"),
      t("fomcharts.legend.toggle"),
      t("fomcharts.medianLine.toggle"),
    ].forEach((label) => {
      push(displayMarks, markRow(c, label));
    });
    const sizeToggleLabel = findByText(
      c,
      "span",
      t("fomcharts.controls.pointSizeByValue"),
    );
    const sizeBlock = sizeToggleLabel?.parentElement
      ?.parentElement as HTMLElement | null;
    push(displayMarks, sizeBlock ? markRect(c, sizeBlock, 4) : null);
  }

  // Filters section: Hide needs-review, Domain, Origin, Material Class /
  // Base Materials dropdown buttons, exclusion mode -- in the same
  // top-to-bottom order the section actually renders them in (see
  // GraphControls.vue), so the numbered rings stay in sync. Each category
  // is now a closed-by-default FilterDropdown button (real DOM, boxed the
  // same way the toolbar's own buttons are), not the old always-expanded
  // chip grid markFilterBlock was written for.
  const filtersWrap = pageFiltersRef.value?.filtersWrap;
  if (filtersWrap) {
    const c = filtersWrap;
    push(
      filterMarks,
      markRow(
        c,
        t("fomcharts.filters.excludeNeedsReview", { count: needsReviewCount }),
      ),
    );
    [
      t("fomcharts.filters.domain"),
      t("fomcharts.filters.origin"),
      t("fomcharts.filters.materialClass"),
      t("fomcharts.filters.baseMaterials"),
    ].forEach((label) => {
      const btn = findByText(c, "button", label);
      push(filterMarks, btn ? markRect(c, btn, 4) : null);
    });
    push(filterMarks, markRow(c, t("fomcharts.filters.exclusionMode.label")));
  }

  // Compare groups: "Group / Color by" select, first group card (EXP). Boxes
  // the group's whole row (button + its "n=" count), not just the label
  // button -- the label button alone stretches almost to the count via
  // flex-1, so a ring sized to just the button put the floating number
  // badge right on top of "n=...".
  const statsWrap = pageCompareGroupsRef.value?.statsWrap;
  if (statsWrap) {
    const c = statsWrap;
    push(statsMarks, markRow(c, t("fomcharts.controls.groupBy")));
    const groupBtn = findByText(c, "button", "EXP");
    const groupRow = groupBtn?.parentElement as HTMLElement | null;
    push(statsMarks, groupRow ? markRect(c, groupRow, 4) : null);

    // Expand the EXP group's own detail tiles for real -- the same chevron
    // click a researcher would make -- so the "count, mean, median, sigma"
    // breakdown mark 2's legend already describes is actually visible,
    // instead of only being described.
    const detailsBtn = groupRow
      ? findByAttr(
          groupRow,
          "button",
          "aria-label",
          t("fomcharts.stats.showDetails"),
        )
      : null;
    if (detailsBtn) {
      detailsBtn.click();
      await nextTick();
      await settle();
    }
    const groupOuter = groupRow?.parentElement as HTMLElement | null;
    const tileGrid = groupOuter?.querySelector(
      ".pt-1.pl-4",
    ) as HTMLElement | null;
    push(statsMarks, tileGrid ? markRect(c, tileGrid, 4) : null);
  }

  // Annotations: sort select, "show only pinned" row, compare selection bar,
  // R3's own card header, its Export/Remove buttons (same header row), then
  // -- once R3 is expanded below -- its siblings shortcut, Origin box, Mode
  // ID box, Layer Structure box, Metrics box and Notes box, in the same
  // top-to-bottom order they actually render in (see AnnotationCard.vue), so
  // the numbered rings stay in sync.
  const annotationsWrap = pageAnnotateRef.value?.annotationsWrap;
  if (annotationsWrap) {
    const c = annotationsWrap;
    // The sort control has no visible caption of its own -- only its
    // current value ("Newest first" / "Plus récentes" / ...) shown on the
    // trigger button itself, so it's matched (and boxed) by that value
    // rather than by a row label like the other controls.
    const sortTrigger = findByText(
      c,
      "button",
      t("fomcharts.annotations.sort.newest"),
    );
    push(annotationMarks, sortTrigger ? markRect(c, sortTrigger, 4) : null);
    push(
      annotationMarks,
      markRow(c, t("fomcharts.annotations.showOnlyPinned")),
    );
    // The panel-level compare bar only renders once a pin is selected (see
    // AnnotationsPanel), and no pins are selected at capture time -- so this
    // rings the per-card checkbox instead, the actual control a researcher
    // checks first to start a comparison. Boxes the whole row (the
    // checkbox's own label's parent), not just the label -- R1 also carries
    // a "pin siblings" shortcut button on that same row, which a ring sized
    // to only the label left outside its own circle.
    const compareLabelSpan = findByText(
      c,
      "span",
      t("fomcharts.annotations.compareLabel"),
    );
    const compareRow = compareLabelSpan?.closest("label")
      ?.parentElement as HTMLElement | null;
    push(annotationMarks, compareRow ? markRect(c, compareRow, 4) : null);

    // cardHeader, Export and Remove sit in one row only 6px (gap-1.5) apart
    // -- markRect's default 4px outward pad on two touching edges would
    // overlap (4+4 > 6), so these three specifically use a tighter 2px pad
    // to leave a sliver of daylight between each ring.
    const cardRef = findByText(c, "span", "R3");
    const cardHeader = cardRef?.closest("button") as HTMLElement | null;
    push(annotationMarks, cardHeader ? markRect(c, cardHeader, 2) : null);

    // Export/Remove sit in the same header row as cardHeader, as two more
    // icon buttons -- scoped to that row (not the whole panel) since R1's
    // collapsed card carries its own same-aria-label pair in the DOM too.
    const headerRow = cardHeader?.parentElement as HTMLElement | null;
    const exportBtn = headerRow
      ? findByAttr(
          headerRow,
          "button",
          "aria-label",
          t("fomcharts.annotations.exportPin"),
        )
      : null;
    push(annotationMarks, exportBtn ? markRect(c, exportBtn, 2) : null);
    const removeBtn = headerRow
      ? findByAttr(
          headerRow,
          "button",
          "aria-label",
          t("fomcharts.annotations.remove"),
        )
      : null;
    push(annotationMarks, removeBtn ? markRect(c, removeBtn, 2) : null);

    // Expand R3 for real -- the same click a researcher would make -- rather
    // than only describing what's inside in prose. Guarded by its own
    // aria-label so a later locale-switch re-run (this whole function fires
    // again, see the watcher below) doesn't click it a second time and
    // toggle it back closed.
    if (
      cardHeader?.getAttribute("aria-label") ===
      t("fomcharts.annotations.expandDetails")
    ) {
      cardHeader.click();
      await nextTick();
      await settle();
    }
    // R1 (still collapsed) carries the same hidden Layer Structure/Metrics/
    // Notes boxes in the DOM (just visually collapsed), so every lookup
    // below is scoped to R3's own card root, not the whole panel, or it
    // could just as easily match R1's invisible copies instead.
    const r3Card = cardHeader?.parentElement?.parentElement
      ?.parentElement as HTMLElement | null;
    if (r3Card) {
      const siblingsBtn = findByAttr(
        r3Card,
        "button",
        "aria-label",
        t("fomcharts.annotations.pinSiblings", { count: 1 }, { plural: 1 }),
      );
      push(annotationMarks, siblingsBtn ? markRect(c, siblingsBtn, 4) : null);
      // Origin and Mode ID box labels are raw column names (not translated
      // strings -- see findOriginColumn/findModeIdColumn), so they're
      // matched by that literal text the same way "R3" is above, rather
      // than through a t(...) lookup.
      const originBox = findByText(r3Card, "span", "Origin")?.closest(
        ".rounded-md",
      ) as HTMLElement | null;
      push(annotationMarks, originBox ? markRect(c, originBox, 4) : null);
      const modeBox = findByText(r3Card, "span", "Mode ID")?.closest(
        ".rounded-md",
      ) as HTMLElement | null;
      push(annotationMarks, modeBox ? markRect(c, modeBox, 4) : null);
      const layerBox = findByText(
        r3Card,
        "span",
        t("fomcharts.annotations.layerStructure"),
      )?.closest(".rounded-md") as HTMLElement | null;
      push(annotationMarks, layerBox ? markRect(c, layerBox, 4) : null);
      const metricsBox = findByText(
        r3Card,
        "span",
        t("fomcharts.annotations.metrics"),
      )?.closest(".rounded-md") as HTMLElement | null;
      push(annotationMarks, metricsBox ? markRect(c, metricsBox, 4) : null);
      const notesBox = findByText(
        r3Card,
        "span",
        t("fomcharts.annotations.notes"),
      )?.closest(".rounded-md") as HTMLElement | null;
      push(annotationMarks, notesBox ? markRect(c, notesBox, 4) : null);
    }
  }

  // Reading the chart: badges (real DOM), legend, point-size legend, median
  // line, flagged point (the last four live only on ECharts' canvas -- see
  // FomChart's getLegendRect/getSizeLegendRect/getMedianLineRect/
  // getFlaggedPointRect). Pushed in the same order as readingMarks' own
  // legend (badges, legend, point size, median, flagged) so the numbered
  // rings stay in sync with it.
  const readingWrap = pageReadingRef.value?.readingWrap;
  const readingChartRef = pageReadingRef.value?.readingChartRef;
  if (readingWrap && readingChartRef) {
    const wrap = readingWrap;
    const chart = readingChartRef;
    const badgesEl = chart.getBadgesRow();
    push(readingMarks, badgesEl ? markRect(wrap, badgesEl, 4) : null);
    const chartDom = chart.getChartDom();
    const legendRect = chart.getLegendRect();
    push(
      readingMarks,
      chartDom && legendRect
        ? markCanvasRect(wrap, chartDom, legendRect)
        : null,
    );
    const sizeLegendRect = chart.getSizeLegendRect();
    push(
      readingMarks,
      chartDom && sizeLegendRect
        ? markCanvasRect(wrap, chartDom, sizeLegendRect)
        : null,
    );
    // See the point-size-legend "peephole" patch's template comment (in
    // GuidePageReading.vue): a plain PNG snapshot laid over just that one
    // broken row, not the whole canvas.
    readingChartImgUrl.value = chart.getPngDataUrl();
    readingChartFullRect.value = chartDom ? markRect(wrap, chartDom, 0) : null;
    readingSizeLegendRect.value =
      chartDom && sizeLegendRect
        ? markCanvasRect(wrap, chartDom, sizeLegendRect, 4)
        : null;
    const medianRect = chart.getMedianLineRect();
    push(
      readingMarks,
      chartDom && medianRect
        ? markCanvasRect(wrap, chartDom, medianRect)
        : null,
    );
    const flaggedRect = chart.getFlaggedPointRect();
    push(
      readingMarks,
      chartDom && flaggedRect
        ? markCanvasRect(wrap, chartDom, flaggedRect)
        : null,
    );
    // Zoom control cluster -- real DOM (not canvas-drawn), so a plain
    // markRect works the same way it does for the badges row above, even
    // inside this figure's scaled/clipped wrapper (getBoundingClientRect
    // already reflects the live transform). Found locked (the default on
    // every fresh mount): aria-label reads "Unlock zoom", the action
    // clicking it would perform.
    const lockBtn = findByAttr(
      wrap,
      "button",
      "aria-label",
      t("fomcharts.zoom.unlock"),
    );
    push(
      readingMarks,
      lockBtn?.parentElement
        ? markRect(wrap, lockBtn.parentElement as HTMLElement, 4)
        : null,
    );
  }

  // Page 10: Data points tab -- filter chips (boxed as one row), the sort
  // button, the Add data button, then the Pinned group's header -- in the
  // same top-to-bottom order DataPointsTable actually renders them in
  // (filters+search+sort+add sit above the group list), so the numbered
  // rings read top to bottom too.
  const dataTableWrap = pageDataTableRef.value?.dataTableWrap;
  if (dataTableWrap) {
    const c = dataTableWrap;
    const allBtn = findByText(
      c,
      "button",
      t("fomcharts.pointsTable.filters.all"),
    );
    const filterRow = allBtn?.parentElement as HTMLElement | null;
    push(dataTableMarks, filterRow ? markRect(c, filterRow, 4) : null);
    const sortBtn = findByAttr(
      c,
      "button",
      "aria-label",
      t("fomcharts.pointsTable.sortLabel"),
    );
    push(dataTableMarks, sortBtn ? markRect(c, sortBtn, 4) : null);
    const addBtn = findByAttr(
      c,
      "button",
      "aria-label",
      t("fomcharts.addPoint.toolbarButton"),
    );
    push(dataTableMarks, addBtn ? markRect(c, addBtn, 4) : null);
    const pinnedSpan = findByText(
      c,
      "span",
      t("fomcharts.pointsTable.pinnedGroup"),
    );
    const pinnedBtn = pinnedSpan?.closest("button") as HTMLElement | null;
    push(dataTableMarks, pinnedBtn ? markRect(c, pinnedBtn, 4) : null);
  }

  // Page 11: Add a point, Essentials (label, axis values, Domain/Origin,
  // shape) then Metrics (measurements, Q-factor) -- each ring is a plain ref
  // on markup written in GuidePageAddPoint1.vue, not a text search, since
  // there's no pre-existing component layout to reverse engineer here.
  const addPoint1Wrap = pageAddPoint1Ref.value?.addPoint1Wrap;
  const addPointLabelWrap = pageAddPoint1Ref.value?.addPointLabelWrap;
  const addPointAxesWrap = pageAddPoint1Ref.value?.addPointAxesWrap;
  const addPointDomainOriginWrap =
    pageAddPoint1Ref.value?.addPointDomainOriginWrap;
  const addPointShapeWrap = pageAddPoint1Ref.value?.addPointShapeWrap;
  const addPointMetricsWrap = pageAddPoint1Ref.value?.addPointMetricsWrap;
  const addPointQFactorWrap = pageAddPoint1Ref.value?.addPointQFactorWrap;
  if (addPoint1Wrap) {
    const c = addPoint1Wrap;
    push(
      addPoint1Marks,
      addPointLabelWrap ? markRect(c, addPointLabelWrap, 4) : null,
    );
    push(
      addPoint1Marks,
      addPointAxesWrap ? markRect(c, addPointAxesWrap, 4) : null,
    );
    push(
      addPoint1Marks,
      addPointDomainOriginWrap
        ? markRect(c, addPointDomainOriginWrap, 4)
        : null,
    );
    push(
      addPoint1Marks,
      addPointShapeWrap ? markRect(c, addPointShapeWrap, 4) : null,
    );
    push(
      addPoint1Marks,
      addPointMetricsWrap ? markRect(c, addPointMetricsWrap, 4) : null,
    );
    push(
      addPoint1Marks,
      addPointQFactorWrap ? markRect(c, addPointQFactorWrap, 4) : null,
    );
  }

  // Page 12: Add a point, Structure & materials cascade (3 nodes).
  const addPoint2Wrap = pageAddPoint2Ref.value?.addPoint2Wrap;
  const addPointNode1Wrap = pageAddPoint2Ref.value?.addPointNode1Wrap;
  const addPointNode2Wrap = pageAddPoint2Ref.value?.addPointNode2Wrap;
  const addPointNode3Wrap = pageAddPoint2Ref.value?.addPointNode3Wrap;
  if (addPoint2Wrap) {
    const c = addPoint2Wrap;
    push(
      addPoint2Marks,
      addPointNode1Wrap ? markRect(c, addPointNode1Wrap, 4) : null,
    );
    push(
      addPoint2Marks,
      addPointNode2Wrap ? markRect(c, addPointNode2Wrap, 4) : null,
    );
    push(
      addPoint2Marks,
      addPointNode3Wrap ? markRect(c, addPointNode3Wrap, 4) : null,
    );
  }

  // Page 13: Add a point, result on the chart -- the "N added manually"
  // badge (real DOM, part of the badges row) and the new point itself (its
  // gold-outlined bubble, found by isManual the same way getFlaggedPointRect
  // finds the flagged one on page 8).
  const addPoint3Wrap = pageAddPoint3Ref.value?.addPoint3Wrap;
  const addPoint3ChartRef = pageAddPoint3Ref.value?.addPoint3ChartRef;
  if (addPoint3Wrap && addPoint3ChartRef) {
    const c = addPoint3Wrap;
    const chart = addPoint3ChartRef;
    const badgesEl = chart.getBadgesRow();
    const manualBadge = badgesEl
      ? findByText(
          badgesEl,
          "span",
          t("fomcharts.manualCount", { count: 1 }, { plural: 1 }),
        )
      : null;
    push(addPoint3Marks, manualBadge ? markRect(c, manualBadge, 4) : null);
    const chartDom = chart.getChartDom();
    const manualPointRect = chart.getManualPointRect();
    push(
      addPoint3Marks,
      chartDom && manualPointRect
        ? markCanvasRect(c, chartDom, manualPointRect, 3)
        : null,
    );
  }

  // Page 15: Compare pinned points -- the chip row (reorder/add/remove) and
  // the sort + display-settings row sit above the comparison figure, same
  // hand-assembled-mock constraint as the markup toolbar below (the real
  // CompareDialog's content teleports outside the `.guide-page` tree
  // pdfExport.ts captures). One ring spans both rows (not one each) -- this
  // fixed-height A4 page has no slack for a second ring's own top-badge
  // offset, and the two rows are one coherent "manage & organize the
  // comparison" concept anyway.
  const comparePinsTopWrap = pageComparePinsRef.value?.comparePinsTopWrap;
  const comparePinsChipsRowWrap =
    pageComparePinsRef.value?.comparePinsChipsRowWrap;
  const comparePinsSortRowWrap =
    pageComparePinsRef.value?.comparePinsSortRowWrap;
  if (comparePinsTopWrap) {
    const c = comparePinsTopWrap;
    push(
      comparePinsTopMarks,
      markUnion(
        c,
        [comparePinsChipsRowWrap ?? null, comparePinsSortRowWrap ?? null],
        4,
      ),
    );
  }

  // Page 15: Compare pinned points -- the hand-assembled markup toolbar
  // mock (same real Button/icon components as the live CompareDialog
  // toolbar, since that dialog's own content teleports outside the
  // `.guide-page` tree pdfExport.ts captures -- same constraint as the
  // comparison image itself, see comparePngUrl below).
  const markupBlockWrap = pageComparePinsRef.value?.markupBlockWrap;
  const markupToolsWrap = pageComparePinsRef.value?.markupToolsWrap;
  if (markupBlockWrap) {
    const c = markupBlockWrap;
    push(
      comparePinsMarks,
      markupToolsWrap ? markRect(c, markupToolsWrap, 4) : null,
    );
    const resetBtn = findByText(
      c,
      "button",
      t("fomcharts.compare.tools.reset"),
    );
    push(comparePinsMarks, resetBtn ? markRect(c, resetBtn, 4) : null);
  }

  // Page 17's "full point export" / "Metrics" export figures -- see
  // AnnotationsPanel's exposed getExportDataUrl / getMetricsExportDataUrl.
  const annotationsPanelRef = pageAnnotateRef.value?.annotationsPanelRef;
  pinExportDataUrl.value =
    annotationsPanelRef?.getExportDataUrl(DEMO_PIN_ID_R3_EXP) ?? null;
  metricsExportDataUrl.value =
    annotationsPanelRef?.getMetricsExportDataUrl(DEMO_PIN_ID_R3_EXP) ?? null;
  // Page 15's "Compare (2)" figure -- see AnnotationsPanel's exposed getComparePngDataUrl.
  comparePngUrl.value =
    annotationsPanelRef?.getComparePngDataUrl([
      DEMO_PIN_ID_R3_EXP,
      DEMO_PIN_ID_R1_SIM,
    ]) ?? null;
  // Page 16's chart image exports -- see the hidden generator FomChart instances' exposed getPngDataUrl.
  exportChartPngUrl.value = exportChartGenRef.value?.getPngDataUrl() ?? null;
  exportChartPngUrl2.value = exportChartGenRef2.value?.getPngDataUrl() ?? null;

  // Page 19 (Mode 2 -- drop step): staged files grid, model selector,
  // launch block, in the same left-to-right/top-to-bottom order the real
  // screen lays them out.
  const dropStepWrap = pageMode2DropRef.value?.dropStepWrap;
  if (dropStepWrap) {
    const c = dropStepWrap;
    const filesWrap = pageMode2DropRef.value?.dropFilesWrap;
    const modelWrap = pageMode2DropRef.value?.dropModelWrap;
    const launchWrap = pageMode2DropRef.value?.dropLaunchWrap;
    push(mode2DropMarks, filesWrap ? markRect(c, filesWrap, 4) : null);
    push(mode2DropMarks, modelWrap ? markRect(c, modelWrap, 4) : null);
    push(mode2DropMarks, launchWrap ? markRect(c, launchWrap, 4) : null);
  }

  // Page 20 (Mode 2 -- running step): progress header, batch strip +
  // quota notice, current/next file cards, event log, docked minigame/PDF
  // preview column.
  const runningWrap = pageMode2RunningRef.value?.runningWrap;
  if (runningWrap) {
    const c = runningWrap;
    const headerWrap = pageMode2RunningRef.value?.runningHeaderWrap;
    const stripWrap = pageMode2RunningRef.value?.runningStripWrap;
    const filesWrap = pageMode2RunningRef.value?.runningFilesWrap;
    const logWrap = pageMode2RunningRef.value?.runningLogWrap;
    const gameWrap = pageMode2RunningRef.value?.runningGameWrap;
    push(mode2RunningMarks, headerWrap ? markRect(c, headerWrap, 4) : null);
    push(mode2RunningMarks, stripWrap ? markRect(c, stripWrap, 4) : null);
    push(mode2RunningMarks, filesWrap ? markRect(c, filesWrap, 4) : null);
    push(mode2RunningMarks, logWrap ? markRect(c, logWrap, 4) : null);
    push(mode2RunningMarks, gameWrap ? markRect(c, gameWrap, 4) : null);
  }

  // Page 23 (Mode 2 -- review a record): tabs+table, evidence callout,
  // action row, and the (hand-mocked) PDF viewer, one ring each.
  const reviewWrap = pageMode2ReviewRef.value?.reviewWrap;
  if (reviewWrap) {
    const c = reviewWrap;
    const tableWrap = pageMode2ReviewRef.value?.reviewTableWrap;
    const calloutWrap = pageMode2ReviewRef.value?.reviewCalloutWrap;
    const actionsWrap = pageMode2ReviewRef.value?.reviewActionsWrap;
    const pdfWrap = pageMode2ReviewRef.value?.reviewPdfWrap;
    push(mode2ReviewMarks, tableWrap ? markRect(c, tableWrap, 4) : null);
    push(mode2ReviewMarks, calloutWrap ? markRect(c, calloutWrap, 4) : null);
    push(mode2ReviewMarks, actionsWrap ? markRect(c, actionsWrap, 4) : null);
    push(mode2ReviewMarks, pdfWrap ? markRect(c, pdfWrap, 4) : null);
  }

  // Page 24 (Mode 2 -- correct a record): the reason banner and the source
  // strip -- ExtractionReviewDetail exposes no refs of its own (it's
  // mounted as-is, not hand-assembled), so these are found the same way
  // Compare Groups' own detail tile grid is: real translated text already
  // unique on this page.
  const detailWrap = pageMode2CorrectRef.value?.detailWrap;
  if (detailWrap) {
    const c = detailWrap;
    const banner = findByText(
      c,
      "p",
      t("extraction.review.detail.status.editHeading"),
    );
    const bannerRow = banner?.parentElement
      ?.parentElement as HTMLElement | null;
    push(mode2CorrectMarks, bannerRow ? markRect(c, bannerRow, 4) : null);
    const sourcesLabel = findByText(
      c,
      "span",
      t("extraction.review.detail.sources.label"),
    );
    const sourcesRow = sourcesLabel?.parentElement as HTMLElement | null;
    push(mode2CorrectMarks, sourcesRow ? markRect(c, sourcesRow, 4) : null);
    const fwhmLabel = findByText(
      c,
      "dt",
      t("extraction.review.edit.fields.fwhmNm"),
    );
    const fwhmField = fwhmLabel?.parentElement as HTMLElement | null;
    push(mode2CorrectMarks, fwhmField ? markRect(c, fwhmField, 4) : null);
  }

  // Page 26 (Mode 2 -- ask Photon): header, message thread, suggested
  // chips -- plain refs on markup hand-written in GuidePagePhoton.vue (same
  // technique as the AddPoint pages), not a text search, since this stand-in
  // has no pre-existing live component layout to reverse engineer. These
  // three sit flush against each other (no gap, just a border), so a 2px
  // pad (rather than markRect's 4px default) keeps adjacent rings from
  // overlapping where they touch.
  const photonWrap = pagePhotonRef.value?.photonWrap;
  if (photonWrap) {
    const c = photonWrap;
    const headerWrap = pagePhotonRef.value?.photonHeaderWrap;
    const messagesWrap = pagePhotonRef.value?.photonMessagesWrap;
    const chipsWrap = pagePhotonRef.value?.photonChipsWrap;
    push(photonMarks, headerWrap ? markRect(c, headerWrap, 2) : null);
    push(photonMarks, messagesWrap ? markRect(c, messagesWrap, 2) : null);
    push(photonMarks, chipsWrap ? markRect(c, chipsWrap, 2) : null);
  }

  // Page 26 (Mode 2 -- export): the preview badge + reviewed-by legend
  // row, the records table, and the summary/save footer --
  // ExtractionExportStep is mounted whole (no network call fires until a
  // real click), so these are found the same way, via real translated
  // text already unique on this page.
  const exportStepWrap = pageMode2ExportRef.value?.exportStepWrap;
  if (exportStepWrap) {
    const c = exportStepWrap;
    const legendSpan = findByText(
      c,
      "span",
      t("extraction.export.reviewedByLegend"),
    );
    const legendRow = legendSpan?.parentElement as HTMLElement | null;
    push(mode2ExportMarks, legendRow ? markRect(c, legendRow, 4) : null);
    const table = legendRow?.nextElementSibling as HTMLElement | null;
    push(mode2ExportMarks, table ? markRect(c, table, 4) : null);
    const readyP = findByText(c, "p", t("extraction.ready.heading"));
    const footer = readyP?.parentElement?.parentElement as HTMLElement | null;
    push(mode2ExportMarks, footer ? markRect(c, footer, 4) : null);
  }
}

// See composables/useGuideCaptureReadiness.ts.
const { waitUntilReady } = useGuideCaptureReadiness(
  captureGuideArtifacts,
  locale,
);

defineExpose({ rootEl, waitUntilReady });
</script>

<!-- Unscoped (not `scoped`) -- Vue's scoped CSS only reaches a child
     component's own ROOT node via attrs fallthrough, not the nested wrap
     divs/rows deeper inside each GuidePageXxx.vue that actually carry
     these classes, now that every guide page lives in its own SFC. These
     class names (guide-page, guide-callout-region, guide-toc-row) are
     unique to this feature, so a plain global stylesheet is safe and keeps
     every page's callout regions/TOC rows styled exactly as before the
     split. -->
<style>
.guide-page {
  page-break-inside: avoid;
}

/* Every guide-page is a fixed-height flex column. Without this, the browser's
   default flex-shrink:1 silently COMPRESSES child blocks (rather than letting
   them overflow visibly) whenever total content is a bit too tall for the
   page -- the compressed box then ends before its own text/rows are done
   rendering, so the next sibling starts drawing on top of that spillover.
   That reads as random overlapping content instead of a clean, measurable
   overflow. Shrink-proofing every child makes real overflow show up as
   overflow (verifiable via getBoundingClientRect) instead of being masked. */
.guide-page > * {
  flex-shrink: 0;
}

.guide-callout-region {
  border: 1px solid var(--border);
  border-radius: 14px;
  padding: 8px;
  background: #fff;
}

.guide-toc-row {
  break-inside: avoid;
}
</style>
