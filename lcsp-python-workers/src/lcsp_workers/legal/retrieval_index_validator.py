from __future__ import annotations

import json
from dataclasses import dataclass
from hashlib import sha256
from pathlib import Path
from typing import Any, Protocol

from .chromadb_citation_retriever import ChromaDbCitationRetriever, RetrievedChunk
from .legal_chunk_repository import LegalChunkRepository
from .legal_retrieval_index_repository import (
    LegalRetrievalIndexRecord,
    LegalRetrievalIndexRepository,
)
from .official_text_extraction import _sha256_bytes
from .retrieval_validation_repository import (
    RetrievalValidationRecord,
    RetrievalValidationRepository,
)

LEGAL_RETRIEVAL_VALIDATION_TOOL = {
    "name": "validate_retrieval_index",
    "version": "1.0.0",
    "config_hash": "sha256:retrieval-validation-v1",
}

LEGAL_RETRIEVAL_PROBE_SETS = {
    "default": "LEGAL_RETRIEVAL_PROBES_V1",
}

LEGAL_RETRIEVAL_VALIDATION_STATUSES = {
    "ready": "READY",
    "needs_input": "NEEDS_INPUT",
    "conflict": "CONFLICT",
    "blocked": "BLOCKED",
    "failed": "FAILED",
}

LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES = {
    "sufficient": "SUFFICIENT",
    "partial": "PARTIAL",
    "unavailable": "UNAVAILABLE",
}

LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES = {
    "index_ref_missing": "INDEX_REF_MISSING",
    "chunk_set_missing": "CHUNK_SET_MISSING",
    "probe_set_unsupported": "PROBE_SET_UNSUPPORTED",
    "index_chunk_set_mismatch": "INDEX_CHUNK_SET_MISMATCH",
    "index_artifact_missing": "INDEX_ARTIFACT_MISSING",
    "index_checksum_mismatch": "INDEX_CHECKSUM_MISMATCH",
    "retrieval_backend_failed": "RETRIEVAL_BACKEND_FAILED",
    "exact_id_missing": "EXACT_ID_MISSING",
    "parent_context_missing": "PARENT_CONTEXT_MISSING",
    "xref_context_missing": "XREF_CONTEXT_MISSING",
    "effect_filter_failed": "EFFECT_FILTER_FAILED",
}

_DEFAULT_EXCLUDED_SOURCE_EFFECT_STATUSES = {
    "NGUNG_HIEU_LUC",
    "HET_HIEU_LUC_TOAN_BO",
    "KHONG_CON_PHU_HOP",
}


class RetrievalProbeRunner(Protocol):
    def retrieve_exact_from_collection_name(
        self, *, collection_name: str, chunk_ids: list[str]
    ) -> list[RetrievedChunk]:
        ...

    def build_citation_allowlist(self, chunks: list[RetrievedChunk]) -> dict[str, Any]:
        ...


@dataclass(frozen=True)
class ValidateRetrievalIndexRequest:
    index_ref: str
    chunk_set_ref: str
    probe_set_version: str


@dataclass(frozen=True)
class RetrievalIndexValidationResult:
    status: str
    validation_manifest_ref: str
    validation_id: str
    provenance_ref: str
    index_ref: str
    chunk_set_ref: str
    probe_set_version: str
    coverage_state: str
    decision: str
    probe_summary: dict[str, int]
    finding_refs: list[str]
    evidence_refs: list[str]
    limitations: list[dict[str, Any]]
    manifest_path: Path
    findings_path: Path

    def to_tool_response(self, *, correlation_id: str) -> dict[str, Any]:
        return {
            "status": self.status,
            "toolName": LEGAL_RETRIEVAL_VALIDATION_TOOL["name"],
            "toolVersion": LEGAL_RETRIEVAL_VALIDATION_TOOL["version"],
            "configHash": LEGAL_RETRIEVAL_VALIDATION_TOOL["config_hash"],
            "correlationId": correlation_id,
            "artifactVersions": {
                "indexId": self.index_ref.split(":", 1)[1],
                "retrievalValidationId": self.validation_id,
            },
            "provenanceRef": self.provenance_ref,
            "coverageState": self.coverage_state,
            "evidenceRefs": self.evidence_refs,
            "limitations": self.limitations,
            "result": {
                "validationManifestRef": self.validation_manifest_ref,
                "decision": self.decision,
                "probeSummary": self.probe_summary,
                "findingRefs": self.finding_refs,
            },
        }

    def to_record(self) -> RetrievalValidationRecord:
        return RetrievalValidationRecord(
            validation_manifest_ref=self.validation_manifest_ref,
            provenance_ref=self.provenance_ref,
            index_ref=self.index_ref,
            chunk_set_ref=self.chunk_set_ref,
            probe_set_version=self.probe_set_version,
            status=self.status,
            coverage_state=self.coverage_state,
            decision=self.decision,
            probe_summary=self.probe_summary,
            finding_refs=self.finding_refs,
            evidence_refs=self.evidence_refs,
            limitations=self.limitations,
            manifest_path=str(self.manifest_path),
            findings_path=str(self.findings_path),
        )


class RetrievalIndexValidator:
    def __init__(
        self,
        *,
        storage_root: Path,
        index_repository: LegalRetrievalIndexRepository,
        chunk_repository: LegalChunkRepository,
        validation_repository: RetrievalValidationRepository | None = None,
        probe_runner: RetrievalProbeRunner | None = None,
    ) -> None:
        self._storage_root = storage_root
        self._index_repository = index_repository
        self._chunk_repository = chunk_repository
        self._validation_repository = validation_repository or RetrievalValidationRepository(
            storage_root=storage_root
        )
        self._probe_runner = probe_runner or ChromaDbCitationRetriever(
            chroma_path=str(storage_root / "chroma")
        )

    def validate(
        self, request: ValidateRetrievalIndexRequest
    ) -> RetrievalIndexValidationResult:
        probe_set_version = self._normalize_probe_set(request.probe_set_version)
        validation_id = _validation_id(
            index_ref=request.index_ref,
            chunk_set_ref=request.chunk_set_ref,
            probe_set_version=probe_set_version,
        )
        validation_manifest_ref = f"retrieval-validation:{validation_id}"
        provenance_ref = f"prov:index-validate:{validation_id}"

        existing = self._validation_repository.get_by_validation_manifest_ref(
            validation_manifest_ref
        )
        if existing is not None:
            return self._result_from_record(existing)

        index_record = self._index_repository.get_by_index_ref(request.index_ref)
        if index_record is None:
            return self._problem_result(
                status=LEGAL_RETRIEVAL_VALIDATION_STATUSES["needs_input"],
                coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["partial"],
                validation_id=validation_id,
                validation_manifest_ref=validation_manifest_ref,
                provenance_ref=provenance_ref,
                request=request,
                code=LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["index_ref_missing"],
                reason="legal retrieval index record was not found",
            )
        if index_record.chunk_set_ref != request.chunk_set_ref:
            return self._problem_result(
                status=LEGAL_RETRIEVAL_VALIDATION_STATUSES["blocked"],
                coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["unavailable"],
                validation_id=validation_id,
                validation_manifest_ref=validation_manifest_ref,
                provenance_ref=provenance_ref,
                request=request,
                code=LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["index_chunk_set_mismatch"],
                reason="index record does not belong to the requested chunk set",
                evidence_refs=[request.index_ref],
            )
        if self._chunk_repository.get_by_chunk_set_ref(request.chunk_set_ref) is None:
            return self._problem_result(
                status=LEGAL_RETRIEVAL_VALIDATION_STATUSES["needs_input"],
                coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["partial"],
                validation_id=validation_id,
                validation_manifest_ref=validation_manifest_ref,
                provenance_ref=provenance_ref,
                request=request,
                code=LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["chunk_set_missing"],
                reason="chunk set record was not found",
                evidence_refs=[request.index_ref],
            )

        records_path = Path(index_record.records_path)
        if not records_path.is_file():
            return self._problem_result(
                status=LEGAL_RETRIEVAL_VALIDATION_STATUSES["needs_input"],
                coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["partial"],
                validation_id=validation_id,
                validation_manifest_ref=validation_manifest_ref,
                provenance_ref=provenance_ref,
                request=request,
                code=LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["index_artifact_missing"],
                reason="index records artifact is missing from storage",
                evidence_refs=[request.index_ref],
            )
        records_text = records_path.read_text(encoding="utf-8")
        if _sha256_bytes(records_text.encode("utf-8")) != index_record.index_checksum:
            return self._problem_result(
                status=LEGAL_RETRIEVAL_VALIDATION_STATUSES["blocked"],
                coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["unavailable"],
                validation_id=validation_id,
                validation_manifest_ref=validation_manifest_ref,
                provenance_ref=provenance_ref,
                request=request,
                code=LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["index_checksum_mismatch"],
                reason="index records artifact checksum does not match immutable registry",
                evidence_refs=[request.index_ref],
            )
        raw_records = json.loads(records_text)
        if not isinstance(raw_records, list):
            raise RuntimeError("legal index records artifact must be a JSON list")
        records = [item for item in raw_records if isinstance(item, dict)]

        try:
            findings, probe_summary, retrieved_chunks = self._run_probes(
                index_record=index_record,
                records=records,
            )
        except Exception as exc:
            return self._problem_result(
                status=LEGAL_RETRIEVAL_VALIDATION_STATUSES["failed"],
                coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["unavailable"],
                validation_id=validation_id,
                validation_manifest_ref=validation_manifest_ref,
                provenance_ref=provenance_ref,
                request=request,
                code=LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["retrieval_backend_failed"],
                reason=str(exc),
                evidence_refs=[request.index_ref],
            )

        output_dir = self._storage_root / "retrieval-validations" / validation_id
        output_dir.mkdir(parents=True, exist_ok=True)
        findings_path = output_dir / "findings.json"
        manifest_path = output_dir / "manifest.json"

        finding_refs = [
            f"{validation_manifest_ref}:finding:{index + 1}"
            for index in range(len(findings))
        ]
        findings_payload = [
            {
                "findingRef": finding_ref,
                "code": finding["code"],
                "message": finding["message"],
                "expectedRefs": finding.get("expectedRefs", []),
                "actualRefs": finding.get("actualRefs", []),
                "probe": finding["probe"],
            }
            for finding_ref, finding in zip(finding_refs, findings, strict=True)
        ]
        findings_path.write_text(
            json.dumps(findings_payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        status = (
            LEGAL_RETRIEVAL_VALIDATION_STATUSES["ready"]
            if not findings
            else LEGAL_RETRIEVAL_VALIDATION_STATUSES["conflict"]
        )
        decision = "PASS" if not findings else "FAIL"
        manifest_payload = {
            "validationManifestRef": validation_manifest_ref,
            "provenanceRef": provenance_ref,
            "indexRef": request.index_ref,
            "chunkSetRef": request.chunk_set_ref,
            "probeSetVersion": probe_set_version,
            "status": status,
            "coverageState": LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["sufficient"],
            "decision": decision,
            "probeSummary": probe_summary,
            "findingCount": len(finding_refs),
            "checkedRules": [
                "EXACT_ID",
                "PARENT_CONTEXT",
                "XREF_CONTEXT",
                "EFFECT_FILTER",
            ],
            "collectionName": index_record.collection_name,
            "limitations": [],
            "retrievedChunkCount": len(retrieved_chunks),
            "findingsFile": findings_path.name,
        }
        manifest_path.write_text(
            json.dumps(manifest_payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

        return RetrievalIndexValidationResult(
            status=status,
            validation_manifest_ref=validation_manifest_ref,
            validation_id=validation_id,
            provenance_ref=provenance_ref,
            index_ref=request.index_ref,
            chunk_set_ref=request.chunk_set_ref,
            probe_set_version=probe_set_version,
            coverage_state=LEGAL_RETRIEVAL_VALIDATION_COVERAGE_STATES["sufficient"],
            decision=decision,
            probe_summary=probe_summary,
            finding_refs=finding_refs,
            evidence_refs=[validation_manifest_ref, request.index_ref],
            limitations=[],
            manifest_path=manifest_path,
            findings_path=findings_path,
        )

    def _normalize_probe_set(self, probe_set_version: str) -> str:
        normalized = probe_set_version.strip().upper()
        if normalized != LEGAL_RETRIEVAL_PROBE_SETS["default"]:
            raise ValueError("unsupported probe set version")
        return normalized

    def _run_probes(
        self,
        *,
        index_record: LegalRetrievalIndexRecord,
        records: list[dict[str, Any]],
    ) -> tuple[list[dict[str, Any]], dict[str, int], list[RetrievedChunk]]:
        expected_primary_ids = self._select_primary_probe_ids(records)
        retrieved_chunks = self._probe_runner.retrieve_exact_from_collection_name(
            collection_name=index_record.collection_name,
            chunk_ids=expected_primary_ids,
        )
        findings: list[dict[str, Any]] = []
        by_role: dict[str, set[str]] = {
            "PRIMARY_MATCH": {item.id for item in retrieved_chunks if item.role == "PRIMARY_MATCH"},
            "PARENT_CONTEXT": {item.id for item in retrieved_chunks if item.role == "PARENT_CONTEXT"},
            "REFERENCED_CONTEXT": {
                item.id for item in retrieved_chunks if item.role == "REFERENCED_CONTEXT"
            },
        }

        missing_primary = sorted(set(expected_primary_ids) - by_role["PRIMARY_MATCH"])
        if missing_primary:
            findings.append(
                {
                    "probe": "EXACT_ID",
                    "code": LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["exact_id_missing"],
                    "message": "retrieval index did not return every expected stable chunk ID",
                    "expectedRefs": expected_primary_ids,
                    "actualRefs": sorted(by_role["PRIMARY_MATCH"]),
                }
            )

        selected_records = [
            record for record in records if str(record.get("id") or "") in set(expected_primary_ids)
        ]
        expected_parents = sorted(
            {
                str((record.get("metadata") or {}).get("parent_chunk_id") or "")
                for record in selected_records
                if str((record.get("metadata") or {}).get("parent_chunk_id") or "")
            }
        )
        missing_parents = sorted(set(expected_parents) - by_role["PARENT_CONTEXT"])
        if missing_parents:
            findings.append(
                {
                    "probe": "PARENT_CONTEXT",
                    "code": LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["parent_context_missing"],
                    "message": "retrieval index did not return every expected parent context chunk",
                    "expectedRefs": expected_parents,
                    "actualRefs": sorted(by_role["PARENT_CONTEXT"]),
                }
            )

        expected_xrefs = sorted(
            self._expected_xref_ids(
                selected_records=selected_records,
                all_records=records,
                primary_ids=set(expected_primary_ids),
            )
        )
        missing_xrefs = sorted(set(expected_xrefs) - by_role["REFERENCED_CONTEXT"])
        if missing_xrefs:
            findings.append(
                {
                    "probe": "XREF_CONTEXT",
                    "code": LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["xref_context_missing"],
                    "message": "retrieval index did not return every expected one-hop xref context chunk",
                    "expectedRefs": expected_xrefs,
                    "actualRefs": sorted(by_role["REFERENCED_CONTEXT"]),
                }
            )

        allowlist = self._probe_runner.build_citation_allowlist(retrieved_chunks)
        expected_filtered = sorted(self._expected_filtered_ids(selected_records))
        allowlist_ids = set(str(value) for value in allowlist.get("allowlist", []))
        leaked_filtered = sorted(value for value in expected_filtered if value in allowlist_ids)
        if leaked_filtered:
            findings.append(
                {
                    "probe": "EFFECT_FILTER",
                    "code": LEGAL_RETRIEVAL_VALIDATION_LIMITATION_CODES["effect_filter_failed"],
                    "message": "citation allowlist leaked repealed or excluded effect-status chunks",
                    "expectedRefs": expected_filtered,
                    "actualRefs": leaked_filtered,
                }
            )

        probe_summary = {
            "exactId": len(expected_primary_ids),
            "parentContext": len(expected_parents),
            "xrefContext": len(expected_xrefs),
            "effectFilter": len(expected_filtered),
        }
        return findings, probe_summary, retrieved_chunks

    def _select_primary_probe_ids(self, records: list[dict[str, Any]]) -> list[str]:
        selected: list[str] = []
        for record in records:
            record_id = str(record.get("id") or "")
            metadata = record.get("metadata") or {}
            if not record_id:
                continue
            if (
                str(metadata.get("parent_chunk_id") or "")
                or self._has_xref(metadata)
                or self._should_be_filtered(metadata)
            ):
                selected.append(record_id)
        if selected:
            return list(dict.fromkeys(selected))
        return [
            str(record.get("id") or "")
            for record in records
            if str(record.get("id") or "")
        ]

    def _expected_xref_ids(
        self,
        *,
        selected_records: list[dict[str, Any]],
        all_records: list[dict[str, Any]],
        primary_ids: set[str],
    ) -> set[str]:
        known_ids = {
            str(record.get("id") or "")
            for record in all_records
            if str(record.get("id") or "")
        }
        expected: set[str] = set()
        for record in selected_records:
            metadata = record.get("metadata") or {}
            for field in ("outgoing_ref_ids", "incoming_ref_ids"):
                raw = metadata.get(field)
                if not isinstance(raw, str) or not raw:
                    continue
                try:
                    parsed = json.loads(raw)
                except json.JSONDecodeError:
                    continue
                if not isinstance(parsed, list):
                    continue
                for value in parsed:
                    item = str(value or "")
                    if item and item in known_ids and item not in primary_ids:
                        expected.add(item)
        return expected

    def _expected_filtered_ids(self, records: list[dict[str, Any]]) -> set[str]:
        expected: set[str] = set()
        for record in records:
            record_id = str(record.get("id") or "")
            metadata = record.get("metadata") or {}
            if self._should_be_filtered(metadata):
                expected.add(record_id)
        return {value for value in expected if value}

    def _has_xref(self, metadata: dict[str, Any]) -> bool:
        for field in ("outgoing_ref_ids", "incoming_ref_ids"):
            raw = metadata.get(field)
            if not isinstance(raw, str) or not raw:
                continue
            try:
                parsed = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if isinstance(parsed, list) and any(str(value) for value in parsed):
                return True
        return False

    def _should_be_filtered(self, metadata: dict[str, Any]) -> bool:
        return str(metadata.get("legal_status") or "ACTIVE") == "REPEALED" or str(
            metadata.get("source_effect_status") or ""
        ) in _DEFAULT_EXCLUDED_SOURCE_EFFECT_STATUSES

    def _problem_result(
        self,
        *,
        status: str,
        coverage_state: str,
        validation_id: str,
        validation_manifest_ref: str,
        provenance_ref: str,
        request: ValidateRetrievalIndexRequest,
        code: str,
        reason: str,
        evidence_refs: list[str] | None = None,
    ) -> RetrievalIndexValidationResult:
        output_dir = self._storage_root / "retrieval-validations" / validation_id
        output_dir.mkdir(parents=True, exist_ok=True)
        manifest_path = output_dir / "manifest.json"
        findings_path = output_dir / "findings.json"
        findings_path.write_text("[]\n", encoding="utf-8")
        limitation = {
            "code": code,
            "affectedScopeRef": request.index_ref,
            "reason": reason,
            "retryable": False,
        }
        manifest_path.write_text(
            json.dumps(
                {
                    "validationManifestRef": validation_manifest_ref,
                    "provenanceRef": provenance_ref,
                    "indexRef": request.index_ref,
                    "chunkSetRef": request.chunk_set_ref,
                    "probeSetVersion": request.probe_set_version,
                    "status": status,
                    "coverageState": coverage_state,
                    "decision": "FAIL",
                    "probeSummary": {
                        "exactId": 0,
                        "parentContext": 0,
                        "xrefContext": 0,
                        "effectFilter": 0,
                    },
                    "limitations": [limitation],
                    "findingsFile": findings_path.name,
                },
                ensure_ascii=False,
                indent=2,
            )
            + "\n",
            encoding="utf-8",
        )
        return RetrievalIndexValidationResult(
            status=status,
            validation_manifest_ref=validation_manifest_ref,
            validation_id=validation_id,
            provenance_ref=provenance_ref,
            index_ref=request.index_ref,
            chunk_set_ref=request.chunk_set_ref,
            probe_set_version=request.probe_set_version,
            coverage_state=coverage_state,
            decision="FAIL",
            probe_summary={
                "exactId": 0,
                "parentContext": 0,
                "xrefContext": 0,
                "effectFilter": 0,
            },
            finding_refs=[],
            evidence_refs=evidence_refs or [],
            limitations=[limitation],
            manifest_path=manifest_path,
            findings_path=findings_path,
        )

    def _result_from_record(
        self, record: RetrievalValidationRecord
    ) -> RetrievalIndexValidationResult:
        return RetrievalIndexValidationResult(
            status=record.status,
            validation_manifest_ref=record.validation_manifest_ref,
            validation_id=record.validation_manifest_ref.split(":", 1)[1],
            provenance_ref=record.provenance_ref,
            index_ref=record.index_ref,
            chunk_set_ref=record.chunk_set_ref,
            probe_set_version=record.probe_set_version,
            coverage_state=record.coverage_state,
            decision=record.decision,
            probe_summary=record.probe_summary,
            finding_refs=record.finding_refs,
            evidence_refs=record.evidence_refs,
            limitations=record.limitations,
            manifest_path=Path(record.manifest_path),
            findings_path=Path(record.findings_path),
        )


def _validation_id(*, index_ref: str, chunk_set_ref: str, probe_set_version: str) -> str:
    return sha256(
        f"{index_ref}|{chunk_set_ref}|{probe_set_version}".encode("utf-8")
    ).hexdigest()[:24]
