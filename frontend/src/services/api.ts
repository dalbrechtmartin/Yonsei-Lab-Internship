const API_URL = import.meta.env.VITE_API_URL ?? "/api/";

export interface UploadExcelResponse {
  columns: string[];
  data: Record<string, unknown>[];
}

export interface ExtractPdfsResult {
  blob: Blob;
  /** True when Gemini's quota was hit partway through — the export only
   * covers the files processed before that happened. */
  partial: boolean;
}

export class QuotaExceededError extends Error {}

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
   * Sends one or more PDFs to /extract-pdfs/. The backend responds with a
   * StreamingResponse (an .xlsx file), not JSON, so this returns the raw
   * Blob for the caller to download or read further if needed.
   */
  async extractPdfs(files: File[]): Promise<ExtractPdfsResult> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    try {
      const response = await fetch(`${API_URL}extract-pdfs/`, {
        method: "POST",
        body: formData,
      });
      if (response.status === 429) {
        throw new QuotaExceededError("Gemini quota exceeded.");
      }
      if (!response.ok)
        throw new Error("Server error while extracting the PDFs.");
      return {
        blob: await response.blob(),
        partial: response.headers.get("X-Extraction-Partial") === "true",
      };
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },
};