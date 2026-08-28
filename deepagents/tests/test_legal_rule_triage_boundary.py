from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from tools.triage.legal_rule_triage import boundary as triage_boundary


def _config():
    return SimpleNamespace(max_retries=3)


def _message() -> dict:
    return {
        "trigger": "ENGINEERING_RULE_NOT_READY",
        "affectedLegalRuleIds": ["RULE-2", "RULE-1"],
        "legalRuleCatalogVersionId": "catalog-v2",
        "legalCorpusVersionId": "corpus-v3",
        "idempotencyKey": "legal-triage:abc123",
        "resumeEvidenceReportId": "ter-1",
        "resumeWorkflowRunId": "scan-1",
        "correlationId": "corr-1",
    }


def test_owner_checkpoints_assessment_runs_triage_and_delegates_reconciliation(monkeypatch) -> None:
    coordinator = MagicMock()
    coordinator.claim_or_observe.return_value = SimpleNamespace(
        status="OWNER",
        execution_id="triage:owner",
    )
    coordinator.active_status.return_value = {"active": False}
    monkeypatch.setattr(
        triage_boundary,
        "TriageSingletonCoordinator",
        lambda: coordinator,
    )

    agent = MagicMock()
    monkeypatch.setattr(triage_boundary, "create_agent", lambda **_kwargs: agent)
    waiting_registry = MagicMock()

    from tools.common.capabilities.managed import invocation

    direct_resume = MagicMock()
    monkeypatch.setattr(invocation, "invoke_boundary", direct_resume)

    boundary = triage_boundary.LegalRuleTriageBoundary(
        _config(),
        waiting_registry=waiting_registry,
    )
    boundary.handle(_message(), "corr-1")

    waiting_registry.register.assert_called_once_with(
        evidence_report_id="ter-1",
        workflow_run_id="scan-1",
        source_correlation_id="corr-1",
    )
    coordinator.claim_or_observe.assert_called_once_with(
        affected_rule_ids=["RULE-2", "RULE-1"],
        idempotency_key="legal-triage:abc123",
        trigger="ENGINEERING_RULE_NOT_READY",
    )
    agent.invoke.assert_called_once()
    invoke_input = agent.invoke.call_args.args[0]
    instruction = invoke_input["messages"][0]["content"]
    assert "triageExecutionId=triage:owner" in instruction
    assert "legal-triage:abc123" in instruction
    assert "assessment-" not in instruction.lower()
    assert "ter-1" not in instruction
    assert "scan-1" not in instruction

    # The finish tool reconciles all waiting Assessments after releasing the singleton;
    # the boundary must not duplicate only the originating Assessment here.
    direct_resume.assert_not_called()


def test_running_singleton_keeps_resume_checkpoint_without_queue_merge_or_agent(monkeypatch) -> None:
    coordinator = MagicMock()
    coordinator.claim_or_observe.return_value = SimpleNamespace(
        status="ALREADY_RUNNING",
        execution_id="triage:active",
    )
    monkeypatch.setattr(
        triage_boundary,
        "TriageSingletonCoordinator",
        lambda: coordinator,
    )
    create_agent = MagicMock()
    monkeypatch.setattr(triage_boundary, "create_agent", create_agent)
    waiting_registry = MagicMock()

    boundary = triage_boundary.LegalRuleTriageBoundary(
        _config(),
        waiting_registry=waiting_registry,
    )
    boundary.handle(_message(), "corr-1")

    waiting_registry.register.assert_called_once_with(
        evidence_report_id="ter-1",
        workflow_run_id="scan-1",
        source_correlation_id="corr-1",
    )
    create_agent.assert_not_called()
    coordinator.set_batch_work.assert_not_called()


def test_triage_failure_releases_owner_and_preserves_waiting_checkpoint(monkeypatch) -> None:
    coordinator = MagicMock()
    coordinator.claim_or_observe.return_value = SimpleNamespace(
        status="OWNER",
        execution_id="triage:owner",
    )
    monkeypatch.setattr(
        triage_boundary,
        "TriageSingletonCoordinator",
        lambda: coordinator,
    )
    agent = MagicMock()
    agent.invoke.side_effect = RuntimeError("model failure")
    monkeypatch.setattr(triage_boundary, "create_agent", lambda **_kwargs: agent)
    waiting_registry = MagicMock()

    boundary = triage_boundary.LegalRuleTriageBoundary(
        _config(),
        waiting_registry=waiting_registry,
    )
    with pytest.raises(RuntimeError, match="model failure"):
        boundary.handle(_message(), "corr-1")

    waiting_registry.register.assert_called_once()
    coordinator.abandon_execution.assert_called_once_with(
        execution_id="triage:owner"
    )


def test_triage_must_finish_singleton_before_reconciliation_can_happen(monkeypatch) -> None:
    coordinator = MagicMock()
    coordinator.claim_or_observe.return_value = SimpleNamespace(
        status="OWNER",
        execution_id="triage:owner",
    )
    coordinator.active_status.return_value = {
        "active": True,
        "triageExecutionId": "triage:owner",
    }
    monkeypatch.setattr(
        triage_boundary,
        "TriageSingletonCoordinator",
        lambda: coordinator,
    )
    agent = MagicMock()
    monkeypatch.setattr(triage_boundary, "create_agent", lambda **_kwargs: agent)
    waiting_registry = MagicMock()

    boundary = triage_boundary.LegalRuleTriageBoundary(
        _config(),
        waiting_registry=waiting_registry,
    )
    with pytest.raises(RuntimeError, match="returned before finish"):
        boundary.handle(_message(), "corr-1")

    coordinator.abandon_execution.assert_called_once_with(
        execution_id="triage:owner"
    )


def test_automatic_boundary_rejects_manual_trigger_before_checkpointing() -> None:
    message = _message()
    message["trigger"] = "MANUAL_ENGINEERING_RULE_NOT_READY"
    waiting_registry = MagicMock()

    boundary = triage_boundary.LegalRuleTriageBoundary(
        _config(),
        waiting_registry=waiting_registry,
    )
    with pytest.raises(ValueError, match="ENGINEERING_RULE_NOT_READY"):
        boundary.handle(message, "corr-1")

    waiting_registry.register.assert_not_called()
