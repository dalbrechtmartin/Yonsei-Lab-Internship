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

MODEL_CONFIG: dict[str, dict] = {
    "gemini-3.5-flash-lite": {"temperature": 0},
    "gemini-3.5-flash": {"temperature": 0},
    "gemini-flash-latest": {"temperature": 0},
}

def get_model_config(model: str) -> types.GenerateContentConfig:
    config_dict = MODEL_CONFIG.get(model, {"temperature": 0})
    return types.GenerateContentConfig(**config_dict)

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


def _retry_delay_seconds(e: Exception, attempt: int) -> float:
    """Prefers the API's own RetryInfo ("retry in 34s") when the 429
    response includes one -- it reflects the actual remaining quota window,
    which is far more accurate than a fixed guess. Falls back to
    exponential backoff otherwise.
    """
    details = getattr(e, "details", None)
    error_details = (details or {}).get("error", {}).get("details", []) if isinstance(details, dict) else []
    for detail in error_details or []:
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
            if e.code != 429 or attempt == MAX_429_RETRIES:
                raise
            delay = _retry_delay_seconds(e, attempt)
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

    last_reason = "error"
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
