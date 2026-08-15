"""Canonical same-name execution entrypoints for AO-1 scanner tools.

Every function in this module intentionally has the exact canonical tool name.
The functions are thin adapters only: they make runtime ownership discoverable
while preserving the existing scanner implementations and their tests.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable, Mapping

from lcsp_workers.scanner.analyzers.python_analyzer import PythonAnalyzer
from lcsp_workers.scanner.graph.evidence_graph_assembler import EvidenceGraphAssembler
from lcsp_workers.scanner.inventory.language_classifier import LanguageClassifier
from lcsp_workers.scanner.parsers.structural_augmentor import StructuralAugmentor
from lcsp_workers.scanner.tools.deptry_tool import DeptryTool
from lcsp_workers.scanner.tools.knip_tool import KnipTool
from lcsp_workers.scanner.tools.semgrep_tool import SemgrepTool
from lcsp_workers.scanner.tools.syft_tool import SyftTool
from lcsp_workers.scanner.ts_js_bridge.bridge import TsJsBridge
from lcsp_workers.scanner.workspace import ScannerWorkspace


@dataclass(frozen=True)
class ScannerToolExecutionContext:
    """Trusted local scanner dependencies used by AO-1 canonical entrypoints."""

    workspace: ScannerWorkspace
    language_classifier: LanguageClassifier
    syft_tool: SyftTool
    semgrep_tool: SemgrepTool
    knip_tool: KnipTool
    deptry_tool: DeptryTool
    ts_js_bridge_factory: Callable[[Path], TsJsBridge]
    structural_augmentor: StructuralAugmentor
    evidence_graph_assembler: EvidenceGraphAssembler


ScannerToolInput = Mapping[str, Any]


def _required(request: ScannerToolInput, name: str) -> Any:
    if name not in request:
        raise ValueError(f"scanner tool input missing required field: {name}")
    return request[name]


def _workspace_path(request: ScannerToolInput) -> Path:
    value = _required(request, "workspace_path")
    return value if isinstance(value, Path) else Path(str(value))


def materialize_snapshot(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Materialize one trusted snapshot archive into the bounded scanner workspace."""
    return context.workspace.materialize(
        str(_required(request, "scan_job_id")),
        _required(request, "archive"),
        snapshot_id=str(_required(request, "snapshot_id")),
    )


def classify_workspace_languages(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Classify files in one materialized workspace for analyzer routing."""
    return context.language_classifier.classify_workspace(_workspace_path(request))


def run_syft_inventory(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run the pinned Syft implementation over one trusted workspace."""
    return context.syft_tool.run(_workspace_path(request))


def run_semgrep_rules(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run the configured Semgrep rules over one trusted workspace."""
    include_files = request.get("include_files")
    if include_files is None:
        return context.semgrep_tool.run(_workspace_path(request))
    return context.semgrep_tool.run(
        _workspace_path(request),
        include_files=list(include_files),
    )


def run_knip_usage_analysis(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run Knip usage analysis through the existing Python wrapper."""
    return context.knip_tool.run(_workspace_path(request))


def run_deptry_usage_analysis(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run Deptry usage analysis through the existing Python wrapper."""
    return context.deptry_tool.run(_workspace_path(request))


def run_ts_js_semantic_analysis(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run the TS/JS semantic bridge for a bounded file set."""
    include_files = request.get("include_files")
    return asyncio.run(
        context.ts_js_bridge_factory(_workspace_path(request)).analyze(
            include_files=list(include_files) if include_files is not None else None
        )
    )


def run_python_semantic_analysis(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run Python semantic analysis for a bounded file set."""
    include_files = request.get("include_files")
    return PythonAnalyzer(_workspace_path(request)).analyze(
        include_files=list(include_files) if include_files is not None else None
    )


def run_structural_augmentation(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Run structural augmentation using the existing deterministic augmentor."""
    context.structural_augmentor.set_workspace_path(_workspace_path(request))
    return context.structural_augmentor.augment(
        files=list(_required(request, "files")),
        finding_ids=list(_required(request, "finding_ids")),
    )


def build_evidence_graph(
    request: ScannerToolInput,
    context: ScannerToolExecutionContext,
):
    """Build the scanner evidence graph through its existing assembler."""
    return context.evidence_graph_assembler.assemble(
        scan_job_id=str(_required(request, "scan_job_id")),
        snapshot_id=str(_required(request, "snapshot_id")),
        commit_sha=str(request.get("commit_sha") or ""),
        workspace_path=_workspace_path(request),
        technical_findings=list(_required(request, "technical_findings")),
        structural_facts=list(request.get("structural_facts") or []),
        package_dependencies=list(request.get("package_dependencies") or []),
        coverage_notes=list(request.get("coverage_notes") or []),
    )
