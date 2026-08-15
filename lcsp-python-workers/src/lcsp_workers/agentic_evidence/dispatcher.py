"""Single runtime binding table and dispatcher for Agentic tools."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Mapping

from .catalog import AGENTIC_TOOL_SPECS
from .registry import AgenticToolRequest, AgenticToolValidationError
from .tool_entrypoints import (
    AgenticToolExecutionContext,
    find_provider_invocations,
    find_similar_symbols,
    get_artifact_chain,
    get_evidence_subgraph,
    get_finding_detail,
    get_gap_evidence_trace,
    get_reconciliation_context,
    get_scan_coverage,
    get_symbol_context,
    inspect_data_path,
    inspect_decision_path,
    inspect_deployment_context,
    inspect_human_review_path,
    propose_gap_remediation,
    propose_missing_targets,
    request_targeted_reanalysis,
    resume_waiting_runs,
    search_evidence,
    trace_static_flow,
)


class AgenticToolRuntimeTarget(str, Enum):
    """Downstream execution mechanism reached by a canonical entrypoint."""

    NEST_CQRS = "NEST_CQRS"
    PYTHON_WORKER_BRIDGE = "PYTHON_WORKER_BRIDGE"


AgenticToolEntrypoint = Callable[
    [AgenticToolRequest, AgenticToolExecutionContext], Mapping[str, object]
]


@dataclass(frozen=True)
class AgenticToolBinding:
    """Discoverable mapping from canonical tool name to execution entrypoint."""

    tool_name: str
    runtime_target: AgenticToolRuntimeTarget
    entrypoint: AgenticToolEntrypoint
    downstream_target: str

    def __post_init__(self) -> None:
        if self.entrypoint.__name__ != self.tool_name:
            raise ValueError(
                "agentic tool entrypoint name must exactly match canonical tool name: "
                f"{self.tool_name} != {self.entrypoint.__name__}"
            )


SPRINT6_AGENTIC_TOOL_BINDINGS: tuple[AgenticToolBinding, ...] = (
    AgenticToolBinding(
        "resume_waiting_runs",
        AgenticToolRuntimeTarget.PYTHON_WORKER_BRIDGE,
        resume_waiting_runs,
        "PythonWorkerRuntimeClient.resumeWaitingRuns",
    ),
    AgenticToolBinding(
        "request_targeted_reanalysis",
        AgenticToolRuntimeTarget.PYTHON_WORKER_BRIDGE,
        request_targeted_reanalysis,
        "PythonWorkerRuntimeClient.requestTargetedReanalysis",
    ),
    AgenticToolBinding(
        "propose_gap_remediation",
        AgenticToolRuntimeTarget.NEST_CQRS,
        propose_gap_remediation,
        "ProposeGapRemediationQuery",
    ),
    AgenticToolBinding(
        "get_gap_evidence_trace",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_gap_evidence_trace,
        "GetGapEvidenceTraceQuery",
    ),
    AgenticToolBinding(
        "get_reconciliation_context",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_reconciliation_context,
        "GetReconciliationContextQuery",
    ),
    AgenticToolBinding(
        "propose_missing_targets",
        AgenticToolRuntimeTarget.NEST_CQRS,
        propose_missing_targets,
        "ProposeMissingTargetsQuery",
    ),
    AgenticToolBinding(
        "inspect_deployment_context",
        AgenticToolRuntimeTarget.NEST_CQRS,
        inspect_deployment_context,
        "InspectDeploymentContextQuery",
    ),
    AgenticToolBinding(
        "inspect_decision_path",
        AgenticToolRuntimeTarget.NEST_CQRS,
        inspect_decision_path,
        "InspectDecisionPathQuery",
    ),
    AgenticToolBinding(
        "get_artifact_chain",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_artifact_chain,
        "GetArtifactChainQuery",
    ),
    AgenticToolBinding(
        "find_similar_symbols",
        AgenticToolRuntimeTarget.NEST_CQRS,
        find_similar_symbols,
        "FindSimilarSymbolsQuery",
    ),
    AgenticToolBinding(
        "inspect_human_review_path",
        AgenticToolRuntimeTarget.NEST_CQRS,
        inspect_human_review_path,
        "InspectHumanReviewPathQuery",
    ),
    AgenticToolBinding(
        "inspect_data_path",
        AgenticToolRuntimeTarget.NEST_CQRS,
        inspect_data_path,
        "InspectDataPathQuery",
    ),
    AgenticToolBinding(
        "find_provider_invocations",
        AgenticToolRuntimeTarget.NEST_CQRS,
        find_provider_invocations,
        "FindProviderInvocationsQuery",
    ),
    AgenticToolBinding(
        "get_finding_detail",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_finding_detail,
        "GetFindingDetailQuery",
    ),
    AgenticToolBinding(
        "get_symbol_context",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_symbol_context,
        "GetSymbolContextQuery",
    ),
    AgenticToolBinding(
        "get_scan_coverage",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_scan_coverage,
        "GetScanCoverageQuery",
    ),
    AgenticToolBinding(
        "search_evidence",
        AgenticToolRuntimeTarget.NEST_CQRS,
        search_evidence,
        "SearchEvidenceQuery",
    ),
    AgenticToolBinding(
        "get_evidence_subgraph",
        AgenticToolRuntimeTarget.NEST_CQRS,
        get_evidence_subgraph,
        "GetEvidenceSubgraphQuery",
    ),
    AgenticToolBinding(
        "trace_static_flow",
        AgenticToolRuntimeTarget.NEST_CQRS,
        trace_static_flow,
        "TraceStaticFlowQuery",
    ),
)


class AgenticToolDispatcher:
    """Resolve a canonical tool name once and invoke its explicit entrypoint."""

    def __init__(self, context: AgenticToolExecutionContext) -> None:
        self._context = context
        self._bindings = {
            binding.tool_name: binding for binding in SPRINT6_AGENTIC_TOOL_BINDINGS
        }
        if len(self._bindings) != len(SPRINT6_AGENTIC_TOOL_BINDINGS):
            raise ValueError("agentic tool runtime bindings must be unique")
        self._assert_catalog_coverage()

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._bindings))

    def binding(self, tool_name: str) -> AgenticToolBinding:
        binding = self._bindings.get(tool_name)
        if binding is None:
            raise AgenticToolValidationError("AGENTIC_TOOL_RUNTIME_BINDING_NOT_FOUND")
        return binding

    def dispatch(self, request: AgenticToolRequest) -> Mapping[str, object]:
        binding = self.binding(request.tool_name)
        return binding.entrypoint(request, self._context)

    def bound_handler(self, tool_name: str):
        """Return a registry-compatible callable while preserving canonical naming."""
        binding = self.binding(tool_name)

        def execute(request: AgenticToolRequest) -> Mapping[str, object]:
            return binding.entrypoint(request, self._context)

        execute.__name__ = tool_name
        execute.__qualname__ = tool_name
        return execute

    def _assert_catalog_coverage(self) -> None:
        catalog_names = {spec.name for spec in AGENTIC_TOOL_SPECS}
        binding_names = set(self._bindings)
        if binding_names != catalog_names:
            missing = sorted(catalog_names - binding_names)
            extra = sorted(binding_names - catalog_names)
            raise ValueError(
                "agentic tool runtime bindings must exactly cover the canonical catalog; "
                f"missing={missing}, extra={extra}"
            )
