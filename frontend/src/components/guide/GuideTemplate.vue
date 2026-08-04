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
  -->
  <div ref="rootEl" class="fixed top-0 left-[-9999px] font-sans text-ink" aria-hidden="true">
    <!-- ============================= PAGE 1 -- Cover ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col items-center justify-between bg-white p-[18mm] break-after-page"
      :data-outline-title="t('guide.outline.cover')"
    >
      <div class="flex w-full items-center justify-between">
        <span class="font-mono text-xs text-secondary">{{ t("guide.meta.version") }} v{{ appVersion }}</span>
        <span class="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase">
          {{ locale }}
        </span>
      </div>

      <div class="flex flex-col items-center gap-5 text-center">
        <img src="@/assets/logo.svg" class="h-24 w-24" alt="" />
        <h1 class="text-5xl font-bold text-ink">{{ t("app.title") }}</h1>
        <p class="text-xl text-secondary">{{ t("guide.meta.subtitle") }}</p>
        <div class="mt-6 h-px w-24 bg-border" />
        <p class="max-w-md text-base leading-relaxed text-ink">{{ t("view.home.hero.title") }}</p>
        <p class="max-w-sm text-sm leading-relaxed text-secondary">{{ t("view.home.hero.description") }}</p>
      </div>

      <div class="flex w-full flex-col items-center gap-4">
        <div class="flex items-center gap-8">
          <img :src="yonseiSymbol" alt="Yonsei University" class="h-16 w-auto" />
          <div class="h-10 w-px bg-border" />
          <!-- The Optica mark ships as a solid-white SVG (built for the app's
               dark hero band, see HomeView.vue) -- on this plain white cover
               it's recolored to solid black via a brightness filter rather
               than boxed in a dark chip, so both marks read directly off
               the page like a real letterhead. -->
          <img :src="yonseiOptica" alt="Optica" class="h-12 w-auto" style="filter: brightness(0)" />
        </div>
        <p class="text-xs text-secondary">{{ t("guide.meta.lab") }}</p>
      </div>
    </section>

    <!-- ============================= PAGE 2 -- Introduction ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.intro')"
    >
      <GuideHeader />

      <h2 class="mb-2.5 text-xl font-semibold">{{ t("guide.intro.title") }}</h2>

      <div class="mb-2.5">
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.abstractTitle") }}</h3>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.intro.abstractBody") }}</p>
      </div>

      <div class="mb-3">
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.guideTitle") }}</h3>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.intro.guideBody") }}</p>
      </div>

      <div>
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.contextTitle") }}</h3>
        <p class="mb-2 text-sm leading-relaxed text-justify text-ink">{{ t("guide.intro.contextBody") }}</p>
        <!-- Each block's URL is a real clickable PDF link (see pdfExport.ts's
             data-external-link handling), same mechanism as the sample
             dataset link on the Import page -- these point at each
             institution's own site rather than this app's origin. Yonsei and
             Optica reuse the same mark assets already shipped for the cover
             page and the app's own hero band (real, rights-cleared local
             SVGs); MPBEL and SPIE don't have a locally vetted logo asset yet,
             so they get a plain monogram badge instead of a fabricated mark
             -- same visual weight, no invented artwork. -->
        <div class="grid grid-cols-2 gap-2.5">
          <div class="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div class="mb-1 flex h-5 items-center">
              <img :src="yonseiSymbol" alt="" class="h-5 w-auto" />
            </div>
            <p class="mb-0.5 text-xs font-semibold text-ink">Yonsei University</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.intro.yonsei") }}</p>
            <p class="mt-1 text-[10px] text-primary underline" data-external-link="https://www.yonsei.ac.kr/en_sc/">yonsei.ac.kr</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div class="mb-1 flex h-5 items-center">
              <span class="flex h-5 items-center rounded bg-primary/10 px-1.5 font-mono text-[10px] font-bold tracking-wide text-primary">MPBEL</span>
            </div>
            <p class="mb-0.5 text-xs font-semibold text-ink">MPBEL</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.intro.mpbel") }}</p>
            <p class="mt-1 text-[10px] text-primary underline" data-external-link="http://mpbel.yonsei.ac.kr/eng/index.php">mpbel.yonsei.ac.kr</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div class="mb-1 flex h-5 items-center">
              <span class="flex h-5 items-center rounded bg-primary/10 px-1.5 font-mono text-[10px] font-bold tracking-wide text-primary">SPIE</span>
            </div>
            <p class="mb-0.5 text-xs font-semibold text-ink">SPIE</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.intro.spie") }}</p>
            <p class="mt-1 text-[10px] text-primary underline" data-external-link="https://spie.org/">spie.org</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/20 px-3 py-2">
            <div class="mb-1 flex h-5 items-center">
              <img :src="yonseiOptica" alt="" class="h-5 w-auto" style="filter: brightness(0)" />
            </div>
            <p class="mb-0.5 text-xs font-semibold text-ink">Optica</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.intro.optica") }}</p>
            <p class="mt-1 text-[10px] text-primary underline" data-external-link="https://www.optica.org/">optica.org</p>
          </div>
        </div>
      </div>

      <GuideFooter :page="PAGE_INTRO" />
    </section>

    <!-- ============================= PAGE 3 -- Table of contents ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.toc')"
    >
      <GuideHeader />

      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.toc.title") }}</h2>

      <div class="flex flex-col overflow-hidden rounded-2xl border border-border">
        <template v-for="(entry, idx) in tocEntries" :key="entry.page">
          <div
            v-if="entry.group === 'mode1' && tocEntries[idx - 1]?.group !== 'mode1'"
            class="flex items-center gap-2 border-b border-border bg-primary/[0.07] px-4 py-1.5 text-xs font-semibold tracking-[0.2em] text-primary uppercase"
          >
            {{ t("guide.mode1.eyebrow") }} — {{ t("guide.mode1.title") }}
          </div>
          <div
            class="guide-toc-row group flex items-center gap-2.5 px-4 py-1.5"
            :class="[idx % 2 === 1 ? 'bg-muted/25' : 'bg-white', entry.group === 'mode1' ? 'pl-9' : '', idx > 0 ? 'border-t border-border/70' : '']"
            :data-toc-target="entry.page"
          >
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <component :is="entry.icon" class="size-3" />
            </span>
            <span class="flex-1 text-sm text-ink">{{ entry.label }}</span>
            <span class="h-0 w-6 flex-none -translate-y-1 border-b border-dotted border-secondary/50" />
            <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-[11px] font-semibold text-white">
              {{ entry.page }}
            </span>
          </div>
        </template>
      </div>

      <p class="mt-2 text-xs text-secondary">{{ t("guide.toc.hint") }}</p>

      <GuideFooter :page="PAGE_TOC" />
    </section>

    <!-- ============================= PAGE 4 -- Mode 1: section divider ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="mode1DividerOutlineTitle"
    >
      <GuideHeader />
      <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <p class="text-xs font-semibold tracking-[0.35em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
        <h2 class="max-w-lg text-3xl font-bold text-ink">{{ t("guide.mode1.title") }}</h2>
        <p class="max-w-sm text-sm leading-relaxed text-secondary">{{ t("guide.mode1.partIntro") }}</p>
        <ul class="mt-2 flex flex-col items-start gap-1.5 text-left">
          <li v-for="entry in mode1TocEntries" :key="entry.page" class="flex items-center gap-2.5 text-sm text-ink">
            <span class="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <component :is="entry.icon" class="size-3" />
            </span>
            {{ entry.label }}
          </li>
        </ul>
      </div>
      <GuideFooter :page="PAGE_MODE1_DIVIDER" />
    </section>

    <!-- ============================= PAGE 5 -- Mode 1: overview + import ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Import')"
    >
      <GuideHeader />

      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2.5 text-xl font-semibold">{{ t("guide.mode1.title") }}</h2>

      <div class="mb-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.scenario.title") }}</p>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.scenario.body") }}</p>
      </div>

      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.import.overviewBody") }}</p>

      <div class="mb-3">
        <h3 class="mb-1.5 text-base font-semibold text-primary">{{ t("guide.steps.import.title") }}</h3>
        <p class="mb-2.5 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.import.body") }}</p>

        <div class="mx-auto guide-callout-region" style="max-width: 380px">
          <FileDropzone compact />
        </div>
        <p class="mx-auto mt-1.5 max-w-96 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.import.figure1Caption") }}</p>
        <!-- Real clickable PDF link (see pdfExport.ts's data-external-link
             handling), pointing at a static sample dataset shipped alongside
             the app (public/sample-guide-data.csv, the exact worked example
             used throughout this guide) -- so a reader with no data of their
             own yet can still open the tool and try it immediately. -->
        <p class="mx-auto mt-1 max-w-96 text-center text-xs leading-snug text-primary underline" data-external-link="/sample-guide-data.csv">
          {{ t("guide.steps.import.sampleDataLink") }}
        </p>
      </div>

      <div>
        <div ref="toolbarWrap" class="relative mx-auto guide-callout-region" style="max-width: 500px">
          <div class="flex items-center justify-between rounded-2xl border border-secondary/10 bg-card/70 px-4 py-3 shadow-sm backdrop-blur-xl">
            <span class="text-sm font-semibold text-ink">{{ t("fomcharts.workspace.title") }}</span>
            <div class="flex items-center gap-2">
              <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink">
                <Upload />
                {{ t("actions.import") }}
              </Button>
              <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink">
                <Download />
                {{ t("actions.export") }}
                <ChevronDown class="size-2.5" />
              </Button>
              <div class="h-5 w-px bg-secondary/15" />
              <Button variant="outline" size="xs" class="border-secondary/20 bg-background/80 text-ink">
                <RotateCcw />
                {{ t("fomcharts.workspace.reset") }}
              </Button>
            </div>
          </div>
          <GuideMarkRing v-for="(m, i) in toolbarMarks" :key="i" :mark="m" :number="i + 1" side="top" />
        </div>
        <p class="mx-auto mt-1.5 max-w-125 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.import.figure2Caption") }}</p>

        <GuideMarkLegend
          class="mt-1.5"
          :items="[
            { label: t('guide.steps.import.toolbar.import.label'), body: t('guide.steps.import.toolbar.import.body') },
            { label: t('guide.steps.import.toolbar.export.label'), body: t('guide.steps.import.toolbar.export.body') },
            { label: t('guide.steps.import.toolbar.reset.label'), body: t('guide.steps.import.toolbar.reset.body') },
          ]"
        />
      </div>

      <p class="mt-2.5 text-xs leading-snug text-secondary">{{ t("guide.steps.import.aiNote") }}</p>

      <GuideFooter :page="PAGE_MODE1_IMPORT" />
    </section>

    <!-- ============================= PAGE 6 -- Mode 1: chart & display controls ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Controls')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-1.5 text-xl font-semibold">{{ t("guide.steps.controls.title") }}</h2>
      <p class="mb-2.5 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.controls.body") }}</p>

      <div class="flex gap-5">
        <div class="flex-1">
          <div ref="chartControlsWrap" class="guide-callout-region relative" style="width: 260px">
            <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-legend="showLegend"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:trend-type="trendType"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:composite-filter-mode="compositeFilterMode"
            v-model:show-pareto="showPareto"
            v-model:exclude-needs-review="excludeNeedsReview"
            v-model:point-size-mode="pointSizeMode"
            v-model:point-size-by="pointSizeBy"
            v-model:point-size="pointSize"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :domain-column="domainColumn"
            :domain-values="domainValues"
            :domain-counts="domainCounts"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
            :needs-review-column="reviewStatusColumn"
            :needs-review-count="needsReviewCount"
          />
            <GuideMarkRing v-for="(m, i) in chartMarks" :key="i" :mark="m" :number="i + 1" />
          </div>
          <p class="mt-1.5 max-w-65 text-[11px] leading-snug text-secondary">{{ t("guide.steps.controls.figureChartCaption") }}</p>
          <GuideMarkLegend
            class="mt-1.5"
            :compact="true"
            :items="[
              { label: t('guide.steps.controls.chart.title.label'), body: t('guide.steps.controls.chart.title.body') },
              { label: t('guide.steps.controls.chart.axes.label'), body: t('guide.steps.controls.chart.axes.body') },
            ]"
          />
        </div>

        <div class="flex-1">
          <div ref="displayControlsWrap" class="guide-callout-region relative" style="width: 260px">
            <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-legend="showLegend"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:trend-type="trendType"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:composite-filter-mode="compositeFilterMode"
            v-model:show-pareto="showPareto"
            v-model:exclude-needs-review="excludeNeedsReview"
            v-model:point-size-mode="pointSizeMode"
            v-model:point-size-by="pointSizeBy"
            v-model:point-size="pointSize"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :domain-column="domainColumn"
            :domain-values="domainValues"
            :domain-counts="domainCounts"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
            :needs-review-column="reviewStatusColumn"
            :needs-review-count="needsReviewCount"
          />
            <GuideMarkRing v-for="(m, i) in displayMarks" :key="i" :mark="m" :number="i + 1" />
          </div>
          <p class="mt-1 max-w-65 text-[11px] leading-snug text-secondary">{{ t("guide.steps.controls.figureDisplayCaption") }}</p>
          <GuideMarkLegend
            class="mt-1"
            :compact="true"
            :items="[
              { label: t('guide.steps.controls.display.scale.label'), body: t('guide.steps.controls.display.scale.body') },
              { label: t('guide.steps.controls.display.trendLine.label'), body: t('guide.steps.controls.display.trendLine.body') },
              { label: t('guide.steps.controls.display.pareto.label'), body: t('guide.steps.controls.display.pareto.body') },
              { label: t('guide.steps.controls.display.legend.label'), body: t('guide.steps.controls.display.legend.body') },
              { label: t('guide.steps.controls.display.median.label'), body: t('guide.steps.controls.display.median.body') },
              { label: t('guide.steps.controls.display.pointSize.label'), body: t('guide.steps.controls.display.pointSize.body') },
            ]"
          />
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE1_CONTROLS" />
    </section>

    <!-- ============================= PAGE 7 -- Mode 1: filters ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Filters')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.filters.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.filters.body") }}</p>

      <div class="flex items-start gap-9">
        <div ref="filtersWrap" class="guide-callout-region relative shrink-0" style="width: 260px">
          <GraphControls
            v-model:y-axis="selectedYAxis"
            v-model:x-axis="selectedXAxis"
            v-model:scale="yAxisScale"
            v-model:chart-title="chartTitle"
            v-model:show-legend="showLegend"
            v-model:show-median="showMedian"
            v-model:show-trend="showTrend"
            v-model:trend-type="trendType"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:composite-filter-mode="compositeFilterMode"
            v-model:show-pareto="showPareto"
            v-model:exclude-needs-review="excludeNeedsReview"
            v-model:point-size-mode="pointSizeMode"
            v-model:point-size-by="pointSizeBy"
            v-model:point-size="pointSize"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :domain-column="domainColumn"
            :domain-values="domainValues"
            :domain-counts="domainCounts"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
            :needs-review-column="reviewStatusColumn"
            :needs-review-count="needsReviewCount"
          />
          <GuideMarkRing v-for="(m, i) in filterMarks" :key="i" :mark="m" :number="i + 1" />
        </div>
        <div class="flex-1 pt-1">
          <p class="mb-2 text-xs leading-snug text-secondary">{{ t("guide.steps.filters.figureCaption") }}</p>
          <GuideMarkLegend
            :items="[
              { label: t('guide.steps.filters.marks.needsReview.label'), body: t('guide.steps.filters.marks.needsReview.body') },
              { label: t('guide.steps.filters.marks.domain.label'), body: t('guide.steps.filters.marks.domain.body') },
              { label: t('guide.steps.filters.marks.origin.label'), body: t('guide.steps.filters.marks.origin.body') },
              { label: t('guide.steps.filters.marks.materialClass.label'), body: t('guide.steps.filters.marks.materialClass.body') },
              { label: t('guide.steps.filters.marks.baseMaterials.label'), body: t('guide.steps.filters.marks.baseMaterials.body') },
              { label: t('guide.steps.filters.marks.exclusionMode.label'), body: t('guide.steps.filters.marks.exclusionMode.body') },
            ]"
          />
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.filters.note") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_FILTERS" />
    </section>

    <!-- ============================= PAGE 8 -- Mode 1: reading the chart ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Reading')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.reading.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.reading.body") }}</p>

      <!-- The chart itself is clipped (overflow:hidden, to crop the scaled
           component to a fixed figure size), but its real content (the
           status-badge row) runs flush to that box's own right edge with
           zero slack -- so the numbered rings live in this OUTER, unclipped
           wrapper instead, sized identically, letting badges float outside
           the inner box without either covering real content or being
           clipped themselves. -->
      <div ref="readingWrap" class="relative mx-auto" style="width: 480px">
        <div class="guide-callout-region" style="width: 480px; height: 392px; overflow: hidden">
          <div style="width: 686px; transform: scale(0.7); transform-origin: top left">
            <FomChart
              ref="readingChartRef"
              :chart-data="sampleRows"
              :columns="sampleColumns"
              :y-axis="selectedYAxis"
              :x-axis="selectedXAxis"
              :group-by="groupBy"
              :y-axis-scale="yAxisScale"
              :chart-title="chartTitle"
              :show-legend="showLegend"
              :show-median="showMedian"
              :show-trend="showTrend"
              :trend-type="trendType"
              :show-pareto="showPareto"
              :x-axis-numeric="true"
              :group-color-map="groupColorMap"
              :point-size-mode="pointSizeMode"
              :point-size-by="pointSizeBy"
              :point-size="pointSize"
            />
          </div>
        </div>
        <GuideMarkRing v-for="(m, i) in readingMarks" :key="i" :mark="m" :number="i + 1" />
      </div>
      <p class="mx-auto mt-2 max-w-120 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.reading.figure4Caption") }}</p>

      <GuideMarkLegend
        class="mt-2"
        :items="[
          { label: t('guide.steps.reading.marks.badges.label'), body: t('guide.steps.reading.marks.badges.body') },
          { label: t('guide.steps.reading.marks.legend.label'), body: t('guide.steps.reading.marks.legend.body') },
          { label: t('guide.steps.reading.marks.pointSize.label'), body: t('guide.steps.reading.marks.pointSize.body') },
          { label: t('guide.steps.reading.marks.median.label'), body: t('guide.steps.reading.marks.median.body') },
          { label: t('guide.steps.reading.marks.flagged.label'), body: t('guide.steps.reading.marks.flagged.body') },
          { label: t('guide.steps.reading.marks.zoomControls.label'), body: t('guide.steps.reading.marks.zoomControls.body') },
        ]"
      />

      <div class="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.hover.label") }}</strong> — {{ t("guide.steps.reading.interactions.hover.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.zoom.label") }}</strong> — {{ t("guide.steps.reading.interactions.zoom.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.click.label") }}</strong> — {{ t("guide.steps.reading.interactions.click.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.rightClick.label") }}</strong> — {{ t("guide.steps.reading.interactions.rightClick.body") }}</p>
      </div>

      <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.reading.flaggedNote") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_READING" />
    </section>

    <!-- ============================= PAGE 9 -- Mode 1: compare groups ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Compare')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.compare.title") }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.compare.body") }}</p>

      <div class="flex items-start gap-9">
        <div ref="statsWrap" class="guide-callout-region relative shrink-0" style="width: 270px">
          <StatsSummaryPanel
            v-model:open="statsOpen"
            v-model:group-by="groupBy"
            :rows="plottableRows"
            :y-axis="selectedYAxis"
            :x-axis="selectedXAxis"
            :group-by-columns="groupByColumns"
            :highlight-group="highlightGroup"
            :composite-columns="compositeColumns"
            :group-color-map="groupColorMap"
          />
          <GuideMarkRing v-for="(m, i) in statsMarks" :key="i" :mark="m" :number="i + 1" />
        </div>
        <div class="flex-1 pt-1">
          <p class="mb-2 text-xs leading-snug text-secondary">{{ t("guide.steps.compare.figureCaption") }}</p>
          <GuideMarkLegend
            :items="[
              { label: t('guide.steps.compare.marks.groupBySelect.label'), body: t('guide.steps.compare.marks.groupBySelect.body') },
              { label: t('guide.steps.compare.marks.groupCard.label'), body: t('guide.steps.compare.marks.groupCard.body') },
            ]"
          />
        </div>
      </div>

      <div class="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.compare.note") }}</p>
      </div>

      <div class="mt-2.5 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.compare.mergeNote") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_COMPARE" />
    </section>

    <!-- ============================= PAGE 10 -- Mode 1: manage your data points ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1DataTable')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.dataTable.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.dataTable.body") }}</p>

      <div ref="dataTableWrap" class="mx-auto guide-callout-region relative" style="width: 310px">
        <DataPointsTable
          v-model:open="dataTableOpen"
          v-model:include-custom-in-stats="includeManualInStats"
          :rows="dataTableVisibleRows"
          :hidden-rows="[dataTableHiddenRow]"
          :pinned-rows="dataTablePinnedRows"
          :columns="sampleColumns"
          :y-axis="selectedYAxis"
          :group-color-map="groupColorMap"
          :group-by="originColumn"
        />
        <GuideMarkRing v-for="(m, i) in dataTableMarks" :key="i" :mark="m" :number="i + 1" />
      </div>
      <p class="mx-auto mt-1.5 max-w-96 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.dataTable.figureCaption") }}</p>

      <GuideMarkLegend
        class="mt-2"
        :items="[
          { label: t('guide.steps.dataTable.marks.filters.label'), body: t('guide.steps.dataTable.marks.filters.body') },
          { label: t('guide.steps.dataTable.marks.addData.label'), body: t('guide.steps.dataTable.marks.addData.body') },
          { label: t('guide.steps.dataTable.marks.pinnedGroup.label'), body: t('guide.steps.dataTable.marks.pinnedGroup.body') },
        ]"
      />

      <div class="mt-3">
        <h3 class="mb-1.5 text-sm font-semibold text-primary">{{ t("guide.steps.dataTable.actionsTitle") }}</h3>
        <ul class="flex flex-col gap-1 text-sm text-ink">
          <li>{{ t("guide.steps.dataTable.actions.click") }}</li>
          <li>{{ t("guide.steps.dataTable.actions.menu") }}</li>
        </ul>
      </div>

      <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.dataTable.note") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_DATATABLE" />
    </section>

    <!-- ============================= PAGE 11 -- Mode 1: add a point, essentials & metrics ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1AddPoint1')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.addPoint1.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.addPoint1.body") }}</p>

      <div ref="addPoint1Wrap" class="guide-callout-region relative mx-auto" style="width: 560px">
      <TooltipProvider :delay-duration="200">
        <!-- Step indicator -- hand-copied from AddPointDialog's own header
             markup (same real icons/classes), pinned to step 1. The live
             dialog is a Dialog (teleports outside the `.guide-page` tree
             pdfExport.ts captures), same constraint as CompareDialog. -->
        <div class="flex items-center gap-1.5">
          <template v-for="(s, i) in addPointSteps" :key="s.key">
            <div class="flex items-center gap-1.5" :class="i === 0 ? '' : 'opacity-55'">
              <span class="flex size-6 shrink-0 items-center justify-center rounded-full" :class="i === 0 ? 'bg-primary' : 'border-[1.5px] border-ink'">
                <component :is="s.icon" class="size-3" :class="i === 0 ? 'text-primary-foreground' : 'text-ink'" />
              </span>
              <span class="text-[10.5px] font-bold whitespace-nowrap" :class="i === 0 ? 'text-primary' : 'text-ink'">{{ i + 1 }}. {{ s.label }}</span>
            </div>
            <div v-if="i < addPointSteps.length - 1" class="h-0.5 min-w-1.5 flex-1 bg-secondary/15" />
          </template>
        </div>

        <h3 class="mt-3 mb-1 text-sm font-semibold text-primary">{{ t("guide.steps.addPoint1.essentialsTitle") }}</h3>
        <p class="mb-2.5 text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint1.essentialsBody") }}</p>

        <div class="grid grid-cols-2 gap-x-6 gap-y-3">
          <div class="flex flex-col gap-3">
            <div ref="addPointLabelWrap" class="flex flex-col gap-1.5">
              <Label class="flex items-center gap-1 text-[11px] text-muted-foreground">
                {{ t("fomcharts.addPoint.labelField") }}
                <span class="text-rose-500">*</span>
              </Label>
              <Input :model-value="addPointLabel" readonly class="h-8 text-sm" />
            </div>
            <div ref="addPointAxesWrap" class="grid grid-cols-2 gap-x-3">
              <AddPointField
                v-for="field in addPointRequiredFields"
                :key="field.column"
                v-model="addPointValues[field.column]"
                :field="field"
                :label="addPointFieldLabel(field)"
              />
            </div>
          </div>
          <div class="flex flex-col gap-3">
            <div ref="addPointDomainOriginWrap" class="flex flex-wrap items-start gap-3">
              <div v-if="addPointDomainField" class="flex flex-col gap-1.5">
                <AddPointField v-model="addPointValues[addPointDomainField.column]" :field="addPointDomainField" :label="addPointFieldLabel(addPointDomainField)" />
              </div>
              <div v-if="addPointOriginField" class="flex flex-col gap-1.5">
                <Label class="text-[11px] text-muted-foreground">{{ addPointFieldLabel(addPointOriginField) }}</Label>
                <div class="inline-flex overflow-hidden rounded-md border border-input">
                  <button
                    v-for="(opt, idx) in addPointOriginField.options"
                    :key="opt"
                    type="button"
                    class="px-3 py-1.5 text-xs font-semibold transition-colors"
                    :class="[
                      addPointValues[addPointOriginField.column] === opt ? 'bg-primary text-primary-foreground' : 'bg-card text-muted-foreground',
                      idx > 0 ? 'border-l border-input' : '',
                    ]"
                  >
                    {{ opt }}
                  </button>
                </div>
              </div>
            </div>
            <div ref="addPointShapeWrap" class="flex flex-col gap-1.5">
              <Label class="text-[11px] text-muted-foreground">{{ t("fomcharts.addPoint.sections.shape") }}</Label>
              <PointShapeField v-model="addPointShape" />
            </div>
          </div>
        </div>

        <div class="mt-4 border-t border-secondary/10 pt-3">
          <h3 class="mb-1 text-sm font-semibold text-primary">{{ t("guide.steps.addPoint1.metricsTitle") }}</h3>
          <p class="mb-2.5 text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint1.metricsBody") }}</p>
          <div ref="addPointMetricsWrap" class="grid grid-cols-3 gap-x-4 gap-y-3">
            <AddPointField
              v-for="field in addPointPlainMetricFields"
              :key="field.column"
              v-model="addPointValues[field.column]"
              :field="field"
              :label="addPointFieldLabel(field)"
            />
          </div>
          <div v-if="addPointQFactorField" ref="addPointQFactorWrap" class="mt-3">
            <AddPointField
              v-model="addPointValues[addPointQFactorField.column]"
              :field="addPointQFactorField"
              :label="addPointFieldLabel(addPointQFactorField)"
              :computed-value="addPointComputedQFactor"
              :manual-override="false"
            />
          </div>
        </div>

        <GuideMarkRing v-for="(m, i) in addPoint1Marks" :key="i" :mark="m" :number="i + 1" />
      </TooltipProvider>
      </div>
      <p class="mx-auto mt-1.5 max-w-120 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint1.stepperCaption") }}</p>

      <GuideMarkLegend
        class="mt-2"
        :compact="true"
        :items="[
          { label: t('guide.steps.addPoint1.marks.label.label'), body: t('guide.steps.addPoint1.marks.label.body') },
          { label: t('guide.steps.addPoint1.marks.axes.label'), body: t('guide.steps.addPoint1.marks.axes.body') },
          { label: t('guide.steps.addPoint1.marks.domainOrigin.label'), body: t('guide.steps.addPoint1.marks.domainOrigin.body') },
          { label: t('guide.steps.addPoint1.marks.shape.label'), body: t('guide.steps.addPoint1.marks.shape.body') },
          { label: t('guide.steps.addPoint1.marks.metrics.label'), body: t('guide.steps.addPoint1.marks.metrics.body') },
          { label: t('guide.steps.addPoint1.marks.qFactor.label'), body: t('guide.steps.addPoint1.marks.qFactor.body') },
        ]"
      />

      <GuideFooter :page="PAGE_MODE1_ADDPOINT1" />
    </section>

    <!-- ============================= PAGE 12 -- Mode 1: add a point, structure, notes & result ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1AddPoint2')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.addPoint2.title") }}</h2>
      <p class="mb-1.5 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.addPoint2.body") }}</p>

      <div class="flex items-start gap-6">
        <div ref="addPoint2Wrap" class="guide-callout-region relative shrink-0" style="width: 290px">
          <h3 class="mb-1 text-sm font-semibold text-primary">{{ t("guide.steps.addPoint2.structureTitle") }}</h3>
          <p class="mb-1.5 text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint2.structureBody") }}</p>

          <div v-if="addPointBaseMaterialsField" ref="addPointNode1Wrap" class="flex gap-2">
            <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground">1</span>
            <div class="min-w-0 flex-1 pb-1">
              <p class="mb-1 text-[11px] font-bold text-ink">{{ addPointFieldLabel(addPointBaseMaterialsField) }}</p>
              <MaterialsTagsField
                v-model="addPointTags[addPointBaseMaterialsField.column]"
                :options="addPointBaseMaterialsOptions"
                :placeholder="t('fomcharts.addPoint.tagsPlaceholder')"
              />
            </div>
          </div>

          <div v-if="addPointMaterialClassField" ref="addPointNode2Wrap" class="flex gap-2">
            <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground">2</span>
            <div class="min-w-0 flex-1 pb-1">
              <p class="mb-0.5 text-[11px] font-bold text-ink">{{ addPointFieldLabel(addPointMaterialClassField) }}</p>
              <p class="mb-0.5 text-[10px] text-muted-foreground">{{ t("fomcharts.addPoint.materialClassSuggestedHint") }}</p>
              <MaterialsTagsField
                v-model="addPointTags[addPointMaterialClassField.column]"
                :options="addPointMaterialClassField.options ?? []"
                :placeholder="t('fomcharts.addPoint.tagsPlaceholder')"
                :option-hints="addPointMaterialClassHints"
              />
            </div>
          </div>

          <div v-if="addPointLayerField" ref="addPointNode3Wrap" class="flex gap-2">
            <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-primary-foreground">3</span>
            <div class="min-w-0 flex-1">
              <p class="mb-1 text-[11px] font-bold text-ink">{{ addPointFieldLabel(addPointLayerField) }}</p>
              <LayerStructureField v-model="addPointLayers" :material-options="addPointTags[addPointBaseMaterialsField?.column ?? ''] ?? []" />
            </div>
          </div>

          <GuideMarkRing v-for="(m, i) in addPoint2Marks" :key="i" :mark="m" :number="i + 1" />
        </div>

        <div class="flex-1 pt-1">
          <p class="mb-1.5 text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint2.figureStructureCaption") }}</p>
          <GuideMarkLegend
            :compact="true"
            :items="[
              { label: t('guide.steps.addPoint2.marks.baseMaterials.label'), body: t('guide.steps.addPoint2.marks.baseMaterials.body') },
              { label: t('guide.steps.addPoint2.marks.materialClass.label'), body: t('guide.steps.addPoint2.marks.materialClass.body') },
              { label: t('guide.steps.addPoint2.marks.layerStructure.label'), body: t('guide.steps.addPoint2.marks.layerStructure.body') },
            ]"
          />

          <div class="mt-2">
            <h3 class="mb-1 text-sm font-semibold text-primary">{{ t("guide.steps.addPoint2.finishTitle") }}</h3>
            <p class="mb-1 text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint2.finishBody") }}</p>
            <Textarea :model-value="addPointNotes" readonly class="h-9 text-sm" />
            <Alert variant="info" class="mt-1 gap-1.5 py-1">
              <Info class="size-3.5" />
              <AlertDescription class="text-[10px] text-ink/80">{{ t("fomcharts.addPoint.provenanceHint") }}</AlertDescription>
            </Alert>
          </div>

          <div class="mt-1.5 flex items-center gap-2">
            <UnitConverterPopover v-model:open="unitConverterOpen" />
            <p class="text-[10px] leading-snug text-secondary">{{ t("guide.steps.addPoint2.converterCaption") }}</p>
          </div>
        </div>
      </div>

      <div class="mt-1">
        <h3 class="mb-1 text-sm font-semibold text-primary">{{ t("guide.steps.addPoint2.resultTitle") }}</h3>
        <div class="mx-auto guide-callout-region" style="width: 270px; height: 120px; overflow: hidden">
          <div style="width: 700px; transform: scale(0.36); transform-origin: top left">
            <FomChart
              :chart-data="addPointResultRows"
              :columns="sampleColumns"
              :y-axis="selectedYAxis"
              :x-axis="selectedXAxis"
              :group-by="groupBy"
              :y-axis-scale="yAxisScale"
              :show-legend="true"
              :show-median="false"
              :show-trend="false"
              :show-pareto="false"
              :x-axis-numeric="true"
              :group-color-map="groupColorMap"
              :include-custom-in-stats="true"
            />
          </div>
        </div>
        <p class="mx-auto mt-1.5 max-w-120 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.addPoint2.resultCaption") }}</p>
        <p class="mx-auto mt-1 max-w-120 text-center text-[10.5px] leading-snug text-secondary">{{ t("guide.steps.addPoint2.resultBody") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_ADDPOINT2" />
    </section>

    <!-- ============================= PAGE 13 -- Mode 1: pin & annotate ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Annotate')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.annotate.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.annotate.body") }}</p>

      <div class="flex items-start gap-9">
        <!-- Both demo cards stay COLLAPSED here (unlike earlier drafts,
             which pre-expanded R3 to also ring its inner sections) -- an
             expanded card's full content (siblings shortcut, Layer
             Structure, Metrics, Notes) genuinely doesn't fit next to the
             panel's own controls on one page, and squeezing it in via a
             scaled/clipped wrapper repeatedly misplaced those rings against
             content that ends up rendered outside the clipped viewport.
             What's inside an expanded card is instead shown in full, at
             native size, by Fig. 12 on page 13 -- see the note below. -->
        <div ref="annotationsWrap" class="guide-callout-region relative shrink-0" style="width: 280px">
          <AnnotationsPanel
            ref="annotationsPanelRef"
            v-model:open="annotationsOpen"
            v-model:show-only-annotated="showOnlyAnnotated"
            :annotations="annotations"
            :columns="sampleColumns"
            :rows="plottableRows"
            :x-axis="selectedXAxis"
            :y-axis="selectedYAxis"
            :group-by="groupBy"
          />
          <GuideMarkRing v-for="(m, i) in annotationMarks" :key="i" :mark="m" :number="i + 1" />
        </div>
        <div class="flex-1 pt-1">
          <p class="mb-2 text-xs leading-snug text-secondary">{{ t("guide.steps.annotate.figureCaption") }}</p>
          <GuideMarkLegend
            :items="[
              { label: t('guide.steps.annotate.marks.sort.label'), body: t('guide.steps.annotate.marks.sort.body') },
              { label: t('guide.steps.annotate.marks.showOnlyPinned.label'), body: t('guide.steps.annotate.marks.showOnlyPinned.body') },
              { label: t('guide.steps.annotate.marks.compareSelect.label'), body: t('guide.steps.annotate.marks.compareSelect.body') },
              { label: t('guide.steps.annotate.marks.card.label'), body: t('guide.steps.annotate.marks.card.body') },
            ]"
          />
        </div>
      </div>

      <div class="mt-4">
        <p class="mb-1.5 text-sm font-semibold text-primary">{{ t("guide.steps.annotate.expandTitle") }}</p>
        <p class="mb-2 text-xs leading-snug text-secondary">{{ t("guide.steps.annotate.expandIntro") }}</p>
        <div class="grid grid-cols-2 gap-x-5 gap-y-1.5 text-xs">
          <p><strong class="text-primary">{{ t("guide.steps.annotate.marks.siblings.label") }}</strong> — {{ t("guide.steps.annotate.marks.siblings.body") }}</p>
          <p><strong class="text-primary">{{ t("guide.steps.annotate.marks.layerStructure.label") }}</strong> — {{ t("guide.steps.annotate.marks.layerStructure.body") }}</p>
          <p><strong class="text-primary">{{ t("guide.steps.annotate.marks.metrics.label") }}</strong> — {{ t("guide.steps.annotate.marks.metrics.body") }}</p>
          <p><strong class="text-primary">{{ t("guide.steps.annotate.marks.notes.label") }}</strong> — {{ t("guide.steps.annotate.marks.notes.body") }}</p>
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE1_ANNOTATE" />
    </section>

    <!-- ============================= PAGE 14 -- Mode 1: compare pinned points ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1ComparePins')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.comparePins.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.comparePins.body") }}</p>

      <div class="flex items-start gap-6">
        <div class="shrink-0">
          <!-- A genuine render of the multi-pin "Compare" dialog's own output
               (see AnnotationsPanel's exposed getComparePngDataUrl, which
               mirrors CompareDialog's own AnnotationCardData -> ComparePinData
               mapping with every section toggle at its default "on") for the
               two demo pins pinned on page 13 -- not the live dialog itself,
               since Dialog content teleports outside the `.guide-page` tree
               pdfExport.ts captures. -->
          <div class="guide-callout-region" style="width: 300px">
            <img v-if="comparePngUrl" :src="comparePngUrl" class="block w-full" :alt="t('fomcharts.compare.title')" />
          </div>
          <p class="mx-auto mt-2 max-w-75 text-center text-[11px] leading-snug text-secondary">{{ t("guide.steps.comparePins.figureCaption") }}</p>
        </div>

        <div class="flex-1 pt-1">
          <div class="grid grid-cols-1 gap-y-1.5 text-xs">
            <p><strong class="text-primary">{{ t("fomcharts.compare.origin") }}</strong> — {{ t("guide.steps.comparePins.sections.origin") }}</p>
            <p><strong class="text-primary">{{ t("fomcharts.annotations.mode") }}</strong> — {{ t("guide.steps.comparePins.sections.mode") }}</p>
            <p><strong class="text-primary">{{ t("fomcharts.annotations.layerStructure") }}</strong> — {{ t("guide.steps.comparePins.sections.structure") }}</p>
            <p><strong class="text-primary">{{ t("fomcharts.annotations.metrics") }}</strong> — {{ t("guide.steps.comparePins.sections.metrics") }}</p>
            <p><strong class="text-primary">{{ t("fomcharts.annotations.notes") }}</strong> — {{ t("guide.steps.comparePins.sections.notes") }}</p>
          </div>

          <!-- Mark-up toolbar -- a hand-assembled mock (same real Button/
               icon components as CompareDialog's own toolbar) rather than
               the live dialog, same teleport constraint as the comparison
               image above. "Pen" is picked as the active tool so its color
               palette actually renders (see markupActiveTool's own comment). -->
          <div class="mt-3">
            <h3 class="mb-1 text-sm font-semibold text-primary">{{ t("guide.steps.comparePins.markupTitle") }}</h3>
            <p class="mb-2 text-xs leading-snug text-secondary">{{ t("guide.steps.comparePins.markupBody") }}</p>
            <div ref="markupBlockWrap" class="relative flex items-center gap-2.5">
              <div ref="markupToolsWrap" class="inline-flex overflow-hidden rounded-lg border border-secondary/20 bg-card">
                <Button type="button" variant="ghost" size="icon-xs" class="rounded-none text-secondary">
                  <MousePointer2 class="size-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" class="rounded-none bg-primary font-semibold text-primary-foreground hover:bg-primary hover:text-primary-foreground">
                  <Pen class="size-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" class="rounded-none text-secondary">
                  <Eraser class="size-3.5" />
                </Button>
                <Button type="button" variant="ghost" size="icon-xs" class="rounded-none text-secondary">
                  <Rows3 class="size-3.5" />
                </Button>
              </div>
              <div class="flex items-center gap-1.5">
                <button
                  v-for="c in markupPenColors"
                  :key="c"
                  type="button"
                  class="size-4 rounded-full border-2"
                  :class="markupPenColor === c ? 'border-ink' : 'border-transparent'"
                  :style="{ background: c }"
                />
              </div>
              <Button variant="link" size="xs" class="h-auto shrink-0 p-0 text-[10.5px]">
                {{ t("fomcharts.compare.tools.clear") }}
              </Button>
              <GuideMarkRing v-for="(m, i) in comparePinsMarks" :key="i" :mark="m" :number="i + 1" side="top" />
            </div>
            <GuideMarkLegend
              class="mt-2"
              :compact="true"
              :items="[
                { label: t('guide.steps.comparePins.markupMarks.tools.label'), body: t('guide.steps.comparePins.markupMarks.tools.body') },
                { label: t('guide.steps.comparePins.markupMarks.clear.label'), body: t('guide.steps.comparePins.markupMarks.clear.body') },
              ]"
            />
          </div>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.comparePins.note") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_COMPARE_PINS" />
    </section>

    <!-- ============================= PAGE 15 -- Mode 1: export the dataset & chart ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1ExportChart')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.exportChart.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.exportChart.body") }}</p>

      <div class="flex items-start gap-4">
        <div style="width: 320px">
          <!-- A genuine "Export chart image (.png)" render (see the hidden
               generator FomChart instances after the last page, and their
               exposed getPngDataUrl) rather than the live interactive
               component -- grouped by Material Class (a composite column)
               with "Merge multi-category points" on, so a multi-category
               record collapses into one multi-color marker. -->
          <div class="guide-callout-region" style="width: 320px">
            <img v-if="exportChartPngUrl" :src="exportChartPngUrl" class="block w-full" :alt="t('fomcharts.export.png')" />
          </div>
          <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">{{ t("guide.steps.exportChart.chartCaption") }}</p>
        </div>
        <div style="width: 320px">
          <!-- The same merge switch OFF instead, grouped by Base Materials
               (more distinct tokens than Material Class) -- a genuine,
               directly comparable contrast: every token gets its own
               colored marker instead of collapsing into one. -->
          <div class="guide-callout-region" style="width: 320px">
            <img v-if="exportChartPngUrl2" :src="exportChartPngUrl2" class="block w-full" :alt="t('fomcharts.export.png')" />
          </div>
          <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">{{ t("guide.steps.exportChart.chartCaption2") }}</p>
        </div>
      </div>

      <div class="mt-3 flex items-start gap-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <!-- The actual "Merge multi-category points" switch, hand-assembled
             from the same real Switch component and i18n label the live
             control uses (same convention as the toolbar figure on the
             Import page) -- so the paragraph next to it references a
             control the reader can see, not just describe. -->
        <div class="flex shrink-0 items-center gap-2 rounded-[10px] border border-secondary/20 bg-secondary/5 px-2.5 py-2" style="width: 150px">
          <span class="flex-1 text-[10.5px] leading-snug text-ink">{{ t("fomcharts.controls.mergeMultiCategory") }}</span>
          <Switch :model-value="true" />
        </div>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.exportChart.mergeExplain") }}</p>
      </div>

      <div class="mt-3">
        <h3 class="mb-1.5 text-sm font-semibold text-primary">{{ t("guide.steps.exportChart.formatsTitle") }}</h3>
        <ul class="flex flex-col gap-1 text-sm text-ink">
          <li><strong class="font-mono text-ink">{{ t("fomcharts.export.csv") }}</strong> — {{ t("guide.steps.exportChart.formats.csv") }}</li>
          <li><strong class="font-mono text-ink">{{ t("fomcharts.export.xlsx") }}</strong> — {{ t("guide.steps.exportChart.formats.xlsx") }}</li>
          <li><strong class="font-mono text-ink">{{ t("fomcharts.export.png") }}</strong> — {{ t("guide.steps.exportChart.formats.png") }}</li>
        </ul>
      </div>

      <GuideFooter :page="PAGE_MODE1_EXPORT_CHART" />
    </section>

    <!-- ============================= PAGE 16 -- Mode 1: export a pinned point ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1ExportPin')"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.exportPin.title") }}</h2>
      <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.exportPin.body") }}</p>

      <div class="flex items-start gap-4">
        <div>
          <!-- A genuine render of "Export this pin" (see AnnotationsPanel's
               exposed getExportDataUrl) -- the full combined-card export. -->
          <div class="guide-callout-region" style="width: 210px">
            <img v-if="pinExportDataUrl" :src="pinExportDataUrl" class="block w-full" :alt="t('fomcharts.annotations.exportPin')" />
          </div>
          <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">{{ t("guide.steps.exportPin.pinExportCaption") }}</p>
        </div>
        <div>
          <!-- A genuine render of the "Metrics" zoom dialog's own PNG export
               (see AnnotationCard's exposed getMetricsExportDataUrl) --
               numeric fields only, no structure/notes, for when only the
               measurements matter. -->
          <div class="guide-callout-region" style="width: 190px">
            <img v-if="metricsExportDataUrl" :src="metricsExportDataUrl" class="block w-full" :alt="t('fomcharts.annotations.metrics')" />
          </div>
          <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">{{ t("guide.steps.exportPin.metricsExportCaption") }}</p>
        </div>
        <div>
          <!-- A static preview of the "Layer Structure" zoom dialog's
               content -- not the live <Dialog> itself (its content
               teleports outside the `.guide-page` tree, same constraint as
               CompareDialog on the previous pages), but a faithful
               reconstruction feeding the same genuine LayerStack component
               the real dialog renders with R3's actual parsed layers, so
               the materials/thicknesses shown are real data, not a mockup. -->
          <div class="guide-callout-region" style="width: 210px">
            <div class="overflow-hidden rounded-lg border border-secondary/20 bg-white shadow-sm">
              <div class="flex items-center justify-between border-b border-secondary/15 bg-secondary/5 px-2 py-1">
                <span class="text-[10px] font-semibold text-secondary">{{ t("fomcharts.annotations.layerStructure") }}</span>
                <span class="text-[10px] text-muted-foreground">✕</span>
              </div>
              <div class="p-2">
                <p class="mb-1.5 truncate text-[10px]">
                  <span class="font-mono font-bold text-primary">R3</span>
                  <span class="ml-1 text-ink">All-dielectric guided-mode resonance biosensor</span>
                </p>
                <LayerStack :layers="layerPopupLayers" />
              </div>
            </div>
          </div>
          <p class="mt-1.5 text-[10.5px] leading-snug text-secondary">{{ t("guide.steps.exportPin.layerPopupCaption") }}</p>
        </div>
      </div>

      <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.exportPin.layerOrderNote") }}</p>
      </div>

      <div class="mt-3">
        <h3 class="mb-2 text-sm font-semibold text-primary">{{ t("guide.steps.exportPin.pinFormatsTitle") }}</h3>
        <ul class="flex flex-col gap-1.5 text-sm text-ink">
          <li><strong>{{ t("fomcharts.annotations.downloadTxt") }}</strong> — {{ t("guide.steps.exportPin.pinFormats.note") }}</li>
          <li><strong>{{ t("fomcharts.annotations.downloadPng") }}</strong> — {{ t("guide.steps.exportPin.pinFormats.fields") }}</li>
          <li><strong>{{ t("fomcharts.annotations.exportPin") }}</strong> — {{ t("guide.steps.exportPin.pinFormats.all") }}</li>
        </ul>
      </div>

      <GuideFooter :page="PAGE_MODE1_EXPORT_PIN" />
    </section>

    <!-- ============================= PAGE 17 -- Mode 2: section divider ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode2')"
    >
      <GuideHeader />
      <div class="flex flex-1 flex-col items-center justify-center gap-5 text-center">
        <p class="text-xs font-semibold tracking-[0.35em] text-secondary uppercase">{{ t("guide.mode2.eyebrow") }}</p>
        <h2 class="max-w-lg text-3xl font-bold text-ink">{{ t("guide.mode2.title") }}</h2>
        <div class="flex max-w-md items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-2.5 text-left">
          <p class="text-xl">🚧</p>
          <p class="text-xs leading-snug text-ink">
            <strong class="font-semibold">{{ t("guide.mode2.comingSoon.title") }}</strong> — {{ t("guide.mode2.comingSoon.body") }}
          </p>
        </div>
      </div>
      <GuideFooter :page="PAGE_MODE2_DIVIDER" />
    </section>

    <!-- ============================= PAGE 18 -- Mode 2: what's coming ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm]"
      :data-outline-title="`${t('guide.outline.mode2')} — ${t('guide.mode2.preview.title')}`"
    >
      <GuideHeader />
      <p class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode2.eyebrow") }}</p>
      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.mode2.title") }}</h2>

      <div class="mt-3">
        <h3 class="mb-2 text-sm font-semibold">{{ t("guide.mode2.preview.title") }}</h3>
        <div class="grid grid-cols-3 gap-2.5">
          <div class="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p class="mb-0.5 text-xs font-semibold text-ink">{{ t("guide.mode2.preview.rules.title") }}</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.mode2.preview.rules.body") }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p class="mb-0.5 text-xs font-semibold text-ink">{{ t("guide.mode2.preview.columns.title") }}</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.mode2.preview.columns.body") }}</p>
          </div>
          <div class="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p class="mb-0.5 text-xs font-semibold text-ink">{{ t("guide.mode2.preview.validation.title") }}</p>
            <p class="text-[11px] leading-snug text-secondary">{{ t("guide.mode2.preview.validation.body") }}</p>
          </div>
        </div>
      </div>

      <div class="mt-3">
        <div class="mb-1.5 flex items-center gap-2">
          <h3 class="text-sm font-semibold">{{ t("guide.mode2.wireframe.title") }}</h3>
          <span class="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-amber-700 uppercase">
            {{ t("guide.mode2.wireframe.badge") }}
          </span>
        </div>
        <p class="mb-2 text-[11px] leading-snug text-secondary">{{ t("guide.mode2.wireframe.caption") }}</p>

        <!-- Pure wireframe: placeholder bars/blocks standing in for a
             split-screen "source page vs. extracted fields" review UI that
             doesn't exist yet -- deliberately abstract (no real component,
             no invented copy) rather than a fabricated screenshot, and
             explicitly labeled "theoretical" above and in the caption so it
             can never be mistaken for a real feature. -->
        <div class="flex overflow-hidden rounded-xl border border-dashed border-border">
          <div class="flex-1 border-r border-dashed border-border bg-muted/20 p-2.5">
            <div class="mb-1.5 h-2 w-2/3 rounded-full bg-secondary/25" />
            <div class="mb-1 h-1.5 w-full rounded-full bg-secondary/15" />
            <div class="mb-1 h-1.5 w-full rounded-full bg-secondary/15" />
            <div class="mb-1 h-1.5 w-5/6 rounded-full bg-secondary/15" />
            <div class="mb-1.5 h-7 w-full rounded-md border border-dashed border-primary/50 bg-primary/8" />
            <div class="mb-1 h-1.5 w-full rounded-full bg-secondary/15" />
            <div class="h-1.5 w-4/5 rounded-full bg-secondary/15" />
          </div>
          <div class="flex-1 bg-white p-2.5">
            <div class="mb-2 h-2 w-1/2 rounded-full bg-secondary/25" />
            <div v-for="i in 3" :key="i" class="mb-1 flex items-center gap-1.5">
              <div class="h-1.5 w-1/3 rounded-full bg-secondary/15" />
              <div class="h-3.5 flex-1 rounded-md border border-secondary/20 bg-muted/20" />
            </div>
            <div class="mt-2 flex gap-1.5">
              <div class="h-4.5 w-14 rounded-md bg-primary/20" />
              <div class="h-4.5 w-14 rounded-md border border-secondary/20" />
            </div>
          </div>
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE2" />
    </section>

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
import { computed, h, nextTick, onMounted, ref, useTemplateRef, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Check,
  ChevronDown,
  Columns3,
  Construction,
  Download,
  Eraser,
  FileImage,
  Filter,
  Info,
  LayoutGrid,
  Layers,
  LineChart,
  MousePointer2,
  Pen,
  Pin,
  PlusCircle,
  RotateCcw,
  Rows3,
  SlidersHorizontal,
  Table2,
  Target,
  Upload,
  Users,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TooltipProvider } from "@/components/ui/tooltip";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import AnnotationsPanel, { type Annotation } from "@/components/visualization/AnnotationsPanel.vue";
import LayerStack from "@/components/visualization/LayerStack.vue";
import DataPointsTable from "@/components/visualization/DataPointsTable.vue";
import AddPointField from "@/components/visualization/AddPointField.vue";
import MaterialsTagsField from "@/components/visualization/MaterialsTagsField.vue";
import LayerStructureField from "@/components/visualization/LayerStructureField.vue";
import PointShapeField from "@/components/visualization/PointShapeField.vue";
import UnitConverterPopover from "@/components/visualization/UnitConverterPopover.vue";
import { filterPlottable, type TrendType } from "@/utils/stats";
import { assignGroupColors } from "@/utils/palette";
import { parseLayerStructure, formatLayerStructure, type StructureLayer } from "@/utils/layerStructure";
import {
  detectColumnTypes,
  findDomainColumn,
  findOriginColumn,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findModeIdColumn,
  findReviewStatusColumn,
  isNeedsReviewRow,
  distinctValues,
  tokenizedDistinctValues,
  tokenizeValue,
  groupableColumns,
  buildManualPointFields,
  materialsByClass,
  formatUnitSuperscripts,
  MANUAL_ROW_FLAG,
  type DataRow,
  type PointShape,
  type ManualPointField,
} from "@/utils/columnTypes";
import logoUrl from "@/assets/logo.svg";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
import yonseiOptica from "@/assets/yonsei-optica.svg";
import { findByText, findByAttr, markRect, markRow, markLabel, markUnion, markCanvasRect, type GuideMark } from "./guideAnnotate";

const { t, locale } = useI18n();

// Kept as a plain constant (rather than importing package.json, which sits
// outside the tsconfig `src` root) -- bump alongside real app releases.
const appVersion = "1.0.0";
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

// Fixed page numbers -- referenced both in each page's own footer and by
// the clickable table of contents (see tocEntries + data-toc-target below,
// resolved into real PDF link annotations by pdfExport.ts).
const PAGE_INTRO = 2;
const PAGE_TOC = 3;
const PAGE_MODE1_DIVIDER = 4;
const PAGE_MODE1_IMPORT = 5;
const PAGE_MODE1_CONTROLS = 6;
const PAGE_MODE1_FILTERS = 7;
const PAGE_MODE1_READING = 8;
const PAGE_MODE1_COMPARE = 9;
const PAGE_MODE1_DATATABLE = 10;
const PAGE_MODE1_ADDPOINT1 = 11;
const PAGE_MODE1_ADDPOINT2 = 12;
const PAGE_MODE1_ANNOTATE = 13;
const PAGE_MODE1_COMPARE_PINS = 14;
const PAGE_MODE1_EXPORT_CHART = 15;
const PAGE_MODE1_EXPORT_PIN = 16;
const PAGE_MODE2_DIVIDER = 17;
const PAGE_MODE2 = 18;
const TOTAL_PAGES = 18;

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

const mode1DividerOutlineTitle = computed(() => `${t("guide.mode1.eyebrow")} — ${t("guide.mode1.title")}`);

const tocEntries = computed(() => [
  { label: tocLabel(t("guide.outline.intro")), page: PAGE_INTRO, icon: Info, group: "front" as const },
  { label: tocLabel(t("guide.outline.mode1Import")), page: PAGE_MODE1_IMPORT, icon: Upload, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Controls")), page: PAGE_MODE1_CONTROLS, icon: SlidersHorizontal, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Filters")), page: PAGE_MODE1_FILTERS, icon: Filter, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Reading")), page: PAGE_MODE1_READING, icon: LineChart, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Compare")), page: PAGE_MODE1_COMPARE, icon: Users, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1DataTable")), page: PAGE_MODE1_DATATABLE, icon: Table2, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1AddPoint1")), page: PAGE_MODE1_ADDPOINT1, icon: PlusCircle, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1AddPoint2")), page: PAGE_MODE1_ADDPOINT2, icon: Layers, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Annotate")), page: PAGE_MODE1_ANNOTATE, icon: Pin, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1ComparePins")), page: PAGE_MODE1_COMPARE_PINS, icon: Columns3, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1ExportChart")), page: PAGE_MODE1_EXPORT_CHART, icon: Download, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1ExportPin")), page: PAGE_MODE1_EXPORT_PIN, icon: FileImage, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode2")), page: PAGE_MODE2, icon: Construction, group: "back" as const },
]);

// Mode 1's own divider page (below) previews exactly these entries -- reusing
// tocEntries rather than a second hand-maintained list keeps the two in sync
// automatically if a Mode 1 step is ever added, renamed or reordered.
const mode1TocEntries = computed(() => tocEntries.value.filter((e) => e.group === "mode1"));

// ---------------------------------------------------------------------
// Worked example dataset (Mode 1 only) -- six ALL-DIELECTRIC photonic
// resonator sensor designs (the platform this tool's actual users mostly
// work with -- no metal/plasmonic devices), each reported once
// experimentally (EXP) and once from simulation (SIM). FOM (Sensitivity /
// FWHM, the standard RI-sensor figure of merit) is a real computed column
// here rather than left out, so the guide's chart actually plots FOM by
// default and the bubble-size-by-FOM behavior (see FomChart's
// bubbleSizeFor) isn't silently untested. Column names follow the same
// conventions the real app's column detectors (utils/columnTypes.ts) look
// for, so every real component mounted below behaves exactly as it would
// on a real uploaded file, not a hand-faked illustration.
// ---------------------------------------------------------------------
const sampleColumns = [
  "Ref",
  "Title",
  "Domain",
  "Origin",
  "Material Class",
  "Base Materials",
  "Mode ID",
  "Resonance Wavelength (nm)",
  "Q-factor",
  "FOM (RIU^-1)",
  "Sensitivity (nm/RIU)",
  "FWHM (nm)",
  "Layer Structure",
  "Review status",
  "Notes",
];

// "Approve (AI)" (not bare "Approve") matches backend/prompt.txt's Review
// status vocabulary exactly, since this dataset models what that extractor
// would actually hand back to a researcher.
// Domain defaults to "Wavelength" for every row -- every design in this
// worked example genuinely is a wavelength-domain sensor, so unlike Origin
// (deliberately split EXP/SIM) there's no reason to invent a fictitious
// frequency-domain record just to pad out the Domain filter's checklist.
function sampleRow(data: Record<string, unknown>): DataRow {
  return { "Mode ID": 1, Domain: "Wavelength", "Review status": "Approve (AI)", Notes: "", ...data };
}

// Layer Structure here follows backend/prompt.txt's own rules: "+"-joined
// bare material names (thickness in parentheses only where stated),
// standard chemical formulas in Base Materials (Si3N4, not SiN; PMMA, not
// the category name "Polymer"), and inert substrates (glass, quartz) never
// appear at all -- rule 3 strictly excludes them, so a genuine extraction
// from this backend would never produce one either.
const sampleRows: DataRow[] = [
  sampleRow({ Ref: "R1", Title: "High-Q silicon microring resonator RI sensor", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Si;SiO2", "Resonance Wavelength (nm)": 1550, "Q-factor": 42000, "FOM (RIU^-1)": 1757, "Sensitivity (nm/RIU)": 65, "FWHM (nm)": 0.037, "Layer Structure": "Si + SiO2" }),
  sampleRow({ Ref: "R1", Title: "High-Q silicon microring resonator RI sensor", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Si;SiO2", "Resonance Wavelength (nm)": 1550, "Q-factor": 51000, "FOM (RIU^-1)": 2333, "Sensitivity (nm/RIU)": 70, "FWHM (nm)": 0.03, "Layer Structure": "Si + SiO2" }),
  sampleRow({ Ref: "R2", Title: "Silicon-nitride ring resonator for biosensing", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Si3N4;SiO2", "Resonance Wavelength (nm)": 1310, "Q-factor": 88000, "FOM (RIU^-1)": 2667, "Sensitivity (nm/RIU)": 40, "FWHM (nm)": 0.015, "Layer Structure": "Si3N4 + SiO2" }),
  sampleRow({ Ref: "R2", Title: "Silicon-nitride ring resonator for biosensing", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Si3N4;SiO2", "Resonance Wavelength (nm)": 1310, "Q-factor": 96000, "FOM (RIU^-1)": 3214, "Sensitivity (nm/RIU)": 45, "FWHM (nm)": 0.014, "Layer Structure": "Si3N4 + SiO2" }),
  sampleRow({ Ref: "R3", Title: "All-dielectric guided-mode resonance biosensor", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Si3N4;SiO2;Ta2O5", "Resonance Wavelength (nm)": 850, "Q-factor": 15000, "FOM (RIU^-1)": 3158, "Sensitivity (nm/RIU)": 180, "FWHM (nm)": 0.057, "Layer Structure": "Si3N4(200nm) + SiO2(400nm) + Ta2O5(120nm)", "Review status": "Edit", Notes: "FWHM digitized from a log-scale transmission plot -- flagged for review." }),
  sampleRow({ Ref: "R3", Title: "All-dielectric guided-mode resonance biosensor", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Si3N4;SiO2;Ta2O5", "Resonance Wavelength (nm)": 850, "Q-factor": 18000, "FOM (RIU^-1)": 4043, "Sensitivity (nm/RIU)": 190, "FWHM (nm)": 0.047, "Layer Structure": "Si3N4(200nm) + SiO2(400nm) + Ta2O5(120nm)" }),
  sampleRow({ Ref: "R4", Title: "All-dielectric silicon disk resonator on a Bragg mirror", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Si;SiO2;Ta2O5", "Resonance Wavelength (nm)": 1064, "Q-factor": 5200, "FOM (RIU^-1)": 1050, "Sensitivity (nm/RIU)": 210, "FWHM (nm)": 0.2, "Layer Structure": "Si(300nm) + SiO2(200nm) + Ta2O5(150nm) + SiO2(200nm) + Ta2O5(150nm)" }),
  sampleRow({ Ref: "R4", Title: "All-dielectric silicon disk resonator on a Bragg mirror", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Si;SiO2;Ta2O5", "Resonance Wavelength (nm)": 1064, "Q-factor": 6100, "FOM (RIU^-1)": 1353, "Sensitivity (nm/RIU)": 230, "FWHM (nm)": 0.17, "Layer Structure": "Si(300nm) + SiO2(200nm) + Ta2O5(150nm) + SiO2(200nm) + Ta2O5(150nm)" }),
  sampleRow({ Ref: "R5", Title: "InP Mach-Zehnder interferometer sensor", Origin: "EXP", "Material Class": "Dielectric;Semiconductor", "Base Materials": "InP;SiO2", "Resonance Wavelength (nm)": 1550, "Q-factor": 1200, "FOM (RIU^-1)": 138, "Sensitivity (nm/RIU)": 180, "FWHM (nm)": 1.3, "Layer Structure": "InP + SiO2" }),
  sampleRow({ Ref: "R5", Title: "InP Mach-Zehnder interferometer sensor", Origin: "SIM", "Material Class": "Dielectric;Semiconductor", "Base Materials": "InP;SiO2", "Resonance Wavelength (nm)": 1550, "Q-factor": 1500, "FOM (RIU^-1)": 190, "Sensitivity (nm/RIU)": 190, "FWHM (nm)": 1.0, "Layer Structure": "InP + SiO2" }),
  sampleRow({ Ref: "R6", Title: "Polymer microring resonator for label-free detection", Origin: "EXP", "Material Class": "Dielectric;Polymer", "Base Materials": "PMMA;SiO2", "Resonance Wavelength (nm)": 1300, "Q-factor": 2600, "FOM (RIU^-1)": 190, "Sensitivity (nm/RIU)": 95, "FWHM (nm)": 0.5, "Layer Structure": "PMMA + SiO2" }),
  sampleRow({ Ref: "R6", Title: "Polymer microring resonator for label-free detection", Origin: "SIM", "Material Class": "Dielectric;Polymer", "Base Materials": "PMMA;SiO2", "Resonance Wavelength (nm)": 1300, "Q-factor": 3100, "FOM (RIU^-1)": 238, "Sensitivity (nm/RIU)": 100, "FWHM (nm)": 0.42, "Layer Structure": "PMMA + SiO2" }),
];

const columnTypes = detectColumnTypes(sampleRows, sampleColumns);
const numericColumns = columnTypes.numeric;
const categoricalColumns = columnTypes.categorical;

const domainColumn = findDomainColumn(sampleColumns);
const originColumn = findOriginColumn(sampleColumns);
const materialClassColumn = findMaterialClassColumn(sampleColumns);
const baseMaterialsColumn = findBaseMaterialsColumn(sampleColumns);
const modeIdColumn = findModeIdColumn(sampleColumns);
// Same detector VisualizationView uses for the chart's dashed-outline
// "needs review" marker and the Filters section's "Hide needs-review"
// switch -- R3/EXP's "Edit" status (the same row already flagged on the
// Reading page) is what lights this up for real, not a hand-picked count.
const reviewStatusColumn = findReviewStatusColumn(sampleColumns);
const needsReviewCount = sampleRows.filter((r) => isNeedsReviewRow(r, reviewStatusColumn)).length;
const compositeColumns = [materialClassColumn, baseMaterialsColumn].filter((c): c is string => !!c);
const xAxisCategoricalColumns = categoricalColumns.filter((c) => c !== originColumn && !compositeColumns.includes(c));

const domainValues = domainColumn ? distinctValues(sampleRows, domainColumn) : [];
const originValues = originColumn ? distinctValues(sampleRows, originColumn) : [];
const materialClassValues = materialClassColumn ? tokenizedDistinctValues(sampleRows, materialClassColumn) : [];
const baseMaterialsValues = baseMaterialsColumn ? tokenizedDistinctValues(sampleRows, baseMaterialsColumn) : [];

function countTokensBy(column: string | null, rows: DataRow[]): Record<string, number> {
  if (!column) return {};
  const counts: Record<string, number> = {};
  for (const row of rows) {
    for (const tok of tokenizeValue(row[column])) counts[tok] = (counts[tok] ?? 0) + 1;
  }
  return counts;
}
const domainCounts = countTokensBy(domainColumn, sampleRows);
const originCounts = countTokensBy(originColumn, sampleRows);
const materialClassCounts = countTokensBy(materialClassColumn, sampleRows);
const baseMaterialsCounts = countTokensBy(baseMaterialsColumn, sampleRows);

const groupByExemptColumns = [...compositeColumns, modeIdColumn].filter((c): c is string => !!c);
const groupByColumns = groupableColumns(sampleRows, categoricalColumns, groupByExemptColumns);

// Fixed illustrative chart configuration -- FOM (log scale) against
// resonance wavelength, colored by Origin (EXP vs SIM), median line on.
const selectedYAxis = ref<string | null>("FOM (RIU^-1)");
const selectedXAxis = ref<string | null>("Resonance Wavelength (nm)");
const groupBy = ref<string | null>(originColumn);
const yAxisScale = ref<"log" | "value">("log");
const chartTitle = ref("");
const showLegend = ref(true);
const showMedian = ref(true);
// On (Auto-fit) rather than off -- unlike Pareto below, the trend line now
// has its own curve-type picker (see trendType) that only ever renders once
// this is true, so leaving it off would mean the guide's own screenshot
// never shows the control it's documenting.
const showTrend = ref(true);
const trendType = ref<TrendType | "auto">("auto");
const showPareto = ref(false);
const highlightGroup = ref<string | null>(null);
const compositeFilterMode = ref<"strict" | "lenient">("lenient");
const excludeNeedsReview = ref(false);
// Sensitivity, not Q-factor or FWHM -- neither current axis (FOM vs.
// resonance wavelength), so bubble size adds a genuine third dimension
// instead of restating one of the two already-plotted columns.
const pointSizeMode = ref<"constant" | "byValue">("byValue");
const pointSizeBy = ref<string | null>("Sensitivity (nm/RIU)");
const pointSize = ref(16);
const selectedDomains = ref<string[]>([...domainValues]);
const selectedOrigins = ref<string[]>([...originValues]);
const selectedMaterialClasses = ref<string[]>([...materialClassValues]);
const selectedBaseMaterials = ref<string[]>([...baseMaterialsValues]);

// Page 12's export figures only -- a title, like every axis name in this
// sample dataset, is exactly what a researcher would type/see regardless of
// the guide's own language, so it stays a plain literal rather than an
// i18n key (see the axis names/EXP/SIM literals above).
const exportChartTitle = "FOM by Material Class";
const exportChartTitle2 = "FOM by Base Material";

const groupColorMap = computed<Record<string, string>>(() => (originColumn ? assignGroupColors(originValues) : {}));
const materialClassColorMap = computed<Record<string, string>>(() => (materialClassColumn ? assignGroupColors(materialClassValues) : {}));
const baseMaterialsColorMap = computed<Record<string, string>>(() => (baseMaterialsColumn ? assignGroupColors(baseMaterialsValues) : {}));
const plottableRows = computed(() => filterPlottable(filterPlottable(sampleRows, selectedYAxis.value), selectedXAxis.value));

// Page 13's Layer Structure popup preview -- R3's real parsed layers (see
// parseLayerStructure), not hand-typed values, so the popup mockup shows
// genuine data and the same top-to-bottom (incident-light-first) ordering
// the real dialog would.
const layerPopupLayers = parseLayerStructure(sampleRows[4]["Layer Structure"]);

const statsOpen = ref(true);
const annotationsOpen = ref(true);
const showOnlyAnnotated = ref(false);
const annotations = ref<Annotation[]>([
  {
    id: "demo-r3-exp",
    ref: "R3",
    title: "All-dielectric guided-mode resonance biosensor",
    row: sampleRows[4],
    note: "FWHM digitized from a log-scale transmission plot -- flagged for review.",
    createdAt: Date.now() - 60_000,
  },
  {
    id: "demo-r1-sim",
    ref: "R1",
    title: "High-Q silicon microring resonator RI sensor",
    row: sampleRows[1],
    note: "",
    createdAt: Date.now(),
  },
]);

// ---------------------------------------------------------------------
// Page 10 (Data points table) -- reuses the same two rows already pinned as
// demo annotations above (R3/EXP, R1/SIM) as this list's own "Pinned" group,
// plus one further row (R6/SIM) hidden HERE ONLY (a separate array, not a
// filter on sampleRows itself) so every other page's chart keeps plotting
// all twelve points regardless of what this one page demonstrates.
// ---------------------------------------------------------------------
const dataTableHiddenRow = sampleRows[11]; // R6, SIM
const dataTableVisibleRows = plottableRows.value.filter((r) => r !== dataTableHiddenRow);
const dataTablePinnedRows = [sampleRows[4], sampleRows[1]]; // R3/EXP, R1/SIM -- same two as the annotations demo above
const dataTableOpen = ref(true);
const includeManualInStats = ref(true);

// ---------------------------------------------------------------------
// Pages 11-12 (Add a point manually) -- a realistic, fully filled-in "M1"
// design (a Si3N4/SiO2 ring with thicker cladding than R2/R3) rather than an
// empty form, so every real field component below (AddPointField,
// MaterialsTagsField, LayerStructureField, PointShapeField) has something
// genuine to render. Wavelength/FWHM are picked so Q = λ/FWHM lands on an
// exact round number (1550 / 0.031 = 50000), matching AddPointDialog's own
// calcQFactor formula/rounding -- see addPointComputedQFactor below.
// ---------------------------------------------------------------------
const addPointFields = buildManualPointFields(sampleColumns, sampleRows, selectedXAxis.value, selectedYAxis.value, numericColumns);
const addPointRequiredFields = addPointFields.filter((f) => f.required);
const addPointDomainField = addPointFields.find((f) => f.labelKey === "domain") ?? null;
const addPointOriginField = addPointFields.find((f) => f.labelKey === "origin") ?? null;
const addPointMetricFields = addPointFields.filter((f) => !f.required && f.kind === "numeric" && f.labelKey !== "modeId");
const addPointPlainMetricFields = addPointMetricFields.filter((f) => f.labelKey !== "qFactor");
const addPointQFactorField = addPointMetricFields.find((f) => f.labelKey === "qFactor") ?? null;
const addPointWavelengthField = addPointFields.find((f) => f.column === selectedXAxis.value) ?? null;
const addPointBaseMaterialsField = addPointFields.find((f) => f.labelKey === "baseMaterials") ?? null;
const addPointMaterialClassField = addPointFields.find((f) => f.labelKey === "materialClass") ?? null;
const addPointLayerField = addPointFields.find((f) => f.labelKey === "layerStructure") ?? null;

// Step indicator icons -- same four as AddPointDialog's own `steps` computed
// (Target/Layers/LayoutGrid/Check), named WHAT each step covers rather than
// a done/undone trail (see that component's own comment).
const addPointSteps = computed(() => [
  { key: 1, label: t("fomcharts.addPoint.steps.essentials"), icon: Target },
  { key: 2, label: t("fomcharts.addPoint.steps.metrics"), icon: Layers },
  { key: 3, label: t("fomcharts.addPoint.steps.structure"), icon: LayoutGrid },
  { key: 4, label: t("fomcharts.addPoint.steps.finish"), icon: Check },
]);

// Same fallback AddPointDialog's own fieldLabel uses: labelKey is left
// undefined whenever a field is the current chart's X/Y axis (see
// buildManualPointFields), so its label is that column's own name instead.
function addPointFieldLabel(field: ManualPointField): string {
  return field.labelKey ? t(`fomcharts.addPoint.fields.${field.labelKey}`) : formatUnitSuperscripts(field.column);
}

const addPointLabel = "Si3N4 ring, thicker cladding";
const addPointShape = ref<PointShape>("diamond");
const addPointNotes = "Design variant of R2, not yet fabricated.";
const unitConverterOpen = ref(false);
const addPointValues = ref<Record<string, string>>({
  ...(selectedYAxis.value ? { [selectedYAxis.value]: "2900" } : {}),
  ...(selectedXAxis.value ? { [selectedXAxis.value]: "1550" } : {}),
  "Sensitivity (nm/RIU)": "85",
  "FWHM (nm)": "0.031",
  // Q-factor's locked display (see AddPointField) renders modelValue, not
  // computedValue, directly -- the real dialog keeps the two in sync via a
  // watcher on computedQFactor; this guide seeds the same result once
  // instead, since nothing here ever changes after mount.
  "Q-factor": "50000",
  Domain: "Wavelength",
  Origin: "SIM",
});
// Q = λ / FWHM, rounded the same way AddPointDialog's own calcQFactor does
// (whole number once >= 100) -- kept as a computed, not a literal, so it's
// a genuine live result of the two values above rather than a hand-typed
// number that could silently drift out of sync with them.
const addPointComputedQFactor = computed<number | null>(() => {
  if (!addPointWavelengthField) return null;
  const lambda = Number(addPointValues.value[addPointWavelengthField.column]);
  const fwhm = Number(addPointValues.value["FWHM (nm)"]);
  if (!isFinite(lambda) || !isFinite(fwhm) || fwhm <= 0) return null;
  const q = lambda / fwhm;
  return q >= 100 ? Math.round(q) : Math.round(q * 100) / 100;
});
const addPointTags = ref<Record<string, string[]>>({
  "Base Materials": ["Si3N4", "SiO2"],
  "Material Class": ["Dielectric"],
});
const addPointLayers = ref<StructureLayer[]>([
  { material: "Si3N4", thicknessNm: 220 },
  { material: "SiO2", thicknessNm: 500 },
]);
// A short, curated list rather than every Base Materials token across the
// whole 12-row dataset (6 distinct) -- keeps this checklist's rendered
// height well under its cap on a page already tight on vertical room.
const addPointBaseMaterialsOptions = ["Si3N4", "SiO2", "Ta2O5"];
// Same "(preview: Au, SiO2, …)" hint AddPointDialog's own materialClassHints
// computes, next to each Material Class option -- learned from what this
// dataset actually pairs together (see materialsByClass), not a hardcoded
// taxonomy.
const MATERIAL_CLASS_PREVIEW_COUNT = 3;
const addPointMaterialClassHints: Record<string, string> = {};
for (const [cls, materials] of Object.entries(materialsByClass(sampleRows, materialClassColumn, baseMaterialsColumn))) {
  if (materials.length === 0) continue;
  const preview = materials.slice(0, MATERIAL_CLASS_PREVIEW_COUNT).join(", ");
  addPointMaterialClassHints[cls] = materials.length > MATERIAL_CLASS_PREVIEW_COUNT ? `${preview}…` : preview;
}

// Page 12's "the result" figure -- the M1 design above as an actual row,
// flagged MANUAL_ROW_FLAG so FomChart draws it exactly as a real manually
// added point would (gold-outlined diamond, counted in "N added manually").
// Appended to a COPY of sampleRows, not sampleRows itself, so every other
// page's chart keeps plotting only the twelve literature points.
const addPointResultRow: DataRow = {
  Ref: "M1",
  Title: addPointLabel,
  Domain: "Wavelength",
  Origin: "SIM",
  "Material Class": addPointTags.value["Material Class"].join(";"),
  "Base Materials": addPointTags.value["Base Materials"].join(";"),
  "Resonance Wavelength (nm)": 1550,
  "Q-factor": 50000,
  "FOM (RIU^-1)": 2900,
  "Sensitivity (nm/RIU)": 85,
  "FWHM (nm)": 0.031,
  "Layer Structure": formatLayerStructure(addPointLayers.value),
  "Review status": "Approve (AI)",
  Notes: addPointNotes,
  [MANUAL_ROW_FLAG]: true,
};
const addPointResultRows: DataRow[] = [...sampleRows, addPointResultRow];

// Guide-only: page 12's "full point export" example -- a genuine render of
// "Export this pin" for the R3 (guided-mode resonance) demo annotation,
// fetched from AnnotationsPanel's exposed getExportDataUrl once it's
// mounted (see onMounted below) rather than faked.
const pinExportDataUrl = ref<string | null>(null);

// Guide-only: page 12's "Metrics" zoom-dialog export example -- a genuine
// render of the same numeric-fields-only PNG the real Metrics zoom dialog's
// "Download PNG" button produces (see AnnotationCard's exposed
// getMetricsExportDataUrl), for the same R3 demo annotation.
const metricsExportDataUrl = ref<string | null>(null);

// Guide-only: page 10's "Compare (2)" example -- a genuine render of the same
// multi-pin comparison the live app's CompareDialog produces (see
// AnnotationsPanel's exposed getComparePngDataUrl), fetched once mounted
// (see onMounted below) for the same demo-r3-exp/demo-r1-sim pins pinned on
// the previous page.
const comparePngUrl = ref<string | null>(null);

// Page 14's hand-assembled markup toolbar mock -- "Pen" is the one styled
// active in the template below (rather than the default "View"), so its
// 3-color palette actually renders, since the palette only ever shows while
// a pen is active (see CompareDialog's own v-if="activeTool === 'pen'").
const markupPenColors = ["#ffca28", "#ff8a65", "#f06292"];
const markupPenColor = markupPenColors[0];

// Guide-only: page 11's chart image export examples -- genuine
// "Export chart image (.png)" renders from the hidden generator FomChart
// instances below the last page (see their exposed getPngDataUrl), fetched
// once mounted (see onMounted below) rather than showing the live component.
const exportChartGenRef = useTemplateRef<InstanceType<typeof FomChart>>("exportChartGenRef");
const exportChartPngUrl = ref<string | null>(null);
const exportChartGenRef2 = useTemplateRef<InstanceType<typeof FomChart>>("exportChartGenRef2");
const exportChartPngUrl2 = ref<string | null>(null);

// -----------------------------------------------------------------------
// Callout rings -- every mark below is measured from the real rendered DOM
// (see guideAnnotate.ts) rather than a hardcoded pixel guess, so a ring
// can't silently drift out of place if a component's copy or layout
// changes later.
// -----------------------------------------------------------------------
const toolbarWrap = useTemplateRef<HTMLDivElement>("toolbarWrap");
const chartControlsWrap = useTemplateRef<HTMLDivElement>("chartControlsWrap");
const displayControlsWrap = useTemplateRef<HTMLDivElement>("displayControlsWrap");
const filtersWrap = useTemplateRef<HTMLDivElement>("filtersWrap");
const statsWrap = useTemplateRef<HTMLDivElement>("statsWrap");
const dataTableWrap = useTemplateRef<HTMLDivElement>("dataTableWrap");
const annotationsWrap = useTemplateRef<HTMLDivElement>("annotationsWrap");
const readingWrap = useTemplateRef<HTMLDivElement>("readingWrap");
const readingChartRef = useTemplateRef<InstanceType<typeof FomChart>>("readingChartRef");
const annotationsPanelRef = useTemplateRef<InstanceType<typeof AnnotationsPanel>>("annotationsPanelRef");

// Page 11 (Essentials/Metrics) and page 12 (Structure) group each real field
// under its own plain ref, rather than the text-search lookups other pages
// use for pre-existing components -- this exact markup is written below in
// this same file, so a direct ref is simpler and just as robust here. Each
// page's own outer wrap is both the markRect container AND what hosts that
// page's GuideMarkRing overlay, same convention as every other page.
const addPoint1Wrap = useTemplateRef<HTMLDivElement>("addPoint1Wrap");
const addPointLabelWrap = useTemplateRef<HTMLDivElement>("addPointLabelWrap");
const addPointAxesWrap = useTemplateRef<HTMLDivElement>("addPointAxesWrap");
const addPointDomainOriginWrap = useTemplateRef<HTMLDivElement>("addPointDomainOriginWrap");
const addPointShapeWrap = useTemplateRef<HTMLDivElement>("addPointShapeWrap");
const addPointMetricsWrap = useTemplateRef<HTMLDivElement>("addPointMetricsWrap");
const addPointQFactorWrap = useTemplateRef<HTMLDivElement>("addPointQFactorWrap");
const addPoint2Wrap = useTemplateRef<HTMLDivElement>("addPoint2Wrap");
const addPointNode1Wrap = useTemplateRef<HTMLDivElement>("addPointNode1Wrap");
const addPointNode2Wrap = useTemplateRef<HTMLDivElement>("addPointNode2Wrap");
const addPointNode3Wrap = useTemplateRef<HTMLDivElement>("addPointNode3Wrap");
const markupBlockWrap = useTemplateRef<HTMLDivElement>("markupBlockWrap");
const markupToolsWrap = useTemplateRef<HTMLDivElement>("markupToolsWrap");

const toolbarMarks = ref<GuideMark[]>([]);
const chartMarks = ref<GuideMark[]>([]);
const displayMarks = ref<GuideMark[]>([]);
const filterMarks = ref<GuideMark[]>([]);
const statsMarks = ref<GuideMark[]>([]);
const dataTableMarks = ref<GuideMark[]>([]);
const addPoint1Marks = ref<GuideMark[]>([]);
const addPoint2Marks = ref<GuideMark[]>([]);
const annotationMarks = ref<GuideMark[]>([]);
const comparePinsMarks = ref<GuideMark[]>([]);

// Badges are real DOM (measured the normal way, via FomChart's exposed
// getBadgesRow); the legend and median line are pixels ECharts draws
// straight onto its canvas, so FomChart exposes their live layout instead
// (see getLegendRect/getMedianLineRect) and markCanvasRect converts that
// into a ring relative to this figure. All three used to be a fixed pixel
// guess -- the median line's extent shifts with the plotted data and with
// the x-axis name's length (a much longer translated name grows the grid's
// right margin), so a hardcoded box drifted out of ring in some locales.
// Populated once in onMounted below.
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
  const button = root ? Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.trim() === title) : undefined;
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
const settle = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

// Every ring, measurement and captured PNG below is derived from rendered,
// translated text -- correct only for whatever locale was active the moment
// this ran. GuideTemplate is mounted once for the app's whole session (see
// HomeView.vue), so a user switching language later via the app's own
// switcher does NOT remount it -- without re-running this after `locale`
// changes (see the watcher below), every ring and PNG would silently keep
// showing the language active at first mount instead of the current one.
async function captureGuideArtifacts() {
  await nextTick();

  openSection(displayControlsWrap.value, t("fomcharts.sections.display"));
  openSection(filtersWrap.value, t("fomcharts.sections.filters"));
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
    annotationMarks,
    comparePinsMarks,
    readingMarks,
  ]) {
    marks.value = [];
  }

  const push = (arr: typeof toolbarMarks, mark: GuideMark | null) => {
    if (mark) arr.value.push(mark);
  };

  // Toolbar: Import / Export / Reset buttons.
  if (toolbarWrap.value) {
    const c = toolbarWrap.value;
    [t("actions.import"), t("actions.export"), t("fomcharts.workspace.reset")].forEach((label) => {
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
  if (chartControlsWrap.value) {
    const c = chartControlsWrap.value;
    push(chartMarks, markLabel(c, t("fomcharts.controls.title")));
    const yBtn = findByAttr(c, "button", "aria-label", t("fomcharts.controls.editAxis", { axis: t("fomcharts.controls.yAxis") }));
    const xBtn = findByAttr(c, "button", "aria-label", t("fomcharts.controls.editAxis", { axis: t("fomcharts.controls.xAxis") }));
    const swapBtn = findByAttr(c, "button", "aria-label", t("fomcharts.controls.swapAxes"));
    push(chartMarks, markUnion(c, [yBtn, xBtn, swapBtn]));
  }

  // Display section: scale / trend line / pareto / legend / median / point
  // size -- in the same top-to-bottom order GraphControls.vue actually
  // renders them. Curve type (only shown once Trend line is on, which it
  // now always is here) is explained in the Trend line row's own legend
  // text rather than getting a separate ring. Point size similarly rings
  // its WHOLE block (the size-by-value toggle, the measurement picker, and
  // the slider together, all one shared wrapper) as a single numbered
  // callout instead of three -- this fixed-height A4 page has no room for
  // that many extra rows.
  if (displayControlsWrap.value) {
    const c = displayControlsWrap.value;
    [
      t("fomcharts.scale.label"),
      t("fomcharts.controls.trendLine"),
      t("fomcharts.controls.pareto"),
      t("fomcharts.legend.toggle"),
      t("fomcharts.medianLine.toggle"),
    ].forEach((label) => {
      push(displayMarks, markRow(c, label));
    });
    const sizeToggleLabel = findByText(c, "span", t("fomcharts.controls.pointSizeByValue"));
    const sizeBlock = sizeToggleLabel?.parentElement?.parentElement as HTMLElement | null;
    push(displayMarks, sizeBlock ? markRect(c, sizeBlock, 4) : null);
  }

  // Filters section: Hide needs-review, Domain, Origin, Material Class /
  // Base Materials dropdown buttons, exclusion mode -- in the same
  // top-to-bottom order the section actually renders them in (see
  // GraphControls.vue), so the numbered rings stay in sync. Each category
  // is now a closed-by-default FilterDropdown button (real DOM, boxed the
  // same way the toolbar's own buttons are), not the old always-expanded
  // chip grid markFilterBlock was written for.
  if (filtersWrap.value) {
    const c = filtersWrap.value;
    push(filterMarks, markRow(c, t("fomcharts.filters.excludeNeedsReview", { count: needsReviewCount })));
    [t("fomcharts.filters.domain"), t("fomcharts.filters.origin"), t("fomcharts.filters.materialClass"), t("fomcharts.filters.baseMaterials")].forEach(
      (label) => {
        const btn = findByText(c, "button", label);
        push(filterMarks, btn ? markRect(c, btn, 4) : null);
      },
    );
    push(filterMarks, markRow(c, t("fomcharts.filters.exclusionMode.label")));
  }

  // Compare groups: "Group / Color by" select, first group card (EXP). Boxes
  // the group's whole row (button + its "n=" count), not just the label
  // button -- the label button alone stretches almost to the count via
  // flex-1, so a ring sized to just the button put the floating number
  // badge right on top of "n=...".
  if (statsWrap.value) {
    const c = statsWrap.value;
    push(statsMarks, markRow(c, t("fomcharts.controls.groupBy")));
    const groupBtn = findByText(c, "button", "EXP");
    const groupRow = groupBtn?.parentElement as HTMLElement | null;
    push(statsMarks, groupRow ? markRect(c, groupRow, 4) : null);
  }

  // Annotations: sort select, "show only pinned" row, compare selection bar,
  // then the R3 demo card itself (pre-expanded by expandDemoAnnotation
  // above) -- its header, siblings shortcut, Layer Structure box, Metrics
  // box and Notes box, in the same top-to-bottom order they actually render
  // in (see AnnotationCard.vue), so the numbered rings stay in sync.
  if (annotationsWrap.value) {
    const c = annotationsWrap.value;
    // The sort control has no visible caption of its own -- only its
    // current value ("Newest first" / "Plus récentes" / ...) shown on the
    // trigger button itself, so it's matched (and boxed) by that value
    // rather than by a row label like the other controls.
    const sortTrigger = findByText(c, "button", t("fomcharts.annotations.sort.newest"));
    push(annotationMarks, sortTrigger ? markRect(c, sortTrigger, 4) : null);
    push(annotationMarks, markRow(c, t("fomcharts.annotations.showOnlyPinned")));
    // The panel-level compare bar only renders once a pin is selected (see
    // AnnotationsPanel), and no pins are selected at capture time -- so this
    // rings the per-card checkbox instead, the actual control a researcher
    // checks first to start a comparison.
    push(annotationMarks, markRow(c, t("fomcharts.annotations.compareLabel")));

    // Both demo cards stay collapsed on this page (see the template's own
    // comment) -- only the card's own header/summary is ringed here. What's
    // inside an EXPANDED card is shown separately, at native size, by the
    // export figure on page 13 instead of being squeezed onto this page.
    const cardRef = findByText(c, "span", "R3");
    const cardHeader = cardRef?.closest("button") as HTMLElement | null;
    push(annotationMarks, cardHeader ? markRect(c, cardHeader, 4) : null);
  }

  // Reading the chart: badges (real DOM), legend, point-size legend, median
  // line, flagged point (the last four live only on ECharts' canvas -- see
  // FomChart's getLegendRect/getSizeLegendRect/getMedianLineRect/
  // getFlaggedPointRect). Pushed in the same order as readingMarks' own
  // legend (badges, legend, point size, median, flagged) so the numbered
  // rings stay in sync with it.
  if (readingWrap.value && readingChartRef.value) {
    const wrap = readingWrap.value;
    const chart = readingChartRef.value;
    const badgesEl = chart.getBadgesRow();
    push(readingMarks, badgesEl ? markRect(wrap, badgesEl, 4) : null);
    const chartDom = chart.getChartDom();
    const legendRect = chart.getLegendRect();
    push(readingMarks, chartDom && legendRect ? markCanvasRect(wrap, chartDom, legendRect) : null);
    const sizeLegendRect = chart.getSizeLegendRect();
    push(readingMarks, chartDom && sizeLegendRect ? markCanvasRect(wrap, chartDom, sizeLegendRect) : null);
    const medianRect = chart.getMedianLineRect();
    push(readingMarks, chartDom && medianRect ? markCanvasRect(wrap, chartDom, medianRect) : null);
    const flaggedRect = chart.getFlaggedPointRect();
    push(readingMarks, chartDom && flaggedRect ? markCanvasRect(wrap, chartDom, flaggedRect) : null);
    // Zoom control cluster -- real DOM (not canvas-drawn), so a plain
    // markRect works the same way it does for the badges row above, even
    // inside this figure's scaled/clipped wrapper (getBoundingClientRect
    // already reflects the live transform). Found locked (the default on
    // every fresh mount): aria-label reads "Unlock zoom", the action
    // clicking it would perform.
    const lockBtn = findByAttr(wrap, "button", "aria-label", t("fomcharts.zoom.unlock"));
    push(readingMarks, lockBtn?.parentElement ? markRect(wrap, lockBtn.parentElement as HTMLElement, 4) : null);
  }

  // Page 10: Data points tab -- filter chips (boxed as one row), the Add
  // data button, then the Pinned group's header -- in the same top-to-bottom
  // order DataPointsTable actually renders them in (filters+search+add sit
  // above the group list), so the numbered rings read top to bottom too.
  if (dataTableWrap.value) {
    const c = dataTableWrap.value;
    const allBtn = findByText(c, "button", t("fomcharts.pointsTable.filters.all"));
    const filterRow = allBtn?.parentElement as HTMLElement | null;
    push(dataTableMarks, filterRow ? markRect(c, filterRow, 4) : null);
    const addBtn = findByAttr(c, "button", "aria-label", t("fomcharts.addPoint.toolbarButton"));
    push(dataTableMarks, addBtn ? markRect(c, addBtn, 4) : null);
    const pinnedSpan = findByText(c, "span", t("fomcharts.pointsTable.pinnedGroup"));
    const pinnedBtn = pinnedSpan?.closest("button") as HTMLElement | null;
    push(dataTableMarks, pinnedBtn ? markRect(c, pinnedBtn, 4) : null);
  }

  // Page 11: Add a point, Essentials (label, axis values, Domain/Origin,
  // shape) then Metrics (measurements, Q-factor) -- each ring is a plain ref
  // on markup written in this same file (see the template), not a text
  // search, since there's no pre-existing component layout to reverse
  // engineer here.
  if (addPoint1Wrap.value) {
    const c = addPoint1Wrap.value;
    push(addPoint1Marks, addPointLabelWrap.value ? markRect(c, addPointLabelWrap.value, 4) : null);
    push(addPoint1Marks, addPointAxesWrap.value ? markRect(c, addPointAxesWrap.value, 4) : null);
    push(addPoint1Marks, addPointDomainOriginWrap.value ? markRect(c, addPointDomainOriginWrap.value, 4) : null);
    push(addPoint1Marks, addPointShapeWrap.value ? markRect(c, addPointShapeWrap.value, 4) : null);
    push(addPoint1Marks, addPointMetricsWrap.value ? markRect(c, addPointMetricsWrap.value, 4) : null);
    push(addPoint1Marks, addPointQFactorWrap.value ? markRect(c, addPointQFactorWrap.value, 4) : null);
  }

  // Page 12: Add a point, Structure & materials cascade (3 nodes).
  if (addPoint2Wrap.value) {
    const c = addPoint2Wrap.value;
    push(addPoint2Marks, addPointNode1Wrap.value ? markRect(c, addPointNode1Wrap.value, 4) : null);
    push(addPoint2Marks, addPointNode2Wrap.value ? markRect(c, addPointNode2Wrap.value, 4) : null);
    push(addPoint2Marks, addPointNode3Wrap.value ? markRect(c, addPointNode3Wrap.value, 4) : null);
  }

  // Page 14: Compare pinned points -- the hand-assembled markup toolbar
  // mock (same real Button/icon components as the live CompareDialog
  // toolbar, since that dialog's own content teleports outside the
  // `.guide-page` tree pdfExport.ts captures -- same constraint as the
  // comparison image itself, see comparePngUrl below).
  if (markupBlockWrap.value) {
    const c = markupBlockWrap.value;
    push(comparePinsMarks, markupToolsWrap.value ? markRect(c, markupToolsWrap.value, 4) : null);
    const clearBtn = findByText(c, "button", t("fomcharts.compare.tools.clear"));
    push(comparePinsMarks, clearBtn ? markRect(c, clearBtn, 4) : null);
  }

  // Page 12's "full point export" / "Metrics" export figures -- see
  // AnnotationsPanel's exposed getExportDataUrl / getMetricsExportDataUrl.
  pinExportDataUrl.value = annotationsPanelRef.value?.getExportDataUrl("demo-r3-exp") ?? null;
  metricsExportDataUrl.value = annotationsPanelRef.value?.getMetricsExportDataUrl("demo-r3-exp") ?? null;
  // Page 10's "Compare (2)" figure -- see AnnotationsPanel's exposed getComparePngDataUrl.
  comparePngUrl.value = annotationsPanelRef.value?.getComparePngDataUrl(["demo-r3-exp", "demo-r1-sim"]) ?? null;
  // Page 11's chart image exports -- see the hidden generator FomChart instances' exposed getPngDataUrl.
  exportChartPngUrl.value = exportChartGenRef.value?.getPngDataUrl() ?? null;
  exportChartPngUrl2.value = exportChartGenRef2.value?.getPngDataUrl() ?? null;
}

onMounted(() => {
  captureGuideArtifacts();
});

// Re-run on a live language switch -- see captureGuideArtifacts' own comment
// for why a fresh capture is needed rather than relying on the initial one.
watch(locale, () => {
  captureGuideArtifacts();
});

defineExpose({ rootEl });

// -----------------------------------------------------------------------
// Tiny local presentational components -- kept in this file since they're
// only ever used by the guide itself (a real shared header/footer/mark
// wouldn't belong in components/shared for something this guide-specific).
// -----------------------------------------------------------------------
const GuideHeader = () =>
  h("header", { class: "mb-5 flex items-start justify-between border-b border-border pb-3" }, [
    h("div", { class: "flex items-center gap-3" }, [
      h("img", { src: logoUrl, class: "h-12 w-12" }),
      h("div", {}, [
        h("h1", { class: "text-xl leading-tight font-semibold" }, `${t("app.title")} — ${t("guide.meta.subtitle")}`),
        h("p", { class: "text-sm text-secondary" }, t("guide.meta.lab")),
      ]),
    ]),
    h("div", { class: "flex flex-col items-end gap-2" }, [
      h("span", { class: "font-mono text-xs text-secondary" }, `${t("guide.meta.version")} v${appVersion}`),
      h("span", { class: "rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium tracking-[0.2em] text-primary uppercase" }, locale.value),
    ]),
  ]);

const GuideFooter = (props: { page: number }) =>
  h("footer", { class: "mt-auto flex items-center justify-between border-t border-border pt-2.5 text-xs text-secondary" }, [
    h("span", {}, `${t("app.title")} — ${t("guide.meta.subtitle")}`),
    h("span", {}, `${t("guide.footer.page")} ${props.page} / ${TOTAL_PAGES}`),
  ]);

const MARK_COLOR = "#d6272c";
const markNumBadgeStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "18px",
  height: "18px",
  borderRadius: "9999px",
  background: MARK_COLOR,
  color: "#fff",
  fontSize: "10px",
  fontWeight: "700",
  boxShadow: "0 0 0 2px #fff",
};

// `side` controls which edge the numbered badge floats outside of -- it
// must never sit on top of the ring's own interior, since that's exactly
// the real UI content being pointed at. "right" (the default) works for
// every stacked control row/card in this guide (there's always slack
// before the next column); the toolbar figure is the one place a row of
// tightly-packed buttons sits side by side, so its rings use "top"
// instead to avoid landing on the neighboring button.
//
// The badge's position is set via an inline style object, not a scoped
// CSS class: GuideMarkRing is a plain h()-based component, not compiled
// SFC template markup, so Vue's scoped-style attribute (data-v-xxxx) only
// ever lands on the component's OWN root element (this div) -- nested
// elements it creates internally (the inner span) never receive it, so a
// scoped ".guide-mark-num" rule silently never matches. Inline styles
// sidestep that entirely.
const GuideMarkRing = (props: { mark: GuideMark; number: number; side?: "right" | "top" }) =>
  h(
    "div",
    {
      class: "guide-mark",
      style: { top: `${props.mark.top}px`, left: `${props.mark.left}px`, width: `${props.mark.width}px`, height: `${props.mark.height}px` },
    },
    [
      h(
        "span",
        {
          style:
            props.side === "top"
              ? { ...markNumBadgeStyle, position: "absolute", left: "50%", bottom: "100%", marginBottom: "6px", transform: "translateX(-50%)" }
              : { ...markNumBadgeStyle, position: "absolute", top: "50%", left: "100%", marginLeft: "6px", transform: "translateY(-50%)" },
        },
        String(props.number),
      ),
    ],
  );

// `compact` tightens the row gap (used on pages whose legend has grown to
// more rows than this fixed-height A4 page has slack for, e.g. the
// Controls page's Display column) rather than shortening body copy past
// the point of being useful.
const GuideMarkLegend = (props: { items: { label: string; body: string }[]; compact?: boolean }, ctx: { attrs: Record<string, unknown> }) =>
  h(
    "div",
    { class: ["flex flex-col leading-snug", props.compact ? "gap-1 text-[10.5px]" : "gap-1.5 text-xs", ctx.attrs.class] },
    props.items.map((item, i) =>
      h("p", { key: i }, [
        h(
          "span",
          { style: { ...markNumBadgeStyle, display: "inline-flex", marginRight: "6px", verticalAlign: "middle", boxShadow: "none" } },
          String(i + 1),
        ),
        h("strong", { class: "text-ink" }, item.label),
        ` — ${item.body}`,
      ]),
    ),
  );
</script>

<style scoped>
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

.guide-mark {
  position: absolute;
  border: 2px solid #d6272c;
  border-radius: 10px;
  pointer-events: none;
  box-sizing: border-box;
}

.guide-toc-row {
  break-inside: avoid;
}
</style>
