"""Program Evidence Graph v2 callback serializer kept at the stable scan import path."""
from __future__ import annotations
from lcsp_workers.scanner.program_graph.models import ProgramEvidenceGraph
ScanGraph = ProgramEvidenceGraph

def serialize_graph(graph: ProgramEvidenceGraph) -> dict:
    return graph.to_dict()
