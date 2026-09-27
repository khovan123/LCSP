from __future__ import annotations

import httpx

from tools.common.capabilities.agent_runtime import agent_server_client


class _NullObserver:
    def __init__(self, _message):
        self.events = []

    def emit(self, **kwargs):
        self.events.append(kwargs)


class _FakeThreads:
    def __init__(self):
        self.created = []

    def create(self, **kwargs):
        self.created.append(kwargs)
        return {"thread_id": kwargs["thread_id"]}

    def get_state(self, _thread_id):
        return {"values": {"ok": True}}


class _FakeRuns:
    def __init__(self, *, listed_runs=None, timeout_first_get=False, refuse_cancel=True):
        self.listed_runs = list(listed_runs or [])
        self.timeout_first_get = timeout_first_get
        self.create_calls = 0
        self.get_calls = 0
        self.cancel_calls = []
        self._refuse_cancel = refuse_cancel
        self._created_run_status = "running"

    def list(self, _thread_id, limit=25):
        return list(self.listed_runs)

    def create(self, _thread_id, _assistant_id, **kwargs):
        self.create_calls += 1
        return {
            "run_id": "created-run",
            "status": self._created_run_status,
            "metadata": dict(kwargs.get("metadata") or {}),
        }

    def get(self, _thread_id, run_id):
        self.get_calls += 1
        if self.timeout_first_get and self.get_calls == 1:
            raise httpx.ReadTimeout("timed out")
        return {
            "run_id": run_id,
            "status": "success",
            "metadata": {"lcsp_boundary_name": "scan_requested"},
        }

    def cancel(self, thread_id, run_id, **kwargs):
        self.cancel_calls.append({"thread_id": thread_id, "run_id": run_id, **kwargs})
        if self._refuse_cancel:
            raise AssertionError("cancel should not be called")


class _FakeClient:
    def __init__(self, runs):
        self.threads = _FakeThreads()
        self.runs = runs


def _install_client(monkeypatch, fake_client):
    monkeypatch.setattr(agent_server_client, "get_sync_client", lambda **_kwargs: fake_client)
    monkeypatch.setattr(agent_server_client.time, "sleep", lambda _seconds: None)
    monkeypatch.setattr(agent_server_client, "_ScanRunObserver", _NullObserver)


def test_run_poll_timeout_keeps_existing_binding(monkeypatch):
    fake_runs = _FakeRuns(timeout_first_get=True)
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    result = agent_server_client.dispatch_agent_runtime_event(
        "scan_requested",
        {"assessmentId": "assessment-1", "scanJobId": "scan-1"},
        "correlation-1",
        timeout_seconds=30,
    )

    assert result == {"ok": True}
    assert fake_runs.create_calls == 1
    assert fake_runs.get_calls == 2


def test_redelivered_scan_reattaches_active_boundary_run(monkeypatch):
    fake_runs = _FakeRuns(
        listed_runs=[
            {
                "run_id": "active-run",
                "status": "running",
                "metadata": {"lcsp_boundary_name": "scan_requested"},
            }
        ]
    )
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    result = agent_server_client.dispatch_agent_runtime_event(
        "scan_requested",
        {"assessmentId": "assessment-1", "scanJobId": "scan-1"},
        "correlation-1",
        timeout_seconds=30,
    )

    assert result == {"ok": True}
    assert fake_runs.create_calls == 0
    assert fake_runs.get_calls == 1


def test_active_run_from_other_boundary_is_not_reused(monkeypatch):
    fake_runs = _FakeRuns(
        listed_runs=[
            {
                "run_id": "other-boundary-run",
                "status": "running",
                "metadata": {"lcsp_boundary_name": "assessment_interview_resume"},
            }
        ]
    )
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    result = agent_server_client.dispatch_agent_runtime_event(
        "scan_requested",
        {"assessmentId": "assessment-1", "scanJobId": "scan-1"},
        "correlation-1",
        timeout_seconds=30,
    )

    assert result == {"ok": True}
    assert fake_runs.create_calls == 1
    assert fake_runs.get_calls == 1


def test_interrupt_cancels_the_active_run_for_this_boundary(monkeypatch):
    fake_runs = _FakeRuns(
        listed_runs=[
            {
                "run_id": "active-run",
                "status": "running",
                "metadata": {"lcsp_boundary_name": "assessment_interview_resume_requested"},
            }
        ],
        refuse_cancel=False,
    )
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    agent_server_client.interrupt_agent_runtime_run(
        "assessment_interview_resume_requested",
        {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
        "correlation-1",
    )

    assert fake_runs.cancel_calls == [
        {
            "thread_id": agent_server_client.agent_thread_id(
                "assessment_interview_resume_requested",
                {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
                "correlation-1",
            ),
            "run_id": "active-run",
            "wait": False,
            "action": "interrupt",
        }
    ]


def test_interrupt_is_a_noop_when_no_active_run_exists(monkeypatch):
    fake_runs = _FakeRuns(listed_runs=[], refuse_cancel=False)
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    agent_server_client.interrupt_agent_runtime_run(
        "assessment_interview_resume_requested",
        {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
        "correlation-1",
    )

    assert fake_runs.cancel_calls == []


def test_interrupt_ignores_an_active_run_from_a_different_boundary(monkeypatch):
    fake_runs = _FakeRuns(
        listed_runs=[
            {
                "run_id": "other-boundary-run",
                "status": "running",
                "metadata": {"lcsp_boundary_name": "scan_requested"},
            }
        ],
        refuse_cancel=False,
    )
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    agent_server_client.interrupt_agent_runtime_run(
        "assessment_interview_resume_requested",
        {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
        "correlation-1",
    )

    assert fake_runs.cancel_calls == []


def test_resume_creates_a_run_with_no_new_input_and_polls_to_terminal(monkeypatch):
    fake_runs = _FakeRuns()
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)
    captured_create_kwargs = {}
    original_create = fake_runs.create

    def capturing_create(thread_id, assistant_id, **kwargs):
        captured_create_kwargs.update(kwargs)
        return original_create(thread_id, assistant_id, **kwargs)

    fake_runs.create = capturing_create

    result = agent_server_client.resume_agent_runtime_run(
        "assessment_interview_resume_requested",
        {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
        "correlation-1",
        timeout_seconds=30,
    )

    assert result == {"ok": True}
    assert fake_runs.create_calls == 1
    assert captured_create_kwargs["input"] is None
    assert captured_create_kwargs["multitask_strategy"] == "enqueue"


def test_dispatch_short_circuits_pause_command_without_creating_a_run(monkeypatch):
    """A pause command must never create its own Agent Server run: with
    multitask_strategy="enqueue" that run would just queue behind the turn it
    is meant to interrupt instead of stopping it."""
    fake_runs = _FakeRuns(
        listed_runs=[
            {
                "run_id": "active-turn-run",
                "status": "running",
                "metadata": {
                    "lcsp_boundary_name": "assessment_interview_resume_requested"
                },
            }
        ],
        refuse_cancel=False,
    )
    fake_client = _FakeClient(fake_runs)
    _install_client(monkeypatch, fake_client)

    result = agent_server_client.dispatch_agent_runtime_event(
        "assessment_interview_pause_requested",
        {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
        "correlation-1",
    )

    assert result == {"status": "interrupt_requested"}
    assert fake_runs.create_calls == 0
    assert fake_runs.cancel_calls == [
        {
            "thread_id": agent_server_client.agent_thread_id(
                "assessment_interview_resume_requested",
                {"assessmentId": "assessment-1", "workflowRunId": "workflow-1"},
                "correlation-1",
            ),
            "run_id": "active-turn-run",
            "wait": False,
            "action": "interrupt",
        }
    ]
