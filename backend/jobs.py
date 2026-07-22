"""Background job orchestrator: processes one PDF at a time, checkpointing
each file's result as soon as it's ready (instead of one giant blocking
request that loses all progress on a quota interruption), and reconciles
3 independent runs per file via majority vote.

Model pinning is per FILE, not per RUN: run 1 of a file walks the
fallback chain (may pop exhausted models); whichever model succeeds is
then pinned for that file's runs 2 and 3 (no fallback walking within a
file). Mixing models across a single file's 3 runs would conflate
genuine sampling noise (what majority voting is for) with systematic
model-quality differences (a different problem), so pinning keeps the
vote meaningful. See docs / the implementation plan for the full
rationale, including the accepted risk that this compounds the
"Défaut" chain's already-tight daily quota on gemini-flash-latest.
"""

import asyncio
from typing import Optional

import llm
import reconcile
import schema
import state

# Tracks the currently-running asyncio.Task per job so a duplicate
# resume click (or a request racing a job that's already going) can't
# double-start processing for the same job_id. Per-process only -- this
# whole design assumes a single uvicorn worker (see state.py).
RUNNING_JOBS: dict[str, asyncio.Task] = {}


def start_job(job_id: str) -> None:
    """Launches (or re-launches, for resume) the background processing
    task for a job."""
    existing = RUNNING_JOBS.get(job_id)
    if existing and not existing.done():
        return
    RUNNING_JOBS[job_id] = asyncio.create_task(run_job(job_id))


async def _sleep_for(model: Optional[str]) -> None:
    seconds = llm.MODEL_SLEEP_SECONDS.get(model, llm.DEFAULT_SLEEP_SECONDS)
    await asyncio.sleep(seconds)


async def run_job(job_id: str) -> None:
    state.set_job_status(job_id, "running")
    # A pre-call sleep is used (instead of a post-call one) so the very
    # first call of the job fires immediately and no call is ever
    # followed by a pointless trailing sleep once the job is actually
    # done -- without needing to know in advance how many calls remain
    # (which run 1's internal fallback-walk can make hard to predict).
    any_call_made = False

    try:
        for job_file in state.list_job_files(job_id, status="pending"):
            job = state.get_job(job_id)
            available_models = list(job["available_models"])
            file_id = job_file["id"]
            filename = job_file["filename"]

            state.update_job_file_status(job_id, file_id, "processing")

            with open(job_file["pdf_path"], "rb") as f:
                pdf_bytes = f.read()
            text = await asyncio.to_thread(llm.extract_text_from_pdf, pdf_bytes)

            # --- Run 1: fallback-walking, pins the model for this file ---
            if any_call_made:
                await _sleep_for(available_models[0] if available_models else None)
            try:
                run1_records = await asyncio.to_thread(
                    llm.analyze_paper_with_llm, text, filename, available_models
                )
            except llm.QuotaExceededError:
                state.set_available_models(job_id, available_models)
                state.update_job_file_status(job_id, file_id, "failed", error_reason="quota")
                state.set_job_status(job_id, "quota_hit")
                return
            any_call_made = True

            pinned_model = available_models[0]  # guaranteed non-empty: no exception was raised above
            state.set_available_models(job_id, available_models)
            state.add_job_file_run(
                job_id, file_id, 0, pinned_model,
                "ok" if run1_records else "error", run1_records,
            )
            state.log_usage(pinned_model, job_id, file_id, "ok" if run1_records else "error")

            runs: list[list[dict]] = []
            if run1_records:
                runs.append([schema.normalize_result(r) for r in run1_records])

            # --- Runs 2 and 3: pinned to the same model, no fallback walk ---
            for run_index in (1, 2):
                await _sleep_for(pinned_model)
                result = await asyncio.to_thread(
                    llm.analyze_paper_with_llm_pinned, text, filename, pinned_model
                )
                outcome = "ok" if result is not None else "error"
                state.add_job_file_run(job_id, file_id, run_index, pinned_model, outcome, result)
                state.log_usage(pinned_model, job_id, file_id, outcome)
                if result:
                    runs.append([schema.normalize_result(r) for r in result])
                elif pinned_model in available_models:
                    # A 429 on a pinned run still exhausts that model for
                    # the rest of the job -- pop it so the NEXT file's
                    # run-1 fallback-walk doesn't waste a call
                    # rediscovering the same 429.
                    available_models.remove(pinned_model)
                    state.set_available_models(job_id, available_models)

            if not runs:
                state.update_job_file_status(job_id, file_id, "failed", error_reason="no_data")
                continue

            merged = reconcile.reconcile_runs(runs)
            state.add_job_records(job_id, file_id, merged)
            state.update_job_file_status(job_id, file_id, "done", model_used=pinned_model)

        state.set_job_status(job_id, "done")
    except Exception as e:
        # Anything unexpected (not the QuotaExceededError path above,
        # which already returns) -- record it as resumable rather than
        # leaving the job stuck at 'running' forever. A full process
        # crash is separately caught by state.load_jobs_from_disk()'s
        # interrupted-flip at the next startup.
        print(f"Job {job_id} failed unexpectedly: {e}")
        state.set_job_status(job_id, "error", error_message=str(e))
    finally:
        RUNNING_JOBS.pop(job_id, None)
