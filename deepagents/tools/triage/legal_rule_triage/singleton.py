"""Durable singleton coordination for the shared Legal Rule Triage agent.

There is no Triage job queue. The first trigger reserves one global execution lease.
While that execution is RUNNING, later scheduled/manual requests join the active
state by coalescing their LegalRule scope and idempotency key. The current owner
drains that merged scope before releasing the lease.
"""

from __future__ import annotations

import fcntl
import hashlib
import json
import os
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from threading import RLock
from time import sleep
from typing import Any, Iterator, TextIO
from uuid import uuid4

from tools.common.capabilities.platform.config import default_legal_source_storage_root


TRIAGE_RUNTIME_DIR = "triage-runtime"
TRIAGE_EXECUTION_LOCK_FILE = "singleton.lock"
TRIAGE_STATE_LOCK_FILE = "state.lock"
TRIAGE_ACTIVE_FILE = "active.json"
_LOCAL_GUARD = RLock()
_ACTIVE_LEASES: dict[str, TextIO] = {}


@dataclass(frozen=True)
class TriageLeaseResult:
    """Bounded singleton state returned to orchestration/tool boundaries."""

    status: str
    execution_id: str | None
    affected_rule_ids: tuple[str, ...]
    full_backlog: bool
    include_completed: bool
    request_count: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "triageExecutionId": self.execution_id,
            "affectedLegalRuleIds": list(self.affected_rule_ids),
            "fullBacklog": self.full_backlog,
            "includeCompleted": self.include_completed,
            "requestCount": self.request_count,
        }


class TriageSingletonCoordinator:
    """Guarantee one active Legal Rule Triage execution per shared runtime store."""

    def __init__(self, *, storage_root: Path | None = None) -> None:
        root = storage_root
        if root is None:
            configured = os.getenv("LEGAL_SOURCE_STORAGE_ROOT")
            root = (
                Path(configured)
                if configured
                else Path(default_legal_source_storage_root())
            )
        self.runtime_root = root.resolve() / TRIAGE_RUNTIME_DIR
        self.execution_lock_path = self.runtime_root / TRIAGE_EXECUTION_LOCK_FILE
        self.state_lock_path = self.runtime_root / TRIAGE_STATE_LOCK_FILE
        self.active_path = self.runtime_root / TRIAGE_ACTIVE_FILE

    def reserve_or_join(
        self,
        *,
        affected_rule_ids: list[str] | None,
        idempotency_key: str | None,
        trigger: str,
        assessment_id: str | None = None,
        include_completed: bool = False,
    ) -> TriageLeaseResult:
        """Reserve the one Triage execution or merge into the execution already RUNNING."""
        self._ensure_runtime_dir()
        request = self._request_payload(
            affected_rule_ids=affected_rule_ids,
            idempotency_key=idempotency_key,
            trigger=trigger,
            assessment_id=assessment_id,
            include_completed=include_completed,
        )

        # The execution lock is authoritative. If another process owns it, this
        # request modifies only active.json under the separate state lock; it never
        # creates another queue/job or another Triage model execution.
        for _attempt in range(50):
            lease_file = self.execution_lock_path.open("a+", encoding="utf-8")
            try:
                fcntl.flock(lease_file.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            except BlockingIOError:
                lease_file.close()
                joined = self._merge_into_running(request)
                if joined is not None:
                    return joined
                sleep(0.01)
                continue

            execution_id = f"triage:{uuid4()}"
            with _LOCAL_GUARD:
                _ACTIVE_LEASES[execution_id] = lease_file
            try:
                with self._locked_state():
                    stale = self._read_active_state_unlocked()
                    state = self._recover_or_initialize_state(
                        stale=stale,
                        execution_id=execution_id,
                    )
                    self._merge_request_unlocked(state, request)
                    self._write_active_state_unlocked(state)
                    return TriageLeaseResult(
                        status="OWNER",
                        execution_id=execution_id,
                        affected_rule_ids=tuple(request["affectedLegalRuleIds"]),
                        full_backlog=bool(request["fullBacklog"]),
                        include_completed=bool(request["includeCompleted"]),
                        request_count=len(state.get("requestKeys") or []),
                    )
            except Exception:
                self._release_file_lease(execution_id)
                raise

        raise RuntimeError("could not resolve active triage singleton execution")

    def claim_pending_scope(self, *, execution_id: str) -> TriageLeaseResult:
        """Claim the currently coalesced scope for the already-reserved singleton owner."""
        self.assert_owner(execution_id)
        with self._locked_state():
            state = self._read_active_state_unlocked()
            self._assert_execution_state(state, execution_id)
            return self._claim_pending_scope_unlocked(state)

    def submit_or_continue(
        self,
        *,
        affected_rule_ids: list[str] | None,
        idempotency_key: str | None,
        trigger: str,
        assessment_id: str | None = None,
        include_completed: bool = False,
        execution_id: str | None = None,
    ) -> TriageLeaseResult:
        """Compatibility helper: reserve+claim initially, or claim joined scope as owner."""
        if execution_id:
            return self.claim_pending_scope(execution_id=execution_id)
        reservation = self.reserve_or_join(
            affected_rule_ids=affected_rule_ids,
            idempotency_key=idempotency_key,
            trigger=trigger,
            assessment_id=assessment_id,
            include_completed=include_completed,
        )
        if reservation.status == "RUNNING":
            return reservation
        if not reservation.execution_id:
            raise RuntimeError("triage singleton reservation is missing execution id")
        return self.claim_pending_scope(execution_id=reservation.execution_id)

    def assert_owner(self, execution_id: str) -> None:
        """Fail before protected work when caller is not the singleton owner."""
        self._assert_local_owner(execution_id)
        with self._locked_state():
            state = self._read_active_state_unlocked()
            self._assert_execution_state(state, execution_id)

    def set_batch_work(self, *, execution_id: str, legal_rule_ids: list[str]) -> None:
        """Record exact ready LegalRules assigned to the active owner batch."""
        self._assert_local_owner(execution_id)
        with self._locked_state():
            state = self._read_active_state_unlocked()
            self._assert_execution_state(state, execution_id)
            state["activeBatchLegalRuleIds"] = sorted(
                dict.fromkeys(
                    str(value) for value in legal_rule_ids if str(value).strip()
                )
            )
            self._write_active_state_unlocked(state)

    def mark_rule_completed(self, *, execution_id: str, legal_rule_id: str) -> None:
        """Remove one successfully persisted LegalRule from the owner batch."""
        self._assert_local_owner(execution_id)
        with self._locked_state():
            state = self._read_active_state_unlocked()
            self._assert_execution_state(state, execution_id)
            state["activeBatchLegalRuleIds"] = [
                value
                for value in (state.get("activeBatchLegalRuleIds") or [])
                if str(value) != str(legal_rule_id)
            ]
            completed = list(state.get("completedLegalRuleIds") or [])
            completed.append(str(legal_rule_id))
            state["completedLegalRuleIds"] = sorted(dict.fromkeys(completed))
            self._write_active_state_unlocked(state)

    def finish_or_drain(self, *, execution_id: str) -> TriageLeaseResult:
        """Continue the same owner for joined scope, otherwise release the lease."""
        self._assert_local_owner(execution_id)
        should_release = False
        with self._locked_state():
            state = self._read_active_state_unlocked()
            self._assert_execution_state(state, execution_id)
            remaining = [
                str(value) for value in (state.get("activeBatchLegalRuleIds") or [])
            ]
            if remaining:
                raise RuntimeError(
                    "triage execution cannot finish while LegalRule work remains: "
                    + ",".join(remaining)
                )

            if self._has_pending_scope(state):
                return self._lease_result_from_pending("CONTINUE", state)

            result = self._lease_result("COMPLETE", state)
            self.active_path.unlink(missing_ok=True)
            should_release = True

        if should_release:
            self._release_file_lease(execution_id)
        return result

    def active_status(self) -> dict[str, Any]:
        """Return privacy-safe singleton state for observability/tests."""
        self._ensure_runtime_dir()
        with self._locked_state():
            state = self._read_active_state_unlocked()
        return {
            "active": bool(state.get("executionId")),
            "status": state.get("status"),
            "triageExecutionId": state.get("executionId"),
            "requestCount": len(state.get("requestKeys") or []),
            "activeBatchLegalRuleIds": list(state.get("activeBatchLegalRuleIds") or []),
            "joinedLegalRuleIds": list(state.get("pendingLegalRuleIds") or []),
            "joinedFullBacklog": bool(state.get("pendingFullBacklog")),
        }

    def _merge_into_running(
        self,
        request: dict[str, Any],
    ) -> TriageLeaseResult | None:
        with self._locked_state():
            state = self._read_active_state_unlocked()
            if not state.get("executionId") or state.get("status") != "RUNNING":
                return None
            self._merge_request_unlocked(state, request)
            self._write_active_state_unlocked(state)
            return TriageLeaseResult(
                status="RUNNING",
                execution_id=str(state["executionId"]),
                affected_rule_ids=tuple(request["affectedLegalRuleIds"]),
                full_backlog=bool(request["fullBacklog"]),
                include_completed=bool(request["includeCompleted"]),
                request_count=len(state.get("requestKeys") or []),
            )

    def _claim_pending_scope_unlocked(
        self,
        state: dict[str, Any],
    ) -> TriageLeaseResult:
        if not self._has_pending_scope(state):
            raise RuntimeError("triage singleton owner has no joined scope to drain")
        result = self._lease_result_from_pending("OWNER", state)
        state["pendingLegalRuleIds"] = []
        state["pendingFullBacklog"] = False
        state["pendingIncludeCompleted"] = False
        self._write_active_state_unlocked(state)
        return result

    def _recover_or_initialize_state(
        self,
        *,
        stale: dict[str, Any],
        execution_id: str,
    ) -> dict[str, Any]:
        # A crashed process loses its OS lock automatically. Preserve any unfinished
        # active/pending scope so the next singleton owner can safely retry it; READY
        # completion fingerprints make replay idempotent.
        recovered_ids = [
            *[str(value) for value in (stale.get("activeBatchLegalRuleIds") or [])],
            *[str(value) for value in (stale.get("pendingLegalRuleIds") or [])],
        ]
        now = _now()
        return {
            "executionId": execution_id,
            "status": "RUNNING",
            "requestKeys": list(stale.get("requestKeys") or []),
            "pendingLegalRuleIds": sorted(dict.fromkeys(recovered_ids)),
            "pendingFullBacklog": bool(stale.get("pendingFullBacklog")),
            "pendingIncludeCompleted": bool(stale.get("pendingIncludeCompleted")),
            "activeBatchLegalRuleIds": [],
            "completedLegalRuleIds": list(stale.get("completedLegalRuleIds") or []),
            "startedAt": now,
            "updatedAt": now,
        }

    def _merge_request_unlocked(
        self,
        state: dict[str, Any],
        request: dict[str, Any],
    ) -> None:
        keys = list(state.get("requestKeys") or [])
        keys.append(str(request["requestKey"]))
        state["requestKeys"] = sorted(dict.fromkeys(keys))

        if request["fullBacklog"]:
            state["pendingFullBacklog"] = True
            state["pendingLegalRuleIds"] = []
        elif not state.get("pendingFullBacklog"):
            values = list(state.get("pendingLegalRuleIds") or [])
            values.extend(str(value) for value in request["affectedLegalRuleIds"])
            active = {str(value) for value in (state.get("activeBatchLegalRuleIds") or [])}
            state["pendingLegalRuleIds"] = sorted(
                value for value in dict.fromkeys(values) if value not in active
            )

        if request["includeCompleted"]:
            state["pendingIncludeCompleted"] = True

    @staticmethod
    def _has_pending_scope(state: dict[str, Any]) -> bool:
        return bool(state.get("pendingFullBacklog")) or bool(
            state.get("pendingLegalRuleIds")
        )

    @staticmethod
    def _lease_result_from_pending(
        status: str,
        state: dict[str, Any],
    ) -> TriageLeaseResult:
        return TriageLeaseResult(
            status=status,
            execution_id=str(state.get("executionId") or "") or None,
            affected_rule_ids=tuple(
                str(value) for value in (state.get("pendingLegalRuleIds") or [])
            ),
            full_backlog=bool(state.get("pendingFullBacklog")),
            include_completed=bool(state.get("pendingIncludeCompleted")),
            request_count=len(state.get("requestKeys") or []),
        )

    @staticmethod
    def _lease_result(status: str, state: dict[str, Any]) -> TriageLeaseResult:
        return TriageLeaseResult(
            status=status,
            execution_id=str(state.get("executionId") or "") or None,
            affected_rule_ids=(),
            full_backlog=False,
            include_completed=False,
            request_count=len(state.get("requestKeys") or []),
        )

    def _request_payload(
        self,
        *,
        affected_rule_ids: list[str] | None,
        idempotency_key: str | None,
        trigger: str,
        assessment_id: str | None,
        include_completed: bool,
    ) -> dict[str, Any]:
        normalized_ids = sorted(
            dict.fromkeys(
                str(value)
                for value in (affected_rule_ids or [])
                if str(value).strip()
            )
        )
        canonical_key = str(idempotency_key or "").strip()
        if not canonical_key:
            canonical_key = "|".join(
                [
                    str(trigger or "LEGAL_MAINTENANCE"),
                    str(assessment_id or ""),
                    *normalized_ids,
                    "include-completed" if include_completed else "pending-only",
                ]
            )
        return {
            "requestKey": hashlib.sha256(canonical_key.encode("utf-8")).hexdigest(),
            "affectedLegalRuleIds": normalized_ids,
            "fullBacklog": not normalized_ids,
            "includeCompleted": bool(include_completed),
        }

    @contextmanager
    def _locked_state(self) -> Iterator[None]:
        self._ensure_runtime_dir()
        lock_file = self.state_lock_path.open("a+", encoding="utf-8")
        try:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
            yield
        finally:
            try:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
            finally:
                lock_file.close()

    def _read_active_state_unlocked(self) -> dict[str, Any]:
        if not self.active_path.is_file():
            return {}
        try:
            value = json.loads(self.active_path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        return value if isinstance(value, dict) else {}

    def _write_active_state_unlocked(self, state: dict[str, Any]) -> None:
        state["updatedAt"] = _now()
        temporary = self.active_path.with_suffix(f".{os.getpid()}.tmp")
        temporary.write_text(
            json.dumps(state, ensure_ascii=False, sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )
        temporary.replace(self.active_path)

    def _release_file_lease(self, execution_id: str) -> None:
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
        if state.get("executionId") != execution_id or state.get("status") != "RUNNING":
            raise RuntimeError("triage execution does not match the durable active lease")

    def _ensure_runtime_dir(self) -> None:
        self.runtime_root.mkdir(parents=True, exist_ok=True)
        self.execution_lock_path.touch(exist_ok=True)
        self.state_lock_path.touch(exist_ok=True)


def _now() -> str:
    return datetime.now(UTC).isoformat()
