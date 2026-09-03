from types import SimpleNamespace

import pytest

from tools.common.capabilities.managed.invocation import invocation_boundary_manifest
from tools.common.capabilities.workflow.recovery.interview_boundary import (
    AssessmentInterviewResumeBoundary,
    INTERVIEW_RESUME_COMMAND,
)


class RecordingRoot:
    def __init__(self, result=None) -> None:
        self.calls = []
        self._result = result or {"status": "ROOT_REENTERED"}

    def invoke(self, payload, config=None):
        self.calls.append((payload, config))
        return self._result


class RecordingApi:
    def __init__(self, status="CURRENT") -> None:
        self.status = status
        self.private_context_calls = []
        self.decision_posts = []

    def get_interview_private_context(
        self,
        assessment_id,
        context_revision,
        *,
        source_version=None,
        pge_version=None,
    ):
        self.private_context_calls.append(
            (assessment_id, context_revision, source_version, pge_version)
        )
        return {"status": self.status, "privateRevision": {"answer": {"freeText": "raw"}}}

    def post_interview_agent_decision(self, assessment_id, payload):
        self.decision_posts.append((assessment_id, payload))
        return {"outcome": payload.get("outcome")}


def test_interview_resume_command_is_managed_boundary() -> None:
    manifest = invocation_boundary_manifest()

    entry = next(
        item for item in manifest if item["name"] == "assessment_interview_resume_requested"
    )
    assert entry["source_event"] == INTERVIEW_RESUME_COMMAND
    assert entry["target"].endswith("AssessmentInterviewResumeBoundary")


def test_interview_resume_boundary_revalidates_private_context_and_writes_decision() -> None:
    api = RecordingApi()
    root = RecordingRoot(
        result={
            "interviewDecision": {
                "expectedContextRevision": 2,
                "outcome": "WAITING_FOR_CUSTOMER",
            }
        }
    )
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=root,
        api_client=api,
    )

    boundary.handle(
        {
            "assessmentId": "assessment-1",
            "threadId": "interview:assessment-1",
            "questionId": "agent-question-1",
            "contextRevision": 2,
            "sourceVersion": "snapshot-1:abc",
            "pgeVersion": "ter-1:v1",
            "resumeReason": "INTERVIEW_AGENT_DECISION_REQUIRED",
        },
        "corr-1",
    )

    assert api.private_context_calls == [
        ("assessment-1", 2, "snapshot-1:abc", "ter-1:v1")
    ]
    assert len(root.calls) == 1
    payload, config = root.calls[0]
    prompt = payload["messages"][0]["content"]
    assert "Interview Agent" in prompt
    assert "private Customer context revision through the internal worker API" in prompt
    assert "raw" not in prompt
    assert config["configurable"]["thread_id"] == "interview:assessment-1"
    assert config["metadata"]["context_revision"] == 2
    assert config["metadata"]["private_context_available"] is True
    assert api.decision_posts == [
        (
            "assessment-1",
            {"expectedContextRevision": 2, "outcome": "WAITING_FOR_CUSTOMER"},
        )
    ]


def test_interview_resume_boundary_duplicate_delivery_is_idempotent() -> None:
    api = RecordingApi(status="DUPLICATE")
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api
    )

    boundary.handle(
        {
            "assessmentId": "assessment-1",
            "threadId": "interview:assessment-1",
            "questionId": "agent-question-1",
            "contextRevision": 2,
            "sourceVersion": "snapshot-1:abc",
            "pgeVersion": "ter-1:v1",
            "resumeReason": "INTERVIEW_AGENT_DECISION_REQUIRED",
        },
        "corr-1",
    )

    assert root.calls == []
    assert api.decision_posts == []


def test_interview_resume_boundary_stale_provenance_reenters_root_revalidation() -> None:
    api = RecordingApi(status="STALE_PROVENANCE")
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api
    )

    boundary.handle(
        {
            "assessmentId": "assessment-1",
            "threadId": "interview:assessment-1",
            "questionId": "agent-question-1",
            "contextRevision": 2,
            "sourceVersion": "snapshot-old:abc",
            "pgeVersion": "ter-old:v1",
            "resumeReason": "INTERVIEW_AGENT_DECISION_REQUIRED",
        },
        "corr-1",
    )

    assert len(root.calls) == 1
    prompt = root.calls[0][0]["messages"][0]["content"]
    assert "stale against current source/PGE provenance" in prompt
    assert root.calls[0][1]["metadata"]["trigger"] == "ASSESSMENT_INTERVIEW_REVALIDATION_REQUIRED"
    assert api.decision_posts == []


def test_provide_more_context_reenters_without_private_revision_lookup() -> None:
    api = RecordingApi(status="DUPLICATE")
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api
    )

    boundary.handle(
        {
            "assessmentId": "assessment-1",
            "threadId": "interview:assessment-1",
            "questionId": "agent-question-1",
            "contextRevision": 0,
            "sourceVersion": "snapshot-1:abc",
            "pgeVersion": "ter-1:v1",
            "resumeReason": "PROVIDE_MORE_CONTEXT",
        },
        "corr-1",
    )

    assert api.private_context_calls == []
    assert len(root.calls) == 1
    prompt = root.calls[0][0]["messages"][0]["content"]
    assert "PROVIDE_MORE_CONTEXT" in prompt
    assert root.calls[0][1]["metadata"]["trigger"] == "ASSESSMENT_INTERVIEW_PROVIDE_MORE_CONTEXT"


def test_interview_resume_boundary_rejects_missing_revision() -> None:
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=RecordingRoot(), api_client=RecordingApi()
    )

    with pytest.raises(ValueError, match="contextRevision"):
        boundary.handle(
            {
                "assessmentId": "assessment-1",
                "threadId": "interview:assessment-1",
                "questionId": "agent-question-1",
                "sourceVersion": "snapshot-1:abc",
                "pgeVersion": "ter-1:v1",
                "resumeReason": "INTERVIEW_AGENT_DECISION_REQUIRED",
            },
            "corr-1",
        )
