from __future__ import annotations

import time
from dataclasses import asdict, dataclass

from lcsp_workers.platform.correlation import set_correlation_id
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.platform.queue_consumer import ConsumerBase

from .snapshot_service_client import SnapshotArchiveRequest, SnapshotServiceClient
from .tool_registry import ToolRegistry
from .tools.semgrep_tool import SemgrepRunResult, SemgrepTool
from .tools.syft_tool import SyftTool
from .tools.tool_base import OUTCOME_SUCCESS
from .workspace import ArchiveMaterializationError, ScannerWorkspace

logger = get_logger(__name__)


@dataclass(frozen=True)
class ScanJobEnvelope:
    scan_job_id: str
    snapshot_id: str
    correlation_id: str


class ScanConsumer(ConsumerBase):
    queue_name = "scan.triggered"
    routing_key = "scan.triggered"
    scan_timeout_seconds = 600

    def __init__(
        self,
        config,
        pbac_client=None,
        snapshot_client: SnapshotServiceClient | None = None,
        workspace: ScannerWorkspace | None = None,
        syft_tool: SyftTool | None = None,
        semgrep_tool: SemgrepTool | None = None,
    ):
        super().__init__(config, pbac_client)
        self._snapshot_client = snapshot_client or SnapshotServiceClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )
        self._workspace = workspace or ScannerWorkspace()
        self._syft_tool = syft_tool or SyftTool()
        self._semgrep_tool = semgrep_tool or SemgrepTool()

    def handle(self, message: dict, correlation_id: str) -> None:
        started_at = time.monotonic()
        envelope = self._read_envelope(message, correlation_id)
        set_correlation_id(envelope.correlation_id)

        archive = self._snapshot_client.download_snapshot_archive(
            SnapshotArchiveRequest(
                snapshot_id=envelope.snapshot_id,
                scan_job_id=envelope.scan_job_id,
                correlation_id=envelope.correlation_id,
            )
        )

        result = None
        tool_registry = ToolRegistry()
        try:
            result = self._workspace.materialize(
                envelope.scan_job_id,
                archive,
                snapshot_id=envelope.snapshot_id,
            )
            logger.info(
                "SCAN_WORKSPACE_MATERIALIZED",
                job_id=result.job_id,
                snapshot_id=result.snapshot_id,
                workspace_path=str(result.workspace_path),
                total_size_bytes=result.total_size_bytes,
                extracted_files=result.extracted_files,
                skipped_files=result.skipped_files,
                coverage_limited=result.coverage_limited,
            )

            syft_result = self._syft_tool.run(result.workspace_path)
            self._record_tool_execution(
                tool_registry,
                syft_result.execution,
                sbom_entries=len(syft_result.entries),
            )

            semgrep_result = self._semgrep_tool.run(result.workspace_path)
            self._record_semgrep_executions(tool_registry, semgrep_result)

            logger.info(
                "SCAN_TOOL_PROVENANCE_RECORDED",
                tool_provenance=[asdict(item) for item in tool_registry.all()],
            )

            if time.monotonic() - started_at > self.scan_timeout_seconds:
                raise ArchiveMaterializationError(
                    f"scan timeout exceeded for job {envelope.scan_job_id!r}"
                )
        except Exception:
            if result is None:
                self._workspace.cleanup(envelope.scan_job_id)
            raise
        finally:
            self._workspace.cleanup(envelope.scan_job_id)

    def _read_envelope(self, message: dict, correlation_id: str) -> ScanJobEnvelope:
        scan_job_id = self._read_field(message, "scan_job_id", "scanJobId")
        snapshot_id = self._read_field(message, "snapshot_id", "snapshotId")
        message_correlation_id = self._read_field(
            message,
            "correlation_id",
            "correlationId",
        )

        if not scan_job_id or not snapshot_id:
            raise ArchiveMaterializationError(
                "scan job envelope missing required identifiers"
            )

        return ScanJobEnvelope(
            scan_job_id=scan_job_id,
            snapshot_id=snapshot_id,
            correlation_id=message_correlation_id or correlation_id,
        )

    def _read_field(self, message: dict, *names: str) -> str | None:
        for name in names:
            value = message.get(name)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return None

    def _record_semgrep_executions(
        self,
        tool_registry: ToolRegistry,
        semgrep_result: SemgrepRunResult,
    ) -> None:
        for execution in semgrep_result.executions:
            context: dict[str, object] = {}
            if execution.tool_name == "semgrep_ai_usage":
                context["semgrep_findings"] = len(semgrep_result.findings)
            else:
                context["redaction_applied"] = semgrep_result.redaction_applied

            self._record_tool_execution(tool_registry, execution, **context)

    def _record_tool_execution(
        self,
        tool_registry: ToolRegistry,
        execution,
        **context: object,
    ) -> None:
        tool_registry.register(execution)

        logger.info(
            "SCAN_TOOL_EXECUTED",
            tool_name=execution.tool_name,
            tool_version=execution.tool_version,
            outcome=execution.outcome,
            config_hash=execution.config_hash,
            **context,
        )

        if execution.outcome != OUTCOME_SUCCESS:
            logger.warning(
                "SCAN_TOOL_NON_BLOCKING_FAILURE",
                tool_name=execution.tool_name,
                outcome=execution.outcome,
                messages=execution.messages,
            )
