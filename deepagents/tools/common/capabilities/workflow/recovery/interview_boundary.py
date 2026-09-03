"""Managed boundary for persisted Customer Interview answers."""

from __future__ import annotations

from typing import Any

from tools.common.capabilities.managed.boundary import AgentBoundaryBase

INTERVIEW_RESUME_COMMAND = "command.assessment-interview.resume-agent.v1"
CURRENT_CONTEXT = "CURRENT"
DUPLICATE_CONTEXT = "DUPLICATE"
STALE_CONTEXT = "STALE"
STALE_PROVENANCE_CONTEXT = "STALE_PROVENANCE"


class AssessmentInterviewResumeBoundary(AgentBoundaryBase):
    """Re-enter Root Orchestration after a Customer answer is persisted."""

    boundary_source = "assessment.interview-answer-submitted"
    source_event = INTERVIEW_RESUME_COMMAND
    requires_rbac = False
    retry_delays_seconds = (30, 120, 600)

    def __init__(self, config, rbac_client=None, root_agent=None, api_client=None) -> None:
        super().__init__(config, rbac_client)
        self._root_agent = root_agent
        self._api_client = api_client

    def handle(self, message: dict[str, Any], correlationId: str) -> None:
        assessment_id = _required_text(message, "assessmentId")
        thread_id = _required_text(message, "threadId")
        question_id = _required_text(message, "questionId")
        source_version = _required_text(message, "sourceVersion")
        pge_version = _required_text(message, "pgeVersion")
        context_revision = _required_int(message, "contextRevision")
        resume_reason = _required_text(message, "resumeReason")
        root = self._root_agent or self._load_root_agent()
        if resume_reason == "PROVIDE_MORE_CONTEXT":
            root.invoke(
                {"messages": [{"role": "user", "content": _provide_more_context_prompt(assessment_id, thread_id, question_id, context_revision)}]},
                config={
                    "configurable": {"thread_id": thread_id},
                    "metadata": {
                        "lcsp_thread_id": thread_id,
                        "assessment_id": assessment_id,
                        "question_id": question_id,
                        "context_revision": context_revision,
                        "resume_reason": resume_reason,
                        "correlationId": correlationId,
                        "trigger": "ASSESSMENT_INTERVIEW_PROVIDE_MORE_CONTEXT",
                    },
                },
            )
            return

        api_client = self._api_client or self._load_api_client()
        context = api_client.get_interview_private_context(
            assessment_id,
            context_revision,
            source_version=source_version,
            pge_version=pge_version,
        )
        status = str(context.get("status") or "")
        if status == DUPLICATE_CONTEXT:
            return
        if status == STALE_CONTEXT:
            return
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
        if status != CURRENT_CONTEXT:
            raise ValueError(f"unexpected Interview private context status: {status}")

        root = self._root_agent or self._load_root_agent()
        result = root.invoke(
            {"messages": [{"role": "user", "content": _resume_prompt(assessment_id, thread_id, question_id, context_revision)}]},
            config={
                "configurable": {"thread_id": thread_id},
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "question_id": question_id,
                    "context_revision": context_revision,
                    "private_context_status": status,
                    "private_context_available": True,
                    "correlationId": correlationId,
                    "trigger": "ASSESSMENT_INTERVIEW_ANSWER_SUBMITTED",
                },
            },
        )
        decision = _extract_interview_decision(result)
        if decision is not None:
            api_client.post_interview_agent_decision(assessment_id, decision)

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
    def _load_root_agent():
        from agent import agent

        return agent


def _provide_more_context_prompt(
    assessment_id: str,
    thread_id: str,
    question_id: str,
    context_revision: int,
) -> str:
    return (
        "Customer selected PROVIDE_MORE_CONTEXT for the current Assessment Interview. "
        "Re-enter the existing Interview thread and let the Interview Agent produce "
        "the next bounded Customer-facing question without restarting Initial Interview "
        "when the thread is a targeted clarification. Do not treat this unresolved "
        "business state as FAILED. "
        f"Assessment: {assessment_id}. Thread: {thread_id}. "
        f"Question: {question_id}. Context revision: {context_revision}."
    )


def _resume_prompt(
    assessment_id: str,
    thread_id: str,
    question_id: str,
    context_revision: int,
) -> str:
    return (
        "Persisted Customer Interview answer requires governed Assessment "
        "Interview continuation. Re-enter the existing Interview thread, retrieve "
        "the private Customer context revision through the internal worker API, evaluate "
        "Customer-stated context with the Interview Agent, apply assessment_interview "
        "guardrails before any CONTEXT_READY or CONTEXT_RESOLVED transition, and only "
        "then continue EngineeringRule/Planner or exact Investigator resume. "
        "Do not infer sufficiency from HTTP persistence alone. "
        f"Assessment: {assessment_id}. Thread: {thread_id}. "
        f"Question: {question_id}. Customer context revision: {context_revision}."
    )


def _extract_interview_decision(result: Any) -> dict[str, Any] | None:
    if not isinstance(result, dict):
        return None
    candidate = result.get("interviewDecision")
    if isinstance(candidate, dict):
        return candidate
    structured = result.get("structured_response")
    if isinstance(structured, dict) and isinstance(structured.get("interviewDecision"), dict):
        return structured["interviewDecision"]
    return None


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
