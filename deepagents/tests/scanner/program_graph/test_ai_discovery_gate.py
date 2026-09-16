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
from tools.common.capabilities.evidence.graph.schema.semantic_ir import (
    SemanticEdgeFact,
    SemanticNodeFact,
    SemanticProgram,
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



def test_unmodeled_graphql_grpc_and_retrofit_clients_preserve_ai_frontier(
    tmp_path: Path,
) -> None:
    cases = (
        (
            "graphql",
            "client.ts",
            'import { GraphQLClient } from "graphql-request";\nconst client = new GraphQLClient(endpoint);\n',
        ),
        (
            "grpc",
            "client.go",
            'conn, err := grpc.Dial(target, grpc.WithTransportCredentials(creds))\n',
        ),
        (
            "retrofit",
            "Gateway.kt",
            'val client = Retrofit.Builder().baseUrl(endpoint).build()\n',
        ),
    )

    for case_name, filename, source in cases:
        case_dir = tmp_path / case_name
        case_dir.mkdir()
        discovery = _discovery(case_dir, source, filename=filename)
        assert discovery["gate"] == "AI_UNKNOWN"
        assert discovery["coverage_state"] == "PARTIAL"
        assert discovery["material_unresolved_frontiers"]
        assert any(
            item["kind"] == "DYNAMIC_TARGET"
            and item["clarification_kind"] == "TARGETED_TECHNICAL_REANALYSIS"
            for item in discovery["findings"]
        )


def test_dynamic_outbound_target_blocks_false_absence_until_pge_resolves_flow(
    tmp_path: Path,
) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function forward(endpoint: string, request: unknown) {
  return fetch(endpoint, { method: "POST", body: JSON.stringify(request) });
}
""",
    )

    assert discovery["coverage_state"] == "PARTIAL"
    assert discovery["gate"] == "AI_UNKNOWN"
    assert any(
        item["kind"] == "DYNAMIC_TARGET"
        and item["clarification_kind"] == "TARGETED_TECHNICAL_REANALYSIS"
        for item in discovery["findings"]
    )


def test_unsupported_source_language_preserves_unresolved_ai_frontier(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        "def charge(amount)\n  BillingClient.charge(amount)\nend\n",
        filename="billing.rb",
    )

    assert discovery["coverage_state"] == "PARTIAL"
    assert discovery["gate"] == "AI_UNKNOWN"
    assert discovery["material_unresolved_frontiers"]
    assert any(
        item["kind"] == "DYNAMIC_TARGET"
        and item["clarification_owner"] == "TECHNICAL"
        for item in discovery["findings"]
    )

def test_lookalike_provider_domain_is_not_confirmed(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function ask(messages: unknown[]) {
  return fetch("https://api.openai.com.attacker.example/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify({ model: "gpt-5", messages })
  });
}
""",
    )

    finding = next(item for item in discovery["findings"] if item["kind"] == "OUTBOUND_API")
    assert discovery["gate"] == "AI_UNKNOWN"
    assert finding["state"] == "POSSIBLE_AI_CALL"
    assert "provider" not in finding


def test_unrelated_provider_url_in_request_window_does_not_bind_dynamic_target(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function forward(target: string, messages: unknown[]) {
  return fetch(target, {
    headers: { "x-docs": "https://api.openai.com/v1/chat/completions" },
    body: JSON.stringify({ model: "custom", messages })
  });
}
""",
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    assert not any(
        item["kind"] == "OUTBOUND_API"
        and (item.get("provider") or item.get("host"))
        for item in discovery["findings"]
    )
    assert any(
        item["kind"] == "DYNAMIC_TARGET"
        and item["clarification_owner"] == "TECHNICAL"
        for item in discovery["findings"]
    )


def test_nearby_unrelated_feature_flag_is_not_emitted_as_guard(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        """
const aiEnabled = process.env.ENABLE_AI === "true";
export async function summarize(text: string) {
  if (aiEnabled) { console.log("telemetry"); }
  return client.responses.create({ model: process.env.OPENAI_MODEL, input: text });
}
""",
    )

    finding = next(item for item in discovery["findings"] if item["kind"] == "SDK_INVOCATION")
    assert discovery["gate"] == "AI_CONFIRMED"
    assert "runtime_guard" not in finding


def test_same_line_feature_flag_is_a_verified_guard(tmp_path: Path) -> None:
    discovery = _discovery(
        tmp_path,
        """
export async function summarize(text: string) {
  if (process.env.ENABLE_AI) return client.responses.create({ model: "gpt-5", input: text });
  return text;
}
""",
    )

    finding = next(item for item in discovery["findings"] if item["kind"] == "SDK_INVOCATION")
    assert discovery["gate"] == "AI_UNKNOWN"
    assert finding["runtime_guard"] == "ENABLE_AI"


def test_go_and_rust_http_sources_remain_partial_until_deterministically_modeled(tmp_path: Path) -> None:
    cases = (
        ("client.go", 'http.Post("https://api.openai.com/v1/chat/completions", "application/json", body)\n'),
        ("client.rs", 'reqwest::Client::new().post("https://api.openai.com/v1/chat/completions").send().await;\n'),
    )
    for filename, source in cases:
        case_dir = tmp_path / filename.replace(".", "-")
        case_dir.mkdir()
        discovery = _discovery(case_dir, source, filename=filename)
        assert discovery["coverage_state"] == "PARTIAL"
        assert discovery["gate"] == "AI_UNKNOWN"
        assert discovery["material_unresolved_frontiers"]


def test_targeted_scope_does_not_scan_excluded_ai_source(tmp_path: Path) -> None:
    (tmp_path / "safe.ts").write_text(
        'export const add = (a: number, b: number) => a + b;\n', encoding="utf-8"
    )
    (tmp_path / "excluded.ts").write_text(
        'client.responses.create({ model: "gpt-5", input: "x" });\n', encoding="utf-8"
    )
    scope = ("safe.ts",)
    program = RepositorySemanticExtractor(tmp_path).extract(include_files=scope)
    AIInvocationSemanticGate().enrich(program)
    AIDiscoveryEnricher(tmp_path, include_files=scope).enrich(program)
    builder = ProgramGraphBuilder(
        tmp_path, scan_job_id="scan-scope", snapshot_id="snapshot-scope", commit_sha="scope123"
    )
    builder.add_program(program)
    discovery = summarize_ai_discovery(builder.build())

    assert discovery["gate"] == "AI_ABSENT_CONFIRMED"
    assert discovery["findings"] == []


def test_source_seeded_graphql_frontier_is_reconciled_after_trusted_non_ai_resolution(tmp_path: Path) -> None:
    (tmp_path / "client.ts").write_text(
        'const client = new GraphQLClient(endpoint);\nclient.request(query);\n',
        encoding="utf-8",
    )
    program = SemanticProgram(
        nodes=[
            SemanticNodeFact(
                "graphql-call", "CALL_SITE", "GraphQLClient", "client.ts", 1, 1
            ),
            SemanticNodeFact(
                "billing-handler", "FUNCTION", "loadInvoices", "billing.ts", 3, 8
            ),
        ],
        edges=[SemanticEdgeFact("RESOLVES_TO", "graphql-call", "billing-handler")],
    )
    enricher = AIDiscoveryEnricher(tmp_path)
    enricher.enrich(program)
    assert program.unresolved_frontiers
    enricher.finalize(program)
    builder = ProgramGraphBuilder(
        tmp_path, scan_job_id="scan-reconcile", snapshot_id="snapshot-reconcile", commit_sha="abc123"
    )
    builder.add_program(program)
    discovery = summarize_ai_discovery(builder.build())

    assert discovery["gate"] == "AI_ABSENT_CONFIRMED"
    assert discovery["material_unresolved_frontiers"] == []


def _graph_discovery(tmp_path: Path, nodes, edges):
    program = SemanticProgram(nodes=list(nodes), edges=list(edges))
    AIDiscoveryEnricher(tmp_path).finalize(program)
    builder = ProgramGraphBuilder(
        tmp_path,
        scan_job_id="scan-graph",
        snapshot_id="snapshot-graph",
        commit_sha="deadbeef",
    )
    builder.add_program(program)
    return summarize_ai_discovery(builder.build())


def test_pge_parameter_and_config_propagation_preserves_ai_frontier(tmp_path: Path) -> None:
    discovery = _graph_discovery(
        tmp_path,
        [
            SemanticNodeFact("env", "ENV_SOURCE", "AI_GATEWAY_URL", "config.ts", 1, 1),
            SemanticNodeFact("parameter", "PARAMETER", "endpoint", "client.ts", 3, 3),
            SemanticNodeFact("messages", "PARAMETER", "messages", "client.ts", 3, 3),
            SemanticNodeFact("helper", "FUNCTION", "postGateway", "client.ts", 3, 8),
            SemanticNodeFact("outbound", "EXTERNAL_API", "custom gateway", "client.ts", 7, 7),
            SemanticNodeFact(
                "dynamic",
                "UNRESOLVED_DYNAMIC_TARGET",
                "runtime endpoint",
                "client.ts",
                7,
                7,
                resolution_state="UNRESOLVED",
            ),
        ],
        [
            SemanticEdgeFact("ASSIGNS", "env", "parameter"),
            SemanticEdgeFact("PASSES_ARGUMENT", "parameter", "helper"),
            SemanticEdgeFact("PASSES_ARGUMENT", "messages", "helper"),
            SemanticEdgeFact("CALLS_EXTERNAL", "helper", "outbound"),
            SemanticEdgeFact("RESOLVES_TO", "outbound", "dynamic", resolution_state="UNRESOLVED"),
        ],
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    assert discovery["material_unresolved_frontiers"]
    assert not any(
        item["kind"] == "OUTBOUND_API"
        and item.get("clarification_owner") == "CUSTOMER"
        for item in discovery["findings"]
    )
    assert any(
        item["kind"] == "DYNAMIC_TARGET"
        and item["clarification_owner"] == "TECHNICAL"
        for item in discovery["findings"]
    )


def test_pge_helper_di_cross_module_chain_reaches_provider_client(tmp_path: Path) -> None:
    discovery = _graph_discovery(
        tmp_path,
        [
            SemanticNodeFact(
                "provider",
                "SDK_CLIENT",
                "OpenAIClient",
                "infra/openai.ts",
                2,
                2,
                attributes={"semanticRole": "PROVIDER_OPENAI"},
            ),
            SemanticNodeFact("service", "CLASS", "AiService", "services/ai.ts", 1, 12),
            SemanticNodeFact("helper", "FUNCTION", "complete", "services/helper.ts", 4, 8),
            SemanticNodeFact("gateway", "EXTERNAL_API", "service gateway", "api/controller.ts", 10, 10),
        ],
        [
            SemanticEdgeFact("DEPENDS_ON", "service", "provider"),
            SemanticEdgeFact("CALLS", "helper", "service"),
            SemanticEdgeFact("HANDLED_BY", "gateway", "helper"),
        ],
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    assert any(item["kind"] == "OUTBOUND_API" for item in discovery["findings"])


def test_pge_graphql_grpc_and_cross_language_service_boundaries_are_not_absence(tmp_path: Path) -> None:
    discovery = _graph_discovery(
        tmp_path,
        [
            SemanticNodeFact("graphql", "GRAPHQL_OPERATION", "aiCompletion", "web/query.ts", 4, 4),
            SemanticNodeFact("prompt", "PARAMETER", "prompt", "web/query.ts", 4, 4),
            SemanticNodeFact("grpc", "GRPC_METHOD", "InferenceGateway.Generate", "proto/ai.proto", 8, 8),
            SemanticNodeFact("go-helper", "FUNCTION", "invokeRemote", "service/invoke.go", 12, 20),
            SemanticNodeFact("rust-client", "FUNCTION", "llm_transport", "worker/src/client.rs", 7, 16),
        ],
        [
            SemanticEdgeFact("PASSES_ARGUMENT", "prompt", "graphql"),
            SemanticEdgeFact("CALLS_API", "graphql", "grpc"),
            SemanticEdgeFact("HANDLED_BY", "grpc", "go-helper"),
            SemanticEdgeFact("CALLS", "go-helper", "rust-client"),
        ],
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    kinds = [item["kind"] for item in discovery["findings"]]
    assert "OUTBOUND_API" in kinds
    assert len([item for item in discovery["findings"] if item["kind"] == "OUTBOUND_API"]) >= 2



def test_graph_walk_does_not_cross_shared_caller_into_sibling_ai_call(tmp_path: Path) -> None:
    discovery = _graph_discovery(
        tmp_path,
        [
            SemanticNodeFact("caller", "FUNCTION", "run", "app.ts", 1, 10),
            SemanticNodeFact(
                "ai",
                "SDK_CLIENT",
                "OpenAIClient",
                "ai.ts",
                1,
                1,
                attributes={"semanticRole": "PROVIDER_OPENAI"},
            ),
            SemanticNodeFact("billing", "EXTERNAL_API", "billing API", "billing.ts", 4, 4),
        ],
        [
            SemanticEdgeFact("CALLS", "caller", "ai"),
            SemanticEdgeFact("CALLS_EXTERNAL", "caller", "billing"),
        ],
    )

    assert not any(
        item["kind"] == "OUTBOUND_API" and item.get("endpoint_source") == "PGE_MULTI_HOP"
        for item in discovery["findings"]
    )


def test_unresolved_graph_edge_stays_technical_instead_of_customer_confirmation(tmp_path: Path) -> None:
    discovery = _graph_discovery(
        tmp_path,
        [
            SemanticNodeFact("boundary", "EXTERNAL_API", "gateway", "api.ts", 1, 1),
            SemanticNodeFact(
                "unknown",
                "UNRESOLVED_DYNAMIC_TARGET",
                "openai messages endpoint",
                "api.ts",
                1,
                1,
                resolution_state="UNRESOLVED",
            ),
        ],
        [
            SemanticEdgeFact(
                "RESOLVES_TO",
                "boundary",
                "unknown",
                coverage_state="LIMITED",
                resolution_state="UNRESOLVED",
            )
        ],
    )

    assert discovery["gate"] == "AI_UNKNOWN"
    assert any(item["clarification_owner"] == "TECHNICAL" for item in discovery["findings"])
    assert not any(
        item["kind"] == "OUTBOUND_API" and item["clarification_owner"] == "CUSTOMER"
        for item in discovery["findings"]
    )


def test_exact_hop_limit_without_unseen_neighbor_does_not_create_false_frontier(tmp_path: Path) -> None:
    nodes = [SemanticNodeFact("boundary", "EXTERNAL_API", "gateway", "api.ts", 1, 1)]
    edges = []
    previous = "boundary"
    for index in range(1, 13):
        key = f"hop-{index}"
        nodes.append(SemanticNodeFact(key, "FUNCTION", f"hop{index}", "api.ts", index + 1, index + 1))
        edges.append(SemanticEdgeFact("CALLS", previous, key))
        previous = key
    nodes.append(
        SemanticNodeFact(
            "ai-capability", "AI_CAPABILITY", "openai messages", "api.ts", 20, 20
        )
    )
    # Replace the final ordinary hop with the trusted AI endpoint exactly at depth 12.
    edges[-1] = SemanticEdgeFact("CALLS", "hop-11", "ai-capability")
    nodes = [node for node in nodes if node.key != "hop-12"]

    discovery = _graph_discovery(tmp_path, nodes, edges)

    assert not any(
        "MAX_GRAPH_HOPS_REACHED" in str(item)
        for item in discovery["findings"]
    )
    assert discovery["material_unresolved_frontiers"] == []



def test_generic_graphql_transport_without_ai_semantics_still_allows_absence(tmp_path: Path) -> None:
    discovery = _graph_discovery(
        tmp_path,
        [
            SemanticNodeFact("graphql", "GRAPHQL_OPERATION", "getInvoices", "billing/query.ts", 4, 4),
            SemanticNodeFact("invoice", "PARAMETER", "invoiceId", "billing/query.ts", 4, 4),
        ],
        [SemanticEdgeFact("PASSES_ARGUMENT", "invoice", "graphql")],
    )

    assert discovery["gate"] == "AI_ABSENT_CONFIRMED"
    assert discovery["findings"] == []
