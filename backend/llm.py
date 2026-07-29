"""PDF text extraction, per-model config, and the two
ways a paper gets analyzed -- with fallback-walking (run 1 of a file,
or an explicit single-model job) and pinned/single-attempt (runs 2 and
3 of a file's majority-vote reconciliation set, see jobs.py).
"""

import json
import os
import time
from typing import Optional, cast

import fitz  # PyMuPDF
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

import state

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("API Key not found!")

client = genai.Client(api_key=api_key)

with open("prompt.txt", "r", encoding="utf-8") as f:
    PROMPT_TEMPLATE = f.read()


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for i, page in enumerate(doc[:8], start=1):
            text += f"\n\n=== PAGE {i} ===\n"
            text += cast(str, page.get_text("text"))
    return text


class ModelChainExhaustedError(Exception):
    def __init__(self, message: str, reason: str) -> None:
        super().__init__(message)
        self.reason = reason


def _classify_error(e: Exception) -> str:
    code = getattr(e, "code", None)
    if code == 429:
        return "quota"
    if isinstance(code, int) and code >= 500:
        return "unavailable"
    if isinstance(e, (TimeoutError, OSError)):
        return "unavailable"
    return "error"


# Gemini 3 models default to a per-model thinking_level (MEDIUM for flash,
# MINIMAL for flash-lite -- see ai.google.dev/gemini-api/docs/thinking).
# This task needs the model to enumerate every mode/peak mentioned in the
# paper and reason about unit conversions/exclusion rules before writing
# JSON, so we pin every model in the chain to HIGH rather than accepting
# flash-lite's much weaker MINIMAL default -- a likely source of the
# extra hallucinated/missed rows seen when the fallback chain lands on
# flash-lite (see docs/Model_Comparison_Lite_vs_Flash_v2.md).
_THINKING_CONFIG = types.ThinkingConfig(thinking_level=types.ThinkingLevel.HIGH)

MODEL_CONFIG: dict[str, dict] = {
    "gemini-3.5-flash-lite": {"temperature": 0},
    "gemini-3.5-flash": {"temperature": 0},
    "gemini-flash-latest": {"temperature": 0},
}

# One JSON object per FOM record, matching prompt.txt's OUTPUT FORMAT.
# Constraining the shape server-side (instead of hoping the model free-
# forms valid JSON and hand-parsing ```json fences) removes an entire
# class of run-to-run inconsistency: missing keys, wrong types, or
# markdown-wrapped output. propertyOrdering keeps field order stable too.
_RECORD_PROPERTIES: dict[str, types.Schema] = {
    "Ref": types.Schema(type=types.Type.STRING),
    "Title": types.Schema(type=types.Type.STRING),
    "Short Title": types.Schema(type=types.Type.STRING),
    "Mode ID": types.Schema(type=types.Type.INTEGER),
    "Mode Description": types.Schema(type=types.Type.STRING),
    "Material Class": types.Schema(type=types.Type.STRING),
    "Base Materials": types.Schema(type=types.Type.STRING),
    "Layer Structure": types.Schema(type=types.Type.STRING),
    "Origin": types.Schema(type=types.Type.STRING, enum=["EXP", "SIM", "UNCLEAR"]),
    "Domain": types.Schema(type=types.Type.STRING, enum=["Wavelength", "Frequency", "Other", "Unclear"]),
    "Resonance Wavelength (nm)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "FOM (RIU^-1)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "Definition": types.Schema(type=types.Type.STRING),
    "Sensitivity (nm/RIU)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "FWHM (nm)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "Q-factor": types.Schema(type=types.Type.NUMBER, nullable=True),
    "Evidence": types.Schema(type=types.Type.STRING),
    "Location": types.Schema(type=types.Type.STRING),
    # "Approve (Manual)" is intentionally NOT in this enum -- only a human
    # reviewer (via the future manual-approval endpoint) can set it, never
    # the model itself.
    "Review status": types.Schema(type=types.Type.STRING, enum=["Approve (AI)", "Edit", "Exclude"]),
    "Notes": types.Schema(type=types.Type.STRING, nullable=True),
}

RESPONSE_SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(
        type=types.Type.OBJECT,
        properties=_RECORD_PROPERTIES,
        required=[
            "Ref", "Title", "Short Title", "Mode ID", "Mode Description",
            "Material Class", "Base Materials", "Layer Structure", "Origin",
            "Domain", "Definition", "Evidence", "Location", "Review status",
        ],
        property_ordering=list(_RECORD_PROPERTIES),
    ),
)


def get_model_config(model: str) -> types.GenerateContentConfig:
    config_dict = MODEL_CONFIG.get(model, {"temperature": 0})
    return types.GenerateContentConfig(
        **config_dict,
        thinking_config=_THINKING_CONFIG,
        response_mime_type="application/json",
        response_schema=RESPONSE_SCHEMA,
    )

# "Default": most powerful/latest model first, falling back through
# progressively cheaper/more available tiers.
# actual (07.27.2026) gemini-flash-latest = gemini-3.6-flash
MODEL_FALLBACK_CHAIN = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"]
EXPLICIT_MODEL_CHOICES = ["gemini-3.5-flash", "gemini-3.5-flash-lite"]

MODEL_CHOICES = ["default", *EXPLICIT_MODEL_CHOICES]

def build_available_models(model_choice: str) -> list[str]:
    if model_choice == "default":
        return list(MODEL_FALLBACK_CHAIN)
    if model_choice in EXPLICIT_MODEL_CHOICES:
        return [model_choice]
    raise ValueError(f"Unknown model choice: {model_choice}")

MODEL_SLEEP_SECONDS = {
    "gemini-3.5-flash-lite": 5,  # 15 RPM
    "gemini-3.5-flash": 13,  # 5 RPM
    "gemini-flash-latest": 13,  # 5 RPM
}
DEFAULT_SLEEP_SECONDS = 13

# Free-tier RPD (requests/day) ceilings for this project's API key --
# see ai.google.dev/gemini-api/docs/rate-limits. Update if the account's
# tier changes. gemini-flash-latest and gemini-3.5-flash share the same
# tight 20/day cap, which a single 7-file batch can exhaust on its own
# (each file pins up to 3 calls to the same model -- see jobs.py's
# MODEL PINNING note), so this is treated as a hard, checkable budget
# rather than something only discovered by hitting a 429.
MODEL_RPD_LIMITS = {
    "gemini-flash-latest": 20,
    "gemini-3.5-flash": 20,
    "gemini-3.5-flash-lite": 500,
}

# A file's full reconciliation set makes up to 3 calls to its pinned
# model (run 1 + 2 pinned reruns). Reserve that much headroom before
# trusting a model to start a NEW file, so a batch doesn't pin a file to
# a model that then 429s partway through its own reconciliation runs.
CALLS_PER_FILE_RESERVE = 3


def filter_models_by_quota(models: list[str]) -> list[str]:
    """Drops models from a fallback chain that are known to be out of
    daily quota. Two independent signals, checked in order of trust:

    1. state.is_model_exhausted_today -- authoritative: set the moment a
       429 explicitly identifies itself as a per-day quota violation
       (see llm._quota_scope). If Google said so, believe it outright.
    2. This app's own call count vs MODEL_RPD_LIMITS -- an estimate that
       can undercount (calls made outside this app, or a run that failed
       before logging), so it's only used to pre-emptively avoid the
       FIRST 429 rather than as a hard truth.

    Models with no known RPD limit are never filtered out on signal 2 --
    an unknown cap is not evidence of exhaustion.
    """
    kept = []
    for model in models:
        if state.is_model_exhausted_today(model):
            continue
        limit = MODEL_RPD_LIMITS.get(model)
        if limit is None or state.calls_today_for_model(model) + CALLS_PER_FILE_RESERVE <= limit:
            kept.append(model)
    return kept


def _call_model(model: str, final_prompt: str, filename: str) -> Optional[list[dict]]:
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
        record["Ref"] = filename

    return parsed


# A paper with many distinct modes/peaks makes the model return a much
# longer JSON array in a single response -- that one call can burn through
# a large chunk of the per-minute *token* quota even though it's still just
# one request. MODEL_SLEEP_SECONDS is tuned for request-per-minute limits
# only, so it does nothing to prevent this. Retrying the SAME model with a
# proper backoff (instead of immediately falling back to a weaker model, or
# on pinned runs just giving up the vote) is what actually recovers once the
# quota window resets.
MAX_429_RETRIES = 3
BASE_429_BACKOFF_SECONDS = 30

# A 429 for a per-minute quota resets within seconds to low tens of
# seconds -- worth blocking this worker thread for. A 429 for a per-day
# quota (RPD) can carry a RetryInfo of literally hours, and blindly
# time.sleep()-ing that long would freeze this file's whole run (and,
# since files are processed one at a time, the rest of the batch behind
# it) for the remainder of the day. Past this cap we stop treating it as
# "retry the same model shortly" and let it propagate instead, so the
# caller falls back to the next model in the chain (run 1) or gives up
# just this pinned run (runs 2/3) -- jobs.py's own multi-pass backoff
# (RETRY_BACKOFFS_SECONDS, up to 300s between passes over the whole
# batch) is the mechanism actually meant to ride out a long quota wait.
MAX_429_RETRY_SLEEP_SECONDS = 90


def _error_details_list(e: Exception) -> list:
    details = getattr(e, "details", None)
    return (details or {}).get("error", {}).get("details", []) if isinstance(details, dict) else []


def _quota_scope(e: Exception) -> str:
    """Google's 429 body includes a QuotaFailure with a quotaId that says
    exactly which limit was hit (e.g.
    'GenerateRequestsPerDayPerProjectPerModel-FreeTier' vs
    '...PerMinute...'). This is authoritative -- unlike RetryInfo's
    retryDelay, which in practice comes back as '0s' or a handful of
    seconds even for a fully-exhausted DAILY quota, so it cannot be used
    to distinguish the two (see the '77.pdf' log: a 20/20 RPD-exhausted
    gemini-3.6-flash reported retryDelay '0s')."""
    for detail in _error_details_list(e):
        if not isinstance(detail, dict) or "QuotaFailure" not in str(detail.get("@type", "")):
            continue
        for violation in detail.get("violations", []) or []:
            quota_id = str(violation.get("quotaId", "")).lower()
            if "perday" in quota_id:
                return "day"
            if "perminute" in quota_id:
                return "minute"
    return "unknown"


def _retry_delay_seconds(e: Exception, attempt: int) -> float:
    """Prefers the API's own RetryInfo ("retry in 34s") when the 429
    response includes one -- for a per-minute quota it reflects the
    actual remaining window. Falls back to exponential backoff otherwise.
    Not used at all for a per-day quota -- see _quota_scope.
    """
    for detail in _error_details_list(e):
        retry_delay = detail.get("retryDelay") if isinstance(detail, dict) else None
        if isinstance(retry_delay, str) and retry_delay.endswith("s"):
            try:
                return float(retry_delay[:-1])
            except ValueError:
                pass
    return BASE_429_BACKOFF_SECONDS * (2**attempt)


def _call_model_with_429_retry(model: str, final_prompt: str, filename: str) -> Optional[list[dict]]:
    for attempt in range(MAX_429_RETRIES + 1):
        try:
            return _call_model(model, final_prompt, filename)
        except genai_errors.ClientError as e:
            if e.code != 429:
                raise
            scope = _quota_scope(e)
            if scope == "day":
                # Retrying (even once) is pure waste: this model will
                # 429 again on every attempt until it resets tomorrow.
                # Record it so filter_models_by_quota can skip it for
                # every subsequent file today too, not just this call.
                state.mark_model_exhausted_today(model)
                print(f"  -> {model} hit a DAILY quota 429 for {filename} -- not retrying, skipping it for the rest of today")
                raise
            if attempt == MAX_429_RETRIES:
                raise
            delay = _retry_delay_seconds(e, attempt)
            if delay > MAX_429_RETRY_SLEEP_SECONDS:
                print(
                    f"  -> {model} hit 429 for {filename} with a {delay:.0f}s retry window -- "
                    f"not blocking on it, giving up on this model for now"
                )
                raise
            print(
                f"  -> {model} hit 429 for {filename} "
                f"(attempt {attempt + 1}/{MAX_429_RETRIES + 1}), retrying in {delay:.0f}s"
            )
            time.sleep(delay)
    raise AssertionError("unreachable")  # loop always returns or raises


def analyze_paper_with_llm(
    paper_text: str, filename: str, models: list[str]
) -> Optional[list[dict]]:
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    last_reason = "quota" if not models else "error"
    while models:
        model = models[0]
        try:
            return _call_model_with_429_retry(model, final_prompt, filename)
        except Exception as e:
            last_reason = _classify_error(e)
            print(f"  -> {model} failed ({last_reason}) for {filename}, falling back: {e}")
            models.pop(0)
            continue

    raise ModelChainExhaustedError(
        f"All models in fallback chain failed for {filename}", reason=last_reason
    )


def analyze_paper_with_llm_pinned(
    paper_text: str, filename: str, model: str
) -> Optional[list[dict]]:
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    try:
        return _call_model_with_429_retry(model, final_prompt, filename)
    except genai_errors.ClientError as e:
        if e.code == 429:
            print(f"  -> {model} quota exhausted on a reconciliation run for {filename}")
        else:
            print(f"Error for {filename}: {e}")
        return None
    except Exception as e:
        print(f"Error for {filename}: {e}")
        return None
