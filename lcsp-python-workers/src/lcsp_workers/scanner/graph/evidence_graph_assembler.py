"""Stable import path delegating graph construction to Program Evidence Graph v2."""
from __future__ import annotations
from pathlib import Path
from typing import Iterable
from lcsp_workers.scanner.program_graph.assembler import ProgramGraphAssembler

class EvidenceGraphAssembler(ProgramGraphAssembler):
    """Compatibility class; legacy AI-focused graph construction has been removed."""
    def assemble(self, *, scan_job_id: str, snapshot_id: str, commit_sha: str, workspace_path: Path, technical_findings: Iterable[object], structural_facts: Iterable[object] = (), package_dependencies: Iterable[object] = (), coverage_notes: Iterable[str] = (), config_hash: str = ""):
        del structural_facts
        return super().assemble(scan_job_id=scan_job_id, snapshot_id=snapshot_id, commit_sha=commit_sha, workspace_path=workspace_path, technical_findings=technical_findings, package_dependencies=package_dependencies, coverage_notes=coverage_notes, config_hash=config_hash)
