"""Single runtime binding index and dispatchers for LCSP tools."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Callable, Mapping

from .catalog import AGENTIC_TOOL_SPECS
from .registry import AgenticToolRequest, AgenticToolValidationError
from .scanner_tool_entrypoints import (
    ScannerToolExecutionContext,
    build_evidence_graph,
    classify_workspace_languages,
    materialize_snapshot,
    run_deptry_usage_analysis,
    run_knip_usage_analysis,
    run_python_semantic_analysis,
    run_semgrep_rules,
    run_structural_augmentation,
    run_syft_inventory,
    run_ts_js_semantic_analysis,
    validate_evidence_report,
)
from .tool_entrypoints import (
    AgenticToolExecutionContext,
    evaluate_gap_matrix,
    find_provider_invocations,
    find_similar_symbols,
    get_artifact_chain,
    get_assessment_context,
    get_classification_baseline,
    get_evidence_subgraph,
    get_finding_detail,
    get_gap_evidence_trace,
    get_legal_corpus_readiness,
    get_legal_rule_match,
    get_reconciliation_context,
    get_scan_coverage,
    get_symbol_context,
    get_verified_profile,
    inspect_data_path,
    inspect_decision_path,
    inspect_deployment_context,
    inspect_human_review_path,
    propose_gap_remediation,
    propose_missing_targets,
    request_targeted_reanalysis,
    resume_waiting_runs,
    retrieve_legal_basis,
    search_evidence,
    trace_static_flow,
    validate_citation_set,
    validate_classification_proposal,
)


class ToolRuntimeTarget(str, Enum):
    """Execution mechanism reached after canonical tool-name resolution."""

    NEST_CQRS = "NEST_CQRS"
    PYTHON_WORKER_BRIDGE = "PYTHON_WORKER_BRIDGE"
    PYTHON_LOCAL = "PYTHON_LOCAL"


# Backward-compatible public name used by existing imports.
AgenticToolRuntimeTarget = ToolRuntimeTarget


@dataclass(frozen=True)
class ToolBinding:
    """Discoverable mapping from canonical tool name to its execution boundary."""

    tool_name: str
    runtime_target: ToolRuntimeTarget
    entrypoint: Callable[..., object]
    downstream_target: str

    def __post_init__(self) -> None:
        if self.entrypoint.__name__ != self.tool_name:
            raise ValueError(
                "tool entrypoint name must exactly match canonical tool name: "
                f"{self.tool_name} != {self.entrypoint.__name__}"
            )


# Backward-compatible alias while callers migrate to the generic name.
AgenticToolBinding = ToolBinding


SPRINT6_AGENTIC_TOOL_BINDINGS: tuple[ToolBinding, ...] = (
    ToolBinding(
        "resume_waiting_runs",
        ToolRuntimeTarget.PYTHON_WORKER_BRIDGE,
        resume_waiting_runs,
        "PythonWorkerRuntimeClient.resumeWaitingRuns",
    ),
    ToolBinding(
        "request_targeted_reanalysis",
        ToolRuntimeTarget.PYTHON_WORKER_BRIDGE,
        request_targeted_reanalysis,
        "PythonWorkerRuntimeClient.requestTargetedReanalysis",
    ),
    ToolBinding(
        "propose_gap_remediation",
        ToolRuntimeTarget.NEST_CQRS,
        propose_gap_remediation,
        "ProposeGapRemediationQuery",
    ),
    ToolBinding(
        "get_gap_evidence_trace",
        ToolRuntimeTarget.NEST_CQRS,
        get_gap_evidence_trace,
        "GetGapEvidenceTraceQuery",
    ),
    ToolBinding(
        "get_reconciliation_context",
        ToolRuntimeTarget.NEST_CQRS,
        get_reconciliation_context,
        "GetReconciliationContextQuery",
    ),
    ToolBinding(
        "propose_missing_targets",
        ToolRuntimeTarget.NEST_CQRS,
        propose_missing_targets,
        "ProposeMissingTargetsQuery",
    ),
    ToolBinding(
        "inspect_deployment_context",
        ToolRuntimeTarget.NEST_CQRS,
        inspect_deployment_context,
        "InspectDeploymentContextQuery",
    ),
    ToolBinding(
        "inspect_decision_path",
        ToolRuntimeTarget.NEST_CQRS,
        inspect_decision_path,
        "InspectDecisionPathQuery",
    ),
    ToolBinding(
        "get_artifact_chain",
        ToolRuntimeTarget.NEST_CQRS,
        get_artifact_chain,
        "GetArtifactChainQuery",
    ),
    ToolBinding(
        "find_similar_symbols",
        ToolRuntimeTarget.NEST_CQRS,
        find_similar_symbols,
        "FindSimilarSymbolsQuery",
    ),
    ToolBinding(
        "inspect_human_review_path",
        ToolRuntimeTarget.NEST_CQRS,
        inspect_human_review_path,
        "InspectHumanReviewPathQuery",
    ),
    ToolBinding(
        "inspect_data_path",
        ToolRuntimeTarget.NEST_CQRS,
        inspect_data_path,
        "InspectDataPathQuery",
    ),
    ToolBinding(
        "find_provider_invocations",
        ToolRuntimeTarget.NEST_CQRS,
        find_provider_invocations,
        "FindProviderInvocationsQuery",
    ),
    ToolBinding(
        "get_finding_detail",
        ToolRuntimeTarget.NEST_CQRS,
        get_finding_detail,
        "GetFindingDetailQuery",
    ),
    ToolBinding(
        "get_symbol_context",
        ToolRuntimeTarget.NEST_CQRS,
        get_symbol_context,
        "GetSymbolContextQuery",
    ),
    ToolBinding(
        "get_scan_coverage",
        ToolRuntimeTarget.NEST_CQRS,
        get_scan_coverage,
        "GetScanCoverageQuery",
    ),
    ToolBinding(
        "search_evidence",
        ToolRuntimeTarget.NEST_CQRS,
        search_evidence,
        "SearchEvidenceQuery",
    ),
    ToolBinding(
        "get_evidence_subgraph",
        ToolRuntimeTarget.NEST_CQRS,
        get_evidence_subgraph,
        "GetEvidenceSubgraphQuery",
    ),
    ToolBinding(
        "trace_static_flow",
        ToolRuntimeTarget.NEST_CQRS,
        trace_static_flow,
        "TraceStaticFlowQuery",
    ),
)


# These names are already executable through InternalAgenticToolDispatchController
# but are not yet registered in the Python LLM-callable catalog. Keeping their
# binding rows here makes the runtime path discoverable without widening model access.
NEST_CQRS_DISCOVERY_BINDINGS: tuple[ToolBinding, ...] = (
    ToolBinding(
        "get_assessment_context",
        ToolRuntimeTarget.NEST_CQRS,
        get_assessment_context,
        "GetAssessmentContextQuery",
    ),
    ToolBinding(
        "get_verified_profile",
        ToolRuntimeTarget.NEST_CQRS,
        get_verified_profile,
        "GetVerifiedProfileQuery",
    ),
    ToolBinding(
        "get_classification_baseline",
        ToolRuntimeTarget.NEST_CQRS,
        get_classification_baseline,
        "GetClassificationBaselineQuery",
    ),
    ToolBinding(
        "validate_classification_proposal",
        ToolRuntimeTarget.NEST_CQRS,
        validate_classification_proposal,
        "ValidateClassificationProposalQuery",
    ),
    ToolBinding(
        "evaluate_gap_matrix",
        ToolRuntimeTarget.NEST_CQRS,
        evaluate_gap_matrix,
        "EvaluateGapMatrixQuery",
    ),
    ToolBinding(
        "get_legal_corpus_readiness",
        ToolRuntimeTarget.NEST_CQRS,
        get_legal_corpus_readiness,
        "GetLegalCorpusReadinessQuery",
    ),
    ToolBinding(
        "retrieve_legal_basis",
        ToolRuntimeTarget.NEST_CQRS,
        retrieve_legal_basis,
        "RetrieveLegalBasisQuery",
    ),
    ToolBinding(
        "get_legal_rule_match",
        ToolRuntimeTarget.NEST_CQRS,
        get_legal_rule_match,
        "GetLegalRuleMatchQuery",
    ),
    ToolBinding(
        "validate_citation_set",
        ToolRuntimeTarget.NEST_CQRS,
        validate_citation_set,
        "ValidateCitationSetQuery",
    ),
)


AO1_SCANNER_TOOL_BINDINGS: tuple[ToolBinding, ...] = (
    ToolBinding(
        "materialize_snapshot",
        ToolRuntimeTarget.PYTHON_LOCAL,
        materialize_snapshot,
        "ScannerWorkspace.materialize",
    ),
    ToolBinding(
        "classify_workspace_languages",
        ToolRuntimeTarget.PYTHON_LOCAL,
        classify_workspace_languages,
        "LanguageClassifier.classify_workspace",
    ),
    ToolBinding(
        "run_syft_inventory",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_syft_inventory,
        "SyftTool.run",
    ),
    ToolBinding(
        "run_semgrep_rules",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_semgrep_rules,
        "SemgrepTool.run",
    ),
    ToolBinding(
        "run_knip_usage_analysis",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_knip_usage_analysis,
        "KnipTool.run",
    ),
    ToolBinding(
        "run_deptry_usage_analysis",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_deptry_usage_analysis,
        "DeptryTool.run",
    ),
    ToolBinding(
        "run_ts_js_semantic_analysis",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_ts_js_semantic_analysis,
        "TsJsBridge.analyze",
    ),
    ToolBinding(
        "run_python_semantic_analysis",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_python_semantic_analysis,
        "PythonAnalyzer.analyze",
    ),
    ToolBinding(
        "run_structural_augmentation",
        ToolRuntimeTarget.PYTHON_LOCAL,
        run_structural_augmentation,
        "StructuralAugmentor.augment",
    ),
    ToolBinding(
        "build_evidence_graph",
        ToolRuntimeTarget.PYTHON_LOCAL,
        build_evidence_graph,
        "EvidenceGraphAssembler.assemble",
    ),
    ToolBinding(
        "validate_evidence_report",
        ToolRuntimeTarget.PYTHON_LOCAL,
        validate_evidence_report,
        "validate_schema + assert_privacy_flags + classify_quality",
    ),
)


ALL_TOOL_BINDINGS: tuple[ToolBinding, ...] = (
    *SPRINT6_AGENTIC_TOOL_BINDINGS,
    *NEST_CQRS_DISCOVERY_BINDINGS,
    *AO1_SCANNER_TOOL_BINDINGS,
)

_TOOL_BINDING_INDEX = {binding.tool_name: binding for binding in ALL_TOOL_BINDINGS}
if len(_TOOL_BINDING_INDEX) != len(ALL_TOOL_BINDINGS):
    raise RuntimeError("canonical tool runtime bindings must be globally unique")


def runtime_binding(tool_name: str) -> ToolBinding:
    """Resolve one canonical tool name to its runtime target and implementation seam."""
    binding = _TOOL_BINDING_INDEX.get(tool_name)
    if binding is None:
        raise AgenticToolValidationError("TOOL_RUNTIME_BINDING_NOT_FOUND")
    return binding


def tool_runtime_manifest() -> tuple[dict[str, str], ...]:
    """Return a deterministic debug view of every centrally registered tool binding."""
    return tuple(
        {
            "tool_name": binding.tool_name,
            "runtime_target": binding.runtime_target.value,
            "entrypoint": binding.entrypoint.__name__,
            "downstream_target": binding.downstream_target,
        }
        for binding in sorted(ALL_TOOL_BINDINGS, key=lambda item: item.tool_name)
    )


class AgenticToolDispatcher:
    """Dispatch validated AgenticToolRequest objects through explicit bindings."""

    def __init__(self, context: AgenticToolExecutionContext) -> None:
        self._context = context
        self._bindings = {
            binding.tool_name: binding for binding in SPRINT6_AGENTIC_TOOL_BINDINGS
        }
        self._assert_catalog_coverage()

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._bindings))

    def binding(self, tool_name: str) -> ToolBinding:
        binding = self._bindings.get(tool_name)
        if binding is None:
            raise AgenticToolValidationError("AGENTIC_TOOL_RUNTIME_BINDING_NOT_FOUND")
        return binding

    def dispatch(self, request: AgenticToolRequest) -> Mapping[str, object]:
        binding = self.binding(request.tool_name)
        return binding.entrypoint(request, self._context)  # type: ignore[return-value]

    def bound_handler(self, tool_name: str):
        """Return a registry-compatible callable while preserving canonical naming."""
        binding = self.binding(tool_name)

        def execute(request: AgenticToolRequest) -> Mapping[str, object]:
            return binding.entrypoint(request, self._context)  # type: ignore[return-value]

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


class ScannerToolDispatcher:
    """Dispatch AO-1 system tools through exact-name local Python entrypoints."""

    def __init__(self, context: ScannerToolExecutionContext) -> None:
        self._context = context
        self._bindings = {
            binding.tool_name: binding for binding in AO1_SCANNER_TOOL_BINDINGS
        }

    def names(self) -> tuple[str, ...]:
        return tuple(sorted(self._bindings))

    def binding(self, tool_name: str) -> ToolBinding:
        binding = self._bindings.get(tool_name)
        if binding is None:
            raise AgenticToolValidationError("SCANNER_TOOL_RUNTIME_BINDING_NOT_FOUND")
        return binding

    def dispatch(self, tool_name: str, **tool_input: object):
        binding = self.binding(tool_name)
        return binding.entrypoint(tool_input, self._context)
