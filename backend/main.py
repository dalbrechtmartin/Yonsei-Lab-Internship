import os
import json
import io
import time
from typing import Optional, cast, List

import fitz  # PyMuPDF
import polars as pl
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from google import genai

# --- 1. CONFIGURATION ---
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("API Key not found!")

client = genai.Client(api_key=api_key)

with open("prompt.txt", "r", encoding="utf-8") as f:
    PROMPT_TEMPLATE = f.read()

app = FastAPI(title="Wavelength FOM API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 2. HELPERS ---

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from the first 8 pages, with page markers so the LLM
    can reference which page a quote comes from."""
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for i, page in enumerate(doc[:8], start=1):
            text += f"\n\n=== PAGE {i} ===\n"
            text += cast(str, page.get_text("text"))
    return text


# Expected column order in the final Excel, aligned with prompt.txt
# (each value followed by its quote, Notes at the end)
COLUMN_ORDER = [
    "Ref",
    "Title",
    "Material Class",
    "Base Materials",
    "Layer Structure",
    "Spectral Range",
    "Method",
    "Wavelength-based FOM (/RIU)",
    "FOM Quote",
    "FOM Page",
    "Sensitivity (nm/RIU)",
    "Sensitivity Quote",
    "Sensitivity Page",
    "Q-factor",
    "Q-factor Quote",
    "Q-factor Page",
    "Notes",
]


def normalize_result(result: dict) -> dict:
    """Guarantees every row has exactly the expected columns, in the right
    order, even if the LLM forgot one (set to None)."""
    return {col: result.get(col) for col in COLUMN_ORDER}


def analyze_paper_with_llm(paper_text: str, filename: str) -> Optional[dict]:
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    try:
        response = client.models.generate_content(
            model='gemini-3.1-flash-lite',
            contents=final_prompt,
            config={"temperature": 0},
        )
        raw = (response.text or "").strip().replace("```json", "").replace("```", "")
        return json.loads(raw.strip())
    except Exception as e:
        print(f"Error for {filename}: {e}")
        return None

# --- 3. ROUTES ---

@app.post("/extract-pdfs/")
async def extract_data_from_pdfs(files: List[UploadFile] = File(...)):
    extracted_data: list[dict] = []

    for file in files:
        filename = file.filename
        if not filename or not filename.lower().endswith('.pdf'):
            continue

        print(f"Processing: {filename}...")

        # Clean filename: remove extension
        clean_name = filename.rsplit('.', 1)[0]

        pdf_content = await file.read()
        extracted_text = extract_text_from_pdf(pdf_content)

        result = analyze_paper_with_llm(extracted_text, clean_name)

        if result:
            extracted_data.append(normalize_result(result))

        # Stay within free-tier limits
        time.sleep(13)

    if not extracted_data:
        raise HTTPException(status_code=400, detail="No data extracted.")

    df = pl.DataFrame(extracted_data).select(COLUMN_ORDER)
    output = io.BytesIO()
    df.write_excel(output)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers={'Content-Disposition': 'attachment; filename="Gold_Standard_Data.xlsx"'}
    )