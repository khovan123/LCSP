"""Submit broker events into the local LangGraph Agent Server."""

from __future__ import annotations

import os
from typing import Any, Mapping
from uuid import UUID, uuid5

from langgraph_sdk import get_sync_client


DEFAULT_AGENT_SERVER_URL = "http://127.0.0.1:2024"
DEFAULT_ASSISTANT_ID = "lcsp-agent"
_THREAD_NAMESPACE = UUID("b7b26975-09de-44e5-a7d5-c996523fd289")


def dispatch_agent_runtime_event(
    boundary_name: str,
    message: dict[str, Any],
    correlation_id: str,
) -> dict[str, Any] | list[dict[str, Any]]:
    """Create/reuse one assessment thread and synchronously execute the system event."""
    thread_id = agent_thread_id(boundary_name, message, correlation_id)
    assessment_id = _find_text(message, "assessmentId", "assessment_id")
    workflow_run_id = _find_text(
        message,
        "workflowRunId",
        "workflow_run_id",
        "runId",
        "run_id",
        "scanJobId",
        "scan_job_id",
    )

    context = {
        "assessment_id": assessment_id,
        "workflow_run_id": workflow_run_id,
        "thread_id": thread_id,
        "snapshot_id": _find_text(message, "snapshotId", "snapshot_id"),
        "scan_job_id": _find_text(message, "scanJobId", "scan_job_id"),
        "commit_sha": _find_text(message, "commitSha", "commit_sha"),
        "correlation_id": correlation_id,
        "system_boundary_name": boundary_name,
        "system_event": message,
        "repository_path": "/",
    }

    client = get_sync_client(
        url=os.getenv("LCSP_AGENT_SERVER_URL", DEFAULT_AGENT_SERVER_URL),
        timeout=600,
    )
    metadata = {"lcspAgentRuntimeThread": True}
    if assessment_id:
        metadata["assessmentId"] = assessment_id

    client.threads.create(
        thread_id=thread_id,
        if_exists="do_nothing",
        metadata=metadata,
    )
    return client.runs.wait(
        thread_id,
        os.getenv("LCSP_AGENT_ASSISTANT_ID", DEFAULT_ASSISTANT_ID),
        input={
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "A trusted LCSP system event is present in runtime context. "
                        "Root middleware dispatches it before model invocation. "
                        "Do not copy the event payload into messages and do not invent "
                        "repository evidence."
                    ),
                }
            ]
        },
        context=context,
        metadata={
            "lcsp_boundary_name": boundary_name,
            "correlation_id": correlation_id,
            "assessment_id": assessment_id,
        },
        multitask_strategy="enqueue",
        on_completion="keep",
    )


def agent_thread_id(
    boundary_name: str,
    message: Mapping[str, Any],
    correlation_id: str,
) -> str:
    """Use one stable LangGraph thread/sandbox for the full assessment lifetime."""
    assessment_id = _find_text(message, "assessmentId", "assessment_id")
    if assessment_id:
        seed = f"assessment:{assessment_id}"
    else:
        workflow_run_id = _find_text(
            message,
            "workflowRunId",
            "workflow_run_id",
            "runId",
            "run_id",
            "scanJobId",
            "scan_job_id",
        )
        seed = (
            f"workflow:{workflow_run_id}"
            if workflow_run_id
            else f"event:{boundary_name}:{correlation_id}"
        )
    return str(uuid5(_THREAD_NAMESPACE, seed))


def _find_text(value: Any, *keys: str, depth: int = 5) -> str | None:
    if depth < 0:
        return None
    if isinstance(value, Mapping):
        for key in keys:
            candidate = value.get(key)
            if isinstance(candidate, str) and candidate.strip():
                return candidate.strip()
        for nested in value.values():
            found = _find_text(nested, *keys, depth=depth - 1)
            if found:
                return found
    elif isinstance(value, (list, tuple)):
        for nested in value[:50]:
            found = _find_text(nested, *keys, depth=depth - 1)
            if found:
                return found
    return None


__all__ = [
    "DEFAULT_AGENT_SERVER_URL",
    "DEFAULT_ASSISTANT_ID",
    "agent_thread_id",
    "dispatch_agent_runtime_event",
]
