<template>
  <Tabs
    :model-value="modelValue"
    class="w-fit"
    @update:model-value="(v) => emit('update:modelValue', v as ReviewFilter)"
  >
    <TabsList class="h-auto justify-start gap-2 bg-transparent p-0">
      <TabsTrigger
        value="all"
        class="rounded-full border border-secondary/18 bg-transparent px-3 py-1 text-xs font-medium text-secondary shadow-none data-[state=active]:border-transparent data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-none"
      >
        {{ t("extraction.review.tabs.all", { count: counts.all }) }}
      </TabsTrigger>
      <TabsTrigger
        value="toConfirm"
        class="rounded-full border border-secondary/18 bg-transparent px-3 py-1 text-xs font-medium text-secondary shadow-none data-[state=active]:border-amber-500/30 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 data-[state=active]:shadow-none"
      >
        {{ t("extraction.review.tabs.toConfirm", { count: counts.toConfirm }) }}
      </TabsTrigger>
      <TabsTrigger
        value="excluded"
        class="rounded-full border border-secondary/18 bg-transparent px-3 py-1 text-xs font-medium text-secondary shadow-none data-[state=active]:border-secondary/25 data-[state=active]:bg-card data-[state=active]:text-ink data-[state=active]:shadow-none"
      >
        {{ t("extraction.review.tabs.excluded", { count: counts.excluded }) }}
      </TabsTrigger>
    </TabsList>
  </Tabs>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ReviewFilter } from "@/composables/useExtractionRecords";

defineProps<{
  modelValue: ReviewFilter;
  counts: { all: number; toConfirm: number; excluded: number };
}>();
const emit = defineEmits<{
  "update:modelValue": [filter: ReviewFilter];
}>();

const { t } = useI18n();
</script>
