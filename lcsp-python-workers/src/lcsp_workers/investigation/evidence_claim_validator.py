"""Fail closed when an LLM claim is not backed by immutable graph/source provenance."""
from __future__ import annotations
from lcsp_workers.scanner.program_graph.models import ProgramEvidenceGraph
from .models import EvidenceClaim
class EvidenceClaimValidationError(ValueError): pass

class EvidenceClaimValidator:
    def validate(self, claim: EvidenceClaim, graph: ProgramEvidenceGraph | dict) -> EvidenceClaim:
        value = graph if isinstance(graph, ProgramEvidenceGraph) else ProgramEvidenceGraph.from_dict(graph)
        anchors = {str(a["anchor_id"]) for a in value.source_anchors}; nodes = {str(n["node_id"]) for n in value.nodes}; edges = {str(e["edge_id"]) for e in value.edges}; known = set(value.evidence_refs) | anchors | nodes | edges
        missing = [ref for ref in claim.evidence_refs if ref not in known and not ref.startswith("graph-path:")]
        if missing: raise EvidenceClaimValidationError(f"unknown evidence refs: {missing}")
        if set(claim.source_anchor_refs) - anchors: raise EvidenceClaimValidationError("source anchor does not resolve")
        if not claim.evidence_refs: raise EvidenceClaimValidationError("claim requires evidence refs")
        if not 0 <= claim.confidence <= 1: raise EvidenceClaimValidationError("claim confidence out of range")
        return claim
