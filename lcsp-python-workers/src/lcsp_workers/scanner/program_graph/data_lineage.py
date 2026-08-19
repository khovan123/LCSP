"""Build first-class semantic data lineage without trusting identifier names alone.

The base repository extractor owns language syntax. This pass consumes its Semantic IR
and adds stable DATA_OBJECT flow identities around values, calls, AI invocations and
framework boundaries. It also reads protocol contracts (currently protobuf) and uses
bounded behavior corroboration for biometric/identity-document semantics.

Identifier taxonomy remains a weak seed. Corroborated sensitive-data semantics require
processing behavior and lineage evidence; generic names such as ``payload`` or ``x`` do
not prevent the flow from being represented.
"""
from __future__ import annotations

import re
from pathlib import Path

from .semantic_ir import SemanticEdgeFact, SemanticNodeFact, SemanticProgram
from .sensitive_data import semantic_types_for_identifier
from .source_roles import is_test_source_path

_EXCLUDED = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
    "target",
    "bin",
    "obj",
}
_DATA_CARRIER_TYPES = frozenset(
    {
        "PARAMETER",
        "RETURN_VALUE",
        "VARIABLE",
        "PROPERTY",
        "DTO_FIELD",
        "AI_INPUT",
        "AI_OUTPUT",
        "PERSONAL_DATA",
        "SENSITIVE_DATA",
        "MEDIA_OBJECT",
    }
)
_DERIVATION_EDGES = frozenset(
    {
        "ALIASES",
        "ASSIGNS",
        "MAPS_TO",
        "PARSES",
        "SERIALIZES",
        "DESERIALIZES",
        "CASTS_TO",
        "TRANSFORMS",
        "VALIDATES",
        "SANITIZES",
        "READS_PROPERTY",
        "WRITES_PROPERTY",
    }
)
_BOUNDARY_PUBLISH_EDGES = frozenset(
    {
        "PUBLISHES_EVENT",
        "PUBLISHES_TO_QUEUE",
        "PUBLISHES_COMMAND",
        "PUBLISHES_QUERY",
    }
)
_BOUNDARY_CONSUME_EDGES = frozenset(
    {
        "CONSUMES_EVENT",
        "CONSUMES_FROM_QUEUE",
        "HANDLES_COMMAND",
        "HANDLES_QUERY",
    }
)
_BOUNDARY_TYPES = frozenset({"EVENT", "QUEUE", "COMMAND", "QUERY", "PROTOCOL_MESSAGE"})

_PROTO_MESSAGE_RE = re.compile(r"\bmessage\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{(.*?)\}", re.S)
_PROTO_FIELD_RE = re.compile(
    r"(?m)^\s*(?:repeated\s+|optional\s+)?([.A-Za-z_][\w.]*)\s+([A-Za-z_][\w]*)\s*=\s*\d+\s*;"
)
_PROTO_RPC_RE = re.compile(
    r"\brpc\s+([A-Za-z_][\w]*)\s*\(\s*(?:stream\s+)?([.A-Za-z_][\w.]*)\s*\)\s*returns\s*\(\s*(?:stream\s+)?([.A-Za-z_][\w.]*)\s*\)"
)

# Behavior signals deliberately require composition. A generic image, OCR call or
# embedding call alone is not enough to close a sensitive-data semantic.
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
_FINGERPRINT_OR_VOICE = re.compile(
    r"fingerprint|finger[_ .-]?print|voiceprint|speaker[_ .-]?(?:embed|verify|recogn)|iris|retina|palm[_ .-]?print",
    re.I,
)
_OCR = re.compile(r"ocr|tesseract|textract|document[_ .-]?ai|vision[_ .-]?text", re.I)
_ID_DOCUMENT = re.compile(
    r"kyc|identity[_ .-]?(?:document|verification)|government[_ .-]?id|national[_ .-]?id|passport|mrz|document[_ .-]?(?:number|verify)",
    re.I,
)


class SemanticDataLineageExtractor:
    """Enrich Semantic IR with lineage identities and protocol/behavior evidence."""

    def __init__(self, workspace_path: str | Path) -> None:
        self.workspace = Path(workspace_path).resolve(strict=False)

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        self._materialize_data_objects(program)
        self._link_value_flow(program)
        self._link_framework_boundary_payloads(program)
        self._link_ai_inputs_outputs(program)
        self._extract_protobuf_contracts(program)
        self._corroborate_sensitive_processing(program)
        return program

    def _materialize_data_objects(self, program: SemanticProgram) -> None:
        for node in tuple(program.nodes):
            if node.node_type not in _DATA_CARRIER_TYPES:
                continue
            key = self._data_key(node.key)
            semantic_types = tuple(sorted(set(node.semantic_types)))
            state = "INFERRED" if semantic_types else "OBSERVED"
            program.add_node(
                SemanticNodeFact(
                    key,
                    "DATA_OBJECT",
                    node.label,
                    node.file_path,
                    node.start_line,
                    node.end_line,
                    node.symbol_ref,
                    attributes={"sourceNodeType": node.node_type},
                    semantic_types=semantic_types,
                    evidence_refs=node.evidence_refs,
                    origin="DATA_LINEAGE",
                    resolution_state=state,
                )
            )
            program.add_edge(
                SemanticEdgeFact(
                    "CARRIES_DATA",
                    node.key,
                    key,
                    origin="DATA_LINEAGE",
                    resolution_state="OBSERVED",
                )
            )

    def _link_value_flow(self, program: SemanticProgram) -> None:
        node_by_key = {node.key: node for node in program.nodes}
        carrier_keys = {
            node.key
            for node in program.nodes
            if node.node_type in _DATA_CARRIER_TYPES
        }
        for edge in tuple(program.edges):
            source = node_by_key.get(edge.source_key)
            target = node_by_key.get(edge.target_key)
            if not source or not target:
                continue
            if edge.edge_type in _DERIVATION_EDGES:
                if edge.source_key in carrier_keys and edge.target_key in carrier_keys:
                    program.add_edge(
                        SemanticEdgeFact(
                            "FLOWS_TO",
                            self._data_key(edge.source_key),
                            self._data_key(edge.target_key),
                            confidence=edge.confidence,
                            origin="DATA_LINEAGE",
                            resolution_state="CORROBORATED",
                        )
                    )
            elif edge.edge_type == "PASSES_ARGUMENT" and edge.source_key in carrier_keys:
                program.add_edge(
                    SemanticEdgeFact(
                        "FLOWS_TO",
                        self._data_key(edge.source_key),
                        edge.target_key,
                        confidence=edge.confidence,
                        origin="DATA_LINEAGE",
                        resolution_state="OBSERVED",
                    )
                )
            elif edge.edge_type == "RECEIVES_RETURN" and edge.target_key in carrier_keys:
                program.add_edge(
                    SemanticEdgeFact(
                        "FLOWS_TO",
                        edge.source_key,
                        self._data_key(edge.target_key),
                        confidence=edge.confidence,
                        origin="DATA_LINEAGE",
                        resolution_state="OBSERVED",
                    )
                )

    def _link_framework_boundary_payloads(self, program: SemanticProgram) -> None:
        node_by_key = {node.key: node for node in program.nodes}
        incoming_by_call: dict[str, list[str]] = {}
        for edge in program.edges:
            if edge.edge_type == "FLOWS_TO" and edge.source_key.startswith("data-object:"):
                incoming_by_call.setdefault(edge.target_key, []).append(edge.source_key)

        boundary_data: dict[str, str] = {}
        for edge in tuple(program.edges):
            if edge.edge_type not in _BOUNDARY_PUBLISH_EDGES:
                continue
            boundary = node_by_key.get(edge.target_key)
            if not boundary or boundary.node_type not in _BOUNDARY_TYPES:
                continue
            data_key = boundary_data.setdefault(
                boundary.key, f"data-object:boundary:{boundary.key}"
            )
            program.add_node(
                SemanticNodeFact(
                    data_key,
                    "DATA_OBJECT",
                    f"{boundary.node_type.lower()} payload",
                    boundary.file_path,
                    boundary.start_line,
                    boundary.end_line,
                    attributes={
                        "boundaryType": boundary.node_type,
                        "boundaryIdentity": boundary.label,
                    },
                    origin="DATA_LINEAGE",
                    resolution_state="OBSERVED",
                )
            )
            program.add_edge(
                SemanticEdgeFact(
                    "CARRIES_DATA",
                    boundary.key,
                    data_key,
                    origin="DATA_LINEAGE",
                )
            )
            for source_data in incoming_by_call.get(edge.source_key, []):
                program.add_edge(
                    SemanticEdgeFact(
                        "FLOWS_TO",
                        source_data,
                        data_key,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )

        for edge in tuple(program.edges):
            if edge.edge_type not in _BOUNDARY_CONSUME_EDGES:
                continue
            boundary = node_by_key.get(edge.source_key)
            if not boundary or boundary.node_type not in _BOUNDARY_TYPES:
                continue
            data_key = boundary_data.get(boundary.key) or f"data-object:boundary:{boundary.key}"
            if boundary.key not in boundary_data:
                program.add_node(
                    SemanticNodeFact(
                        data_key,
                        "DATA_OBJECT",
                        f"{boundary.node_type.lower()} payload",
                        boundary.file_path,
                        boundary.start_line,
                        boundary.end_line,
                        attributes={
                            "boundaryType": boundary.node_type,
                            "boundaryIdentity": boundary.label,
                        },
                        origin="DATA_LINEAGE",
                        resolution_state="OBSERVED",
                    )
                )
                program.add_edge(
                    SemanticEdgeFact(
                        "CARRIES_DATA",
                        boundary.key,
                        data_key,
                        origin="DATA_LINEAGE",
                    )
                )
                boundary_data[boundary.key] = data_key
            program.add_edge(
                SemanticEdgeFact(
                    "FLOWS_TO",
                    data_key,
                    edge.target_key,
                    origin="DATA_LINEAGE",
                    resolution_state="CORROBORATED",
                )
            )

    def _link_ai_inputs_outputs(self, program: SemanticProgram) -> None:
        node_by_key = {node.key: node for node in program.nodes}
        edges = tuple(program.edges)
        for ai in tuple(program.nodes):
            if ai.node_type != "AI_MODEL_INVOCATION":
                continue
            input_key = f"ai-input:{ai.key}"
            output_key = f"ai-output:{ai.key}"
            input_sources = [
                edge.source_key
                for edge in edges
                if edge.edge_type == "FLOWS_TO"
                and edge.target_key == ai.key
                and edge.source_key.startswith("data-object:")
            ]
            output_targets = [
                edge.target_key
                for edge in edges
                if edge.edge_type == "FLOWS_TO"
                and edge.source_key == ai.key
                and edge.target_key.startswith("data-object:")
            ]
            if input_sources:
                program.add_node(
                    SemanticNodeFact(
                        input_key,
                        "AI_INPUT",
                        f"input to {ai.label}",
                        ai.file_path,
                        ai.start_line,
                        ai.end_line,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )
                for source_key in input_sources:
                    program.add_edge(
                        SemanticEdgeFact(
                            "FLOWS_TO",
                            source_key,
                            input_key,
                            origin="DATA_LINEAGE",
                            resolution_state="CORROBORATED",
                        )
                    )
                program.add_edge(
                    SemanticEdgeFact(
                        "SENDS_TO_AI",
                        input_key,
                        ai.key,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )
            if output_targets:
                program.add_node(
                    SemanticNodeFact(
                        output_key,
                        "AI_OUTPUT",
                        f"output from {ai.label}",
                        ai.file_path,
                        ai.start_line,
                        ai.end_line,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )
                program.add_edge(
                    SemanticEdgeFact(
                        "RECEIVES_FROM_AI",
                        ai.key,
                        output_key,
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )
                for target_key in output_targets:
                    program.add_edge(
                        SemanticEdgeFact(
                            "FLOWS_TO",
                            output_key,
                            target_key,
                            origin="DATA_LINEAGE",
                            resolution_state="CORROBORATED",
                        )
                    )

    def _extract_protobuf_contracts(self, program: SemanticProgram) -> None:
        for path in self._files({".proto"}):
            rel = path.relative_to(self.workspace).as_posix()
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            contract_key = f"data-contract:proto:{rel}"
            program.add_node(
                SemanticNodeFact(
                    contract_key,
                    "DATA_CONTRACT",
                    rel,
                    rel,
                    1,
                    1,
                    attributes={"protocol": "GRPC_PROTOBUF"},
                    origin="CONTRACT_ANALYSIS",
                )
            )
            message_keys: dict[str, str] = {}
            for match in _PROTO_MESSAGE_RE.finditer(text):
                name, body = match.groups()
                line = _line(text, match.start())
                message_key = f"protocol-message:{rel}:{name}"
                message_keys[name] = message_key
                program.add_node(
                    SemanticNodeFact(
                        message_key,
                        "PROTOCOL_MESSAGE",
                        name,
                        rel,
                        line,
                        line,
                        name,
                        attributes={"protocol": "GRPC_PROTOBUF"},
                        origin="CONTRACT_ANALYSIS",
                    )
                )
                program.add_edge(
                    SemanticEdgeFact(
                        "DECLARES",
                        contract_key,
                        message_key,
                        origin="CONTRACT_ANALYSIS",
                    )
                )
                for field_match in _PROTO_FIELD_RE.finditer(body):
                    field_type, field_name = field_match.groups()
                    field_line = line + body.count("\n", 0, field_match.start())
                    semantic_types = semantic_types_for_identifier(field_name)
                    data_key = f"data-object:proto:{rel}:{name}:{field_name}"
                    program.add_node(
                        SemanticNodeFact(
                            data_key,
                            "DATA_OBJECT",
                            f"{name}.{field_name}",
                            rel,
                            field_line,
                            field_line,
                            f"{name}.{field_name}",
                            attributes={
                                "protocol": "GRPC_PROTOBUF",
                                "fieldType": field_type,
                            },
                            semantic_types=semantic_types,
                            origin="CONTRACT_ANALYSIS",
                            resolution_state=(
                                "INFERRED" if semantic_types else "OBSERVED"
                            ),
                        )
                    )
                    program.add_edge(
                        SemanticEdgeFact(
                            "DECLARES_DATA",
                            message_key,
                            data_key,
                            origin="CONTRACT_ANALYSIS",
                        )
                    )
                    program.add_edge(
                        SemanticEdgeFact(
                            "CARRIES_DATA",
                            message_key,
                            data_key,
                            origin="CONTRACT_ANALYSIS",
                        )
                    )

            for rpc in _PROTO_RPC_RE.finditer(text):
                method, request_type, response_type = rpc.groups()
                line = _line(text, rpc.start())
                method_key = f"grpc-method:{rel}:{method}"
                program.add_node(
                    SemanticNodeFact(
                        method_key,
                        "GRPC_METHOD",
                        method,
                        rel,
                        line,
                        line,
                        method,
                        attributes={
                            "requestType": request_type,
                            "responseType": response_type,
                        },
                        origin="CONTRACT_ANALYSIS",
                    )
                )
                program.add_edge(
                    SemanticEdgeFact(
                        "DECLARES",
                        contract_key,
                        method_key,
                        origin="CONTRACT_ANALYSIS",
                    )
                )
                request_key = message_keys.get(request_type.split(".")[-1])
                response_key = message_keys.get(response_type.split(".")[-1])
                if request_key:
                    program.add_edge(
                        SemanticEdgeFact(
                            "FLOWS_TO",
                            request_key,
                            method_key,
                            origin="CONTRACT_ANALYSIS",
                        )
                    )
                if response_key:
                    program.add_edge(
                        SemanticEdgeFact(
                            "FLOWS_TO",
                            method_key,
                            response_key,
                            origin="CONTRACT_ANALYSIS",
                        )
                    )

    def _corroborate_sensitive_processing(self, program: SemanticProgram) -> None:
        data_by_file: dict[str, list[SemanticNodeFact]] = {}
        for node in program.nodes:
            if node.node_type == "DATA_OBJECT" and node.file_path:
                data_by_file.setdefault(node.file_path, []).append(node)

        for path in self._files({".py", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".java", ".kt", ".go", ".cs", ".rs"}):
            rel = path.relative_to(self.workspace).as_posix()
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            biometric = self._biometric_behavior(text)
            identity_document = self._identity_document_behavior(text)
            if not biometric and not identity_document:
                continue
            behavior_lines = self._behavior_lines(text, biometric, identity_document)
            candidates = data_by_file.get(rel, [])
            for data in candidates:
                if data.start_line and behavior_lines and min(
                    abs(data.start_line - line) for line in behavior_lines
                ) > 40:
                    continue
                semantic_types = set(data.semantic_types)
                capabilities: list[str] = []
                if biometric:
                    semantic_types.add("SENSITIVE.BIOMETRIC")
                    capabilities.append("BIOMETRIC_PROCESSING")
                if identity_document:
                    semantic_types.add("PII.GOVERNMENT_ID")
                    capabilities.append("IDENTITY_DOCUMENT_PROCESSING")
                program.add_node(
                    SemanticNodeFact(
                        data.key,
                        "DATA_OBJECT",
                        data.label,
                        data.file_path,
                        data.start_line,
                        data.end_line,
                        data.symbol_ref,
                        attributes={"corroboratedCapabilities": capabilities},
                        semantic_types=tuple(sorted(semantic_types)),
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )

            # Preserve behavior evidence even when syntax did not expose a named value.
            # This remains a candidate data asset, not proof that every value in file is PII.
            if not candidates:
                line = min(behavior_lines) if behavior_lines else 1
                semantics = []
                capabilities = []
                if biometric:
                    semantics.append("SENSITIVE.BIOMETRIC")
                    capabilities.append("BIOMETRIC_PROCESSING")
                if identity_document:
                    semantics.append("PII.GOVERNMENT_ID")
                    capabilities.append("IDENTITY_DOCUMENT_PROCESSING")
                program.add_node(
                    SemanticNodeFact(
                        f"data-asset:behavior:{rel}:{line}",
                        "DATA_ASSET",
                        "corroborated sensitive processing input",
                        rel,
                        line,
                        line,
                        attributes={"capabilities": capabilities},
                        semantic_types=tuple(sorted(semantics)),
                        origin="DATA_LINEAGE",
                        resolution_state="CORROBORATED",
                    )
                )

    @staticmethod
    def _biometric_behavior(text: str) -> bool:
        direct = bool(_FINGERPRINT_OR_VOICE.search(text))
        composed_face = bool(
            _VISUAL_BIOMETRIC.search(text)
            and _BIOMETRIC_REPRESENTATION.search(text)
            and _IDENTITY_MATCH.search(text)
        )
        return direct or composed_face

    @staticmethod
    def _identity_document_behavior(text: str) -> bool:
        return bool(_OCR.search(text) and _ID_DOCUMENT.search(text))

    @staticmethod
    def _behavior_lines(text: str, biometric: bool, identity_document: bool) -> list[int]:
        patterns = []
        if biometric:
            patterns.extend(
                [_VISUAL_BIOMETRIC, _BIOMETRIC_REPRESENTATION, _IDENTITY_MATCH, _FINGERPRINT_OR_VOICE]
            )
        if identity_document:
            patterns.extend([_OCR, _ID_DOCUMENT])
        result = []
        for number, line in enumerate(text.splitlines(), start=1):
            if any(pattern.search(line) for pattern in patterns):
                result.append(number)
        return result

    def _files(self, extensions: set[str]) -> tuple[Path, ...]:
        result = []
        for path in self.workspace.rglob("*"):
            if not path.is_file() or path.suffix.lower() not in extensions:
                continue
            try:
                relative = path.relative_to(self.workspace)
            except ValueError:
                continue
            if any(part in _EXCLUDED for part in relative.parts):
                continue
            rel = relative.as_posix()
            if is_test_source_path(rel):
                continue
            result.append(path)
        return tuple(sorted(result))

    @staticmethod
    def _data_key(source_key: str) -> str:
        return f"data-object:{source_key}"


def _line(text: str, offset: int) -> int:
    return text.count("\n", 0, max(0, offset)) + 1
