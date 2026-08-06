import io
from contextlib import asynccontextmanager
from typing import Any, cast

import polars as pl
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import jobs
import llm
import state
from schema import COLUMN_ORDER, VIZ_COLUMN_ORDER, normalize_viz_result


@asynccontextmanager
async def lifespan(app: FastAPI):
    for job_id in state.load_jobs_from_disk():
        jobs.start_job(job_id)
    yield


app = FastAPI(title="Wavelength FOM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Extraction-Partial"],
)


def _job_or_404(job_id: str) -> dict:
    job = state.get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found.")
    return job


def _build_xlsx_response(job: dict) -> StreamingResponse:
    records = state.get_job_records(job["id"])
    if not records:
        raise HTTPException(status_code=400, detail="No data extracted.")

    df = pl.DataFrame(records).select(COLUMN_ORDER)
    output = io.BytesIO()
    df.write_excel(output)
    output.seek(0)

    any_file_failed = any(f["status"] == "failed" for f in state.list_job_files(job["id"]))
    headers = {"Content-Disposition": 'attachment; filename="Gold_Standard_Data.xlsx"'}
    if any_file_failed:
        headers["X-Extraction-Partial"] = "true"

    return StreamingResponse(
        output,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


# --- ROUTES ---
@app.post("/upload-excel/")
async def process_excel(file: UploadFile = File(...)):
    content = await file.read()
    is_csv = (file.filename or "").lower().endswith(".csv")
    if is_csv:
        df = pl.read_csv(io.BytesIO(content))
    else:
        # sheet_id=0 loads every sheet as a {name: DataFrame} dict in a single
        # parse -- used here purely to detect a multi-sheet workbook, which we
        # reject outright rather than silently guessing which sheet the
        # researcher meant (see project.pdf: only one file/sheet in at a time).
        sheets = pl.read_excel(io.BytesIO(content), engine="calamine", sheet_id=0)
        if len(sheets) > 1:
            raise HTTPException(status_code=400, detail="multiple_sheets")
        df = next(iter(sheets.values()))
    return {"columns": df.columns, "data": df.to_dicts()}


class ConvertExcelRequest(BaseModel):
    columns: list[str]
    data: list[dict[str, Any]]


@app.post("/convert-excel/")
async def convert_excel(body: ConvertExcelRequest):
    """Best-effort remaps an already-parsed, non-standard spreadsheet (see
    process_excel above) onto VIZ_COLUMN_ORDER via Gemini, so the frontend
    can still visualize a file that doesn't already carry the expected
    columns (see frontend's needsAiConversion). Raises a 422 rather than a
    generic 500 when conversion genuinely fails, since that's a normal,
    user-facing outcome here (an unreadable/unrelated file), not a bug.
    """
    if not body.data:
        raise HTTPException(status_code=400, detail="No data to convert.")
    try:
        converted = llm.convert_table_to_viz_schema(body.columns, body.data)
    except llm.ModelChainExhaustedError:
        raise HTTPException(
            status_code=422,
            detail="Could not convert this file to the expected format.",
        )
    records = [normalize_viz_result(r) for r in converted]
    return {"columns": VIZ_COLUMN_ORDER + ["Spectral Range"], "data": records}


@app.post("/extract-pdfs/", status_code=202)
async def extract_data_from_pdfs(
    files: list[UploadFile] = File(...),
    model: str = Form("default"),
):
    if model not in llm.MODEL_CHOICES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model}'. Expected one of {llm.MODEL_CHOICES}.",
        )

    pdf_files = [f for f in files if f.filename and f.filename.lower().endswith(".pdf")]
    if not pdf_files:
        raise HTTPException(status_code=400, detail="No PDF files provided.")

    filenames = [cast(str, f.filename).rsplit(".", 1)[0] for f in pdf_files]
    available_models = llm.build_available_models(model)
    job = state.create_job(model, available_models, filenames)

    job_files = state.list_job_files(job["id"])
    for job_file, upload in zip(job_files, pdf_files):
        content = await upload.read()
        with open(job_file["pdf_path"], "wb") as f:
            f.write(content)

    jobs.start_job(job["id"])
    return {"job_id": job["id"], "total_files": job["total_files"]}


@app.get("/jobs/{job_id}/status")
async def get_job_status(job_id: str):
    job = _job_or_404(job_id)
    files = state.list_job_files(job_id)
    completed_count = sum(1 for f in files if f["status"] in ("done", "failed"))

    return {
        "job_id": job["id"],
        "status": job["status"],
        "model_choice": job["model_choice"],
        "total_files": job["total_files"],
        "completed_count": completed_count,
        "error_message": job["error_message"],
        "created_at": job["created_at"],
        "notice": job.get("notice"),
        "files": [
            {
                "id": f["id"],
                "filename": f["filename"],
                "status": f["status"],
                "model_used": f["model_used"],
                "record_count": len(f.get("records") or []),
                "error_reason": f["error_reason"],
                "started_at": f.get("started_at"),
            }
            for f in files
        ],
    }


@app.get("/jobs/{job_id}/download")
async def download_job_result(job_id: str):
    job = _job_or_404(job_id)
    if job["status"] in ("pending", "running"):
        raise HTTPException(status_code=409, detail="Job is still processing.")
    return _build_xlsx_response(job)



@app.get("/jobs/{job_id}/files/{file_id}/records")
async def get_file_records(job_id: str, file_id: str):
    """Returns one file's reconciled records with their positional index,
    so a review UI can address a specific record via the PATCH endpoint
    below without needing to parse the downloaded xlsx."""
    _job_or_404(job_id)
    files_by_id = {f["id"]: f for f in state.list_job_files(job_id)}
    job_file = files_by_id.get(file_id)
    if job_file is None:
        raise HTTPException(status_code=404, detail="File not found.")
    records = job_file.get("records") or []
    return {
        "file_id": file_id,
        "filename": job_file["filename"],
        "records": [{"index": i, **r} for i, r in enumerate(records)],
    }


# The model itself only ever emits "Approve (AI)", "Edit", or "Exclude"
# (see prompt.txt) -- "Approve (Manual)" is reserved for a human
# reviewer confirming a value after checking an "Edit"-flagged record,
# which is what this endpoint is for. Re-flagging back to "Edit" or
# "Exclude" is also allowed, so a reviewer can walk a decision back.
MANUAL_REVIEW_STATUSES = {"Approve (Manual)", "Edit", "Exclude"}


class ReviewStatusUpdate(BaseModel):
    status: str


@app.patch("/jobs/{job_id}/files/{file_id}/records/{record_index}/review-status")
async def update_record_review_status(
    job_id: str, file_id: str, record_index: int, body: ReviewStatusUpdate
):
    _job_or_404(job_id)
    if body.status not in MANUAL_REVIEW_STATUSES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown status '{body.status}'. Expected one of {sorted(MANUAL_REVIEW_STATUSES)}.",
        )
    try:
        record = state.set_record_review_status(job_id, file_id, record_index, body.status)
    except (KeyError, IndexError):
        raise HTTPException(status_code=404, detail="File or record not found.")
    return {"record": record}


@app.get("/usage")
async def get_usage():
    return state.get_usage_summary()
