const API_URL = import.meta.env.VITE_API_URL ?? "/api/";

export interface UploadExcelResponse {
  columns: string[];
  data: Record<string, unknown>[];
}

export type ModelChoice =
  "default" | "gemini-3.5-flash" | "gemini-3.5-flash-lite";

// A job only ever sits in one of these three states now -- a file whose
// whole model chain fails (quota, timeout, ...) is deferred and retried
// automatically in the background (see the backend's jobs.py), so there's
// no "stuck, needs a click" state to represent here.
export type JobStatus = "pending" | "running" | "done";

export type JobFileStatusValue = "pending" | "processing" | "done" | "failed";

export interface JobFileStatus {
  id: string;
  filename: string;
  status: JobFileStatusValue;
  modelUsed: string | null;
  recordCount: number;
  errorReason: string | null;
  startedAt: string | null;
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

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  modelChoice: ModelChoice;
  totalFiles: number;
  completedCount: number;
  errorMessage: string | null;
  createdAt: string;
  notice: JobNotice | null;
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
  evidence: string | null;
  location: string | null;
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
  | "evidence"
  | "location"
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
    evidence: raw["Evidence"] ?? null,
    location: raw["Location"] ?? null,
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

export class QuotaExceededError extends Error {}

// Thrown when the uploaded workbook has more than one sheet -- the backend
// refuses these outright (see main.py's process_excel) rather than silently
// guessing which sheet the researcher meant, so this needs its own error
// type to show a specific message instead of the generic upload failure.
export class MultipleSheetsError extends Error {}

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
    files: (raw.files ?? []).map((f: any) => ({
      id: f.id,
      filename: f.filename,
      status: f.status,
      modelUsed: f.model_used,
      recordCount: f.record_count,
      errorReason: f.error_reason,
      startedAt: f.started_at,
    })),
  };
}

function toCreateJobResponse(raw: any): CreateJobResponse {
  return { jobId: raw.job_id, totalFiles: raw.total_files };
}

export const apiService = {
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

  async getFilePageCount(jobId: string, fileId: string): Promise<number> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/page-count`,
    );
    if (!response.ok)
      throw new Error("Server error while fetching the page count.");
    const body = await response.json();
    return body.total_pages;
  },

  /** Plain URL builder for an <img src> -- not a fetch wrapper, so it can't
   * report errors itself; the caller relies on the <img>'s own load/error
   * events. */
  getPdfPageUrl(jobId: string, fileId: string, pageNumber: number): string {
    return `${API_URL}jobs/${jobId}/files/${fileId}/pages/${pageNumber}`;
  },

  /** Locates a record's quoted Evidence text on its source page via the
   * PDF's real text layer, so the reviewer can jump straight to it instead
   * of hunting for it manually. `matches` (possibly empty, when the quote
   * doesn't appear verbatim) are in PDF point space, independent of render
   * DPI and zoom -- divide by pageWidth/pageHeight to get percentages. */
  async getEvidenceMatches(
    jobId: string,
    fileId: string,
    pageNumber: number,
    evidence: string,
  ): Promise<{ pageWidth: number; pageHeight: number; matches: number[][] }> {
    const response = await fetch(
      `${API_URL}jobs/${jobId}/files/${fileId}/pages/${pageNumber}/evidence-matches?q=${encodeURIComponent(evidence)}`,
    );
    if (!response.ok)
      throw new Error("Server error while searching for the evidence text.");
    const body = await response.json();
    return {
      pageWidth: body.page_width,
      pageHeight: body.page_height,
      matches: body.matches ?? [],
    };
  },
};
