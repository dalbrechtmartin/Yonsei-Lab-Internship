# Expected column order in the final Excel, aligned with prompt.txt.
# One row per Mode/Case now (a paper can produce several rows).
# Note: "Review Status" (Approve/Edit/Exclude) is NOT generated here —
# that belongs to the Vue review workflow (Week 6-8), where the researcher
# actually makes that decision. Adding a hardcoded placeholder here would
# just be dead weight until that feature exists.
COLUMN_ORDER = [
    "Ref",
    "Title",
    "Mode/Case",
    "Material Class",
    "Base Materials",
    "Layer Structure",
    "Spectral Range",
    "Origin",
    "FOM Reported",
    "FOM Domain",
    "FOM Definition",
    "Wavelength-based FOM (/RIU)",
    "FOM Quote",
    "FOM Page",
    "Sensitivity (nm/RIU)",
    "Sensitivity Quote",
    "Sensitivity Page",
    "Q-factor",
    "Q-factor Quote",
    "Q-factor Page",
    "Notes",
    "Model Used",
]


def normalize_result(result: dict) -> dict:
    """Guarantees every row has exactly the expected columns, in the right
    order, even if the LLM forgot one (set to None)."""
    return {col: result.get(col) for col in COLUMN_ORDER}
