"""Managed boundary for persisted Customer Interview answers."""

from __future__ import annotations

import json
from typing import Any

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
    ) -> None:
        super().__init__(config, rbac_client)
        self._root_agent = root_agent
        self._api_client = api_client
        self._dispatcher = dispatcher
        self._downstream_handler = downstream_handler

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
            if status == DUPLICATE_CONTEXT or status == STALE_CONTEXT:
                return
            if status != CURRENT_CONTEXT:
                raise ValueError(f"unexpected Interview private context status: {status}")
        elif status not in {CURRENT_CONTEXT, DUPLICATE_CONTEXT}:
            if status == STALE_CONTEXT:
                return
            raise ValueError(f"unexpected Interview private context status: {status}")

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
                raise ValueError("Targeted Interview specialist must return TARGETED_INTERVIEW mode")
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
                raise ValueError("guarded CONTEXT_READY is missing technical evidence report provenance")
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
        if outcome == "CONTEXT_RESOLVED" and not isinstance(continuation, dict):
            raise ValueError("guarded CONTEXT_RESOLVED is missing server-owned continuation")

        root = self._root_agent or self._load_root_agent()
        root.invoke(
            {
                "messages": [
                    {
                        "role": "user",
                        "content": _guarded_downstream_prompt(
                            assessment_id=assessment_id,
                            thread_id=thread_id,
                            context_revision=context_revision,
                            pge_version=pge_version,
                            outcome=outcome,
                            continuation=continuation if isinstance(continuation, dict) else None,
                        ),
                    }
                ]
            },
            config={
                "configurable": {"thread_id": thread_id},
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "context_revision": context_revision,
                    "correlationId": correlationId,
                    "trigger": "ASSESSMENT_INTERVIEW_GUARDED_CONTINUATION",
                    "guarded_interview_outcome": outcome,
                },
            },
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


def _guarded_downstream_prompt(
    *,
    assessment_id: str,
    thread_id: str,
    context_revision: int,
    pge_version: str,
    outcome: str,
    continuation: dict[str, Any] | None = None,
) -> str:
    if outcome == "CONTEXT_READY":
        action = (
            "Continue from the already-accepted guarded Initial Interview state into the "
            "existing EngineeringRule readiness/Planner flow."
        )
    else:
        action = (
            "Continue only the persisted targeted clarification path and resume the exact "
            "Investigator after validating its server-owned origin, scope and artifact pins."
        )
    continuation_clause = (
        " Resume only the exact server-owned Investigator continuation: "
        + json.dumps(continuation, ensure_ascii=False, sort_keys=True)
        if continuation is not None
        else ""
    )
    return (
        f"{action} Do not re-evaluate Customer text in Root and do not bypass the persisted "
        f"Interview guard. Assessment: {assessment_id}. Thread: {thread_id}. "
        f"Context revision: {context_revision}. PGE version: {pge_version}."
        + continuation_clause
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
