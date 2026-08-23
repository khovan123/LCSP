from typing import Dict, Any, List
from .models import RepoSubgraph, GraphNode, GraphEdge, IntegrationEvidence
from lcsp_workers.scanner.program_graph.models import ProgramEvidenceGraph, ProgramNode, ProgramEdge
from lcsp_workers.scanner.toolchain_execution import ToolchainResult

class EvidenceGraphBuilder:
    def __init__(self, commit_sha: str, snapshot_id: str):
        self.commit_sha = commit_sha
        self.snapshot_id = snapshot_id
        
    def build_from_program_graph(self, program_graph: ProgramEvidenceGraph, toolchain_result: ToolchainResult = None) -> RepoSubgraph:
        subgraph = RepoSubgraph()
        node_map = {} # Maps program node id to new graph node id
        
        for p_node in program_graph.nodes:
            # Map ProgramNode to GraphNode
            # node_type from ProgramGraph: service, component, database, route, etc.
            p_type = p_node.get("node_type", "").upper()
            
            mapped_type = "SERVICE"
            if p_type in ["DATABASE", "STORE"]:
                mapped_type = "DATABASE"
            elif p_type in ["ROUTE", "CONTROLLER"]:
                mapped_type = "CONTROLLER"
            elif p_type in ["TOPIC", "PUBLISHER"]:
                mapped_type = "TOPIC"
            elif p_type in ["CONSUMER", "QUEUE"]:
                mapped_type = "QUEUE"
            elif p_type in ["EXTERNAL_API", "REMOTE"]:
                mapped_type = "EXTERNAL_API"
            
            g_node = GraphNode(
                type=mapped_type,
                canonicalName=p_node.get("label", "unknown"),
                properties=p_node.get("attributes", {})
            )
            subgraph.nodes.append(g_node)
            node_map[p_node.get("node_id")] = g_node.id
            
        for p_edge in program_graph.edges:
            source_id = node_map.get(p_edge.get("source_node_id"))
            target_id = node_map.get(p_edge.get("target_node_id"))
            
            if source_id and target_id:
                p_type = p_edge.get("edge_type", "").upper()
                mapped_edge = "CALLS"
                if p_type in ["PUBLISH", "EMIT"]:
                    mapped_edge = "PUBLISHES"
                elif p_type in ["SUBSCRIBE", "CONSUME"]:
                    mapped_edge = "CONSUMES"
                elif p_type in ["READ"]:
                    mapped_edge = "READS"
                elif p_type in ["WRITE", "UPDATE"]:
                    mapped_edge = "WRITES"
                elif p_type in ["SHARE"]:
                    mapped_edge = "SHARES_DATA_WITH"

                g_edge = GraphEdge(
                    sourceId=source_id,
                    targetId=target_id,
                    type=mapped_edge,
                    confidence=p_edge.get("confidence", 1.0),
                    properties=p_edge.get("attributes", {})
                )
                subgraph.edges.append(g_edge)
                
        return subgraph
