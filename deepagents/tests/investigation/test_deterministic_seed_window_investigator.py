from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    EvidenceClaim,
    InvestigationPacket,
)
from tools.common.capabilities.assessment.investigation.engineering_rule.deterministic_investigator import (
    AGENTIC_FALLBACK_REASONS,
    DeterministicSeedWindowInvestigator,
    NeedsScannerEnrichment,
)


class _Repository:
    def __init__(self, files: dict[str, str]) -> None:
        self.files = files
        self.operations: list[tuple[str, str]] = []

    def download_files(self, paths: list[str]):
        path = paths[0]
        self.operations.append(("read", path))
        content = self.files.get(path)
        return [
            SimpleNamespace(
                content=None if content is None else content.encode("utf-8"),
                error="missing" if content is None else None,
            )
        ]

    def execute(self, command: str):
        self.operations.append(("graph", command))
        return SimpleNamespace(exit_code=0, output="trace result")


def _packet(rule_id: str = "rule-a") -> InvestigationPacket:
    return InvestigationPacket(
        engineering_rule_id=rule_id,
        concept="Human review before automated output",
        investigation_goals=("Find the human review gate",),
        initial_results=(),
        required_evidence=("HUMAN_REVIEW",),
    )


def _route(
    rule_id: str = "rule-a",
    *,
    path: str = "src/review/gate.py",
    fallback_reason: str | None = None,
) -> dict:
    return {
        "ruleId": rule_id,
        "state": "SELECTED",
        "startingLocations": [
            {
                "path": path,
                "startLine": 2,
                "endLine": 4,
                "qualifiedName": f"app.{rule_id}.review",
                "origin": "RULE_SEED",
            }
        ],
        "graphHints": [f"app.{rule_id}.review", f"app.{rule_id}.caller", "extra"],
        "budget": {
            "maxGraphQueries": 2,
            "maxFilesRead": 5,
            "maxGlobalSearches": 0,
            "maxModelCalls": 1,
        },
        "fallbackPolicy": "SEED_FIRST_NO_GLOBAL",
        "batchGroup": "src/review",
        **({"fallbackReason": fallback_reason} if fallback_reason else {}),
    }


def _pack(state: str = "PARTIAL") -> dict:
    return {
        "coverageState": {
            "global": state,
            "sourceCoverageGaps": [] if state == "READY" else ["limited scan"],
            "graphCoverageGaps": [],
            "unresolvedFrontiers": [],
        },
        "seedLocations": [
            {
                "path": "src/review/helper.py",
                "startLine": 1,
                "endLine": 2,
                "origin": "SCANNER_PACK",
            }
        ],
    }


def _unresolved_response() -> dict:
    return {
        "structured_response": {
            "claims": [
                {
                    "criterion": "HUMAN_REVIEW",
                    "claimType": ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
                    "sourceLocations": [],
                    "confidence": 0,
                    "limitations": [
                        ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"]
                    ],
                }
            ]
        }
    }


def _investigator(
    repository: _Repository,
    response: dict | None = None,
) -> tuple[DeterministicSeedWindowInvestigator, MagicMock, MagicMock]:
    factory = MagicMock(return_value=object())
    invoker = MagicMock(return_value=response or _unresolved_response())
    investigator = DeterministicSeedWindowInvestigator(
        "test:model",
        agent_factory=factory,
        invoker=invoker,
        backend_resolver=lambda: repository,
        model_resolver=lambda **_kwargs: "resolved:test-model",
    )
    return investigator, factory, invoker


def test_reads_planned_seed_before_graph_memory_and_never_exposes_search_tools() -> None:
    repository = _Repository(
        {
            "/src/review/gate.py": "one\ntwo\nthree\nfour\nfive\n",
            "/src/review/helper.py": "helper\nvalue\n",
        }
    )
    investigator, factory, invoker = _investigator(repository)
    investigator.configure_plan(
        investigation_plan={"items": [_route()]},
        intelligence_pack=_pack(),
    )

    with pytest.raises(NeedsScannerEnrichment) as raised:
        investigator.investigate(
            packet=_packet(), graph={}, workflow_run_id="workflow-1"
        )

    assert raised.value.reason == "BOUNDED_EVIDENCE_INSUFFICIENT"
    assert repository.operations[0] == ("read", "/src/review/gate.py")
    assert all(
        operation == "read" or "trace_path" in detail
        for operation, detail in repository.operations
    )
    assert sum(operation == "graph" for operation, _ in repository.operations) == 2
    assert factory.call_args.kwargs["tools"] == []
    assert invoker.call_count == 1


def test_missing_starting_locations_returns_scanner_enrichment_without_model() -> None:
    repository = _Repository({})
    investigator, factory, invoker = _investigator(repository)
    investigator.configure_plan(
        investigation_plan={
            "items": [
                {
                    **_route(),
                    "state": "NEEDS_SCANNER_ENRICHMENT",
                    "startingLocations": [],
                }
            ]
        },
        intelligence_pack=_pack(),
    )

    with pytest.raises(NeedsScannerEnrichment) as raised:
        investigator.investigate(
            packet=_packet(), graph={}, workflow_run_id="workflow-1"
        )

    assert raised.value.reason == "MISSING_STARTING_LOCATIONS"
    assert raised.value.claims[0].limitations[0] == "NEEDS_SCANNER_ENRICHMENT"
    assert repository.operations == []
    factory.assert_not_called()
    invoker.assert_not_called()


def test_partial_coverage_converts_negative_claim_to_scanner_enrichment() -> None:
    repository = _Repository(
        {
            "/src/review/gate.py": "one\ntwo\nthree\nfour\nfive\n",
            "/src/review/helper.py": "helper\nvalue\n",
        }
    )
    response = {
        "structured_response": {
            "claims": [
                {
                    "criterion": "HUMAN_REVIEW",
                    "claimType": ENGINEERING_EVIDENCE_CLAIM_TYPES[
                        "requirement_not_met"
                    ],
                    "sourceLocations": [
                        {
                            "path": "src/review/gate.py",
                            "startLine": 2,
                            "endLine": 4,
                        }
                    ],
                    "confidence": 0.9,
                    "limitations": [],
                }
            ]
        }
    }
    investigator, _factory, invoker = _investigator(repository, response)
    investigator.configure_plan(
        investigation_plan={"items": [_route()]},
        intelligence_pack=_pack("PARTIAL"),
    )

    with pytest.raises(NeedsScannerEnrichment) as raised:
        investigator.investigate(
            packet=_packet(), graph={}, workflow_run_id="workflow-1"
        )

    assert raised.value.reason == "BOUNDED_EVIDENCE_INSUFFICIENT"
    assert invoker.call_count == 1


def test_batch_group_reads_shared_source_window_once_for_related_rules() -> None:
    repository = _Repository(
        {
            "/src/review/gate.py": "one\ntwo\nthree\nfour\nfive\n",
            "/src/review/audit.py": "one\ntwo\nthree\nfour\nfive\n",
            "/src/review/helper.py": "helper\nvalue\n",
        }
    )
    investigator, _factory, invoker = _investigator(repository)
    investigator.configure_plan(
        investigation_plan={
            "items": [
                _route("rule-a", path="src/review/gate.py"),
                _route("rule-b", path="src/review/audit.py"),
            ]
        },
        intelligence_pack=_pack(),
    )

    for rule_id in ("rule-a", "rule-b"):
        with pytest.raises(NeedsScannerEnrichment):
            investigator.investigate(
                packet=_packet(rule_id), graph={}, workflow_run_id="workflow-1"
            )

    reads = [detail for operation, detail in repository.operations if operation == "read"]
    assert reads == [
        "/src/review/gate.py",
        "/src/review/audit.py",
        "/src/review/helper.py",
    ]
    assert sum(operation == "graph" for operation, _ in repository.operations) == 2
    assert invoker.call_count == 2


def test_agentic_fallback_requires_reason_and_emits_observability() -> None:
    repository = _Repository({})
    investigator, factory, invoker = _investigator(repository)
    fallback_claim = EvidenceClaim(
        claim_id="claim:fallback",
        engineering_rule_id="rule-a",
        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
        value=None,
        evidence_refs=(),
        confidence=0,
        limitations=(ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],),
        criterion="HUMAN_REVIEW",
    )
    fallback = MagicMock()
    fallback.investigate.return_value = [fallback_claim]
    observed: list[dict[str, str]] = []
    route = {
        **_route(
            fallback_reason=AGENTIC_FALLBACK_REASONS[
                "scannerEnrichmentUnavailable"
            ]
        ),
        "startingLocations": [],
    }
    investigator.configure_plan(
        investigation_plan={"items": [route]},
        intelligence_pack=_pack(),
        agentic_fallback=fallback,
        fallback_observer=observed.append,
    )

    claims = investigator.investigate(
        packet=_packet(), graph={}, workflow_run_id="workflow-1"
    )

    assert claims == [fallback_claim]
    fallback.investigate.assert_called_once()
    assert observed == [
        {
            "engineeringRuleId": "rule-a",
            "fallbackReason": "SCANNER_ENRICHMENT_UNAVAILABLE",
            "triggerReason": "MISSING_STARTING_LOCATIONS",
        }
    ]
    factory.assert_not_called()
    invoker.assert_not_called()


def test_missing_reason_never_calls_agentic_fallback() -> None:
    repository = _Repository({})
    investigator, _factory, _invoker = _investigator(repository)
    fallback = MagicMock()
    investigator.configure_plan(
        investigation_plan={"items": [{**_route(), "startingLocations": []}]},
        intelligence_pack=_pack(),
        agentic_fallback=fallback,
    )

    with pytest.raises(NeedsScannerEnrichment):
        investigator.investigate(
            packet=_packet(), graph={}, workflow_run_id="workflow-1"
        )

    fallback.investigate.assert_not_called()


def test_legacy_assessment_without_scanner_memory_requests_enrichment_not_broad_scan() -> None:
    """Phase 7: an assessment scanned before the Repository Intelligence Pack.

    No pack means no Scanner memory to route from. The deterministic path must
    stop as enrichment work rather than fall back to repository-wide discovery.
    """
    repository = _Repository({"/src/review/gate.py": "one\ntwo\n"})
    investigator, factory, invoker = _investigator(repository)
    investigator.configure_plan(
        investigation_plan={
            "items": [{**_route(), "startingLocations": []}]
        },
        intelligence_pack=None,
    )

    with pytest.raises(NeedsScannerEnrichment) as raised:
        investigator.investigate(
            packet=_packet(), graph={}, workflow_run_id="workflow-1"
        )

    assert raised.value.reason == "MISSING_STARTING_LOCATIONS"
    # Nothing was read or searched: no seeds, no model call, no broad scan.
    assert repository.operations == []
    factory.assert_not_called()
    invoker.assert_not_called()


def test_legacy_assessment_cannot_produce_absence_claims_from_missing_coverage() -> None:
    """Without Scanner coverage, an absence claim is never safe to close."""
    repository = _Repository(
        {
            "/src/review/gate.py": "one\ntwo\nthree\nfour\nfive\n",
            "/src/review/helper.py": "helper\nvalue\n",
        }
    )
    negative = {
        "structured_response": {
            "claims": [
                {
                    "criterion": "HUMAN_REVIEW",
                    "claimType": ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"],
                    "sourceLocations": [
                        {"path": "src/review/gate.py", "startLine": 1, "endLine": 2}
                    ],
                    "confidence": 0.9,
                    "limitations": [],
                }
            ]
        }
    }
    investigator, _factory, _invoker = _investigator(repository, negative)
    investigator.configure_plan(
        investigation_plan={"items": [_route()]},
        intelligence_pack=None,
    )

    with pytest.raises(NeedsScannerEnrichment) as raised:
        investigator.investigate(
            packet=_packet(), graph={}, workflow_run_id="workflow-1"
        )

    # An absence claim is never closed from a window the Scanner never covered.
    assert raised.value.reason == "BOUNDED_EVIDENCE_INSUFFICIENT"
    assert raised.value.claims[0].claim_type == ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
