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

    <!-- ============================= PAGE 2 -- Introduction + table of contents ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.intro')"
    >
      <GuideHeader />

      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.intro.title") }}</h2>

      <div class="mb-3">
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.abstractTitle") }}</h3>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.intro.abstractBody") }}</p>
      </div>

      <div class="mb-3">
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.guideTitle") }}</h3>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.intro.guideBody") }}</p>
      </div>

      <div class="mb-4 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
        <h3 class="mb-1 text-base font-semibold text-primary">{{ t("guide.intro.authorTitle") }}</h3>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.intro.authorBody") }}</p>
      </div>

      <div class="h-px w-full bg-border" />

      <h2 class="mt-4 mb-2 text-xl font-semibold">{{ t("guide.toc.title") }}</h2>

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

      <GuideFooter :page="PAGE_INTRO" />
    </section>

    <!-- ============================= PAGE 3 -- Mode 1: overview + import ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Import')"
    >
      <GuideHeader />

      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-3 text-xl font-semibold">{{ t("guide.mode1.title") }}</h2>

      <div class="mb-4 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.scenario.title") }}</p>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.scenario.body") }}</p>
      </div>

      <div class="mb-4">
        <h3 class="mb-1.5 text-base font-semibold text-primary">{{ t("guide.steps.import.overviewTitle") }}</h3>
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.import.overviewBody") }}</p>
      </div>

      <div class="mb-4">
        <h3 class="mb-2 text-base font-semibold">{{ t("guide.steps.import.title") }}</h3>
        <p class="mb-3 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.import.body") }}</p>

        <div class="mx-auto guide-callout-region" style="max-width: 380px">
          <FileDropzone compact />
        </div>
        <p class="mx-auto mt-2 max-w-96 text-center text-sm leading-snug text-secondary">{{ t("guide.steps.import.figure1Caption") }}</p>
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
        <p class="mx-auto mt-2 max-w-125 text-center text-sm leading-snug text-secondary">{{ t("guide.steps.import.figure2Caption") }}</p>

        <GuideMarkLegend
          :items="[
            { label: t('guide.steps.import.toolbar.import.label'), body: t('guide.steps.import.toolbar.import.body') },
            { label: t('guide.steps.import.toolbar.export.label'), body: t('guide.steps.import.toolbar.export.body') },
            { label: t('guide.steps.import.toolbar.reset.label'), body: t('guide.steps.import.toolbar.reset.body') },
          ]"
        />
      </div>

      <GuideFooter :page="PAGE_MODE1_IMPORT" />
    </section>

    <!-- ============================= PAGE 4 -- Mode 1: chart & display controls ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Controls')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.controls.title") }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.controls.body") }}</p>

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
            v-model:show-axis-names="showAxisNames"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:show-pareto="showPareto"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
          />
            <GuideMarkRing v-for="(m, i) in chartMarks" :key="i" :mark="m" :number="i + 1" />
          </div>
          <p class="mt-2 max-w-65 text-xs leading-snug text-secondary">{{ t("guide.steps.controls.figureChartCaption") }}</p>
          <GuideMarkLegend
            class="mt-2"
            :items="[
              { label: t('guide.steps.controls.chart.title.label'), body: t('guide.steps.controls.chart.title.body') },
              { label: t('guide.steps.controls.chart.yAxis.label'), body: t('guide.steps.controls.chart.yAxis.body') },
              { label: t('guide.steps.controls.chart.xAxis.label'), body: t('guide.steps.controls.chart.xAxis.body') },
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
            v-model:show-axis-names="showAxisNames"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:show-pareto="showPareto"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
          />
            <GuideMarkRing v-for="(m, i) in displayMarks" :key="i" :mark="m" :number="i + 1" />
          </div>
          <p class="mt-2 max-w-65 text-xs leading-snug text-secondary">{{ t("guide.steps.controls.figureDisplayCaption") }}</p>
          <GuideMarkLegend
            class="mt-2"
            :items="[
              { label: t('guide.steps.controls.display.scale.label'), body: t('guide.steps.controls.display.scale.body') },
              { label: t('guide.steps.controls.display.trendLine.label'), body: t('guide.steps.controls.display.trendLine.body') },
              { label: t('guide.steps.controls.display.pareto.label'), body: t('guide.steps.controls.display.pareto.body') },
              { label: t('guide.steps.controls.display.legend.label'), body: t('guide.steps.controls.display.legend.body') },
              { label: t('guide.steps.controls.display.median.label'), body: t('guide.steps.controls.display.median.body') },
              { label: t('guide.steps.controls.display.axisNames.label'), body: t('guide.steps.controls.display.axisNames.body') },
            ]"
          />
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE1_CONTROLS" />
    </section>

    <!-- ============================= PAGE 5 -- Mode 1: filters ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Filters')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.filters.title") }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.filters.body") }}</p>

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
            v-model:show-axis-names="showAxisNames"
            v-model:selected-domains="selectedDomains"
            v-model:selected-origins="selectedOrigins"
            v-model:selected-material-classes="selectedMaterialClasses"
            v-model:selected-base-materials="selectedBaseMaterials"
            v-model:show-pareto="showPareto"
            :numeric-columns="numericColumns"
            :categorical-columns="xAxisCategoricalColumns"
            :origin-column="originColumn"
            :origin-values="originValues"
            :origin-counts="originCounts"
            :material-class-column="materialClassColumn"
            :material-class-values="materialClassValues"
            :material-class-counts="materialClassCounts"
            :base-materials-column="baseMaterialsColumn"
            :base-materials-values="baseMaterialsValues"
            :base-materials-counts="baseMaterialsCounts"
          />
          <GuideMarkRing v-for="(m, i) in filterMarks" :key="i" :mark="m" :number="i + 1" />
        </div>
        <div class="flex-1 pt-1">
          <p class="mb-2 text-sm leading-snug text-secondary">{{ t("guide.steps.filters.figureCaption") }}</p>
          <GuideMarkLegend
            :items="[
              { label: t('guide.steps.filters.marks.origin.label'), body: t('guide.steps.filters.marks.origin.body') },
              { label: t('guide.steps.filters.marks.materialClass.label'), body: t('guide.steps.filters.marks.materialClass.body') },
              { label: t('guide.steps.filters.marks.baseMaterials.label'), body: t('guide.steps.filters.marks.baseMaterials.body') },
            ]"
          />
        </div>
      </div>

      <div class="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.filters.note") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_FILTERS" />
    </section>

    <!-- ============================= PAGE 6 -- Mode 1: reading the chart ============================= -->
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
      <div class="relative mx-auto" style="width: 480px">
        <div class="guide-callout-region" style="width: 480px; height: 392px; overflow: hidden">
          <div style="width: 686px; transform: scale(0.7); transform-origin: top left">
            <FomChart
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
              :show-pareto="showPareto"
              :show-axis-names="showAxisNames"
              :x-axis-numeric="true"
              :group-color-map="groupColorMap"
            />
          </div>
        </div>
        <GuideMarkRing v-for="(m, i) in readingMarks" :key="i" :mark="m" :number="i + 1" />
      </div>
      <p class="mx-auto mt-2 max-w-120 text-center text-sm leading-snug text-secondary">{{ t("guide.steps.reading.figure4Caption") }}</p>

      <GuideMarkLegend
        class="mt-2"
        :items="[
          { label: t('guide.steps.reading.marks.badges.label'), body: t('guide.steps.reading.marks.badges.body') },
          { label: t('guide.steps.reading.marks.legend.label'), body: t('guide.steps.reading.marks.legend.body') },
          { label: t('guide.steps.reading.marks.median.label'), body: t('guide.steps.reading.marks.median.body') },
        ]"
      />

      <div class="mt-4 grid grid-cols-3 gap-x-4 gap-y-2 text-xs">
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.hover.label") }}</strong> — {{ t("guide.steps.reading.interactions.hover.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.zoom.label") }}</strong> — {{ t("guide.steps.reading.interactions.zoom.body") }}</p>
        <p><strong class="text-primary">{{ t("guide.steps.reading.interactions.click.label") }}</strong> — {{ t("guide.steps.reading.interactions.click.body") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_READING" />
    </section>

    <!-- ============================= PAGE 7 -- Mode 1: compare groups ============================= -->
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
          <p class="mb-2 text-sm leading-snug text-secondary">{{ t("guide.steps.compare.figureCaption") }}</p>
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

      <GuideFooter :page="PAGE_MODE1_COMPARE" />
    </section>

    <!-- ============================= PAGE 8 -- Mode 1: pin & annotate ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Annotate')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.annotate.title") }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.annotate.body") }}</p>

      <div class="flex items-start gap-9">
        <div ref="annotationsWrap" class="guide-callout-region relative shrink-0" style="width: 280px">
          <AnnotationsPanel
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
          <p class="mb-2 text-sm leading-snug text-secondary">{{ t("guide.steps.annotate.figureCaption") }}</p>
          <GuideMarkLegend
            :items="[
              { label: t('guide.steps.annotate.marks.sort.label'), body: t('guide.steps.annotate.marks.sort.body') },
              { label: t('guide.steps.annotate.marks.showOnlyPinned.label'), body: t('guide.steps.annotate.marks.showOnlyPinned.body') },
              { label: t('guide.steps.annotate.marks.card.label'), body: t('guide.steps.annotate.marks.card.body') },
            ]"
          />
        </div>
      </div>

      <div class="mt-5 rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.annotate.extra") }}</p>
      </div>

      <GuideFooter :page="PAGE_MODE1_ANNOTATE" />
    </section>

    <!-- ============================= PAGE 9 -- Mode 1: export ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1Export')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.export.title") }}</h2>
      <p class="mb-4 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.export.body") }}</p>

      <div class="flex gap-5">
        <div class="flex-1">
          <div class="guide-callout-region" style="width: 280px; height: 346px; overflow: hidden">
            <div style="width: 466px; transform: scale(0.6); transform-origin: top left">
              <FomChart
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
            :show-pareto="showPareto"
            :show-axis-names="showAxisNames"
            :x-axis-numeric="true"
            :group-color-map="groupColorMap"
          />
            </div>
          </div>
          <p class="mt-1.5 max-w-65 text-xs leading-snug text-secondary">{{ t("guide.steps.export.chartCaption") }}</p>
        </div>
        <div class="flex-1">
          <div class="guide-callout-region font-mono text-xs leading-relaxed text-ink" style="min-height: 346px; white-space: pre-wrap">{{ sampleNoteText }}</div>
          <p class="mt-1.5 max-w-65 text-xs leading-snug text-secondary">{{ t("guide.steps.export.noteCaption") }}</p>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-5">
        <div>
          <h3 class="mb-2 text-sm font-semibold text-primary">{{ t("guide.steps.export.formatsTitle") }}</h3>
          <ul class="flex flex-col gap-1.5 text-sm text-ink">
            <li><strong class="font-mono text-ink">{{ t("fomcharts.export.csv") }}</strong> — {{ t("guide.steps.export.formats.csv") }}</li>
            <li><strong class="font-mono text-ink">{{ t("fomcharts.export.xlsx") }}</strong> — {{ t("guide.steps.export.formats.xlsx") }}</li>
            <li><strong class="font-mono text-ink">{{ t("fomcharts.export.png") }}</strong> — {{ t("guide.steps.export.formats.png") }}</li>
          </ul>
        </div>
        <div>
          <h3 class="mb-2 text-sm font-semibold text-primary">{{ t("guide.steps.export.pinFormatsTitle") }}</h3>
          <ul class="flex flex-col gap-1.5 text-sm text-ink">
            <li><strong>{{ t("fomcharts.annotations.downloadTxt") }}</strong> — {{ t("guide.steps.export.pinFormats.note") }}</li>
            <li><strong>{{ t("fomcharts.annotations.downloadPng") }}</strong> — {{ t("guide.steps.export.pinFormats.fields") }}</li>
            <li><strong>{{ t("fomcharts.annotations.exportPin") }}</strong> — {{ t("guide.steps.export.pinFormats.all") }}</li>
          </ul>
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE1_EXPORT" />
    </section>

    <!-- ============================= PAGE 10 -- Mode 1: use cases ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
      :data-outline-title="t('guide.outline.mode1UseCases')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode1.eyebrow") }}</p>
      <h2 class="mb-2 text-xl font-semibold">{{ t("guide.steps.useCases.title") }}</h2>
      <p class="mb-5 text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.useCases.intro") }}</p>

      <div class="flex flex-col gap-4">
        <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p class="mb-1 text-sm font-semibold text-primary">1. {{ t("guide.steps.useCases.compareExpSim.title") }}</p>
          <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.useCases.compareExpSim.body") }}</p>
        </div>
        <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p class="mb-1 text-sm font-semibold text-primary">2. {{ t("guide.steps.useCases.reviewFlagged.title") }}</p>
          <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.useCases.reviewFlagged.body") }}</p>
        </div>
        <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
          <p class="mb-1 text-sm font-semibold text-primary">3. {{ t("guide.steps.useCases.publicationFigure.title") }}</p>
          <p class="text-sm leading-relaxed text-justify text-ink">{{ t("guide.steps.useCases.publicationFigure.body") }}</p>
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE1_USECASES" />
    </section>

    <!-- ============================= PAGE 11 -- Mode 2: coming soon ============================= -->
    <section
      class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm]"
      :data-outline-title="t('guide.outline.mode2')"
    >
      <GuideHeader />
      <p class="mb-2 text-xs font-semibold tracking-[0.3em] text-secondary uppercase">{{ t("guide.mode2.eyebrow") }}</p>
      <h2 class="mb-6 text-xl font-semibold">{{ t("guide.mode2.title") }}</h2>

      <div class="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/20 px-10 py-8 text-center">
        <p class="mb-3 text-3xl">🚧</p>
        <p class="mb-2 text-lg font-semibold text-ink">{{ t("guide.mode2.comingSoon.title") }}</p>
        <p class="max-w-md text-sm leading-relaxed text-justify text-ink">{{ t("guide.mode2.comingSoon.body") }}</p>
      </div>

      <div class="mt-8">
        <h3 class="mb-3 text-base font-semibold">{{ t("guide.mode2.preview.title") }}</h3>
        <div class="grid grid-cols-2 gap-4">
          <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.mode2.preview.rules.title") }}</p>
            <p class="text-sm leading-relaxed text-justify text-secondary">{{ t("guide.mode2.preview.rules.body") }}</p>
          </div>
          <div class="rounded-xl border border-border bg-muted/30 px-4 py-3">
            <p class="mb-1 text-sm font-semibold text-ink">{{ t("guide.mode2.preview.validation.title") }}</p>
            <p class="text-sm leading-relaxed text-justify text-secondary">{{ t("guide.mode2.preview.validation.body") }}</p>
          </div>
        </div>
      </div>

      <GuideFooter :page="PAGE_MODE2" />
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, h, nextTick, onMounted, ref, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import {
  ChevronDown,
  Construction,
  Download,
  Filter,
  Info,
  Lightbulb,
  LineChart,
  Pin,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  Users,
} from "@lucide/vue";
import { Button } from "@/components/ui/button";
import FileDropzone from "@/components/shared/FileDropzone.vue";
import GraphControls from "@/components/visualization/GraphControls.vue";
import FomChart from "@/components/visualization/FomChart.vue";
import StatsSummaryPanel from "@/components/visualization/StatsSummaryPanel.vue";
import AnnotationsPanel, { type Annotation } from "@/components/visualization/AnnotationsPanel.vue";
import { filterPlottable } from "@/utils/stats";
import { assignGroupColors } from "@/utils/palette";
import {
  detectColumnTypes,
  findOriginColumn,
  findMaterialClassColumn,
  findBaseMaterialsColumn,
  findModeIdColumn,
  distinctValues,
  tokenizedDistinctValues,
  tokenizeValue,
  groupableColumns,
  type DataRow,
} from "@/utils/columnTypes";
import logoUrl from "@/assets/logo.svg";
import yonseiSymbol from "@/assets/yonsei-logo.svg";
import yonseiOptica from "@/assets/yonsei-optica.svg";
import { findByText, markRect, markRow, markLabel, markFilterBlock, type GuideMark } from "./guideAnnotate";

const { t, locale } = useI18n();

// Kept as a plain constant (rather than importing package.json, which sits
// outside the tsconfig `src` root) -- bump alongside real app releases.
const appVersion = "0.2.0";
const rootEl = useTemplateRef<HTMLDivElement>("rootEl");

// Fixed page numbers -- referenced both in each page's own footer and by
// the clickable table of contents (see tocEntries + data-toc-target below,
// resolved into real PDF link annotations by pdfExport.ts).
const PAGE_INTRO = 2;
const PAGE_MODE1_IMPORT = 3;
const PAGE_MODE1_CONTROLS = 4;
const PAGE_MODE1_FILTERS = 5;
const PAGE_MODE1_READING = 6;
const PAGE_MODE1_COMPARE = 7;
const PAGE_MODE1_ANNOTATE = 8;
const PAGE_MODE1_EXPORT = 9;
const PAGE_MODE1_USECASES = 10;
const PAGE_MODE2 = 11;
const TOTAL_PAGES = 11;

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
  { label: tocLabel(t("guide.outline.intro")), page: PAGE_INTRO, icon: Info, group: "front" as const },
  { label: tocLabel(t("guide.outline.mode1Import")), page: PAGE_MODE1_IMPORT, icon: Upload, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Controls")), page: PAGE_MODE1_CONTROLS, icon: SlidersHorizontal, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Filters")), page: PAGE_MODE1_FILTERS, icon: Filter, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Reading")), page: PAGE_MODE1_READING, icon: LineChart, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Compare")), page: PAGE_MODE1_COMPARE, icon: Users, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Annotate")), page: PAGE_MODE1_ANNOTATE, icon: Pin, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1Export")), page: PAGE_MODE1_EXPORT, icon: Download, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode1UseCases")), page: PAGE_MODE1_USECASES, icon: Lightbulb, group: "mode1" as const },
  { label: tocLabel(t("guide.outline.mode2")), page: PAGE_MODE2, icon: Construction, group: "back" as const },
]);

// ---------------------------------------------------------------------
// Worked example dataset (Mode 1 only) -- six photonic resonator sensor
// designs, each reported once experimentally (EXP) and once from
// simulation (SIM). Column names follow the same conventions the real
// app's column detectors (utils/columnTypes.ts) look for, so every real
// component mounted below behaves exactly as it would on a real uploaded
// file, not a hand-faked illustration.
// ---------------------------------------------------------------------
const sampleColumns = [
  "Ref",
  "Title",
  "Origin",
  "Material Class",
  "Base Materials",
  "Mode ID",
  "Resonance Wavelength (nm)",
  "Q-Factor",
  "Sensitivity (nm/RIU)",
  "FWHM (nm)",
  "Layer Structure",
  "Review Status",
  "Notes",
];

function sampleRow(data: Record<string, unknown>): DataRow {
  return { "Mode ID": 1, "Review Status": "Approve", Notes: "", ...data };
}

const sampleRows: DataRow[] = [
  sampleRow({ Ref: "R1", Title: "High-Q silicon microring resonator RI sensor", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Si;SiO2", "Resonance Wavelength (nm)": 1550, "Q-Factor": 42000, "Sensitivity (nm/RIU)": 65, "FWHM (nm)": 0.037, "Layer Structure": "Si core / SiO2 cladding" }),
  sampleRow({ Ref: "R1", Title: "High-Q silicon microring resonator RI sensor", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Si;SiO2", "Resonance Wavelength (nm)": 1550, "Q-Factor": 51000, "Sensitivity (nm/RIU)": 70, "FWHM (nm)": 0.03, "Layer Structure": "Si core / SiO2 cladding" }),
  sampleRow({ Ref: "R2", Title: "Silicon-nitride ring resonator for biosensing", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "SiN;SiO2", "Resonance Wavelength (nm)": 1310, "Q-Factor": 88000, "Sensitivity (nm/RIU)": 40, "FWHM (nm)": 0.015, "Layer Structure": "SiN core / SiO2 cladding" }),
  sampleRow({ Ref: "R2", Title: "Silicon-nitride ring resonator for biosensing", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "SiN;SiO2", "Resonance Wavelength (nm)": 1310, "Q-Factor": 96000, "Sensitivity (nm/RIU)": 45, "FWHM (nm)": 0.014, "Layer Structure": "SiN core / SiO2 cladding" }),
  sampleRow({ Ref: "R3", Title: "Plasmonic gold nanodisk array LSPR sensor", Origin: "EXP", "Material Class": "Metal", "Base Materials": "Au", "Resonance Wavelength (nm)": 780, "Q-Factor": 120, "Sensitivity (nm/RIU)": 320, "FWHM (nm)": 6.5, "Layer Structure": "Au nanodisk array / glass", "Review Status": "Edit", Notes: "FWHM estimated from the published linewidth plot (Q ≈ λ / FWHM)." }),
  sampleRow({ Ref: "R3", Title: "Plasmonic gold nanodisk array LSPR sensor", Origin: "SIM", "Material Class": "Metal", "Base Materials": "Au", "Resonance Wavelength (nm)": 780, "Q-Factor": 150, "Sensitivity (nm/RIU)": 340, "FWHM (nm)": 5.2, "Layer Structure": "Au nanodisk array / glass" }),
  sampleRow({ Ref: "R4", Title: "Hybrid dielectric-metal disk resonator on a gold mirror", Origin: "EXP", "Material Class": "Dielectric;Metal", "Base Materials": "Si;Au", "Resonance Wavelength (nm)": 1064, "Q-Factor": 3200, "Sensitivity (nm/RIU)": 210, "FWHM (nm)": 0.33, "Layer Structure": "Si disk / Au mirror" }),
  sampleRow({ Ref: "R4", Title: "Hybrid dielectric-metal disk resonator on a gold mirror", Origin: "SIM", "Material Class": "Dielectric;Metal", "Base Materials": "Si;Au", "Resonance Wavelength (nm)": 1064, "Q-Factor": 3900, "Sensitivity (nm/RIU)": 230, "FWHM (nm)": 0.27, "Layer Structure": "Si disk / Au mirror" }),
  sampleRow({ Ref: "R5", Title: "InP Mach-Zehnder interferometer sensor", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "InP", "Resonance Wavelength (nm)": 1550, "Q-Factor": 1200, "Sensitivity (nm/RIU)": 180, "FWHM (nm)": 1.3, "Layer Structure": "InP rib waveguide" }),
  sampleRow({ Ref: "R5", Title: "InP Mach-Zehnder interferometer sensor", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "InP", "Resonance Wavelength (nm)": 1550, "Q-Factor": 1500, "Sensitivity (nm/RIU)": 190, "FWHM (nm)": 1.0, "Layer Structure": "InP rib waveguide" }),
  sampleRow({ Ref: "R6", Title: "Polymer microring resonator for label-free detection", Origin: "EXP", "Material Class": "Dielectric", "Base Materials": "Polymer;SiO2", "Resonance Wavelength (nm)": 1300, "Q-Factor": 2600, "Sensitivity (nm/RIU)": 95, "FWHM (nm)": 0.5, "Layer Structure": "Polymer core / SiO2 cladding" }),
  sampleRow({ Ref: "R6", Title: "Polymer microring resonator for label-free detection", Origin: "SIM", "Material Class": "Dielectric", "Base Materials": "Polymer;SiO2", "Resonance Wavelength (nm)": 1300, "Q-Factor": 3100, "Sensitivity (nm/RIU)": 100, "FWHM (nm)": 0.42, "Layer Structure": "Polymer core / SiO2 cladding" }),
];

const columnTypes = detectColumnTypes(sampleRows, sampleColumns);
const numericColumns = columnTypes.numeric;
const categoricalColumns = columnTypes.categorical;

const originColumn = findOriginColumn(sampleColumns);
const materialClassColumn = findMaterialClassColumn(sampleColumns);
const baseMaterialsColumn = findBaseMaterialsColumn(sampleColumns);
const modeIdColumn = findModeIdColumn(sampleColumns);
const compositeColumns = [materialClassColumn, baseMaterialsColumn].filter((c): c is string => !!c);
const xAxisCategoricalColumns = categoricalColumns.filter((c) => c !== originColumn && !compositeColumns.includes(c));

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
const originCounts = countTokensBy(originColumn, sampleRows);
const materialClassCounts = countTokensBy(materialClassColumn, sampleRows);
const baseMaterialsCounts = countTokensBy(baseMaterialsColumn, sampleRows);

const groupByExemptColumns = [...compositeColumns, modeIdColumn].filter((c): c is string => !!c);
const groupByColumns = groupableColumns(sampleRows, categoricalColumns, groupByExemptColumns);

// Fixed illustrative chart configuration -- Q-factor (log scale) against
// resonance wavelength, colored by Origin (EXP vs SIM), median line on.
const selectedYAxis = ref<string | null>("Q-Factor");
const selectedXAxis = ref<string | null>("Resonance Wavelength (nm)");
const groupBy = ref<string | null>(originColumn);
const yAxisScale = ref<"log" | "value">("log");
const chartTitle = ref("");
const showLegend = ref(true);
const showMedian = ref(true);
const showTrend = ref(false);
const showAxisNames = ref(false);
const showPareto = ref(false);
const highlightGroup = ref<string | null>(null);
const selectedDomains = ref<string[]>([]);
const selectedOrigins = ref<string[]>([...originValues]);
const selectedMaterialClasses = ref<string[]>([...materialClassValues]);
const selectedBaseMaterials = ref<string[]>([...baseMaterialsValues]);

const groupColorMap = computed<Record<string, string>>(() => (originColumn ? assignGroupColors(originValues) : {}));
const plottableRows = computed(() => filterPlottable(filterPlottable(sampleRows, selectedYAxis.value), selectedXAxis.value));

const statsOpen = ref(true);
const annotationsOpen = ref(true);
const showOnlyAnnotated = ref(false);
const annotations = ref<Annotation[]>([
  {
    id: "demo-r3-exp",
    ref: "R3",
    title: "Plasmonic gold nanodisk array LSPR sensor",
    row: sampleRows[4],
    note: "FWHM estimated from the published linewidth plot (Q ≈ λ / FWHM) -- flagged for review.",
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
const sampleNoteText = annotations.value[0].note;

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
const annotationsWrap = useTemplateRef<HTMLDivElement>("annotationsWrap");

const toolbarMarks = ref<GuideMark[]>([]);
const chartMarks = ref<GuideMark[]>([]);
const displayMarks = ref<GuideMark[]>([]);
const filterMarks = ref<GuideMark[]>([]);
const statsMarks = ref<GuideMark[]>([]);
const annotationMarks = ref<GuideMark[]>([]);

// Approximate marks over the chart's canvas: individual points/legend/median
// line are pixels drawn by ECharts, not separate DOM nodes, so these are
// calibrated percentages of the 480x392 callout box rather than measured
// elements -- the only figure in this guide that isn't DOM-measured.
// Mark 1's real content (measured live) runs flush to the figure's own
// right edge with zero slack -- it must span the full badge row (up to
// x=480) so its ring's own right-side number badge lands in the blank
// margin just outside the figure instead of on top of the real content.
const readingMarks = ref<GuideMark[]>([
  { top: 7, left: 256, width: 224, height: 22 },
  { top: 40, left: 148, width: 130, height: 40 },
  { top: 172, left: 118, width: 150, height: 22 },
]);

function openSection(root: HTMLElement | null, title: string) {
  const button = root ? Array.from(root.querySelectorAll("button")).find((b) => b.textContent?.trim() === title) : undefined;
  button?.click();
}

// CollapsibleSection animates open/closed over 250ms (grid-template-rows
// transition) -- measuring a row's rect before that finishes catches it
// mid-collapse/expand and produces wrong, squashed callout rects. Waiting
// out the transition (a plain timeout, since there's no 'transitionend'
// to await here across every affected row at once) before measuring is
// simplest and safe -- this only runs once, off-screen, before capture.
const settle = (ms = 320) => new Promise((resolve) => setTimeout(resolve, ms));

onMounted(async () => {
  await nextTick();

  openSection(displayControlsWrap.value, t("fomcharts.sections.display"));
  openSection(filtersWrap.value, t("fomcharts.sections.filters"));
  await nextTick();
  await settle();

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

  // Chart section: title / Y axis / X axis.
  if (chartControlsWrap.value) {
    const c = chartControlsWrap.value;
    [t("fomcharts.controls.title"), t("fomcharts.controls.yAxis"), t("fomcharts.controls.xAxis")].forEach((label) => {
      push(chartMarks, markLabel(c, label));
    });
  }

  // Display section: scale / trend line / pareto / legend / median / axis names.
  if (displayControlsWrap.value) {
    const c = displayControlsWrap.value;
    [
      t("fomcharts.scale.label"),
      t("fomcharts.controls.trendLine"),
      t("fomcharts.controls.pareto"),
      t("fomcharts.legend.toggle"),
      t("fomcharts.medianLine.toggle"),
      t("fomcharts.controls.axisNames"),
    ].forEach((label) => {
      push(displayMarks, markRow(c, label));
    });
  }

  // Filters section: Origin / Material Class / Base Materials blocks.
  if (filtersWrap.value) {
    const c = filtersWrap.value;
    [t("fomcharts.filters.origin"), t("fomcharts.filters.materialClass"), t("fomcharts.filters.baseMaterials")].forEach((label) => {
      push(filterMarks, markFilterBlock(c, label));
    });
  }

  // Compare groups: "Group / Color by" select, first group card (EXP).
  if (statsWrap.value) {
    const c = statsWrap.value;
    push(statsMarks, markRow(c, t("fomcharts.controls.groupBy")));
    const groupBtn = findByText(c, "button", "EXP");
    push(statsMarks, groupBtn ? markRect(c, groupBtn, 4) : null);
  }

  // Annotations: sort select, "show only pinned" row, first pinned card.
  if (annotationsWrap.value) {
    const c = annotationsWrap.value;
    // The sort control has no visible caption of its own -- only its
    // current value ("Newest first" / "Plus récentes" / ...) shown on the
    // trigger button itself, so it's matched (and boxed) by that value
    // rather than by a row label like the other controls.
    const sortTrigger = findByText(c, "button", t("fomcharts.annotations.sort.newest"));
    push(annotationMarks, sortTrigger ? markRect(c, sortTrigger, 4) : null);
    push(annotationMarks, markRow(c, t("fomcharts.annotations.showOnlyPinned")));
    const cardRef = findByText(c, "span", "R3");
    const card = cardRef?.closest(".rounded-\\[10px\\]") as HTMLElement | null;
    push(annotationMarks, card ? markRect(c, card, 4) : null);
  }
});

defineExpose({ rootEl });

// -----------------------------------------------------------------------
// Tiny local presentational components -- kept in this file since they're
// only ever used by the guide itself (a real shared header/footer/mark
// wouldn't belong in components/shared for something this guide-specific).
// -----------------------------------------------------------------------
const GuideHeader = () =>
  h("header", { class: "mb-6 flex items-start justify-between border-b border-border pb-4" }, [
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
  h("footer", { class: "mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-secondary" }, [
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

const GuideMarkLegend = (props: { items: { label: string; body: string }[] }, ctx: { attrs: Record<string, unknown> }) =>
  h(
    "div",
    { class: ["flex flex-col gap-1.5 text-xs", ctx.attrs.class] },
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
  padding: 10px;
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
