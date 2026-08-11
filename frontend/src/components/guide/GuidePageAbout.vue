<template>
  <!-- ============================= PAGE 20 -- About the author (colophon) ============================= -->
  <!-- Deliberately quiet: no GuideHeader/GuideFooter (this is the book's
       colophon, not another chapter page), no photo, no profile chips --
       a centered block of continuous prose between two thin rules, with
       the signature bottom-right, per the handoff brief's own direction. -->
  <section
    class="guide-page box-border flex h-[297mm] w-[210mm] flex-col bg-white p-[18mm]"
    :data-outline-title="t('guide.outline.about')"
  >
    <div class="flex-1" />
    <div
      class="mx-auto flex max-w-md flex-col items-center gap-4 text-center"
    >
      <div class="h-px w-16 bg-border" />
      <p
        class="text-xs font-semibold tracking-[0.3em] text-secondary uppercase"
      >
        {{ t("guide.about.eyebrow") }}
      </p>
      <p class="text-sm leading-relaxed text-ink">
        {{ t("guide.about.body") }}
      </p>
      <p class="text-sm leading-relaxed text-ink">
        {{ t("guide.about.supervision") }}
      </p>
      <div class="h-px w-16 bg-border" />
    </div>
    <div class="flex-1" />
    <p class="self-end text-sm text-secondary italic">
      {{ t("guide.about.signoff") }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>
