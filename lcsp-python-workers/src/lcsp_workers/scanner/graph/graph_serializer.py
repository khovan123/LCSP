from dataclasses import dataclass, asdict
from typing import List, Dict

@dataclass
class ScanGraph:
    graph_id: str
    schema_version: str
    node_count: int
    edge_count: int
    nodes: List[Dict]
    edges: List[Dict]
    ai_provider_nodes: List[str]
    ai_invocation_nodes: List[str]
    coverage_gap_nodes: List[str]
    unsupported_flow_nodes: List[str]

def serialize_graph(graph: ScanGraph) -> dict:
    return asdict(graph)
