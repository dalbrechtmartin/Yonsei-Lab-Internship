const API_URL = import.meta.env.VITE_API_URL ?? "/api/";

export interface UploadExcelResponse {
  columns: string[];
  data: Record<string, unknown>[];
}

// "default" is the only choice guaranteed to always exist (the
// fallback-walking chain, see backend's llm.build_fallback_chain); every
// other value is a concrete Gemini model id discovered live from Gemini's
// own catalog (GET /models, see backend's llm.get_model_choices) instead
// of a fixed union here -- Google ships new flash models every few weeks,
// so hardcoding their ids just means this file goes stale.
export type ModelChoice = string;

// Grouped, pre-capped model choices for the Déposer step's picker (see
// ModelSelector.vue) -- "flash" and "flash_lite" are shown as two separate
// short lists instead of one long flat one, already excluding preview and
// retired-generation ids (see backend's llm.get_selectable_tiers).
// defaultResolvesTo is a best-effort hint at which concrete model "default"
// currently starts with (gemini-flash-latest itself doesn't expose what it
// resolves to), purely informational.
// recommendedModel is which one currently best fits the staged batch size
// (see backend's llm.recommend_tier) -- "default" already starts with it,
// this is what earns a pinned choice its green "Recommandé" badge instead.
export interface ModelOptions {
  tiers: { flash: ModelChoice[]; flashLite: ModelChoice[] };
  defaultResolvesTo: string | null;
  recommendedModel: string | null;
}

// A job only ever sits in one of these three states now -- a file whose
// whole model chain fails (quota, timeout, ...) is deferred and retried
// automatically in the background (see the backend's jobs.py), so there's
// no "stuck, needs a click" state to represent here.
export type JobStatus = "pending" | "running" | "done";

export type JobFileStatusValue = "pending" | "processing" | "done" | "failed";

// A reason a single consensus run failed -- "quota" (429) or "unavailable"
// (503/timeout) are the ones worth calling out by name in the journal;
// "error" covers everything else. Mirrors backend's llm._classify_error.
export type JobRunReason = "quota" | "unavailable" | "error";

export interface JobFileRun {
  runIndex: number;
  model: string | null;
  outcome: "ok" | "error";
  reason: JobRunReason | null;
}

export interface JobFileStatus {
  id: string;
  filename: string;
  status: JobFileStatusValue;
  modelUsed: string | null;
  recordCount: number;
  errorReason: string | null;
  startedAt: string | null;
  // Per-run detail (up to 3: run1's fallback winner, then 2 pinned
  // reconciliation reruns) -- lets the journal explain a mid-file 429/503
  // instead of the file just looking stalled. See useExtractionEventLog.
  runs: JobFileRun[];
}

// A transient reason the job isn't just steadily processing right now --
// e.g. cooling down before the next automatic retry pass after every
// model failed for one or more files.
export type JobNoticeReason = "quota" | "unavailable" | "error";

export interface JobNotice {
  reason: JobNoticeReason;
  pendingCount: number;
  retryAt: string;
}

// One entry in the backend's persisted, human-readable job event log (see
// backend's state.append_job_event) -- the source of truth for the
// "Journal" panel (see useExtractionEventLog.ts). Unlike `files[].status`/
// `files[].runs`, this captures everything the backend does as it happens
// (each model attempt, retry, fallback switch, quota hit), not just the
// end state of a poll-to-poll diff -- a fast retry-then-success sequence
// between two 2.5s polls would otherwise never be visible at all.
export interface JobEvent {
  seq: number;
  atMs: number;
  level: "info" | "warn";
  key: string;
  params: Record<string, unknown>;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  modelChoice: ModelChoice;
  totalFiles: number;
  completedCount: number;
  errorMessage: string | null;
  createdAt: string;
  notice: JobNotice | null;
  events: JobEvent[];
  files: JobFileStatus[];
}

export interface CreateJobResponse {
  jobId: string;
  totalFiles: number;
}

// "Approve (AI)" and "Edit" are set by the model itself (see backend's
// prompt.txt); "Approve (Manual)" and "Exclude" (when set by a human, not
// the domain-relevance triage) only ever come from a reviewer's own
// Valider/Corriger/Exclure action.
export type ReviewStatus =
  | "Approve (AI)"
  | "Edit"
  | "Exclude"
  | "Approve (Manual)";

export interface ExtractionRecord {
  fileId: string;
  filename: string;
  index: number;
  ref: string | null;
  title: string | null;
  shortTitle: string | null;
  modeId: string | null;
  modeDescription: string | null;
  materialClass: string | null;
  baseMaterials: string | null;
  layerStructure: string | null;
  origin: string | null;
  domain: string | null;
  resonanceWavelengthNm: number | null;
  spectralRange: string | null;
  fomRiuInv: number | null;
  definition: string | null;
  sensitivityNmPerRiu: number | null;
  fwhmNm: number | null;
  qFactor: number | null;
  // The sensing medium/analyte the sensitivity was measured against (e.g.
  // "Air", "NaCl (aqueous)") -- see backend/prompts/extraction.txt. A plain
  // classification field, editable like Material Class/Origin; the actual
  // Gladstone-Dale/dn-dc conversion this can drive is a separate, explicit
  // reviewer action (see recomputeField below), never automatic.
  sensingMedium: string | null;
  // The pre-conversion value/unit and the formula applied, when either
  // resonanceWavelengthNm or sensitivityNmPerRiu required a conversion --
  // see backend/prompts/extraction.txt. Machine-authored, like
  // evidence/location, so excluded from EditableRecordFields below
  // (updated via the recompute flow, not a free-text edit).
  rawValue: string | null;
  conversionMethod: string | null;
  // Names any metric (currently only fwhmNm) the model computed from OTHER
  // extracted values instead of reading it directly from the paper (e.g.
  // "FWHM = Sensitivity / FOM") -- see backend/prompts/extraction.txt's
  // Calculated Fields rule. Non-null here always means reviewStatus "Edit"
  // (enforced server-side, see backend/schema.py's normalize_result).
  calculatedFields: string | null;
  evidence: string | null;
  location: string | null;
  // Which of THIS record's fields each Evidence/Location fragment supports
  // (e.g. "FOM (RIU^-1)" for the fragment that states the FOM value) -- see
  // backend/schema.py's COLUMN_ORDER and utils/parseLocation.ts's
  // parseEvidenceSources. Machine-only, like evidence/location, so excluded
  // from EditableRecordFields below. Null for a job extracted before this
  // field existed -- callers must treat that the same as "no field map
  // data", never crash or misattribute a fragment.
  evidenceFieldMap: string | null;
  reviewStatus: ReviewStatus;
  notes: string | null;
  reconciliationLog: string | null;
  modelUsed: string | null;
  // Set server-side the moment a human reviewer PATCHes this record (see
  // backend's state.set_record_review_status) -- null until then.
  reviewedAt: string | null;
}

// The subset of ExtractionRecord a "Corriger" edit may overwrite -- backed
// one-to-one by backend/schema.py's EDITABLE_RECORD_FIELDS allowlist.
export type EditableRecordFields = Omit<
  ExtractionRecord,
  | "fileId"
  | "filename"
  | "index"
  | "rawValue"
  | "conversionMethod"
  | "calculatedFields"
  | "evidence"
  | "location"
  | "evidenceFieldMap"
  | "reviewStatus"
  | "reconciliationLog"
  | "modelUsed"
  | "reviewedAt"
>;

// Single source of truth for the camelCase <-> COLUMN_ORDER-label mapping.
// These backend keys are NOT snake_case -- they're the literal display
// strings from backend/schema.py's COLUMN_ORDER (e.g. "Resonance Wavelength
// (nm)"), so the snake_case->camelCase convention the rest of this file
// uses (raw.foo_bar) doesn't apply here.
const RECORD_FIELD_KEYS: Record<keyof EditableRecordFields, string> = {
  ref: "Ref",
  title: "Title",
  shortTitle: "Short Title",
  modeId: "Mode ID",
  modeDescription: "Mode Description",
  materialClass: "Material Class",
  baseMaterials: "Base Materials",
  layerStructure: "Layer Structure",
  origin: "Origin",
  domain: "Domain",
  resonanceWavelengthNm: "Resonance Wavelength (nm)",
  spectralRange: "Spectral Range",
  fomRiuInv: "FOM (RIU^-1)",
  definition: "Definition",
  sensitivityNmPerRiu: "Sensitivity (nm/RIU)",
  fwhmNm: "FWHM (nm)",
  qFactor: "Q-factor",
  sensingMedium: "Sensing Medium",
  notes: "Notes",
};

function toExtractionRecord(
  raw: any,
  fileId: string,
  filename: string,
): ExtractionRecord {
  return {
    fileId,
    filename,
    index: raw.index,
    ref: raw["Ref"] ?? null,
    title: raw["Title"] ?? null,
    shortTitle: raw["Short Title"] ?? null,
    modeId: raw["Mode ID"] ?? null,
    modeDescription: raw["Mode Description"] ?? null,
    materialClass: raw["Material Class"] ?? null,
    baseMaterials: raw["Base Materials"] ?? null,
    layerStructure: raw["Layer Structure"] ?? null,
    origin: raw["Origin"] ?? null,
    domain: raw["Domain"] ?? null,
    resonanceWavelengthNm: raw["Resonance Wavelength (nm)"] ?? null,
    spectralRange: raw["Spectral Range"] ?? null,
    fomRiuInv: raw["FOM (RIU^-1)"] ?? null,
    definition: raw["Definition"] ?? null,
    sensitivityNmPerRiu: raw["Sensitivity (nm/RIU)"] ?? null,
    fwhmNm: raw["FWHM (nm)"] ?? null,
    qFactor: raw["Q-factor"] ?? null,
    sensingMedium: raw["Sensing Medium"] ?? null,
    rawValue: raw["Raw Value"] ?? null,
    conversionMethod: raw["Conversion Method"] ?? null,
    calculatedFields: raw["Calculated Fields"] ?? null,
    evidence: raw["Evidence"] ?? null,
    location: raw["Location"] ?? null,
    evidenceFieldMap: raw["Evidence Field Map"] ?? null,
    reviewStatus: raw["Review status"] ?? "Approve (AI)",
    notes: raw["Notes"] ?? null,
    reconciliationLog: raw["Reconciliation Log"] ?? null,
    modelUsed: raw["Model Used"] ?? null,
    reviewedAt: raw["Reviewed At"] ?? null,
  };
}

function toColumnFields(
  fields: Partial<EditableRecordFields>,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(fields) as (keyof EditableRecordFields)[]) {
    out[RECORD_FIELD_KEYS[key]] = fields[key];
  }
  return out;
}

// One entry per known gas/liquid reference the backend's
// sensing_medium_conversion registry can convert with, plus a generic
// "custom" pick per medium type -- see GET /sensing-medium-formulas.
export interface SensingMediumFormula {
  key: string;
  label: string;
  medium: "gas" | "liquid";
}

export class QuotaExceededError extends Error {}

// Thrown when the uploaded workbook has more than one sheet -- the backend
// refuses these outright (see main.py's process_excel) rather than silently
// guessing which sheet the researcher meant, so this needs its own error
// type to show a specific message instead of the generic upload failure.
export class MultipleSheetsError extends Error {}

// Backend event params are plain Python kwargs (snake_case, e.g.
// "max_attempts", "next_model") -- converted to camelCase here, once, so
// every other param the app already threads through vue-i18n (filename,
// model, count...) and these new ones share the same naming convention
// instead of the journal being a mix of the two styles.
function snakeParamsToCamel(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    out[camelKey] = value;
  }
  return out;
}

function toJobStatusResponse(raw: any): JobStatusResponse {
  return {
    jobId: raw.job_id,
    status: raw.status,
    modelChoice: raw.model_choice,
    totalFiles: raw.total_files,
    completedCount: raw.completed_count,
    errorMessage: raw.error_message,
    createdAt: raw.created_at,
    notice: raw.notice
      ? {
          reason: raw.notice.reason,
          pendingCount: raw.notice.pending_count,
          retryAt: raw.notice.retry_at,
        }
      : null,
    events: (raw.events ?? []).map((e: any) => ({
      seq: e.seq,
      atMs: Date.parse(e.at),
      level: e.level,
      key: e.key,
      params: snakeParamsToCamel(e.params ?? {}),
    })),
    files: (raw.files ?? []).map((f: any) => ({
      id: f.id,
      filename: f.filename,
      status: f.status,
      modelUsed: f.model_used,
      recordCount: f.record_count,
      errorReason: f.error_reason,
      startedAt: f.started_at,
      runs: (f.runs ?? []).map((r: any) => ({
        runIndex: r.run_index,
        model: r.model,
        outcome: r.outcome,
        reason: r.reason,
      })),
    })),
  };
}

function toCreateJobResponse(raw: any): CreateJobResponse {
  return { jobId: raw.job_id, totalFiles: raw.total_files };
}

export const apiService = {
  /** "default" plus every concrete model id Gemini currently exposes (see
   * ModelChoice) -- fetched fresh each time the Déposer step's model
   * picker mounts rather than cached client-side, so a newly released
   * model shows up without a redeploy. Falls back to just "default" if
   * the request fails, so a transient network error never blocks
   * launching an extraction. */
  /** `fileCount` (how many PDFs are currently staged, see the Déposer
   * step) drives which model gets the "Recommandé" badge -- a bigger
   * batch is steered toward the tier that fits its remaining daily quota
   * instead of the top flash-tier model regardless of size. Omit/0 when
   * nothing is staged yet. */
  async getModelOptions(fileCount = 0): Promise<ModelOptions> {
    const fallback: ModelOptions = {
      tiers: { flash: [], flashLite: [] },
      defaultResolvesTo: null,
      recommendedModel: null,
    };
    try {
      const response = await fetch(`${API_URL}models?file_count=${fileCount}`);
      if (!response.ok) throw new Error("Server error while fetching model options.");
      const body = await response.json();
      return {
        tiers: {
          flash: Array.isArray(body.tiers?.flash) ? body.tiers.flash : [],
          flashLite: Array.isArray(body.tiers?.flash_lite) ? body.tiers.flash_lite : [],
        },
        defaultResolvesTo: body.default_resolves_to ?? null,
        recommendedModel: body.recommended_model ?? null,
      };
    } catch (error) {
      console.error("API Error:", error);
      return fallback;
    }
  },

  async uploadExcel(file: File): Promise<UploadExcelResponse> {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}upload-excel/`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        if (response.status === 400) {
          const body = await response.json().catch(() => null);
          if (body?.detail === "multiple_sheets") {
            throw new MultipleSheetsError(
              "This workbook has more than one sheet.",
            );
          }
        }
        throw new Error("Server error while uploading the file.");
      }
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  /**
   * Best-effort AI reformat of an already-parsed sheet (see uploadExcel)
   * onto the columns the visualization needs -- called only when
   * needsAiConversion() (utils/columnTypes.ts) flags the uploaded sheet as
   * missing them. Throws on a 422 (Gemini couldn't produce a usable
   * mapping) same as any other failure -- the caller treats both as a
   * rejected conversion.
   */
  async convertExcel(
    columns: string[],
    data: Record<string, unknown>[],
  ): Promise<UploadExcelResponse> {
    try {
      const response = await fetch(`${API_URL}convert-excel/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ columns, data }),
      });
      if (!response.ok)
        throw new Error("Server error while converting the file.");
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  /**
   * Submits PDFs for extraction and returns immediately with a job id --
   * processing happens in the background, one file at a time, with
   * progress available via getJobStatus() and the final .xlsx fetched
   * separately via downloadJobResult() once the job reaches 'done'.
   */
  async extractPdfs(
    files: File[],
    model: ModelChoice,
  ): Promise<CreateJobResponse> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    formData.append("model", model);

    try {
      const response = await fetch(`${API_URL}extract-pdfs/`, {
        method: "POST",
        body: formData,
      });
      if (response.status === 429) {
        // Defensive fallback for a quota hit before the job could even
        // be created -- once running, per-file quota hits are retried
        // automatically in the background instead of surfacing here.
        throw new QuotaExceededError("Gemini quota exceeded.");
      }
      if (!response.ok)
        throw new Error("Server error while submitting the PDFs.");
      return toCreateJobResponse(await response.json());
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },

  /** Best-effort per-file page count for PDFs staged on the Déposer step,
   * before any job exists -- purely informational for the staged file
   * cards, so a failure here should never block launching the extraction. */
  async getPdfPageCounts(files: File[]): Promise<(number | null)[]> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    const response = await fetch(`${API_URL}pdfs/page-counts`, {
      method: "POST",
      body: formData,
    });
    if (!response.ok)
      throw new Error("Server error while counting PDF pages.");
    const raw = await response.json();
    return raw.page_counts;
  },

  async getJobStatus(jobId: string): Promise<JobStatusResponse> {
    const response = await fetch(`${API_URL}jobs/${jobId}/status`);
    if (!response.ok)
      throw new Error("Server error while checking job status.");
    return toJobStatusResponse(await response.json());
  },

  async downloadJobResult(
    jobId: string,
  ): Promise<{ blob: Blob; partial: boolean }> {
    const response = await fetch(`${API_URL}jobs/${jobId}/download`);
    if (!response.ok)
      throw new Error("Server error while downloading the result.");
    return {
      blob: await response.blob(),
      partial: response.headers.get("X-Extraction-Partial") === "true",
    };
  },

  async getFileRecords(
    jobId: string,
    fileId: string,
  ): Promise<{ fileId: string; filename: string; records: ExtractionRecord[] }> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/records`,
    );
    if (!response.ok)
      throw new Error("Server error while fetching extracted records.");
    const body = await response.json();
    return {
      fileId: body.file_id,
      filename: body.filename,
      records: (body.records ?? []).map((r: any) =>
        toExtractionRecord(r, body.file_id, body.filename),
      ),
    };
  },

  /**
   * Sets a record's review status (Valider/Exclure) and, for a "Corriger"
   * edit, its corrected field values in the same call -- a human who just
   * fixed a value has implicitly verified it, so no separate Valider
   * follow-up is required. `filename` is threaded through purely to
   * rebuild a client-side ExtractionRecord; the backend response itself
   * doesn't carry it.
   */
  async updateRecordReviewStatus(
    jobId: string,
    fileId: string,
    filename: string,
    recordIndex: number,
    status: ReviewStatus,
    fields?: Partial<EditableRecordFields>,
  ): Promise<ExtractionRecord> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/records/${recordIndex}/review-status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          ...(fields ? { fields: toColumnFields(fields) } : {}),
        }),
      },
    );
    if (!response.ok)
      throw new Error("Server error while updating the record's review status.");
    const body = await response.json();
    return toExtractionRecord(body.record, fileId, filename);
  },

  /** Formula options for the review screen's "recompute sensitivity"
   * picker -- fetched once and cached client-side by the caller, since the
   * registry never changes at runtime. Falls back to an empty list on
   * failure, same reasoning as getModelOptions: a transient network error
   * should just hide the recompute feature, not break the review screen. */
  async getSensingMediumFormulas(): Promise<SensingMediumFormula[]> {
    try {
      const response = await fetch(`${API_URL}sensing-medium-formulas`);
      if (!response.ok) throw new Error("Server error while fetching sensing medium formulas.");
      const body = await response.json();
      return (body.formulas ?? []).map((f: any) => ({
        key: f.key,
        label: f.label,
        medium: f.medium,
      }));
    } catch (error) {
      console.error("API Error:", error);
      return [];
    }
  },

  /**
   * Deterministically recomputes one of FOM/Sensitivity/FWHM -- never calls
   * the LLM, so a reviewer can try a different formula/value as many times
   * as needed (see ExtractionReviewDetail's recompute panels). Two
   * independent `payload.method`s: "sensing_medium" (Sensitivity only, the
   * gas/liquid raw-value conversion that already existed) and
   * "fom_relation" (any of the three, algebraic solve from the record's own
   * stated Definition -- see backend/fom_relations.py). `method: null` is
   * the explicit "clear this value, don't guess" choice. Throws with the
   * backend's own message (e.g. an unrecognized unit, or a Definition that
   * isn't a recognized relation) rather than a generic one, since that
   * detail is what tells the reviewer what to try instead.
   */
  async recomputeField(
    jobId: string,
    fileId: string,
    filename: string,
    recordIndex: number,
    targetField: "fomRiuInv" | "sensitivityNmPerRiu" | "fwhmNm",
    payload: {
      method: "sensing_medium" | "fom_relation" | null;
      formulaKey?: string | null;
      rawMagnitude?: number | null;
      rawUnit?: string | null;
      customConstant?: number | null;
      fom?: number | null;
      sensitivity?: number | null;
      fwhm?: number | null;
    },
  ): Promise<ExtractionRecord> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/records/${recordIndex}/recompute-field`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target_field: RECORD_FIELD_KEYS[targetField],
          method: payload.method,
          formula_key: payload.formulaKey ?? null,
          raw_magnitude: payload.rawMagnitude ?? null,
          raw_unit: payload.rawUnit ?? null,
          custom_constant: payload.customConstant ?? null,
          fom: payload.fom ?? null,
          sensitivity: payload.sensitivity ?? null,
          fwhm: payload.fwhm ?? null,
        }),
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || "Server error while recomputing this field.");
    }
    const body = await response.json();
    return toExtractionRecord(body.record, fileId, filename);
  },

  /**
   * Single-level undo/redo for recomputeField above -- replays a snapshot
   * of the fields a recompute call could have touched (see backend's
   * RECOMPUTE_TOUCHED_FIELDS) to either undo or redo one such action. Unlike
   * updateRecordReviewStatus's `fields`, these are the raw COLUMN_ORDER
   * label strings (e.g. "Sensitivity (nm/RIU)"), not camelCase -- this is a
   * verbatim snapshot replay, not a normal field edit (see
   * useExtractionRecords' commitRecompute/undoRecompute/redoRecompute).
   */
  async restoreRecomputeFields(
    jobId: string,
    fileId: string,
    filename: string,
    recordIndex: number,
    fields: Record<string, unknown>,
  ): Promise<ExtractionRecord> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/records/${recordIndex}/restore-recompute-fields`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields }),
      },
    );
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new Error(body?.detail || "Server error while restoring this record.");
    }
    const body = await response.json();
    return toExtractionRecord(body.record, fileId, filename);
  },

  async getFilePageCount(jobId: string, fileId: string): Promise<number> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/page-count`,
    );
    if (!response.ok)
      throw new Error("Server error while fetching the page count.");
    const body = await response.json();
    return body.total_pages;
  },

  /** One entry per physical page (null where the PDF has no distinct
   * printed label for it) -- see backend's _decode_page_labels. Used to
   * annotate the viewer's page badge and a record's Location text with
   * what's actually printed on the page, since the app's own navigation
   * stays physical-index-based everywhere else. */
  async getPageLabels(jobId: string, fileId: string): Promise<(string | null)[]> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/page-labels`,
    );
    if (!response.ok)
      throw new Error("Server error while fetching the page labels.");
    const body = await response.json();
    return body.labels ?? [];
  },

  /** Plain URL builder for an <img src> -- not a fetch wrapper, so it can't
   * report errors itself; the caller relies on the <img>'s own load/error
   * events. */
  getPdfPageUrl(jobId: string, fileId: string, pageNumber: number): string {
    return `${API_URL}jobs/${jobId}/files/${fileId}/pages/${pageNumber}`;
  },

  /** Locates every one of a record's quoted Evidence fragments on a single
   * page via the PDF's real text layer, in one round trip -- so the
   * reviewer's own multiple citations can all be shown at once (a light
   * tint for "a citation lives here", an accent for whichever one is
   * currently selected) without one query per source racing another.
   * `quotes` is positional: `matchesByQuery[i]` is the rect list for
   * `quotes[i]` (possibly empty, when that quote doesn't appear verbatim).
   * Rects are in PDF point space, independent of render DPI and zoom --
   * divide by pageWidth/pageHeight to get percentages.
   *
   * `focusValues`, when given, is a same-length parallel array -- a
   * non-null `focusValues[i]` additionally pinpoints that one value's own
   * location within `quotes[i]`'s own passage (e.g. "2877" within a
   * sentence that also reports the wavelength and sensitivity), so a
   * per-field "jump to source" click can highlight just that number instead
   * of the whole shared sentence. `focusByQuery[i]` is empty when no focus
   * was given for that quote or none was found -- the caller should fall
   * back to `matchesByQuery[i]` in that case, never treat it as an error. */
  async getEvidencePageMatches(
    jobId: string,
    fileId: string,
    pageNumber: number,
    quotes: string[],
    focusValues?: (string | null)[],
  ): Promise<{
    pageWidth: number;
    pageHeight: number;
    matchesByQuery: number[][][];
    focusByQuery: number[][][];
  }> {
    const params = new URLSearchParams();
    quotes.forEach((q) => params.append("q", q));
    (focusValues ?? quotes.map(() => "")).forEach((f) => params.append("focus", f ?? ""));
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/pages/${pageNumber}/evidence-matches?${params.toString()}`,
    );
    if (!response.ok)
      throw new Error("Server error while searching for the evidence text.");
    const body = await response.json();
    return {
      pageWidth: body.page_width,
      pageHeight: body.page_height,
      matchesByQuery: body.matches_by_query ?? [],
      focusByQuery: body.focus_by_query ?? [],
    };
  },

  /** Document-wide, literal text search (the review viewer's Ctrl+F) --
   * unlike getEvidencePageMatches (word-chunk fallback for a paraphrased
   * citation), this only ever returns exact matches of what the reviewer
   * typed, across every page. Only pages with a hit come back. `matches`
   * are in PDF point space, same as getEvidencePageMatches. */
  async searchDocument(
    jobId: string,
    fileId: string,
    query: string,
  ): Promise<{ page: number; pageWidth: number; pageHeight: number; matches: number[][] }[]> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/search?q=${encodeURIComponent(query)}`,
    );
    if (!response.ok)
      throw new Error("Server error while searching the document.");
    const body = await response.json();
    return (body.results ?? []).map((r: any) => ({
      page: r.page,
      pageWidth: r.page_width,
      pageHeight: r.page_height,
      matches: r.matches ?? [],
    }));
  },
};
