from __future__ import annotations

import json

from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    InvestigationPacket,
)
from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
    _initial_instruction,
)


def _packet() -> InvestigationPacket:
    node = {
        "node_id": "node:ai:1",
        "node_type": "AI_MODEL_INVOCATION",
        "label": "classifyRisk",
        "source": {
            "file_path": "apps/api/src/risk/classifier.ts",
            "start_line": 10,
            "end_line": 40,
            "symbol_ref": "RiskClassifier.classify",
        },
    }
    return InvestigationPacket(
        engineering_rule_id="rule-1",
        concept="Risk classification before use",
        investigation_goals=("Determine whether classification happens before use.",),
        initial_results=(
            # The same node reached by two seed queries appears once.
            {"nodes": [node], "evidenceRefs": ["evidence:ai:1"]},
            {"nodes": [dict(node), {"node_id": "node:unanchored"}]},
        ),
        evidence_refs=("evidence:ai:1",),
        required_evidence=("CONTROL",),
    )


def test_investigator_starts_from_where_the_scanner_found_the_rules_evidence() -> None:
    instruction = _initial_instruction(_packet(), {"pge": "v1"})
    payload = json.loads(instruction[instruction.index("{") :])
    packet = payload["investigationPacket"]

    assert packet["startingSourceLocations"] == [
        {
            "path": "apps/api/src/risk/classifier.ts",
            "startLine": 10,
            "endLine": 40,
            "symbol": "RiskClassifier.classify",
            "label": "classifyRisk",
        }
    ]
    # Seed nodes keep their location instead of only an opaque node id.
    assert packet["initial_results"][0]["nodes"][0]["source"]["path"] == (
        "apps/api/src/risk/classifier.ts"
    )
    assert "Start from investigationPacket.startingSourceLocations" in instruction
