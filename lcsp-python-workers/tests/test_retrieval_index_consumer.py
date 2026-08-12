from pathlib import Path
from types import SimpleNamespace

import pytest

from lcsp_workers.legal.retrieval_index_validation_consumer import (
    LEGAL_RETRIEVAL_VALIDATION_COMMAND,
    LEGAL_RETRIEVAL_VALIDATION_QUEUE,
    RetrievalIndexValidationConsumer,
)
from lcsp_workers.legal.retrieval_validation_repository import (
    RetrievalValidationRepository,
)
from lcsp_workers.platform.queue_consumer import NonRetryableWorkerError


class FakeValidationResult:
    def __init__(self) -> None:
        self.validation_manifest_ref = "retrieval-validation:test"

    def to_record(self):
        from lcsp_workers.legal.retrieval_validation_repository import (
            RetrievalValidationRecord,
        )

        return RetrievalValidationRecord(
            validation_manifest_ref="retrieval-validation:test",
            provenance_ref="prov:index-validate:test",
            index_ref="legal-index:test",
            chunk_set_ref="chunk-set:test",
            probe_set_version="LEGAL_RETRIEVAL_PROBES_V1",
            status="READY",
            coverage_state="SUFFICIENT",
            decision="PASS",
            probe_summary={
                "exactId": 1,
                "parentContext": 1,
                "xrefContext": 1,
                "effectFilter": 1,
            },
            finding_refs=[],
            evidence_refs=["retrieval-validation:test"],
            limitations=[],
            manifest_path="/tmp/manifest.json",
            findings_path="/tmp/findings.json",
        )


def test_consumer_persists_retrieval_validation_manifest(tmp_path: Path, monkeypatch):
    storage_root = tmp_path / "storage"

    class FakeValidator:
        def __init__(self, **kwargs):
            self.kwargs = kwargs

        def validate(self, request):
            assert request.index_ref == "legal-index:test"
            assert request.chunk_set_ref == "chunk-set:test"
            assert request.probe_set_version == "LEGAL_RETRIEVAL_PROBES_V1"
            return FakeValidationResult()

    monkeypatch.setattr(
        "lcsp_workers.legal.retrieval_index_validation_consumer.RetrievalIndexValidator",
        FakeValidator,
    )
    config = SimpleNamespace(
        nestjs_api_base_url="http://api.test",
        worker_api_key="worker-key",
        max_retries=3,
        legal_source_storage_root=str(storage_root),
    )
    consumer = RetrievalIndexValidationConsumer(config)

    consumer.handle(
        {
            "indexRef": "legal-index:test",
            "chunkSetRef": "chunk-set:test",
            "probeSetVersion": "LEGAL_RETRIEVAL_PROBES_V1",
        },
        correlation_id="corr-validate-index",
    )

    records = list(
        (storage_root / "retrieval-validations" / "registry" / "provenance").glob(
            "*.json"
        )
    )
    assert len(records) == 1
    record = RetrievalValidationRepository(storage_root=storage_root).get_by_provenance_ref(
        records[0].stem.replace("__", ":")
    )
    assert record is not None
    assert record.status == "READY"
    assert record.decision == "PASS"


def test_consumer_declares_authoritative_queue_binding():
    assert RetrievalIndexValidationConsumer.queue_name == LEGAL_RETRIEVAL_VALIDATION_QUEUE
    assert RetrievalIndexValidationConsumer.routing_key == LEGAL_RETRIEVAL_VALIDATION_COMMAND


def test_consumer_rejects_missing_required_field(tmp_path: Path):
    config = SimpleNamespace(
        nestjs_api_base_url="http://api.test",
        worker_api_key="worker-key",
        max_retries=3,
        legal_source_storage_root=str(tmp_path / "storage"),
    )
    consumer = RetrievalIndexValidationConsumer(config)

    with pytest.raises(NonRetryableWorkerError, match="missing required field: probeSetVersion"):
        consumer.handle(
            {
                "indexRef": "legal-index:test",
                "chunkSetRef": "chunk-set:test",
            },
            correlation_id="corr-missing",
        )
