from __future__ import annotations

from unittest.mock import patch

from tools.common.capabilities.workflow.recovery.interview_pause_boundary import (
    INTERRUPTED_BOUNDARY_NAME,
    INTERVIEW_PAUSE_COMMAND,
    AssessmentInterviewPauseBoundary,
)


def test_handle_interrupts_the_interview_resume_boundarys_active_run() -> None:
    boundary = AssessmentInterviewPauseBoundary(config=object())
    message = {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"}

    with patch(
        "tools.common.capabilities.workflow.recovery.interview_pause_boundary.interrupt_agent_runtime_run"
    ) as interrupt:
        boundary.handle(message, "correlation-1")

    interrupt.assert_called_once_with(
        INTERRUPTED_BOUNDARY_NAME, message, "correlation-1"
    )


def test_boundary_source_event_matches_the_published_command() -> None:
    assert (
        AssessmentInterviewPauseBoundary.source_event == INTERVIEW_PAUSE_COMMAND
    )
    assert INTERRUPTED_BOUNDARY_NAME == "assessment_interview_resume_requested"
