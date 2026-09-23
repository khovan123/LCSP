"""Governed targeted reanalysis over the Deep Agent repository analyzer."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Protocol

from tools.common.capabilities.managed.boundary import (
    AgentBoundaryBase,
    NonRetryableAgentBoundaryError,
)
from tools.common.capabilities.platform.api_client import WorkerApiClient
from tools.common.capabilities.platform.correlation import set_correlationId
from tools.common.capabilities.platform.logging import get_logger

from .boundary import RepositoryAnalysisBoundary


logger = get_logger(__name__)

TARGETED_REANALYSIS_COMMAND = "command.scan.targeted-reanalysis.v1"
TARGETED_REANALYSIS_BOUNDARY_SOURCE = "repository-analysis.targeted"
TERMINAL_FAILURE_STATE = "FAILED"
DLQ_FAILURE_STATE = "DLQ"
SAFE_VALIDATION_FAILURE_CODE = "TARGETED_REANALYSIS_EVENT_MISMATCH"
SAFE_DELIVERY_FAILURE_CODE = "TARGETED_REANALYSIS_WORKER_DELIVERY_EXHAUSTED"
SAFE_UNRESOLVED_SCOPE_CODE = "TARGETED_REANALYSIS_SCOPE_UNRESOLVED"


class RepositoryAnalysisRunner(Protocol):
    def handle(self, message: dict, correlationId: str) -> object: ...


@dataclass(frozen=True)
class TargetedReanalysisEnvelope:
    request_id: str
    scan_job_id: str
    snapshot_id: str
    commit_sha: str
    analyzer_id: str
    normalized_scope: dict[str, object]
    checkpoint_ref: str
    correlationId: str
    delivery_attempt: int


class TargetedRepositoryAnalysisBoundary(AgentBoundaryBase):
    """Validate and execute one API-authorized scoped Deep Agent reanalysis."""

    boundary_source = TARGETED_REANALYSIS_BOUNDARY_SOURCE
    source_event = TARGETED_REANALYSIS_COMMAND
    requires_rbac = False
    retry_delays_seconds = (10, 60, 300)

    def __init__(
        self,
        config,
        rbac_client=None,
        *,
        api_client: WorkerApiClient | None = None,
        analysis_runner: RepositoryAnalysisRunner | None = None,
    ) -> None:
        super().__init__(config, rbac_client)
        self._api_client = api_client or WorkerApiClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )
        self._analysis_runner = analysis_runner or RepositoryAnalysisBoundary(
            config,
            api_client=self._api_client,
        )

    def handle(self, message: dict, correlationId: str) -> None:
        envelope = self._read_envelope(message, correlationId)
        set_correlationId(envelope.correlationId)
        request = self._api_client.get_targeted_reanalysis_request(
            envelope.request_id
        )
        self._assert_matches_authorized_request(envelope, request)

        if request.get("state") in {"COMPLETED", "FAILED", "DLQ"}:
            return
        if not self._api_client.claim_targeted_reanalysis_request(
            envelope.request_id
        ):
            return

        try:
            path_prefixes = envelope.normalized_scope.get("pathPrefixes")
            if not isinstance(path_prefixes, list) or not path_prefixes:
                self._fail_terminal(
                    envelope.request_id,
                    TERMINAL_FAILURE_STATE,
                    SAFE_UNRESOLVED_SCOPE_CODE,
                )
                raise NonRetryableAgentBoundaryError(
                    "targeted reanalysis requires API-resolved pathPrefixes"
                )

            self._analysis_runner.handle(
                {
                    "scanJobId": envelope.scan_job_id,
                    "snapshotId": envelope.snapshot_id,
                    "commitSha": envelope.commit_sha,
                    "correlationId": envelope.correlationId,
                    "targetedReanalysis": {
                        "analyzerId": envelope.analyzer_id,
                        "pathPrefixes": path_prefixes,
                    },
                },
                envelope.correlationId,
            )
        except NonRetryableAgentBoundaryError:
            raise
        except Exception as error:
            self._handle_execution_failure(envelope, error)

    def _handle_execution_failure(
        self,
        envelope: TargetedReanalysisEnvelope,
        error: Exception,
    ) -> None:
        if envelope.delivery_attempt >= self._config.max_retries:
            self._fail_terminal(
                envelope.request_id,
                DLQ_FAILURE_STATE,
                SAFE_DELIVERY_FAILURE_CODE,
            )
            raise NonRetryableAgentBoundaryError(
                "targeted repository analysis retries exhausted"
            ) from error

        self._api_client.requeue_targeted_reanalysis_request(envelope.request_id)
        logger.warning(
            "TARGETED_REPOSITORY_ANALYSIS_RETRY_SCHEDULED",
            request_id=envelope.request_id,
            delivery_attempt=envelope.delivery_attempt + 1,
            error_type=type(error).__name__,
        )
        raise error

    def _fail_terminal(
        self,
        request_id: str,
        state: str,
        safe_failure_code: str,
    ) -> None:
        self._api_client.fail_targeted_reanalysis_request(
            request_id,
            state=state,
            safe_failure_code=safe_failure_code,
        )

    def _read_envelope(
        self,
        message: dict,
        correlationId: str,
    ) -> TargetedReanalysisEnvelope:
        request_id = self._read_string(message, "requestId", "request_id")
        scan_job_id = self._read_string(message, "scanJobId", "scan_job_id")
        snapshot_id = self._read_string(message, "snapshotId", "snapshot_id")
        commit_sha = self._read_string(message, "commitSha", "commit_sha")
        analyzer_id = self._read_string(message, "analyzerId", "analyzer_id")
        checkpoint_ref = self._read_string(
            message, "checkpointRef", "checkpoint_ref"
        )
        message_correlation_id = self._read_string(
            message, "correlationId", "correlation_id"
        )
        normalized_scope = message.get(
            "normalizedScope", message.get("normalized_scope")
        )
        if (
            not all(
                (
                    request_id,
                    scan_job_id,
                    snapshot_id,
                    commit_sha,
                    analyzer_id,
                    checkpoint_ref,
                )
            )
            or not self._is_scope(normalized_scope)
        ):
            raise NonRetryableAgentBoundaryError(
                "targeted repository analysis event is invalid"
            )

        delivery_attempt = message.get("_delivery_attempt", 0)
        if not isinstance(delivery_attempt, int) or delivery_attempt < 0:
            raise NonRetryableAgentBoundaryError(
                "targeted repository analysis delivery attempt is invalid"
            )

        return TargetedReanalysisEnvelope(
            request_id=request_id,
            scan_job_id=scan_job_id,
            snapshot_id=snapshot_id,
            commit_sha=commit_sha,
            analyzer_id=analyzer_id,
            normalized_scope=normalized_scope,
            checkpoint_ref=checkpoint_ref,
            correlationId=message_correlation_id or correlationId,
            delivery_attempt=delivery_attempt,
        )

    def _assert_matches_authorized_request(
        self,
        envelope: TargetedReanalysisEnvelope,
        request: dict,
    ) -> None:
        expected = {
            "id": envelope.request_id,
            "scanJobId": envelope.scan_job_id,
            "snapshotId": envelope.snapshot_id,
            "commitSha": envelope.commit_sha,
            "analyzerId": envelope.analyzer_id,
            "checkpointRef": envelope.checkpoint_ref,
        }
        if any(request.get(key) != value for key, value in expected.items()) or (
            self._canonical_scope(request.get("normalizedScope"))
            != self._canonical_scope(envelope.normalized_scope)
        ):
            self._fail_terminal(
                envelope.request_id,
                TERMINAL_FAILURE_STATE,
                SAFE_VALIDATION_FAILURE_CODE,
            )
            raise NonRetryableAgentBoundaryError(
                "targeted repository analysis event did not match request"
            )

    @staticmethod
    def _read_string(message: dict, *keys: str) -> str | None:
        for key in keys:
            value = message.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    @staticmethod
    def _is_scope(value: object) -> bool:
        if not isinstance(value, dict) or len(value) != 1:
            return False
        key, values = next(iter(value.items()))
        return (
            key in {"pathPrefixes", "subjectRefs"}
            and isinstance(values, list)
            and all(isinstance(item, str) and item for item in values)
        )

    @staticmethod
    def _canonical_scope(value: object) -> str | None:
        if not TargetedRepositoryAnalysisBoundary._is_scope(value):
            return None
        return json.dumps(value, sort_keys=True, separators=(",", ":"))


__all__ = [
    "TARGETED_REANALYSIS_COMMAND",
    "TargetedRepositoryAnalysisBoundary",
]
