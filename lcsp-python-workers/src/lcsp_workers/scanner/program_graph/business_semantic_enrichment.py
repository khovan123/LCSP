"""Provenance-gated LLM business semantics for Unified System Evidence Graph v3."""
from __future__ import annotations

import hashlib
import json
import re
from dataclasses import replace
from typing import Any

from lcsp_workers.llm.fallback_client import LLMClientProtocol
from lcsp_workers.llm.gateway_client import LLMToolDefinition
from lcsp_workers.platform.logging import get_logger

from .models import ProgramEvidenceGraph
from .validator import validate_program_graph

logger = get_logger(__name__)

_ALLOWED_NODE_TYPES = frozenset(
    {
        "BUSINESS_PROCESS",
        "PROCESS_STEP",
        "BUSINESS_DECISION",
        "BUSINESS_OUTCOME",
        "BUSINESS_OBJECT",
        "ACTOR",
        "DATA_SUBJECT",
        "AI_CAPABILITY",
    }
)
_ALLOWED_EDGE_TYPES = frozenset(
    {
        "PART_OF_PROCESS",
        "PRECEDES",
        "PERFORMED_BY",
        "AFFECTS_SUBJECT",
        "INVOKES_AI",
        "INFLUENCES_DECISION",
        "USES_DATA",
        "PRODUCES_OUTCOME",
        "REQUIRES_HUMAN_REVIEW",
    }
)
_CONTEXT_NODE_TYPES = frozenset(
    {
        "HTTP_ROUTE",
        "GRPC_METHOD",
        "COMMAND",
        "QUERY",
        "EVENT",
        "QUEUE",
        "AI_MODEL_INVOCATION",
        "AI_INPUT",
        "AI_OUTPUT",
        "MODEL",
        "MODEL_ENDPOINT",
        "TRAINING_JOB",
        "EVALUATION_JOB",
        "DATA_OBJECT",
        "DATA_ASSET",
        "DATABASE",
        "TABLE",
        "REPOSITORY_ACCESS",
        "BUSINESS_DECISION",
        "BUSINESS_ACTION",
        "APPROVAL",
        "REJECTION",
        "STATUS_CHANGE",
        "HUMAN_REVIEW",
        "HUMAN_OVERRIDE",
    }
)
_LEGAL_CONCLUSION_RE = re.compile(
    r"\b(?:compliant|non[- ]?compliant|legal applicability|legal violation|high[- ]risk|medium[- ]risk|low[- ]risk)\b|"
    r"(?:tuân thủ|không tuân thủ|vi phạm pháp luật|rủi ro cao|rủi ro trung bình|rủi ro thấp)",
    re.I,
)
_PROPOSAL_ID_RE = re.compile(r"^[a-z][a-z0-9_-]{1,63}$")


class BusinessSemanticEnricher:
    """Ask an LLM for business meaning, then accept only graph-backed proposals.

    The model never writes the graph directly. It sees a bounded sanitized graph view and
    submits semantic proposals through one native tool call. Every accepted node/edge is
    marked ``LLM_SEMANTIC_ENRICHMENT`` + ``CORROBORATED`` and carries immutable support
    refs that existed before the proposal. Legal applicability/risk/compliance conclusions
    are outside this contract and are rejected.
    """

    def __init__(self, llm_client: LLMClientProtocol) -> None:
        self._llm = llm_client

    def enrich(
        self,
        graph: ProgramEvidenceGraph,
        *,
        workflow_run_id: str,
        correlation_id: str | None = None,
    ) -> ProgramEvidenceGraph:
        if graph.schema_version != "3.0.0":
            return graph
        context = self._context(graph)
        if not context["nodes"]:
            return graph
        try:
            response = self._llm.complete_with_tools(
                self._prompt(context),
                tools=[self._tool()],
                workflow_run_id=workflow_run_id,
                node_name="enrich_business_semantics",
                max_tokens=4000,
                correlationId=correlation_id,
            )
            calls = [
                call
                for call in response.tool_calls
                if call.name == "submit_business_semantics"
            ]
            if len(calls) != 1:
                raise ValueError("business semantic enricher requires exactly one proposal call")
            enriched, accepted_nodes, accepted_edges = self.validate_and_merge(
                graph,
                calls[0].arguments,
            )
            logger.info(
                "BUSINESS_SEMANTIC_GRAPH_ENRICHED",
                accepted_node_count=accepted_nodes,
                accepted_edge_count=accepted_edges,
                graph_node_count=enriched.node_count,
                graph_edge_count=enriched.edge_count,
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )
            return enriched
        except Exception as error:
            logger.warning(
                "BUSINESS_SEMANTIC_GRAPH_ENRICHMENT_SKIPPED",
                error_type=type(error).__name__,
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )
            return graph

    @classmethod
    def validate_and_merge(
        cls,
        graph: ProgramEvidenceGraph,
        payload: dict[str, Any],
    ) -> tuple[ProgramEvidenceGraph, int, int]:
        """Validate one model proposal payload and return a new immutable graph value."""
        if graph.schema_version != "3.0.0":
            raise ValueError("business semantic enrichment requires graph v3")
        raw_nodes = payload.get("nodes")
        raw_edges = payload.get("edges")
        if not isinstance(raw_nodes, list) or not isinstance(raw_edges, list):
            raise ValueError("business semantic proposal arrays are required")

        original_refs = cls._original_support_refs(graph)
        proposal_nodes: dict[str, dict[str, Any]] = {}
        for raw in raw_nodes[:40]:
            if not isinstance(raw, dict):
                continue
            proposal_id = str(raw.get("proposalNodeId") or "")
            node_type = str(raw.get("nodeType") or "")
            label = cls._label(raw.get("label"))
            support_refs = cls._support_refs(raw.get("supportRefs"), original_refs)
            if (
                not _PROPOSAL_ID_RE.fullmatch(proposal_id)
                or node_type not in _ALLOWED_NODE_TYPES
                or not label
                or not support_refs
            ):
                continue
            node_id = cls._stable_id(
                "node",
                {
                    "graph": graph.graph_id,
                    "proposal": proposal_id,
                    "type": node_type,
                    "label": label,
                    "support": support_refs,
                },
            )
            proposal_nodes[proposal_id] = {
                "node_id": node_id,
                "node_type": node_type,
                "label": label,
                "source": None,
                "attributes": {"semanticProposalId": proposal_id},
                "semantic_types": [],
                "evidence_refs": [],
                "coverage_state": "SUFFICIENT",
                "source_anchor_ref": None,
                "origin": "LLM_SEMANTIC_ENRICHMENT",
                "resolution_state": "CORROBORATED",
                "support_refs": support_refs,
            }

        existing_node_ids = {str(node.get("node_id")) for node in graph.nodes}
        endpoint_map = {
            **{node_id: node_id for node_id in existing_node_ids},
            **{
                f"proposal:{proposal_id}": node["node_id"]
                for proposal_id, node in proposal_nodes.items()
            },
        }
        new_edges: list[dict[str, Any]] = []
        seen_edge_keys: set[tuple[str, str, str]] = set()
        for raw in raw_edges[:80]:
            if not isinstance(raw, dict):
                continue
            edge_type = str(raw.get("edgeType") or "")
            source = endpoint_map.get(str(raw.get("sourceRef") or ""))
            target = endpoint_map.get(str(raw.get("targetRef") or ""))
            support_refs = cls._support_refs(raw.get("supportRefs"), original_refs)
            if edge_type not in _ALLOWED_EDGE_TYPES or not source or not target or not support_refs:
                continue
            key = (edge_type, source, target)
            if key in seen_edge_keys:
                continue
            seen_edge_keys.add(key)
            new_edges.append(
                {
                    "edge_id": cls._stable_id(
                        "edge",
                        {
                            "graph": graph.graph_id,
                            "type": edge_type,
                            "source": source,
                            "target": target,
                            "support": support_refs,
                        },
                    ),
                    "edge_type": edge_type,
                    "source_node_id": source,
                    "target_node_id": target,
                    "confidence": 1.0,
                    "attributes": {},
                    "evidence_refs": [],
                    "coverage_state": "SUFFICIENT",
                    "origin": "LLM_SEMANTIC_ENRICHMENT",
                    "resolution_state": "CORROBORATED",
                    "support_refs": support_refs,
                }
            )

        if not proposal_nodes and not new_edges:
            return graph, 0, 0
        nodes = [*graph.nodes, *proposal_nodes.values()]
        edges = [*graph.edges, *new_edges]
        enriched = cls._rebuild(graph, nodes, edges)
        return validate_program_graph(enriched), len(proposal_nodes), len(new_edges)

    @classmethod
    def _context(cls, graph: ProgramEvidenceGraph) -> dict[str, Any]:
        node_by_id = {str(node.get("node_id")): node for node in graph.nodes}
        seeds = [
            str(node.get("node_id"))
            for node in graph.nodes
            if node.get("node_type") in _CONTEXT_NODE_TYPES
            and str(node.get("resolution_state") or "OBSERVED") != "INFERRED"
        ][:30]
        selected = set(seeds)
        for edge in graph.edges:
            source = str(edge.get("source_node_id") or "")
            target = str(edge.get("target_node_id") or "")
            if source in selected or target in selected:
                selected.update({source, target})
            if len(selected) >= 120:
                break
        rows = [node_by_id[node_id] for node_id in sorted(selected) if node_id in node_by_id]
        allowed_ids = {str(node.get("node_id")) for node in rows}
        edges = [
            edge
            for edge in graph.edges
            if str(edge.get("source_node_id")) in allowed_ids
            and str(edge.get("target_node_id")) in allowed_ids
        ][:240]
        return {
            "nodes": [cls._safe_node(node) for node in rows[:120]],
            "edges": [cls._safe_edge(edge) for edge in edges],
            "unresolvedFrontiers": list(graph.unresolved_frontiers[:30]),
            "coverageState": graph.coverage_state,
        }

    @staticmethod
    def _safe_node(node: dict[str, Any]) -> dict[str, Any]:
        source = node.get("source") if isinstance(node.get("source"), dict) else {}
        attrs = node.get("attributes") if isinstance(node.get("attributes"), dict) else {}
        safe_attrs = {
            str(key): value
            for key, value in attrs.items()
            if isinstance(value, (str, int, float, bool, list))
        }
        return {
            "nodeId": node.get("node_id"),
            "nodeType": node.get("node_type"),
            "label": node.get("label"),
            "semanticTypes": list(node.get("semantic_types") or []),
            "origin": node.get("origin"),
            "resolutionState": node.get("resolution_state"),
            "attributes": safe_attrs,
            "source": {
                "filePath": source.get("file_path"),
                "symbolRef": source.get("symbol_ref"),
                "startLine": source.get("start_line"),
                "endLine": source.get("end_line"),
            }
            if source
            else None,
        }

    @staticmethod
    def _safe_edge(edge: dict[str, Any]) -> dict[str, Any]:
        return {
            "edgeId": edge.get("edge_id"),
            "edgeType": edge.get("edge_type"),
            "sourceNodeId": edge.get("source_node_id"),
            "targetNodeId": edge.get("target_node_id"),
            "origin": edge.get("origin"),
            "resolutionState": edge.get("resolution_state"),
        }

    @classmethod
    def _prompt(cls, context: dict[str, Any]) -> str:
        return (
            "You are the LCSP Business Semantic Enricher. Infer business meaning only from the "
            "bounded Unified System Evidence Graph view below. Propose business processes, steps, "
            "actors, data subjects, business decisions/outcomes, business objects, and AI capability "
            "roles only when concrete graph refs support them. Every proposed node and edge must cite "
            "supportRefs that already exist in the supplied graph. Do not decide legal applicability, "
            "compliance/non-compliance, prohibited practice, or legal risk tier. Do not invent source "
            "facts. If business meaning is ambiguous, omit the proposal rather than guessing. Existing "
            "technical node IDs may be edge endpoints directly; proposed semantic node endpoints use "
            "proposal:<proposalNodeId>. Submit exactly one native tool call.\n\n"
            + json.dumps(context, ensure_ascii=False, separators=(",", ":"))
        )

    @staticmethod
    def _tool() -> LLMToolDefinition:
        support_ref = {
            "type": "string",
            "pattern": r"^(node|edge|source-anchor):[A-Za-z0-9_-]{4,160}$",
        }
        return LLMToolDefinition(
            name="submit_business_semantics",
            description="Submit only provenance-backed business semantic graph proposals.",
            tool_choice_required=True,
            input_schema={
                "type": "object",
                "additionalProperties": False,
                "required": ["nodes", "edges"],
                "properties": {
                    "nodes": {
                        "type": "array",
                        "maxItems": 40,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["proposalNodeId", "nodeType", "label", "supportRefs"],
                            "properties": {
                                "proposalNodeId": {
                                    "type": "string",
                                    "pattern": r"^[a-z][a-z0-9_-]{1,63}$",
                                },
                                "nodeType": {
                                    "type": "string",
                                    "enum": sorted(_ALLOWED_NODE_TYPES),
                                },
                                "label": {"type": "string", "minLength": 1, "maxLength": 160},
                                "supportRefs": {
                                    "type": "array",
                                    "minItems": 1,
                                    "maxItems": 12,
                                    "uniqueItems": True,
                                    "items": support_ref,
                                },
                            },
                        },
                    },
                    "edges": {
                        "type": "array",
                        "maxItems": 80,
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["edgeType", "sourceRef", "targetRef", "supportRefs"],
                            "properties": {
                                "edgeType": {
                                    "type": "string",
                                    "enum": sorted(_ALLOWED_EDGE_TYPES),
                                },
                                "sourceRef": {"type": "string", "maxLength": 200},
                                "targetRef": {"type": "string", "maxLength": 200},
                                "supportRefs": {
                                    "type": "array",
                                    "minItems": 1,
                                    "maxItems": 12,
                                    "uniqueItems": True,
                                    "items": support_ref,
                                },
                            },
                        },
                    },
                },
            },
        )

    @staticmethod
    def _original_support_refs(graph: ProgramEvidenceGraph) -> set[str]:
        return {
            *{str(node.get("node_id")) for node in graph.nodes if node.get("node_id")},
            *{str(edge.get("edge_id")) for edge in graph.edges if edge.get("edge_id")},
            *{
                str(anchor.get("anchor_id"))
                for anchor in graph.source_anchors
                if anchor.get("anchor_id")
            },
        }

    @staticmethod
    def _support_refs(value: Any, known: set[str]) -> list[str]:
        if not isinstance(value, list):
            return []
        refs = []
        for raw in value[:12]:
            ref = str(raw or "")
            if ref in known and ref not in refs:
                refs.append(ref)
        return refs

    @staticmethod
    def _label(value: Any) -> str:
        label = " ".join(str(value or "").split())[:160]
        if not label or _LEGAL_CONCLUSION_RE.search(label):
            return ""
        return label

    @classmethod
    def _rebuild(
        cls,
        graph: ProgramEvidenceGraph,
        nodes: list[dict[str, Any]],
        edges: list[dict[str, Any]],
    ) -> ProgramEvidenceGraph:
        indexes: dict[str, list[str]] = {}
        for node in nodes:
            node_id = str(node.get("node_id") or "")
            if not node_id:
                continue
            indexes.setdefault(f"node:{node.get('node_type')}", []).append(node_id)
            indexes.setdefault(f"origin:{node.get('origin')}", []).append(node_id)
            indexes.setdefault(f"resolution:{node.get('resolution_state')}", []).append(node_id)
            for semantic in node.get("semantic_types") or []:
                indexes.setdefault(f"semantic:{semantic}", []).append(node_id)
        indexes = {key: sorted(set(value)) for key, value in sorted(indexes.items())}
        evidence_refs = sorted(
            {
                str(ref)
                for item in [*nodes, *edges]
                for ref in [
                    *(item.get("evidence_refs") or []),
                    *(item.get("support_refs") or []),
                ]
                if str(ref)
            }
        )
        provenance = dict(graph.provenance)
        provenance["business_semantic_enrichment"] = "LLM_PROVENANCE_GATED"
        body = {
            "schema_version": graph.schema_version,
            "snapshot_id": graph.snapshot_id,
            "commit_sha": graph.commit_sha,
            "nodes": nodes,
            "edges": edges,
            "source_anchors": graph.source_anchors,
            "indexes": indexes,
            "unresolved_frontiers": graph.unresolved_frontiers,
            "coverage_state": graph.coverage_state,
            "coverage_notes": graph.coverage_notes,
            "provenance": provenance,
            "evidence_refs": evidence_refs,
        }
        digest = hashlib.sha256(
            json.dumps(body, sort_keys=True, separators=(",", ":"), default=str).encode()
        ).hexdigest()
        return replace(
            graph,
            graph_id=f"program-graph:{digest[:32]}",
            node_count=len(nodes),
            edge_count=len(edges),
            nodes=nodes,
            edges=edges,
            indexes=indexes,
            provenance=provenance,
            evidence_refs=evidence_refs,
            graph_hash=f"sha256:{digest}",
        )

    @staticmethod
    def _stable_id(kind: str, payload: object) -> str:
        digest = hashlib.sha256(
            json.dumps(payload, sort_keys=True, separators=(",", ":"), default=str).encode()
        ).hexdigest()
        return f"{kind}:{digest[:32]}"
