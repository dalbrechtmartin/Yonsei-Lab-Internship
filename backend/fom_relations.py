"""Deterministic (non-LLM) algebraic recomputation of one of FOM/Sensitivity/
FWHM from the paper's OWN stated Definition and the other two already-
extracted values -- e.g. a paper defines FOM = S / FWHM and states FOM and
FWHM directly in the text; Sensitivity was never read from the paper, but it
follows arithmetically from what WAS read. This is the same "Calculated
Fields" concept as the extraction prompt's own FWHM=S/FOM fallback (see
prompts/extraction.txt) -- just callable on demand by a reviewer instead of
only at extraction time (e.g. after correcting one of the two known values
by hand, or when the model didn't apply its own fallback for some reason).

Only ever activates when the record's own Definition normalizes to a
recognized relation -- an unrecognized/different Definition means this
never guesses a formula the paper doesn't actually state.
"""

import re

FIELD_FOM = "FOM (RIU^-1)"
FIELD_SENSITIVITY = "Sensitivity (nm/RIU)"
FIELD_FWHM = "FWHM (nm)"

_TARGET_FIELDS = {FIELD_FOM, FIELD_SENSITIVITY, FIELD_FWHM}


def _normalize_definition(definition: str | None) -> str:
    """Collapses whitespace and spells-out-vs-abbreviation differences so
    "FOM = S / FWHM", "FOM=S/FWHM", and "FOM = Sensitivity / FWHM" all
    normalize identically."""
    if not definition:
        return ""
    text = definition.strip().lower()
    text = re.sub(r"\bsensitivity\b", "s", text)
    text = re.sub(r"\s+", "", text)
    return text


# The one relation this dataset's extraction prompt ever produces (see
# prompts/extraction.txt's "Definition" field rule) -- FOM = S / FWHM,
# equivalently S = FOM x FWHM, equivalently FWHM = S / FOM. A different
# Definition (an out-of-scope FOM formula) never matches, so this never
# applies the wrong relation.
_RECOGNIZED_DEFINITIONS = {"fom=s/fwhm"}


def is_recognized_definition(definition: str | None) -> bool:
    return _normalize_definition(definition) in _RECOGNIZED_DEFINITIONS


def _clean(value: float) -> float:
    """Strips IEEE-754 division noise (e.g. 350 / 0.35 == 1000.0000000000001,
    not 1000.0) without touching any real measurement precision -- no paper
    ever states a value to 10+ significant decimal digits, so rounding at
    that scale only ever removes arithmetic noise, never real data. Without
    this, a clean-looking recomputed value would display (and get exported)
    with a long trail of spurious digits that make it look wrong even though
    the arithmetic is correct."""
    return round(value, 10)


def solve(
    target_field: str, *, fom: float | None, sensitivity: float | None, fwhm: float | None
) -> float | None:
    """Solves for `target_field` from the other two values -- the caller
    (main.py) is responsible for only calling this when
    is_recognized_definition() is True, and for passing the CURRENT values
    of the two non-target fields (never guessed/defaulted). Returns None if
    a required input is missing or a division by zero would occur -- the
    caller treats that as "cannot compute", never a guessed fallback.
    """
    if target_field not in _TARGET_FIELDS:
        raise ValueError(f"Unknown target field: {target_field!r}")
    try:
        if target_field == FIELD_FOM:
            if sensitivity is None or fwhm is None or fwhm == 0:
                return None
            return _clean(sensitivity / fwhm)
        if target_field == FIELD_SENSITIVITY:
            if fom is None or fwhm is None:
                return None
            return _clean(fom * fwhm)
        if target_field == FIELD_FWHM:
            if sensitivity is None or fom is None or fom == 0:
                return None
            return _clean(sensitivity / fom)
    except (TypeError, ZeroDivisionError):
        return None
    return None


def describe(
    target_field: str, *, fom: float | None, sensitivity: float | None, fwhm: float | None
) -> str:
    """Human-readable "Calculated Fields" text for a successful solve above
    -- states exactly which two values were used, so a reviewer can verify
    the arithmetic themselves without re-deriving which inputs were
    involved."""
    if target_field == FIELD_FOM:
        return f"FOM = Sensitivity / FWHM (recomputed from Sensitivity={sensitivity}, FWHM={fwhm})"
    if target_field == FIELD_SENSITIVITY:
        return f"Sensitivity = FOM x FWHM (recomputed from FOM={fom}, FWHM={fwhm})"
    if target_field == FIELD_FWHM:
        return f"FWHM = Sensitivity / FOM (recomputed from Sensitivity={sensitivity}, FOM={fom})"
    raise ValueError(f"Unknown target field: {target_field!r}")
