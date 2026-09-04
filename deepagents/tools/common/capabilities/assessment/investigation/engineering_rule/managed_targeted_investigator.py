"""Managed Investigator bridge for production targeted Interview continuations.

The planned pipeline remains the deterministic EngineeringRule/evaluation shell, but
production Investigator reasoning is executed through the same typed managed
Investigator definition used by Root orchestration. A NEEDS_INPUT handoff is persisted
with the exact durable child thread/checkpoint before deterministic evaluation or the
outer assessment callback can continue.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict
from threading import Lock
from typing import Any, Iterable

from langchain.agents import create_agent

from contracts.handoffs import InvestigatorResult
from middleware.specialist_handoff_validation import _persist_targeted_interview_need
from orchestration.context import LCSPRunContext
from orchestration.result_validation import validate_specialist_handoff
from subagents.investigator.definition import SUBAGENT as INVESTIGATOR_SUBAGENT
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    EvidenceClaim,
    InvestigationPacket,
)
from tools.common.capabilities.assessment.planning.engineering_rule.engineering_rule_planner import (
    EngineeringRulePlan,
    EngineeringRulePlanDecisionAudit,
)
from tools.common.capabilities.platform.graph_runtime import checkpoint_database_url


class TargetedInterviewPending(BaseException):
    """Intentional stop after a targeted need is durably queued.

    The direct planned pipeline catches ordinary ``Exception`` values and converts them
    to degraded evidence. This sentinel deliberately sits outside that catch so a
    Customer-context dependency stops before deterministic evaluation. The production
    boundary catches it explicitly after restoring the temporary Investigator adapter.
    """


class ManagedTargetedInvestigatorPipeline:
    """Swap the direct investigator for the managed specialist inside one guarded run."""

    def __init__(self, *, delegate: Any, config: Any, api_client: Any) -> None:
        self._delegate = delegate
        self._adapter = _ManagedInvestigatorAdapter(config=config, api_client=api_client)
        self._lock = Lock()

    def run(self, *args: Any, **kwargs: Any) -> Any:
        evidence_report = kwargs.get("evidence_report")
        workflow_run_id = str(kwargs.get("workflow_run_id") or "").strip()
        assessment_id = str(kwargs.get("assessment_id") or "").strip()
        user_id = str(kwargs.get("user_id") or "").strip()
        correlation_id = str(kwargs.get("correlation_id") or "").strip() or None
        if not isinstance(evidence_report, dict):
            raise RuntimeError("managed production Investigator requires evidence_report")
        if not workflow_run_id or not assessment_id or not user_id:
            raise RuntimeError(
                "managed production Investigator requires workflow, assessment and user identity"
            )

        with self._lock:
            self._adapter.begin_run(
                evidence_report=evidence_report,
                workflow_run_id=workflow_run_id,
                assessment_id=assessment_id,
                user_id=user_id,
                correlation_id=correlation_id,
            )
            previous = getattr(self._delegate, "_investigator", None)
            self._delegate._investigator = self._adapter
            try:
                return self._delegate.run(*args, **kwargs)
            finally:
                self._delegate._investigator = previous

    def __getattr__(self, name: str) -> Any:
        return getattr(self._delegate, name)


class _ManagedInvestigatorAdapter:
    def __init__(self, *, config: Any, api_client: Any) -> None:
        self._config = config
        self._api_client = api_client
        self._run: dict[str, Any] = {}

    def begin_run(
        self,
        *,
        evidence_report: dict[str, Any],
        workflow_run_id: str,
        assessment_id: str,
        user_id: str,
        correlation_id: str | None,
    ) -> None:
        checkpoint_url = checkpoint_database_url(
            getattr(self._config, "langgraph_checkpoint_database_url", None)
        )
        if not checkpoint_url:
            raise RuntimeError(
                "production managed Investigator requires LANGGRAPH_CHECKPOINT_DATABASE_URL"
            )
        self._run = {
            "workflow_run_id": workflow_run_id,
            "assessment_id": assessment_id,
            "user_id": user_id,
            "correlation_id": correlation_id,
            "checkpoint_url": checkpoint_url,
            "artifact_versions": _artifact_versions(evidence_report),
        }

    def investigate(
        self,
        *,
        packet: InvestigationPacket,
        graph: Any,
        workflow_run_id: str,
        correlation_id: str | None = None,
        code_context: Any | None = None,
    ) -> list[EvidenceClaim]:
        _ = code_context
        if not self._run:
            raise RuntimeError("managed Investigator adapter was not initialized for this run")
        if workflow_run_id != self._run["workflow_run_id"]:
            raise RuntimeError("managed Investigator workflow pin drifted")

        artifact_versions = dict(self._run["artifact_versions"])
        execution_id = _execution_id(
            assessment_id=self._run["assessment_id"],
            workflow_run_id=workflow_run_id,
            engineering_rule_id=packet.engineering_rule_id,
            artifact_versions=artifact_versions,
        )
        investigator_thread_id = f"investigator:{execution_id}"
        context = LCSPRunContext(
            assessment_id=self._run["assessment_id"],
            user_id=self._run["user_id"],
            workflow_run_id=investigator_thread_id,
            artifact_versions=artifact_versions,
            engineering_rule_ids=(packet.engineering_rule_id,),
            idempotency_key=f"investigator:{execution_id}",
        )
        handoff, checkpoint_id = _invoke_managed_investigator(
            checkpoint_url=self._run["checkpoint_url"],
            thread_id=investigator_thread_id,
            checkpoint_id=None,
            context=context,
            instruction=_initial_instruction(packet, artifact_versions),
            graph=graph,
            execution_id=execution_id,
            correlation_id=correlation_id or self._run["correlation_id"],
        )
        result = InvestigatorResult.model_validate(handoff)
        if result.status == "READY":
            return [claim.to_evidence_claim() for claim in result.claims]

        registration_context = LCSPRunContext(
            assessment_id=context.assessment_id,
            user_id=context.user_id,
            workflow_run_id=investigator_thread_id,
            checkpoint_id=checkpoint_id,
            artifact_versions=artifact_versions,
            engineering_rule_ids=context.engineering_rule_ids,
            idempotency_key=context.idempotency_key,
        )
        _persist_targeted_interview_need(
            subagent_type="investigator",
            payload=handoff,
            context=registration_context,
            metadata={"api_client": self._api_client},
            execution_id=execution_id,
        )
        raise TargetedInterviewPending(
            "managed Investigator registered a targeted Interview continuation"
        )


class ResumedManagedInvestigatorPipeline:
    """Re-enter only the deterministic gate around an exact resumed Investigator output."""

    def __init__(
        self,
        *,
        api_client: Any,
        affected_rule_ids: tuple[str, ...],
        resumed_handoff: dict[str, Any],
        confirmed_context: dict[str, Any],
    ) -> None:
        from .planned_pipeline import PlannedEngineeringInvestigationPipeline

        self._confirmed_context = dict(confirmed_context)
        self._delegate = PlannedEngineeringInvestigationPipeline(
            api_client=api_client,
            planner=_ExactResumePlanner(affected_rule_ids),
            investigator=_ResumedHandoffInvestigator(
                affected_rule_ids=affected_rule_ids,
                handoff=resumed_handoff,
            ),
        )

    def run(self, *args: Any, **kwargs: Any) -> Any:
        kwargs["confirmed_customer_context"] = dict(self._confirmed_context)
        return self._delegate.run(*args, **kwargs)

    def __getattr__(self, name: str) -> Any:
        return getattr(self._delegate, name)


class _ExactResumePlanner:
    """Deterministically reconstruct the already-pinned targeted rule scope."""

    def __init__(self, affected_rule_ids: tuple[str, ...]) -> None:
        self._affected_rule_ids = affected_rule_ids

    def plan(
        self,
        *,
        candidates: Iterable[Any],
        confirmed_customer_context: dict[str, Any] | None,
        graph: Any,
        workflow_run_id: str,
        correlation_id: str | None = None,
        openwiki_context: dict[str, Any] | None = None,
    ) -> EngineeringRulePlan:
        _ = (
            confirmed_customer_context,
            graph,
            workflow_run_id,
            correlation_id,
            openwiki_context,
        )
        rows = tuple(candidates)
        available = {str(item.engineering_rule_id) for item in rows}
        missing = sorted(set(self._affected_rule_ids) - available)
        if missing:
            raise RuntimeError(
                f"exact Investigator resume rule scope is no longer available: {missing}"
            )
        selected = tuple(
            item.engineering_rule_id
            for item in rows
            if item.engineering_rule_id in self._affected_rule_ids
        )
        skipped = tuple(
            item.engineering_rule_id
            for item in rows
            if item.engineering_rule_id not in self._affected_rule_ids
        )
        return EngineeringRulePlan(
            selected_rule_ids=selected,
            skipped_rule_ids=skipped,
            fallback_used=False,
            decision_audit=tuple(
                EngineeringRulePlanDecisionAudit(
                    engineering_rule_id=item.engineering_rule_id,
                    requested_decision="EXACT_RESUME_PIN",
                    final_decision=(
                        "SELECT"
                        if item.engineering_rule_id in self._affected_rule_ids
                        else "SKIP"
                    ),
                    reason_code="TARGETED_EXACT_RESUME_PIN",
                    basis=(),
                )
                for item in rows
            ),
        )


class _ResumedHandoffInvestigator:
    """Expose only the typed claims produced by the exact resumed child execution."""

    def __init__(
        self,
        *,
        affected_rule_ids: tuple[str, ...],
        handoff: dict[str, Any],
    ) -> None:
        self._affected_rule_ids = set(affected_rule_ids)
        self._result = InvestigatorResult.model_validate(handoff)
        if self._result.status != "READY":
            raise ValueError("resumed Investigator handoff must be READY before gate continuation")

    def investigate(
        self,
        *,
        packet: InvestigationPacket,
        graph: Any,
        workflow_run_id: str,
        correlation_id: str | None = None,
    ) -> list[EvidenceClaim]:
        _ = (graph, workflow_run_id, correlation_id)
        if packet.engineering_rule_id not in self._affected_rule_ids:
            raise RuntimeError("deterministic exact-resume pipeline escaped affectedRuleIds")
        claims = [
            claim.to_evidence_claim()
            for claim in self._result.claims
            if claim.engineering_rule_id == packet.engineering_rule_id
        ]
        if not claims:
            raise RuntimeError("exact resumed Investigator returned no claim for pinned rule")
        return claims


def resume_managed_investigator(
    *,
    config: Any,
    api_client: Any,
    assessment_id: str,
    context_revision: int,
    continuation: dict[str, Any],
    confirmed_context: dict[str, Any],
    correlation_id: str | None,
) -> dict[str, Any]:
    """Resume exactly the child Investigator thread/checkpoint stored by registration."""
    checkpoint_url = checkpoint_database_url(
        getattr(config, "langgraph_checkpoint_database_url", None)
    )
    if not checkpoint_url:
        raise RuntimeError(
            "exact Investigator resume requires LANGGRAPH_CHECKPOINT_DATABASE_URL"
        )
    thread_id = _required_text(continuation, "workflowRunId")
    checkpoint_id = _required_text(continuation, "checkpointId")
    execution_id = _required_text(continuation, "investigatorExecutionId")
    affected_rule_ids = _affected_rule_ids(continuation)
    artifact_versions = _artifact_version_map(continuation)

    report_id = str(artifact_versions.get("technicalEvidenceReportId") or "").strip()
    if not report_id:
        raise ValueError("exact Investigator resume requires technicalEvidenceReportId pin")
    evidence_report = api_client.get_accepted_technical_evidence_report(report_id)
    original_user_id = _report_user_id(evidence_report)
    graph = _evidence_graph(evidence_report)
    context = LCSPRunContext(
        assessment_id=assessment_id,
        user_id=original_user_id,
        workflow_run_id=thread_id,
        checkpoint_id=checkpoint_id,
        artifact_versions=dict(artifact_versions),
        engineering_rule_ids=affected_rule_ids,
        idempotency_key=f"resume:{execution_id}:{context_revision}",
    )
    handoff, resumed_checkpoint_id = _invoke_managed_investigator(
        checkpoint_url=checkpoint_url,
        thread_id=thread_id,
        checkpoint_id=checkpoint_id,
        context=context,
        instruction=(
            "The targeted Customer clarification passed the protected Interview guard. "
            "Continue this same Investigator execution from its stored checkpoint and fixed "
            "EngineeringRule/artifact scope. Do not restart Planner or Initial Interview. "
            "Use only the following Customer-confirmed business context as the new bounded input:\n"
            + json.dumps(confirmed_context, ensure_ascii=False, sort_keys=True)
        ),
        graph=graph,
        execution_id=execution_id,
        correlation_id=correlation_id,
    )
    if resumed_checkpoint_id == checkpoint_id:
        raise RuntimeError("exact Investigator resume did not advance its child checkpoint")
    result = InvestigatorResult.model_validate(handoff)
    return {
        "executionId": execution_id,
        "threadId": thread_id,
        "fromCheckpointId": checkpoint_id,
        "checkpointId": resumed_checkpoint_id,
        "handoff": result.model_dump(mode="json"),
    }


def complete_resumed_investigation(
    *,
    config: Any,
    api_client: Any,
    assessment_id: str,
    context_revision: int,
    continuation: dict[str, Any],
    confirmed_context: dict[str, Any],
    resumed_handoff: dict[str, Any],
    correlation_id: str,
) -> None:
    """Run the deterministic evaluation/callback without another Planner/Investigator model."""
    from .engineering_assessment_boundary import EngineeringAssessmentBoundary

    artifact_versions = _artifact_version_map(continuation)
    affected_rule_ids = _affected_rule_ids(continuation)
    report_id = str(artifact_versions.get("technicalEvidenceReportId") or "").strip()
    if not report_id:
        raise ValueError("exact resume gate continuation requires technicalEvidenceReportId")
    pipeline = ResumedManagedInvestigatorPipeline(
        api_client=api_client,
        affected_rule_ids=affected_rule_ids,
        resumed_handoff=resumed_handoff,
        confirmed_context=confirmed_context,
    )
    EngineeringAssessmentBoundary(
        config,
        api_client=api_client,
        investigation_pipeline=pipeline,
    ).handle(
        {
            "assessmentId": assessment_id,
            "evidenceReportId": report_id,
            "workflowRunId": (
                f"{_required_text(continuation, 'workflowRunId')}:gate:{context_revision}"
            ),
        },
        correlation_id,
    )


def _invoke_managed_investigator(
    *,
    checkpoint_url: str,
    thread_id: str,
    checkpoint_id: str | None,
    context: LCSPRunContext,
    instruction: str,
    graph: Any,
    execution_id: str,
    correlation_id: str | None,
) -> tuple[dict[str, Any], str]:
    from langgraph.checkpoint.postgres import PostgresSaver

    with PostgresSaver.from_conn_string(checkpoint_url) as checkpointer:
        checkpointer.setup()
        definition = INVESTIGATOR_SUBAGENT
        agent = create_agent(
            model=definition["model"],
            tools=definition["tools"],
            system_prompt=definition["system_prompt"],
            middleware=definition["middleware"],
            response_format=definition["response_format"],
            name="lcsp-investigator-durable-execution",
            checkpointer=checkpointer,
        )
        configurable: dict[str, str] = {"thread_id": thread_id}
        if checkpoint_id:
            configurable["checkpoint_id"] = checkpoint_id
        invocation = agent.invoke(
            {"messages": [{"role": "user", "content": instruction}]},
            config={
                "configurable": configurable,
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": context.assessment_id,
                    "user_id": context.user_id,
                    "investigator_execution_id": execution_id,
                    "artifact_versions": dict(context.artifact_versions),
                    "affected_rule_ids": list(context.engineering_rule_ids),
                    "correlationId": correlation_id,
                },
            },
            context=context,
        )
        if not isinstance(invocation, dict) or "structured_response" not in invocation:
            raise RuntimeError("managed Investigator did not return structured_response")
        validated = validate_specialist_handoff(
            "investigator",
            invocation["structured_response"],
            graph=graph,
            pinned_rule_ids=context.engineering_rule_ids,
            pinned_versions=dict(context.artifact_versions),
        )
        snapshot = agent.get_state({"configurable": {"thread_id": thread_id}})
        snapshot_config = getattr(snapshot, "config", None)
        checkpoint = (
            snapshot_config.get("configurable", {}).get("checkpoint_id")
            if isinstance(snapshot_config, dict)
            else None
        )
        checkpoint_text = str(checkpoint or "").strip()
        if not checkpoint_text:
            raise RuntimeError("managed Investigator did not persist a child checkpoint")
        return validated.model_dump(mode="json"), checkpoint_text


def _initial_instruction(
    packet: InvestigationPacket,
    artifact_versions: dict[str, str],
) -> str:
    bounded_packet = asdict(packet)
    bounded_packet.pop("customer_context", None)
    return (
        "Execute this already-selected EngineeringRule investigation. Preserve the fixed artifact "
        "pins exactly. If a material Customer-owned business fact is required, return one bounded "
        "NEEDS_INPUT/business_context_need; otherwise return READY claims.\n"
        + json.dumps(
            {
                "artifactVersions": artifact_versions,
                "investigationPacket": bounded_packet,
            },
            ensure_ascii=False,
            sort_keys=True,
            default=str,
        )
    )


def _artifact_versions(evidence_report: dict[str, Any]) -> dict[str, str]:
    report_id = str(
        evidence_report.get("id")
        or evidence_report.get("technical_evidence_report_id")
        or evidence_report.get("technicalEvidenceReportId")
        or ""
    ).strip()
    snapshot_id = str(
        evidence_report.get("snapshot_id")
        or evidence_report.get("snapshotId")
        or ""
    ).strip()
    if not report_id or not snapshot_id:
        raise RuntimeError(
            "managed Investigator requires technical evidence report and repository snapshot pins"
        )
    return {
        "technicalEvidenceReportId": report_id,
        "repositorySnapshotId": snapshot_id,
    }


def _artifact_version_map(continuation: dict[str, Any]) -> dict[str, str]:
    value = continuation.get("artifactVersions")
    if (
        not isinstance(value, dict)
        or not value
        or any(
            not isinstance(key, str) or not isinstance(item, str)
            for key, item in value.items()
        )
    ):
        raise ValueError("guarded continuation requires immutable artifactVersions")
    return dict(value)


def _affected_rule_ids(continuation: dict[str, Any]) -> tuple[str, ...]:
    value = continuation.get("affectedRuleIds")
    if (
        not isinstance(value, list)
        or not value
        or any(not isinstance(item, str) or not item for item in value)
    ):
        raise ValueError("guarded continuation requires affectedRuleIds")
    return tuple(dict.fromkeys(value))


def _report_user_id(evidence_report: dict[str, Any]) -> str:
    user_id = str(
        evidence_report.get("user_id") or evidence_report.get("userId") or ""
    ).strip()
    if not user_id:
        raise RuntimeError(
            "pinned technical evidence report is missing original trusted user identity"
        )
    return user_id


def _evidence_graph(evidence_report: dict[str, Any]) -> Any:
    payload = evidence_report.get("evidence_payload") or evidence_report.get(
        "evidencePayload"
    )
    if not isinstance(payload, dict):
        raise ValueError("accepted technical evidence report is missing evidence payload")
    graph = payload.get("evidence_graph") or payload.get("evidenceGraph")
    if graph is None:
        raise ValueError("accepted technical evidence report is missing Program Evidence Graph")
    return graph


def _execution_id(
    *,
    assessment_id: str,
    workflow_run_id: str,
    engineering_rule_id: str,
    artifact_versions: dict[str, str],
) -> str:
    digest = hashlib.sha256(
        json.dumps(
            {
                "assessmentId": assessment_id,
                "workflowRunId": workflow_run_id,
                "engineeringRuleId": engineering_rule_id,
                "artifactVersions": artifact_versions,
            },
            sort_keys=True,
        ).encode("utf-8")
    ).hexdigest()[:24]
    return f"investigator-exec:{digest}"


def _required_text(value: dict[str, Any], field: str) -> str:
    text = str(value.get(field) or "").strip()
    if not text:
        raise ValueError(f"guarded continuation requires {field}")
    return text


__all__ = [
    "ManagedTargetedInvestigatorPipeline",
    "ResumedManagedInvestigatorPipeline",
    "TargetedInterviewPending",
    "complete_resumed_investigation",
    "resume_managed_investigator",
]
