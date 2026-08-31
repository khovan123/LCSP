from __future__ import annotations

import pytest

from orchestration.result_validation import (
    SpecialistHandoffValidationError,
    validate_specialist_handoff,
)


def _investigator_payload() -> dict:
    return {
        "status": "READY",
        "artifact_versions": {"technicalEvidenceReportId": "ter-1"},
        "claims": [
            {
                "claim_id": "claim-1",
                "engineering_rule_id": "eng-1",
                "claim_type": "UNRESOLVED_ENGINEERING_FACT",
                "value": None,
                "evidence_refs": [],
                "graph_path_refs": ["node:ai", "edge:receives", "node:output"],
                "source_anchor_refs": [],
                "confidence": 0.9,
                "limitations": [],
                "criterion": "AI output path",
            }
        ],
        "limitations": [],
        "missing_input": None,
        "next_step": "GATE",
    }


def _graph() -> dict:
    return {
        "graph_id": "graph-1",
        "snapshot_id": "snapshot-1",
        "commit_sha": "abc123",
        "node_count": 2,
        "edge_count": 1,
        "nodes": [
            {
                "node_id": "node:ai",
                "node_type": "AI_MODEL_INVOCATION",
                "label": "responses.create",
                "source": {},
                "attributes": {},
                "semantic_types": [],
                "evidence_refs": [],
                "origin": "STATIC_ANALYSIS",
                "resolution_state": "CORROBORATED",
                "support_refs": [],
            },
            {
                "node_id": "node:output",
                "node_type": "AI_OUTPUT",
                "label": "AI output",
                "source": {},
                "attributes": {},
                "semantic_types": [],
                "evidence_refs": [],
                "origin": "STATIC_ANALYSIS",
                "resolution_state": "CORROBORATED",
                "support_refs": [],
            },
        ],
        "edges": [
            {
                "edge_id": "edge:receives",
                "edge_type": "RECEIVES_FROM_AI",
                "source_node_id": "node:ai",
                "target_node_id": "node:output",
                "confidence": 1.0,
                "attributes": {},
                "evidence_refs": [],
                "coverage_state": "SUFFICIENT",
                "origin": "DATA_LINEAGE",
                "resolution_state": "CORROBORATED",
                "support_refs": [],
            }
        ],
        "source_anchors": [],
        "evidence_refs": [],
        "graph_hash": "sha256:graph",
    }


def test_investigator_handoff_runs_existing_evidence_claim_validator() -> None:
    handoff = validate_specialist_handoff(
        "investigator",
        _investigator_payload(),
        graph=_graph(),
        pinned_rule_ids=("eng-1",),
        pinned_versions={"technicalEvidenceReportId": "ter-1"},
    )

    assert handoff.status == "READY"


def test_investigator_handoff_rejects_unknown_graph_refs() -> None:
    payload = _investigator_payload()
    payload["claims"][0]["graph_path_refs"] = ["node:missing"]

    with pytest.raises(SpecialistHandoffValidationError, match="evidence-claim"):
        validate_specialist_handoff(
            "investigator",
            payload,
            graph=_graph(),
            pinned_rule_ids=("eng-1",),
            pinned_versions={"technicalEvidenceReportId": "ter-1"},
        )


def test_investigator_handoff_rejects_unpinned_rule_ids() -> None:
    payload = _investigator_payload()
    payload["claims"][0]["engineering_rule_id"] = "eng-2"

    with pytest.raises(SpecialistHandoffValidationError, match="unpinned"):
        validate_specialist_handoff(
            "investigator",
            payload,
            graph=_graph(),
            pinned_rule_ids=("eng-1",),
            pinned_versions={"technicalEvidenceReportId": "ter-1"},
        )


def test_investigator_handoff_rejects_stale_artifact_versions() -> None:
    payload = _investigator_payload()
    payload["artifact_versions"] = {"technicalEvidenceReportId": "ter-stale"}

    with pytest.raises(SpecialistHandoffValidationError, match="artifact_versions"):
        validate_specialist_handoff(
            "investigator",
            payload,
            graph=_graph(),
            pinned_rule_ids=("eng-1",),
            pinned_versions={"technicalEvidenceReportId": "ter-1"},
        )


def test_specialist_handoff_rejects_forbidden_final_verdicts() -> None:
    payload = _investigator_payload()
    payload["claims"][0]["limitations"] = ["COMPLIANT"]

    with pytest.raises(SpecialistHandoffValidationError, match="forbidden"):
        validate_specialist_handoff("investigator", payload)
