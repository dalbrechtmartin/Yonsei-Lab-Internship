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


def normalize_result(result: dict) -> dict:
    return {col: result.get(col) for col in COLUMN_ORDER}
