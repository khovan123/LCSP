from __future__ import annotations

import hashlib

import pytest

from lcsp_workers.platform import dev_unsafe_trace


@pytest.fixture(autouse=True)
def enable_dev_trace(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LCSP_DEV_UNSAFE_TRACE", "true")
    monkeypatch.setenv("NODE_ENV", "development")


def test_large_binary_payload_is_summarized_instead_of_hex_dumped() -> None:
    archive = b"\x1f\x8b" + (b"\x00" * (128 * 1024))

    rendered = dev_unsafe_trace._json_safe(archive)

    assert rendered["encoding"] == "binary-metadata"
    assert rendered["byteLength"] == len(archive)
    assert rendered["sha256"] == hashlib.sha256(archive).hexdigest()
    assert rendered["truncated"] is True
    assert len(rendered["previewHex"]) <= dev_unsafe_trace._BINARY_PREVIEW_BYTES * 2
    assert "value" not in rendered


def test_small_utf8_bytes_remain_visible_for_debugging() -> None:
    payload = b'{"scanJobId":"scan-1"}'

    assert dev_unsafe_trace._json_safe(payload) == payload.decode("utf-8")


def test_stderr_backpressure_never_breaks_runtime(monkeypatch: pytest.MonkeyPatch) -> None:
    class NonBlockingStderr:
        def write(self, _value: str) -> int:
            raise BlockingIOError(11, "write could not complete without blocking")

        def flush(self) -> None:
            raise BlockingIOError(11, "write could not complete without blocking")

    monkeypatch.setattr(dev_unsafe_trace.sys, "stderr", NonBlockingStderr())

    # Regression: ``pnpm dev:trace 2>&1 | tee ...`` can put stderr behind a
    # non-blocking pipe. Diagnostic tracing must fail open instead of killing
    # ScanConsumer before materialize_snapshot executes.
    dev_unsafe_trace.emit_dev_unsafe_trace(
        "DEV_TOOL_DISPATCH_RAW",
        tool_name="materialize_snapshot",
        archive=b"\x1f\x8b" + (b"\x00" * (128 * 1024)),
    )


def test_production_guard_still_fails_fast(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("NODE_ENV", "production")

    with pytest.raises(RuntimeError, match="must never be enabled"):
        dev_unsafe_trace.emit_dev_unsafe_trace("SHOULD_NOT_RUN")
