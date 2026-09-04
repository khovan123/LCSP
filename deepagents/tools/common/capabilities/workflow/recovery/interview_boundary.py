"""Managed boundary for persisted Customer Interview answers."""

from __future__ import annotations

import json
from typing import Any, Callable

from tools.common.capabilities.managed.boundary import AgentBoundaryBase

INTERVIEW_RESUME_COMMAND = "command.assessment-interview.resume-agent.v1"
CURRENT_CONTEXT = "CURRENT"
DUPLICATE_CONTEXT = "DUPLICATE"
STALE_CONTEXT = "STALE"
STALE_PROVENANCE_CONTEXT = "STALE_PROVENANCE"


class AssessmentInterviewResumeBoundary(AgentBoundaryBase):
    """Run Interview reasoning, persist its guarded result, then resume orchestration."""

    boundary_source = "assessment.interview-answer-submitted"
    source_event = INTERVIEW_RESUME_COMMAND
    requires_rbac = False
    retry_delays_seconds = (30, 120, 600)

    def __init__(
        self,
        config,
        rbac_client=None,
        root_agent=None,
        api_client=None,
        dispatcher=None,
        downstream_handler=None,
        investigator_resumer: Callable[..., dict[str, Any]] | None = None,
        investigation_completer: Callable[..., None] | None = None,
    ) -> None:
        super().__init__(config, rbac_client)
        self._root_agent = root_agent
        self._api_client = api_client
        self._dispatcher = dispatcher
        self._downstream_handler = downstream_handler
        self._investigator_resumer = investigator_resumer
        self._investigation_completer = investigation_completer

    def handle(self, message: dict[str, Any], correlationId: str) -> None:
        assessment_id = _required_text(message, "assessmentId")
        thread_id = _required_text(message, "threadId")
        question_id = _required_text(message, "questionId")
        source_version = _required_text(message, "sourceVersion")
        pge_version = _required_text(message, "pgeVersion")
        context_revision = _required_int(message, "contextRevision")
        resume_reason = _required_text(message, "resumeReason")
        api_client = self._api_client or self._load_api_client()

        context = api_client.get_interview_private_context(
            assessment_id,
            context_revision,
            source_version=source_version,
            pge_version=pge_version,
        )
        status = str(context.get("status") or "")
        if status == STALE_PROVENANCE_CONTEXT:
            self._reenter_root_for_revalidation(
                assessment_id=assessment_id,
                thread_id=thread_id,
                question_id=question_id,
                context_revision=context_revision,
                correlationId=correlationId,
                root=self._root_agent or self._load_root_agent(),
            )
            return

        targeted_need = context.get("targetedNeed")
        targeted_mode = isinstance(targeted_need, dict)
        same_revision_resume = resume_reason == "PROVIDE_MORE_CONTEXT" or targeted_mode
        if not same_revision_resume:
            if status in {DUPLICATE_CONTEXT, STALE_CONTEXT}:
                return
            if status != CURRENT_CONTEXT:
                raise ValueError(f"unexpected Interview private context status: {status}")
        else:
            if status == STALE_CONTEXT:
                return
            if status not in {CURRENT_CONTEXT, DUPLICATE_CONTEXT}:
                raise ValueError(f"unexpected Interview private context status: {status}")
            if status == DUPLICATE_CONTEXT and _same_revision_resume_materialized(context):
                # Targeted registration and PROVIDE_MORE_CONTEXT intentionally reuse the
                # current context revision for their first worker command. Once the
                # resulting question/terminal decision is materialized, broker redelivery
                # must be a no-op before any Interview model invocation.
                return

        decision = self._run_interview(
            assessment_id=assessment_id,
            thread_id=thread_id,
            question_id=question_id,
            context_revision=context_revision,
            resume_reason=resume_reason,
            context=context,
            correlationId=correlationId,
        )
        guarded_state = api_client.post_interview_agent_decision(
            assessment_id,
            decision,
        )
        self._continue_after_guard(
            assessment_id=assessment_id,
            thread_id=thread_id,
            question_id=question_id,
            context_revision=context_revision,
            source_version=source_version,
            pge_version=pge_version,
            guarded_state=guarded_state,
            correlationId=correlationId,
        )

    def _run_interview(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        resume_reason: str,
        context: dict[str, Any],
        correlationId: str,
    ) -> dict[str, Any]:
        dispatcher = self._dispatcher or self._load_dispatcher()
        instruction = _interview_instruction(
            assessment_id=assessment_id,
            question_id=question_id,
            context_revision=context_revision,
            resume_reason=resume_reason,
            context=context,
        )
        result = dispatcher.dispatch(
            subagent_type="interview",
            instruction=instruction,
            idempotency_key=(
                f"assessment-interview:{assessment_id}:{context_revision}:{resume_reason}"
            ),
            trigger=resume_reason,
            metadata={
                "assessment_id": assessment_id,
                "question_id": question_id,
                "context_revision": context_revision,
                "correlationId": correlationId,
            },
            thread_id=thread_id,
            reenter_root=False,
        )
        handoff = result.get("handoff") if isinstance(result, dict) else None
        if not isinstance(handoff, dict):
            raise ValueError("Interview specialist did not return a validated handoff")
        handoff["expectedContextRevision"] = context_revision
        targeted_need = context.get("targetedNeed")
        if isinstance(targeted_need, dict):
            if handoff.get("mode") != "TARGETED_INTERVIEW":
                raise ValueError(
                    "Targeted Interview specialist must return TARGETED_INTERVIEW mode"
                )
            question = handoff.get("activeQuestion")
            if isinstance(question, dict) and question.get("needId") not in {
                None,
                targeted_need.get("needId"),
            }:
                raise ValueError("Targeted Interview question escaped its registered need")
        return handoff

    def _continue_after_guard(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        source_version: str,
        pge_version: str,
        guarded_state: dict[str, Any],
        correlationId: str,
    ) -> None:
        outcome = str(guarded_state.get("outcome") or "")
        if outcome not in {"CONTEXT_READY", "CONTEXT_RESOLVED"}:
            return
        if self._downstream_handler is not None:
            self._downstream_handler(
                {
                    "assessmentId": assessment_id,
                    "threadId": thread_id,
                    "questionId": question_id,
                    "contextRevision": context_revision,
                    "sourceVersion": source_version,
                    "pgeVersion": pge_version,
                    "outcome": outcome,
                },
                correlationId,
            )
            return
        if outcome == "CONTEXT_READY":
            evidence_report_id = pge_version.split(":", 1)[0].strip()
            if not evidence_report_id:
                raise ValueError(
                    "guarded CONTEXT_READY is missing technical evidence report provenance"
                )
            from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
                InterviewGatedEngineeringAssessmentBoundary,
            )

            InterviewGatedEngineeringAssessmentBoundary(
                self._config,
                api_client=self._api_client,
            ).handle(
                {
                    "assessmentId": assessment_id,
                    "evidenceReportId": evidence_report_id,
                    "workflowRunId": thread_id,
                },
                correlationId,
            )
            return

        continuation = guarded_state.get("continuation")
        if not isinstance(continuation, dict):
            raise ValueError(
                "guarded CONTEXT_RESOLVED is missing server-owned continuation"
            )
        confirmed_context = guarded_state.get("confirmedContext")
        if not isinstance(confirmed_context, dict):
            raise ValueError(
                "guarded CONTEXT_RESOLVED is missing authoritative confirmedContext"
            )

        self._resume_exact_investigator(
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=confirmed_context,
            correlationId=correlationId,
        )

    def _resume_exact_investigator(
        self,
        *,
        assessment_id: str,
        context_revision: int,
        continuation: dict[str, Any],
        confirmed_context: dict[str, Any],
        correlationId: str,
    ) -> None:
        resumer = self._investigator_resumer
        if resumer is None:
            from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
                resume_managed_investigator,
            )

            resumer = resume_managed_investigator

        api_client = self._api_client or self._load_api_client()
        result = resumer(
            config=self._config,
            api_client=api_client,
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=confirmed_context,
            correlation_id=correlationId,
        )
        if not isinstance(result, dict):
            raise RuntimeError("exact Investigator resume returned an invalid result")
        if result.get("executionId") != continuation.get("investigatorExecutionId"):
            raise RuntimeError("exact Investigator resume execution identity drifted")
        if result.get("threadId") != continuation.get("workflowRunId"):
            raise RuntimeError("exact Investigator resume thread identity drifted")
        if result.get("fromCheckpointId") != continuation.get("checkpointId"):
            raise RuntimeError("exact Investigator resume checkpoint identity drifted")
        handoff = result.get("handoff")
        if not isinstance(handoff, dict):
            raise RuntimeError("exact Investigator resume did not return a typed handoff")
        if handoff.get("status") != "READY":
            raise RuntimeError(
                "exact Investigator resume must complete the original bounded investigation"
            )

        completer = self._investigation_completer
        if completer is None:
            from tools.common.capabilities.assessment.investigation.engineering_rule.managed_targeted_investigator import (
                complete_resumed_investigation,
            )

            completer = complete_resumed_investigation
        completer(
            config=self._config,
            api_client=api_client,
            assessment_id=assessment_id,
            context_revision=context_revision,
            continuation=continuation,
            confirmed_context=confirmed_context,
            resumed_handoff=handoff,
            correlation_id=correlationId,
        )

    def _reenter_root_for_revalidation(
        self,
        *,
        assessment_id: str,
        thread_id: str,
        question_id: str,
        context_revision: int,
        correlationId: str,
        root: Any,
    ) -> None:
        root.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": (
                            "Persisted Customer Interview context was stale against current "
                            "source/PGE provenance. Revalidate via Root Orchestration before "
                            "any Interview Agent sufficiency or downstream resume. "
                            f"Assessment: {assessment_id}. Thread: {thread_id}. "
                            f"Question: {question_id}. Requested revision: {context_revision}."
                        ),
                    }
                ]
            },
            config={
                "configurable": {"thread_id": thread_id},
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "question_id": question_id,
                    "context_revision": context_revision,
                    "correlationId": correlationId,
                    "trigger": "ASSESSMENT_INTERVIEW_REVALIDATION_REQUIRED",
                },
            },
        )

    def _load_api_client(self):
        from tools.common.capabilities.platform.api_client import WorkerApiClient
        from tools.common.capabilities.platform.config import load_config

        config = load_config()
        return WorkerApiClient(config.nestjs_api_base_url, config.worker_api_key)

    @staticmethod
    def _load_dispatcher():
        from orchestration.dispatcher import RootSubagentDispatcher

        return RootSubagentDispatcher()

    @staticmethod
    def _load_root_agent():
        from agent import agent

        return agent


def _same_revision_resume_materialized(context: dict[str, Any]) -> bool:
    state = context.get("publicState")
    if not isinstance(state, dict):
        return False
    if isinstance(state.get("activeQuestion"), dict):
        return True
    outcome = str(state.get("outcome") or "")
    if outcome in {"CONTEXT_READY", "CONTEXT_RESOLVED", "FAILED"}:
        return True
    return state.get("orchestrationRequested") is False


def _interview_instruction(
    *,
    assessment_id: str,
    question_id: str,
    context_revision: int,
    resume_reason: str,
    context: dict[str, Any],
) -> str:
    private_revision = context.get("privateRevision")
    public_state = context.get("publicState")
    bounded_payload = {
        "assessmentId": assessment_id,
        "questionId": question_id,
        "contextRevision": context_revision,
        "resumeReason": resume_reason,
        "sourceVersion": context.get("sourceVersion"),
        "pgeVersion": context.get("pgeVersion"),
        "publicThreadState": public_state,
        "privateCustomerRevision": private_revision,
        "targetedNeed": context.get("targetedNeed"),
    }
    return (
        "Evaluate exactly one governed Assessment Interview turn. The JSON below is a "
        "private worker-only input and must not be copied into Customer-safe evidence or "
        "downstream prompts. Preserve hedging/contradictions, choose ASK vs CLARIFY, and "
        "return only the typed InterviewResult candidate. HTTP persistence is not proof "
        "of sufficiency. PROVIDE_MORE_CONTEXT means author the next bounded question from "
        "the existing thread; do not restart a targeted Interview.\n\n"
        + json.dumps(bounded_payload, ensure_ascii=False, sort_keys=True)
    )


def _required_text(message: dict[str, Any], field: str) -> str:
    value = str(message.get(field) or "").strip()
    if not value:
        raise ValueError(f"assessment Interview resume command requires {field}")
    return value


def _required_int(message: dict[str, Any], field: str) -> int:
    value = message.get(field)
    if not isinstance(value, int) or value < 0:
        raise ValueError(f"assessment Interview resume command requires numeric {field}")
    return value
