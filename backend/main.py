import asyncio
import io
import logging
import re
from contextlib import asynccontextmanager
from typing import Any, cast

import fitz  # PyMuPDF
import polars as pl
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel

import fom_relations
import jobs
import llm
import sensing_medium_conversion
import state
from schema import (
    COLUMN_ORDER,
    EDITABLE_RECORD_FIELDS,
    VIZ_COLUMN_ORDER,
    normalize_result,
    normalize_viz_result,
)

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


def _decode_page_labels(doc: fitz.Document) -> list[str | None]:
    """Physical 0-indexed page -> its printed page label, only when that
    label differs from the plain physical page number (1-indexed). A PDF
    with numbered front matter (e.g. an unnumbered cover, then "1, 2, 3..."
    starting a few physical pages in) is exactly the case this exists for --
    the app's own page numbering stays physical-index-only everywhere else
    (see prompts/extraction.txt's Location convention), this only affects
    what a human reads. Precise decoding is only attempted for the common
    decimal style; roman/alpha-numbered front matter (essentially never
    seen in journal papers, this app's actual input) is left unlabeled
    rather than guessing a numeral formatter for a case with no real-world
    payoff here.
    """
    rules = doc.get_page_labels()
    if not rules:
        return [None] * doc.page_count
    rules = sorted(rules, key=lambda r: r["startpage"])
    labels: list[str | None] = [None] * doc.page_count
    for i, rule in enumerate(rules):
        if rule.get("style") != "D":
            continue
        start = rule["startpage"]
        end = rules[i + 1]["startpage"] if i + 1 < len(rules) else doc.page_count
        prefix = rule.get("prefix") or ""
        first = rule.get("firstpagenum", 1)
        for physical in range(start, min(end, doc.page_count)):
            label = f"{prefix}{first + (physical - start)}"
            if label != str(physical + 1):
                labels[physical] = label
    return labels


_PAGE_TOKEN_RE = re.compile(r"\bPage\s+(\d+)\b")


def _apply_page_labels_to_location(location: str | None, labels: list[str | None]) -> str | None:
    """Rewrites every "Page N" token in a Location string to the PDF's own
    printed label for that physical page, when it has one -- so a human
    reading this outside the app (e.g. in the exported spreadsheet) can
    find the page by the number actually printed on it. Never touches the
    stored record itself: the underlying Location stays physical-index
    based, which is what the in-app viewer's click-to-jump still needs."""
    if not location:
        return location

    def _sub(match: re.Match) -> str:
        physical = int(match.group(1))
        label = labels[physical - 1] if 0 < physical <= len(labels) else None
        return f"Page {label}" if label else match.group(0)

    return _PAGE_TOKEN_RE.sub(_sub, location)


def _build_xlsx_response(job: dict) -> StreamingResponse:
    records: list[dict] = []
    for job_file in state.list_job_files(job["id"]):
        file_records = job_file.get("records") or []
        if not file_records:
            continue
        with fitz.open(job_file["pdf_path"]) as doc:
            labels = _decode_page_labels(doc)
        for r in file_records:
            # normalize_result fills in any COLUMN_ORDER key missing from an
            # older job's stored record (e.g. one extracted before "Raw
            # Value"/"Conversion Method" existed) as None -- without this,
            # pl.DataFrame(records) below raises ColumnNotFoundError the
            # moment a whole job predates a newly-added column, since none
            # of its records carry that key at all for Polars to infer.
            r = normalize_result(r)
            r["Location"] = _apply_page_labels_to_location(r.get("Location"), labels)
            records.append(r)

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


@app.get("/models")
async def get_models(file_count: int = 0):
    """Model choices for the extraction dropdown (see ModelSelector.vue),
    discovered live from Gemini's own catalog -- see llm.get_selectable_tiers
    -- rather than hand-maintained, since Google ships new flash models
    every few weeks. Grouped by tier (flash / flash_lite) so the frontend
    can show them as two short lists instead of one long flat one; each
    list is already capped to the newest few (see
    llm.MAX_SELECTABLE_PER_TIER) and excludes preview/retired-generation
    models. "default" isn't in here -- it's not a real model id, it's the
    fallback-walking chain (see llm.build_fallback_chain), which also
    reaches older models kept out of this list as a hidden last resort.

    `file_count` (the number of staged files, so far -- see the Deposer
    step) drives `recommended_model`: the model "default" itself will try
    first for a batch this size, per llm.recommend_tier's RPD-budget check.
    """
    tiers = llm.get_selectable_tiers()
    return {
        "tiers": tiers,
        "default_resolves_to": tiers["flash"][0] if tiers["flash"] else None,
        "recommended_model": llm.recommended_model(file_count),
    }


@app.post("/extract-pdfs/", status_code=202)
async def extract_data_from_pdfs(
    files: list[UploadFile] = File(...),
    model: str = Form("default"),
):
    model_choices = llm.get_model_choices()
    if model not in model_choices:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown model '{model}'. Expected one of {model_choices}.",
        )

    pdf_files = [f for f in files if f.filename and f.filename.lower().endswith(".pdf")]
    if not pdf_files:
        raise HTTPException(status_code=400, detail="No PDF files provided.")

    filenames = [cast(str, f.filename).rsplit(".", 1)[0] for f in pdf_files]
    available_models = llm.build_available_models(model, file_count=len(pdf_files))
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
        "events": job.get("events", []),
        "files": [
            {
                "id": f["id"],
                "filename": f["filename"],
                "status": f["status"],
                "model_used": f["model_used"],
                "record_count": len(f.get("records") or []),
                "error_reason": f["error_reason"],
                "started_at": f.get("started_at"),
                # Slim view of each consensus run (no "records" -- that's
                # the full extracted payload, not needed for a status poll
                # and already available via GET .../records once done) so
                # the frontend journal can explain a mid-batch 429/503
                # instead of just going quiet -- see useExtractionEventLog.
                "runs": [
                    {
                        "run_index": r["run_index"],
                        "model": r["model"],
                        "outcome": r["outcome"],
                        "reason": r.get("reason"),
                    }
                    for r in f.get("runs") or []
                ],
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


@app.get("/jobs/{job_id}/files/{file_id}/page-labels")
async def get_file_page_labels(job_id: str, file_id: str):
    """Printed page labels, one entry per physical page (null where the PDF
    has none, or its label equals the plain physical page number) -- used to
    annotate the viewer's "p. X / Y" badge and a record's Location text with
    what's actually printed on the page. See _decode_page_labels."""
    job_file = _job_file_or_404(job_id, file_id)

    def _labels() -> list[str | None]:
        with fitz.open(job_file["pdf_path"]) as doc:
            return _decode_page_labels(doc)

    return {"labels": await asyncio.to_thread(_labels)}


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


_MIN_SEARCH_QUERY_LENGTH = 2


@app.get("/jobs/{job_id}/files/{file_id}/search")
async def search_file_text(job_id: str, file_id: str, q: str):
    """Literal, document-wide text search for the review screen's Ctrl+F --
    unlike _find_evidence_rects below (used to auto-highlight a record's
    quoted Evidence), this never falls back to word-chunk matching: a
    reviewer's typed query should only ever highlight exactly what they
    typed, not stray partial-word matches recovered from a paraphrased
    citation. Only pages with at least one hit are included."""
    job_file = _job_file_or_404(job_id, file_id)
    if len(q.strip()) < _MIN_SEARCH_QUERY_LENGTH:
        return {"results": []}

    def _search() -> dict:
        results = []
        with fitz.open(job_file["pdf_path"]) as doc:
            for i, page in enumerate(doc):
                hits = page.search_for(q)
                if not hits:
                    continue
                results.append(
                    {
                        "page": i + 1,
                        "page_width": page.rect.width,
                        "page_height": page.rect.height,
                        "matches": [[r.x0, r.y0, r.x1, r.y1] for r in hits],
                    }
                )
        return {"results": results}

    return await asyncio.to_thread(_search)


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
# (see prompts/extraction.txt) -- "Approve (Manual)" is reserved for a human
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
    # The stored record dict never carries its own positional index (only
    # GET .../records injects it, via enumerate -- see get_file_records) --
    # without re-adding it here, the frontend's ExtractionRecord.index comes
    # back undefined, which breaks a second Valider/Corriger/Exclure on the
    # same record right after this one (its PATCH URL becomes .../undefined/...).
    return {"record": {**record, "index": record_index}}


@app.get("/sensing-medium-formulas")
async def get_sensing_medium_formulas():
    """Formula options for the review screen's "recompute sensitivity"
    picker -- see sensing_medium_conversion.list_formulas."""
    return {"formulas": sensing_medium_conversion.list_formulas()}


# Fields the recompute-field/restore-recompute-fields endpoints below may
# ever write -- restore-recompute-fields validates against this allowlist so
# a frontend undo/redo bug can only ever touch what a recompute itself could
# already have changed, never Evidence/Location/Ref/Title/etc regardless of
# what the caller sends.
RECOMPUTE_TOUCHED_FIELDS = {
    "Sensitivity (nm/RIU)",
    "FOM (RIU^-1)",
    "FWHM (nm)",
    "Conversion Method",
    "Raw Value",
    "Calculated Fields",
    "Review status",
    "Notes",
}

_RECOMPUTABLE_TARGET_FIELDS = {
    fom_relations.FIELD_FOM,
    fom_relations.FIELD_SENSITIVITY,
    fom_relations.FIELD_FWHM,
}


class RecomputeFieldRequest(BaseModel):
    target_field: str
    # None means "clear this value, needs manual verification" (the
    # explicit "don't apply" choice) -- see the endpoint below.
    method: str | None = None
    # "sensing_medium" method inputs (only valid when target_field is
    # Sensitivity) -- see sensing_medium_conversion.convert.
    formula_key: str | None = None
    raw_magnitude: float | None = None
    raw_unit: str | None = None
    custom_constant: float | None = None
    # "fom_relation" method inputs -- the CURRENT values of the two
    # non-target fields (the frontend pre-fills these from the record's own
    # fields, editable before applying; this endpoint never re-reads them
    # from storage itself, so what you pass is exactly what gets used).
    fom: float | None = None
    sensitivity: float | None = None
    fwhm: float | None = None


@app.post("/jobs/{job_id}/files/{file_id}/records/{record_index}/recompute-field")
async def recompute_field(
    job_id: str, file_id: str, record_index: int, body: RecomputeFieldRequest
):
    """Deterministically recomputes one of FOM/Sensitivity/FWHM -- never
    calls the LLM, so a reviewer can try a different formula/value as many
    times as needed. Two independent methods:
    - "sensing_medium": Gladstone-Dale/dn-dc unit conversion (only valid for
      Sensitivity) -- see sensing_medium_conversion.
    - "fom_relation": algebraic solve from the record's own stated
      Definition (FOM = Sensitivity / FWHM) -- see fom_relations. Requires
      the STORED record's Definition to normalize to a recognized relation;
      the two non-target *values* come from the request body, not storage.
    `method: null` clears the target field and marks the record "Edit",
    same "don't guess" escape hatch the sensing-medium panel already had.
    """
    _job_or_404(job_id)
    if body.target_field not in _RECOMPUTABLE_TARGET_FIELDS:
        raise HTTPException(
            status_code=400, detail=f"Unknown/non-recomputable field '{body.target_field}'."
        )

    if body.method is None:
        fields: dict[str, Any] = {
            body.target_field: None,
            "Review status": "Edit",
            "Notes": "Value cleared -- needs manual verification.",
        }
        if body.target_field == fom_relations.FIELD_SENSITIVITY:
            fields["Conversion Method"] = None
            fields["Raw Value"] = None

    elif body.method == "sensing_medium":
        if body.target_field != fom_relations.FIELD_SENSITIVITY:
            raise HTTPException(
                status_code=400,
                detail="The sensing_medium method only applies to Sensitivity (nm/RIU).",
            )
        if body.raw_magnitude is None or not body.raw_unit:
            raise HTTPException(
                status_code=400, detail="raw_magnitude and raw_unit are required for a formula."
            )
        try:
            result = sensing_medium_conversion.convert(
                body.formula_key, body.raw_magnitude, body.raw_unit, body.custom_constant
            )
        except sensing_medium_conversion.UnknownFormulaError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        if result is None:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot convert unit '{body.raw_unit}' with formula '{body.formula_key}'.",
            )
        sensitivity_riu, conversion_method = result
        fields = {
            body.target_field: sensitivity_riu,
            "Conversion Method": conversion_method,
            "Raw Value": f"{body.raw_magnitude} {body.raw_unit}",
            "Review status": "Approve (Manual)",
        }

    elif body.method == "fom_relation":
        job_file = _job_file_or_404(job_id, file_id)
        records = job_file.get("records") or []
        if not 0 <= record_index < len(records):
            raise HTTPException(status_code=404, detail="Record not found.")
        definition = records[record_index].get("Definition")
        if not fom_relations.is_recognized_definition(definition):
            raise HTTPException(
                status_code=400,
                detail="This record's Definition isn't a recognized FOM/Sensitivity/FWHM relation.",
            )
        value = fom_relations.solve(
            body.target_field, fom=body.fom, sensitivity=body.sensitivity, fwhm=body.fwhm
        )
        if value is None:
            raise HTTPException(
                status_code=400, detail="Missing or invalid input values for this calculation."
            )
        fields = {
            body.target_field: value,
            "Calculated Fields": fom_relations.describe(
                body.target_field, fom=body.fom, sensitivity=body.sensitivity, fwhm=body.fwhm
            ),
            "Review status": "Edit",
        }
    else:
        raise HTTPException(status_code=400, detail=f"Unknown method '{body.method}'.")

    try:
        record = state.set_record_fields(job_id, file_id, record_index, fields)
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=404, detail="File or record not found.") from e
    return {"record": {**record, "index": record_index}}


class RestoreRecomputeFieldsRequest(BaseModel):
    fields: dict[str, Any]


@app.post("/jobs/{job_id}/files/{file_id}/records/{record_index}/restore-recompute-fields")
async def restore_recompute_fields(
    job_id: str, file_id: str, record_index: int, body: RestoreRecomputeFieldsRequest
):
    """Single-level undo/redo for recompute_field/the old sensing-medium
    flow -- the frontend snapshots RECOMPUTE_TOUCHED_FIELDS before AND after
    every recompute call, then replays one of those two snapshots here to
    undo or redo. Restricted to RECOMPUTE_TOUCHED_FIELDS (not a general
    field-patch endpoint) so a frontend bug can only ever touch what a
    recompute itself could already have changed."""
    _job_or_404(job_id)
    unknown = set(body.fields) - RECOMPUTE_TOUCHED_FIELDS
    if unknown:
        raise HTTPException(
            status_code=400, detail=f"Unknown/non-restorable field(s): {sorted(unknown)}."
        )
    try:
        record = state.set_record_fields(job_id, file_id, record_index, body.fields)
    except (KeyError, IndexError) as e:
        raise HTTPException(status_code=404, detail="File or record not found.") from e
    return {"record": {**record, "index": record_index}}


@app.get("/usage")
async def get_usage():
    return state.get_usage_summary()
