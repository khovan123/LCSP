from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from langchain.messages import ToolMessage

from middleware.triage_singleton import _guard_triage_task_call
from orchestration.context import LCSPRunContext


class FakeRequest:
    def __init__(self, *, context, tool_call=None):
        self.runtime = SimpleNamespace(context=context)
        self.tool_call = tool_call or {
            "name": "task",
            "id": "call-1",
            "args": {
                "subagent_type": "triage",
                "description": "Run manual legal preparation.",
            },
        }

    def override(self, **kwargs):
        return FakeRequest(
            context=self.runtime.context,
            tool_call=kwargs.get("tool_call", self.tool_call),
        )


def test_running_triage_short_circuits_before_second_subagent_start() -> None:
    coordinator = MagicMock()
    coordinator.reserve_or_join.return_value = SimpleNamespace(
        status="RUNNING",
        execution_id="triage:active",
        request_count=4,
    )
    handler = MagicMock()
    request = FakeRequest(
        context=LCSPRunContext(
            assessment_id="assessment-2",
            legal_rule_ids=("RULE-2",),
            idempotency_key="manual:assessment-2",
        )
    )

    result = _guard_triage_task_call(
        request,
        handler,
        coordinator=coordinator,
    )

    assert isinstance(result, ToolMessage)
    assert '"status": "RUNNING"' in str(result.content)
    assert '"queueCreated": false' in str(result.content)
    assert '"subagentStarted": false' in str(result.content)
    handler.assert_not_called()
    coordinator.reserve_or_join.assert_called_once_with(
        affected_rule_ids=["RULE-2"],
        idempotency_key="manual:assessment-2",
        trigger="MANUAL_ENGINEERING_RULE_NOT_READY",
        assessment_id="assessment-2",
    )


def test_first_triage_dispatch_injects_reserved_execution_id_into_task() -> None:
    coordinator = MagicMock()
    coordinator.reserve_or_join.return_value = SimpleNamespace(
        status="OWNER",
        execution_id="triage:owner",
        request_count=1,
    )
    coordinator.active_status.return_value = {"active": False}
    captured = []

    def handler(request):
        captured.append(request.tool_call)
        return ToolMessage(content="done", tool_call_id="call-1")

    request = FakeRequest(
        context=LCSPRunContext(
            assessment_id="assessment-1",
            legal_rule_ids=("RULE-1",),
            idempotency_key="manual:assessment-1",
        )
    )

    result = _guard_triage_task_call(
        request,
        handler,
        coordinator=coordinator,
    )

    assert isinstance(result, ToolMessage)
    assert captured
    description = captured[0]["args"]["description"]
    assert "triageExecutionId=triage:owner" in description
    assert "Requests arriving while you run do not create queue items" in description
    coordinator.abandon_execution.assert_not_called()


def test_failed_owner_dispatch_releases_lease_as_recoverable() -> None:
    coordinator = MagicMock()
    coordinator.reserve_or_join.return_value = SimpleNamespace(
        status="OWNER",
        execution_id="triage:owner",
        request_count=1,
    )
    request = FakeRequest(context=LCSPRunContext())

    def fail(_request):
        raise RuntimeError("subagent failed")

    with pytest.raises(RuntimeError, match="subagent failed"):
        _guard_triage_task_call(
            request,
            fail,
            coordinator=coordinator,
        )

    coordinator.abandon_execution.assert_called_once_with(
        execution_id="triage:owner"
    )


def test_non_triage_task_is_not_intercepted() -> None:
    coordinator = MagicMock()
    request = FakeRequest(
        context=LCSPRunContext(),
        tool_call={
            "name": "task",
            "id": "call-2",
            "args": {
                "subagent_type": "planner",
                "description": "Plan assessment evidence.",
            },
        },
    )
    expected = ToolMessage(content="planner", tool_call_id="call-2")
    handler = MagicMock(return_value=expected)

    result = _guard_triage_task_call(
        request,
        handler,
        coordinator=coordinator,
    )

    assert result is expected
    handler.assert_called_once()
    coordinator.reserve_or_join.assert_not_called()
