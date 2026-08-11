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
};
