const API_URL = "http://localhost:8000/";

export interface UploadExcelResponse {
  columns: string[];
  data: Record<string, unknown>[];
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
   * Sends one or more PDFs to /extract-pdfs/. The backend responds with a
   * StreamingResponse (an .xlsx file), not JSON, so this returns the raw
   * Blob for the caller to download or read further if needed.
   */
  async extractPdfs(files: File[]): Promise<Blob> {
    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    try {
      const response = await fetch(`${API_URL}extract-pdfs/`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok)
        throw new Error("Server error while extracting the PDFs.");
      return await response.blob();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  },
};