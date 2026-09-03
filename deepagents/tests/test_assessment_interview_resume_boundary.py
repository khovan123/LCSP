from types import SimpleNamespace

import pytest

from tools.common.capabilities.managed.invocation import invocation_boundary_manifest
from tools.common.capabilities.workflow.recovery.interview_boundary import (
    AssessmentInterviewResumeBoundary,
    INTERVIEW_RESUME_COMMAND,
)


class RecordingRoot:
    def __init__(self) -> None:
        self.calls = []

    def invoke(self, payload, config=None):
        self.calls.append((payload, config))
        return {"status": "ROOT_REENTERED"}


def test_interview_resume_command_is_managed_boundary() -> None:
    manifest = invocation_boundary_manifest()

    entry = next(
        item for item in manifest if item["name"] == "assessment_interview_resume_requested"
    )
    assert entry["source_event"] == INTERVIEW_RESUME_COMMAND
    assert entry["target"].endswith("AssessmentInterviewResumeBoundary")


def test_interview_resume_boundary_reenters_root_thread() -> None:
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=root,
    )

    boundary.handle(
        {
            "assessmentId": "assessment-1",
            "threadId": "interview:assessment-1",
            "questionId": "agent-question-1",
            "contextRevision": 2,
        },
        "corr-1",
    )

    assert len(root.calls) == 1
    payload, config = root.calls[0]
    prompt = payload["messages"][0]["content"]
    assert "Interview Agent" in prompt
    assert "Do not infer sufficiency from HTTP persistence alone" in prompt
    assert config["configurable"]["thread_id"] == "interview:assessment-1"
    assert config["metadata"]["context_revision"] == 2


def test_interview_resume_boundary_rejects_missing_revision() -> None:
    boundary = AssessmentInterviewResumeBoundary(SimpleNamespace(), root_agent=RecordingRoot())

    with pytest.raises(ValueError, match="contextRevision"):
        boundary.handle(
            {
                "assessmentId": "assessment-1",
                "threadId": "interview:assessment-1",
                "questionId": "agent-question-1",
            },
            "corr-1",
        )
