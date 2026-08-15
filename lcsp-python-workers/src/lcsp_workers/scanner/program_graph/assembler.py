"""Repository-wide Program Evidence Graph orchestration."""
from __future__ import annotations
from pathlib import Path
from typing import Iterable
from .builder import ProgramGraphBuilder
from .extractor import RepositorySemanticExtractor
from .semantic_ir import SemanticEdgeFact, SemanticNodeFact
from .validator import validate_program_graph

class ProgramGraphAssembler:
    """Build the whole statically resolvable repository graph before LLM investigation."""
    def assemble(self, *, scan_job_id: str, snapshot_id: str, commit_sha: str, workspace_path: Path, package_dependencies: Iterable[object] = (), technical_findings: Iterable[object] = (), coverage_notes: Iterable[str] = (), include_files: Iterable[str] | None = None, config_hash: str = ""):
        program = RepositorySemanticExtractor(workspace_path).extract(include_files=include_files)
        program.add_node(SemanticNodeFact("repository", "REPOSITORY", f"snapshot:{snapshot_id}"))
        for node in list(program.nodes):
            if node.node_type == "FILE": program.add_edge(SemanticEdgeFact("CONTAINS", "repository", node.key))
        for dependency in package_dependencies:
            name = str(getattr(dependency, "name", "") or "").strip()
            if not name: continue
            key = f"dependency:{name}"; attrs = {"ecosystem": str(getattr(dependency, "ecosystem", "") or ""), "version": str(getattr(dependency, "version", "") or ""), "usageState": str(getattr(dependency, "usage_state", "") or getattr(dependency, "status", "") or ""), "licenseExpression": str(getattr(dependency, "license", "") or "")}
            program.add_node(SemanticNodeFact(key, "PACKAGE_DEPENDENCY", name, attributes={k: v for k, v in attrs.items() if v})); program.add_edge(SemanticEdgeFact("DEPENDS_ON", "repository", key))
        for finding in technical_findings:
            fid, path, ftype = str(getattr(finding, "finding_id", "") or ""), str(getattr(finding, "file_path", "") or ""), str(getattr(finding, "finding_type", "") or "")
            if not fid or not path: continue
            line = int(getattr(finding, "line_number", 1) or 1); key = f"finding:{fid}"; node_type = "AI_MODEL_INVOCATION" if any(v in ftype for v in ("AI", "MODEL", "PROVIDER")) else "BUSINESS_ACTION"
            program.add_node(SemanticNodeFact(key, node_type, ftype, path, line, line, attributes={"findingType": ftype}, evidence_refs=(f"evidence:{fid}",))); program.add_edge(SemanticEdgeFact("CONTAINS", f"file:{path}", key, evidence_refs=(f"evidence:{fid}",)))
        builder = ProgramGraphBuilder(workspace_path, scan_job_id=scan_job_id, snapshot_id=snapshot_id, commit_sha=commit_sha, config_hash=config_hash); builder.add_program(program)
        for note in coverage_notes: builder.add_coverage_note(str(note))
        return validate_program_graph(builder.build())
