from lcsp_workers.legal.rule_applicability_evaluator import (
    RuleApplicabilityEvaluator,
    RuleEvaluationResult,
)
from lcsp_workers.legal.chromadb_citation_retriever import (
    ChromaDbCitationRetriever,
    RetrievedChunk,
)
from lcsp_workers.legal.legal_match_builder import LegalMatchBuilder


def test_rule_applicability_evaluator_marks_match_when_required_facts_present_and_evidence_backed():
    evaluator = RuleApplicabilityEvaluator()
    profile = {
        "mergedProfile": {
            "businessProcess": "AUTOMATED_DECISION",
            "automationLevel": "FULLY_AUTOMATED",
            "inputDataTypes": ["PERSONAL_DATA"],
            "affectedSubjects": ["CUSTOMERS"],
        },
        "evidenceRefs": [
            {"id": "ev-1", "lifecycle": "VERIFIED", "confidence": 0.9},
        ],
    }
    rule = {
        "legalRuleId": "RULE-A",
        "requiredFacts": [
            {"field": "businessProcess", "expectedValue": "AUTOMATED_DECISION"},
            {"field": "automationLevel", "expectedValue": "FULLY_AUTOMATED"},
        ],
        "optionalFacts": [],
        "blockingFacts": [],
        "unknownFactPolicy": "BLOCK_ON_UNKNOWN",
        "citationLocatorRefs": [{"documentId": "doc-1", "locator": "art-1"}],
    }

    result = evaluator.evaluate_rule(rule=rule, verified_profile=profile)

    assert isinstance(result, RuleEvaluationResult)
    assert result.status == "MATCHED"
    assert result.rule_id == "RULE-A"


def test_rule_applicability_evaluator_blocks_when_required_fact_is_not_evidence_backed():
    evaluator = RuleApplicabilityEvaluator()
    profile = {
        "mergedProfile": {
            "businessProcess": "AUTOMATED_DECISION",
        },
        "evidenceRefs": [],
    }
    rule = {
        "legalRuleId": "RULE-B",
        "requiredFacts": [
            {"field": "businessProcess", "expectedValue": "AUTOMATED_DECISION"},
        ],
        "optionalFacts": [],
        "blockingFacts": [],
        "unknownFactPolicy": "BLOCK_ON_UNKNOWN",
        "citationLocatorRefs": [{"documentId": "doc-1", "locator": "art-1"}],
    }

    result = evaluator.evaluate_rule(rule=rule, verified_profile=profile)

    assert result.status == "BLOCKED_UNKNOWN_FACT"


def test_citation_retriever_drops_repealed_chunks_and_builds_allowlist():
    retriever = ChromaDbCitationRetriever()
    chunks = [
        RetrievedChunk(
            id="doc-1::art-1::cl-1::pt-1",
            document_id="doc-1",
            locator="art-1::cl-1::pt-1",
            legal_status="ACTIVE",
            role="PRIMARY_MATCH",
        ),
        RetrievedChunk(
            id="doc-2::art-2::cl-2::pt-2",
            document_id="doc-2",
            locator="art-2::cl-2::pt-2",
            legal_status="REPEALED",
            role="PRIMARY_MATCH",
        ),
    ]

    result = retriever.build_citation_allowlist(chunks)

    assert result["allowlist"] == ["doc-1::art-1::cl-1::pt-1"]
    assert result["repealed_chunk_ids"] == ["doc-2::art-2::cl-2::pt-2"]


def test_legal_match_builder_builds_callback_payload_with_versions_and_empty_matches():
    builder = LegalMatchBuilder()
    payload = builder.build_payload(
        verified_profile_id="vp-1",
        assessment_id="assessment-1",
        legal_rule_catalog_version_id="catalog-v1",
        legal_corpus_version_id="corpus-v1",
        matches=[],
    )

    assert payload["verified_profile_id"] == "vp-1"
    assert payload["assessment_id"] == "assessment-1"
    assert payload["legal_rule_catalog_version_id"] == "catalog-v1"
    assert payload["corpus_version_id"] == "corpus-v1"
    assert payload["matches"] == []
    assert payload["citation_allowlist"] == []
    assert payload["overall_coverage_status"] == "NO_CITATION"
