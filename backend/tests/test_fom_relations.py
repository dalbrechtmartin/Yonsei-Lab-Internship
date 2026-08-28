import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fom_relations import FIELD_FOM, FIELD_FWHM, FIELD_SENSITIVITY, describe, is_recognized_definition, solve


class TestIsRecognizedDefinition:
    def test_spelled_out_with_spaces(self):
        assert is_recognized_definition("FOM = S / FWHM") is True

    def test_no_spaces(self):
        assert is_recognized_definition("FOM=S/FWHM") is True

    def test_sensitivity_spelled_out(self):
        assert is_recognized_definition("FOM = Sensitivity / FWHM") is True

    def test_unrelated_string_is_not_recognized(self):
        assert is_recognized_definition("Q = lambda / FWHM") is False

    def test_none_is_not_recognized(self):
        assert is_recognized_definition(None) is False

    def test_empty_string_is_not_recognized(self):
        assert is_recognized_definition("") is False


class TestSolveFom:
    def test_valid_inputs(self):
        assert solve(FIELD_FOM, fom=None, sensitivity=300.0, fwhm=3.0) == pytest.approx(100.0)

    def test_missing_sensitivity_returns_none(self):
        assert solve(FIELD_FOM, fom=None, sensitivity=None, fwhm=3.0) is None

    def test_missing_fwhm_returns_none(self):
        assert solve(FIELD_FOM, fom=None, sensitivity=300.0, fwhm=None) is None

    def test_zero_fwhm_returns_none(self):
        assert solve(FIELD_FOM, fom=None, sensitivity=300.0, fwhm=0) is None


class TestSolveSensitivity:
    def test_valid_inputs(self):
        assert solve(FIELD_SENSITIVITY, fom=100.0, sensitivity=None, fwhm=3.0) == pytest.approx(300.0)

    def test_missing_fom_returns_none(self):
        assert solve(FIELD_SENSITIVITY, fom=None, sensitivity=None, fwhm=3.0) is None

    def test_missing_fwhm_returns_none(self):
        assert solve(FIELD_SENSITIVITY, fom=100.0, sensitivity=None, fwhm=None) is None


class TestSolveFwhm:
    def test_valid_inputs(self):
        assert solve(FIELD_FWHM, fom=100.0, sensitivity=300.0, fwhm=None) == pytest.approx(3.0)

    def test_missing_sensitivity_returns_none(self):
        assert solve(FIELD_FWHM, fom=100.0, sensitivity=None, fwhm=None) is None

    def test_missing_fom_returns_none(self):
        assert solve(FIELD_FWHM, fom=None, sensitivity=300.0, fwhm=None) is None

    def test_zero_fom_returns_none(self):
        assert solve(FIELD_FWHM, fom=0, sensitivity=300.0, fwhm=None) is None


class TestSolveUnknownField:
    def test_unknown_target_field_raises(self):
        with pytest.raises(ValueError):
            solve("Q-factor", fom=1.0, sensitivity=1.0, fwhm=1.0)


class TestDescribe:
    def test_fom_description(self):
        text = describe(FIELD_FOM, fom=None, sensitivity=300.0, fwhm=3.0)
        assert "FOM = Sensitivity / FWHM" in text
        assert "Sensitivity=300.0" in text
        assert "FWHM=3.0" in text

    def test_sensitivity_description(self):
        text = describe(FIELD_SENSITIVITY, fom=100.0, sensitivity=None, fwhm=3.0)
        assert "Sensitivity = FOM x FWHM" in text
        assert "FOM=100.0" in text
        assert "FWHM=3.0" in text

    def test_fwhm_description(self):
        text = describe(FIELD_FWHM, fom=100.0, sensitivity=300.0, fwhm=None)
        assert "FWHM = Sensitivity / FOM" in text
        assert "Sensitivity=300.0" in text
        assert "FOM=100.0" in text

    def test_unknown_target_field_raises(self):
        with pytest.raises(ValueError):
            describe("Q-factor", fom=1.0, sensitivity=1.0, fwhm=1.0)
