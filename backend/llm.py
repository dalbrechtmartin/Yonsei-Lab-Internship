"""PDF text extraction, per-model config, and the two
ways a paper gets analyzed -- with fallback-walking (run 1 of a file,
or an explicit single-model job) and pinned/single-attempt (runs 2 and
3 of a file's majority-vote reconciliation set, see jobs.py).
"""

import json
import logging
import os
import re
import time
from pathlib import Path
from typing import cast

import fitz  # PyMuPDF
from dotenv import load_dotenv
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

import schema
import state

logger = logging.getLogger(__name__)

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("API Key not found!")

client = genai.Client(api_key=api_key)

# Each prompt is a large, hand-tuned block of instructions -- kept as its own
# text file under prompts/ (rather than a Python string literal) so it reads,
# diffs and edits like the prose it is, instead of being buried in code.
_PROMPTS_DIR = Path(__file__).resolve().parent / "prompts"


def _load_prompt(filename: str) -> str:
    return (_PROMPTS_DIR / filename).read_text(encoding="utf-8")


PROMPT_TEMPLATE = _load_prompt("extraction.txt")
VIZ_CONVERSION_PROMPT = _load_prompt("viz_conversion.txt")
DOMAIN_CHECK_PROMPT = _load_prompt("domain_check.txt")
PHOTON_SYSTEM_TEMPLATE = _load_prompt("photon_system.txt")

# Last-resort string when the model returns empty text for a Photon chat
# turn (see chat_about_record) -- not itself localized: this is a backend
# fallback, and the frontend has no way to know what language a *real*
# reply would have come back in anyway, so there's no single "right"
# language to translate this into ahead of time either.
PHOTON_FALLBACK_REPLY = "I couldn't come up with a good answer to that. Could you rephrase?"


def extract_text_from_pdf(file_bytes: bytes) -> str:
    text = ""
    with fitz.open(stream=file_bytes, filetype="pdf") as doc:
        for i, page in enumerate(doc, start=1):
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

# `temperature` is deprecated as of the July 21, 2026 API update (see
# ai.google.dev/gemini-api/docs/latest-model#sampling-parameter-deprecation)
# but still accepted for now; every model in the chain used 0 anyway (see
# git history), so there's no per-model config left worth keeping around.

# Field name -> Gemini value kind, for the handful of fields whose JSON type
# isn't a plain string -- an integer, a number, or a fixed enum. Shared
# between the full-extraction schema and the viz-conversion schema below
# wherever both define the same field, so an enum's allowed values only
# have to change in one place. Everything else defaults to STRING.
_FIELD_KIND: dict[str, tuple[types.Type, list[str] | None]] = {
    "Mode ID": (types.Type.INTEGER, None),
    "Origin": (types.Type.STRING, ["EXP", "SIM", "UNCLEAR"]),
    "Domain": (types.Type.STRING, ["Wavelength", "Frequency", "Other", "Unclear"]),
    "Resonance Wavelength (nm)": (types.Type.NUMBER, None),
    "FOM (RIU^-1)": (types.Type.NUMBER, None),
    "Sensitivity (nm/RIU)": (types.Type.NUMBER, None),
    "FWHM (nm)": (types.Type.NUMBER, None),
    "Q-factor": (types.Type.NUMBER, None),
    # "Approve (Manual)" is intentionally NOT in this enum -- only a human
    # reviewer (via the future manual-approval endpoint) can set it, never
    # the model itself.
    "Review status": (types.Type.STRING, ["Approve (AI)", "Edit", "Exclude"]),
}

# Fields that may come back null regardless of the schema's own default --
# numeric metrics a paper simply may not report, plus the two conversion-
# trail fields and Notes, which only apply some of the time. Enum fields
# (Origin/Domain/Review status) are deliberately never in here: the model
# must always pick one, in either schema.
_ALWAYS_NULLABLE_FIELDS = {
    "Resonance Wavelength (nm)",
    "FOM (RIU^-1)",
    "Sensitivity (nm/RIU)",
    "FWHM (nm)",
    "Q-factor",
    "Sensing Medium",
    "Raw Value",
    "Conversion Method",
    "Calculated Fields",
    "Notes",
}


def _build_properties(fields: list[str], *, default_nullable: bool) -> dict[str, types.Schema]:
    """Builds a Gemini structured-output properties dict from a plain list of
    column names (see schema.MODEL_EXTRACTION_FIELDS / schema.VIZ_COLUMN_ORDER)
    -- the field list stays a single source of truth shared with the rest of
    the app, instead of being re-typed as dict keys here too.
    """
    properties = {}
    for field in fields:
        value_type, enum = _FIELD_KIND.get(field, (types.Type.STRING, None))
        kwargs: dict = {"type": value_type}
        if enum is not None:
            kwargs["enum"] = enum
        elif default_nullable or field in _ALWAYS_NULLABLE_FIELDS:
            kwargs["nullable"] = True
        properties[field] = types.Schema(**kwargs)
    return properties


# One JSON object per FOM record, matching prompts/extraction.txt's OUTPUT
# FORMAT. Constraining the shape server-side (instead of hoping the model
# free-forms valid JSON and hand-parsing ```json fences) removes an entire
# class of run-to-run inconsistency: missing keys, wrong types, or
# markdown-wrapped output. propertyOrdering keeps field order stable too.
_RECORD_PROPERTIES = _build_properties(schema.MODEL_EXTRACTION_FIELDS, default_nullable=False)

RESPONSE_SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(
        type=types.Type.OBJECT,
        properties=_RECORD_PROPERTIES,
        required=[field for field, s in _RECORD_PROPERTIES.items() if not s.nullable],
        property_ordering=list(_RECORD_PROPERTIES),
    ),
)


def get_model_config(response_schema: types.Schema = RESPONSE_SCHEMA) -> types.GenerateContentConfig:
    return types.GenerateContentConfig(
        temperature=0,
        thinking_config=_THINKING_CONFIG,
        response_mime_type="application/json",
        response_schema=response_schema,
    )


# --- Model catalog -----------------------------------------------------
# Google ships a new Gemini flash model every few weeks (see
# ai.google.dev/gemini-api/docs/changelog) and reassigns "-latest" aliases
# to point at them (gemini-flash-latest alone has pointed at 3+ different
# concrete models this year). Hand-maintaining a list of model ids here
# means editing this file every time that happens and always being one
# release behind, so instead this asks the Gemini API itself what's
# currently available (models.list) and rebuilds the choices from that,
# falling back to a small static list if discovery fails for any reason
# (network hiccup, auth issue, unexpected response shape) -- a live demo
# should never break because model discovery did.
_FALLBACK_CATALOG = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-3.5-flash-lite"]

_MODEL_CATALOG_TTL_SECONDS = 3600
_model_catalog_cache: dict[str, object] = {"models": None, "fetched_at": 0.0}

# Excludes non-text-output flash-named models (image/tts/audio/live variants,
# e.g. gemini-3.1-flash-lite-image, gemini-omni-flash-preview) -- this
# pipeline only ever calls generateContent for JSON, never those modalities.
_EXCLUDED_NAME_PARTS = ("image", "tts", "audio", "live", "omni", "vision", "embedding")


def _discover_flash_models() -> list[str]:
    names = []
    for m in client.models.list(config={"page_size": 200}):
        name = (m.name or "").removeprefix("models/")
        if not name or "flash" not in name:
            continue
        if any(part in name for part in _EXCLUDED_NAME_PARTS):
            continue
        if "generateContent" not in (m.supported_actions or []):
            continue
        names.append(name)
    return names


def _model_catalog() -> list[str]:
    now = time.time()
    cached = _model_catalog_cache["models"]
    if cached is not None and now - cast(float, _model_catalog_cache["fetched_at"]) < _MODEL_CATALOG_TTL_SECONDS:
        return cast(list, cached)
    try:
        catalog = _discover_flash_models() or list(_FALLBACK_CATALOG)
    except Exception as e:
        logger.warning("Gemini model discovery failed, using the fallback catalog: %s", e)
        catalog = list(_FALLBACK_CATALOG)
    _model_catalog_cache["models"] = catalog
    _model_catalog_cache["fetched_at"] = now
    return catalog


_VERSION_RE = re.compile(r"(\d+)\.(\d+)")


def _version_key(name: str) -> tuple[int, int]:
    match = _VERSION_RE.search(name)
    return (int(match.group(1)), int(match.group(2))) if match else (0, 0)


def _is_lite(model: str) -> bool:
    return "lite" in model


def _newest_generation(models: list[str]) -> list[str]:
    """Keeps only the newest major-version generation within a (sorted,
    newest-first) tier list -- e.g. once 3.x flash models exist, drops 2.x
    ones. Confirmed live: gemini-2.5-flash and gemini-2.5-flash-lite both
    404 at call time ("no longer available to new users") despite still
    being returned by models.list() -- a prior major generation appears to
    get retired wholesale once the next one is established (the entire
    2.0 flash family was shut down together the same way, per the API
    changelog), not model-by-model. This stays correct as new generations
    ship without a hardcoded version number to maintain by hand.
    """
    if not models:
        return models
    newest_major = _version_key(models[0])[0]
    return [m for m in models if _version_key(m)[0] == newest_major]


# How many of the newest models per tier are offered as an explicit,
# user-pinnable choice (see ModelSelector.vue) -- keeps the dropdown short
# and current instead of listing every flash-family id this account has
# ever had access to (models.list() keeps returning ones Google no longer
# serves to new callers, e.g. gemini-2.5-flash 404s at call time with "no
# longer available to new users" -- confirmed live). A model past this cutoff
# isn't gone, it's just not choosable directly -- see build_fallback_chain.
MAX_SELECTABLE_PER_TIER = 3


def _catalog_by_tier() -> tuple[list[str], list[str]]:
    """Non-alias, non-preview models from the live catalog, newest first,
    split into (flash, flash-lite). Preview ids are excluded everywhere (not
    just the dropdown) -- Google can change or pull a preview model without
    notice, which is a bad trait for a hidden fallback slot too, not just a
    pinned choice."""
    concrete = [m for m in _model_catalog() if not m.endswith("-latest") and "preview" not in m]
    non_lite = sorted((m for m in concrete if not _is_lite(m)), key=_version_key, reverse=True)
    lite = sorted((m for m in concrete if _is_lite(m)), key=_version_key, reverse=True)
    return _newest_generation(non_lite), _newest_generation(lite)


def get_selectable_tiers() -> dict[str, list[str]]:
    """The newest MAX_SELECTABLE_PER_TIER models per tier -- what a demo
    user can pin to explicitly, grouped so ModelSelector.vue can show Flash
    and Flash Lite as separate lists instead of one long flat one. See
    GET /models."""
    non_lite, lite = _catalog_by_tier()
    return {
        "flash": non_lite[:MAX_SELECTABLE_PER_TIER],
        "flash_lite": lite[:MAX_SELECTABLE_PER_TIER],
    }


def _explicit_model_choices() -> list[str]:
    tiers = get_selectable_tiers()
    return [*tiers["flash"], *tiers["flash_lite"]]


def get_model_choices() -> list[str]:
    return ["default", *_explicit_model_choices()]


def recommend_tier(file_count: int) -> str:
    """"flash" if a batch of this size comfortably fits the flash tier's
    remaining daily budget for today (see rpd_limit_for and
    CALLS_PER_FILE_RESERVE -- each file reserves up to 3 calls against
    whichever model ends up pinned for it), "flash_lite" otherwise. Used
    both to decide which tier build_fallback_chain tries first and to
    badge the Deposer step's recommended model (see GET /models) -- so a
    big batch is steered toward the tier that can actually get through it
    instead of grinding into the flash tier's tight 20/day cap mid-batch.
    file_count <= 0 (nothing staged yet) defaults to "flash", the
    best-quality tier.
    """
    non_lite, _ = _catalog_by_tier()
    if not non_lite or file_count <= 0:
        return "flash"
    top_flash = non_lite[0]
    remaining = rpd_limit_for(top_flash) - state.calls_today_for_model(top_flash)
    needed = file_count * CALLS_PER_FILE_RESERVE
    return "flash" if remaining >= needed else "flash_lite"


def recommended_model(file_count: int) -> str | None:
    """The specific model recommend_tier's pick resolves to -- what gets
    the green "Recommandé" badge in ModelSelector.vue. Falls back to
    whichever tier actually has a model if the preferred one is somehow
    empty (e.g. discovery failed down to _FALLBACK_CATALOG's single lite
    entry)."""
    non_lite, lite = _catalog_by_tier()
    primary, other = (non_lite, lite) if recommend_tier(file_count) == "flash" else (lite, non_lite)
    pool = primary or other
    return pool[0] if pool else None


_LATEST_ALIAS = "gemini-flash-latest"


def _dedupe_model_identities(models: list[str]) -> list[str]:
    """De-dupes a candidate model list, keeping the first occurrence of
    each identity -- like a plain dict.fromkeys() dedupe, EXCEPT
    `_LATEST_ALIAS` and the newest catalog non-lite model (`_catalog_by_tier`'s
    non_lite[0]) are treated as the SAME identity, not two different ones.

    recommended_model() already shows that concrete id to the user as what
    "default" means (the green "Recommandé" badge) -- the alias is only
    used for the actual API call as a hedge against our own hourly catalog
    cache being stale (see _model_catalog_cache), not because it's expected
    to differ from that id. So trying both back-to-back after the first one
    fails wastes a full sleep_seconds_for delay and a quota-counted call on
    what is, at best, a retry of the exact same weights under a different
    name -- confirmed live (a batch that hit this literally re-tried 3.7
    under its alias right after 3.7 itself had just failed). Whichever of
    the two appears FIRST in `models` wins and the other is dropped,
    regardless of which one that is (the deep fallback chain always leads
    with the alias; an explicit user pin of the concrete id in
    build_available_models leads with that instead).
    """
    non_lite, _ = _catalog_by_tier()
    newest_non_lite = non_lite[0] if non_lite else None

    def identity(model: str) -> str:
        if newest_non_lite and model in (_LATEST_ALIAS, newest_non_lite):
            return _LATEST_ALIAS
        return model

    seen: set[str] = set()
    deduped = []
    for model in models:
        key = identity(model)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(model)
    return deduped


def build_fallback_chain(file_count: int = 0) -> list[str]:
    """"Default": the model recommend_tier picks for this batch size
    first, then EVERY other known model as a deep fallback -- newest first
    within each tier. A model past the MAX_SELECTABLE_PER_TIER cutoff is
    never offered as a manual pin (see get_selectable_tiers) but still
    lives here as a hidden last resort: if every selectable model in a
    tier is quota-exhausted, this keeps trying progressively older ones
    rather than failing the file outright.
    """
    non_lite, lite = _catalog_by_tier()
    if recommend_tier(file_count) == "flash":
        chain = [_LATEST_ALIAS, *non_lite, *lite]
    else:
        chain = [*lite, _LATEST_ALIAS, *non_lite]
    deduped = _dedupe_model_identities(chain)
    return deduped if len(deduped) > 1 else list(_FALLBACK_CATALOG)


def build_available_models(model_choice: str, file_count: int = 0) -> list[str]:
    chain = build_fallback_chain(file_count)
    if model_choice == "default":
        return chain
    if model_choice not in _explicit_model_choices():
        raise ValueError(f"Unknown model choice: {model_choice}")
    # Picking a specific model from the dropdown is a PREFERENCE, not an
    # exclusive attempt: it's tried first, but this still falls back
    # through the rest of the same chain "default" would if it's
    # unavailable/exhausted, instead of failing the file outright. Runs 2
    # and 3 stay pinned to whichever model actually succeeds here either
    # way (see jobs.py's MODEL PINNING note) -- that per-file consistency
    # never depended on run 1 having exactly one candidate to try.
    return _dedupe_model_identities([model_choice, *chain])


def domain_check_model() -> str:
    """Cheapest/highest-RPD model currently available -- see
    check_domain_relevance, which always uses this regardless of the job's
    own model choice. Drawn from the full catalog (not just the capped
    selectable tiers), since this is an internal choice, not a user pin."""
    _, lite = _catalog_by_tier()
    return lite[0] if lite else "gemini-3.5-flash-lite"


def _mark_if_model_retired(model: str, e: Exception, job_id: str | None = None) -> None:
    """A model id models.list() still returns can nonetheless 404 at call
    time once Google retires it for new callers (confirmed live: a 404
    body reading "gemini-2.5-flash is no longer available to new users").
    The catalog's own recency filtering (see _catalog_by_tier) should
    normally keep such models out, but if one slips through anyway (a stale
    cache, an account-specific retirement), treat it the same as a daily
    quota exhaustion -- skipped for the rest of today -- instead of
    retry-looping (or, for a job pinned to only this model, repeatedly
    deferring the whole file) against a model that will never succeed.
    """
    if getattr(e, "code", None) == 404:
        state.mark_model_exhausted_today(model)
        logger.warning("%s appears to be retired/unavailable (404) -- skipping it for today", model)
        state.append_job_event(job_id, "warn", "extractRetired", model=model)


# Free-tier RPM/RPD ceilings for this project's API key -- see
# ai.google.dev/gemini-api/docs/rate-limits. All current flash-lite models
# share one tier and all current (non-lite) flash models share a tighter
# one, so this keys off that tier instead of an exact model id -- it stays
# correct for a newly discovered model without needing its own entry.
# Update the numbers here if the account's tier changes.
_LITE_TIER = {"sleep_seconds": 5, "rpd_limit": 500}  # 15 RPM
_FLASH_TIER = {"sleep_seconds": 13, "rpd_limit": 20}  # 5 RPM
DEFAULT_SLEEP_SECONDS = 13


def sleep_seconds_for(model: str | None) -> int:
    if model is None:
        return DEFAULT_SLEEP_SECONDS
    return cast(int, (_LITE_TIER if _is_lite(model) else _FLASH_TIER)["sleep_seconds"])


def rpd_limit_for(model: str) -> int:
    return cast(int, (_LITE_TIER if _is_lite(model) else _FLASH_TIER)["rpd_limit"])


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
    2. This app's own call count vs rpd_limit_for -- an estimate that
       can undercount (calls made outside this app, or a run that failed
       before logging), so it's only used to pre-emptively avoid the
       FIRST 429 rather than as a hard truth.
    """
    kept = []
    for model in models:
        if state.is_model_exhausted_today(model):
            continue
        if state.calls_today_for_model(model) + CALLS_PER_FILE_RESERVE <= rpd_limit_for(model):
            kept.append(model)
    return kept


def _call_model(model: str, final_prompt: str, filename: str) -> list[dict] | None:
    response = client.models.generate_content(
        model=model,
        contents=final_prompt,
        config=get_model_config(),
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
# one request. sleep_seconds_for is tuned for request-per-minute limits
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


def _call_model_with_429_retry(
    model: str,
    final_prompt: str,
    filename: str,
    job_id: str | None = None,
) -> list[dict] | None:
    state.append_job_event(job_id, "info", "extractAttempt", filename=filename, model=model)
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
                state.append_job_event(
                    job_id, "warn", "extractQuotaDay", filename=filename, model=model
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
                state.append_job_event(
                    job_id, "warn", "extractGiveUp", filename=filename, model=model, seconds=round(delay)
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
            state.append_job_event(
                job_id,
                "warn",
                "extractRetryQuota",
                filename=filename,
                model=model,
                attempt=attempt + 1,
                max_attempts=MAX_429_RETRIES + 1,
                seconds=round(delay),
            )
            time.sleep(delay)
    raise AssertionError("unreachable")  # loop always returns or raises


_DOMAIN_CHECK_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={"in_domain": types.Schema(type=types.Type.BOOLEAN)},
    required=["in_domain"],
)


def check_domain_relevance(paper_text: str, filename: str, job_id: str, file_id: str) -> bool:
    """Cheap single-call gate run before the expensive 3-run consensus
    extraction (see jobs.py's _process_one_file) -- rejects papers with no
    optical-resonance FOM metric anywhere (wrong field entirely, e.g. an
    OLED or solar-cell paper) without burning that whole budget on them.

    Always uses the cheapest/highest-RPD model currently available (see
    domain_check_model) regardless of the job's own model choice, so this
    check never competes with the real extraction for the tight
    default-chain quota. Fails OPEN (returns True, i.e. "let the real
    extraction decide") on any error -- a flaky triage call must never be
    the reason a legitimate paper gets skipped.
    """
    model = domain_check_model()
    prompt = DOMAIN_CHECK_PROMPT + f"\n\n--- PAPER TEXT ({filename}) ---\n{paper_text}"
    state.append_job_event(job_id, "info", "domainCheckStart", filename=filename, model=model)
    try:
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=0,
                response_mime_type="application/json",
                response_schema=_DOMAIN_CHECK_SCHEMA,
            ),
        )
        in_domain = bool(json.loads((response.text or "").strip()).get("in_domain", True))
        state.log_usage(model, job_id, file_id, "ok")
        if not in_domain:
            state.append_job_event(job_id, "warn", "domainCheckOut", filename=filename)
        return in_domain
    except Exception as e:
        logger.warning("Domain check failed for %s, letting the full extraction decide: %s", filename, e)
        state.log_usage(model, job_id, file_id, "error")
        return True


def analyze_paper_with_llm(
    paper_text: str, filename: str, models: list[str], job_id: str | None = None
) -> list[dict] | None:
    final_prompt = PROMPT_TEMPLATE + f"\n\n--- PAPER TEXT ---\n{paper_text}"

    last_reason = "quota" if not models else "error"
    while models:
        model = models[0]
        try:
            return _call_model_with_429_retry(model, final_prompt, filename, job_id)
        except Exception as e:
            last_reason = _classify_error(e)
            _mark_if_model_retired(model, e, job_id)
            logger.warning("%s failed (%s) for %s, falling back: %s", model, last_reason, filename, e)
            models.pop(0)
            state.append_job_event(
                job_id,
                "warn",
                "extractSwitch",
                filename=filename,
                model=model,
                reason=last_reason,
                next_model=models[0] if models else None,
            )
            continue

    raise ModelChainExhaustedError(
        f"All models in fallback chain failed for {filename}", reason=last_reason
    )


def analyze_paper_with_llm_pinned(
    paper_text: str, filename: str, model: str, job_id: str | None = None
) -> tuple[list[dict] | None, str | None]:
    """Returns (records, None) on success, or (None, reason) on failure --
    `reason` (see _classify_error) is threaded through to state.add_job_file_run
    so a 429/503 on a pinned reconciliation run shows up in the frontend's
    journal instead of only in this process's own logs."""
    final_prompt = PROMPT_TEMPLATE + f"\n\n--- PAPER TEXT ---\n{paper_text}"

    try:
        return _call_model_with_429_retry(model, final_prompt, filename, job_id), None
    except genai_errors.ClientError as e:
        reason = _classify_error(e)
        _mark_if_model_retired(model, e, job_id)
        if e.code == 429:
            logger.warning("%s quota exhausted on a reconciliation run for %s", model, filename)
        else:
            logger.error("Error for %s: %s", filename, e)
        return None, reason
    except Exception as e:
        logger.error("Error for %s: %s", filename, e)
        return None, _classify_error(e)


# Target shape for convert_table_to_viz_schema -- mirrors schema.VIZ_COLUMN_ORDER
# but as a Gemini structured-output schema. Everything is nullable (unlike
# RESPONSE_SCHEMA's PDF-extraction fields): a spreadsheet a researcher already
# has on hand may genuinely be missing most of these, and the whole point of
# this conversion is to accept that gracefully (see VIZ_CONVERSION_PROMPT's
# grounding rule) rather than force the model to invent values.
_VIZ_RECORD_PROPERTIES = _build_properties(schema.VIZ_COLUMN_ORDER, default_nullable=True)

VIZ_RESPONSE_SCHEMA = types.Schema(
    type=types.Type.ARRAY,
    items=types.Schema(
        type=types.Type.OBJECT,
        properties=_VIZ_RECORD_PROPERTIES,
        property_ordering=list(_VIZ_RECORD_PROPERTIES),
    ),
)


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

    models = filter_models_by_quota(build_fallback_chain())
    last_reason = "quota" if not models else "error"
    while models:
        model = models[0]
        try:
            response = client.models.generate_content(
                model=model,
                contents=final_prompt,
                config=get_model_config(VIZ_RESPONSE_SCHEMA),
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
            _mark_if_model_retired(model, e)
            logger.warning(
                "%s failed (%s) during viz conversion, falling back: %s", model, last_reason, e
            )
            models.pop(0)
            continue

    raise ModelChainExhaustedError(
        "All models in fallback chain failed for viz conversion", reason=last_reason
    )


# Fields worth surfacing to Photon (see chat_about_record) -- deliberately a
# curated subset of schema.COLUMN_ORDER (checked against it below), not
# every column: pure workflow bookkeeping a reviewer never asked about --
# "Ref" (the filename tag), "Short Title" (a duplicate of "Title" for UI
# table width only), "Spectral Range" (mechanically derived FROM "Resonance
# Wavelength (nm)", never its own fact), "Evidence Field Map" (an internal
# fragment->field index the review UI uses for click-to-source, not
# something worth reading as prose), "Reconciliation Log" (multi-run voting
# bookkeeping), and "Model Used" -- would only add clutter a chat persona
# has no reason to ever mention. Order here is a human narrative order
# (title, then mode, then materials, then metrics, then provenance), not
# COLUMN_ORDER's own storage order.
_RECORD_CONTEXT_FIELDS = [
    "Title",
    "Mode ID",
    "Mode Description",
    "Material Class",
    "Base Materials",
    "Layer Structure",
    "Origin",
    "Domain",
    "Resonance Wavelength (nm)",
    "FOM (RIU^-1)",
    "Definition",
    "Sensitivity (nm/RIU)",
    "FWHM (nm)",
    "Q-factor",
    "Sensing Medium",
    "Raw Value",
    "Conversion Method",
    "Calculated Fields",
    "Evidence",
    "Location",
    "Review status",
    "Notes",
]
assert set(_RECORD_CONTEXT_FIELDS) <= set(schema.COLUMN_ORDER), "unknown field in _RECORD_CONTEXT_FIELDS"


def _format_record_context(record: dict) -> str:
    """Renders one extraction record -- the same raw COLUMN_ORDER-keyed dict
    used everywhere else in main.py, e.g. job_file["records"][record_index]
    in the recompute-field endpoint -- as a plain-text block for
    PHOTON_SYSTEM_TEMPLATE's {record_context}. Gemini has no other window
    into this record's data, so this block IS the ground truth
    chat_about_record grounds every answer in.

    Fields that are None or an empty string are skipped entirely rather
    than printed as a literal "None"/"" line -- that would otherwise read
    as the paper explicitly reporting "no value" for a metric, instead of
    the metric simply never being extracted for this record.
    """
    lines = []
    for field in _RECORD_CONTEXT_FIELDS:
        value = record.get(field)
        if value is None or value == "":
            continue
        lines.append(f"{field}: {value}")
    return "\n".join(lines)


def chat_about_record(
    record: dict, page_text: str | None, message: str, history: list[dict]
) -> str:
    """One turn of Photon, the record-grounded chat assistant on the review
    screen (see prompts/photon_system.txt) -- the first multi-turn call in
    this project, everything else here is single-shot. The record's own
    fields plus its citation's source page text go in `system_instruction`
    (grounding/persona, not part of the visible conversation), and
    `history` -- the prior turns of THIS conversation, each a
    {"role": "user"|"model", "content": ...} dict -- is replayed as
    `contents` ahead of the new `message` so Gemini can follow a multi-turn
    back-and-forth rather than re-answering `message` in isolation each
    time.

    Always uses domain_check_model() (the cheap/highest-RPD tier), same
    reasoning as check_domain_relevance: a chat aside must never compete
    with the real extraction pipeline for the tight default-chain quota.
    Exceptions are left to propagate -- the caller (main.py's chat endpoint)
    turns them into a 502, this function does not swallow them itself.
    """
    system_instruction = PHOTON_SYSTEM_TEMPLATE.format(
        record_context=_format_record_context(record), page_text=page_text or ""
    )
    contents = [
        types.Content(role=turn["role"], parts=[types.Part(text=turn["content"])])
        for turn in history
    ]
    contents.append(types.Content(role="user", parts=[types.Part(text=message)]))

    response = client.models.generate_content(
        model=domain_check_model(),
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=0.4,
        ),
    )
    return (response.text or "").strip() or PHOTON_FALLBACK_REPLY
