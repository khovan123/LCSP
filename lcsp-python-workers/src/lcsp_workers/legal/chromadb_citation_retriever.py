from __future__ import annotations

import os
import json
from dataclasses import dataclass
from datetime import date
from typing import Any


@dataclass(slots=True)
class RetrievedChunk:
    id: str
    document_id: str
    locator: str
    legal_status: str
    role: str
    source_effect_status: str = ""
    effective_from: str = ""
    effective_to: str = ""


class ChromaDbCitationRetriever:
    """Structure-first ChromaDB retrieval with no embeddings or similarity search."""

    def __init__(self, chroma_path: str | None = None) -> None:
        self._chroma_path = chroma_path or os.getenv("LEGAL_CHROMA_PATH", "/tmp/lcsp-chroma")

    def index_corpus(self, corpus_version_id: str, chunks: list[dict[str, Any]]) -> None:
        collection = self._collection(corpus_version_id)
        ids: list[str] = []
        documents: list[str] = []
        metadatas: list[dict[str, str | int | float | bool]] = []
        for chunk in chunks:
            chunk_id = str(chunk.get("id") or "")
            content = str(chunk.get("content") or "")
            if not chunk_id or not content:
                raise ValueError("Legal index requires stable chunk IDs and content")
            ids.append(chunk_id)
            documents.append(content)
            hierarchy = chunk.get("hierarchy") or {}
            parent_chunk_id = str(
                hierarchy.get("parentChunkId")
                or hierarchy.get("parent_chunk_id")
                or ""
            )
            related_chunk_ids = self._related_chunk_ids(hierarchy)
            metadatas.append(
                {
                    "corpus_version_id": corpus_version_id,
                    "document_id": str(chunk.get("documentId") or ""),
                    "locator": str(chunk.get("locator") or ""),
                    "legal_status": str(chunk.get("legalStatus") or "ACTIVE"),
                    "parent_chunk_id": parent_chunk_id,
                    "related_chunk_ids": json.dumps(related_chunk_ids),
                }
            )
        if ids:
            collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas,
                embeddings=[[0.0] for _ in ids],
            )

    def retrieve_exact(self, corpus_version_id: str, chunk_ids: list[str]) -> list[RetrievedChunk]:
        if not chunk_ids:
            return []
        primary_records = self._records_for_collection(self._collection(corpus_version_id), chunk_ids)
        parent_ids = [
            str(metadata.get("parent_chunk_id") or "")
            for _, metadata in primary_records
            if str(metadata.get("parent_chunk_id") or "")
        ]
        referenced_ids = [
            related_id
            for _, metadata in primary_records
            for related_id in self._metadata_related_ids(metadata)
        ]
        primary_ids = {str(chunk_id) for chunk_id, _ in primary_records}
        parent_records = self._records_for_collection(self._collection(corpus_version_id), self._unique(parent_ids))
        referenced_records = self._records_for_collection(
            self._collection(corpus_version_id),
            self._unique(
                chunk_id
                for chunk_id in referenced_ids
                if chunk_id not in primary_ids and chunk_id not in set(parent_ids)
            ),
        )
        return [
            *self._to_chunks(primary_records, "PRIMARY_MATCH"),
            *self._to_chunks(parent_records, "PARENT_CONTEXT"),
            *self._to_chunks(referenced_records, "REFERENCED_CONTEXT"),
        ]

    def retrieve_exact_from_collection_name(
        self, *, collection_name: str, chunk_ids: list[str]
    ) -> list[RetrievedChunk]:
        if not chunk_ids:
            return []
        primary_records = self._records(collection_name, chunk_ids)
        parent_ids = [
            str(metadata.get("parent_chunk_id") or "")
            for _, metadata in primary_records
            if str(metadata.get("parent_chunk_id") or "")
        ]
        referenced_ids = [
            related_id
            for _, metadata in primary_records
            for related_id in self._metadata_related_ids(metadata)
        ]
        primary_ids = {str(chunk_id) for chunk_id, _ in primary_records}
        parent_records = self._records(collection_name, self._unique(parent_ids))
        referenced_records = self._records(
            collection_name,
            self._unique(
                chunk_id
                for chunk_id in referenced_ids
                if chunk_id not in primary_ids and chunk_id not in set(parent_ids)
            ),
        )
        return [
            *self._to_chunks(primary_records, "PRIMARY_MATCH"),
            *self._to_chunks(parent_records, "PARENT_CONTEXT"),
            *self._to_chunks(referenced_records, "REFERENCED_CONTEXT"),
        ]

    def build_citation_allowlist(self, chunks: list[RetrievedChunk]) -> dict[str, Any]:
        allowlist: list[str] = []
        repealed: list[str] = []
        filtered_effect_status: list[str] = []
        filtered_effective_date: list[str] = []
        for chunk in chunks:
            if chunk.legal_status == "REPEALED":
                repealed.append(chunk.id)
                continue
            if chunk.source_effect_status in {
                "NGUNG_HIEU_LUC",
                "HET_HIEU_LUC_TOAN_BO",
                "KHONG_CON_PHU_HOP",
            }:
                filtered_effect_status.append(chunk.id)
                continue
            if self._outside_default_effective_window(chunk):
                filtered_effective_date.append(chunk.id)
                continue
            allowlist.append(chunk.id)
        return {
            "allowlist": allowlist,
            "repealed_chunk_ids": repealed,
            "filtered_effect_status_chunk_ids": filtered_effect_status,
            "filtered_effective_date_chunk_ids": filtered_effective_date,
        }

    def _collection(self, corpus_version_id: str):
        return self._collection_by_name(f"lcsp_legal_{corpus_version_id}")

    def _collection_by_name(self, collection_name: str):
        try:
            import chromadb
        except ImportError as error:
            raise RuntimeError("chromadb is required for legal retrieval") from error
        client = chromadb.PersistentClient(path=self._chroma_path)
        return client.get_or_create_collection(
            name=collection_name,
            embedding_function=None,
        )

    def _records(
        self, collection_name: str, chunk_ids: list[str]
    ) -> list[tuple[str, dict[str, Any]]]:
        if not chunk_ids:
            return []
        return self._records_for_collection(self._collection_by_name(collection_name), chunk_ids)

    def _records_for_collection(
        self, collection: Any, chunk_ids: list[str]
    ) -> list[tuple[str, dict[str, Any]]]:
        if not chunk_ids:
            return []
        result = collection.get(
            ids=chunk_ids, include=["metadatas"]
        )
        return [
            (str(chunk_id), metadata or {})
            for chunk_id, metadata in zip(
                result.get("ids") or [],
                result.get("metadatas") or [],
                strict=True,
            )
        ]

    def _to_chunks(
        self, records: list[tuple[str, dict[str, Any]]], role: str
    ) -> list[RetrievedChunk]:
        return [
            RetrievedChunk(
                id=chunk_id,
                document_id=str(metadata.get("document_id") or ""),
                locator=str(metadata.get("locator") or ""),
                legal_status=str(metadata.get("legal_status") or "ACTIVE"),
                role=role,
                source_effect_status=str(metadata.get("source_effect_status") or ""),
                effective_from=str(metadata.get("effective_from") or ""),
                effective_to=str(metadata.get("effective_to") or ""),
            )
            for chunk_id, metadata in records
        ]

    def _metadata_related_ids(self, metadata: dict[str, Any]) -> list[str]:
        raw = metadata.get("related_chunk_ids")
        if not isinstance(raw, str):
            return []
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            return []
        return [str(value) for value in parsed if str(value)] if isinstance(parsed, list) else []

    def _related_chunk_ids(self, hierarchy: dict[str, Any]) -> list[str]:
        values = [
            *(hierarchy.get("outgoingRefIds") or hierarchy.get("outgoing_ref_ids") or []),
            *(hierarchy.get("incomingRefIds") or hierarchy.get("incoming_ref_ids") or []),
        ]
        return self._unique(str(value) for value in values if str(value))

    def _unique(self, values: Any) -> list[str]:
        return list(dict.fromkeys(value for value in values if value))

    def _outside_default_effective_window(self, chunk: RetrievedChunk) -> bool:
        today = date.today().isoformat()
        if chunk.effective_from and chunk.effective_from > today:
            return True
        if chunk.effective_to and chunk.effective_to < today:
            return True
        return False
