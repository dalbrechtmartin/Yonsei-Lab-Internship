<template>
  <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">
    <div class="flex min-h-0 flex-1 flex-col gap-3.5 p-5 sm:p-7">
      <div class="flex flex-wrap items-center gap-2">
        <span
          class="inline-flex items-center rounded-full bg-primary px-3 py-1 text-xs font-medium text-white"
        >
          {{ t("extraction.export.preview", { count: records.length }) }}
        </span>
        <span
          class="ml-auto inline-flex items-center rounded-full bg-secondary/8 px-3 py-1 text-xs text-secondary"
        >
          {{ t("extraction.export.reviewedByLegend") }}
        </span>
      </div>

      <div
        class="min-h-0 flex-1 overflow-auto rounded-[10px] border border-secondary/14 bg-card/70"
      >
        <table class="w-full border-collapse text-sm">
          <thead class="sticky top-0 z-10 bg-card/95 backdrop-blur-xl">
            <tr class="border-b border-secondary/10">
              <th
                v-for="col in columns"
                :key="col.key"
                class="px-3 py-2 text-left text-[11px] font-semibold tracking-[0.04em] text-muted-foreground"
              >
                {{ t(col.labelKey) }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="record in records"
              :key="`${record.fileId}:${record.index}`"
              class="border-t border-secondary/10"
              :class="record.reviewStatus === 'Exclude' ? 'text-secondary/50 line-through' : ''"
            >
              <td class="px-3 py-2 text-ink">{{ record.ref || "—" }}</td>
              <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
                {{ record.resonanceWavelengthNm ?? "—" }}
              </td>
              <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
                {{ record.fomRiuInv ?? "—" }}
              </td>
              <td class="px-3 py-2 font-mono text-[12.5px] text-ink">
                {{ record.fwhmNm ?? "—" }}
              </td>
              <td class="px-3 py-2 text-secondary">{{ record.origin || "—" }}</td>
              <td class="px-3 py-2 text-xs text-secondary">
                {{ reviewedByLabel(record) }}
              </td>
            </tr>
            <tr v-if="!records.length">
              <td colspan="6" class="px-3 py-8 text-center text-sm text-secondary">
                {{ t("extraction.review.empty") }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div
      class="flex shrink-0 flex-col gap-3 border-t border-secondary/10 bg-card/55 p-5 sm:flex-row sm:items-center sm:p-7"
    >
      <div class="min-w-0 flex-1">
        <p class="text-sm font-semibold text-ink">
          {{
            t("extraction.export.summaryLine", {
              ready: readyCount,
              excluded: excludedCount,
              confirmed: confirmedCount,
            })
          }}
        </p>
        <p class="mt-0.5 text-xs text-secondary">
          {{ t("extraction.ready.heading") }}
        </p>
      </div>

      <input
        v-model="saveName"
        type="text"
        class="min-w-0 flex-1 rounded-lg border border-secondary/20 bg-card px-2 py-1.5 text-sm text-ink sm:max-w-60"
        :placeholder="defaultExportName"
      />

      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            class="flex items-center gap-1.5 rounded-lg border border-secondary/20 bg-card px-2.5 py-1.5 text-xs font-medium text-ink"
          >
            .{{ saveFormat }}
            <ChevronDown class="size-2.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem @select="saveFormat = 'xlsx'">.xlsx</DropdownMenuItem>
          <DropdownMenuItem @select="saveFormat = 'csv'">.csv</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button type="button" class="gap-1.5" :disabled="isSaving" @click="handleSaveClick">
        <Loader2 v-if="isSaving" class="size-3.5 animate-spin" />
        {{ t("extraction.ready.save") }}
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";
import { ChevronDown, Loader2 } from "@lucide/vue";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  apiService,
  type ExtractionRecord,
  type JobStatusResponse,
} from "@/services/api";
import { normalizeFilename } from "@/utils/exportFilename";
import { convertXlsxBlobToCsv, saveBlobWithPicker } from "@/utils/saveFile";
import { setIncomingVisualizationFile } from "@/composables/useIncomingVisualizationFile";

const props = defineProps<{
  job: JobStatusResponse;
  records: ExtractionRecord[];
  defaultExportName: string;
  partial: boolean;
}>();

const emit = defineEmits<{
  "save-success": [partial: boolean];
  "save-error": [];
  "visualize-error": [];
}>();

const { t } = useI18n();
const router = useRouter();

const columns: { key: string; labelKey: string }[] = [
  { key: "ref", labelKey: "extraction.review.table.columns.ref" },
  { key: "wavelength", labelKey: "extraction.review.table.columns.wavelength" },
  { key: "fom", labelKey: "extraction.review.table.columns.fom" },
  { key: "fwhm", labelKey: "extraction.review.table.columns.fwhm" },
  { key: "origin", labelKey: "extraction.review.table.columns.origin" },
  { key: "reviewedBy", labelKey: "extraction.export.reviewedByColumn" },
];

const saveName = ref(props.defaultExportName);
const saveFormat = ref<"xlsx" | "csv">("xlsx");
const isSaving = ref(false);

const readyCount = computed(
  () => props.records.filter((r) => r.reviewStatus !== "Exclude").length,
);
const excludedCount = computed(
  () => props.records.filter((r) => r.reviewStatus === "Exclude").length,
);
const confirmedCount = computed(
  () => props.records.filter((r) => r.reviewedAt).length,
);

function reviewedByLabel(record: ExtractionRecord): string {
  if (!record.reviewedAt) return t("extraction.review.reviewedBy.ai");
  const time = new Date(record.reviewedAt).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
  return t("extraction.review.reviewedBy.you", { time });
}

/** Once the save itself succeeds, hands the same result straight to the
 * visualization screen as if the researcher had dropped it there themselves
 * (see useIncomingVisualizationFile and VisualizationView's own onMounted)
 * -- no separate "Visualiser" click, so there's always a saved copy on disk
 * before moving on. Reuses the xlsx blob just fetched for the save instead
 * of downloading it again -- visualization always wants xlsx regardless of
 * which format was saved. A failure in that hand-off is reported separately
 * from a save failure, since the file is already safely saved either way. */
async function handleSaveClick() {
  isSaving.value = true;
  try {
    const { blob: xlsxBlob, partial } = await apiService.downloadJobResult(
      props.job.jobId,
    );
    const blob =
      saveFormat.value === "csv"
        ? await convertXlsxBlobToCsv(xlsxBlob)
        : xlsxBlob;
    const filename = normalizeFilename(
      saveName.value || props.defaultExportName,
      saveFormat.value,
    );
    await saveBlobWithPicker(blob, filename, saveFormat.value);
    emit("save-success", partial || props.partial);

    try {
      const vizFilename = normalizeFilename(props.defaultExportName, "xlsx");
      const file = new File([xlsxBlob], vizFilename, { type: xlsxBlob.type });
      setIncomingVisualizationFile(file);
      await router.push("/visualization");
    } catch (error) {
      console.error("Failed to load result into visualization:", error);
      emit("visualize-error");
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return; // user cancelled the save dialog -- leave the screen as-is
    }
    console.error("Failed to save job result:", error);
    emit("save-error");
  } finally {
    isSaving.value = false;
  }
}
</script>
