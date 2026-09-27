from __future__ import annotations

import asyncio
import contextvars
import time
from threading import Event

import pytest
from langchain.agents.factory import _get_can_jump_to

import middleware.system_event_dispatch as system_dispatch
from orchestration.agent_stream import active_agent_stream_cancel
from tools.common.capabilities.agent_runtime.boundary import AgentRuntimeBoundaryTimeout
from orchestration.context import LCSPRunContext

_MARKER = contextvars.ContextVar("marker", default=None)


def test_hook_keeps_node_name_and_jump_to_end() -> None:
    middleware = system_dispatch.dispatch_agent_runtime_system_event

    assert middleware.name == "dispatch_agent_runtime_system_event"
    assert _get_can_jump_to(middleware, "before_agent") == ["end"]


@pytest.mark.asyncio
async def test_async_hook_runs_boundary_off_the_event_loop(monkeypatch) -> None:
    # Regression: the sync hook ran whole boundaries on the Agent Server event
    # loop, so concurrent broker deliveries timed out creating their threads.
    seen: list[object] = []

    def blocking_dispatch(state, runtime):
        seen.append(_MARKER.get())
        time.sleep(0.3)
        return {"jump_to": "end"}

    monkeypatch.setattr(system_dispatch, "_dispatch_system_event", blocking_dispatch)
    ticks = 0

    async def heartbeat() -> None:
        nonlocal ticks
        while True:
            ticks += 1
            await asyncio.sleep(0.01)

    _MARKER.set("request-context")
    beat = asyncio.create_task(heartbeat())
    try:
        result = await system_dispatch.dispatch_agent_runtime_system_event.abefore_agent(
            {}, object()
        )
    finally:
        beat.cancel()

    assert result == {"jump_to": "end"}
    assert ticks >= 10
    assert seen == ["request-context"]


@pytest.mark.asyncio
async def test_cancelled_async_hook_signals_the_underlying_thread(monkeypatch):
    started, stopped = Event(), Event()

    def blocking_dispatch(state, runtime):
        cancel = active_agent_stream_cancel.get()
        started.set()
        assert cancel is not None
        assert cancel.wait(2)
        stopped.set()

    monkeypatch.setattr(system_dispatch, "_dispatch_system_event", blocking_dispatch)
    task = asyncio.create_task(
        system_dispatch.dispatch_agent_runtime_system_event.abefore_agent({}, object())
    )
    assert await asyncio.to_thread(started.wait, 2)
    task.cancel()
    with pytest.raises(asyncio.CancelledError):
        await task
    assert await asyncio.to_thread(stopped.wait, 2)
    assert active_agent_stream_cancel.get() is None


def test_boundary_deadline_reaches_sync_thread_without_remote_cancel(monkeypatch):
    def dispatch(state, runtime):
        cancel = active_agent_stream_cancel.get()
        assert cancel is not None
        assert cancel.wait(2)
        system_dispatch.check_agent_execution_active()

    monkeypatch.setattr(system_dispatch, "_dispatch_active_system_event", dispatch)
    from types import SimpleNamespace

    runtime = SimpleNamespace(context=LCSPRunContext(system_deadline_at=time.time() + 0.02))
    with pytest.raises(AgentRuntimeBoundaryTimeout):
        system_dispatch._dispatch_system_event({}, runtime)
    assert active_agent_stream_cancel.get() is None


def test_expired_boundary_does_not_start_hydration_or_work(monkeypatch):
    monkeypatch.setattr(
        system_dispatch, "_dispatch_active_system_event",
        lambda *_args: pytest.fail("expired work must not start"),
    )
    from types import SimpleNamespace

    with pytest.raises(AgentRuntimeBoundaryTimeout):
        system_dispatch._dispatch_system_event(
            {}, SimpleNamespace(context=LCSPRunContext(system_deadline_at=time.time() - 1))
        )
