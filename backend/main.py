import io
from contextlib import asynccontextmanager
from typing import cast

import polars as pl
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware

import jobs
import llm
import state
from schema import COLUMN_ORDER


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Any job left 'running' from a killed previous process becomes
    # 'interrupted' here, so it doesn't look silently stuck forever.
    state.load_jobs_from_disk()
    yield


app = FastAPI(title="Wavelength FOM API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    # Custom response headers are hidden from browser JS unless explicitly
    # exposed, even with allow_origins=["*"].
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
    if job["status"] == "quota_hit" or any_file_failed:
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
    df = (
        pl.read_csv(io.BytesIO(content))
        if is_csv
        else pl.read_excel(io.BytesIO(content), engine="calamine")
    )
    return {"columns": df.columns, "data": df.to_dicts()}


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
    # "Completed" = no longer being worked on (succeeded OR failed) --
    # what a progress bar needs to show overall batch progress.
    completed_count = sum(1 for f in files if f["status"] in ("done", "failed"))

    return {
        "job_id": job["id"],
        "status": job["status"],
        "model_choice": job["model_choice"],
        "total_files": job["total_files"],
        "completed_count": completed_count,
        "error_message": job["error_message"],
        "files": [
            {
                "id": f["id"],
                "filename": f["filename"],
                "status": f["status"],
                "model_used": f["model_used"],
                "record_count": len(f.get("records") or []),
                "error_reason": f["error_reason"],
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


@app.post("/jobs/{job_id}/resume", status_code=202)
async def resume_job(job_id: str):
    job = _job_or_404(job_id)
    if job["status"] not in ("quota_hit", "interrupted", "error"):
        raise HTTPException(
            status_code=409,
            detail=f"Job status '{job['status']}' is not resumable.",
        )
    pending = state.list_job_files(job_id, status="pending")
    if not pending:
        raise HTTPException(status_code=400, detail="No pending files left to process.")

    # Give every model in the chain a fresh chance again rather than
    # reusing whatever was left exhausted last time -- there's no way to
    # programmatically check whether a model's quota has since reset.
    fresh_models = llm.build_available_models(job["model_choice"])
    state.set_available_models(job_id, fresh_models)

    jobs.start_job(job_id)
    return {"job_id": job_id, "total_files": job["total_files"]}


@app.get("/usage")
async def get_usage():
    return state.get_usage_summary()
