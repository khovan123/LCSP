from __future__ import annotations

import json

from tools.common.capabilities.assessment.claims.evidence_claim.evidence_ledger import EvidenceLedger
from tools.common.capabilities.assessment.investigation.engineering_rule.investigator import LawGuidedInvestigator
from tools.common.capabilities.assessment.claims.evidence_claim.models import InvestigationPacket


def _packet() -> InvestigationPacket:
    return InvestigationPacket(
        engineering_rule_id="eng-1",
        concept="HUMAN_OVERSIGHT",
        investigation_goals=("Find the relevant control",),
        initial_results=(),
        required_evidence=("CONTROL_STATE",),
    )


def test_investigation_prompt_treats_graph_memory_as_non_authoritative() -> None:
    ledger = EvidenceLedger()
    ledger.add(
        source="graph_tool",
        result={
            "nodes": [{"node_id": "node-1", "evidence_refs": ["evidence:1"]}],
            "truncated": True,
            "continuationFrontiers": ["node-2"],
            "unresolvedFrontiers": [],
            "evidenceRefs": ["evidence:1"],
        },
    )

    payload = json.loads(LawGuidedInvestigator._prompt(_packet(), ledger, [], 0))
    claim_rules = " ".join(payload["claimRules"])

    assert "codebase_memory_graph" in claim_rules
    assert "trust direct repository source" in claim_rules
    assert "negative/absence claims" in claim_rules
    assert "incomplete indexing" in claim_rules


def test_investigation_prompt_requires_direct_source_before_closing_claims() -> None:
    payload = json.loads(LawGuidedInvestigator._prompt(_packet(), EvidenceLedger(), [], 0))
    claim_rules = " ".join(payload["claimRules"])

    assert "sourceLocations" in claim_rules
    assert "source you actually inspected" in claim_rules
    assert "Do not invent node_id" in claim_rules
    assert "otherwise return UNRESOLVED_ENGINEERING_FACT" in claim_rules


def test_forced_finish_requires_source_grounding_or_unresolved_fact() -> None:
    ledger = EvidenceLedger()
    payload = json.loads(
        LawGuidedInvestigator._finish_prompt(_packet(), ledger, [])
    )
    claim_rules = " ".join(payload["claimRules"])

    assert "Decided claims require exact sourceLocations" in claim_rules
    assert "UNRESOLVED_ENGINEERING_FACT" in claim_rules
    assert "Do not invent Program Evidence Graph identifiers" in claim_rules
