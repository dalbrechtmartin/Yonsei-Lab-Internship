COLUMN_ORDER = [
    "Ref",
    "Title",
    "Short Title",
    "Mode/case",
    "Material Class",
    "Base Materials",
    "Layer Structure",
    "Origin",
    "Domain",
    "FOM reported",
    "FOM value",
    "Definition",
    "Sensitivity",
    "FWHM",
    "Q-factor",
    "Evidence",
    "Location",
    "Review status",
    "Notes",
    "Model Used"
]


def normalize_result(result: dict) -> dict:
    return {col: result.get(col) for col in COLUMN_ORDER}
