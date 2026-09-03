"""Managed boundary for persisted Customer Interview answers."""

from __future__ import annotations

from typing import Any

from tools.common.capabilities.managed.boundary import AgentBoundaryBase

INTERVIEW_RESUME_COMMAND = "command.assessment-interview.resume-agent.v1"


class AssessmentInterviewResumeBoundary(AgentBoundaryBase):
    """Re-enter Root Orchestration after a Customer answer is persisted."""

    boundary_source = "assessment.interview-answer-submitted"
    source_event = INTERVIEW_RESUME_COMMAND
    requires_rbac = False
    retry_delays_seconds = (30, 120, 600)

    def __init__(self, config, rbac_client=None, root_agent=None) -> None:
        super().__init__(config, rbac_client)
        self._root_agent = root_agent

    def handle(self, message: dict[str, Any], correlationId: str) -> None:
        assessment_id = _required_text(message, "assessmentId")
        thread_id = _required_text(message, "threadId")
        question_id = _required_text(message, "questionId")
        context_revision = _required_int(message, "contextRevision")
        root = self._root_agent or self._load_root_agent()
        prompt = (
            "Persisted Customer Interview answer requires governed Assessment "
            "Interview continuation. Re-enter the existing Interview thread, evaluate "
            "Customer-stated context with the Interview Agent, apply assessment_interview "
            "guardrails before any CONTEXT_READY or CONTEXT_RESOLVED transition, and only "
            "then continue EngineeringRule/Planner or exact Investigator resume. "
            "Do not infer sufficiency from HTTP persistence alone. "
            f"Assessment: {assessment_id}. Thread: {thread_id}. "
            f"Question: {question_id}. Customer context revision: {context_revision}."
        )
        root.invoke(
            {"messages": [{"role": "user", "content": prompt}]},
            config={
                "configurable": {"thread_id": thread_id},
                "metadata": {
                    "lcsp_thread_id": thread_id,
                    "assessment_id": assessment_id,
                    "question_id": question_id,
                    "context_revision": context_revision,
                    "correlationId": correlationId,
                    "trigger": "ASSESSMENT_INTERVIEW_ANSWER_SUBMITTED",
                },
            },
        )

    @staticmethod
    def _load_root_agent():
        from agent import agent

        return agent


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
