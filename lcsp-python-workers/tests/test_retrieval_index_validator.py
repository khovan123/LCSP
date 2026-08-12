import json
from pathlib import Path

from lcsp_workers.legal.chromadb_citation_retriever import (
    ChromaDbCitationRetriever,
    RetrievedChunk,
)
from lcsp_workers.legal.legal_chunk_builder import (
    BuildLegalChunksRequest,
    LegalChunkBuilder,
)
from lcsp_workers.legal.legal_chunk_repository import LegalChunkRepository
from lcsp_workers.legal.legal_retrieval_index_repository import (
    LegalRetrievalIndexRecord,
    LegalRetrievalIndexRepository,
)
from lcsp_workers.legal.official_text_extraction import _sha256_bytes
from lcsp_workers.legal.retrieval_index_validator import (
    RetrievalIndexValidator,
    ValidateRetrievalIndexRequest,
)
from lcsp_workers.legal.reviewed_corpus_input_repository import (
    ReviewedCorpusInputRecord,
    ReviewedCorpusInputRepository,
)


class FakeProbeRunner:
    def __init__(self, *, records: list[dict], collection_name: str) -> None:
        self._records_by_id = {
            str(record["id"]): record["metadata"]
            for record in records
            if isinstance(record, dict) and isinstance(record.get("metadata"), dict)
        }
        self._collection_name = collection_name

    def retrieve_exact_from_collection_name(
        self, *, collection_name: str, chunk_ids: list[str]
    ) -> list[RetrievedChunk]:
        if collection_name != self._collection_name:
            raise RuntimeError("wrong collection")
        primary_records = [
            (chunk_id, self._records_by_id[chunk_id])
            for chunk_id in chunk_ids
            if chunk_id in self._records_by_id
        ]
        parent_ids = [
            str(metadata.get("parent_chunk_id") or "")
            for _, metadata in primary_records
            if str(metadata.get("parent_chunk_id") or "")
        ]
        referenced_ids = [
            related_id
            for _, metadata in primary_records
            for related_id in self._related_ids(metadata)
        ]
        primary_id_set = {chunk_id for chunk_id, _ in primary_records}
        parent_records = [
            (chunk_id, self._records_by_id[chunk_id])
            for chunk_id in dict.fromkeys(parent_ids)
            if chunk_id and chunk_id in self._records_by_id
        ]
        parent_id_set = {chunk_id for chunk_id, _ in parent_records}
        referenced_records = [
            (chunk_id, self._records_by_id[chunk_id])
            for chunk_id in dict.fromkeys(referenced_ids)
            if chunk_id
            and chunk_id in self._records_by_id
            and chunk_id not in primary_id_set
            and chunk_id not in parent_id_set
        ]
        return [
            *self._to_chunks(primary_records, "PRIMARY_MATCH"),
            *self._to_chunks(parent_records, "PARENT_CONTEXT"),
            *self._to_chunks(referenced_records, "REFERENCED_CONTEXT"),
        ]

    def build_citation_allowlist(self, chunks: list[RetrievedChunk]) -> dict[str, object]:
        return ChromaDbCitationRetriever().build_citation_allowlist(chunks)

    def _related_ids(self, metadata: dict) -> list[str]:
        related: list[str] = []
        for field in ("outgoing_ref_ids", "incoming_ref_ids"):
            raw = metadata.get(field)
            if not isinstance(raw, str) or not raw:
                continue
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                related.extend(str(value) for value in parsed if str(value))
        return related

    def _to_chunks(
        self, records: list[tuple[str, dict]], role: str
    ) -> list[RetrievedChunk]:
        return [
            RetrievedChunk(
                id=chunk_id,
                document_id=str(metadata.get("doc_id") or ""),
                locator=str(metadata.get("hierarchical_path") or ""),
                legal_status=str(metadata.get("legal_status") or "ACTIVE"),
                role=role,
                source_effect_status=str(metadata.get("source_effect_status") or ""),
                effective_from=str(metadata.get("effective_from") or ""),
                effective_to=str(metadata.get("effective_to") or ""),
            )
            for chunk_id, metadata in records
        ]


def _write_reviewed_input(storage_root: Path) -> str:
    output_dir = storage_root / "reviewed-corpus-inputs" / "reviewed-input-123456"
    output_dir.mkdir(parents=True, exist_ok=True)
    normalized_text_path = output_dir / "LAW-TEST.reviewed.txt"
    manifest_path = output_dir / "LAW-TEST.reviewed-input.json"
    text = "\n".join(
        [
            "Điều 1. Test",
            "1. Nội dung",
            "a) Điểm a",
            "Điều 2. More",
            "Điều 3. Suspended",
        ]
    )
    normalized_text_path.write_text(text + "\n", encoding="utf-8")
    from lcsp_workers.legal.official_text_extraction import _sha256_text

    content_sha256 = _sha256_text(text)
    ReviewedCorpusInputRepository(storage_root=storage_root).save(
        ReviewedCorpusInputRecord(
            reviewed_input_ref="reviewed-input:reviewed-input-123456",
            provenance_ref="prov:reviewed-input:reviewed-input-123456",
            extraction_ref="extraction:canonical-12345678",
            quality_manifest_ref="quality-manifest:quality-12345678",
            correction_profile="DETERMINISTIC_V1",
            status="READY",
            coverage_state="SUFFICIENT",
            content_sha256=content_sha256,
            quality_decision="PASS",
            manual_approval_required=False,
            document_id="LAW-TEST",
            snapshot_ref="snapshot:LAW-TEST:abcd1234ef56",
            source_kind="CANONICAL",
            normalized_text_path=str(normalized_text_path),
            manifest_path=str(manifest_path),
            evidence_refs=["reviewed-input:reviewed-input-123456"],
            limitations=[],
        )
    )
    return "reviewed-input:reviewed-input-123456"


def _build_chunk_set(storage_root: Path) -> str:
    reviewed_input_ref = _write_reviewed_input(storage_root)
    result = LegalChunkBuilder(
        storage_root=storage_root,
        reviewed_input_repository=ReviewedCorpusInputRepository(storage_root=storage_root),
    ).build(
        BuildLegalChunksRequest(
            reviewed_input_ref=reviewed_input_ref,
            document_identity_ref="catalog-source:vbpl.vn:law:law-test",
            chunk_schema_version="LEGAL_CHUNK_V1",
        )
    )
    LegalChunkRepository(storage_root=storage_root).save(result.to_record())
    return result.chunk_set_ref


def _write_index_record(storage_root: Path, chunk_set_ref: str) -> tuple[str, str, list[dict]]:
    chunk_record = LegalChunkRepository(storage_root=storage_root).get_by_chunk_set_ref(
        chunk_set_ref
    )
    assert chunk_record is not None
    chunks = json.loads(Path(chunk_record.chunks_path).read_text(encoding="utf-8"))
    by_locator = {chunk["locator"]: chunk for chunk in chunks}

    point = by_locator["art-1::cl-1::pt-a"]
    clause = by_locator["art-1::cl-1"]
    article_two = by_locator["art-2"]
    article_three = by_locator["art-3"]
    records = [
        {
            "id": point["id"],
            "document": point["content"],
            "metadata": {
                "doc_id": "LAW-TEST",
                "hierarchical_path": point["locator"],
                "parent_chunk_id": clause["id"],
                "outgoing_ref_ids": json.dumps([article_two["id"]]),
                "incoming_ref_ids": "[]",
                "legal_status": "ACTIVE",
                "source_effect_status": "CON_HIEU_LUC",
                "effective_from": "",
                "effective_to": "",
            },
        },
        {
            "id": clause["id"],
            "document": clause["content"],
            "metadata": {
                "doc_id": "LAW-TEST",
                "hierarchical_path": clause["locator"],
                "parent_chunk_id": "",
                "outgoing_ref_ids": "[]",
                "incoming_ref_ids": "[]",
                "legal_status": "ACTIVE",
                "source_effect_status": "CON_HIEU_LUC",
                "effective_from": "",
                "effective_to": "",
            },
        },
        {
            "id": article_two["id"],
            "document": article_two["content"],
            "metadata": {
                "doc_id": "LAW-TEST",
                "hierarchical_path": article_two["locator"],
                "parent_chunk_id": "",
                "outgoing_ref_ids": "[]",
                "incoming_ref_ids": "[]",
                "legal_status": "ACTIVE",
                "source_effect_status": "CON_HIEU_LUC",
                "effective_from": "",
                "effective_to": "",
            },
        },
        {
            "id": article_three["id"],
            "document": article_three["content"],
            "metadata": {
                "doc_id": "LAW-TEST",
                "hierarchical_path": article_three["locator"],
                "parent_chunk_id": "",
                "outgoing_ref_ids": "[]",
                "incoming_ref_ids": "[]",
                "legal_status": "ACTIVE",
                "source_effect_status": "NGUNG_HIEU_LUC",
                "effective_from": "",
                "effective_to": "",
            },
        },
    ]
    records_json = json.dumps(records, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    index_id = "index-test-001"
    index_ref = f"legal-index:{index_id}"
    output_dir = storage_root / "legal-indexes" / index_id
    output_dir.mkdir(parents=True, exist_ok=True)
    records_path = output_dir / "records.json"
    manifest_path = output_dir / "manifest.json"
    records_path.write_text(records_json, encoding="utf-8")
    manifest_path.write_text("{}\n", encoding="utf-8")
    LegalRetrievalIndexRepository(storage_root=storage_root).save(
        LegalRetrievalIndexRecord(
            index_ref=index_ref,
            provenance_ref="prov:index-build:index-test-001",
            chunk_set_ref=chunk_set_ref,
            integrity_manifest_ref="integrity-manifest:test",
            index_profile="CHROMA_STRUCTURE_V1",
            status="READY",
            coverage_state="SUFFICIENT",
            collection_name=f"legal_chunks_{chunk_set_ref.split(':', 1)[1]}",
            index_checksum=_sha256_bytes(records_json.encode("utf-8")),
            indexed_chunk_count=len(records),
            evidence_refs=[index_ref],
            limitations=[],
            manifest_path=str(manifest_path),
            records_path=str(records_path),
        )
    )
    return index_ref, f"legal_chunks_{chunk_set_ref.split(':', 1)[1]}", records


def test_validator_returns_ready_for_exact_parent_xref_and_effect_probes(tmp_path: Path):
    storage_root = tmp_path / "storage"
    chunk_set_ref = _build_chunk_set(storage_root)
    index_ref, collection_name, records = _write_index_record(storage_root, chunk_set_ref)
    validator = RetrievalIndexValidator(
        storage_root=storage_root,
        index_repository=LegalRetrievalIndexRepository(storage_root=storage_root),
        chunk_repository=LegalChunkRepository(storage_root=storage_root),
        probe_runner=FakeProbeRunner(records=records, collection_name=collection_name),
    )

    result = validator.validate(
        ValidateRetrievalIndexRequest(
            index_ref=index_ref,
            chunk_set_ref=chunk_set_ref,
            probe_set_version="LEGAL_RETRIEVAL_PROBES_V1",
        )
    )

    assert result.status == "READY"
    assert result.decision == "PASS"
    assert result.probe_summary == {
        "exactId": 2,
        "parentContext": 1,
        "xrefContext": 1,
        "effectFilter": 1,
    }
    findings_payload = json.loads(result.findings_path.read_text(encoding="utf-8"))
    assert findings_payload == []
    assert "Điều 1. Test" not in result.manifest_path.read_text(encoding="utf-8")


def test_validator_returns_conflict_when_parent_context_is_missing(tmp_path: Path):
    storage_root = tmp_path / "storage"
    chunk_set_ref = _build_chunk_set(storage_root)
    index_ref, collection_name, records = _write_index_record(storage_root, chunk_set_ref)

    class MissingParentRunner(FakeProbeRunner):
        def retrieve_exact_from_collection_name(self, *, collection_name: str, chunk_ids: list[str]):
            chunks = super().retrieve_exact_from_collection_name(
                collection_name=collection_name, chunk_ids=chunk_ids
            )
            return [chunk for chunk in chunks if chunk.role != "PARENT_CONTEXT"]

    validator = RetrievalIndexValidator(
        storage_root=storage_root,
        index_repository=LegalRetrievalIndexRepository(storage_root=storage_root),
        chunk_repository=LegalChunkRepository(storage_root=storage_root),
        probe_runner=MissingParentRunner(records=records, collection_name=collection_name),
    )

    result = validator.validate(
        ValidateRetrievalIndexRequest(
            index_ref=index_ref,
            chunk_set_ref=chunk_set_ref,
            probe_set_version="LEGAL_RETRIEVAL_PROBES_V1",
        )
    )

    assert result.status == "CONFLICT"
    findings = json.loads(result.findings_path.read_text(encoding="utf-8"))
    assert findings[0]["code"] == "PARENT_CONTEXT_MISSING"


def test_validator_blocks_when_index_belongs_to_different_chunk_set(tmp_path: Path):
    storage_root = tmp_path / "storage"
    chunk_set_ref = _build_chunk_set(storage_root)
    other_chunk_set_ref = "chunk-set:other"
    index_ref, collection_name, records = _write_index_record(storage_root, chunk_set_ref)
    validator = RetrievalIndexValidator(
        storage_root=storage_root,
        index_repository=LegalRetrievalIndexRepository(storage_root=storage_root),
        chunk_repository=LegalChunkRepository(storage_root=storage_root),
        probe_runner=FakeProbeRunner(records=records, collection_name=collection_name),
    )

    result = validator.validate(
        ValidateRetrievalIndexRequest(
            index_ref=index_ref,
            chunk_set_ref=other_chunk_set_ref,
            probe_set_version="LEGAL_RETRIEVAL_PROBES_V1",
        )
    )

    assert result.status == "BLOCKED"
    assert result.limitations[0]["code"] == "INDEX_CHUNK_SET_MISMATCH"
