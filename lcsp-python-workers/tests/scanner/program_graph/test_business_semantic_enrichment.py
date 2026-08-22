from __future__ import annotations

from pathlib import Path

from lcsp_workers.scanner.program_graph.assembler import ProgramGraphAssembler
from lcsp_workers.scanner.program_graph.business_semantic_enrichment import (
    BusinessSemanticEnricher,
)


def _graph(tmp_path: Path):
    (tmp_path / "app.py").write_text(
        '''
def onboard(payload):
    decision = approve(payload)
    repository.save(decision)
    return decision
''',
        encoding="utf-8",
    )
    return ProgramGraphAssembler().assemble(
        scan_job_id="scan-business",
        snapshot_id="snapshot-business",
        commit_sha="business-sha",
        workspace_path=tmp_path,
    )


def test_valid_business_semantic_proposal_merges_with_support_refs(tmp_path: Path) -> None:
    graph = _graph(tmp_path)
    support = next(
        node["node_id"]
        for node in graph.nodes
        if node.get("node_type") == "APPROVAL"
    )
    payload = {
        "nodes": [
            {
                "proposalNodeId": "customer_onboarding",
                "nodeType": "BUSINESS_PROCESS",
                "label": "Customer onboarding",
                "supportRefs": [support],
            }
        ],
        "edges": [
            {
                "edgeType": "PART_OF_PROCESS",
                "sourceRef": support,
                "targetRef": "proposal:customer_onboarding",
                "supportRefs": [support],
            }
        ],
    }

    enriched, node_count, edge_count = BusinessSemanticEnricher.validate_and_merge(
        graph, payload
    )

    assert node_count == 1
    assert edge_count == 1
    semantic = next(
        node
        for node in enriched.nodes
        if node.get("node_type") == "BUSINESS_PROCESS"
    )
    assert semantic["origin"] == "LLM_SEMANTIC_ENRICHMENT"
    assert semantic["resolution_state"] == "CORROBORATED"
    assert semantic["support_refs"] == [support]
    assert enriched.graph_hash != graph.graph_hash
    assert (
        enriched.provenance["business_semantic_enrichment"]
        == "LLM_PROVENANCE_GATED_CLUSTERED"
    )


def test_unknown_support_ref_rejects_semantic_proposal(tmp_path: Path) -> None:
    graph = _graph(tmp_path)
    payload = {
        "nodes": [
            {
                "proposalNodeId": "invented_process",
                "nodeType": "BUSINESS_PROCESS",
                "label": "Invented process",
                "supportRefs": ["node:does-not-exist"],
            }
        ],
        "edges": [],
    }

    enriched, node_count, edge_count = BusinessSemanticEnricher.validate_and_merge(
        graph, payload
    )

    assert enriched is graph
    assert node_count == 0
    assert edge_count == 0


def test_business_semantic_proposal_diagnostics_are_safe_counters(
    tmp_path: Path,
) -> None:
    graph = _graph(tmp_path)
    support = next(
        node["node_id"]
        for node in graph.nodes
        if node.get("node_type") == "APPROVAL"
    )
    payload = {
        "nodes": [
            {
                "proposalNodeId": "customer_onboarding",
                "nodeType": "BUSINESS_PROCESS",
                "label": "Customer onboarding",
                "supportRefs": [support],
            },
            {
                "proposalNodeId": "duplicate_onboarding",
                "nodeType": "BUSINESS_PROCESS",
                "label": "Customer onboarding",
                "supportRefs": [support],
            },
            {
                "proposalNodeId": "bad_support",
                "nodeType": "BUSINESS_PROCESS",
                "label": "Unsupported process",
                "supportRefs": ["node:missing"],
            },
            {
                "proposalNodeId": "bad_type",
                "nodeType": "LEGAL_CONCLUSION",
                "label": "Unsupported legal conclusion",
                "supportRefs": [support],
            },
        ],
        "edges": [
            {
                "edgeType": "PART_OF_PROCESS",
                "sourceRef": "proposal:customer_onboarding",
                "targetRef": "node:missing",
                "supportRefs": [support],
            },
            {
                "edgeType": "UNKNOWN_EDGE",
                "sourceRef": support,
                "targetRef": "proposal:customer_onboarding",
                "supportRefs": [support],
            },
        ],
    }

    _enriched, node_count, edge_count, diagnostics = (
        BusinessSemanticEnricher._validate_and_merge_with_diagnostics(graph, payload)
    )

    assert node_count == 1
    assert edge_count == 0
    assert diagnostics.raw_node_count == 4
    assert diagnostics.raw_edge_count == 2
    assert diagnostics.dropped_node_count == 3
    assert diagnostics.dropped_edge_count == 2
    assert diagnostics.drop_reasons["DUPLICATE_SEMANTIC"] == 1
    assert diagnostics.drop_reasons["INVALID_SUPPORT_REF"] == 1
    assert diagnostics.drop_reasons["INVALID_NODE_TYPE"] == 1
    assert diagnostics.drop_reasons["INVALID_TARGET_REF"] == 1
    assert diagnostics.drop_reasons["INVALID_EDGE_TYPE"] == 1


def test_empty_business_semantic_proposal_records_drop_reason(tmp_path: Path) -> None:
    graph = _graph(tmp_path)

    _enriched, node_count, edge_count, diagnostics = (
        BusinessSemanticEnricher._validate_and_merge_with_diagnostics(
            graph,
            {"nodes": [], "edges": []},
        )
    )

    assert node_count == 0
    assert edge_count == 0
    assert diagnostics.raw_node_count == 0
    assert diagnostics.raw_edge_count == 0
    assert diagnostics.drop_reasons == {"EMPTY_PROPOSAL": 1}


def test_legal_or_risk_tier_conclusion_is_not_business_semantic_node(tmp_path: Path) -> None:
    graph = _graph(tmp_path)
    support = graph.nodes[0]["node_id"]
    payload = {
        "nodes": [
            {
                "proposalNodeId": "legal_tier",
                "nodeType": "BUSINESS_PROCESS",
                "label": "High-risk compliant AI system",
                "supportRefs": [support],
            }
        ],
        "edges": [],
    }

    enriched, node_count, _ = BusinessSemanticEnricher.validate_and_merge(graph, payload)

    assert enriched is graph
    assert node_count == 0


def test_proposed_nodes_can_link_to_each_other_only_with_original_support(tmp_path: Path) -> None:
    graph = _graph(tmp_path)
    support = next(
        node["node_id"]
        for node in graph.nodes
        if node.get("node_type") == "APPROVAL"
    )
    payload = {
        "nodes": [
            {
                "proposalNodeId": "onboarding",
                "nodeType": "BUSINESS_PROCESS",
                "label": "Customer onboarding",
                "supportRefs": [support],
            },
            {
                "proposalNodeId": "eligibility",
                "nodeType": "BUSINESS_DECISION",
                "label": "Account eligibility decision",
                "supportRefs": [support],
            },
        ],
        "edges": [
            {
                "edgeType": "PART_OF_PROCESS",
                "sourceRef": "proposal:eligibility",
                "targetRef": "proposal:onboarding",
                "supportRefs": [support],
            }
        ],
    }

    enriched, node_count, edge_count = BusinessSemanticEnricher.validate_and_merge(
        graph, payload
    )

    assert node_count == 2
    assert edge_count == 1
    edge = next(
        row
        for row in enriched.edges
        if row.get("origin") == "LLM_SEMANTIC_ENRICHMENT"
    )
    assert edge["support_refs"] == [support]
