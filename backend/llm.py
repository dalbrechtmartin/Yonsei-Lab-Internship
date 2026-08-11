"""PDF text extraction, per-model config, and the two
ways a paper gets analyzed -- with fallback-walking (run 1 of a file,
or an explicit single-model job) and pinned/single-attempt (runs 2 and
3 of a file's majority-vote reconciliation set, see jobs.py).
"""

import json
import logging
import os
import time
from typing import cast

import fitz  # PyMuPDF
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

import state

logger = logging.getLogger(__name__)

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("API Key not found!")

client = genai.Client(api_key=api_key)

with open("prompt.txt", encoding="utf-8") as f:
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
    "Domain": types.Schema(
        type=types.Type.STRING, enum=["Wavelength", "Frequency", "Other", "Unclear"]
    ),
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
            "Ref",
            "Title",
            "Short Title",
            "Mode ID",
            "Mode Description",
            "Material Class",
            "Base Materials",
            "Layer Structure",
            "Origin",
            "Domain",
            "Definition",
            "Evidence",
            "Location",
            "Review status",
        ],
        property_ordering=list(_RECORD_PROPERTIES),
    ),
)


def get_model_config(
    model: str, response_schema: types.Schema = RESPONSE_SCHEMA
) -> types.GenerateContentConfig:
    config_dict = MODEL_CONFIG.get(model, {"temperature": 0})
    return types.GenerateContentConfig(
        **config_dict,
        thinking_config=_THINKING_CONFIG,
        response_mime_type="application/json",
        response_schema=response_schema,
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


def _call_model(model: str, final_prompt: str, filename: str) -> list[dict] | None:
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


def _call_model_with_429_retry(model: str, final_prompt: str, filename: str) -> list[dict] | None:
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
                logger.warning(
                    "%s hit a DAILY quota 429 for %s -- not retrying, skipping it for the rest of today",
                    model,
                    filename,
                )
                raise
            if attempt == MAX_429_RETRIES:
                raise
            delay = _retry_delay_seconds(e, attempt)
            if delay > MAX_429_RETRY_SLEEP_SECONDS:
                logger.warning(
                    "%s hit 429 for %s with a %.0fs retry window -- "
                    "not blocking on it, giving up on this model for now",
                    model,
                    filename,
                    delay,
                )
                raise
            logger.info(
                "%s hit 429 for %s (attempt %d/%d), retrying in %.0fs",
                model,
                filename,
                attempt + 1,
                MAX_429_RETRIES + 1,
                delay,
            )
            time.sleep(delay)
    raise AssertionError("unreachable")  # loop always returns or raises


DOMAIN_CHECK_MODEL = "gemini-3.5-flash-lite"

_DOMAIN_CHECK_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={"in_domain": types.Schema(type=types.Type.BOOLEAN)},
    required=["in_domain"],
)

DOMAIN_CHECK_PROMPT = """Role: You are a fast triage filter placed before a detailed nanophotonics extraction pipeline.

TASK: Decide whether the paper below reports ANY optical-resonance figure-of-merit data for a photonic/plasmonic/optical structure -- specifically at least one of: a resonance wavelength or frequency, a Q-factor, a Figure of Merit (FOM), a refractive-index sensitivity, or a resonance FWHM/linewidth. Wavelength-domain or frequency-domain, experimental or simulated -- all count; the detailed pipeline downstream handles that distinction, you only decide whether ANY such metric is present at all.

Answer "in_domain": true if the paper reports at least one such metric for at least one mode/peak/configuration, even a single one. Answer false only if the paper is about something else entirely (a different kind of device or physics, a review with no reported metric, an unrelated field) and contains none of these metrics anywhere.

Respond STRICTLY as JSON: {"in_domain": true or false}. No other text."""


def check_domain_relevance(paper_text: str, filename: str, job_id: str, file_id: str) -> bool:
    """Cheap single-call gate run before the expensive 3-run consensus
    extraction (see jobs.py's _process_one_file) -- rejects papers with no
    optical-resonance FOM metric anywhere (wrong field entirely, e.g. an
    OLED or solar-cell paper) without burning that whole budget on them.

    Always uses the cheapest/highest-RPD model (flash-lite, 500/day vs
    20/day for the others -- see MODEL_RPD_LIMITS) regardless of the job's
    own model choice, so this check never competes with the real
    extraction for the tight default-chain quota. Fails OPEN (returns
    True, i.e. "let the real extraction decide") on any error -- a flaky
    triage call must never be the reason a legitimate paper gets skipped.
    """
    prompt = DOMAIN_CHECK_PROMPT + f"\n\n--- PAPER TEXT ({filename}) ---\n{paper_text}"
    try:
        response = client.models.generate_content(
            model=DOMAIN_CHECK_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
                response_schema=_DOMAIN_CHECK_SCHEMA,
            ),
        )
        in_domain = bool(json.loads((response.text or "").strip()).get("in_domain", True))
        state.log_usage(DOMAIN_CHECK_MODEL, job_id, file_id, "ok")
        return in_domain
    except Exception as e:
        logger.warning("Domain check failed for %s, letting the full extraction decide: %s", filename, e)
        state.log_usage(DOMAIN_CHECK_MODEL, job_id, file_id, "error")
        return True


def analyze_paper_with_llm(paper_text: str, filename: str, models: list[str]) -> list[dict] | None:
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    last_reason = "quota" if not models else "error"
    while models:
        model = models[0]
        try:
            return _call_model_with_429_retry(model, final_prompt, filename)
        except Exception as e:
            last_reason = _classify_error(e)
            logger.warning("%s failed (%s) for %s, falling back: %s", model, last_reason, filename, e)
            models.pop(0)
            continue

    raise ModelChainExhaustedError(
        f"All models in fallback chain failed for {filename}", reason=last_reason
    )


def analyze_paper_with_llm_pinned(paper_text: str, filename: str, model: str) -> list[dict] | None:
    final_prompt = PROMPT_TEMPLATE.replace("{filename}", filename)
    final_prompt += f"\n\n--- PAPER TEXT ---\n{paper_text}"

    try:
        return _call_model_with_429_retry(model, final_prompt, filename)
    except genai_errors.ClientError as e:
        if e.code == 429:
            logger.warning("%s quota exhausted on a reconciliation run for %s", model, filename)
        else:
            logger.error("Error for %s: %s", filename, e)
        return None
    except Exception as e:
        logger.error("Error for %s: %s", filename, e)
        return None


# Target shape for convert_table_to_viz_schema -- mirrors schema.VIZ_COLUMN_ORDER
# but as a Gemini structured-output schema. Everything is nullable (unlike
# RESPONSE_SCHEMA's PDF-extraction fields): a spreadsheet a researcher already
# has on hand may genuinely be missing most of these, and the whole point of
# this conversion is to accept that gracefully (see VIZ_CONVERSION_PROMPT's
# grounding rule) rather than force the model to invent values.
_VIZ_RECORD_PROPERTIES: dict[str, types.Schema] = {
    "Ref": types.Schema(type=types.Type.STRING, nullable=True),
    "Title": types.Schema(type=types.Type.STRING, nullable=True),
    "Mode ID": types.Schema(type=types.Type.INTEGER, nullable=True),
    "Material Class": types.Schema(type=types.Type.STRING, nullable=True),
    "Base Materials": types.Schema(type=types.Type.STRING, nullable=True),
    "Layer Structure": types.Schema(type=types.Type.STRING, nullable=True),
    "Origin": types.Schema(type=types.Type.STRING, enum=["EXP", "SIM", "UNCLEAR"]),
    "Domain": types.Schema(
        type=types.Type.STRING, enum=["Wavelength", "Frequency", "Other", "Unclear"]
    ),
    "Resonance Wavelength (nm)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "FOM (RIU^-1)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "Sensitivity (nm/RIU)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "FWHM (nm)": types.Schema(type=types.Type.NUMBER, nullable=True),
    "Q-factor": types.Schema(type=types.Type.NUMBER, nullable=True),
}

VIZ_RESPONSE_SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(
        type=types.Type.OBJECT,
        properties=_VIZ_RECORD_PROPERTIES,
        property_ordering=list(_VIZ_RECORD_PROPERTIES),
    ),
)

VIZ_CONVERSION_PROMPT = """Role: You convert an arbitrary, messily-formatted spreadsheet of optical/photonic biosensor data into a standardized schema so it can be charted.

You will receive a JSON object with "columns" (the original column headers, possibly in a language other than English, abbreviated, or using different naming conventions) and "rows" (one object per record, keyed by those original column headers).

GROUNDING RULE: Every value you output must come from the given data. Never invent a number, material, or category that is not stated or clearly implied by the row's own content. If a target field has no reasonable source in the row, output null for it -- missing data is expected and fine.

TASK: Return a JSON array with EXACTLY one object per input row, in the SAME ORDER as the input rows, remapping each row onto the target schema below. Translate non-English text into English where a target field expects English content (e.g. Origin, Domain, Material Class). Keep Ref/Title/Layer Structure as close to the source wording as possible (translating only when the source is in another language).

TARGET SCHEMA (each key is a column; use JSON null when not derivable):
- "Ref": A short identifier for the source record (e.g. a citation marker or filename fragment) -- carry over from the input if present.
- "Title": The paper/record's title.
- "Mode ID": A plain integer disambiguating multiple rows from the same paper/record (1, 2, 3...), or null if there's only one mode/row for that source.
- "Material Class": Coarse material categories, chosen ONLY from "Dielectric", "Metal", "Phase-change", "Polymer", "Semiconductor", "2D Material", sorted alphabetically and joined with ";". Infer from the layer/structure description if it names or clearly implies these categories (e.g. "all dielectric" -> "Dielectric"; "metal+dielectric" -> "Dielectric;Metal").
- "Base Materials": The actual materials/compounds mentioned (e.g. "Au;SiO2"), joined with ";", or null if not stated.
- "Layer Structure": The structure/composition description, carried over from the source (translated to English if needed). Materials joined with " + ", each optionally followed by "(thickness nm)". EXCEPTION for a periodic/repeated block (e.g. a Bragg mirror stated as "A/B, 10 periods" or "10 layers each"): normalize it to "(MaterialA(tA nm)/MaterialB(tB nm)) xN" -- materials of one period slash-separated inside the parentheses, repeat count N right after -- instead of copying the source's own repeat phrasing verbatim, so it stays machine-parseable.
- "Origin": "EXP" (experimental), "SIM" (simulated/numerical), or "UNCLEAR" -- infer from wording like "numerical study", "simulated", "measured", "fabricated"; use "UNCLEAR" if genuinely undeterminable, never leave this null.
- "Domain": "Wavelength", "Frequency", "Other", or "Unclear" -- infer from the units/context of the numeric metrics present (e.g. a value in nm, or a column named with "wavelength", implies "Wavelength"); use "Unclear" if undeterminable, never leave this null.
- "Resonance Wavelength (nm)": Numeric value in nm, or null.
- "FOM (RIU^-1)": Numeric value, or null.
- "Sensitivity (nm/RIU)": Numeric value, converted to nm/RIU if the source uses a convertible unit (e.g. um/RIU: multiply by 1000), or null.
- "FWHM (nm)": Numeric value, or null.
- "Q-factor": Numeric value, or null.

OUTPUT FORMAT: Respond STRICTLY with a valid JSON array of objects, one per input row, in input order. Do NOT wrap the JSON in markdown fences. Do NOT add any preamble or conclusion."""


def convert_table_to_viz_schema(columns: list[str], rows: list[dict]) -> list[dict]:
    """Best-effort remaps an arbitrary/mismatched spreadsheet onto
    schema.VIZ_COLUMN_ORDER via Gemini, nulling out fields it can't derive
    from the given data rather than inventing them (see
    VIZ_CONVERSION_PROMPT). Synchronous, single-shot: this is a much
    lighter task than PDF extraction (no page text to parse), so it skips
    jobs.py's async job/majority-vote machinery and just walks the same
    model fallback chain used for run 1 of a PDF (see
    analyze_paper_with_llm) until one model returns a parseable,
    row-count-matching array. Raises ModelChainExhaustedError if every
    model fails.
    """
    payload = json.dumps({"columns": columns, "rows": rows}, ensure_ascii=False)
    final_prompt = VIZ_CONVERSION_PROMPT + f"\n\n--- INPUT TABLE ---\n{payload}"

    models = filter_models_by_quota(list(MODEL_FALLBACK_CHAIN))
    last_reason = "quota" if not models else "error"
    while models:
        model = models[0]
        try:
            response = client.models.generate_content(
                model=model,
                contents=final_prompt,
                config=get_model_config(model, VIZ_RESPONSE_SCHEMA),
            )
            raw = (response.text or "").strip().replace("```json", "").replace("```", "")
            parsed = json.loads(raw.strip())
            if isinstance(parsed, dict):
                parsed = [parsed]
            if len(parsed) != len(rows):
                raise ValueError(f"Expected {len(rows)} converted rows, got {len(parsed)}")
            return parsed
        except Exception as e:
            last_reason = _classify_error(e)
            logger.warning(
                "%s failed (%s) during viz conversion, falling back: %s", model, last_reason, e
            )
            models.pop(0)
            continue

    raise ModelChainExhaustedError(
        "All models in fallback chain failed for viz conversion", reason=last_reason
    )
