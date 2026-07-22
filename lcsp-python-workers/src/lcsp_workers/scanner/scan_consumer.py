from __future__ import annotations

import time
from dataclasses import asdict, dataclass

from lcsp_workers.platform.api_client import WorkerApiClient
from lcsp_workers.platform.correlation import set_correlation_id
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.platform.queue_consumer import ConsumerBase

from .analyzers.python_analyzer import PythonAnalyzer
from .dependencies.dependency_normalizer import DependencyNormalizer
from .evidence_assembler import EvidenceAssembler, PrivacyAssertionError
from .inventory.analyzer_router import AnalyzerRouter
from .inventory.language_classifier import LanguageClassifier
from .snapshot_service_client import SnapshotArchiveRequest, SnapshotServiceClient
from .tool_registry import ToolRegistry
from .tools.deptry_tool import DeptryTool
from .tools.knip_tool import KnipTool
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
        knip_tool: KnipTool | None = None,
        deptry_tool: DeptryTool | None = None,
        language_classifier: LanguageClassifier | None = None,
        analyzer_router: AnalyzerRouter | None = None,
        dependency_normalizer: DependencyNormalizer | None = None,
        api_client: WorkerApiClient | None = None,
        evidence_assembler: EvidenceAssembler | None = None,
    ):
        super().__init__(config, pbac_client)
        self._snapshot_client = snapshot_client or SnapshotServiceClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )
        self._workspace = workspace or ScannerWorkspace()
        self._syft_tool = syft_tool or SyftTool()
        self._semgrep_tool = semgrep_tool or SemgrepTool()
        self._knip_tool = knip_tool or KnipTool()
        self._deptry_tool = deptry_tool or DeptryTool()
        self._language_classifier = language_classifier or LanguageClassifier()
        self._analyzer_router = analyzer_router or AnalyzerRouter()
        self._dependency_normalizer = dependency_normalizer or DependencyNormalizer()
        self._api_client = api_client or WorkerApiClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )
        self._evidence_assembler = evidence_assembler or EvidenceAssembler()

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

            classification_limitations: list[dict[str, str]] = []
            routed_python_files: list[str] | None = None
            try:
                classifications = self._language_classifier.classify_workspace(
                    result.workspace_path
                )
                dispatch = self._analyzer_router.route(classifications)
                routed_python_files = list(dispatch.python_files)
                classification_limitations = list(dispatch.coverage_limitations)
                logger.info(
                    "SCAN_LANGUAGE_CLASSIFIED",
                    classified_files=len(classifications),
                    python_files=len(dispatch.python_files),
                    ts_js_files=len(dispatch.ts_js_files),
                    basic_files=len(dispatch.basic_files),
                    skipped_files=len(dispatch.skipped_files),
                    coverage_limitations=len(dispatch.coverage_limitations),
                )
            except Exception as error:
                classification_limitations = [
                    {
                        "file_path": "<workspace>",
                        "reason": f"language_classification_failed: {type(error).__name__}",
                    }
                ]
                logger.exception(
                    "SCAN_LANGUAGE_CLASSIFICATION_FAILED",
                    scan_job_id=envelope.scan_job_id,
                    error=str(error),
                )

            syft_result = self._syft_tool.run(result.workspace_path)
            self._record_tool_execution(
                tool_registry,
                syft_result.execution,
                sbom_entries=len(syft_result.entries),
            )

            if time.monotonic() - started_at > self.scan_timeout_seconds:
                raise ArchiveMaterializationError(
                    f"scan timeout exceeded for job {envelope.scan_job_id!r}"
                )

            semgrep_result = self._semgrep_tool.run(result.workspace_path)
            self._record_semgrep_executions(tool_registry, semgrep_result)

            if time.monotonic() - started_at > self.scan_timeout_seconds:
                raise ArchiveMaterializationError(
                    f"scan timeout exceeded for job {envelope.scan_job_id!r}"
                )

            knip_result = self._knip_tool.run(result.workspace_path)
            self._record_tool_execution(
                tool_registry,
                knip_result.execution,
                dependency_facts=len(knip_result.facts),
            )

            if time.monotonic() - started_at > self.scan_timeout_seconds:
                raise ArchiveMaterializationError(
                    f"scan timeout exceeded for job {envelope.scan_job_id!r}"
                )

            deptry_result = self._deptry_tool.run(result.workspace_path)
            self._record_tool_execution(
                tool_registry,
                deptry_result.execution,
                dependency_facts=len(deptry_result.facts),
            )

            if time.monotonic() - started_at > self.scan_timeout_seconds:
                raise ArchiveMaterializationError(
                    f"scan timeout exceeded for job {envelope.scan_job_id!r}"
                )

            logger.info(
                "SCAN_TOOL_PROVENANCE_RECORDED",
                tool_provenance=[asdict(item) for item in tool_registry.all()],
            )

            package_dependencies = self._dependency_normalizer.normalize(
                sbom_entries=syft_result.entries,
                usage_facts=[*knip_result.facts, *deptry_result.facts],
            )
            python_analysis = PythonAnalyzer(result.workspace_path).analyze(
                include_files=routed_python_files
            )
            coverage_notes = self._coverage_notes(result, classification_limitations)
            callback_payload = self._evidence_assembler.assemble(
                scan_job_id=envelope.scan_job_id,
                syft_result=syft_result,
                semgrep_result=semgrep_result,
                coverage_notes=coverage_notes,
                package_dependencies=package_dependencies,
                dependency_executions=[
                    knip_result.execution,
                    deptry_result.execution,
                ],
                python_analysis=python_analysis,
            )
            self._api_client.post_scan_callback(
                envelope.scan_job_id,
                callback_payload,
            )
            logger.info(
                "SCAN_EVIDENCE_CALLBACK_SUBMITTED",
                scan_job_id=envelope.scan_job_id,
                status=callback_payload.status,
                schema_version=callback_payload.schema_version,
            )
        except PrivacyAssertionError as error:
            logger.error(
                "SCAN_EVIDENCE_PRIVACY_ASSERTION_FAILED",
                scan_job_id=envelope.scan_job_id,
                error_code=error.error_code,
            )
            raise
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
        from .tools.semgrep_tool import AI_USAGE_TOOL_NAME

        for execution in semgrep_result.executions:
            context: dict[str, object] = {}
            if execution.tool_name == AI_USAGE_TOOL_NAME:
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

    def _coverage_notes(
        self,
        result,
        classification_limitations: list[dict[str, str]] | None = None,
    ) -> list[str]:
        notes: list[str] = []
        if result.coverage_limited:
            notes.append(
                f"Scanner coverage limited: skipped {result.skipped_files} files due to workspace safety limits."
            )

        for limitation in classification_limitations or []:
            file_path = limitation.get("file_path", "<unknown>")
            reason = limitation.get("reason", "unsupported")
            notes.append(
                f"SCAN_COVERAGE_LIMITATION: file={file_path} reason={reason}"
            )
        return notes
