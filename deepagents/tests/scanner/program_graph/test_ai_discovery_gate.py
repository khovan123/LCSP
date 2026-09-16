from __future__ import annotations

from pathlib import Path

from tools.common.capabilities.evidence.graph.construction.assembly.builder import (
    ProgramGraphBuilder,
)
from tools.common.capabilities.evidence.graph.construction.extraction.extractor import (
    RepositorySemanticExtractor,
)
from tools.common.capabilities.evidence.graph.lineage.ai.ai_discovery import (
    AIDiscoveryEnricher,
    summarize_ai_discovery,
)
from tools.common.capabilities.evidence.graph.lineage.ai.ai_invocation_gate import (
    AIInvocationSemanticGate,
)


def _discovery(
    tmp_path: Path,
    source: str,
    *,
    filename: str = "app.ts",
    coverage_note: str | None = None,
):
    (tmp_path / filename).write_text(source, encoding="utf-8")
    program = RepositorySemanticExtractor(tmp_path).extract()
    AIInvocationSemanticGate().enrich(program)
    AIDiscoveryEnricher(tmp_path).enrich(program)
    builder = ProgramGraphBuilder(
        tmp_path,
        scan_job_id="scan-1",
        snapshot_id="snapshot-1",
        commit_sha="abc123",
    )
    builder.add_program(program)
    if coverage_note:
        builder.add_coverage_note(coverage_note)
    return summarize_ai_discovery(builder.build())


def test_direct_sdk_invocation_is_confirmed_and_persists_only_snippet_metadata(
    tmp_path: Path,
) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function summarize(input: string) {
  return client.responses.create({ model: process.env.OPENAI_MODEL, input });
}
""",
    )

    assert discovery["gate"] == "AI_CONFIRMED"
    finding = next(
        item
        for item in discovery["findings"]
        if item["state"] == "CONFIRMED_AI_CALL"
    )
    assert finding["kind"] == "SDK_INVOCATION"
    assert finding["clarification_kind"] == "AI_PURPOSE_FEATURE_MAPPING"
    assert finding["snippet_ref"]["file_path"] == "app.ts"
    assert finding["snippet_ref"]["commit_sha"] == "abc123"
    assert "source" not in finding
    assert "raw_source" not in finding


def test_known_provider_rest_signature_is_confirmed(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function ask(messages: unknown[]) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({ model: "gpt-5", messages })
  });
}
""",
    )

    assert discovery["gate"] == "AI_CONFIRMED"
    outbound = next(
        item for item in discovery["findings"] if item["kind"] == "OUTBOUND_API"
    )
    assert outbound["state"] == "CONFIRMED_AI_CALL"
    assert outbound["provider"] == "OPENAI"
    assert outbound["host"] == "api.openai.com"


def test_custom_gateway_remains_unresolved_and_provider_is_not_guessed(
    tmp_path: Path,
) -> None:
    discovery = _discovery(
        tmp_path,
        """
const gatewayUrl = process.env.MODEL_GATEWAY_URL;
export async function ask(messages: unknown[]) {
  return fetch(gatewayUrl, {
    method: "POST",
    body: JSON.stringify({ model: "customer-model", messages })
  });
}
""",
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    finding = next(
        item for item in discovery["findings"] if item["kind"] == "OUTBOUND_API"
    )
    assert finding["state"] == "POSSIBLE_AI_CALL"
    assert finding["clarification_kind"] == "OUTBOUND_AI_CONFIRMATION"
    assert finding["clarification_owner"] == "CUSTOMER"
    assert finding["endpoint_source"] == "ENV:MODEL_GATEWAY_URL"
    assert "provider" not in finding


def test_feature_flag_alias_guards_invocation_and_asks_only_runtime_fact(
    tmp_path: Path,
) -> None:
    discovery = _discovery(
        tmp_path,
        """
const aiEnabled = process.env.ENABLE_AI === "true";
export async function summarize(text: string) {
  if (!aiEnabled) return text;
  return client.responses.create({
    model: process.env.OPENAI_MODEL,
    input: text
  });
}
""",
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    finding = next(
        item
        for item in discovery["findings"]
        if item["state"] == "CONFIRMED_AI_CALL"
    )
    assert finding["runtime_guard"] == "ENABLE_AI"
    assert finding["clarification_kind"] == "AI_RUNTIME_REACHABILITY"
    assert finding["clarification_owner"] == "CUSTOMER"


def test_non_ai_rest_call_is_not_promoted_and_ready_graph_can_confirm_absence(
    tmp_path: Path,
) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function charge(amount: number) {
  return fetch("https://payments.example.com/v1/charges", {
    method: "POST",
    body: JSON.stringify({ amount })
  });
}
""",
    )

    assert discovery["coverage_state"] == "READY"
    assert discovery["gate"] == "AI_ABSENT_CONFIRMED"
    assert discovery["findings"] == []


def test_partial_coverage_never_becomes_ai_absent_confirmed(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        "export function add(a: number, b: number) { return a + b; }",
        coverage_note="dynamic module unavailable",
    )

    assert discovery["coverage_state"] == "PARTIAL"
    assert discovery["gate"] == "AI_UNKNOWN"
