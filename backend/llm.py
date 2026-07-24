"""Gemini calling: PDF text extraction, per-model config, and the two
ways a paper gets analyzed -- with fallback-walking (run 1 of a file,
or an explicit single-model job) and pinned/single-attempt (runs 2 and
3 of a file's majority-vote reconciliation set, see jobs.py).
"""

import json
import os
from typing import Optional, cast

import fitz  # PyMuPDF
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("API Key not found!")

client = genai.Client(api_key=api_key)

with open("prompt.txt", "r", encoding="utf-8") as f:
    PROMPT_TEMPLATE = f.read()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from the first 8 pages, with page markers so the LLM
    can reference which page a quote comes from."""
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for i, page in enumerate(doc[:8], start=1):
            text += f"\n\n=== PAGE {i} ===\n"
            text += cast(str, page.get_text("text"))
    return text


class QuotaExceededError(Exception):
    """Raised when every model in a fallback chain has hit its free-tier
    RPM/RPD quota. Distinct from a one-off parsing/API failure: every
    subsequent call would fail the same way, so the caller should stop
    looping instead of burning a sleep on doomed requests."""


# Per-model generation config. This used to be one global config dict
# shared by every model, which is what broke 'gemini-flash-latest':
# that alias now resolves to gemini-3.6-flash, which REJECTS
# thinking_config: {thinking_budget: 0} with a 400 on every call.
# gemini-3.5-flash-lite and the explicit gemini-3.5-flash id both work
# fine with it (and it cuts their latency drastically -- see prior
# comment history). temperature=0 is used everywhere for determinism
# per-model (multi-run reconciliation in jobs.py/reconcile.py is what
# actually handles the residual cross-run non-determinism).
MODEL_CONFIG: dict[str, dict] = {
    "gemini-3.5-flash-lite": {"temperature": 0, "thinking_config": {"thinking_budget": 0}},
    "gemini-3.5-flash": {"temperature": 0, "thinking_config": {"thinking_budget": 0}},
    "gemini-flash-latest": {"temperature": 0},  # current alias target (3.6) rejects thinking_budget=0
}


def get_model_config(model: str) -> dict:
    return MODEL_CONFIG.get(model, {"temperature": 0})


# "Défaut": most powerful/latest model first, falling back through
# progressively cheaper/more available tiers. gemini-flash-latest
# resolves to whatever Google's newest flash model is at any given
# time (gemini-3.6-flash today) -- slower (dynamic thinking) and prone
# to a tight daily quota, which is exactly why it's first-try, not
# only-try.
MODEL_FALLBACK_CHAIN = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"]

# Explicit, pinned choices offered in the UI -- no fallback chain at all.
EXPLICIT_MODEL_CHOICES = ["gemini-3.5-flash", "gemini-3.5-flash-lite"]

MODEL_CHOICES = ["default", *EXPLICIT_MODEL_CHOICES]


def build_available_models(model_choice: str) -> list[str]:
    """Turns a UI model choice into the fallback-chain list a job starts
    with. Used both when a job is first created AND every time a job is
    resumed -- resuming deliberately gives every model in the chain a
    fresh chance again (rather than reusing yesterday's exhausted list),
    since there's no way to programmatically check whether a given
    model's quota has reset (see docs/Model_Comparison_Lite_vs_Flash_v2.md
    and the implementation plan: Gemini's free tier has no queryable
    quota endpoint)."""
    if model_choice == "default":
        return list(MODEL_FALLBACK_CHAIN)
    if model_choice in EXPLICIT_MODEL_CHOICES:
        return [model_choice]
    raise ValueError(f"Unknown model choice: {model_choice}")

# Sleep between requests to stay within each model's free-tier RPM: 60/RPM
# rounded up, plus a 1s safety buffer.
# NOTE: gemini-3.5-flash's current free-tier RPM was not confirmed at
# implementation time -- it falls back to DEFAULT_SLEEP_SECONDS (the
# existing conservative default) until it's explicitly verified and
# added here.
MODEL_SLEEP_SECONDS = {
    "gemini-3.5-flash-lite": 5,  # 15 RPM
    "gemini-flash-latest": 13,  # 5 RPM
}
DEFAULT_SLEEP_SECONDS = 13


def _call_model(model: str, final_prompt: str) -> Optional[list[dict]]:
    """One raw call to `model`. Returns parsed+model-stamped records, or
    None on any non-retryable failure. Raises genai_errors.ClientError
    (429 or otherwise) so callers can decide how to react."""
    response = client.models.generate_content(
        model=model,
        contents=final_prompt,
        config=get_model_config(model),
    )
    resolved_model = getattr(response, "model_version", None)
    raw = (response.text or "").strip().replace("```json", "").replace("```", "")
    parsed = json.loads(raw.strip())
    if isinstance(parsed, dict):
        parsed = [parsed]
    for record in parsed:
        record["Model Used"] = resolved_model
    return parsed


def analyze_paper_with_llm(
    paper_text: str, filename: str, models: list[str]
) -> Optional[list[dict]]:
    """Returns a list of records (one per mode/case) for this paper, or
    None if the call/parsing failed. `models` is the caller's remaining
    fallback chain -- models that hit their quota are popped from it in
    place, so later calls in the same job skip straight past them
    instead of re-discovering the same 429."""
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    while models:
        model = models[0]
        try:
            return _call_model(model, final_prompt)
        except genai_errors.ClientError as e:
            if e.code == 429:
                print(f"  -> {model} quota exhausted, falling back...")
                models.pop(0)
                continue
            print(f"Error for {filename}: {e}")
            return None
        except Exception as e:
            print(f"Error for {filename}: {e}")
            return None

    raise QuotaExceededError(f"All models in fallback chain exhausted for {filename}")


def analyze_paper_with_llm_pinned(
    paper_text: str, filename: str, model: str
) -> Optional[list[dict]]:
    """Single-attempt call against one specific model, no fallback
    walking. Used for reconciliation runs 2 and 3 of a file, once run 1
    has already pinned which model succeeded for that file -- a 429 (or
    any other failure) here just means this run is missing, not that
    the whole file/job should stop."""
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    try:
        return _call_model(model, final_prompt)
    except genai_errors.ClientError as e:
        if e.code == 429:
            print(f"  -> {model} quota exhausted on a reconciliation run for {filename}")
        else:
            print(f"Error for {filename}: {e}")
        return None
    except Exception as e:
        print(f"Error for {filename}: {e}")
        return None
