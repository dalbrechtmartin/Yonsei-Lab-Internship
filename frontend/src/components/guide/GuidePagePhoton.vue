<template>
  <!-- ============================= PAGE 25 -- Mode 2: ask Photon a question ============================= -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[15mm] break-after-page"
    :data-outline-title="t('guide.outline.mode2Photon')"
  >
    <GuideHeader :app-version="appVersion" />

    <p
      class="mb-1.5 text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
    >
      {{ t("guide.mode2.eyebrow") }}
    </p>
    <h2 class="mb-2.5 text-xl font-semibold">
      {{ t("guide.steps.mode2Photon.title") }}
    </h2>
    <p class="mb-3 text-sm leading-relaxed text-justify text-ink">
      {{ t("guide.steps.mode2Photon.body") }}
    </p>

    <!-- Hand-assembled stand-in for PhotonPanel -- same real sub-components
         (PhotonMascot, PhotonMessageList, PhotonChipRow), fed by a fixed
         worked-example exchange about the R3 flagged record. NOT the live
         PhotonPanel/PhotonFab themselves: those read Photon's shared,
         app-wide conversation singleton (usePhotonContext.ts), and this
         hidden guide tree stays mounted while the real app is in use, so
         registering a fake context here would hijack the real feature for
         whoever is actually using the app at the time -- same class of
         constraint as GuidePageMode2Review's PDF viewer stand-in and
         GuidePageComparePins' markup toolbar mock. -->
    <!-- Split into an outer, unclipped wrapper (hosts the rings) and an
         inner, overflow-hidden wrapper (the actual chat-panel chrome, clipped
         to its own rounded corners) -- same technique GuidePageReading.vue
         uses for its own chart figure. A ring's own outward padding
         (markRect's `pad`) and its numbered badge (floating further out
         still, see GuideMarkRing's `side`) routinely land just past the
         target's own edges; putting overflow-hidden on the SAME element that
         hosts the rings clips both away, which is why they don't render
         here otherwise. -->
    <div ref="photonWrap" class="relative mx-auto w-full max-w-125">
      <div
        class="flex w-full flex-col overflow-hidden guide-callout-region p-0!"
        style="height: 420px"
      >
        <header
          ref="photonHeaderWrap"
          class="flex shrink-0 items-center gap-2.5 border-b border-secondary/10 px-4 py-3"
        >
          <PhotonMascot expression="happy" class="size-7 shrink-0" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-semibold text-ink">
              {{ t("photon.panel.title") }}
            </p>
            <p class="truncate text-xs text-secondary">
              {{ flaggedRecord.ref }}
            </p>
          </div>
          <button
            type="button"
            class="shrink-0 rounded-md p-1.5 text-secondary"
            :aria-label="t('photon.panel.closeAria')"
          >
            <X class="size-4" />
          </button>
        </header>

        <div ref="photonMessagesWrap" class="flex min-h-0 flex-1 flex-col">
          <PhotonMessageList
            :messages="photonDemoMessages"
            :is-loading="false"
          />
        </div>

        <div
          ref="photonChipsWrap"
          class="shrink-0 border-t border-secondary/10 px-3 py-2"
        >
          <PhotonChipRow :chips="photonDemoChips" />
        </div>

        <div
          class="flex shrink-0 items-end gap-2 border-t border-secondary/10 p-3"
        >
          <Textarea
            :placeholder="t('photon.panel.placeholder')"
            class="max-h-32 min-h-9 flex-1 resize-none text-sm"
            rows="1"
            disabled
          />
          <Button
            type="button"
            size="icon-sm"
            disabled
            :aria-label="t('photon.panel.sendAria')"
          >
            <Send class="size-4" />
          </Button>
        </div>
      </div>

      <GuideMarkRing
        v-for="(m, i) in photonMarks"
        :key="i"
        :mark="m"
        :number="i + 1"
      />
    </div>

    <GuideMarkLegend
      class="mx-auto mt-2 max-w-125"
      :items="[
        {
          label: t('guide.steps.mode2Photon.marks.header.label'),
          body: t('guide.steps.mode2Photon.marks.header.body'),
        },
        {
          label: t('guide.steps.mode2Photon.marks.messages.label'),
          body: t('guide.steps.mode2Photon.marks.messages.body'),
        },
        {
          label: t('guide.steps.mode2Photon.marks.chips.label'),
          body: t('guide.steps.mode2Photon.marks.chips.body'),
        },
      ]"
    />

    <div class="mt-3 rounded-xl border border-border bg-muted/30 px-4 py-2.5">
      <p class="text-sm leading-relaxed text-justify text-ink">
        {{ t("guide.steps.mode2Photon.note") }}
      </p>
    </div>

    <GuideFooter :page="page" :total-pages="totalPages" />
  </section>
</template>

<script setup lang="ts">
import { computed, useTemplateRef } from "vue";
import { useI18n } from "vue-i18n";
import { Send, X } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import PhotonMascot from "@/components/extraction/PhotonMascot.vue";
import PhotonMessageList from "@/components/extraction/PhotonMessageList.vue";
import PhotonChipRow, {
  type PhotonChip,
} from "@/components/extraction/PhotonChipRow.vue";
import type { PhotonMessage } from "@/composables/usePhotonContext";
import GuideHeader from "./GuideHeader.vue";
import GuideFooter from "./GuideFooter.vue";
import GuideMarkRing from "./GuideMarkRing.vue";
import GuideMarkLegend from "./GuideMarkLegend.vue";
import type { GuideMark } from "./guideAnnotate";
import { flaggedRecord } from "./guideExtractionSampleData";

defineProps<{
  appVersion: string;
  page: number;
  totalPages: number;
  photonMarks: GuideMark[];
}>();

const { t } = useI18n();

// R3's own flagged reason (see guideExtractionSampleData.ts) -- same
// worked-example exchange every Mode 2 page since Review has been telling,
// now answered in Photon's own voice instead of the review card's banner.
const photonDemoMessages = computed<PhotonMessage[]>(() => [
  { role: "user", content: t("guide.steps.mode2Photon.demo.userQuestion") },
  { role: "model", content: t("guide.steps.mode2Photon.demo.answer") },
]);

// Mirrors PhotonPanel's own visibleChips logic for this exact record: R3 is
// "Edit" (not "Exclude", so no why-excluded chip) and has no rawValue/
// conversionMethod (so no explain-conversion chip) -- just these two.
const photonDemoChips = computed<PhotonChip[]>(() => [
  { id: "show-evidence", label: t("photon.chips.showEvidence.label") },
  { id: "why-matters", label: t("photon.chips.whyMatters.label") },
]);

const photonWrap = useTemplateRef<HTMLDivElement>("photonWrap");
const photonHeaderWrap = useTemplateRef<HTMLDivElement>("photonHeaderWrap");
const photonMessagesWrap = useTemplateRef<HTMLDivElement>("photonMessagesWrap");
const photonChipsWrap = useTemplateRef<HTMLDivElement>("photonChipsWrap");

defineExpose({
  photonWrap,
  photonHeaderWrap,
  photonMessagesWrap,
  photonChipsWrap,
});
</script>
