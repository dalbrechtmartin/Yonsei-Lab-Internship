import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sensing_medium_conversion import (
    UnknownFormulaError,
    convert,
    gas_sensitivity_to_riu,
    liquid_sensitivity_to_riu,
    list_formulas,
)


class TestGasPressureBasis:
    def test_air_pressure_sensitivity_converts_to_riu(self):
        # S_c = 1 nm/kPa -> S_RIU = 1 * (101325/1000) / 2.77e-4
        result = gas_sensitivity_to_riu("air", 1.0, "kPa")
        assert result is not None
        s_riu, method = result
        assert s_riu == pytest.approx(101.325 / 2.77e-4)
        assert "Gladstone-Dale" in method

    def test_unrecognized_pressure_unit_returns_none(self):
        assert gas_sensitivity_to_riu("air", 1.0, "psi") is None

    def test_unrecognized_gas_returns_none(self):
        assert gas_sensitivity_to_riu("nh3", 1.0, "kPa") is None


class TestGasFractionBasis:
    def test_trace_co2_in_air_converts_to_riu(self):
        delta = 4.5e-4 - 2.77e-4
        result = gas_sensitivity_to_riu("co2", 1.0, "%")
        assert result is not None
        s_riu, _ = result
        assert s_riu == pytest.approx(1.0 / (1e-2 * delta))

    def test_air_fraction_is_not_a_valid_combination(self):
        # A mole fraction "of air" has no other gas to mix with.
        assert gas_sensitivity_to_riu("air", 1.0, "%") is None

    def test_ppm_unit_recognized(self):
        assert gas_sensitivity_to_riu("co2", 1.0, "ppm") is not None


class TestLiquidPercentBasis:
    def test_nacl_percent_ww_converts_to_riu(self):
        result = liquid_sensitivity_to_riu("nacl", 1.0, "%w/w")
        assert result is not None
        s_riu, method = result
        assert s_riu == pytest.approx(1.0 / 1.8e-3)
        assert "dn/dc" in method

    def test_unrecognized_unit_for_percent_basis_returns_none(self):
        # NaCl's reference is keyed to %w/w -- a g/mL-family unit isn't
        # applicable without a density conversion this module doesn't do.
        assert liquid_sensitivity_to_riu("nacl", 1.0, "mg/mL") is None


class TestLiquidGPerMlBasis:
    def test_protein_mg_per_ml_converts_to_riu(self):
        # 1 mg/mL = 1e-3 g/mL -> S_per_basis = magnitude / 1e-3
        result = liquid_sensitivity_to_riu("protein_generic", 1.0, "mg/mL")
        assert result is not None
        s_riu, _ = result
        assert s_riu == pytest.approx((1.0 / 1e-3) / 0.190)

    def test_unrecognized_analyte_returns_none(self):
        assert liquid_sensitivity_to_riu("lysozyme", 1.0, "mg/mL") is None


class TestConvertDispatch:
    def test_gas_key_routes_to_gas_formula(self):
        assert convert("gas:air", 1.0, "kPa") == gas_sensitivity_to_riu("air", 1.0, "kPa")

    def test_liquid_key_routes_to_liquid_formula(self):
        assert convert("liquid:nacl", 1.0, "%w/w") == liquid_sensitivity_to_riu("nacl", 1.0, "%w/w")

    def test_custom_gas_constant(self):
        s_riu, method = convert("gas:custom", 10.0, "ppm", custom_constant=2.0)
        assert s_riu == pytest.approx(5.0)
        assert "Custom" in method

    def test_custom_constant_missing_raises(self):
        with pytest.raises(UnknownFormulaError):
            convert("gas:custom", 10.0, "ppm", custom_constant=None)

    def test_custom_constant_zero_raises(self):
        with pytest.raises(UnknownFormulaError):
            convert("liquid:custom", 10.0, "mg/mL", custom_constant=0)

    def test_unknown_formula_kind_raises(self):
        with pytest.raises(UnknownFormulaError):
            convert("solid:diamond", 1.0, "kPa")

    def test_unrecognized_unit_returns_none_not_a_guess(self):
        assert convert("gas:air", 1.0, "psi") is None


def test_list_formulas_covers_every_registry_entry_plus_custom():
    formulas = list_formulas()
    keys = {f["key"] for f in formulas}
    assert "gas:air" in keys
    assert "gas:co2" in keys
    assert "liquid:nacl" in keys
    assert "gas:custom" in keys
    assert "liquid:custom" in keys
    assert all(f["medium"] in ("gas", "liquid") for f in formulas)
