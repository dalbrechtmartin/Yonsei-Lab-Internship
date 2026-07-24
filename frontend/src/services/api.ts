const API_URL = import.meta.env.VITE_API_URL ?? "/api/";

export interface UploadExcelResponse {
  columns: string[];
  data: Record<string, unknown>[];
}

export type ModelChoice = "default" | "gemini-3.5-flash" | "gemini-3.5-flash-lite";

export type JobStatus =
  | "pending"
  | "running"
  | "done"
  | "quota_hit"
  | "error"
  | "interrupted";

export type JobFileStatusValue = "pending" | "processing" | "done" | "failed";

export interface JobFileStatus {
  id: string;
  filename: string;
  status: JobFileStatusValue;
  modelUsed: string | null;
  recordCount: number;
  errorReason: string | null;
}

export interface JobStatusResponse {
  jobId: string;
  status: JobStatus;
  modelChoice: ModelChoice;
  totalFiles: number;
  completedCount: number;
  errorMessage: string | null;
  files: JobFileStatus[];
}

export interface CreateJobResponse {
  jobId: string;
  totalFiles: number;
}

export class QuotaExceededError extends Error {}

function toJobStatusResponse(raw: any): JobStatusResponse {
  return {
    jobId: raw.job_id,
    status: raw.status,
    modelChoice: raw.model_choice,
    totalFiles: raw.total_files,
    completedCount: raw.completed_count,
    errorMessage: raw.error_message,
    files: (raw.files ?? []).map((f: any) => ({
      id: f.id,
      filename: f.filename,
      status: f.status,
      modelUsed: f.model_used,
      recordCount: f.record_count,
      errorReason: f.error_reason,
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
      if (!response.ok)
        throw new Error("Server error while uploading the file.");
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
  async extractPdfs(files: File[], model: ModelChoice): Promise<CreateJobResponse> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);
    formData.append("model", model);

    try {
      const response = await fetch(`${API_URL}extract-pdfs/`, {
        method: "POST",
        body: formData,
      });
      if (response.status === 429) {
        // Defensive fallback -- the primary quota signal is now a
        // 'quota_hit' job status discovered via polling, not this POST.
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
    if (!response.ok) throw new Error("Server error while checking job status.");
    return toJobStatusResponse(await response.json());
  },

  async downloadJobResult(jobId: string): Promise<{ blob: Blob; partial: boolean }> {
    const response = await fetch(`${API_URL}jobs/${jobId}/download`);
    if (!response.ok) throw new Error("Server error while downloading the result.");
    return {
      blob: await response.blob(),
      partial: response.headers.get("X-Extraction-Partial") === "true",
    };
  },

  async resumeJob(jobId: string): Promise<CreateJobResponse> {
    const response = await fetch(`${API_URL}jobs/${jobId}/resume`, { method: "POST" });
    if (!response.ok) throw new Error("Server error while resuming the job.");
    return toCreateJobResponse(await response.json());
  },
};
