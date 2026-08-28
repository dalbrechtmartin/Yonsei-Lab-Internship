"""Deterministic (non-LLM) conversion of a sensitivity value reported in a
sensing-medium-specific concentration/pressure unit into the dataset's
canonical nm/RIU -- via the Gladstone-Dale relation (gas) or a refractive-
index increment dn/dc (liquid). The paper's own text is only ever read by
the LLM (see prompts/extraction.txt's "Sensing Medium" field); the model
just classifies the medium/analyte and leaves Sensitivity null when it
isn't already in nm/RIU. The arithmetic itself lives here in plain Python
-- an LLM isn't reliable for exact physical constants, and a reviewer
needs to be able to recompute with a different formula or raw value
without spending another Gemini call (see main.py's recompute-field
endpoint).

Never guesses: an unrecognized medium/analyte or raw unit returns None
rather than silently applying the wrong constant.

Sources: Gladstone-Dale relation (Birch & Downs, Metrologia 30:155, 1993;
NIST Engineering Metrology Toolbox); refractiveindex.info (Bideau-Mehu, for
CO2); dn/dc references: Zhao, Brown & Schuck, Biophysical Journal 100:2309
(2011); NBS Monograph 64; CRC Handbook of Chemistry and Physics (aqueous
NaCl/glucose tables).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class GasReference:
    key: str
    label: str
    n_minus_1: float  # (n-1) of the pure gas, ~589nm, ~1 atm/20C


@dataclass(frozen=True)
class LiquidReference:
    key: str
    label: str
    dn_dc: float
    basis_unit: str  # the concentration unit dn_dc is expressed per one of


GAS_REFERENCES: dict[str, GasReference] = {
    "air": GasReference("air", "Air", 2.77e-4),
    "co2": GasReference("co2", "CO2", 4.5e-4),
}

# dn/dc is empirical per analyte/solvent pair -- not a universal constant
# like a gas's Gladstone-Dale (n-1). "protein_generic" is a fallback average
# (0.185-0.190 mL/g, see Zhao/Brown/Schuck 2011) for a paper that names a
# protein but not one specific/well-characterized enough to look up its own
# dn/dc; prefer a named entry (e.g. "bsa") when the paper is specific.
LIQUID_REFERENCES: dict[str, LiquidReference] = {
    "nacl": LiquidReference("nacl", "NaCl (aqueous)", 1.8e-3, "%w/w"),
    "glucose": LiquidReference("glucose", "Glucose (aqueous)", 1.5e-3, "%w/w"),
    "sucrose": LiquidReference("sucrose", "Sucrose (aqueous)", 1.5e-3, "%w/w"),
    "protein_generic": LiquidReference(
        "protein_generic", "Generic protein (aqueous buffer)", 0.190, "g/mL"
    ),
    "bsa": LiquidReference("bsa", "BSA (aqueous buffer)", 0.1866, "g/mL"),
}

# Gladstone-Dale constants above are tabulated at ~1 atm -- used as the
# reference pressure for the pressure-basis formula below regardless of
# which gas is being converted (see _gas_from_pressure).
AIR_PRESSURE_REF_PA = 101325.0

_GAS_FRACTION_UNITS = {"%": 1e-2, "vol%": 1e-2, "mol%": 1e-2, "ppm": 1e-6, "ppb": 1e-9}
_GAS_PRESSURE_UNITS_PA = {
    "pa": 1.0,
    "kpa": 1e3,
    "bar": 1e5,
    "mbar": 1e2,
    "atm": AIR_PRESSURE_REF_PA,
}

_LIQUID_PERCENT_WW_UNITS = {"%w/w": 1.0, "%": 1.0}
_LIQUID_G_PER_ML_UNITS = {"mg/ml": 1e-3, "g/ml": 1.0, "g/l": 1e-3, "mg/l": 1e-6}


class UnknownFormulaError(ValueError):
    pass


def _gas_from_pressure(gas: GasReference, magnitude: float, raw_unit: str) -> tuple[float, str] | None:
    """A single gas's own pressure/density varying (e.g. an ambient-air
    pressure sensor, or a pure-CO2 gas cell) -- Gladstone-Dale is linear in
    pressure at fixed temperature, so Δn scales directly off the reference
    (n-1)/pressure ratio for THIS gas."""
    pa_per_unit = _GAS_PRESSURE_UNITS_PA.get(raw_unit.strip().lower())
    if pa_per_unit is None:
        return None
    s_riu = magnitude * (AIR_PRESSURE_REF_PA / pa_per_unit) / gas.n_minus_1
    method = (
        f"Gladstone-Dale ({gas.label}, n-1={gas.n_minus_1:.3g} at 1 atm, 589nm): "
        f"S_RIU = S_c x (101325 Pa / 1 {raw_unit}) / (n-1)"
    )
    return s_riu, method


def _gas_from_fraction(gas: GasReference, magnitude: float, raw_unit: str) -> tuple[float, str] | None:
    """A trace gas diluted by mole/volume fraction in air (e.g. ppm CO2 in
    air) -- refractivity is approximately additive by fraction, so Δn is
    the fraction times the two gases' (n-1) difference."""
    if gas.key == "air":
        return None  # a fraction of air itself has no "other gas" to mix with
    fraction_per_unit = _GAS_FRACTION_UNITS.get(raw_unit.strip().lower())
    if fraction_per_unit is None:
        return None
    air = GAS_REFERENCES["air"]
    delta = gas.n_minus_1 - air.n_minus_1
    if delta == 0:
        return None
    s_riu = magnitude / (fraction_per_unit * delta)
    method = (
        f"Gladstone-Dale (trace {gas.label} in air, d(n-1)={delta:.3g} per unit mole "
        f"fraction, 589nm): S_RIU = S_c / (fraction-per-{raw_unit} x d(n-1))"
    )
    return s_riu, method


def gas_sensitivity_to_riu(gas_key: str, magnitude: float, raw_unit: str) -> tuple[float, str] | None:
    """`magnitude` is the paper's own sensitivity in nm per one `raw_unit`
    of gas concentration or pressure. Returns (S_RIU, Conversion Method
    text), or None if `gas_key`/`raw_unit` isn't a recognized combination
    -- never a guessed fallback."""
    gas = GAS_REFERENCES.get(gas_key.lower())
    if gas is None:
        return None
    return _gas_from_pressure(gas, magnitude, raw_unit) or _gas_from_fraction(gas, magnitude, raw_unit)


def liquid_sensitivity_to_riu(analyte_key: str, magnitude: float, raw_unit: str) -> tuple[float, str] | None:
    """Same shape as gas_sensitivity_to_riu, for a liquid analyte/solvent
    pair via its dn/dc."""
    ref = LIQUID_REFERENCES.get(analyte_key.lower())
    if ref is None:
        return None
    unit_table = _LIQUID_PERCENT_WW_UNITS if ref.basis_unit == "%w/w" else _LIQUID_G_PER_ML_UNITS
    basis_units_per_raw_unit = unit_table.get(raw_unit.strip().lower())
    if basis_units_per_raw_unit is None:
        return None
    s_per_basis_unit = magnitude / basis_units_per_raw_unit
    s_riu = s_per_basis_unit / ref.dn_dc
    method = (
        f"dn/dc ({ref.label}, dn/dc={ref.dn_dc:.3g} RIU per {ref.basis_unit}, 589nm): "
        f"S_RIU = S_c / (raw-unit-to-{ref.basis_unit} factor x dn/dc)"
    )
    return s_riu, method


def convert(
    formula_key: str,
    magnitude: float,
    raw_unit: str,
    custom_constant: float | None = None,
) -> tuple[float, str] | None:
    """Dispatches on a "gas:<key>"/"liquid:<key>" formula key (see
    list_formulas) to gas_sensitivity_to_riu/liquid_sensitivity_to_riu, or
    handles a "gas:custom"/"liquid:custom" pick -- the reviewer supplies
    the constant themselves (already in units of Δn per one `raw_unit`),
    so no internal unit table lookup is needed for that case. Returns None
    when `raw_unit` isn't recognized for the chosen built-in formula.
    Raises UnknownFormulaError for a malformed/unknown `formula_key`, or a
    missing/zero custom_constant on a "*:custom" pick.
    """
    kind, _, key = formula_key.partition(":")
    if key == "custom":
        if not custom_constant:
            raise UnknownFormulaError("A custom formula requires a non-zero constant.")
        if kind not in ("gas", "liquid"):
            raise UnknownFormulaError(f"Unknown formula kind: {formula_key!r}")
        s_riu = magnitude / custom_constant
        method = f"Custom {kind} constant ({custom_constant:.3g} per 1 {raw_unit}): S_RIU = S_c / constant"
        return s_riu, method
    if kind == "gas":
        return gas_sensitivity_to_riu(key, magnitude, raw_unit)
    if kind == "liquid":
        return liquid_sensitivity_to_riu(key, magnitude, raw_unit)
    raise UnknownFormulaError(f"Unknown formula kind: {formula_key!r}")


def list_formulas() -> list[dict]:
    """Options for the review screen's "recompute sensitivity" formula
    picker (see GET /sensing-medium-formulas) -- one entry per known
    gas/liquid reference, plus a generic custom-constant entry for each
    medium type for an analyte/gas not in the registry."""
    formulas = [
        {"key": f"gas:{g.key}", "label": g.label, "medium": "gas"} for g in GAS_REFERENCES.values()
    ] + [
        {"key": f"liquid:{ref.key}", "label": ref.label, "medium": "liquid"}
        for ref in LIQUID_REFERENCES.values()
    ]
    formulas.append({"key": "gas:custom", "label": "Custom gas constant", "medium": "gas"})
    formulas.append({"key": "liquid:custom", "label": "Custom liquid constant", "medium": "liquid"})
    return formulas
