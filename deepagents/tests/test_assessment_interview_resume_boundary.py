from types import SimpleNamespace

import pytest

from tools.common.capabilities.managed.invocation import invocation_boundary_manifest
from tools.common.capabilities.workflow.recovery.interview_boundary import (
    AssessmentInterviewResumeBoundary,
    INTERVIEW_RESUME_COMMAND,
)


WAITING_HANDOFF = {
    "expectedContextRevision": 0,
    "mode": "INITIAL_INTERVIEW",
    "outcome": "WAITING_FOR_CUSTOMER",
    "activeQuestion": {
        "id": "agent-question-next",
        "intent": "ASK",
        "control": "FREE_TEXT",
        "prompt": "Please provide the missing business context.",
    },
    "contextAuthority": "CUSTOMER_STATED",
    "confirmedContext": {},
    "flags": [],
    "blockedActions": [],
    "targetedResolution": {},
}


class RecordingRoot:
    def __init__(self, result=None, order=None) -> None:
        self.calls = []
        self._result = result or {"status": "ROOT_REENTERED"}
        self._order = order

    def invoke(self, payload, config=None):
        if self._order is not None:
            self._order.append("root")
        self.calls.append((payload, config))
        return self._result


class RecordingDispatcher:
    def __init__(self, handoff=None, order=None) -> None:
        self.calls = []
        self._handoff = handoff or WAITING_HANDOFF
        self._order = order

    def dispatch(self, **kwargs):
        if self._order is not None:
            self._order.append("interview")
        self.calls.append(kwargs)
        return {"status": "COMPLETED", "handoff": dict(self._handoff)}


class RecordingApi:
    def __init__(self, status="CURRENT", order=None) -> None:
        self.status = status
        self.private_context_calls = []
        self.decision_posts = []
        self._order = order

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
        return {
            "status": self.status,
            "publicState": {
                "outcome": "WAITING_FOR_CUSTOMER",
                "contextRevision": context_revision,
            },
            "privateRevision": {"answer": {"freeText": "raw"}},
        }

    def post_interview_agent_decision(self, assessment_id, payload):
        if self._order is not None:
            self._order.append("guard")
        self.decision_posts.append((assessment_id, payload))
        return {"outcome": payload.get("outcome")}


def _message(*, reason="INTERVIEW_AGENT_DECISION_REQUIRED", revision=2):
    return {
        "assessmentId": "assessment-1",
        "threadId": "interview:assessment-1",
        "questionId": "agent-question-1",
        "contextRevision": revision,
        "sourceVersion": "snapshot-1:abc",
        "pgeVersion": "ter-1:v1",
        "resumeReason": reason,
    }


def test_interview_resume_command_is_managed_boundary() -> None:
    manifest = invocation_boundary_manifest()

    entry = next(
        item for item in manifest if item["name"] == "assessment_interview_resume_requested"
    )
    assert entry["source_event"] == INTERVIEW_RESUME_COMMAND
    assert entry["target"].endswith("AssessmentInterviewResumeBoundary")


def test_interview_resume_boundary_passes_private_context_only_to_interview_and_persists_waiting() -> None:
    api = RecordingApi()
    dispatcher = RecordingDispatcher()
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=root,
        api_client=api,
        dispatcher=dispatcher,
    )

    boundary.handle(_message(), "corr-1")

    assert api.private_context_calls == [
        ("assessment-1", 2, "snapshot-1:abc", "ter-1:v1")
    ]
    assert len(dispatcher.calls) == 1
    instruction = dispatcher.calls[0]["instruction"]
    assert '"freeText": "raw"' in instruction
    assert "Do not expose private raw Customer content to Root" in instruction
    assert root.calls == []
    assert len(api.decision_posts) == 1
    assessment_id, decision = api.decision_posts[0]
    assert assessment_id == "assessment-1"
    assert decision["expectedContextRevision"] == 2
    assert decision["outcome"] == "WAITING_FOR_CUSTOMER"
    assert decision["activeQuestion"]["id"] == "agent-question-next"


def test_guard_persists_before_any_downstream_continuation() -> None:
    order = []
    ready = {
        "expectedContextRevision": 0,
        "mode": "INITIAL_INTERVIEW",
        "outcome": "CONTEXT_READY",
        "contextAuthority": "CUSTOMER_CONFIRMED",
        "confirmedContext": {"decision_authority": "human"},
        "flags": [],
        "blockedActions": [],
        "targetedResolution": {},
    }
    api = RecordingApi(order=order)
    dispatcher = RecordingDispatcher(ready, order=order)
    downstream_calls = []

    def downstream(payload, correlation_id):
        order.append("downstream")
        downstream_calls.append((payload, correlation_id))

    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        api_client=api,
        dispatcher=dispatcher,
        downstream_handler=downstream,
    )

    boundary.handle(_message(), "corr-1")

    assert order == ["interview", "guard", "downstream"]
    assert downstream_calls[0][0]["outcome"] == "CONTEXT_READY"


def test_interview_resume_boundary_duplicate_delivery_is_idempotent() -> None:
    api = RecordingApi(status="DUPLICATE")
    dispatcher = RecordingDispatcher()
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api, dispatcher=dispatcher
    )

    boundary.handle(_message(), "corr-1")

    assert dispatcher.calls == []
    assert root.calls == []
    assert api.decision_posts == []


def test_interview_resume_boundary_stale_provenance_reenters_root_revalidation() -> None:
    api = RecordingApi(status="STALE_PROVENANCE")
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(), root_agent=root, api_client=api, dispatcher=RecordingDispatcher()
    )

    boundary.handle(_message(), "corr-1")

    assert len(root.calls) == 1
    prompt = root.calls[0][0]["messages"][0]["content"]
    assert "stale against current source/PGE provenance" in prompt
    assert root.calls[0][1]["metadata"]["trigger"] == "ASSESSMENT_INTERVIEW_REVALIDATION_REQUIRED"
    assert api.decision_posts == []


def test_provide_more_context_persists_next_interview_question() -> None:
    api = RecordingApi(status="DUPLICATE")
    dispatcher = RecordingDispatcher()
    root = RecordingRoot()
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=root,
        api_client=api,
        dispatcher=dispatcher,
    )

    boundary.handle(
        _message(reason="PROVIDE_MORE_CONTEXT", revision=0),
        "corr-1",
    )

    assert api.private_context_calls == [
        ("assessment-1", 0, "snapshot-1:abc", "ter-1:v1")
    ]
    assert len(dispatcher.calls) == 1
    assert dispatcher.calls[0]["trigger"] == "PROVIDE_MORE_CONTEXT"
    assert len(api.decision_posts) == 1
    assert api.decision_posts[0][1]["outcome"] == "WAITING_FOR_CUSTOMER"
    assert root.calls == []


def test_interview_resume_boundary_rejects_missing_revision() -> None:
    boundary = AssessmentInterviewResumeBoundary(
        SimpleNamespace(),
        root_agent=RecordingRoot(),
        api_client=RecordingApi(),
        dispatcher=RecordingDispatcher(),
    )

    with pytest.raises(ValueError, match="contextRevision"):
        message = _message()
        message.pop("contextRevision")
        boundary.handle(message, "corr-1")
