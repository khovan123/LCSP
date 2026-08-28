"""Durable singleton coordination for the shared Legal Rule Triage agent.

The triage model is logically long-lived and shared by every scheduled/manual trigger.
Only one execution may own the global triage lease at a time. Concurrent requests are
persisted as small, non-sensitive queue records and are drained by the active owner
before it releases the lease.
"""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock
from typing import Any, TextIO
from uuid import uuid4

from tools.common.capabilities.platform.config import default_legal_source_storage_root


TRIAGE_RUNTIME_DIR = "triage-runtime"
TRIAGE_PENDING_DIR = "pending"
TRIAGE_LOCK_FILE = "singleton.lock"
TRIAGE_ACTIVE_FILE = "active.json"
_LOCAL_GUARD = RLock()
_ACTIVE_LEASES: dict[str, TextIO] = {}


@dataclass(frozen=True)
class TriageLeaseResult:
    status: str
    execution_id: str | None
    affected_rule_ids: tuple[str, ...]
    full_backlog: bool
    request_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "triageExecutionId": self.execution_id,
            "affectedLegalRuleIds": list(self.affected_rule_ids),
            "fullBacklog": self.full_backlog,
            "requestCount": self.request_count,
        }


class TriageSingletonCoordinator:
    """Serialize all Legal Rule Triage work through one durable global lease."""

    def __init__(self, *, storage_root: Path | None = None) -> None:
        root = storage_root
        if root is None:
            configured = os.getenv("LEGAL_SOURCE_STORAGE_ROOT")
            root = Path(configured) if configured else Path(default_legal_source_storage_root())
        self.runtime_root = root.resolve() / TRIAGE_RUNTIME_DIR
        self.pending_root = self.runtime_root / TRIAGE_PENDING_DIR
        self.lock_path = self.runtime_root / TRIAGE_LOCK_FILE
        self.active_path = self.runtime_root / TRIAGE_ACTIVE_FILE

    def submit_or_continue(
        self,
        *,
        affected_rule_ids: list[str] | None,
        idempotency_key: str | None,
        trigger: str,
        assessment_id: str | None = None,
        execution_id: str | None = None,
    ) -> TriageLeaseResult:
        """Queue one request or continue the already-owned singleton execution."""
        self._ensure_dirs()
        if execution_id:
            self._assert_local_owner(execution_id)
            state = self._read_active_state()
            if state.get("executionId") != execution_id:
                raise RuntimeError("triage execution no longer owns the global lease")
            return self._lease_result("OWNER", state)

        request = self._request_payload(
            affected_rule_ids=affected_rule_ids,
            idempotency_key=idempotency_key,
            trigger=trigger,
            assessment_id=assessment_id,
        )
        self._write_pending_once(request)

        with _LOCAL_GUARD:
            if _ACTIVE_LEASES:
                return self._queued_result()

            lease_file = self.lock_path.open("a+", encoding="utf-8")
            try:
                fcntl.flock(lease_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                lease_file.close()
                return self._queued_result()

            execution_id = f"triage:{uuid4()}"
            _ACTIVE_LEASES[execution_id] = lease_file
            state = self._build_active_state(execution_id)
            self._write_active_state(state)
            return self._lease_result("OWNER", state)

    def set_batch_work(self, *, execution_id: str, legal_rule_ids: list[str]) -> None:
        """Record the exact rule IDs the active owner must finish before release."""
        self._assert_local_owner(execution_id)
        state = self._read_active_state()
        self._assert_execution_state(state, execution_id)
        state["remainingLegalRuleIds"] = sorted(
            dict.fromkeys(str(value) for value in legal_rule_ids if str(value).strip())
        )
        self._write_active_state(state)

    def mark_rule_completed(self, *, execution_id: str, legal_rule_id: str) -> None:
        """Mark one persisted LegalRule result complete without releasing the lease."""
        self._assert_local_owner(execution_id)
        state = self._read_active_state()
        self._assert_execution_state(state, execution_id)
        remaining = [
            value
            for value in (state.get("remainingLegalRuleIds") or [])
            if str(value) != str(legal_rule_id)
        ]
        state["remainingLegalRuleIds"] = remaining
        self._write_active_state(state)

    def finish_or_drain(self, *, execution_id: str) -> TriageLeaseResult:
        """Drain newly queued requests or release the singleton lease when fully idle."""
        self._assert_local_owner(execution_id)
        state = self._read_active_state()
        self._assert_execution_state(state, execution_id)
        remaining = [str(value) for value in (state.get("remainingLegalRuleIds") or [])]
        if remaining:
            raise RuntimeError(
                "triage execution cannot finish while LegalRule work remains: "
                + ",".join(remaining)
            )

        claimed = set(str(value) for value in (state.get("requestKeys") or []))
        all_requests = self._pending_requests()
        newly_queued = [
            request for request in all_requests if str(request.get("requestKey")) not in claimed
        ]
        if newly_queued:
            request_keys = [*claimed]
            request_keys.extend(str(item["requestKey"]) for item in newly_queued)
            state["requestKeys"] = sorted(dict.fromkeys(request_keys))
            scope = self._scope_from_requests(
                [
                    request
                    for request in all_requests
                    if str(request.get("requestKey")) in set(state["requestKeys"])
                ]
            )
            state["affectedLegalRuleIds"] = list(scope[0])
            state["fullBacklog"] = scope[1]
            state["remainingLegalRuleIds"] = []
            state["updatedAt"] = _now()
            self._write_active_state(state)
            return self._lease_result("CONTINUE", state)

        result = self._lease_result("COMPLETE", state)
        self._release(execution_id=execution_id, state=state)
        return result

    def active_status(self) -> dict[str, Any]:
        """Return privacy-safe singleton state for tests/observability."""
        state = self._read_active_state()
        return {
            "active": bool(state.get("executionId")),
            "triageExecutionId": state.get("executionId"),
            "requestCount": len(state.get("requestKeys") or []),
            "remainingLegalRuleIds": list(state.get("remainingLegalRuleIds") or []),
        }

    def _build_active_state(self, execution_id: str) -> dict[str, Any]:
        requests = self._pending_requests()
        scope, full_backlog = self._scope_from_requests(requests)
        now = _now()
        return {
            "executionId": execution_id,
            "requestKeys": sorted(str(item["requestKey"]) for item in requests),
            "affectedLegalRuleIds": list(scope),
            "fullBacklog": full_backlog,
            "remainingLegalRuleIds": [],
            "startedAt": now,
            "updatedAt": now,
        }

    def _queued_result(self) -> TriageLeaseResult:
        state = self._read_active_state()
        pending = self._pending_requests()
        return TriageLeaseResult(
            status="QUEUED",
            execution_id=(str(state.get("executionId")) if state.get("executionId") else None),
            affected_rule_ids=(),
            full_backlog=False,
            request_count=len(pending),
        )

    @staticmethod
    def _lease_result(status: str, state: dict[str, Any]) -> TriageLeaseResult:
        return TriageLeaseResult(
            status=status,
            execution_id=str(state.get("executionId") or "") or None,
            affected_rule_ids=tuple(
                str(value) for value in (state.get("affectedLegalRuleIds") or [])
            ),
            full_backlog=bool(state.get("fullBacklog")),
            request_count=len(state.get("requestKeys") or []),
        )

    def _request_payload(
        self,
        *,
        affected_rule_ids: list[str] | None,
        idempotency_key: str | None,
        trigger: str,
        assessment_id: str | None,
    ) -> dict[str, Any]:
        normalized_ids = sorted(
            dict.fromkeys(
                str(value) for value in (affected_rule_ids or []) if str(value).strip()
            )
        )
        canonical_key = str(idempotency_key or "").strip()
        if not canonical_key:
            canonical_key = "|".join(
                [str(trigger or "LEGAL_MAINTENANCE"), str(assessment_id or ""), *normalized_ids]
            )
        request_key = hashlib.sha256(canonical_key.encode("utf-8")).hexdigest()
        return {
            "requestKey": request_key,
            "idempotencyKey": canonical_key,
            "trigger": str(trigger or "LEGAL_MAINTENANCE"),
            "assessmentId": str(assessment_id) if assessment_id else None,
            "affectedLegalRuleIds": normalized_ids,
            "fullBacklog": not normalized_ids,
            "enqueuedAt": _now(),
        }

    def _write_pending_once(self, request: dict[str, Any]) -> None:
        path = self.pending_root / f"{request['requestKey']}.json"
        if path.exists():
            return
        temporary = path.with_suffix(f".{os.getpid()}.tmp")
        temporary.write_text(
            json.dumps(request, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )
        try:
            os.link(temporary, path)
        except FileExistsError:
            pass
        finally:
            temporary.unlink(missing_ok=True)

    def _pending_requests(self) -> list[dict[str, Any]]:
        requests: list[dict[str, Any]] = []
        for path in sorted(self.pending_root.glob("*.json")):
            try:
                payload = json.loads(path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                continue
            if isinstance(payload, dict) and payload.get("requestKey"):
                requests.append(payload)
        return requests

    @staticmethod
    def _scope_from_requests(requests: list[dict[str, Any]]) -> tuple[tuple[str, ...], bool]:
        full_backlog = any(bool(item.get("fullBacklog")) for item in requests)
        if full_backlog:
            return (), True
        values: list[str] = []
        for item in requests:
            values.extend(
                str(value)
                for value in (item.get("affectedLegalRuleIds") or [])
                if str(value).strip()
            )
        return tuple(sorted(dict.fromkeys(values))), False

    def _write_active_state(self, state: dict[str, Any]) -> None:
        state = {**state, "updatedAt": _now()}
        temporary = self.active_path.with_suffix(f".{os.getpid()}.tmp")
        temporary.write_text(
            json.dumps(state, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(self.active_path)

    def _read_active_state(self) -> dict[str, Any]:
        if not self.active_path.is_file():
            return {}
        try:
            value = json.loads(self.active_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        return value if isinstance(value, dict) else {}

    def _release(self, *, execution_id: str, state: dict[str, Any]) -> None:
        for request_key in state.get("requestKeys") or []:
            (self.pending_root / f"{request_key}.json").unlink(missing_ok=True)
        self.active_path.unlink(missing_ok=True)
        with _LOCAL_GUARD:
            lease_file = _ACTIVE_LEASES.pop(execution_id, None)
            if lease_file is not None:
                try:
                    fcntl.flock(lease_file.fileno(), fcntl.LOCK_UN)
                finally:
                    lease_file.close()

    def _assert_local_owner(self, execution_id: str) -> None:
        with _LOCAL_GUARD:
            if execution_id not in _ACTIVE_LEASES:
                raise RuntimeError("triage execution does not own the process lease")

    @staticmethod
    def _assert_execution_state(state: dict[str, Any], execution_id: str) -> None:
        if state.get("executionId") != execution_id:
            raise RuntimeError("triage execution does not match the durable active lease")

    def _ensure_dirs(self) -> None:
        self.pending_root.mkdir(parents=True, exist_ok=True)
        self.lock_path.touch(exist_ok=True)


def _now() -> str:
    return datetime.now(UTC).isoformat()
