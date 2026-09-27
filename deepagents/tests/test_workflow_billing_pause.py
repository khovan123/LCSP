from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from middleware.billing_metering import BillingBudgetExhausted
from tools.common.capabilities.agent_runtime import invocation


def test_budget_pauses_once_before_release_and_never_reports_dispatch_failure(monkeypatch):
    order = []
    boundary = MagicMock()
    session = SimpleNamespace(reservation_id="reservation-1", release=lambda: order.append("release"))
    error = BillingBudgetExhausted("reservation exhausted")
    # An Interview dispatch that already accepted the answer resumes downstream,
    # not the already-consumed answer mutation.
    error.resume_source_event = "event.technical-evidence.accepted.v1"
    error.resume_message = {"assessmentId": "assessment-1", "evidenceReportId": "evidence-1"}

    def handle(*_args):
        raise error

    def save(payload):
        order.append("persist")
        assert payload["sourceEvent"] == error.resume_source_event
        assert payload["payload"] == error.resume_message
        assert payload["reservationId"] == "reservation-1"
        return {"pauseId": "pause-1"}

    monkeypatch.setattr(invocation, "build_boundary", lambda _target: boundary)
    monkeypatch.setattr(invocation, "_agent_stream_session", lambda *_args: None)
    monkeypatch.setattr(invocation, "_billing_metering_session", lambda *_args: session)
    monkeypatch.setattr(invocation, "_run_boundary_handler", handle)
    monkeypatch.setattr(invocation, "load_config", lambda: SimpleNamespace(nestjs_api_base_url="http://test", worker_api_key="test"))
    monkeypatch.setattr(invocation, "WorkerApiClient", lambda *_args: SimpleNamespace(pause_billing_workflow=save))
    monkeypatch.setattr(invocation, "publish_agent_stream_event", lambda event, **_kwargs: order.append(event))
    result = invocation.invoke_boundary("assessment_interview_resume_requested", {"assessmentId": "assessment-1"}, "corr-1")
    assert result["status"] == "WAITING"
    assert order == ["persist", "BOUNDARY_PAUSED", "release"]
    boundary.report_dispatch_failure.assert_not_called()


def test_pause_callback_failure_is_not_acknowledged_as_success(monkeypatch):
    session = SimpleNamespace(reservation_id="reservation-1", release=MagicMock())

    def handle(*_args):
        raise BillingBudgetExhausted("reservation exhausted")

    def fail(_payload):
        raise RuntimeError("pause persistence unavailable")

    monkeypatch.setattr(invocation, "build_boundary", lambda _target: MagicMock())
    monkeypatch.setattr(invocation, "_agent_stream_session", lambda *_args: None)
    monkeypatch.setattr(invocation, "_billing_metering_session", lambda *_args: session)
    monkeypatch.setattr(invocation, "_run_boundary_handler", handle)
    monkeypatch.setattr(invocation, "load_config", lambda: SimpleNamespace(nestjs_api_base_url="http://test", worker_api_key="test"))
    monkeypatch.setattr(invocation, "WorkerApiClient", lambda *_args: SimpleNamespace(pause_billing_workflow=fail))
    emit = MagicMock()
    monkeypatch.setattr(invocation, "publish_agent_stream_event", emit)
    with pytest.raises(RuntimeError, match="persistence"):
        invocation.invoke_boundary("engineering_assessment_requested", {"assessmentId": "assessment-1"}, "corr-1")
    emit.assert_not_called()
    session.release.assert_not_called()
