"""Development-only unredacted runtime tracing.

This module is intentionally unsafe and must never be enabled in production.
It exists so local developers can inspect values crossing LCSP runtime boundaries
while the normal persistence/callback privacy controls remain intact.

When ``LCSP_DEV_UNSAFE_TRACE=true`` trace records are written as JSON lines to
stderr. Text payloads remain unredacted. Binary payloads are represented by
bounded metadata instead of being expanded into unbounded hex strings, and any
serialization/write failure is fail-open so diagnostic tracing can never break
worker execution.
"""

from __future__ import annotations

from dataclasses import asdict, is_dataclass
from datetime import datetime, timezone
import hashlib
import json
import os
import sys
from typing import Any, Mapping, Sequence

from lcsp_workers.platform.correlation import get_correlationId


_TRUE_VALUES = {"1", "true", "yes", "on"}
_MAX_INLINE_UTF8_BYTES = 64 * 1024
_BINARY_PREVIEW_BYTES = 256


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
    """Emit one development trace record without affecting runtime semantics.

    The production guard is intentionally evaluated before the fail-open block:
    requesting unsafe tracing in production must still fail fast. Once tracing
    is allowed, however, serialization and stderr failures are diagnostic-only
    and must never propagate into scanner/orchestration/queue execution.
    """
    if not unsafe_dev_trace_enabled():
        return

    try:
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
    except Exception:
        # Observability is never allowed to change domain/runtime behavior.
        # In particular, stderr may be a non-blocking pipe (for example when
        # running ``pnpm dev:trace 2>&1 | tee ...``) and can raise EAGAIN.
        return


def _json_safe(value: Any, seen: set[int] | None = None) -> Any:
    """Convert arbitrary runtime objects into bounded JSON-compatible data."""
    if seen is None:
        seen = set()

    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, bytes):
        return _bytes_trace_value(value)
    if isinstance(value, bytearray):
        return _bytes_trace_value(bytes(value))

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


def _bytes_trace_value(value: bytes) -> Any:
    """Render text bytes inline and summarize binary/large byte payloads.

    Repository archives and other binary payloads must not be converted to full
    hex strings: that doubles their size and can overflow a non-blocking stderr
    pipe before the underlying scanner tool is even invoked.
    """
    if len(value) <= _MAX_INLINE_UTF8_BYTES:
        try:
            return value.decode("utf-8")
        except UnicodeDecodeError:
            pass

    preview = value[:_BINARY_PREVIEW_BYTES]
    return {
        "encoding": "binary-metadata",
        "byteLength": len(value),
        "sha256": hashlib.sha256(value).hexdigest(),
        "previewHex": preview.hex(),
        "truncated": len(preview) < len(value),
    }
