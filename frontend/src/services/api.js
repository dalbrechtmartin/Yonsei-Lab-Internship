const API_URL = "http://localhost:8000/";

export const apiService = {
  async uploadExcel(file) {
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
};
