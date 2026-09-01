import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import state


def _fake_job(job_id: str) -> dict:
    return {"id": job_id, "events": []}


class TestAppendJobEvent:
    """append_job_event is the backend's only write path for the
    "Journal" panel's data (see GET /jobs/{id}/status's "events" field) --
    these don't touch disk (state._persist_job is stubbed out) since a real
    write would land in the shared backend/data dir, which tests must never
    touch (see llm.py/jobs.py callers, all real API calls, for context)."""

    def test_appends_with_incrementing_seq_and_no_dropped_fields(self, monkeypatch):
        monkeypatch.setattr(state, "_persist_job", lambda job_id: None)
        job = _fake_job("job1")
        monkeypatch.setitem(state.JOBS, "job1", job)

        state.append_job_event("job1", "info", "fileProcessing", filename="a.pdf")
        state.append_job_event("job1", "warn", "extractRetryQuota", filename="a.pdf", model="m", seconds=5)

        assert [e["seq"] for e in job["events"]] == [0, 1]
        assert job["events"][0]["level"] == "info"
        assert job["events"][0]["key"] == "fileProcessing"
        assert job["events"][0]["params"] == {"filename": "a.pdf"}
        assert job["events"][1]["params"] == {"filename": "a.pdf", "model": "m", "seconds": 5}
        assert job["events"][0]["at"]  # a timestamp was stamped

    def test_noop_when_job_id_is_none(self, monkeypatch):
        persisted = []
        monkeypatch.setattr(state, "_persist_job", lambda job_id: persisted.append(job_id))

        state.append_job_event(None, "info", "fileProcessing", filename="a.pdf")

        assert persisted == []

    def test_noop_when_job_does_not_exist(self, monkeypatch):
        persisted = []
        monkeypatch.setattr(state, "_persist_job", lambda job_id: persisted.append(job_id))

        state.append_job_event("missing-job", "info", "fileProcessing", filename="a.pdf")

        assert persisted == []
