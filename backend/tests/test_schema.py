import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from schema import EDITABLE_RECORD_FIELDS, normalize_result


def make_raw(**overrides) -> dict:
    base = {
        "Ref": "paper_x",
        "Resonance Wavelength (nm)": 1550.0,
        "FWHM (nm)": 5.0,
        "Review status": "Approve (AI)",
        "Notes": None,
        "Calculated Fields": None,
    }
    base.update(overrides)
    return base


class TestCalculatedFieldsForcesEdit:
    def test_calculated_field_downgrades_approve_ai_to_edit(self):
        record = normalize_result(
            make_raw(**{"Calculated Fields": "FWHM = Sensitivity / FOM (not stated directly)"})
        )
        assert record["Review status"] == "Edit"

    def test_no_calculated_field_leaves_approve_ai_untouched(self):
        record = normalize_result(make_raw())
        assert record["Review status"] == "Approve (AI)"

    def test_exclude_is_not_overridden_by_a_calculated_field(self):
        record = normalize_result(
            make_raw(
                **{
                    "Calculated Fields": "FWHM = Sensitivity / FOM (not stated directly)",
                    "Review status": "Exclude",
                }
            )
        )
        assert record["Review status"] == "Exclude"

    def test_already_edit_is_left_as_is(self):
        record = normalize_result(
            make_raw(
                **{
                    "Calculated Fields": "FWHM = Sensitivity / FOM (not stated directly)",
                    "Review status": "Edit",
                }
            )
        )
        assert record["Review status"] == "Edit"


def test_calculated_fields_is_not_human_editable():
    assert "Calculated Fields" not in EDITABLE_RECORD_FIELDS


def test_evidence_field_map_is_not_human_editable():
    assert "Evidence Field Map" not in EDITABLE_RECORD_FIELDS
