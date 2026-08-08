from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Generic, TypeVar


PayloadT = TypeVar("PayloadT")


@dataclass(frozen=True)
class GraphNodeContext:
    workflow_run_id: str
    node_name: str
    correlation_id: str | None = None
    request_id: str | None = None


@dataclass(frozen=True)
class GraphNodeResult:
    node_name: str
    status: str
    request_id: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GraphRunState:
    graph_name: str
    workflow_run_id: str
    assessment_id: str | None = None
    artifact_id: str | None = None
    correlation_id: str | None = None
    input_versions: dict[str, str] = field(default_factory=dict)
    node_results: list[GraphNodeResult] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)

    def record_node(
        self,
        *,
        node_name: str,
        status: str,
        request_id: str | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self.node_results.append(
            GraphNodeResult(
                node_name=node_name,
                status=status,
                request_id=request_id,
                metadata=metadata or {},
            )
        )


@dataclass(frozen=True)
class GraphRunResult(Generic[PayloadT]):
    graph_name: str
    workflow_run_id: str
    state: GraphRunState
    payload: PayloadT
