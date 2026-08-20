"""Fail closed on weak sensitive-data semantics after lineage extraction.

Identifier taxonomy is intentionally retained as an INFERRED seed, but it is not enough
to promote a value or downstream sink to trusted sensitive-data evidence. This pass
normalizes identifier-derived PII/SENSITIVE semantics to INFERRED and preserves a strong
CORROBORATED state only when explicit, local processing behavior and lineage support it.
"""
from __future__ import annotations

import re
from dataclasses import replace
from pathlib import Path

from .semantic_ir import SemanticNodeFact, SemanticProgram
from .source_roles import is_test_source_path

_VISUAL_BIOMETRIC = re.compile(
    r"face[_ .-]?(?:detect|recogn|encod|embed|feature)|rekognition|facenet|deepface|insightface|biometric",
    re.I,
)
_BIOMETRIC_REPRESENTATION = re.compile(
    r"embedding|encoding|feature[_ .-]?(?:vector|extract)|template",
    re.I,
)
_IDENTITY_MATCH = re.compile(
    r"compare|similarity|verify|verification|match|identify",
    re.I,
)
# Deliberately require a processing verb/capability next to the modality. Generic
# software/configuration terms such as fingerprintToken/latestFingerprint must not be
# interpreted as biometric processing.
_NON_VISUAL_BIOMETRIC = re.compile(
    r"finger(?:print)?[_ .-]?(?:scan|template|match|verify|recogn|feature|extract)|"
    r"voiceprint|speaker[_ .-]?(?:embed|verify|recogn)|"
    r"iris[_ .-]?(?:scan|match|verify|recogn|template)|"
    r"retina[_ .-]?(?:scan|match|verify|recogn|template)|"
    r"palm[_ .-]?(?:print|scan|match|verify|recogn|template)",
    re.I,
)
_OCR = re.compile(r"ocr|tesseract|textract|document[_ .-]?ai|vision[_ .-]?text", re.I)
_ID_DOCUMENT = re.compile(
    r"kyc|identity[_ .-]?(?:document|verification)|government[_ .-]?id|national[_ .-]?id|passport|mrz|document[_ .-]?(?:number|verify)",
    re.I,
)
_IDENTIFIER_CARRIER_TYPES = frozenset(
    {
        "PARAMETER",
        "VARIABLE",
        "PROPERTY",
        "DTO_FIELD",
        "DATA_OBJECT",
        "DATA_ASSET",
        "MEDIA_OBJECT",
    }
)
_LINEAGE_EDGE_TYPES = frozenset(
    {
        "FLOWS_TO",
        "CARRIES_DATA",
        "DECLARES_DATA",
        "DERIVES_FROM",
        "ENCODES",
        "DECODES",
        "PASSES_ARGUMENT",
        "RECEIVES_RETURN",
        "READS_FROM",
        "WRITES_TO",
        "PERSISTS_TO",
        "SENDS_TO_AI",
        "RECEIVES_FROM_AI",
        "SENDS_TO_EXTERNAL",
        "RECEIVES_FROM_EXTERNAL",
    }
)
_LOCAL_CONTEXT_RADIUS = 16


class SensitiveLineageGate:
    """Keep taxonomy hints inferred and promote only path-local corroborated data."""

    def __init__(self, workspace_path: str | Path) -> None:
        self.workspace = Path(workspace_path).resolve(strict=False)

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        source_cache: dict[str, str] = {}
        lineage_keys = self._lineage_keys(program)
        replacements: list[SemanticNodeFact] = []
        for node in program.nodes:
            if node.node_type not in _IDENTIFIER_CARRIER_TYPES:
                replacements.append(node)
                continue

            attrs = dict(node.attributes or {})
            semantics = set(node.semantic_types)
            sensitive_semantics = {
                value
                for value in semantics
                if value.startswith("PII.") or value.startswith("SENSITIVE.")
            }
            capabilities = set(
                attrs.get("corroboratedCapabilities")
                or attrs.get("capabilities")
                or []
            )

            # Identifier/contract taxonomy is a cheap seed only. Without an explicit
            # corroborated processing capability it must never become trusted merely
            # because the symbol/field happens to be named fingerprint/cccd/email/etc.
            resolution = node.resolution_state
            if sensitive_semantics and not capabilities and resolution != "UNRESOLVED":
                resolution = "INFERRED"

            if not capabilities or not node.file_path:
                replacements.append(
                    node
                    if resolution == node.resolution_state
                    else replace(node, resolution_state=resolution)
                )
                continue

            text = source_cache.get(node.file_path)
            if text is None:
                text = self._read(node.file_path)
                source_cache[node.file_path] = text
            local_text = self._local_context(text, node.start_line, node.end_line)

            # DATA_OBJECT/MEDIA_OBJECT facts must participate in an actual lineage edge.
            # Synthetic DATA_ASSET facts are allowed to stand on the local processor
            # behavior that created them because there may be no named carrier to link.
            lineage_supported = node.node_type == "DATA_ASSET" or node.key in lineage_keys
            allowed = set(capabilities) if lineage_supported else set()

            if "BIOMETRIC_PROCESSING" in allowed and not self._biometric_behavior(local_text):
                allowed.discard("BIOMETRIC_PROCESSING")
                if "SENSITIVE.BIOMETRIC" in semantics:
                    resolution = "INFERRED"
            if (
                "IDENTITY_DOCUMENT_PROCESSING" in allowed
                and not self._identity_document_behavior(local_text)
            ):
                allowed.discard("IDENTITY_DOCUMENT_PROCESSING")
                if "PII.GOVERNMENT_ID" in semantics:
                    resolution = "INFERRED"

            attr_key = (
                "corroboratedCapabilities"
                if "corroboratedCapabilities" in attrs
                else "capabilities"
            )
            if allowed:
                attrs[attr_key] = sorted(allowed)
                resolution = "CORROBORATED"
            else:
                attrs.pop("corroboratedCapabilities", None)
                attrs.pop("capabilities", None)
                if sensitive_semantics and resolution != "UNRESOLVED":
                    resolution = "INFERRED"

            replacements.append(
                node
                if attrs == node.attributes and resolution == node.resolution_state
                else replace(
                    node,
                    attributes=attrs,
                    resolution_state=resolution,
                )
            )
        program.nodes = replacements
        return program

    @staticmethod
    def _lineage_keys(program: SemanticProgram) -> set[str]:
        keys: set[str] = set()
        for edge in program.edges:
            if edge.edge_type not in _LINEAGE_EDGE_TYPES:
                continue
            keys.add(edge.source_key)
            keys.add(edge.target_key)
        return keys

    @staticmethod
    def _local_context(text: str, start_line: int | None, end_line: int | None) -> str:
        if not text:
            return ""
        if not start_line:
            return ""
        lines = text.splitlines()
        start = max(0, start_line - 1 - _LOCAL_CONTEXT_RADIUS)
        end_anchor = max(start_line, end_line or start_line)
        end = min(len(lines), end_anchor + _LOCAL_CONTEXT_RADIUS)
        return "\n".join(lines[start:end])

    @staticmethod
    def _biometric_behavior(text: str) -> bool:
        visual = bool(
            _VISUAL_BIOMETRIC.search(text)
            and _BIOMETRIC_REPRESENTATION.search(text)
            and _IDENTITY_MATCH.search(text)
        )
        non_visual = bool(
            _NON_VISUAL_BIOMETRIC.search(text)
            and (
                _BIOMETRIC_REPRESENTATION.search(text)
                or _IDENTITY_MATCH.search(text)
            )
        )
        return visual or non_visual

    @staticmethod
    def _identity_document_behavior(text: str) -> bool:
        return bool(_OCR.search(text) and _ID_DOCUMENT.search(text))

    def _read(self, relative: str) -> str:
        if is_test_source_path(relative):
            return ""
        path = (self.workspace / relative).resolve(strict=False)
        try:
            path.relative_to(self.workspace)
        except ValueError:
            return ""
        try:
            return path.read_text(encoding="utf-8", errors="replace")
        except OSError:
            return ""
