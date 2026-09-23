"""Structured output produced by the repository Deep Agent.

The model never persists raw repository source. Evidence is represented by
snapshot-pinned file/line anchors and compact semantic graph facts.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SourceAnchor(BaseModel):
    model_config = ConfigDict(extra="forbid")
    anchor_id: str
    file_path: str
    start_line: int = Field(ge=1)
    end_line: int = Field(ge=1)
    symbol_ref: str | None = None

    @model_validator(mode="after")
    def validate_anchor(self) -> "SourceAnchor":
        normalized = self.file_path.replace("\\", "/")
        if normalized.startswith("/") or ".." in normalized.split("/"):
            raise ValueError("source anchor file_path must stay inside repository root")
        if self.end_line < self.start_line:
            raise ValueError("source anchor end_line must be >= start_line")
        return self


class EvidenceNode(BaseModel):
    model_config = ConfigDict(extra="forbid")
    node_id: str
    node_type: str
    label: str
    anchor_id: str | None = None
    semantic_types: list[str] = Field(default_factory=list)
    resolution_state: Literal["OBSERVED", "CORROBORATED", "INFERRED", "UNRESOLVED"] = "OBSERVED"


class EvidenceEdge(BaseModel):
    model_config = ConfigDict(extra="forbid")
    edge_id: str
    edge_type: str
    source_node_id: str
    target_node_id: str
    confidence: float = Field(ge=0, le=1)
    resolution_state: Literal["OBSERVED", "CORROBORATED", "INFERRED", "UNRESOLVED"] = "OBSERVED"


class AiFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")
    evidence_id: str
    state: Literal[
        "CONFIRMED_AI_CALL",
        "POSSIBLE_AI_CALL",
        "AI_PROVIDER_REFERENCE",
        "NO_AI_SIGNAL",
        "UNRESOLVED_DYNAMIC",
    ]
    resolution_state: Literal["OBSERVED", "CORROBORATED", "INFERRED", "UNRESOLVED"]
    kind: Literal["SDK_INVOCATION", "OUTBOUND_API", "PROVIDER_REFERENCE", "DYNAMIC_TARGET"]
    provider: str | None = None
    host: str | None = None
    path: str | None = None
    method: str | None = None
    endpoint_source: str | None = None
    payload_hints: list[str] = Field(default_factory=list)
    runtime_guard: str | None = None
    clarification_owner: Literal["CUSTOMER", "TECHNICAL"] | None = None
    clarification_kind: Literal[
        "AI_PURPOSE_FEATURE_MAPPING",
        "AI_RUNTIME_REACHABILITY",
        "OUTBOUND_AI_CONFIRMATION",
        "TARGETED_TECHNICAL_REANALYSIS",
    ] | None = None
    evidence_refs: list[str] = Field(default_factory=list)
    anchor_id: str | None = None


class AiDiscovery(BaseModel):
    model_config = ConfigDict(extra="forbid")
    gate: Literal["AI_CONFIRMED", "AI_ABSENT_CONFIRMED", "AI_UNKNOWN"]
    coverage_state: Literal["READY", "PARTIAL", "UNAVAILABLE"]
    findings: list[AiFinding] = Field(default_factory=list)
    material_unresolved_frontiers: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def validate_absence_gate(self) -> "AiDiscovery":
        if self.gate == "AI_ABSENT_CONFIRMED":
            if self.coverage_state != "READY":
                raise ValueError("AI_ABSENT_CONFIRMED requires READY AI coverage")
            if self.material_unresolved_frontiers:
                raise ValueError(
                    "AI_ABSENT_CONFIRMED cannot carry material unresolved frontiers"
                )
            if any(
                finding.state in {
                    "CONFIRMED_AI_CALL",
                    "POSSIBLE_AI_CALL",
                    "AI_PROVIDER_REFERENCE",
                    "UNRESOLVED_DYNAMIC",
                }
                for finding in self.findings
            ):
                raise ValueError(
                    "AI_ABSENT_CONFIRMED cannot coexist with positive or unresolved AI signals"
                )
        return self


class RepositoryAnalysisResult(BaseModel):
    model_config = ConfigDict(extra="forbid")
    summary: str
    coverage_state: Literal["READY", "PARTIAL", "UNAVAILABLE"]
    coverage_notes: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    frameworks: list[str] = Field(default_factory=list)
    source_anchors: list[SourceAnchor] = Field(default_factory=list)
    nodes: list[EvidenceNode] = Field(default_factory=list)
    edges: list[EvidenceEdge] = Field(default_factory=list)
    unresolved_frontiers: list[str] = Field(default_factory=list)
    ai_discovery: AiDiscovery

    @model_validator(mode="after")
    def validate_coverage_and_graph(self) -> "RepositoryAnalysisResult":
        if self.ai_discovery.gate == "AI_ABSENT_CONFIRMED":
            if self.coverage_state != "READY":
                raise ValueError(
                    "AI_ABSENT_CONFIRMED requires READY repository coverage"
                )
            if self.unresolved_frontiers:
                raise ValueError(
                    "AI_ABSENT_CONFIRMED cannot carry repository unresolved frontiers"
                )

        anchor_ids = [anchor.anchor_id for anchor in self.source_anchors]
        if len(anchor_ids) != len(set(anchor_ids)):
            raise ValueError("source anchor ids must be unique")
        node_ids = [node.node_id for node in self.nodes]
        if len(node_ids) != len(set(node_ids)):
            raise ValueError("evidence node ids must be unique")
        edge_ids = [edge.edge_id for edge in self.edges]
        if len(edge_ids) != len(set(edge_ids)):
            raise ValueError("evidence edge ids must be unique")

        known_anchors = set(anchor_ids)
        known_nodes = set(node_ids)
        for node in self.nodes:
            if node.anchor_id is not None and node.anchor_id not in known_anchors:
                raise ValueError(f"node references unknown anchor: {node.anchor_id}")
        for edge in self.edges:
            if (
                edge.source_node_id not in known_nodes
                or edge.target_node_id not in known_nodes
            ):
                raise ValueError(f"edge references unknown node: {edge.edge_id}")
        for finding in self.ai_discovery.findings:
            if finding.anchor_id is not None and finding.anchor_id not in known_anchors:
                raise ValueError(
                    f"AI finding references unknown anchor: {finding.anchor_id}"
                )
        return self


__all__ = [
    "AiDiscovery",
    "AiFinding",
    "EvidenceEdge",
    "EvidenceNode",
    "RepositoryAnalysisResult",
    "SourceAnchor",
]
