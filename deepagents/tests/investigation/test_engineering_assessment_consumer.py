from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from tools.common.capabilities.assessment.investigation.engineering_rule.engineering_assessment_boundary import (
    EngineeringAssessmentBoundary,
)
from tools.common.capabilities.assessment.investigation.engineering_rule.pipeline import EngineeringInvestigationResult
from tools.common.capabilities.platform.api_client import WorkerCallbackError
from tools.common.capabilities.managed.boundary import NonRetryableAgentBoundaryError


def _config():
    return SimpleNamespace(
        nestjs_api_base_url="http://localhost:3000",
        worker_api_key="worker-key",
        max_retries=3,
    )


def _snapshot_client_unavailable() -> MagicMock:
    snapshot_client = MagicMock()
    snapshot_client.download_snapshot_archive.side_effect = RuntimeError(
        "snapshot unavailable in unit test"
    )
    return snapshot_client


def _api_client() -> MagicMock:
    api_client = MagicMock()
    api_client.get_accepted_technical_evidence_report.return_value = {
        "id": "ter-1",
        "assessment_id": "assessment-1",
        "snapshot_id": "snapshot-1",
        "scan_job_id": "scan-1",
    }
    api_client.get_wizard_profile_for_assessment.return_value = None
    return api_client


def test_classification_callback_4xx_is_terminal_and_not_outer_retryable() -> None:
    api_client = _api_client()
    api_client.get_wizard_profile_for_assessment.side_effect = RuntimeError(
        "optional wizard unavailable"
    )
    api_client.post_classification_callback.side_effect = WorkerCallbackError(
        "CLASSIFICATION_OVERCLAIM: Callback failed with client error 422."
    )

    result = MagicMock()
    result.status = "COMPLETE"
    result.to_assessment_data.return_value = {
        "mode": "ENGINEERING_RULE_EVALUATION",
        "status": "COMPLETE",
        "summary": {"compliant": 1, "non_compliant": 0, "unknown": 0, "total": 1},
        "evaluations": [],
        "claims": [],
        "limitations": [],
    }
    pipeline = MagicMock()
    pipeline.run.return_value = result

    boundary = EngineeringAssessmentBoundary(
        _config(),
        api_client=api_client,
        investigation_pipeline=pipeline,
        snapshot_client=_snapshot_client_unavailable(),
    )

    with pytest.raises(NonRetryableAgentBoundaryError) as exc_info:
        boundary.handle(
            {"evidenceReportId": "ter-1", "workflowRunId": "scan-1"},
            "corr-1",
        )

    assert "CLASSIFICATION_OVERCLAIM" in str(exc_info.value)
    api_client.post_classification_callback.assert_called_once()


def test_retryable_callback_failure_is_preserved_for_outer_retry_policy() -> None:
    api_client = _api_client()
    api_client.post_classification_callback.side_effect = WorkerCallbackError(
        "Callback failed after 3 attempts with server error 503."
    )

    result = MagicMock()
    result.status = "PARTIAL"
    result.to_assessment_data.return_value = {
        "mode": "ENGINEERING_RULE_EVALUATION",
        "status": "PARTIAL",
        "summary": {"compliant": 0, "non_compliant": 0, "unknown": 1, "total": 1},
        "evaluations": [],
        "claims": [],
        "limitations": ["TEMPORARY_PROVIDER_FAILURE"],
    }
    pipeline = MagicMock()
    pipeline.run.return_value = result

    boundary = EngineeringAssessmentBoundary(
        _config(),
        api_client=api_client,
        investigation_pipeline=pipeline,
        snapshot_client=_snapshot_client_unavailable(),
    )

    with pytest.raises(WorkerCallbackError):
        boundary.handle(
            {"evidenceReportId": "ter-1", "workflowRunId": "scan-1"},
            "corr-1",
        )


def test_waiting_legal_source_is_a_legal_preparation_request_not_wizard_input() -> None:
    api_client = _api_client()
    pipeline = MagicMock()
    pipeline.run.return_value = EngineeringInvestigationResult(
        status="WAITING",
        legal_rule_catalog_version_id="catalog-v1",
        legal_corpus_version_id="corpus-v1",
        rules_considered=0,
        engineering_rules_executed=0,
        engineering_rule_cache_hits=0,
        limitations=("NO_ENGINEERING_RULE_SOURCE_RULES",),
    )

    boundary = EngineeringAssessmentBoundary(
        _config(),
        api_client=api_client,
        investigation_pipeline=pipeline,
        snapshot_client=_snapshot_client_unavailable(),
    )

    boundary.handle(
        {"evidenceReportId": "ter-1", "workflowRunId": "scan-1"},
        "corr-1",
    )

    api_client.post_scan_runtime_event.assert_called_once()
    runtime_payload = api_client.post_scan_runtime_event.call_args.args[1]
    assert runtime_payload["stage"] == "LEGAL_RETRIEVAL"
    assert runtime_payload["tool_name"] == "engineering_rule_readiness"
    assert runtime_payload["waiting_reason"] == "NO_ENGINEERING_RULE_SOURCE_RULES"
    assert runtime_payload["output_summary"]["kind"] == "LEGAL_PREPARATION_REQUEST"
    assert runtime_payload["output_summary"]["scope"] == "LEGAL_MAINTENANCE"
    assert runtime_payload["output_summary"]["requestedBy"] == "ASSESSMENT"
    assert runtime_payload["output_summary"]["reasonCode"] == (
        "NO_ENGINEERING_RULE_SOURCE_RULES"
    )
    assert "questions" not in runtime_payload["output_summary"]

    api_client.post_classification_callback.assert_called_once()
    payload = api_client.post_classification_callback.call_args.args[0]
    assert payload.guardrail_status == "BLOCKED"
    assert payload.classification_data["status"] == "WAITING"


def test_missing_ready_engineering_rules_expose_bounded_manual_triage_request() -> None:
    api_client = _api_client()
    pipeline = MagicMock()
    pipeline.run.return_value = EngineeringInvestigationResult(
        status="BLOCKED",
        legal_rule_catalog_version_id="catalog-v2",
        legal_corpus_version_id="corpus-v3",
        rules_considered=2,
        engineering_rules_executed=0,
        engineering_rule_cache_hits=0,
        limitations=("NO_ENGINEERING_RULE_CANDIDATES",),
        observability={
            "engineering_rule_preparation": {
                "compile_skipped_legal_rule_ids": ["RULE-2", "RULE-1", "RULE-2"],
            }
        },
    )

    boundary = EngineeringAssessmentBoundary(
        _config(),
        api_client=api_client,
        investigation_pipeline=pipeline,
        snapshot_client=_snapshot_client_unavailable(),
    )

    boundary.handle(
        {"evidenceReportId": "ter-1", "workflowRunId": "scan-1"},
        "corr-manual-1",
    )

    runtime_payload = api_client.post_scan_runtime_event.call_args.args[1]
    assert runtime_payload["waiting_reason"] == "ENGINEERING_RULE_NOT_READY"
    assert runtime_payload["stage"] == "LEGAL_RETRIEVAL"
    summary = runtime_payload["output_summary"]
    assert summary["kind"] == "LEGAL_PREPARATION_REQUEST"
    assert summary["missingLegalRuleIds"] == ["RULE-2", "RULE-1"]
    manual = summary["manualTriageRequest"]
    assert manual["mode"] == "LEGAL_MAINTENANCE"
    assert manual["trigger"] == "MANUAL_ENGINEERING_RULE_NOT_READY"
    assert manual["assessmentId"] == "assessment-1"
    assert manual["affectedLegalRuleIds"] == ["RULE-2", "RULE-1"]
    assert manual["legalRuleCatalogVersionId"] == "catalog-v2"
    assert manual["legalCorpusVersionId"] == "corpus-v3"
    assert manual["idempotencyKey"].startswith("legal-triage:")
    assert len(manual["idempotencyKey"]) == len("legal-triage:") + 64

    payload = api_client.post_classification_callback.call_args.args[0]
    assert payload.guardrail_status == "BLOCKED"
    assert payload.classification_data["status"] == "WAITING"
    assert payload.classification_data["observability"]["legal_preparation"] == {
        "status": "WAITING",
        "reason": "ENGINEERING_RULE_NOT_READY",
        "trigger": "MANUAL_ENGINEERING_RULE_NOT_READY",
        "missing_legal_rule_ids": ["RULE-2", "RULE-1"],
    }


def test_boundary_forwards_source_crawl_requests_to_pipeline_for_input_compatibility() -> None:
    api_client = _api_client()

    result = MagicMock()
    result.status = "COMPLETE"
    result.to_assessment_data.return_value = {
        "mode": "ENGINEERING_RULE_EVALUATION",
        "status": "COMPLETE",
        "summary": {"compliant": 0, "non_compliant": 0, "unknown": 0, "total": 0},
        "evaluations": [],
        "claims": [],
        "limitations": [],
    }
    pipeline = MagicMock()
    pipeline.run.return_value = result

    boundary = EngineeringAssessmentBoundary(
        _config(),
        api_client=api_client,
        investigation_pipeline=pipeline,
        snapshot_client=_snapshot_client_unavailable(),
    )
    source_crawl_requests = [
        {
            "documentId": "LAW-TEST",
            "catalogSourceRef": "catalog-source:vbpl.vn:law:law-test",
            "sourceUrl": "https://vbpl.vn/test",
            "gatewayDocumentId": "123",
        }
    ]

    boundary.handle(
        {
            "evidenceReportId": "ter-1",
            "workflowRunId": "scan-1",
            "sourceCrawlRequests": source_crawl_requests,
        },
        "corr-1",
    )

    assert pipeline.run.call_args.kwargs["recovery_source_crawl_requests"] == (
        source_crawl_requests
    )
    api_client.post_classification_callback.assert_called_once()
