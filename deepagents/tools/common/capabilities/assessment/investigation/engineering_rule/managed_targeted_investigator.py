"""Managed Investigator bridge for production targeted Interview continuations.

The legacy planned pipeline remains the deterministic EngineeringRule/evaluation shell,
but production Investigator reasoning is executed through the same typed managed
Investigator definition used by Root orchestration. A NEEDS_INPUT handoff is persisted
with the exact child thread/checkpoint before the outer assessment callback can run.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict
from threading import Lock
from typing import Any

from langchain.agents import create_agent

from contracts.handoffs import InvestigatorResult
from middleware.specialist_handoff_validation import _persist_targeted_interview_need
from orchestration.context import LCSPRunContext
from orchestration.result_validation import validate_specialist_handoff
from subagents.investigator.definition import SUBAGENT as INVESTIGATOR_SUBAGENT
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    EvidenceClaim,
    InvestigationPacket,
)
from tools.common.capabilities.platform.graph_runtime import checkpoint_database_url


class TargetedInterviewPending(RuntimeError):
    """Intentional production stop after a targeted Interview need is durably queued."""


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
                result = self._delegate.run(*args, **kwargs)
            finally:
                self._delegate._investigator = previous
            if self._adapter.targeted_registered:
                raise TargetedInterviewPending(
                    "managed Investigator registered a targeted Interview continuation"
                )
            return result

    def __getattr__(self, name: str) -> Any:
        return getattr(self._delegate, name)


class _ManagedInvestigatorAdapter:
    def __init__(self, *, config: Any, api_client: Any) -> None:
        self._config = config
        self._api_client = api_client
        self._run: dict[str, Any] = {}
        self.targeted_registered = False

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
            "evidence_report": evidence_report,
            "workflow_run_id": workflow_run_id,
            "assessment_id": assessment_id,
            "user_id": user_id,
            "correlation_id": correlation_id,
            "checkpoint_url": checkpoint_url,
            "artifact_versions": _artifact_versions(evidence_report),
        }
        self.targeted_registered = False

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
        if self.targeted_registered:
            return [_pending_claim(packet)]

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
            api_client=self._api_client,
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
            metadata={"api_client": self._api_client, "program_graph": graph},
            execution_id=execution_id,
        )
        self.targeted_registered = True
        return [_pending_claim(packet)]


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
    affected_rule_ids = continuation.get("affectedRuleIds")
    artifact_versions = continuation.get("artifactVersions")
    if (
        not isinstance(affected_rule_ids, list)
        or not affected_rule_ids
        or any(not isinstance(item, str) or not item for item in affected_rule_ids)
    ):
        raise ValueError("guarded continuation requires affectedRuleIds")
    if (
        not isinstance(artifact_versions, dict)
        or not artifact_versions
        or any(
            not isinstance(key, str) or not isinstance(value, str)
            for key, value in artifact_versions.items()
        )
    ):
        raise ValueError("guarded continuation requires immutable artifactVersions")

    report_id = str(artifact_versions.get("technicalEvidenceReportId") or "").strip()
    if not report_id:
        raise ValueError("exact Investigator resume requires technicalEvidenceReportId pin")
    evidence_report = api_client.get_accepted_technical_evidence_report(report_id)
    graph = _evidence_graph(evidence_report)
    context = LCSPRunContext(
        assessment_id=assessment_id,
        workflow_run_id=thread_id,
        checkpoint_id=checkpoint_id,
        artifact_versions=dict(artifact_versions),
        engineering_rule_ids=tuple(affected_rule_ids),
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
        api_client=api_client,
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


def _invoke_managed_investigator(
    *,
    checkpoint_url: str,
    thread_id: str,
    checkpoint_id: str | None,
    context: LCSPRunContext,
    instruction: str,
    graph: Any,
    api_client: Any,
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
                    "investigator_execution_id": execution_id,
                    "artifact_versions": dict(context.artifact_versions),
                    "affected_rule_ids": list(context.engineering_rule_ids),
                    "correlationId": correlation_id,
                    "api_client": api_client,
                    "program_graph": graph,
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


def _evidence_graph(evidence_report: dict[str, Any]) -> Any:
    payload = evidence_report.get("evidence_payload") or evidence_report.get("evidencePayload")
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


def _pending_claim(packet: InvestigationPacket) -> EvidenceClaim:
    return EvidenceClaim(
        claim_id=f"claim:targeted-interview-pending:{packet.engineering_rule_id}",
        engineering_rule_id=packet.engineering_rule_id,
        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
        value=None,
        evidence_refs=tuple(packet.evidence_refs),
        confidence=0.0,
        limitations=(
            ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],
        ),
    )


def _required_text(value: dict[str, Any], field: str) -> str:
    text = str(value.get(field) or "").strip()
    if not text:
        raise ValueError(f"guarded continuation requires {field}")
    return text


__all__ = [
    "ManagedTargetedInvestigatorPipeline",
    "TargetedInterviewPending",
    "resume_managed_investigator",
]
