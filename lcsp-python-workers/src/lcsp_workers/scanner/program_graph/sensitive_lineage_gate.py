"""Fail closed on weak sensitive-data semantics after lineage extraction.

Identifier taxonomy is intentionally retained as an INFERRED seed, but it is not enough
to promote a DATA_OBJECT to CORROBORATED biometric/identity-document processing. This
pass rechecks the source behavior composition that justified the promotion and removes
only the strong corroboration when the behavior is incomplete.
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


class SensitiveLineageGate:
    """Keep weak taxonomy hints inferred and promote only behavior-corroborated data."""

    def __init__(self, workspace_path: str | Path) -> None:
        self.workspace = Path(workspace_path).resolve(strict=False)

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        source_cache: dict[str, str] = {}
        replacements: list[SemanticNodeFact] = []
        for node in program.nodes:
            if node.node_type not in {"DATA_OBJECT", "DATA_ASSET"} or not node.file_path:
                replacements.append(node)
                continue
            attrs = dict(node.attributes or {})
            capabilities = set(attrs.get("corroboratedCapabilities") or attrs.get("capabilities") or [])
            if not capabilities:
                replacements.append(node)
                continue
            text = source_cache.get(node.file_path)
            if text is None:
                text = self._read(node.file_path)
                source_cache[node.file_path] = text

            allowed = set(capabilities)
            semantics = set(node.semantic_types)
            if "BIOMETRIC_PROCESSING" in allowed and not self._biometric_behavior(text):
                allowed.discard("BIOMETRIC_PROCESSING")
                # Preserve an identifier-derived taxonomy seed as INFERRED only when it
                # was present before behavior promotion. The graph must not describe it
                # as corroborated processing from one keyword occurrence.
                if "SENSITIVE.BIOMETRIC" in semantics:
                    resolution = "INFERRED"
                else:
                    resolution = node.resolution_state
            else:
                resolution = node.resolution_state

            if "IDENTITY_DOCUMENT_PROCESSING" in allowed and not self._identity_document_behavior(text):
                allowed.discard("IDENTITY_DOCUMENT_PROCESSING")
                if "PII.GOVERNMENT_ID" in semantics:
                    resolution = "INFERRED"

            attr_key = "corroboratedCapabilities" if "corroboratedCapabilities" in attrs else "capabilities"
            if allowed:
                attrs[attr_key] = sorted(allowed)
            else:
                attrs.pop(attr_key, None)

            if allowed == capabilities:
                replacements.append(node)
                continue
            replacements.append(
                replace(
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
