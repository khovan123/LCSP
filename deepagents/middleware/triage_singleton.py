"""Prevent parallel Legal Rule Triage subagent executions at supervisor dispatch."""

from __future__ import annotations

import json
from collections.abc import Callable
from typing import Any

from langchain.agents.middleware import wrap_tool_call
from langchain.messages import ToolMessage
from langchain.tools.tool_node import ToolCallRequest
from langgraph.types import Command

from orchestration.context import LCSPRunContext
from tools.triage.legal_rule_triage.singleton import TriageSingletonCoordinator


@wrap_tool_call
def guard_triage_singleton_task(
    request: ToolCallRequest,
    handler: Callable[[ToolCallRequest], ToolMessage | Command],
) -> ToolMessage | Command:
    """Reserve/join Triage before Deep Agents can start the `triage` subagent."""
    return _guard_triage_task_call(
        request,
        handler,
        coordinator=TriageSingletonCoordinator(),
    )


def _guard_triage_task_call(
    request: ToolCallRequest,
    handler: Callable[[ToolCallRequest], ToolMessage | Command],
    *,
    coordinator: TriageSingletonCoordinator,
) -> ToolMessage | Command:
    tool_call = request.tool_call
    args = tool_call.get("args")
    if tool_call.get("name") != "task" or not isinstance(args, dict):
        return handler(request)
    if str(args.get("subagent_type") or "") != "triage":
        return handler(request)

    context = _coerce_context(getattr(request.runtime, "context", None))
    legal_rule_ids = list(context.legal_rule_ids) if context else []
    idempotency_key = context.idempotency_key if context else None
    assessment_id = context.assessment_id if context else None
    trigger = (
        "MANUAL_ENGINEERING_RULE_NOT_READY"
        if legal_rule_ids and idempotency_key
        else "LEGAL_MAINTENANCE"
    )

    reservation = coordinator.reserve_or_join(
        affected_rule_ids=legal_rule_ids,
        idempotency_key=idempotency_key,
        trigger=trigger,
        assessment_id=assessment_id,
    )
    if reservation.status == "RUNNING":
        return ToolMessage(
            content=json.dumps(
                {
                    "status": "RUNNING",
                    "joinedExistingExecution": True,
                    "triageExecutionId": reservation.execution_id,
                    "affectedLegalRuleIds": legal_rule_ids,
                    "requestCount": reservation.request_count,
                    "queueCreated": False,
                    "subagentStarted": False,
                    "message": (
                        "Legal Rule Triage is already running. This request was coalesced "
                        "into the active execution; no queue item or second triage subagent "
                        "was created."
                    ),
                },
                ensure_ascii=False,
                sort_keys=True,
            ),
            tool_call_id=str(tool_call.get("id") or "triage-singleton"),
        )

    execution_id = str(reservation.execution_id or "")
    if not execution_id:
        raise RuntimeError("triage singleton reservation did not return an execution id")

    guarded_args = dict(args)
    description = str(guarded_args.get("description") or "").strip()
    owner_instruction = (
        "GLOBAL TRIAGE SINGLETON RESERVED. "
        f"triageExecutionId={execution_id}. "
        "You are the only active Triage owner. Your first "
        "get_legal_rule_triage_work_items call MUST pass this exact "
        "triage_execution_id so it claims the scope already reserved by the supervisor. "
        "After each completed batch call finish_legal_rule_triage_execution; if it returns "
        "CONTINUE, stay in this same subagent and claim the next merged scope with the same "
        "execution ID. Requests arriving while you run do not create queue items or new agents."
    )
    guarded_args["description"] = (
        f"{owner_instruction}\n\n{description}" if description else owner_instruction
    )
    guarded_call = {**tool_call, "args": guarded_args}

    try:
        result = handler(request.override(tool_call=guarded_call))
    except Exception:
        coordinator.abandon_execution(execution_id=execution_id)
        raise

    # Fail-safe: a correctly completed long-lived triage execution releases itself via
    # finish_legal_rule_triage_execution. If the subagent returns early (for example a
    # provider/model failure), do not leak the global lease. Preserve unfinished scope
    # as RECOVERABLE for the next explicit trigger and release the OS lock.
    active = coordinator.active_status()
    if (
        active.get("active")
        and active.get("triageExecutionId") == execution_id
    ):
        coordinator.abandon_execution(execution_id=execution_id)
    return result


def _coerce_context(value: Any) -> LCSPRunContext | None:
    if isinstance(value, LCSPRunContext):
        return value
    if isinstance(value, dict):
        try:
            return LCSPRunContext(**value)
        except TypeError:
            return None
    return None
