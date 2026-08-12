from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from structlog import get_logger

from lcsp_workers.platform.queue_consumer import ConsumerBase, NonRetryableWorkerError

from .legal_chunk_repository import LegalChunkRepository
from .legal_retrieval_index_repository import LegalRetrievalIndexRepository
from .retrieval_index_validator import (
    RetrievalIndexValidator,
    ValidateRetrievalIndexRequest,
)
from .retrieval_validation_repository import RetrievalValidationRepository

logger = get_logger(__name__)

LEGAL_RETRIEVAL_VALIDATION_COMMAND = "command.legal-index-validate.requested.v1"
LEGAL_RETRIEVAL_VALIDATION_QUEUE = "lcsp.legal-index-validate.v1"


@dataclass(frozen=True)
class RetrievalIndexValidationEnvelope:
    index_ref: str
    chunk_set_ref: str
    probe_set_version: str


class RetrievalIndexValidationConsumer(ConsumerBase):
    queue_name = LEGAL_RETRIEVAL_VALIDATION_QUEUE
    routing_key = LEGAL_RETRIEVAL_VALIDATION_COMMAND
    requires_pbac = False
    retry_delays_seconds = ()

    def handle(self, message: dict[str, Any], correlation_id: str) -> None:
        envelope = self._read_envelope(message)
        storage_root = self._storage_root()
        validator = RetrievalIndexValidator(
            storage_root=storage_root,
            index_repository=LegalRetrievalIndexRepository(storage_root=storage_root),
            chunk_repository=LegalChunkRepository(storage_root=storage_root),
        )
        try:
            result = validator.validate(
                ValidateRetrievalIndexRequest(
                    index_ref=envelope.index_ref,
                    chunk_set_ref=envelope.chunk_set_ref,
                    probe_set_version=envelope.probe_set_version,
                )
            )
        except (ValueError, RuntimeError, OSError) as exc:
            raise NonRetryableWorkerError(str(exc)) from exc
        RetrievalValidationRepository(storage_root=storage_root).save(result.to_record())
        logger.info(
            "LEGAL_RETRIEVAL_INDEX_VALIDATED",
            chunk_set_ref=envelope.chunk_set_ref,
            index_ref=envelope.index_ref,
            validation_manifest_ref=result.validation_manifest_ref,
            correlation_id=correlation_id,
        )

    def _storage_root(self) -> Path:
        root = getattr(self._config, "legal_source_storage_root", None)
        if not isinstance(root, str) or not root.strip():
            raise NonRetryableWorkerError("LEGAL_SOURCE_STORAGE_ROOT is not configured")
        return Path(root).resolve()

    def _read_envelope(self, message: dict[str, Any]) -> RetrievalIndexValidationEnvelope:
        index_ref = self._read_required_string(message, "indexRef", "index_ref")
        chunk_set_ref = self._read_required_string(message, "chunkSetRef", "chunk_set_ref")
        probe_set_version = self._read_required_string(
            message, "probeSetVersion", "probe_set_version"
        )
        return RetrievalIndexValidationEnvelope(
            index_ref=index_ref,
            chunk_set_ref=chunk_set_ref,
            probe_set_version=probe_set_version,
        )

    @staticmethod
    def _read_required_string(container: dict[str, Any], *keys: str) -> str:
        for key in keys:
            value = container.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        raise NonRetryableWorkerError(f"missing required field: {keys[0]}")
