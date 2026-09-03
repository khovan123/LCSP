from __future__ import annotations

from types import SimpleNamespace

from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
    InterviewGatedEngineeringAssessmentBoundary,
)


class FakeApi:
    def __init__(self, state):
        self.state = state
        self.seeded = []

    def get_interview_worker_state(self, assessment_id):
        assert assessment_id == "assessment-1"
        return dict(self.state)

    def post_interview_initial_question(self, assessment_id, payload):
        self.seeded.append((assessment_id, payload))
        return payload


class FakeDispatcher:
    def __init__(self):
        self.calls = []

    def dispatch(self, **kwargs):
        self.calls.append(kwargs)
        return {
            "status": "COMPLETED",
            "handoff": {
                "expectedContextRevision": 0,
                "mode": "INITIAL_INTERVIEW",
                "outcome": "WAITING_FOR_CUSTOMER",
                "activeQuestion": {
                    "id": "question-1",
                    "intent": "ASK",
                    "control": "FREE_TEXT",
                    "prompt": "Who approves this business action?",
                },
                "confirmedContext": {},
                "flags": [],
                "blockedActions": [],
                "targetedResolution": {},
            },
        }


class NoopPipeline:
    def run(self, **kwargs):
        raise AssertionError("pipeline must not run during Initial Interview bootstrap")


class NoopWorkspace:
    def cleanup(self, _job_id):
        return None


def _boundary(api, dispatcher):
    return InterviewGatedEngineeringAssessmentBoundary(
        SimpleNamespace(),
        api_client=api,
        interview_dispatcher=dispatcher,
        investigation_pipeline=NoopPipeline(),
        snapshot_client=SimpleNamespace(),
        code_workspace=NoopWorkspace(),
        triage_trigger_publisher=lambda _payload: None,
    )


def _report():
    return {
        "assessment_id": "assessment-1",
        "snapshot_id": "snapshot-1",
        "schema_version": "2.0.0",
        "evidence_payload": {
            "evidence_graph": {
                "coverage_state": "PARTIAL",
                "coverage_notes": ["dynamic configuration not fully observed"],
            }
        },
    }


def test_initial_pge_event_bootstraps_interview_and_stops_before_pipeline() -> None:
    api = FakeApi(
        {
            "outcome": "WAITING_FOR_CUSTOMER",
            "contextRevision": 0,
            "answerHistory": [],
        }
    )
    dispatcher = FakeDispatcher()
    boundary = _boundary(api, dispatcher)

    result = boundary._prepare_interview(
        evidence_report=_report(),
        evidence_report_id="ter-1",
        assessment_id="assessment-1",
        correlation_id="corr-1",
    )

    assert result is None
    assert len(dispatcher.calls) == 1
    instruction = dispatcher.calls[0]["instruction"]
    assert "INITIAL_INTERVIEW" in instruction
    assert "PARTIAL" in instruction
    assert "Missing technical evidence is not proof" in instruction
    assert api.seeded[0][0] == "assessment-1"
    assert api.seeded[0][1]["outcome"] == "WAITING_FOR_CUSTOMER"


def test_guarded_ready_state_is_the_only_initial_path_to_confirmed_context() -> None:
    api = FakeApi(
        {
            "outcome": "CONTEXT_READY",
            "contextRevision": 2,
            "confirmedContext": {"decision_authority": "human approval"},
        }
    )
    dispatcher = FakeDispatcher()
    boundary = _boundary(api, dispatcher)

    result = boundary._prepare_interview(
        evidence_report=_report(),
        evidence_report_id="ter-1",
        assessment_id="assessment-1",
        correlation_id="corr-1",
    )

    assert result == {"decision_authority": "human approval"}
    assert dispatcher.calls == []
    assert api.seeded == []


def test_existing_waiting_question_never_reboots_initial_interview() -> None:
    api = FakeApi(
        {
            "outcome": "WAITING_FOR_CUSTOMER",
            "contextRevision": 0,
            "activeQuestion": {"id": "already-waiting"},
        }
    )
    dispatcher = FakeDispatcher()
    boundary = _boundary(api, dispatcher)

    assert (
        boundary._prepare_interview(
            evidence_report=_report(),
            evidence_report_id="ter-1",
            assessment_id="assessment-1",
            correlation_id="corr-1",
        )
        is None
    )
    assert dispatcher.calls == []
    assert api.seeded == []
