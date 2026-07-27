"""
BACKGROUND JOB ORCHESTRATOR
- Processing: Processes 1 PDF at a time in the background.
- Checkpointing: Immediate result saving per file (avoids a large blocking request and progress loss on quota interrupts).
- Consensus: 3 independent runs per file, reconciled via majority vote.

MODEL PINNING (Per file, not per run)
- Run 1 walks the fallback chain. The successful model is then pinned for Runs 2 and 3 of that file.
- Goal: Keeps the vote meaningful by isolating genuine sampling noise, rather than conflating it with model-quality differences.
- Trade-off: Assumes the accepted risk of exhausting the default model's daily quota faster.

RESILIENCE & RETRIES (100% Automated)
- If a file fails its entire fallback chain (quota, timeout), it is deferred and the batch moves to the next file.
- Retry: After a full pass, deferred files get another pass after a backoff (allowing RPM/RPD limits to reset over time).
- Partial Success: If a file remains stuck after all automatic passes, it is marked as failed so the batch completes with what succeeded.
- Note: Process kill/restart survival is handled in main.py's lifespan.
"""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Optional

import llm
import reconcile
import schema
import state

RUNNING_JOBS: dict[str, asyncio.Task] = {}
RETRY_BACKOFFS_SECONDS = [20, 40, 90, 180, 300, 300]


def start_job(job_id: str) -> None:
    existing = RUNNING_JOBS.get(job_id)
    if existing and not existing.done():
        return
    RUNNING_JOBS[job_id] = asyncio.create_task(run_job(job_id))


async def _sleep_for(model: Optional[str]) -> None:
    if model is None:
        seconds = llm.DEFAULT_SLEEP_SECONDS
    else:
        seconds = llm.MODEL_SLEEP_SECONDS.get(model, llm.DEFAULT_SLEEP_SECONDS)
        
    await asyncio.sleep(seconds)


async def _process_one_file(job_id: str, job_file: dict, any_call_made: bool) -> tuple[bool, bool]:
    file_id = job_file["id"]
    filename = job_file["filename"]
    
    job = state.get_job(job_id)
    if not job:
        return False, any_call_made 
        
    available_models = list(job["available_models"])

    state.update_job_file_status(job_id, file_id, "processing")

    with open(job_file["pdf_path"], "rb") as f:
        pdf_bytes = f.read()
    text = await asyncio.to_thread(llm.extract_text_from_pdf, pdf_bytes)

    if any_call_made:
        await _sleep_for(available_models[0] if available_models else None)
    try:
        run1_records = await asyncio.to_thread(
            llm.analyze_paper_with_llm, text, filename, available_models
        )
    except llm.ModelChainExhaustedError as e:
        state.set_available_models(job_id, available_models)
        state.update_job_file_status(job_id, file_id, "pending", error_reason=e.reason)
        return False, any_call_made
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
            available_models.remove(pinned_model)
            state.set_available_models(job_id, available_models)

    if not runs:
        state.update_job_file_status(job_id, file_id, "failed", error_reason="no_data")
        return True, any_call_made

    merged = reconcile.reconcile_runs(runs)
    state.add_job_records(job_id, file_id, merged)
    state.update_job_file_status(job_id, file_id, "done", model_used=pinned_model)
    return True, any_call_made


async def run_job(job_id: str) -> None:
    state.set_job_status(job_id, "running")
    any_call_made = False

    try:
        attempt = 0
        while True:
            job = state.get_job(job_id)
            if not job:
                print(f"Job {job_id} introuvable.")
                break
                
            state.set_available_models(job_id, llm.build_available_models(job["model_choice"]))
            state.set_job_notice(job_id, None)

            deferred_reasons: list[str] = []
            for job_file in state.list_job_files(job_id, status="pending"):
                try:
                    resolved, any_call_made = await _process_one_file(job_id, job_file, any_call_made)
                except Exception as e:
                    print(f"Unexpected error processing file {job_file['id']} in job {job_id}: {e}")
                    state.update_job_file_status(job_id, job_file["id"], "pending", error_reason="error")
                    resolved = False
                if not resolved:
                    deferred_reasons.append("error")

            still_pending = state.list_job_files(job_id, status="pending")
            if not still_pending or attempt >= len(RETRY_BACKOFFS_SECONDS):
                break  # done, or out of automatic retries -- finalize below

            backoff = RETRY_BACKOFFS_SECONDS[attempt]
            retry_at = (datetime.now(timezone.utc) + timedelta(seconds=backoff)).isoformat()
            state.set_job_notice(job_id, {
                "reason": deferred_reasons[0] if deferred_reasons else "unavailable",
                "pending_count": len(still_pending),
                "retry_at": retry_at,
            })
            await asyncio.sleep(backoff)
            attempt += 1

        for job_file in state.list_job_files(job_id, status="pending"):
            state.update_job_file_status(job_id, job_file["id"], "failed", error_reason="quota")

        state.set_job_notice(job_id, None)
        state.set_job_status(job_id, "done")
    except Exception as e:
        print(f"Job {job_id} failed unexpectedly: {e}")
        state.set_job_status(job_id, "error", error_message=str(e))
    finally:
        RUNNING_JOBS.pop(job_id, None)
