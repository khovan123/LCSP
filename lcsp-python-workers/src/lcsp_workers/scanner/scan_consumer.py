from __future__ import annotations

import time
from dataclasses import dataclass

from lcsp_workers.platform.correlation import set_correlation_id
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.platform.queue_consumer import ConsumerBase

from .snapshot_service_client import SnapshotArchiveRequest, SnapshotServiceClient
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
    ):
        super().__init__(config, pbac_client)
        self._snapshot_client = snapshot_client or SnapshotServiceClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )
        self._workspace = workspace or ScannerWorkspace()

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
