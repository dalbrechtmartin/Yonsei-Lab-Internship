"""No-database job persistence.

An in-memory dict is the source of truth while the server is running --
safe without locks because every mutation happens from coroutines on the
single asyncio event loop thread (the blocking Gemini SDK call runs in a
worker thread via asyncio.to_thread, but that thread only computes and
returns a value; it never touches JOBS directly). For durability across
restarts, every mutation also re-serializes the affected job to a JSON
file, written atomically (temp file + os.replace, never a torn write).

This project deliberately avoids a database for now (SQLite or
otherwise) -- see the implementation plan. If usage ever grows enough
that this becomes a real bottleneck, that's the trigger to revisit it,
not before. This design assumes a single server process: JOBS lives
in-process, so don't run uvicorn with multiple workers without a
different persistence layer.
"""

import json
import os
import uuid
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent / "data"
JOBS_DIR = DATA_DIR / "jobs"
USAGE_LOG_PATH = DATA_DIR / "usage.jsonl"
QUOTA_EXHAUSTED_PATH = DATA_DIR / "quota_exhausted.json"

JOBS: dict[str, dict] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _job_dir(job_id: str) -> Path:
    return JOBS_DIR / job_id


def pdf_path(job_id: str, file_id: str) -> Path:
    return _job_dir(job_id) / f"{file_id}.pdf"


def _job_json_path(job_id: str) -> Path:
    return _job_dir(job_id) / "job.json"


def _persist_job(job_id: str) -> None:
    job = JOBS[job_id]
    job["updated_at"] = _now()
    directory = _job_dir(job_id)
    directory.mkdir(parents=True, exist_ok=True)
    target = _job_json_path(job_id)
    tmp = target.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(job, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, target)  # atomic on both POSIX and Windows


def load_jobs_from_disk() -> list[str]:
    """Called once at FastAPI startup. Repopulates JOBS from the on-disk
    snapshots and returns the ids of jobs that still have work left to
    do, so the caller (main.py's lifespan) can restart their background
    processing automatically -- extraction never needs a person to click
    anything to recover from a killed/restarted process, the same way
    jobs.py's own backoff-and-retry needs no click to recover from a
    slow/unavailable model while the process stays alive.

    A file can be caught mid-flight, frozen at 'processing' in the last
    snapshot written before the crash -- run_job() only ever moves a
    file OUT of 'processing' from within the same coroutine that put it
    there, so a killed process leaves it stuck there forever otherwise.
    It's rewound to 'pending' here so the restarted job picks it back up;
    nothing about that file's data was actually lost (its PDF is still
    on disk).
    """
    JOBS.clear()
    resumable: list[str] = []
    if not JOBS_DIR.exists():
        return resumable
    for job_json in JOBS_DIR.glob("*/job.json"):
        try:
            job = json.loads(job_json.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            continue
        job.setdefault("notice", None)
        for file_state in job["files"].values():
            file_state.setdefault("started_at", None)
            if file_state["status"] == "processing":
                file_state["status"] = "pending"
        JOBS[job["id"]] = job
        _persist_job(job["id"])
        has_pending = any(f["status"] == "pending" for f in job["files"].values())
        if job.get("status") != "done" and has_pending:
            resumable.append(job["id"])
    return resumable


def create_job(model_choice: str, available_models: list[str], filenames: list[str]) -> dict:
    job_id = uuid.uuid4().hex
    files = {}
    for order_index, filename in enumerate(filenames):
        file_id = uuid.uuid4().hex
        files[file_id] = {
            "id": file_id,
            "filename": filename,
            "order_index": order_index,
            "status": "pending",
            "error_reason": None,
            "model_used": None,
            "started_at": None,
            "pdf_path": str(pdf_path(job_id, file_id)),
            "runs": [],
            "records": [],
        }
    job = {
        "id": job_id,
        "status": "pending",
        "model_choice": model_choice,
        "available_models": list(available_models),
        "total_files": len(filenames),
        "created_at": _now(),
        "updated_at": _now(),
        "error_message": None,
        "notice": None,
        "files": files,
    }
    JOBS[job_id] = job
    _persist_job(job_id)
    return job


def get_job(job_id: str) -> Optional[dict]:
    return JOBS.get(job_id)


def list_job_files(job_id: str, status: Optional[str] = None) -> list[dict]:
    job = JOBS[job_id]
    files = sorted(job["files"].values(), key=lambda f: f["order_index"])
    if status is not None:
        files = [f for f in files if f["status"] == status]
    return files


def update_job_file_status(
    job_id: str,
    file_id: str,
    status: str,
    error_reason: Optional[str] = None,
    model_used: Optional[str] = None,
) -> None:
    file_state = JOBS[job_id]["files"][file_id]
    file_state["status"] = status
    if status == "processing":
        # Reset on every attempt (not just the first) so a file that got
        # deferred and retried later shows a fresh countdown, not one
        # still counting from its first, abandoned attempt.
        file_state["started_at"] = _now()
    if error_reason is not None:
        file_state["error_reason"] = error_reason
    if model_used is not None:
        file_state["model_used"] = model_used
    _persist_job(job_id)


def add_job_file_run(
    job_id: str,
    file_id: str,
    run_index: int,
    model: Optional[str],
    outcome: str,
    records: Optional[list[dict]],
) -> None:
    JOBS[job_id]["files"][file_id]["runs"].append(
        {"run_index": run_index, "model": model, "outcome": outcome, "records": records}
    )
    _persist_job(job_id)


def add_job_records(job_id: str, file_id: str, records: list[dict]) -> None:
    JOBS[job_id]["files"][file_id]["records"] = records
    _persist_job(job_id)


def get_job_records(job_id: str) -> list[dict]:
    records: list[dict] = []
    for f in list_job_files(job_id):
        records.extend(f.get("records") or [])
    return records


def set_record_review_status(
    job_id: str, file_id: str, record_index: int, status: str
) -> dict:
    """A human reviewer overriding one record's "Review status" after
    checking an AI-flagged "Edit" row -- the only path allowed to write
    "Approve (Manual)" (the model itself never does, see prompt.txt).
    Raises IndexError if record_index is out of range for this file."""
    records = JOBS[job_id]["files"][file_id]["records"]
    record = records[record_index]
    record["Review status"] = status
    _persist_job(job_id)
    return record


def set_available_models(job_id: str, available_models: list[str]) -> None:
    JOBS[job_id]["available_models"] = list(available_models)
    _persist_job(job_id)


def set_job_status(job_id: str, status: str, error_message: Optional[str] = None) -> None:
    job = JOBS[job_id]
    job["status"] = status
    if error_message is not None:
        job["error_message"] = error_message
    _persist_job(job_id)


def set_job_notice(job_id: str, notice: Optional[dict]) -> None:
    """A transient, user-facing explanation of what the job is doing
    right now when it isn't just steadily processing -- e.g. waiting out
    a quota cooldown before its next automatic retry pass. `None` clears
    it (there's nothing unusual to report)."""
    JOBS[job_id]["notice"] = notice
    _persist_job(job_id)


def log_usage(
    model: Optional[str], job_id: Optional[str], job_file_id: Optional[str], outcome: str
) -> None:
    if not model:
        return
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    entry = {
        "model": model,
        "called_at": _now(),
        "job_id": job_id,
        "job_file_id": job_file_id,
        "outcome": outcome,
    }
    with USAGE_LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def _read_usage_counters() -> tuple[Counter, Counter]:
    today = datetime.now(timezone.utc).date().isoformat()
    calls_today: Counter = Counter()
    calls_total: Counter = Counter()
    if USAGE_LOG_PATH.exists():
        with USAGE_LOG_PATH.open(encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                model = entry.get("model")
                if not model:
                    continue
                calls_total[model] += 1
                if str(entry.get("called_at", "")).startswith(today):
                    calls_today[model] += 1
    return calls_today, calls_total


def _read_quota_exhausted() -> dict:
    if not QUOTA_EXHAUSTED_PATH.exists():
        return {}
    try:
        return json.loads(QUOTA_EXHAUSTED_PATH.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def mark_model_exhausted_today(model: str) -> None:
    """Called from a worker thread (llm._call_model_with_429_retry hits
    this on a confirmed per-DAY 429, identified via the API's own
    quotaId -- see llm._quota_scope) so every subsequent file today
    skips straight past this model instead of re-discovering the same
    429 one file at a time. Read-modify-write here isn't atomic across
    concurrent jobs, but the worst case is one lost update, immediately
    re-written by the next 429 on the same model -- fine at this
    project's volume (see module docstring: no DB, single process)."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data = _read_quota_exhausted()
    data[model] = datetime.now(timezone.utc).date().isoformat()
    tmp = QUOTA_EXHAUSTED_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(data), encoding="utf-8")
    os.replace(tmp, QUOTA_EXHAUSTED_PATH)


def is_model_exhausted_today(model: str) -> bool:
    today = datetime.now(timezone.utc).date().isoformat()
    return _read_quota_exhausted().get(model) == today


def calls_today_for_model(model: str) -> int:
    """Used to proactively steer the fallback chain away from a model
    close to its daily (RPD) quota, instead of discovering it via 429s
    -- see llm.filter_models_by_quota. Rereads the whole log each call;
    fine at this project's volume (no DB, see module docstring)."""
    calls_today, _ = _read_usage_counters()
    return calls_today.get(model, 0)


def get_usage_summary() -> dict:
    calls_today, calls_total = _read_usage_counters()
    today = datetime.now(timezone.utc).date().isoformat()
    models = sorted(set(calls_total) | set(calls_today))
    return {
        "date": today,
        "note": (
            "Estimate of this app's own Gemini usage only; may undercount if the "
            "API key is used elsewhere. Not a live quota from Google."
        ),
        "by_model": [
            {"model": m, "calls_today": calls_today.get(m, 0), "calls_total": calls_total.get(m, 0)}
            for m in models
        ],
    }
