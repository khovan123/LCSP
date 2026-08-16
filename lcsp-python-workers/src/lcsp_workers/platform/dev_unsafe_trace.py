"""Development-only unredacted runtime tracing.

This module is intentionally unsafe and must never be enabled in production.
It exists so local developers can inspect the exact values crossing LCSP runtime
boundaries while the normal persistence/callback privacy controls remain intact.

When ``LCSP_DEV_UNSAFE_TRACE=true`` every emitted record is written verbatim as
one JSON line to stderr. No credential, source-code, idempotency-key, prompt,
request, response, or tool payload redaction is applied by this module.
"""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
import json
import os
import sys
from typing import Any, Mapping, Sequence

from lcsp_workers.platform.correlation import get_correlationId


_TRUE_VALUES = {"1", "true", "yes", "on"}


def unsafe_dev_trace_enabled() -> bool:
    """Return whether explicitly opted-in raw development tracing is enabled.

    Raises:
        RuntimeError: If raw tracing is requested while ``NODE_ENV=production``.
    """
    enabled = os.getenv("LCSP_DEV_UNSAFE_TRACE", "").strip().lower() in _TRUE_VALUES
    if not enabled:
        return False
    if os.getenv("NODE_ENV", "").strip().lower() == "production":
        raise RuntimeError(
            "LCSP_DEV_UNSAFE_TRACE must never be enabled with NODE_ENV=production"
        )
    return True


def emit_dev_unsafe_trace(event: str, /, **fields: Any) -> None:
    """Emit one completely unredacted JSON-line trace record in development.

    The serializer preserves complete structured values. Unknown objects fall
    back to ``repr`` instead of being dropped so diagnostic context remains
    visible. This function deliberately performs no secret/source filtering.
    """
    if not unsafe_dev_trace_enabled():
        return

    record = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "UNSAFE_DEV_TRACE",
        "event": event,
        "correlationId": get_correlationId(),
        **{key: _json_safe(value) for key, value in fields.items()},
    }
    rendered = json.dumps(
        record,
        ensure_ascii=False,
        separators=(",", ":"),
        default=repr,
    )
    print(rendered, file=sys.stderr, flush=True)


def _json_safe(value: Any, seen: set[int] | None = None) -> Any:
    """Convert arbitrary runtime objects into JSON-compatible diagnostic data."""
    if seen is None:
        seen = set()

    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, bytes):
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            return {"encoding": "hex", "value": value.hex()}
    if isinstance(value, bytearray):
        return _json_safe(bytes(value), seen)

    obj_id = id(value)
    if obj_id in seen:
        return "<cycle>"

    if hasattr(value, "model_dump") and callable(value.model_dump):
        try:
            return _json_safe(value.model_dump(), seen)
        except Exception:
            pass
    if is_dataclass(value) and not isinstance(value, type):
        try:
            return _json_safe(asdict(value), seen)
        except Exception:
            pass
    if isinstance(value, Mapping):
        seen.add(obj_id)
        try:
            return {
                str(key): _json_safe(entry, seen)
                for key, entry in value.items()
            }
        finally:
            seen.remove(obj_id)
    if isinstance(value, tuple):
        seen.add(obj_id)
        try:
            return [_json_safe(entry, seen) for entry in value]
        finally:
            seen.remove(obj_id)
    if isinstance(value, list):
        seen.add(obj_id)
        try:
            return [_json_safe(entry, seen) for entry in value]
        finally:
            seen.remove(obj_id)
    if isinstance(value, Sequence) and not isinstance(value, str):
        seen.add(obj_id)
        try:
            return [_json_safe(entry, seen) for entry in value]
        finally:
            seen.remove(obj_id)

    if hasattr(value, "__dict__"):
        seen.add(obj_id)
        try:
            return {
                "__type__": type(value).__name__,
                **{
                    str(key): _json_safe(entry, seen)
                    for key, entry in vars(value).items()
                },
            }
        except Exception:
            pass
        finally:
            seen.discard(obj_id)

    return repr(value)
