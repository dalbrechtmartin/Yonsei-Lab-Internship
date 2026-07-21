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
from google.genai import errors as genai_errors

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
    # Custom response headers are hidden from browser JS unless explicitly
    # exposed, even with allow_origins=["*"].
    expose_headers=["X-Extraction-Partial"],
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


# Expected column order in the final Excel, aligned with prompt.txt.
# One row per Mode/Case now (a paper can produce several rows).
# Note: "Review Status" (Approve/Edit/Exclude) is NOT generated here —
# that belongs to the Vue review workflow (Week 6-8), where the researcher
# actually makes that decision. Adding a hardcoded placeholder here would
# just be dead weight until that feature exists.
COLUMN_ORDER = [
    "Ref",
    "Title",
    "Mode/Case",
    "Material Class",
    "Base Materials",
    "Layer Structure",
    "Spectral Range",
    "Origin",
    "FOM Reported",
    "FOM Domain",
    "FOM Definition",
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
    "Model Used",
]


def normalize_result(result: dict) -> dict:
    """Guarantees every row has exactly the expected columns, in the right
    order, even if the LLM forgot one (set to None)."""
    return {col: result.get(col) for col in COLUMN_ORDER}


class QuotaExceededError(Exception):
    """Raised when Gemini's free-tier RPM/RPD quota is hit. Distinct from a
    one-off parsing/API failure: every subsequent call will fail the same
    way, so the caller should stop looping instead of burning the 13s sleep
    on doomed requests for the remaining files."""


def analyze_paper_with_llm(paper_text: str, filename: str) -> Optional[List[dict]]:
    """Returns a list of records (one per mode/case) for this paper,
    or None if the call/parsing failed."""
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    try:
        # gemini-flash-latest: auto-updates to the newest Flash model
        # (2-week notice before any swap). We log the resolved model name
        # below so that if results ever drift between runs, we can check
        # whether the underlying model actually changed.
        # temperature=0: deterministic output for a given model, so we can
        # still compare runs meaningfully as long as the model didn't change.
        # thinking_budget=0: flash models default to dynamic thinking, which
        # burns tens of seconds per call reasoning before answering. This is
        # a fixed-schema extraction task, not a reasoning task, so we don't
        # need it — disabling it cuts latency drastically.
        response = client.models.generate_content(
            model='gemini-flash-latest',
            contents=final_prompt,
            config={
                "temperature": 0,
                "thinking_config": {"thinking_budget": 0},
            },
        )
        resolved_model = getattr(response, "model_version", None)
        print(f"  -> Answered by model: {resolved_model}")
        raw = (response.text or "").strip().replace("```json", "").replace("```", "")
        parsed = json.loads(raw.strip())
        if isinstance(parsed, dict):
            parsed = [parsed]
        # Stamp every record with the model that actually answered, so
        # results stay traceable even if 'latest' resolves differently
        # across runs made on different days.
        for record in parsed:
            record["Model Used"] = resolved_model
        return parsed
    except genai_errors.ClientError as e:
        if e.code == 429:
            raise QuotaExceededError(str(e)) from e
        print(f"Error for {filename}: {e}")
        return None
    except Exception as e:
        print(f"Error for {filename}: {e}")
        return None

# --- 3. ROUTES ---

@app.post("/upload-excel/")
async def process_excel(file: UploadFile = File(...)):
    content = await file.read()
    df = pl.read_excel(io.BytesIO(content), engine="calamine")
    return {"columns": df.columns, "data": df.to_dicts()}

@app.post("/extract-pdfs/")
async def extract_data_from_pdfs(files: List[UploadFile] = File(...)):
    extracted_data: list[dict] = []
    quota_hit = False

    for file in files:
        filename = file.filename
        if not filename or not filename.lower().endswith('.pdf'):
            continue

        print(f"Processing: {filename}...")

        # Clean filename: remove extension
        clean_name = filename.rsplit('.', 1)[0]

        pdf_content = await file.read()
        extracted_text = extract_text_from_pdf(pdf_content)

        try:
            records = analyze_paper_with_llm(extracted_text, clean_name)
        except QuotaExceededError:
            # Every remaining file would fail the same way — stop here
            # instead of sleeping 13s per file for nothing.
            quota_hit = True
            break

        if records:
            extracted_data.extend(normalize_result(r) for r in records)

        # Stay within free-tier limits
        time.sleep(13)

    if not extracted_data:
        if quota_hit:
            raise HTTPException(
                status_code=429,
                detail="Gemini's free-tier quota (requests per minute/day) has been reached. Try again later or with fewer files.",
            )
        raise HTTPException(status_code=400, detail="No data extracted.")

    df = pl.DataFrame(extracted_data).select(COLUMN_ORDER)
    output = io.BytesIO()
    df.write_excel(output)
    output.seek(0)

    headers = {'Content-Disposition': 'attachment; filename="Gold_Standard_Data.xlsx"'}
    if quota_hit:
        # Some files were processed before the quota hit — tell the caller
        # this export is incomplete rather than staying silent about it.
        headers['X-Extraction-Partial'] = 'true'

    return StreamingResponse(
        output,
        media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        headers=headers,
    )