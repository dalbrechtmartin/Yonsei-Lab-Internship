import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

import llm
from schema import normalize_result


def make_record(**overrides) -> dict:
    base = {
        "Ref": "paper_x.pdf",
        "Title": "A Test Paper on Plasmonic Sensing",
        "Short Title": "Plasmonic Sensing",
        "Mode ID": 1,
        "Mode Description": "main resonance",
        "Material Class": "Dielectric;Metal",
        "Base Materials": "Au;SiO2",
        "Layer Structure": "Au(50nm) + SiO2",
        "Origin": "SIM",
        "Domain": "Wavelength",
        "Resonance Wavelength (nm)": 1550.0,
        "FOM (RIU^-1)": 100.0,
        "Definition": "FOM = S / FWHM",
        "Sensitivity (nm/RIU)": 500.0,
        "FWHM (nm)": 5.0,
        "Q-factor": 200,
        "Sensing Medium": "Air",
        "Raw Value": "0.5 um/RIU",
        "Conversion Method": "Standard unit factor um/RIU -> nm/RIU (x1000)",
        "Calculated Fields": None,
        "Evidence": "The sensor achieves a FOM of 100 at 1550 nm.",
        "Location": "Page 3, Results, Para 1",
        "Review status": "Approve (AI)",
        "Notes": None,
        "Model Used": "gemini-3.5-flash",
    }
    base.update(overrides)
    return normalize_result(base)


class TestFormatRecordContext:
    def test_fully_populated_record_contains_its_key_values(self):
        record = make_record()

        context = llm._format_record_context(record)

        assert "A Test Paper on Plasmonic Sensing" in context
        assert "SIM" in context
        assert "Wavelength" in context
        assert "1550.0" in context
        assert "100.0" in context
        assert "FOM = S / FWHM" in context
        assert "500.0" in context
        assert "Air" in context
        assert "Au;SiO2" in context
        assert "The sensor achieves a FOM of 100 at 1550 nm." in context
        assert "Page 3, Results, Para 1" in context
        assert "Approve (AI)" in context

    def test_none_fields_are_skipped_not_printed_as_none(self):
        record = make_record(
            **{
                "Sensing Medium": None,
                "Raw Value": None,
                "Conversion Method": None,
                "Calculated Fields": None,
                "Q-factor": None,
                "Notes": None,
            }
        )

        context = llm._format_record_context(record)

        assert "None" not in context
        assert "null" not in context.lower()
        # Fields that DO have a value are still present alongside the
        # skipped ones -- this isn't accidentally blanking the whole block.
        assert "SIM" in context

    def test_review_status_reason_in_notes_is_included_when_present(self):
        record = make_record(
            **{
                "Review status": "Exclude",
                "Notes": "Frequency-domain FOM, out of scope for this dataset.",
            }
        )

        context = llm._format_record_context(record)

        assert "Exclude" in context
        assert "Frequency-domain FOM, out of scope for this dataset." in context

    def test_only_known_column_order_fields_are_used(self):
        assert set(llm._RECORD_CONTEXT_FIELDS) <= set(llm.schema.COLUMN_ORDER)


class TestPhotonSystemTemplate:
    def test_template_formats_with_record_context_and_page_text(self):
        record = make_record()
        rendered = llm.PHOTON_SYSTEM_TEMPLATE.format(
            record_context=llm._format_record_context(record), page_text="=== PAGE 3 ===\nSome text."
        )

        assert "Photon" in rendered
        assert "A Test Paper on Plasmonic Sensing" in rendered
        assert "Some text." in rendered

    def test_template_formats_with_empty_page_text(self):
        record = make_record()
        # Must not raise even when page_text is empty (e.g. Location didn't
        # resolve to a real page) -- see main.py's chat endpoint.
        rendered = llm.PHOTON_SYSTEM_TEMPLATE.format(
            record_context=llm._format_record_context(record), page_text=""
        )

        assert "Photon" in rendered


class TestChatAboutRecordHistoryShape:
    """Guards the wire shape of `history` entries: {"role", "content"} --
    matching both the frontend's PhotonChatTurn (services/api.ts) and
    PhotonMessage (composables/usePhotonContext.ts) types, and main.py's
    PhotonChatMessage Pydantic model, which all use "content" (not "text")
    for a turn's text. A prior mismatch here (backend expecting "text")
    would 422 on every follow-up message, since only the first turn in a
    conversation ever has an empty `history`.
    """

    def test_history_turns_are_read_by_content_key(self, monkeypatch):
        captured = {}

        def fake_generate_content(*, model, contents, config):
            captured["contents"] = contents

            class FakeResponse:
                text = "Sure, here's the answer."

            return FakeResponse()

        monkeypatch.setattr(llm.client.models, "generate_content", fake_generate_content)
        monkeypatch.setattr(llm, "domain_check_model", lambda: "gemini-3-flash-lite")

        record = make_record()
        history = [
            {"role": "user", "content": "Why does this metric matter?"},
            {"role": "model", "content": "Because it measures sensitivity."},
        ]

        reply = llm.chat_about_record(record, None, "And the FWHM?", history)

        assert reply == "Sure, here's the answer."
        contents = captured["contents"]
        assert len(contents) == 3  # 2 history turns + the new message
        assert contents[0].parts[0].text == "Why does this metric matter?"
        assert contents[1].parts[0].text == "Because it measures sensitivity."
        assert contents[2].role == "user"
        assert contents[2].parts[0].text == "And the FWHM?"

    def test_history_turn_missing_content_key_raises(self, monkeypatch):
        # A turn shaped {"role", "text"} (the old, mismatched backend field
        # name) must fail loudly rather than silently sending blank text.
        monkeypatch.setattr(llm, "domain_check_model", lambda: "gemini-3-flash-lite")
        record = make_record()
        bad_history = [{"role": "user", "text": "old field name"}]

        with pytest.raises(KeyError):
            llm.chat_about_record(record, None, "hi", bad_history)
