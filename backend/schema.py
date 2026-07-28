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
