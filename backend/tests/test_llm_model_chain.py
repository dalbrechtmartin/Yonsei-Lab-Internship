import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import llm

# A "gemini-flash-latest" alias currently resolving to "gemini-3.7-flash"
# (the catalog's own newest non-lite model) is the normal case these tests
# fix around -- see llm._dedupe_model_identities's docstring for why trying
# both back-to-back after one fails is a wasted call+sleep, not a real
# second attempt.
NON_LITE = ["gemini-3.7-flash", "gemini-3.6-flash"]
LITE = ["gemini-3.5-flash-lite"]


class TestDedupeModelIdentities:
    def test_collapses_latest_alias_into_the_concrete_id_it_tracks(self, monkeypatch):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))

        result = llm._dedupe_model_identities(
            ["gemini-flash-latest", "gemini-3.7-flash", "gemini-3.6-flash"]
        )

        assert result == ["gemini-flash-latest", "gemini-3.6-flash"]

    def test_keeps_whichever_of_the_pair_appears_first(self, monkeypatch):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))

        result = llm._dedupe_model_identities(
            ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.6-flash"]
        )

        assert result == ["gemini-3.7-flash", "gemini-3.6-flash"]

    def test_older_non_lite_models_are_not_collapsed(self, monkeypatch):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))

        result = llm._dedupe_model_identities(["gemini-flash-latest", "gemini-3.6-flash"])

        assert result == ["gemini-flash-latest", "gemini-3.6-flash"]


class TestBuildFallbackChain:
    def test_flash_tier_chain_does_not_retry_latest_alias_target(self, monkeypatch):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))
        monkeypatch.setattr(llm, "recommend_tier", lambda file_count=0: "flash")

        chain = llm.build_fallback_chain()

        assert chain == ["gemini-flash-latest", "gemini-3.6-flash", "gemini-3.5-flash-lite"]

    def test_lite_tier_chain_does_not_retry_latest_alias_target(self, monkeypatch):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))
        monkeypatch.setattr(llm, "recommend_tier", lambda file_count=0: "flash_lite")

        chain = llm.build_fallback_chain()

        assert chain == ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.6-flash"]


class TestBuildAvailableModels:
    def test_pinning_the_latest_alias_target_drops_the_alias_from_the_fallback_tail(
        self, monkeypatch
    ):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))
        monkeypatch.setattr(llm, "recommend_tier", lambda file_count=0: "flash")

        models = llm.build_available_models("gemini-3.7-flash")

        assert models == ["gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"]

    def test_default_choice_returns_the_fallback_chain_unchanged(self, monkeypatch):
        monkeypatch.setattr(llm, "_catalog_by_tier", lambda: (NON_LITE, LITE))
        monkeypatch.setattr(llm, "recommend_tier", lambda file_count=0: "flash")

        assert llm.build_available_models("default") == llm.build_fallback_chain()
