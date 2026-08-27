from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from tools.triage.legal_rule_triage.service import LegalRuleTriageService


def _api_client() -> MagicMock:
    api = MagicMock()
    api.get_active_legal_rule_catalog.return_value = {
        "versionId": "catalog-v1",
        "rules": [
            {
                "legalRuleId": "RULE-1",
                "status": "APPROVED",
                "citationLocatorRefs": [{"chunkId": "LAW:A1"}],
            },
            {
                "legalRuleId": "RULE-2",
                "status": "APPROVED",
                "citationLocatorRefs": [{"chunkId": "LAW:A2"}],
            },
            {
                "legalRuleId": "RULE-DRAFT",
                "status": "DRAFT",
                "citationLocatorRefs": [{"chunkId": "LAW:A3"}],
            },
        ],
    }
    api.get_active_legal_corpus.return_value = {"versionId": "corpus-v1"}
    api.get_legal_corpus_chunks.return_value = {
        "chunks": [
            {"id": "LAW:A1", "content": "Provider shall maintain human review."},
            {"id": "LAW:A2", "content": "Definition of AI system."},
            {"id": "LAW:A3", "content": "Draft-only text."},
        ]
    }
    return api


def test_work_items_include_only_approved_rules_and_exact_chunks() -> None:
    service = LegalRuleTriageService(
        api_client=_api_client(),
        retriever=MagicMock(),
        rule_service=MagicMock(),
    )

    result = service.get_work_items()

    assert result["legalRuleCatalogVersionId"] == "catalog-v1"
    assert result["legalCorpusVersionId"] == "corpus-v1"
    assert [item["legalRuleId"] for item in result["workItems"]] == [
        "RULE-1",
        "RULE-2",
    ]
    assert result["workItems"][0]["legalContext"] == [
        {"id": "LAW:A1", "content": "Provider shall maintain human review."}
    ]
    assert all(item["readyForTriage"] for item in result["workItems"])


def test_work_items_can_be_bounded_to_affected_rule_ids() -> None:
    service = LegalRuleTriageService(
        api_client=_api_client(),
        retriever=MagicMock(),
        rule_service=MagicMock(),
    )

    result = service.get_work_items(affected_rule_ids=["RULE-2"])

    assert [item["legalRuleId"] for item in result["workItems"]] == ["RULE-2"]
    assert result["workItems"][0]["sourceChunkIds"] == ["LAW:A2"]


def test_work_item_marks_missing_citation_chunk_not_ready() -> None:
    api = _api_client()
    api.get_active_legal_rule_catalog.return_value["rules"] = [
        {
            "legalRuleId": "RULE-MISSING",
            "status": "APPROVED",
            "citationLocatorRefs": [{"chunkId": "LAW:UNKNOWN"}],
        }
    ]
    service = LegalRuleTriageService(
        api_client=api,
        retriever=MagicMock(),
        rule_service=MagicMock(),
    )

    result = service.get_work_items()

    assert result["workItems"][0]["readyForTriage"] is False
    assert result["workItems"][0]["missingChunkIds"] == ["LAW:UNKNOWN"]


def test_persist_rejects_stale_catalog_or_corpus_version() -> None:
    service = LegalRuleTriageService(
        api_client=_api_client(),
        retriever=MagicMock(),
        rule_service=MagicMock(),
    )

    with pytest.raises(ValueError, match="stale LegalRule catalog"):
        service.persist_result(
            legal_rule_id="RULE-1",
            legal_rule_catalog_version_id="catalog-old",
            legal_corpus_version_id="corpus-v1",
            chunk_analyses=[{"chunkId": "LAW:A1"}],
            engineering_rules=[],
            workflow_run_id="triage-run-1",
        )

    with pytest.raises(ValueError, match="stale legal corpus"):
        service.persist_result(
            legal_rule_id="RULE-1",
            legal_rule_catalog_version_id="catalog-v1",
            legal_corpus_version_id="corpus-old",
            chunk_analyses=[{"chunkId": "LAW:A1"}],
            engineering_rules=[],
            workflow_run_id="triage-run-1",
        )


def test_persist_routes_agent_decisions_through_preparation_gate() -> None:
    api = _api_client()
    retriever = MagicMock()
    rule_service = MagicMock()
    prepared_rule = MagicMock(engineering_rule_id="RULE-1::ENG::1")
    rule_service.prepare_from_triage.return_value = ([prepared_rule], False)
    service = LegalRuleTriageService(
        api_client=api,
        retriever=retriever,
        rule_service=rule_service,
    )
    analyses = [
        {
            "chunkId": "LAW:A1",
            "verdict": "ENGINEERING_RULE_CANDIDATE",
            "reason": "Concrete human-review obligation.",
            "engineeringObligation": "Maintain human review.",
            "verificationTargets": ["human review"],
        }
    ]
    proposals = [{"concept": "HUMAN_OVERSIGHT"}]

    result = service.persist_result(
        legal_rule_id="RULE-1",
        legal_rule_catalog_version_id="catalog-v1",
        legal_corpus_version_id="corpus-v1",
        chunk_analyses=analyses,
        engineering_rules=proposals,
        workflow_run_id="triage-run-1",
        correlation_id="corr-1",
    )

    retriever.index_corpus.assert_called_once()
    rule_service.prepare_from_triage.assert_called_once()
    call = rule_service.prepare_from_triage.call_args.kwargs
    assert call["legal_rule"]["legalRuleId"] == "RULE-1"
    assert call["chunk_analyses"] == analyses
    assert call["engineering_rule_rows"] == proposals
    assert result["engineeringRuleIds"] == ["RULE-1::ENG::1"]
