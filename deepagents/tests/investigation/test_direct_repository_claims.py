from __future__ import annotations

import hashlib
import json
from dataclasses import replace
from types import SimpleNamespace

import pytest

from tools.common.capabilities.assessment.claims.evidence_claim.evidence_claim_validator import (
    EvidenceClaimValidationError,
    EvidenceClaimValidator,
)
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    EvidenceClaim,
)
from tools.common.capabilities.assessment.evaluation.engineering_rule.rule_evaluator import (
    EngineeringRuleEvaluator,
)
from tools.common.capabilities.assessment.investigation.engineering_rule.pipeline import (
    EngineeringInvestigationPipeline,
)
from tools.common.capabilities.evidence.graph.schema.models import ProgramEvidenceGraph
from tools.common.capabilities.platform import repository_sandbox
from orchestration.result_validation import validate_specialist_handoff


_CRITERION = "AI_INTERACTION_DISCLOSURE_CONTROL"


def _graph() -> ProgramEvidenceGraph:
    return ProgramEvidenceGraph(
        graph_id="graph-1",
        snapshot_id="snapshot-1",
        commit_sha="abc123",
        node_count=0,
        edge_count=0,
        nodes=[],
        edges=[],
        provenance={"scan_job_id": "scan-1"},
    )


def _claim(
    *,
    claim_type: str = ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"],
    criterion: str = _CRITERION,
    path: str = "src/disclosure.py",
) -> EvidenceClaim:
    return EvidenceClaim(
        claim_id="claim-1",
        engineering_rule_id="rule-1",
        claim_type=claim_type,
        value=claim_type == ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"],
        evidence_refs=(),
        source_locations=({"path": path, "start_line": 1, "end_line": 1},),
        confidence=0.9,
        criterion=criterion,
    )


class _Repository:
    def __init__(
        self,
        *,
        content: str = "show_disclosure_notice()",
        baseline: str | None = None,
        snapshot_id: str = "snapshot-1",
    ):
        self.content = content
        self.snapshot_id = snapshot_id
        payload = content.encode()
        self.baseline = baseline or hashlib.sha1(
            f"blob {len(payload)}\0".encode() + payload
        ).hexdigest()

    def download_files(self, paths):
        path = paths[0]
        if path == "/.lcsp/repository.json":
            content = json.dumps(
                {
                    "snapshotId": self.snapshot_id,
                    "scanJobId": "scan-1",
                    "commitSha": "abc123",
                }
            ).encode()
        else:
            content = self.content.encode()
        return [SimpleNamespace(content=content, error=None)]

    def execute(self, command):
        assert "rev-parse" in command
        return SimpleNamespace(output=self.baseline, exit_code=0)


def _rule():
    return SimpleNamespace(
        engineering_rule_id="rule-1",
        legal_rule_id="legal-1",
        concept="DISCLOSURE",
        required_evidence=(_CRITERION,),
        source_chunk_ids=(),
        source_locators=(),
    )


def test_pinned_production_source_can_close_positive_claim(monkeypatch) -> None:
    monkeypatch.setattr(repository_sandbox, "current_repository_backend", lambda: _Repository())
    claim = _claim()

    assert EngineeringRuleEvaluator._has_evidence(claim) is False
    validated = EvidenceClaimValidator().validate(claim, _graph())
    assert validated.source_verified is True
    assert EngineeringRuleEvaluator().evaluate(_rule(), [validated]).status == "COMPLIANT"
    assert EngineeringInvestigationPipeline._validated_claims_for_evaluation(
        [claim], _graph()
    ) == (validated,)
    displays = EngineeringInvestigationPipeline._technical_evidence_displays(
        _graph(), (), (validated,)
    )
    assert displays[0]["file_path"] == "src/disclosure.py"
    assert displays[0]["start_line"] == 1


@pytest.mark.parametrize(
    ("claim", "repository", "message"),
    [
        (_claim(path="tests/test_disclosure.py"), _Repository(), "production code"),
        (_claim(path="docs/disclosure.md"), _Repository(), "production code"),
        (_claim(), _Repository(content="unrelated_handler()"), "criterion-aligned"),
        (_claim(), _Repository(content="# disclosure notice"), "criterion-aligned"),
        (_claim(), _Repository(baseline="b" * 40), "baseline"),
        (_claim(), _Repository(snapshot_id="stale-snapshot"), "pinned evidence graph"),
        (
            _claim(claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"]),
            _Repository(),
            "governed repository provenance",
        ),
        (
            _claim(criterion="AI_OUTPUT_PATH"),
            _Repository(),
            "governed repository provenance",
        ),
    ],
)
def test_unproven_direct_source_claims_fail_closed(
    monkeypatch, claim, repository, message
) -> None:
    monkeypatch.setattr(repository_sandbox, "current_repository_backend", lambda: repository)
    with pytest.raises(EvidenceClaimValidationError, match=message):
        EvidenceClaimValidator().validate(claim, _graph())


def test_direct_source_requires_repository_backend(monkeypatch) -> None:
    monkeypatch.setattr(repository_sandbox, "current_repository_backend", lambda: None)
    with pytest.raises(EvidenceClaimValidationError, match="pinned assessment repository"):
        EvidenceClaimValidator().validate(_claim(), _graph())


def test_handoff_accepts_source_citation_only_after_repository_validation(monkeypatch) -> None:
    monkeypatch.setattr(repository_sandbox, "current_repository_backend", lambda: _Repository())
    pins = {"repositorySnapshotId": "snapshot-1"}
    payload = {
        "status": "READY",
        "artifact_versions": pins,
        "claims": [
            {
                "claim_id": "claim-1",
                "engineering_rule_id": "rule-1",
                "claim_type": ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"],
                "value": True,
                "criterion": _CRITERION,
                "source_locations": [
                    {"path": "src/disclosure.py", "start_line": 1, "end_line": 1}
                ],
                "confidence": 0.9,
                "limitations": [],
            }
        ],
        "next_step": "GATE",
    }
    result = validate_specialist_handoff(
        "investigator",
        payload,
        graph=_graph(),
        pinned_rule_ids=("rule-1",),
        pinned_versions=pins,
    )
    assert result.status == "READY"


def test_direct_source_cannot_bypass_closed_claim_value_or_confidence(monkeypatch) -> None:
    monkeypatch.setattr(repository_sandbox, "current_repository_backend", lambda: _Repository())
    validator = EvidenceClaimValidator()
    with pytest.raises(EvidenceClaimValidationError, match="zero-confidence"):
        validator.validate(replace(_claim(), confidence=0), _graph())
    with pytest.raises(EvidenceClaimValidationError, match="governed repository provenance"):
        validator.validate(replace(_claim(), value=False), _graph())


def test_unresolved_claim_without_refs_remains_unresolved() -> None:
    claim = EvidenceClaim(
        claim_id="claim-unresolved",
        engineering_rule_id="rule-1",
        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
        value=None,
        evidence_refs=(),
        confidence=0.0,
        limitations=(ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],),
        criterion=_CRITERION,
    )
    assert EvidenceClaimValidator().validate(claim, _graph()) == claim
    assert EngineeringRuleEvaluator().evaluate(_rule(), [claim]).status == "UNKNOWN"
