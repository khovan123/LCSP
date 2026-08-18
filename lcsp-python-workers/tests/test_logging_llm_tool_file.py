from __future__ import annotations

import json
from io import StringIO

from lcsp_workers.platform.logging import PartitionedLogWriter


def test_safe_llm_and_tool_events_are_mirrored_to_root_tmp(monkeypatch, tmp_path) -> None:
    from lcsp_workers.platform import logging_path

    monkeypatch.setattr(logging_path, "get_repo_root", lambda: str(tmp_path))
    writer = PartitionedLogWriter(StringIO())

    events = [
        {"event": "LLM_REQUEST", "operation": "complete_with_tools"},
        {"event": "LLM_RESPONSE", "tool_call_count": 1},
        {
            "event": "ENGINEERING_INVESTIGATION_TOOL_CALL",
            "engineering_rule_id": "eng-1",
            "tool": "search_nodes",
        },
        {
            "event": "ENGINEERING_INVESTIGATION_FINISHED",
            "engineering_rule_id": "eng-1",
            "claim_types": ["RULE_REQUIREMENT_MET"],
        },
    ]
    for event in events:
        writer.write(json.dumps(event) + "\n")

    log_path = tmp_path / "tmp" / "llm-tool-calls.log"
    assert log_path.exists()
    persisted = [json.loads(line) for line in log_path.read_text().splitlines()]
    assert [row["event"] for row in persisted] == [row["event"] for row in events]


def test_raw_dev_llm_trace_is_never_mirrored_to_safe_root_log(
    monkeypatch,
    tmp_path,
) -> None:
    from lcsp_workers.platform import logging_path

    monkeypatch.setattr(logging_path, "get_repo_root", lambda: str(tmp_path))
    writer = PartitionedLogWriter(StringIO())

    writer.write(
        json.dumps(
            {
                "event": "DEV_LLM_REQUEST_RAW",
                "api_key": "SECRET",
                "prompt": "raw repository source",
            }
        )
        + "\n"
    )

    assert not (tmp_path / "tmp" / "llm-tool-calls.log").exists()


def test_llm_tool_log_path_can_be_overridden(monkeypatch, tmp_path) -> None:
    from lcsp_workers.platform import logging_path

    monkeypatch.setattr(logging_path, "get_repo_root", lambda: str(tmp_path))
    monkeypatch.setenv("LCSP_LLM_TOOL_LOG_PATH", "tmp/custom-llm.log")

    writer = PartitionedLogWriter(StringIO())
    writer.write(json.dumps({"event": "LLM_RESPONSE", "tool_call_count": 1}) + "\n")

    assert (tmp_path / "tmp" / "custom-llm.log").exists()
