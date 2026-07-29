import uuid
import json
from typing import Dict, List, Optional
from dataclasses import asdict

from lcsp_workers.scanner.graph.node_types import GraphNode, NODE_TYPES
from lcsp_workers.scanner.graph.edge_types import GraphEdge, EDGE_TYPES
from lcsp_workers.scanner.graph.graph_serializer import ScanGraph

MAX_NODES = 10000
MAX_EDGES = 50000

class EvidenceGraphBuilder:
    def __init__(self, workspace_path: str = ""):
        self.workspace_path = workspace_path.replace('\\', '/') if workspace_path else ""
        self.nodes: Dict[str, GraphNode] = {}
        self.edges: Dict[str, GraphEdge] = {}
        self.node_dedup_map: Dict[str, str] = {}
        self.coverage_gap_emitted = False
        self.coverage_gap_edge_emitted = False
        self.ai_provider_nodes: List[str] = []
        self.ai_invocation_nodes: List[str] = []
        self.coverage_gap_nodes: List[str] = []
        self.unsupported_flow_nodes: List[str] = []

    def _make_relative(self, path: Optional[str]) -> Optional[str]:
        if not path:
            return path
        
        path_norm = path.replace('\\', '/')
        if self.workspace_path and path_norm.startswith(self.workspace_path):
            rel = path_norm[len(self.workspace_path):]
            if rel.startswith('/'):
                rel = rel[1:]
            return rel
        return path_norm

    def _assert_no_raw_source(self, attributes: dict):
        for k, v in attributes.items():
            if k == "source_code" or k == "raw_content":
                raise AssertionError(f"Raw source code found in attribute {k}")
            if isinstance(v, str) and ("def " in v or "class " in v or "import " in v or "\n" in v):
                if k not in ["purl", "name", "rule_id", "kwarg_names", "label"]: 
                    raise AssertionError(f"Raw source code found in attribute {k}: {v}")

    def add_node(self, node_type: str, label: str, file_path: Optional[str] = None, 
                 line_number: Optional[int] = None, attributes: Optional[dict] = None, 
                 finding_ids: Optional[List[str]] = None) -> Optional[str]:
        if node_type not in NODE_TYPES:
            raise ValueError(f"Invalid node type: {node_type}")
            
        attributes = attributes or {}
        finding_ids = finding_ids or []
        
        self._assert_no_raw_source(attributes)
        
        rel_path = self._make_relative(file_path)
        
        # Deduplication key
        dedup_key = f"{rel_path or ''}::{node_type}::{label}"
        
        if dedup_key in self.node_dedup_map:
            existing_id = self.node_dedup_map[dedup_key]
            existing_node = self.nodes[existing_id]
            for fid in finding_ids:
                if fid not in existing_node.finding_ids:
                    existing_node.finding_ids.append(fid)
            return existing_id
            
        if len(self.nodes) >= MAX_NODES:
            if not self.coverage_gap_emitted:
                self._emit_coverage_gap("Max nodes limit reached (10,000)")
                self.coverage_gap_emitted = True
            return None
            
        node_id = str(uuid.uuid4())
        new_node = GraphNode(
            node_id=node_id,
            node_type=node_type,
            label=label,
            file_path=rel_path,
            line_number=line_number,
            attributes=attributes,
            finding_ids=finding_ids
        )
        
        self.nodes[node_id] = new_node
        self.node_dedup_map[dedup_key] = node_id
        
        if node_type == "AI_PROVIDER":
            self.ai_provider_nodes.append(node_id)
        elif node_type == "AI_MODEL_INVOCATION":
            self.ai_invocation_nodes.append(node_id)
        elif node_type == "UNSUPPORTED_FLOW":
            self.unsupported_flow_nodes.append(node_id)
        elif node_type == "COVERAGE_GAP":
            self.coverage_gap_nodes.append(node_id)
            
        return node_id

    def add_edge(self, edge_type: str, source_node_id: str, target_node_id: str, 
                 confidence: float = 1.0, attributes: Optional[dict] = None) -> Optional[str]:
        if edge_type not in EDGE_TYPES:
            raise ValueError(f"Invalid edge type: {edge_type}")
            
        attributes = attributes or {}
        
        if source_node_id not in self.nodes or target_node_id not in self.nodes:
            return None
            
        if len(self.edges) >= MAX_EDGES:
            if not self.coverage_gap_edge_emitted:
                self._emit_coverage_gap("Max edges limit reached (50,000)")
                self.coverage_gap_edge_emitted = True
            return None
            
        edge_id = str(uuid.uuid4())
        new_edge = GraphEdge(
            edge_id=edge_id,
            edge_type=edge_type,
            source_node_id=source_node_id,
            target_node_id=target_node_id,
            confidence=confidence,
            attributes=attributes
        )
        
        self.edges[edge_id] = new_edge
        return edge_id

    def _emit_coverage_gap(self, reason: str):
        node_id = str(uuid.uuid4())
        gap_node = GraphNode(
            node_id=node_id,
            node_type="COVERAGE_GAP",
            label="Truncation",
            file_path=None,
            line_number=None,
            attributes={"reason": reason},
            finding_ids=[]
        )
        self.nodes[node_id] = gap_node
        self.coverage_gap_nodes.append(node_id)

    def build_scan_graph(self) -> ScanGraph:
        return ScanGraph(
            graph_id=str(uuid.uuid4()),
            schema_version="1.0",
            node_count=len(self.nodes),
            edge_count=len(self.edges),
            nodes=[asdict(n) for n in self.nodes.values()],
            edges=[asdict(e) for e in self.edges.values()],
            ai_provider_nodes=self.ai_provider_nodes,
            ai_invocation_nodes=self.ai_invocation_nodes,
            coverage_gap_nodes=self.coverage_gap_nodes,
            unsupported_flow_nodes=self.unsupported_flow_nodes
        )
