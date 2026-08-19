"""Fail closed on weak sensitive-data semantics after lineage extraction.

Identifier taxonomy is intentionally retained as an INFERRED seed, but it is not enough
to promote a value or downstream sink to trusted sensitive-data evidence. This pass
normalizes identifier-derived PII/SENSITIVE semantics to INFERRED and preserves a strong
CORROBORATED state only when explicit processing behavior supports it.
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
    r"compare|similarity|verify|verification|match|identify|identity",
    re.I,
)
_NON_VISUAL_BIOMETRIC = re.compile(
    r"fingerprint|finger[_ .-]?print|voiceprint|speaker[_ .-]?(?:embed|verify|recogn)|iris|retina|palm[_ .-]?print",
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


class SensitiveLineageGate:
    """Keep taxonomy hints inferred and promote only behavior-corroborated data."""

    def __init__(self, workspace_path: str | Path) -> None:
        self.workspace = Path(workspace_path).resolve(strict=False)

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        source_cache: dict[str, str] = {}
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

            allowed = set(capabilities)
            if "BIOMETRIC_PROCESSING" in allowed and not self._biometric_behavior(text):
                allowed.discard("BIOMETRIC_PROCESSING")
                if "SENSITIVE.BIOMETRIC" in semantics:
                    resolution = "INFERRED"
            if (
                "IDENTITY_DOCUMENT_PROCESSING" in allowed
                and not self._identity_document_behavior(text)
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
                attrs.pop(attr_key, None)

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
