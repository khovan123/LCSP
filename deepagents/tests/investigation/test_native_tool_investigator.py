from __future__ import annotations

import json
from unittest.mock import patch

from tools.common.capabilities.assessment.claims.evidence_claim.evidence_ledger import EvidenceLedger
from tools.common.capabilities.assessment.investigation.engineering_rule.investigator import (
    MAX_PROMPT_CHARS,
    LawGuidedInvestigator,
)
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_LIMITATION_CODES,
    MODEL_SELECTABLE_LIMITATION_CODES,
    InvestigationPacket,
)


def _graph() -> dict:
    return {
        "graph_id": "graph-1",
        "snapshot_id": "snapshot-1",
        "commit_sha": "abc123",
        "nodes": [{
            "node_id": "node-1",
            "node_type": "HUMAN_REVIEW",
            "label": "human review",
            "source": {"file_path": "src/review.py", "symbol_ref": "review"},
            "attributes": {},
            "semantic_types": ["HUMAN_OVERSIGHT"],
            "evidence_refs": ["evidence:review-1"],
        }],
        "edges": [],
        "source_anchors": [],
        "indexes": {},
        "unresolved_frontiers": [],
        "coverage_state": "SUFFICIENT",
        "coverage_notes": [],
        "provenance": {"scan_job_id": "scan-1"},
        "evidence_refs": ["evidence:review-1"],
        "graph_hash": "sha256:graph",
        "schema_version": "2.0.0",
    }


def _packet(*, initial_results: tuple[dict, ...] = ()) -> InvestigationPacket:
    return InvestigationPacket(
        engineering_rule_id="eng-1",
        concept="HUMAN_OVERSIGHT",
        investigation_goals=("Find human review controls",),
        initial_results=initial_results,
        required_evidence=("A bounded human review path",),
    )


def test_investigator_uses_native_tools_and_structured_claims() -> None:
    captured: dict = {}

    class Agent:
        def invoke(self, payload, config=None):
            return {
                "structured_response": {
                    "claims": [{
                        "criterion": "A bounded human review path",
                        "claimType": "RULE_REQUIREMENT_MET",
                        "sourceLocations": [{
                            "path": "src/review.py",
                            "startLine": 1,
                            "endLine": 8,
                            "symbol": "review",
                        }],
                        "confidence": 0.95,
                        "limitations": [],
                    }]
                }
            }

    def fake_create_agent(**kwargs):
        captured.update(kwargs)
        return Agent()

    with patch(
        "tools.common.capabilities.assessment.investigation.engineering_rule.investigator.create_agent",
        side_effect=fake_create_agent,
    ):
        claims = LawGuidedInvestigator("test:model").investigate(
            packet=_packet(
                initial_results=({
                    "nodes": [_graph()["nodes"][0]],
                    "evidenceRefs": ["evidence:review-1"],
                },)
            ),
            graph=_graph(),
            workflow_run_id="workflow-1",
        )

    assert "tools" not in captured
    assert "native Deep Agents filesystem/shell/task tools" in captured["system_prompt"]
    assert "codebase_memory_graph MCP" in captured["system_prompt"]
    assert captured["response_format"] == LawGuidedInvestigator._claims_response_schema()
    assert claims[0].claim_type == "RULE_REQUIREMENT_MET"
    assert claims[0].source_locations == ({
        "path": "src/review.py", "start_line": 1, "end_line": 8, "symbol": "review"
    },)


def test_evidence_ledger_keeps_full_seed_results_while_prompt_uses_index() -> None:
    huge_result = {
        "nodes": [{"node_id": f"node-{index}", "label": "x" * 10_000} for index in range(100)],
        "edges": [],
    }
    ledger = EvidenceLedger()
    for _ in range(100):
        ledger.add(source="engineering_rule_seed_query", result=huge_result)

    prompt = LawGuidedInvestigator._prompt(_packet(), ledger, [], 0)
    payload = json.loads(prompt)

    assert ledger.get("obs:0100").result["nodes"][99]["label"] == "x" * 10_000
    assert payload["seedContext"]["priorDeterministicObservationCount"] == 100
    assert "evidenceLedger" not in payload
    assert len(prompt) <= MAX_PROMPT_CHARS


def test_structured_claim_schema_exposes_only_direct_source_locations() -> None:
    claim = LawGuidedInvestigator._claims_response_schema()["properties"]["claims"]["items"]
    properties = claim["properties"]
    assert "sourceLocations" in properties
    assert "observationRefs" not in properties
    assert "evidenceRefs" not in properties
    assert properties["limitations"]["items"]["enum"] == sorted(
        MODEL_SELECTABLE_LIMITATION_CODES
    )


def test_unknown_observation_ref_fails_closed() -> None:
    class Agent:
        def invoke(self, payload, config=None):
            return {
                "structured_response": {
                    "claims": [{
                        "criterion": "A bounded human review path",
                        "claimType": "RULE_REQUIREMENT_MET",
                        "observationRefs": ["obs:9999"],
                        "confidence": 1,
                        "limitations": [],
                    }]
                }
            }

    with patch(
        "tools.common.capabilities.assessment.investigation.engineering_rule.investigator.create_agent",
        return_value=Agent(),
    ):
        claim = LawGuidedInvestigator("test:model").investigate(
            packet=_packet(),
            graph=_graph(),
            workflow_run_id="workflow-1",
        )[0]

    assert claim.claim_type == "UNRESOLVED_ENGINEERING_FACT"
    assert claim.evidence_refs == ()
    assert (
        ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"]
        in claim.limitations
    )


def test_empty_native_response_falls_back_to_seed_provenance() -> None:
    class Agent:
        def invoke(self, payload, config=None):
            return {"structured_response": {"claims": []}}

    with patch(
        "tools.common.capabilities.assessment.investigation.engineering_rule.investigator.create_agent",
        return_value=Agent(),
    ):
        claim = LawGuidedInvestigator("test:model").investigate(
            packet=_packet(
                initial_results=({
                    "nodes": [_graph()["nodes"][0]],
                    "evidenceRefs": ["evidence:review-1"],
                },)
            ),
            graph=_graph(),
            workflow_run_id="workflow-1",
        )[0]

    assert claim.claim_type == "UNRESOLVED_ENGINEERING_FACT"
    assert claim.criterion == "A bounded human review path"
    assert claim.evidence_refs == ("evidence:review-1",)
    assert claim.graph_path_refs == ("node-1",)
    assert (
        ENGINEERING_LIMITATION_CODES["investigation_returned_no_valid_claims"]
        in claim.limitations
    )


def test_evidence_less_native_claim_falls_back_to_seed_provenance() -> None:
    class Agent:
        def invoke(self, payload, config=None):
            return {
                "structured_response": {
                    "claims": [{
                        "criterion": "A bounded human review path",
                        "claimType": "UNRESOLVED_ENGINEERING_FACT",
                        "observationRefs": [],
                        "confidence": 0,
                        "limitations": [
                            ENGINEERING_LIMITATION_CODES[
                                "engineering_evidence_insufficient"
                            ],
                        ],
                    }]
                }
            }

    with patch(
        "tools.common.capabilities.assessment.investigation.engineering_rule.investigator.create_agent",
        return_value=Agent(),
    ):
        claim = LawGuidedInvestigator("test:model").investigate(
            packet=_packet(
                initial_results=({
                    "nodes": [_graph()["nodes"][0]],
                    "evidenceRefs": ["evidence:review-1"],
                },)
            ),
            graph=_graph(),
            workflow_run_id="workflow-1",
        )[0]

    assert claim.claim_type == "UNRESOLVED_ENGINEERING_FACT"
    assert claim.evidence_refs == ("evidence:review-1",)
    assert claim.graph_path_refs == ("node-1",)
