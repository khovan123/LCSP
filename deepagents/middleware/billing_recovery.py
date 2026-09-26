"""Durable, callback-only recovery for billing side effects.

The provider is never replayed from this store.  Rows contain only the billing
contract payload (numeric usage and identities), never prompts or model output.
"""

from __future__ import annotations

import json
import sqlite3
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from tools.common.capabilities.platform.callback_schemas import (
    BillingReservationReleasePayload,
    SettledUsagePayload,
)

_workers: set[str] = set()
_workers_lock = threading.Lock()


def enqueue_usage(path: str | Path, payload: SettledUsagePayload) -> None:
    _enqueue(
        path,
        "USAGE",
        f"usage:{payload.reservationId}:{payload.invocationId}",
        payload.model_dump(mode="json"),
    )


def enqueue_release(
    path: str | Path,
    reservation_id: str,
    payload: BillingReservationReleasePayload,
) -> None:
    _enqueue(
        path,
        "RELEASE",
        f"release:{reservation_id}",
        {"reservationId": reservation_id, **payload.model_dump(mode="json")},
    )


def enqueue_usage_and_release(
    path: str | Path,
    usage_payload: SettledUsagePayload,
    release_payload: BillingReservationReleasePayload,
) -> None:
    """Persist usage and its dependent release in one SQLite transaction."""
    reservation_id = usage_payload.reservationId
    db = _connect(path)
    try:
        db.execute("BEGIN")
        db.execute(
            """
            INSERT INTO billing_callback_recovery(kind, recovery_key, payload)
            VALUES ('USAGE', ?, ?)
            ON CONFLICT(recovery_key) DO NOTHING
            """,
            (
                f"usage:{reservation_id}:{usage_payload.invocationId}",
                json.dumps(
                    usage_payload.model_dump(mode="json"),
                    separators=(",", ":"),
                    sort_keys=True,
                ),
            ),
        )
        db.execute(
            """
            INSERT INTO billing_callback_recovery(kind, recovery_key, payload)
            VALUES ('RELEASE', ?, ?)
            ON CONFLICT(recovery_key) DO NOTHING
            """,
            (
                f"release:{reservation_id}",
                json.dumps(
                    {"reservationId": reservation_id, **release_payload.model_dump(mode="json")},
                    separators=(",", ":"),
                    sort_keys=True,
                ),
            ),
        )
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def drain(path: str | Path, api_client: Any) -> int:
    """Deliver pending callbacks in order; return the number removed.

    A failed row remains pending, so a later recovery attempt can retry it.  The
    API endpoints are idempotent and the keys intentionally remain unchanged.
    """
    db = _connect(path)
    delivered = 0
    try:
        rows = db.execute(
            """
            SELECT id, kind, payload
            FROM billing_callback_recovery
            WHERE state = 'PENDING'
            ORDER BY id
            """
        ).fetchall()
        for row_id, kind, raw_payload in rows:
            payload = json.loads(raw_payload)
            if kind == "USAGE":
                payload = _normalize_usage_recovery_payload(payload)
            if kind == "RELEASE" and _has_pending_usage(
                db, payload["reservationId"]
            ):
                # Never release a reservation while its usage debit is still
                # pending; that would make a successful provider call unchargeable.
                continue
            try:
                if kind == "USAGE":
                    api_client.post_settled_usage(
                        SettledUsagePayload.model_validate(payload)
                    )
                else:
                    api_client.release_billing_reservation(
                        payload["reservationId"],
                        BillingReservationReleasePayload.model_validate(
                            {"assessmentId": payload["assessmentId"]}
                        ),
                    )
            except Exception as error:
                if _is_permanent_ownership_mismatch(error):
                    _dead_letter(
                        db,
                        row_id,
                        "BILLING_OWNERSHIP_MISMATCH: reservation ownership mismatch is permanent",
                    )
                    continue
                # One poisoned callback must not block unrelated users. The
                # row remains pending for retry/quarantine by the API contract.
                continue
            db.execute("DELETE FROM billing_callback_recovery WHERE id = ?", (row_id,))
            db.commit()
            delivered += 1
    finally:
        db.close()
    return delivered


def start_background_worker(
    path: str | Path, api_client: Any, interval_seconds: float = 30.0
) -> None:
    """Start callback recovery independently of future model traffic."""
    key = str(Path(path).absolute())
    with _workers_lock:
        if key in _workers:
            return
        _workers.add(key)

    def run() -> None:
        while True:
            try:
                drain(path, api_client)
            except Exception:
                pass
            time.sleep(interval_seconds)

    threading.Thread(
        target=run,
        name="billing-callback-recovery",
        daemon=True,
    ).start()


def _enqueue(path: str | Path, kind: str, key: str, payload: dict[str, Any]) -> None:
    db = _connect(path)
    try:
        db.execute(
            """
            INSERT INTO billing_callback_recovery(kind, recovery_key, payload)
            VALUES (?, ?, ?)
            ON CONFLICT(recovery_key) DO NOTHING
            """,
            (kind, key, json.dumps(payload, separators=(",", ":"), sort_keys=True)),
        )
        db.commit()
    finally:
        db.close()


def _connect(path: str | Path) -> sqlite3.Connection:
    target = Path(path)
    target.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(target, timeout=10)
    db.execute("PRAGMA journal_mode=WAL")
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS billing_callback_recovery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            kind TEXT NOT NULL,
            recovery_key TEXT NOT NULL UNIQUE,
            payload TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'PENDING',
            dead_letter_reason TEXT,
            dead_lettered_at TEXT
        )
        """
    )
    _ensure_column(db, "state", "TEXT NOT NULL DEFAULT 'PENDING'")
    _ensure_column(db, "dead_letter_reason", "TEXT")
    _ensure_column(db, "dead_lettered_at", "TEXT")
    db.commit()
    return db


def _ensure_column(db: sqlite3.Connection, column: str, definition: str) -> None:
    rows = db.execute("PRAGMA table_info(billing_callback_recovery)").fetchall()
    if any(row[1] == column for row in rows):
        return
    db.execute(
        f"ALTER TABLE billing_callback_recovery ADD COLUMN {column} {definition}"
    )


def _dead_letter(db: sqlite3.Connection, row_id: int, reason: str) -> None:
    db.execute(
        """
        UPDATE billing_callback_recovery
        SET state = 'POISON',
            dead_letter_reason = ?,
            dead_lettered_at = ?
        WHERE id = ?
        """,
        (
            reason,
            datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            row_id,
        ),
    )
    db.commit()


def _is_permanent_ownership_mismatch(error: BaseException) -> bool:
    status_code = getattr(error, "status_code", None)
    return status_code == 403 and "BILLING_OWNERSHIP_MISMATCH" in str(error)


def _normalize_usage_recovery_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize legacy callback timestamps to the canonical UTC-Z contract."""
    occurred_at = payload.get("occurredAt")
    if not isinstance(occurred_at, str) or not occurred_at.strip():
        return payload
    normalized = occurred_at.strip().replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return payload
    if parsed.tzinfo is None:
        return payload
    canonical = (
        parsed.astimezone(timezone.utc)
        .isoformat()
        .replace("+00:00", "Z")
    )
    if canonical == occurred_at:
        return payload
    return {**payload, "occurredAt": canonical}


def _has_pending_usage(db: sqlite3.Connection, reservation_id: str) -> bool:
    rows = db.execute(
        """
        SELECT payload
        FROM billing_callback_recovery
        WHERE kind = 'USAGE' AND state = 'PENDING'
        """
    ).fetchall()
    return any(json.loads(row[0]).get("reservationId") == reservation_id for row in rows)


__all__ = [
    "enqueue_usage",
    "enqueue_release",
    "enqueue_usage_and_release",
    "drain",
    "start_background_worker",
]
