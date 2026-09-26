from __future__ import annotations

import json

from tools.common.capabilities.assessment.claims.evidence_claim.evidence_ledger import (
    EvidenceLedger,
)
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    InvestigationPacket,
)
from tools.common.capabilities.assessment.investigation.engineering_rule.investigator import (
    LawGuidedInvestigator,
)


def _packet() -> InvestigationPacket:
    return InvestigationPacket(
        engineering_rule_id="eng-1",
        concept="TRANSPARENCY",
        investigation_goals=("Trace AI output to the user-visible disclosure control",),
        initial_results=(),
        starting_node_types=("AI_OUTPUT",),
        target_node_types=("HTTP_RESPONSE", "NOTIFICATION"),
        edge_strategies=("CALLS", "RETURNS"),
        graph_queries=(
            {
                "name": "trace-output",
                "startNodeTypes": ["AI_OUTPUT"],
                "direction": "FORWARD",
                "followEdges": ["CALLS", "RETURNS"],
                "stopNodeTypes": ["HTTP_RESPONSE", "NOTIFICATION"],
                "semanticTypes": [],
            },
        ),
        keywords=("disclosure", "label", "watermark"),
        common_apis=("renderDisclosure",),
        common_libraries=("@lcsp/i18n",),
        patterns=("AI-generated",),
        required_evidence=("AI_OUTPUT_SURFACE",),
        supporting_evidence=("DISCLOSURE_OR_LABEL_CONTROL",),
        negative_evidence=("AI_OUTPUT_WITHOUT_EVIDENCED_TRANSPARENCY_CONTROL",),
    )


def _graph() -> dict:
    return {
        "graph_id": "graph-1",
        "snapshot_id": "snapshot-1",
        "commit_sha": "abc123",
        "node_count": 1,
        "edge_count": 0,
        "nodes": [
            {
                "node_id": "node-1",
                "node_type": "AI_OUTPUT",
                "label": "AI output",
                "source": {
                    "file_path": "src/output.py",
                    "start_line": 4,
                    "end_line": 12,
                    "symbol_ref": "render",
                },
                "attributes": {},
                "semantic_types": [],
                "evidence_refs": ["evidence:1"],
                "resolution_state": "OBSERVED",
            }
        ],
        "edges": [],
        "source_anchors": [
            {
                "anchor_id": "anchor:1",
                "snapshot_id": "snapshot-1",
                "commit_sha": "abc123",
                "file_path": "src/output.py",
                "symbol_ref": "render",
                "start_line": 4,
                "end_line": 12,
                "source_hash": "sha256:test",
                "graph_node_id": "node-1",
            }
        ],
        "indexes": {},
        "unresolved_frontiers": [],
        "coverage_state": "SUFFICIENT",
        "coverage_notes": [],
        "provenance": {"scan_job_id": "scan-1"},
        "evidence_refs": ["evidence:1"],
        "graph_hash": "sha256:graph",
        "schema_version": "2.0.0",
    }


def test_rule_contract_keeps_legal_retrieval_hints_separate_from_source_citations() -> None:
    payload = json.loads(
        LawGuidedInvestigator._prompt(_packet(), EvidenceLedger(), [], 0)
    )
    rule = payload["engineeringRule"]

    assert rule["retrievalHints"]["keywords"] == ["disclosure", "label", "watermark"]
    assert rule["requiredEvidence"] == ["AI_OUTPUT_SURFACE"]
    assert "sourceLocations" not in rule
    assert any("native Deep Agents" in row for row in [payload["task"]])


def test_finish_schema_requires_repository_source_locations() -> None:
    claim_schema = LawGuidedInvestigator._claims_response_schema()["properties"][
        "claims"
    ]["items"]
    properties = claim_schema["properties"]

    assert "criterion" in claim_schema["required"]
    assert "sourceLocations" in claim_schema["required"]
    assert set(properties["sourceLocations"]["items"]["required"]) == {
        "path",
        "startLine",
        "endLine",
    }
    assert "observationRefs" not in properties
    assert "evidenceRefs" not in properties


def test_invalid_finish_criterion_fails_closed_even_with_source_location() -> None:
    claims = LawGuidedInvestigator("test:model")._claims_from_payload(
        {
            "claims": [
                {
                    "criterion": "DISCLOSURE_OR_LABEL_CONTROL",
                    "claimType": ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"],
                    "sourceLocations": [
                        {
                            "path": "src/output.py",
                            "startLine": 4,
                            "endLine": 8,
                            "symbol": "render",
                        }
                    ],
                    "confidence": 0.9,
                    "limitations": [],
                }
            ]
        },
        _packet(),
        _graph(),
        EvidenceLedger(),
    )

    assert claims[0].criterion is None
    assert claims[0].claim_type == ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
    assert (
        ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"]
        in claims[0].limitations
    )
