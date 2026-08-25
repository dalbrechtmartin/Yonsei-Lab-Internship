import asyncio
import io
import logging
from contextlib import asynccontextmanager
from typing import Any, cast

import fitz  # PyMuPDF
import polars as pl
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

import jobs
import llm
import state
from schema import COLUMN_ORDER, EDITABLE_RECORD_FIELDS, VIZ_COLUMN_ORDER, normalize_viz_result

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


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


def _job_file_or_404(job_id: str, file_id: str) -> dict:
    _job_or_404(job_id)
    files_by_id = {f["id"]: f for f in state.list_job_files(job_id)}
    job_file = files_by_id.get(file_id)
    if job_file is None:
        raise HTTPException(status_code=404, detail="File not found.")
    return job_file


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
    except llm.ModelChainExhaustedError as e:
        raise HTTPException(
            status_code=422,
            detail="Could not convert this file to the expected format.",
        ) from e
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
    for job_file, upload in zip(job_files, pdf_files, strict=True):
        content = await upload.read()
        with open(job_file["pdf_path"], "wb") as f:
            f.write(content)

    jobs.start_job(job["id"])
    return {"job_id": job["id"], "total_files": job["total_files"]}


@app.post("/pdfs/page-counts")
async def get_pdf_page_counts(files: list[UploadFile] = File(...)):
    """Best-effort page count for each staged PDF, called before a job even
    exists -- see the Déposer step's file cards. A file that isn't actually
    a readable PDF gets `null` rather than failing the whole batch."""

    async def _count_one(upload: UploadFile) -> int | None:
        content = await upload.read()

        def _count() -> int:
            with fitz.open(stream=content, filetype="pdf") as doc:
                return doc.page_count

        try:
            return await asyncio.to_thread(_count)
        except Exception:
            return None

    return {"page_counts": [await _count_one(f) for f in files]}


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
    job_file = _job_file_or_404(job_id, file_id)
    records = job_file.get("records") or []
    return {
        "file_id": file_id,
        "filename": job_file["filename"],
        "records": [{"index": i, **r} for i, r in enumerate(records)],
    }


@app.get("/jobs/{job_id}/files/{file_id}/page-count")
async def get_file_page_count(job_id: str, file_id: str):
    """Total page count of the source PDF, so a review UI can render a
    "p. X / Y" indicator and disable next-page navigation at the bound --
    the page-image endpoint below is a plain <img src> URL, not a fetch
    response a caller could otherwise read a header off of."""
    job_file = _job_file_or_404(job_id, file_id)

    def _count() -> int:
        with fitz.open(job_file["pdf_path"]) as doc:
            return doc.page_count

    return {"total_pages": await asyncio.to_thread(_count)}


@app.get("/jobs/{job_id}/files/{file_id}/pages/{page_number}")
async def get_file_page_image(job_id: str, file_id: str, page_number: int):
    """Renders one page of the source PDF as a PNG, so a review UI can show
    the researcher the actual page a value was extracted from alongside its
    quoted `Evidence` text -- there's no bounding-box data to highlight the
    exact cell, only the page itself."""
    job_file = _job_file_or_404(job_id, file_id)

    def _render() -> bytes:
        with fitz.open(job_file["pdf_path"]) as doc:
            if page_number < 1 or page_number > doc.page_count:
                raise HTTPException(status_code=404, detail="Page not found.")
            # 220dpi rather than fitz's 96dpi default -- stays legible for a
            # dense scientific paper's small table text even when the
            # reviewer zooms in past 100% in the frontend.
            pix = doc[page_number - 1].get_pixmap(dpi=220)
            return pix.tobytes("png")

    png_bytes = await asyncio.to_thread(_render)
    return Response(content=png_bytes, media_type="image/png")


# Word-chunk size for the fallback search below -- small enough that a
# single hyphenated word break only takes out the one chunk straddling it,
# large enough that the highlight doesn't fragment into a highlighter
# stipple across the whole passage.
_EVIDENCE_CHUNK_WORDS = 6


def _find_evidence_rects(page: fitz.Page, text: str) -> list[fitz.Rect]:
    """Locates a record's quoted `Evidence` text on its source page via
    PyMuPDF's real text-layer search -- not an LLM-guessed bounding box (the
    inaccuracy that made pixel-exact highlighting out of scope earlier),
    just a deterministic substring search against the actual PDF text."""
    needle = " ".join(text.split())
    if not needle:
        return []
    hits = page.search_for(needle)
    if hits:
        return hits
    # The full citation most often fails to match verbatim because of one
    # word hyphenated across a line break (e.g. "the in-\nternal"), which
    # the text layer never spells out as a contiguous string. Chopping the
    # quote into short word-chunks and searching each independently means
    # only the one chunk straddling the break goes unmatched -- every other
    # chunk still lights up, covering most of the passage instead of
    # collapsing to a single short leading fragment.
    words = needle.split(" ")
    rects: list[fitz.Rect] = []
    for i in range(0, len(words), _EVIDENCE_CHUNK_WORDS):
        chunk = " ".join(words[i : i + _EVIDENCE_CHUNK_WORDS])
        rects.extend(page.search_for(chunk))
    return rects


@app.get("/jobs/{job_id}/files/{file_id}/pages/{page_number}/evidence-matches")
async def get_evidence_matches(job_id: str, file_id: str, page_number: int, q: str):
    """So the review UI can jump straight to a record's cited passage
    instead of making the researcher hunt for it on the page themselves.
    Returns match rectangles in PDF point space (independent of render DPI
    and of the frontend's zoom level) alongside the page's own point-space
    size, so the frontend can convert to a percentage-based overlay that
    stays correctly positioned at any zoom."""
    job_file = _job_file_or_404(job_id, file_id)

    def _search() -> dict:
        with fitz.open(job_file["pdf_path"]) as doc:
            if page_number < 1 or page_number > doc.page_count:
                raise HTTPException(status_code=404, detail="Page not found.")
            page = doc[page_number - 1]
            rects = _find_evidence_rects(page, q)
            return {
                "page_width": page.rect.width,
                "page_height": page.rect.height,
                "matches": [[r.x0, r.y0, r.x1, r.y1] for r in rects],
            }

    return await asyncio.to_thread(_search)


# The model itself only ever emits "Approve (AI)", "Edit", or "Exclude"
# (see prompt.txt) -- "Approve (Manual)" is reserved for a human
# reviewer confirming a value after checking an "Edit"-flagged record,
# which is what this endpoint is for. Re-flagging back to "Edit" or
# "Exclude" is also allowed, so a reviewer can walk a decision back.
MANUAL_REVIEW_STATUSES = {"Approve (Manual)", "Edit", "Exclude"}


class ReviewStatusUpdate(BaseModel):
    status: str
    # A "Corriger" edit's field values, keyed by the exact COLUMN_ORDER
    # label (e.g. "FWHM (nm)") -- see schema.EDITABLE_RECORD_FIELDS for the
    # allowlist. Applied before `status` is written, in the same call, so
    # correcting a value also counts as verifying it.
    fields: dict[str, Any] | None = None


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
    if body.fields:
        unknown = set(body.fields) - set(EDITABLE_RECORD_FIELDS)
        if unknown:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown/non-editable field(s): {sorted(unknown)}.",
            )
    try:
        record = state.set_record_review_status(
            job_id, file_id, record_index, body.status, fields=body.fields
        )
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=404, detail="File or record not found.") from e
    return {"record": record}


@app.get("/usage")
async def get_usage():
    return state.get_usage_summary()
