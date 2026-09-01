COLUMN_ORDER = [
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
    "Resonance Wavelength (nm)",
    "Spectral Range",
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
    "Evidence Field Map",
    "Review status",
    "Notes",
    "Reconciliation Log",
    "Model Used",
]


# Standard optical band boundaries, in nm. Only meaningful for wavelength-
# domain records: a Frequency-domain paper's resonance isn't reported in nm,
# so its "Resonance Wavelength (nm)" is null and this stays null too.
_SPECTRAL_BANDS = (
    (400, "UV"),
    (700, "Visible"),
    (2500, "NIR"),
    (25000, "MIR"),
)


def spectral_range(wavelength_nm: float | int | None) -> str | None:
    if wavelength_nm is None:
        return None
    for upper_bound, label in _SPECTRAL_BANDS:
        if wavelength_nm < upper_bound:
            return label
    return "FIR/THz"


def normalize_result(result: dict) -> dict:
    record = {col: result.get(col) for col in COLUMN_ORDER}
    record["Spectral Range"] = spectral_range(record["Resonance Wavelength (nm)"])
    # A metric computed FROM other extracted values (e.g. FWHM = S/FOM, never
    # stated directly in the paper) is not the same confidence level as a
    # value read straight off the page -- a lone run's own "Approve (AI)"
    # can't self-certify that, so this is enforced here rather than trusted
    # to the model always remembering its own prompt instruction (see
    # prompts/extraction.txt's Calculated Fields rule). Exclude is a
    # stronger, separate flag and is left alone.
    if record["Calculated Fields"] and record["Review status"] == "Approve (AI)":
        record["Review status"] = "Edit"
    return record


# Columns a human reviewer may overwrite via the review-status PATCH's
# optional `fields` -- excludes the bookkeeping columns that stay
# machine-authored/read-only (Evidence/Location/Evidence Field Map are the
# model's own citation of where it found the value, and which of THIS
# record's fields each fragment supports; Raw Value/Conversion Method/
# Calculated Fields are the model's own record of what it converted or
# derived and how -- see prompts/extraction.txt -- and get updated via the
# dedicated recompute flow, not a free-text edit;
# Review status/Reconciliation Log/Model Used are workflow bookkeeping,
# not extracted data).
EDITABLE_RECORD_FIELDS = [
    c
    for c in COLUMN_ORDER
    if c
    not in {
        "Evidence",
        "Location",
        "Evidence Field Map",
        "Raw Value",
        "Conversion Method",
        "Calculated Fields",
        "Review status",
        "Reconciliation Log",
        "Model Used",
    }
]


# The columns the LLM itself must produce for one PDF-extraction record --
# excludes the three columns COLUMN_ORDER also carries but that are never
# part of the model's own JSON: "Spectral Range" is derived from Resonance
# Wavelength after the fact (see normalize_result), "Model Used" is stamped
# on by llm._call_model from the API response metadata, and "Reconciliation
# Log" is written by reconcile.py once multiple runs are merged. This is the
# single source of truth for llm.py's Gemini structured-output schema (see
# llm._RECORD_PROPERTIES) -- add/rename a column here and that schema (and
# its "required" list) follow automatically; only a column that needs a
# non-default JSON type (int/number/enum) needs anything added on the llm.py
# side too (see llm._FIELD_KIND).
MODEL_EXTRACTION_FIELDS = [
    c for c in COLUMN_ORDER if c not in {"Spectral Range", "Reconciliation Log", "Model Used"}
]


# The subset of COLUMN_ORDER that actually drives the visualization -- the
# axes/filters it plots against (see frontend/src/utils/columnTypes.ts's
# find*Column helpers) rather than PDF-extraction bookkeeping (Short Title,
# Mode Description, Definition, Evidence, Location, Review status, Notes,
# Reconciliation Log, Model Used). This is the AI reformatting target when an
# uploaded spreadsheet doesn't already carry these columns -- see
# llm.convert_table_to_viz_schema.
VIZ_COLUMN_ORDER = [
    "Ref",
    "Title",
    "Mode ID",
    "Material Class",
    "Base Materials",
    "Layer Structure",
    "Origin",
    "Domain",
    "Resonance Wavelength (nm)",
    "FOM (RIU^-1)",
    "Sensitivity (nm/RIU)",
    "FWHM (nm)",
    "Q-factor",
    "Sensing Medium",
]


def normalize_viz_result(result: dict) -> dict:
    record = {col: result.get(col) for col in VIZ_COLUMN_ORDER}
    record["Spectral Range"] = spectral_range(record["Resonance Wavelength (nm)"])
    return record
