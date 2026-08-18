from __future__ import annotations

from lcsp_workers.investigation.evidence_ledger import EvidenceLedger


def test_evidence_alias_pages_canonical_evidence_refs_without_error() -> None:
    ledger = EvidenceLedger()
    observation = ledger.add(
        source="graph_tool",
        result={
            "nodes": [],
            "evidenceRefs": ["evidence:1", "evidence:2"],
            "truncated": False,
        },
    )

    result = ledger.inspect(observation.observation_id, section="evidence")

    assert result["section"] == "evidenceRefs"
    assert result["requestedSection"] == "evidence"
    assert result["items"] == ["evidence:1", "evidence:2"]
    assert "error" not in result


def test_unknown_section_returns_exact_available_sections_and_retry_instruction() -> None:
    ledger = EvidenceLedger()
    observation = ledger.add(
        source="graph_tool",
        result={
            "nodes": [{"node_id": "node-1"}],
            "continuationFrontiers": ["node-2"],
            "unresolvedFrontiers": [],
            "evidenceRefs": ["evidence:1"],
        },
    )

    result = ledger.inspect(observation.observation_id, section="made_up")

    assert result["error"] == "OBSERVATION_SECTION_NOT_PAGEABLE"
    assert set(result["availableSections"]) == {
        "nodes",
        "continuationFrontiers",
        "unresolvedFrontiers",
        "evidenceRefs",
    }
    assert "Omit section" in result["instruction"]
