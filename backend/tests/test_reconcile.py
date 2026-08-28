import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from reconcile import reconcile_runs
from schema import normalize_result


def make_record(**overrides) -> dict:
    base = {
        "Ref": "paper_x",
        "Title": "A Test Paper",
        "Short Title": "Test Paper",
        "Mode ID": 1,
        "Mode Description": "main",
        "Material Class": "Dielectric;Metal",
        "Base Materials": "Au;SiO2",
        "Layer Structure": "Au(50nm) + SiO2",
        "Origin": "SIM",
        "Domain": "Wavelength",
        "Resonance Wavelength (nm)": 1550.0,
        "FOM (RIU^-1)": 100.0,
        "Definition": "FOM = S/FWHM",
        "Sensitivity (nm/RIU)": 500.0,
        "FWHM (nm)": 5.0,
        "Q-factor": 200,
        "Evidence": "FOM of 100",
        "Location": "Page 3",
        "Review status": "Approve (AI)",
        "Notes": None,
        "Model Used": "gemini-3.5-flash",
    }
    base.update(overrides)
    return normalize_result(base)


def notes_reconciliation_lines(record: dict) -> list[str]:
    log = record.get("Reconciliation Log") or ""
    return [line.strip() for line in log.split("\n") if line.strip()]


class TestBasics:
    def test_empty_input_returns_empty(self):
        assert reconcile_runs([]) == []
        assert reconcile_runs([[], []]) == []

    def test_single_successful_run_passes_through_unchanged(self):
        run = [make_record(**{"Q-factor": 42})]
        result = reconcile_runs([run])
        assert result == run


class TestAllAgree:
    def test_three_identical_runs_produce_no_annotations(self):
        record = make_record()
        runs = [[dict(record)], [dict(record)], [dict(record)]]
        [merged] = reconcile_runs(runs)
        assert notes_reconciliation_lines(merged) == []
        assert merged["FOM (RIU^-1)"] == 100.0
        assert merged["Domain"] == "Wavelength"


class TestModeLabelDrift:
    def test_mode_description_is_never_voted_on(self):
        runs = [
            [make_record(**{"Mode Description": "Simulation (R1)"})],
            [make_record(**{"Mode Description": "R1 mode (Simulation)"})],
            [make_record(**{"Mode Description": "Simulation - Peak R1 (TD)"})],
        ]
        [merged] = reconcile_runs(runs)
        # Primary (first run)'s label wins verbatim, no disagreement noise.
        assert merged["Mode Description"] == "Simulation (R1)"
        assert notes_reconciliation_lines(merged) == []


class TestShortTitleDrift:
    def test_short_title_is_never_voted_on(self):
        runs = [
            [make_record(**{"Short Title": "High-Q Fano resonances in metastructures"})],
            [make_record(**{"Short Title": "High-Q Fano resonances in all-dielectric metastructures"})],
            [make_record(**{"Short Title": "High-Q Fano resonances in metastructures"})],
        ]
        [merged] = reconcile_runs(runs)
        # Primary (first run)'s paraphrase wins verbatim, no disagreement
        # noise -- a shortened title varying slightly in wording across runs
        # is not a real disagreement worth flagging (see reconcile.py).
        assert merged["Short Title"] == "High-Q Fano resonances in metastructures"
        assert notes_reconciliation_lines(merged) == []
        assert merged["Review status"] == "Approve (AI)"


class TestDomainDrift:
    def test_majority_wins_and_is_annotated(self):
        runs = [
            [make_record(**{"Domain": "Wavelength"})],
            [make_record(**{"Domain": "Wavelength"})],
            [make_record(**{"Domain": "Frequency"})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Domain"] == "Wavelength"
        assert any("Domain" in line for line in notes_reconciliation_lines(merged))

    def test_true_tie_falls_back_to_primary(self):
        runs = [
            [make_record(**{"Domain": "Wavelength"})],
            [make_record(**{"Domain": "Frequency"})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Domain"] == "Wavelength"  # primary (run 1) wins the tie


class TestNumericFieldDisagreement:
    def test_two_of_three_agreement_wins_quietly_when_unanimous_subset(self):
        runs = [
            [make_record(**{"Q-factor": None})],
            [make_record(**{"Q-factor": None})],
            [make_record(**{"Q-factor": 23})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Q-factor"] is None
        assert any("Q-factor" in line for line in notes_reconciliation_lines(merged))

    def test_no_majority_falls_back_to_primary_and_flags_loudly(self):
        # Mirrors the real paper-65 bug: a value from a different case
        # (Delta-l=25nm) got attributed to the wrong row (Delta-l=20nm).
        runs = [
            [make_record(**{"Q-factor": 54})],
            [make_record(**{"Q-factor": 23})],
            [make_record(**{"Q-factor": None})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Q-factor"] == 54  # primary's own value, never averaged/nulled
        lines = notes_reconciliation_lines(merged)
        assert any("DISAGREEMENT" in line and "Q-factor" in line for line in lines)

    def test_values_never_mixed_across_runs(self):
        runs = [
            [make_record(**{"FOM (RIU^-1)": 12.5})],
            [make_record(**{"FOM (RIU^-1)": 12.5})],
            [make_record(**{"FOM (RIU^-1)": 19.2})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["FOM (RIU^-1)"] == 12.5


class TestRowCountMismatch:
    def test_extra_row_is_kept_and_flagged_not_dropped(self):
        run_a = [make_record(**{"Mode Description": "case A"})]
        run_b = [make_record(**{"Mode Description": "case A"})]
        run_c = [
            make_record(**{"Mode Description": "case A"}),
            make_record(**{"Mode Description": "case B (n=0.3 change)", "FOM (RIU^-1)": 116.6}),
        ]
        merged = reconcile_runs([run_a, run_b, run_c])
        assert len(merged) == 2  # modal count (1) + 1 extra row, never silently dropped

        extra = [r for r in merged if r["Mode Description"] == "case B (n=0.3 change)"]
        assert len(extra) == 1
        lines = notes_reconciliation_lines(extra[0])
        assert any("Only found in 1 of 3 runs" in line for line in lines)

    def test_within_modal_count_but_under_supported_row_is_noted(self):
        run_a = [make_record(), make_record(**{"Mode Description": "second"})]
        run_b = [make_record(), make_record(**{"Mode Description": "second"})]
        run_c = [make_record()]  # missed the second row this run
        merged = reconcile_runs([run_a, run_b, run_c])
        assert len(merged) == 2

        second = [r for r in merged if r["Mode Description"] == "second"][0]
        lines = notes_reconciliation_lines(second)
        assert any("Only 2 of 3 runs contained this row" in line for line in lines)


class TestMaterialSetFields:
    def test_token_level_majority_for_material_class(self):
        runs = [
            [make_record(**{"Material Class": "Dielectric;Semiconductor"})],
            [make_record(**{"Material Class": "Dielectric;Semiconductor"})],
            [make_record(**{"Material Class": "Dielectric"})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Material Class"] == "Dielectric;Semiconductor"
        assert any("Material Class" in line for line in notes_reconciliation_lines(merged))


class TestForcedEditOnDisagreement:
    """A record a reviewer would see as "Approve (AI)" must not hide that
    some other field is actually contested -- see reconcile.py's
    _reconcile_slot has_warning handling."""

    def test_field_disagreement_downgrades_approve_ai_to_edit(self):
        runs = [
            [make_record(**{"Q-factor": 54})],
            [make_record(**{"Q-factor": 23})],
            [make_record(**{"Q-factor": None})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Review status"] == "Edit"
        assert merged["Notes"]  # explanatory fallback since primary wrote none
        lines = notes_reconciliation_lines(merged)
        assert any("forced to Edit" in line for line in lines)

    def test_partial_agreement_alone_does_not_force_edit(self):
        runs = [
            [make_record(**{"Q-factor": None})],
            [make_record(**{"Q-factor": None})],
            [make_record(**{"Q-factor": 23})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Review status"] == "Approve (AI)"

    def test_exclude_is_not_overridden_by_disagreement(self):
        runs = [
            [make_record(**{"Q-factor": 54, "Review status": "Exclude"})],
            [make_record(**{"Q-factor": 23, "Review status": "Exclude"})],
            [make_record(**{"Q-factor": None, "Review status": "Exclude"})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Review status"] == "Exclude"

    def test_existing_notes_are_preserved_not_overwritten(self):
        runs = [
            [make_record(**{"Q-factor": 54, "Notes": "Own note from primary run."})],
            [make_record(**{"Q-factor": 23})],
            [make_record(**{"Q-factor": None})],
        ]
        [merged] = reconcile_runs(runs)
        assert merged["Review status"] == "Edit"
        assert merged["Notes"] == "Own note from primary run."


class TestCalculatedFieldSurvivesMajorityVote:
    """Primary's own "Calculated Fields" (never voted, see
    _FREE_TEXT_PRIMARY_ONLY_FIELDS) must not be left paired with a
    majority-voted "Approve (AI)" borrowed from OTHER runs that didn't
    derive the value themselves -- see reconcile.py's has_warning check
    right after the free-text copy loop."""

    def test_primarys_calculated_field_forces_edit_even_if_other_runs_voted_approve(self):
        runs = [
            [
                make_record(
                    **{
                        "Calculated Fields": "FWHM = Sensitivity / FOM (not stated directly)",
                        "Review status": "Edit",
                    }
                )
            ],
            [make_record(**{"Review status": "Approve (AI)"})],
            [make_record(**{"Review status": "Approve (AI)"})],
        ]
        [merged] = reconcile_runs(runs)
        # Without the has_warning guard, the 2/3 majority for "Approve (AI)"
        # would win the scalar vote and silently pair it with primary's own
        # (never-voted) "Calculated Fields".
        assert merged["Calculated Fields"] == "FWHM = Sensitivity / FOM (not stated directly)"
        assert merged["Review status"] == "Edit"


class TestEvidenceFieldMapDrift:
    def test_evidence_field_map_is_never_voted_on(self):
        runs = [
            [make_record(**{"Evidence Field Map": "FOM (RIU^-1), FWHM (nm); Sensitivity (nm/RIU)"})],
            [make_record(**{"Evidence Field Map": "FOM (RIU^-1); Sensitivity (nm/RIU), FWHM (nm)"})],
            [make_record(**{"Evidence Field Map": ""})],
        ]
        [merged] = reconcile_runs(runs)
        # Primary (first run)'s value wins verbatim, no disagreement noise.
        assert merged["Evidence Field Map"] == "FOM (RIU^-1), FWHM (nm); Sensitivity (nm/RIU)"
        assert notes_reconciliation_lines(merged) == []


class TestOriginAlignment:
    def test_exp_and_sim_rows_are_reconciled_independently(self):
        run_a = [
            make_record(**{"Origin": "SIM", "Q-factor": 100}),
            make_record(**{"Origin": "EXP", "Q-factor": 50}),
        ]
        run_b = [
            make_record(**{"Origin": "SIM", "Q-factor": 100}),
            make_record(**{"Origin": "EXP", "Q-factor": 55}),
        ]
        merged = reconcile_runs([run_a, run_b])
        by_origin = {r["Origin"]: r for r in merged}
        assert set(by_origin) == {"SIM", "EXP"}
        assert by_origin["SIM"]["Q-factor"] == 100
        assert (
            by_origin["EXP"]["Q-factor"] == 50
        )  # no 2-run agreement -> primary (run_a)'s value wins
