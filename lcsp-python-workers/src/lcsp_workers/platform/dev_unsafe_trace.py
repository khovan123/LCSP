"""Development-only unredacted runtime tracing.

This module is intentionally unsafe and must never be enabled in production.
It exists so local developers can inspect values crossing LCSP runtime boundaries
while the normal persistence/callback privacy controls remain intact.

When ``LCSP_DEV_UNSAFE_TRACE=true`` trace records are written as JSON lines to
stderr. Small text payloads remain unredacted. Large strings and collections are
bounded so diagnostic tracing cannot flood a pipe. Binary payloads and oversized
byte buffers are omitted entirely from trace records; repository archives must
never be emitted, hashed, previewed, or hex-encoded in logs. Serialization/write
failures are fail-open by design.
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
_MAX_TRACE_COLLECTION_ITEMS = 16
_MAX_INLINE_TRACE_STRING_CHARS = 16 * 1024
_TRACE_STRING_PREVIEW_CHARS = 2048
_OMIT_TRACE_FIELD = object()


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
    """Emit one bounded development trace record without affecting runtime semantics.

    The production guard is intentionally evaluated before the fail-open block:
    requesting unsafe tracing in production must still fail fast. Once tracing
    is allowed, however, serialization and stderr failures are diagnostic-only
    and must never propagate into scanner/orchestration/queue execution.
    """
    if not unsafe_dev_trace_enabled():
        return

    try:
        safe_fields: dict[str, Any] = {}
        for key, value in fields.items():
            safe_value = _json_safe(value)
            if safe_value is not _OMIT_TRACE_FIELD:
                safe_fields[key] = safe_value

        record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": "UNSAFE_DEV_TRACE",
            "event": event,
            "correlationId": get_correlationId(),
            **safe_fields,
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

    if value is None or isinstance(value, (bool, int, float)):
        return value
    if isinstance(value, str):
        return _string_trace_value(value)
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
        return _mapping_trace_value(value, seen)
    if isinstance(value, tuple):
        return _sequence_trace_value(value, "tuple", seen)
    if isinstance(value, list):
        return _sequence_trace_value(value, "list", seen)
    if isinstance(value, Sequence) and not isinstance(value, str):
        return _sequence_trace_value(value, type(value).__name__, seen)

    if hasattr(value, "__dict__"):
        seen.add(obj_id)
        try:
            attributes = list(vars(value).items())
            payload: dict[str, Any] = {"__type__": type(value).__name__}
            selected = (
                attributes
                if len(attributes) <= _MAX_TRACE_COLLECTION_ITEMS
                else attributes[:_MAX_TRACE_COLLECTION_ITEMS]
            )
            safe_attributes: dict[str, Any] = {}
            for key, entry in selected:
                safe_entry = _json_safe(entry, seen)
                if safe_entry is not _OMIT_TRACE_FIELD:
                    safe_attributes[str(key)] = safe_entry

            if len(attributes) <= _MAX_TRACE_COLLECTION_ITEMS:
                payload.update(safe_attributes)
                return payload

            payload.update(
                {
                    "encoding": "object-metadata",
                    "attributeCount": len(attributes),
                    "attributes": safe_attributes,
                    "truncated": True,
                }
            )
            return payload
        except Exception:
            pass
        finally:
            seen.discard(obj_id)

    return _string_trace_value(repr(value))


def _mapping_trace_value(value: Mapping[Any, Any], seen: set[int]) -> Any:
    """Render mappings while dropping binary-valued fields completely."""
    obj_id = id(value)
    seen.add(obj_id)
    try:
        entries = list(value.items())
        selected = (
            entries
            if len(entries) <= _MAX_TRACE_COLLECTION_ITEMS
            else entries[:_MAX_TRACE_COLLECTION_ITEMS]
        )
        safe_items: dict[str, Any] = {}
        for key, entry in selected:
            safe_entry = _json_safe(entry, seen)
            if safe_entry is not _OMIT_TRACE_FIELD:
                safe_items[str(key)] = safe_entry

        if len(entries) <= _MAX_TRACE_COLLECTION_ITEMS:
            return safe_items
        return {
            "encoding": "collection-metadata",
            "collectionType": "mapping",
            "itemCount": len(entries),
            "items": safe_items,
            "truncated": True,
        }
    finally:
        seen.remove(obj_id)


def _sequence_trace_value(
    value: Sequence[Any],
    collection_type: str,
    seen: set[int],
) -> Any:
    """Keep small sequences verbatim and summarize large result collections."""
    obj_id = id(value)
    seen.add(obj_id)
    try:
        selected = (
            value
            if len(value) <= _MAX_TRACE_COLLECTION_ITEMS
            else value[:_MAX_TRACE_COLLECTION_ITEMS]
        )
        safe_items = []
        for entry in selected:
            safe_entry = _json_safe(entry, seen)
            if safe_entry is not _OMIT_TRACE_FIELD:
                safe_items.append(safe_entry)

        if len(value) <= _MAX_TRACE_COLLECTION_ITEMS:
            return safe_items
        return {
            "encoding": "collection-metadata",
            "collectionType": collection_type,
            "itemCount": len(value),
            "items": safe_items,
            "truncated": True,
        }
    finally:
        seen.remove(obj_id)


def _string_trace_value(value: str) -> Any:
    """Keep normal text raw but summarize unusually large strings."""
    if len(value) <= _MAX_INLINE_TRACE_STRING_CHARS:
        return value
    encoded = value.encode("utf-8", errors="replace")
    return {
        "encoding": "text-metadata",
        "charLength": len(value),
        "byteLength": len(encoded),
        "sha256": hashlib.sha256(encoded).hexdigest(),
        "preview": value[:_TRACE_STRING_PREVIEW_CHARS],
        "truncated": True,
    }


def _bytes_trace_value(value: bytes) -> Any:
    """Keep only small UTF-8 text bytes; omit binary or oversized bytes entirely."""
    if len(value) <= _MAX_INLINE_UTF8_BYTES:
        try:
            return _string_trace_value(value.decode("utf-8"))
        except UnicodeDecodeError:
            return _OMIT_TRACE_FIELD

    return _OMIT_TRACE_FIELD
