"""MW-scan-py-004: Evidence Report Assembly and Callback tests."""

from __future__ import annotations

from dataclasses import asdict

import pytest

from lcsp_workers.scanner.evidence_assembler import (
    EvidenceAssembler,
    PrivacyAssertionError,
)
from lcsp_workers.scanner.tools.semgrep_tool import SemgrepFinding, SemgrepRunResult
from lcsp_workers.scanner.tools.syft_tool import SBOMEntry, SyftRunResult
from lcsp_workers.scanner.tools.tool_base import (
    OUTCOME_SUCCESS,
    OUTCOME_TOOL_FAILURE,
    ToolExecutionResult,
)


def _syft_result(outcome: str = OUTCOME_SUCCESS) -> SyftRunResult:
    return SyftRunResult(
        entries=[
            SBOMEntry(
                name="openai",
                version="1.59.3",
                ecosystem="pypi",
                location="requirements.txt",
                purl="pkg:pypi/openai@1.59.3",
                license="Apache-2.0",
            )
        ]
        if outcome == OUTCOME_SUCCESS
        else [],
        execution=ToolExecutionResult(
            tool_name="syft",
            tool_version="syft v1.0.0",
            outcome=outcome,
            config_hash="sha256:syft",
            messages=[] if outcome == OUTCOME_SUCCESS else ["syft failed safely"],
        ),
    )


def _semgrep_result(outcome: str = OUTCOME_SUCCESS) -> SemgrepRunResult:
    return SemgrepRunResult(
        findings=[
            SemgrepFinding(
                rule_id="lcsp.openai-client",
                signal_type="provider_integration",
                file_path="src/app.py",
                line_start=3,
                line_end=3,
                message="OpenAI client import detected",
                severity="INFO",
            )
        ]
        if outcome == OUTCOME_SUCCESS
        else [],
        executions=[
            ToolExecutionResult(
                tool_name="semgrep_ai_usage",
                tool_version="semgrep 1.99.0",
                outcome=outcome,
                config_hash="sha256:semgrep-ai",
                messages=[] if outcome == OUTCOME_SUCCESS else ["semgrep failed safely"],
            ),
            ToolExecutionResult(
                tool_name="semgrep_secret_detect",
                tool_version="semgrep 1.99.0",
                outcome=outcome,
                config_hash="sha256:semgrep-secret",
                messages=[] if outcome == OUTCOME_SUCCESS else ["semgrep failed safely"],
            ),
        ],
        redaction_applied=outcome != OUTCOME_SUCCESS,
    )


@pytest.mark.p0
def test_t01_assembles_full_evidence_payload() -> None:
    payload = EvidenceAssembler().assemble(
        scan_job_id="scan-job-1",
        syft_result=_syft_result(),
        semgrep_result=_semgrep_result(),
        coverage_notes=["Workspace skipped 1 oversize file"],
    )

    assert payload.scan_job_id == "scan-job-1"
    assert payload.status == "success"
    assert payload.tools_version == {
        "syft": "syft v1.0.0",
        "semgrep_ai_usage": "semgrep 1.99.0",
        "semgrep_secret_detect": "semgrep 1.99.0",
    }
    assert payload.config_hash["syft"] == "sha256:syft"
    assert payload.privacy_flags == {
        "containsSourceCode": False,
        "secretsRedacted": True,
        "sourceStrippedFromFindings": True,
    }
    assert payload.evidence_payload["sbom_entries"] == [asdict(_syft_result().entries[0])]
    assert payload.evidence_payload["ai_usage_signals"] == [
        asdict(_semgrep_result().findings[0])
    ]
    assert payload.evidence_payload["coverage_notes"] == [
        "Workspace skipped 1 oversize file"
    ]


@pytest.mark.p0
def test_t02_one_tool_failure_is_recorded_and_callback_payload_is_partial() -> None:
    payload = EvidenceAssembler().assemble(
        scan_job_id="scan-job-1",
        syft_result=_syft_result(outcome=OUTCOME_TOOL_FAILURE),
        semgrep_result=_semgrep_result(),
        coverage_notes=[],
    )

    assert payload.status == "partial"
    assert payload.evidence_payload["tool_failures"] == [
        {
            "tool_name": "syft",
            "tool_version": "syft v1.0.0",
            "outcome": "tool_failure",
            "messages": ["syft failed safely"],
        }
    ]


@pytest.mark.p0
def test_t03_all_tools_fail_still_assembles_failed_callback_payload() -> None:
    payload = EvidenceAssembler().assemble(
        scan_job_id="scan-job-1",
        syft_result=_syft_result(outcome=OUTCOME_TOOL_FAILURE),
        semgrep_result=_semgrep_result(outcome=OUTCOME_TOOL_FAILURE),
        coverage_notes=[],
    )

    assert payload.status == "failed"
    assert payload.error_code == "ALL_TOOLS_FAILED"
    assert payload.evidence_payload["sbom_entries"] == []
    assert payload.evidence_payload["ai_usage_signals"] == []
    assert len(payload.evidence_payload["tool_failures"]) == 3


@pytest.mark.p0
def test_t04_privacy_assertion_blocks_source_code_payload() -> None:
    semgrep_result = SemgrepRunResult(
        findings=[
            SemgrepFinding(
                rule_id="lcsp.model-call",
                signal_type="model_call",
                file_path="src/app.py",
                line_start=1,
                line_end=3,
                message="def call_model():\n    return client.chat.completions.create()",
                severity="INFO",
            )
        ],
        executions=_semgrep_result().executions,
        redaction_applied=False,
    )

    with pytest.raises(PrivacyAssertionError) as exc_info:
        EvidenceAssembler().assemble(
            scan_job_id="scan-job-1",
            syft_result=_syft_result(),
            semgrep_result=semgrep_result,
            coverage_notes=[],
        )

    assert exc_info.value.error_code == "PRIVACY_ASSERTION_FAILED"


@pytest.mark.p0
def test_t06_final_payload_redacts_secret_patterns_without_redacting_config_hash() -> None:
    semgrep_result = SemgrepRunResult(
        findings=[
            SemgrepFinding(
                rule_id="lcsp.llm-api-key-ref",
                signal_type="provider_integration",
                file_path="src/app.py",
                line_start=1,
                line_end=1,
                message="OpenAI api_key=sk-ant-secretvalue1234567890",
                severity="WARNING",
            )
        ],
        executions=_semgrep_result().executions,
        redaction_applied=True,
    )

    payload = EvidenceAssembler().assemble(
        scan_job_id="scan-job-1",
        syft_result=_syft_result(),
        semgrep_result=semgrep_result,
        coverage_notes=[],
    )

    assert payload.config_hash["semgrep_ai_usage"] == "sha256:semgrep-ai"
    finding = payload.evidence_payload["ai_usage_signals"][0]
    assert finding["message"] == "OpenAI api_key=[REDACTED:ANTHROPIC_KEY]"
