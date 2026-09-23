"""Dispatch trusted broker events inside the Managed Deep Agents thread run."""

from __future__ import annotations

from typing import Any, Mapping

from langchain.agents.middleware import before_agent

from orchestration.context import LCSPRunContext
from tools.common.capabilities.managed.invocation import invoke_boundary
from tools.common.capabilities.platform.managed_workspace import (
    activate_managed_backend,
    ensure_repository_for_event,
    resolve_managed_thread_backend,
)


@before_agent(can_jump_to=["end"])
def dispatch_managed_system_event(state, runtime) -> dict[str, Any] | None:
    """Run trusted LCSP system events before the root model is invoked."""
    _ = state
    context = _context(runtime.context)
    if context is None or not context.system_boundary_name or not context.system_event:
        return None

    backend = resolve_managed_thread_backend(runtime.config)
    ensure_repository_for_event(
        backend,
        context.system_boundary_name,
        context.system_event,
    )
    correlation_id = (
        context.correlation_id
        or _event_text(context.system_event, "correlationId", "correlation_id")
        or context.system_boundary_name
    )
    with activate_managed_backend(backend):
        invoke_boundary(
            context.system_boundary_name,
            dict(context.system_event),
            correlation_id,
        )
    return {"jump_to": "end"}


def _context(value: object) -> LCSPRunContext | None:
    if isinstance(value, LCSPRunContext):
        return value
    if isinstance(value, Mapping):
        return LCSPRunContext(**dict(value))
    return None


def _event_text(event: Mapping[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


__all__ = ["dispatch_managed_system_event"]
