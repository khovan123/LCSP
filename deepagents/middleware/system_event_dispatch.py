"""Dispatch trusted broker events inside the local Deep Agents thread run."""

from __future__ import annotations

from typing import Any, Mapping

from langchain.agents.middleware import before_agent

from orchestration.context import LCSPRunContext
from tools.common.capabilities.agent_runtime.invocation import invoke_boundary
from tools.common.capabilities.platform.callback_schemas import (
    SCAN_CALLBACK_STATUSES,
    ScanCallbackPayload,
)
from tools.common.capabilities.platform.config import load_config
from tools.common.capabilities.platform.api_client import WorkerApiClient
from tools.common.capabilities.platform.repository_sandbox import (
    activate_repository_backend,
    ensure_repository_for_event,
    resolve_repository_thread_backend,
)


@before_agent(can_jump_to=["end"])
def dispatch_agent_runtime_system_event(state, runtime) -> dict[str, Any] | None:
    """Run trusted LCSP system events before the root model is invoked."""
    _ = state
    context = _context(runtime.context)
    if context is None or not context.system_boundary_name or not context.system_event:
        return None

    backend = resolve_repository_thread_backend(_repository_config(runtime))
    correlation_id = (
        context.correlation_id
        or _event_text(context.system_event, "correlationId", "correlation_id")
        or context.system_boundary_name
    )
    scan_job_id = _event_text(context.system_event, "scanJobId", "scan_job_id")
    client = _worker_client()
    _post_scan_runtime_event(
        client,
        scan_job_id,
        event_type="RUN_STARTED",
        run_status="RUNNING",
        summary="Repository scan runtime accepted the scan job",
    )
    try:
        ensure_repository_for_event(
            backend,
            context.system_boundary_name,
            context.system_event,
            lifecycle=lambda event: _post_repository_lifecycle_event(
                client,
                scan_job_id,
                event,
            ),
        )
    except Exception as exc:
        _post_repository_hydration_failed(client, scan_job_id, exc)
        if context.system_boundary_name == "scan_requested" and scan_job_id:
            try:
                _post_failed_scan_callback(client, scan_job_id)
            except Exception:
                pass
        raise
    with activate_repository_backend(backend):
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


def _worker_client() -> WorkerApiClient | None:
    try:
        config = load_config()
    except Exception:
        return None
    return WorkerApiClient(config.nestjs_api_base_url, config.worker_api_key)


def _post_scan_runtime_event(
    client: WorkerApiClient | None,
    scan_job_id: str | None,
    *,
    event_type: str,
    run_status: str,
    summary: str,
    tool_name: str | None = None,
    error_summary: str | None = None,
    output_summary: Mapping[str, Any] | None = None,
) -> None:
    if client is None or not scan_job_id:
        return
    payload: dict[str, Any] = {
        "event_type": event_type,
        "run_status": run_status,
        "stage": "SCAN",
        "summary": summary,
    }
    if tool_name:
        payload["tool_name"] = tool_name
    if error_summary:
        payload["error_summary"] = error_summary
    if output_summary:
        payload["output_summary"] = dict(output_summary)
    client.post_scan_runtime_event(scan_job_id, payload)


def _post_repository_lifecycle_event(
    client: WorkerApiClient | None,
    scan_job_id: str | None,
    event: str,
) -> None:
    mapping = {
        "repository_archive_downloading": {
            "event_type": "TOOL_STARTED",
            "run_status": "RUNNING",
            "tool_name": "repository_archive_download",
            "summary": "Downloading repository archive",
        },
        "repository_archive_downloaded": {
            "event_type": "TOOL_COMPLETED",
            "run_status": "RUNNING",
            "tool_name": "repository_archive_download",
            "summary": "Repository archive downloaded",
        },
        "repository_sandbox_hydrating": {
            "event_type": "TOOL_STARTED",
            "run_status": "RUNNING",
            "tool_name": "repository_sandbox_hydration",
            "summary": "Hydrating repository archive into Docker sandbox",
        },
        "repository_sandbox_hydrated": {
            "event_type": "TOOL_COMPLETED",
            "run_status": "RUNNING",
            "tool_name": "repository_sandbox_hydration",
            "summary": "Repository sandbox hydrated",
        },
        "repository_sandbox_reused": {
            "event_type": "TOOL_COMPLETED",
            "run_status": "RUNNING",
            "tool_name": "repository_sandbox_hydration",
            "summary": "Repository sandbox already hydrated",
        },
    }
    payload = mapping.get(event)
    if payload:
        _post_scan_runtime_event(client, scan_job_id, **payload)


def _post_repository_hydration_failed(
    client: WorkerApiClient | None,
    scan_job_id: str | None,
    exc: Exception,
) -> None:
    error_summary = (
        "Repository sandbox hydration failed before source analysis started"
    )
    _post_scan_runtime_event(
        client,
        scan_job_id,
        event_type="TOOL_FAILED",
        run_status="FAILED",
        tool_name="repository_sandbox_hydration",
        summary="Repository sandbox hydration failed",
        error_summary=error_summary,
        output_summary={"errorType": type(exc).__name__},
    )
    _post_scan_runtime_event(
        client,
        scan_job_id,
        event_type="RUN_FAILED",
        run_status="FAILED",
        summary="Repository scan failed before source analysis started",
        error_summary=error_summary,
        output_summary={"errorCode": "REPOSITORY_SANDBOX_HYDRATION_FAILED"},
    )


def _post_failed_scan_callback(
    client: WorkerApiClient | None,
    scan_job_id: str,
) -> None:
    if client is None:
        return
    client.post_scan_callback(
        scan_job_id,
        ScanCallbackPayload(
            scan_job_id=scan_job_id,
            status=SCAN_CALLBACK_STATUSES["failed"],
            tools_version={},
            config_hash={},
            evidence_payload={
                "failure": {
                    "code": "REPOSITORY_SANDBOX_HYDRATION_FAILED",
                    "phase": "REPOSITORY_SANDBOX_HYDRATING",
                }
            },
            privacy_flags={
                "containsSourceCode": False,
                "secretsRedacted": True,
                "sourceStrippedFromFindings": True,
            },
            error_code="REPOSITORY_SANDBOX_HYDRATION_FAILED",
        ),
    )


def _repository_config(runtime: Any) -> dict[str, dict[str, str]]:
    config = getattr(runtime, "config", None)
    if isinstance(config, dict) and isinstance(config.get("configurable"), dict):
        configurable = config["configurable"]
        if configurable.get("thread_id"):
            return config

    context = _context(getattr(runtime, "context", None))
    if context is None or not context.thread_id:
        return {"configurable": {}}

    event = context.system_event if isinstance(context.system_event, dict) else {}
    configurable = {
        "thread_id": context.thread_id,
        "cwd": "/workspace/repository",
    }
    _copy_if_present(configurable, "assessment_id", context.assessment_id)
    _copy_if_present(
        configurable,
        "snapshot_id",
        context.snapshot_id or _event_text(event, "snapshotId", "snapshot_id"),
    )
    _copy_if_present(
        configurable,
        "scan_job_id",
        context.scan_job_id or _event_text(event, "scanJobId", "scan_job_id"),
    )
    _copy_if_present(
        configurable,
        "commit_sha",
        context.commit_sha or _event_text(event, "commitSha", "commit_sha"),
    )
    return {"configurable": configurable}


def _copy_if_present(target: dict[str, str], key: str, value: str | None) -> None:
    if value:
        target[key] = value


def _event_text(event: Mapping[str, Any], *keys: str) -> str | None:
    for key in keys:
        value = event.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


__all__ = ["dispatch_agent_runtime_system_event"]
