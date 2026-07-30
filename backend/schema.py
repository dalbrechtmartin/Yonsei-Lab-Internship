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
    "Evidence",
    "Location",
    "Review status",
    "Notes",
    "Reconciliation Log",
    "Model Used"
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
    return record


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
]


def normalize_viz_result(result: dict) -> dict:
    record = {col: result.get(col) for col in VIZ_COLUMN_ORDER}
    record["Spectral Range"] = spectral_range(record["Resonance Wavelength (nm)"])
    return record
