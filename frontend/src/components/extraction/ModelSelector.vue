<template>
  <div class="w-full">
    <p class="text-xs uppercase tracking-[0.3em] text-secondary">
      {{ t("extraction.modelSelector.title") }}
    </p>
    <p class="mt-1 text-sm text-secondary">
      {{ t("extraction.modelSelector.description") }}
    </p>

    <Select v-model="modelChoice">
      <SelectTrigger class="mt-2 w-full bg-card/80">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="default" :text-value="defaultTitle">
          {{ defaultTitle }}
          <template #description>
            <span class="text-xs leading-4 text-muted-foreground">
              {{ t("extraction.modelSelector.default.description") }}
            </span>
          </template>
        </SelectItem>

        <template v-if="tiers.flash.length">
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{{ t("extraction.modelSelector.group.flash") }}</SelectLabel>
            <SelectItem
              v-for="model in tiers.flash"
              :key="model"
              :value="model"
              :text-value="model"
            >
              {{ model }}
              <template v-if="model === recommendedModel" #suffix>
                <RecommendedBadge />
              </template>
              <template #description>
                <span class="text-xs leading-4 text-muted-foreground">
                  {{ t("extraction.modelSelector.pinned.description") }}
                </span>
              </template>
            </SelectItem>
          </SelectGroup>
        </template>

        <template v-if="tiers.flashLite.length">
          <SelectSeparator />
          <SelectGroup>
            <SelectLabel>{{ t("extraction.modelSelector.group.flashLite") }}</SelectLabel>
            <SelectItem
              v-for="model in tiers.flashLite"
              :key="model"
              :value="model"
              :text-value="model"
            >
              {{ model }}
              <template v-if="model === recommendedModel" #suffix>
                <RecommendedBadge />
              </template>
              <template #description>
                <span class="text-xs leading-4 text-muted-foreground">
                  {{ t("extraction.modelSelector.pinned.description") }}
                </span>
              </template>
            </SelectItem>
          </SelectGroup>
        </template>
      </SelectContent>
    </Select>

    <p class="mt-1.5 text-xs leading-5 text-secondary">
      {{
        isPinned
          ? t("extraction.modelSelector.pinned.description")
          : t("extraction.modelSelector.default.description")
      }}
    </p>
    <!-- Applies whether "Défaut" or a specific model is picked -- both now
         fall back through the rest of the chain if their first choice is
         unavailable/exhausted (see backend's llm.build_available_models),
         so both can land on a different model mid-batch. -->
    <p class="mt-1 text-xs leading-5 text-amber-700">
      {{ t("extraction.modelSelector.default.warning") }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiService, type ModelChoice } from "@/services/api";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    /** How many PDFs are currently staged (see the Déposer step) -- drives
     * which model gets the "Recommandé" badge (see
     * apiService.getModelOptions): a bigger batch is steered toward
     * whichever tier actually fits its remaining daily quota. */
    fileCount?: number;
  }>(),
  { fileCount: 0 },
);

const modelChoice = defineModel<ModelChoice>("modelChoice", {
  default: "default",
});

// Fetched live from the backend (see apiService.getModelOptions) instead of
// a hardcoded list -- Google ships new flash models every few weeks (see
// ai.google.dev/gemini-api/docs/changelog), so this stays current without a
// code change here. Already grouped by tier and capped to a short, current
// list server-side (see backend's llm.get_selectable_tiers) -- this
// component just renders whatever it's given.
const tiers = ref<{ flash: ModelChoice[]; flashLite: ModelChoice[] }>({
  flash: [],
  flashLite: [],
});
const defaultResolvesTo = ref<string | null>(null);
const recommendedModel = ref<string | null>(null);

async function refreshOptions() {
  const options = await apiService.getModelOptions(props.fileCount);
  tiers.value = options.tiers;
  defaultResolvesTo.value = options.defaultResolvesTo;
  recommendedModel.value = options.recommendedModel;
}

onMounted(refreshOptions);
// Re-fetched as files are added/removed on the Déposer step -- a small
// batch that fits comfortably in the flash tier's daily quota can outgrow
// it after a few more drops, at which point the recommendation (and what
// "Défaut" tries first) should shift to Flash Lite. Cheap: this reads a
// local usage log server-side, no Gemini quota spent checking.
watch(() => props.fileCount, refreshOptions);

// Small inline badge component (not worth its own file) marking whichever
// model apiService.getModelOptions currently recommends for this batch
// size -- shown next to a pinned choice, never next to "Défaut" itself
// (its own description already says it uses the best available model).
const RecommendedBadge = () =>
  h(
    "span",
    {
      class:
        "ml-1.5 inline-flex items-center rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700",
    },
    t("extraction.modelSelector.recommended"),
  );

// Hints at which concrete model "default" currently starts with -- the
// fallback chain itself always begins with the gemini-flash-latest alias,
// which doesn't expose what it resolves to, so this shows our own newest
// known flash model as a best-effort stand-in instead of leaving "Default"
// looking like it might be stuck on an old one.
const defaultTitle = computed(() => {
  const base = t("extraction.modelSelector.default.title");
  return defaultResolvesTo.value ? `${base} (${defaultResolvesTo.value})` : base;
});

const isPinned = computed(() => modelChoice.value !== "default");
</script>
