from __future__ import annotations

import asyncio
import contextvars
import time

import pytest
from langchain.agents.factory import _get_can_jump_to

import middleware.system_event_dispatch as system_dispatch

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
