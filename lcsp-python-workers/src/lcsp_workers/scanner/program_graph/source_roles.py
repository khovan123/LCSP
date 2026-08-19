"""Source-role classification and test-source removal for Program Evidence Graphs."""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import replace
from pathlib import PurePosixPath
from typing import Any

from .models import ProgramEvidenceGraph
from .semantic_ir import SemanticProgram

SOURCE_ROLE_PRODUCTION = "PRODUCTION"
SOURCE_ROLE_TEST = "TEST"
SOURCE_ROLE_SCRIPT = "SCRIPT"
SOURCE_ROLE_EXAMPLE = "EXAMPLE"
SOURCE_ROLE_GENERATED = "GENERATED"
SOURCE_ROLE_UNKNOWN = "UNKNOWN"

_TEST_DIRS = frozenset(
    {
        "test",
        "tests",
        "__tests__",
        "spec",
        "specs",
        "fixtures",
        "__fixtures__",
        "mocks",
        "__mocks__",
    }
)
_EXAMPLE_DIRS = frozenset({"example", "examples", "demo", "demos", "sample", "samples"})
_GENERATED_DIRS = frozenset(
    {"dist", "build", "coverage", ".next", ".turbo", "generated", "__generated__"}
)
_TEST_FILE_PATTERNS = (
    re.compile(r"^test_.+\.py$", re.IGNORECASE),
    re.compile(r"^.+_test\.py$", re.IGNORECASE),
    re.compile(r"^conftest\.py$", re.IGNORECASE),
    re.compile(r"^.+\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$", re.IGNORECASE),
)


def normalize_source_path(value: str | None) -> str:
    return str(value or "").replace("\\", "/").lstrip("./")


def is_test_source_path(value: str | None) -> bool:
    """Return True for executable/spec fixture paths that must not become product evidence."""
    path = normalize_source_path(value)
    if not path:
        return False
    pure = PurePosixPath(path)
    parts = tuple(part.lower() for part in pure.parts)
    if any(part in _TEST_DIRS for part in parts[:-1]):
        return True
    name = pure.name
    return any(pattern.match(name) for pattern in _TEST_FILE_PATTERNS)


def source_role(value: str | None) -> str:
    path = normalize_source_path(value)
    if not path:
        return SOURCE_ROLE_UNKNOWN
    if is_test_source_path(path):
        return SOURCE_ROLE_TEST
    parts = tuple(part.lower() for part in PurePosixPath(path).parts)
    if any(part in _GENERATED_DIRS for part in parts[:-1]):
        return SOURCE_ROLE_GENERATED
    if any(part in _EXAMPLE_DIRS for part in parts[:-1]):
        return SOURCE_ROLE_EXAMPLE
    if "scripts" in parts[:-1] or (parts and parts[0] == "scripts"):
        return SOURCE_ROLE_SCRIPT
    return SOURCE_ROLE_PRODUCTION


def is_material_source_path(value: str | None) -> bool:
    return source_role(value) == SOURCE_ROLE_PRODUCTION


def exclude_test_sources_from_semantic_program(program: SemanticProgram) -> int:
    """Remove test-backed semantic nodes and all incident edges before graph IDs are built."""
    removed = {
        node.key
        for node in program.nodes
        if node.file_path and is_test_source_path(node.file_path)
    }
    if not removed:
        return 0
    program.nodes = [node for node in program.nodes if node.key not in removed]
    program.edges = [
        edge
        for edge in program.edges
        if edge.source_key not in removed and edge.target_key not in removed
    ]
    return len(removed)


def filter_program_evidence_graph(graph: ProgramEvidenceGraph) -> ProgramEvidenceGraph:
    """Return an ephemeral/test-free graph for planning and investigation.

    Newly scanned graphs are already filtered in the semantic assembler. This second
    boundary intentionally also protects classification reruns over older persisted
    graph artifacts that may still contain test/spec nodes.
    """
    kept_nodes = [
        node
        for node in graph.nodes
        if not is_test_source_path(
            str((node.get("source") or {}).get("file_path") or "")
        )
    ]
    kept_ids = {str(node.get("node_id")) for node in kept_nodes if node.get("node_id")}
    if len(kept_nodes) == len(graph.nodes):
        return graph

    kept_edges = [
        edge
        for edge in graph.edges
        if str(edge.get("source_node_id")) in kept_ids
        and str(edge.get("target_node_id")) in kept_ids
    ]
    kept_anchors = [
        anchor
        for anchor in graph.source_anchors
        if str(anchor.get("graph_node_id")) in kept_ids
        and not is_test_source_path(str(anchor.get("file_path") or ""))
    ]

    indexes: dict[str, list[str]] = {}
    for node in kept_nodes:
        node_id = str(node.get("node_id") or "")
        if not node_id:
            continue
        indexes.setdefault(f"node:{node.get('node_type')}", []).append(node_id)
        for semantic in node.get("semantic_types") or []:
            indexes.setdefault(f"semantic:{semantic}", []).append(node_id)
    indexes = {key: sorted(set(value)) for key, value in sorted(indexes.items())}

    evidence_refs = sorted(
        {
            str(ref)
            for item in [*kept_nodes, *kept_edges]
            for ref in item.get("evidence_refs") or []
            if str(ref)
        }
    )
    provenance = dict(graph.provenance)
    provenance["test_source_policy"] = "EXCLUDED"
    body: dict[str, Any] = {
        "schema_version": graph.schema_version,
        "snapshot_id": graph.snapshot_id,
        "commit_sha": graph.commit_sha,
        "nodes": kept_nodes,
        "edges": kept_edges,
        "source_anchors": kept_anchors,
        "indexes": indexes,
        "unresolved_frontiers": graph.unresolved_frontiers,
        "coverage_state": graph.coverage_state,
        "coverage_notes": graph.coverage_notes,
        "provenance": provenance,
        "evidence_refs": evidence_refs,
    }
    graph_hash = "sha256:" + hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()
    ).hexdigest()
    return replace(
        graph,
        node_count=len(kept_nodes),
        edge_count=len(kept_edges),
        nodes=kept_nodes,
        edges=kept_edges,
        source_anchors=kept_anchors,
        indexes=indexes,
        provenance=provenance,
        evidence_refs=evidence_refs,
        graph_hash=graph_hash,
    )
