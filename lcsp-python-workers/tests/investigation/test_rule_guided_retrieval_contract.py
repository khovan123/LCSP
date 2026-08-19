from __future__ import annotations

import json

import pytest

from lcsp_workers.investigation.code_context_investigator import (
    CodeContextLawGuidedInvestigator,
)
from lcsp_workers.investigation.evidence_ledger import EvidenceLedger
from lcsp_workers.investigation.investigator import LawGuidedInvestigator
from lcsp_workers.investigation.models import InvestigationPacket
from lcsp_workers.scanner.program_graph.vocabulary import EDGE_TYPES, NODE_TYPES


def _packet() -> InvestigationPacket:
    return InvestigationPacket(
        engineering_rule_id="eng-1",
        concept="TRANSPARENCY",
        investigation_goals=("Trace AI output to the user-visible disclosure control",),
        initial_results=(),
        starting_node_types=("AI_OUTPUT",),
        target_node_types=("HTTP_RESPONSE", "NOTIFICATION"),
        edge_strategies=("CALLS", "FLOWS_TO"),
        graph_queries=(
            {
                "name": "trace-output",
                "startNodeTypes": ["AI_OUTPUT"],
                "direction": "FORWARD",
                "followEdges": ["CALLS", "FLOWS_TO"],
                "stopNodeTypes": ["HTTP_RESPONSE", "NOTIFICATION"],
                "semanticTypes": [],
            },
        ),
        keywords=("disclosure", "label", "watermark"),
        common_apis=("renderDisclosure",),
        common_libraries=("@lcsp/i18n",),
        patterns=("AI-generated",),
        required_evidence=("AI_OUTPUT_SURFACE",),
        supporting_evidence=("DISCLOSURE_OR_LABEL_CONTROL",),
        negative_evidence=("AI_OUTPUT_WITHOUT_EVIDENCED_TRANSPARENCY_CONTROL",),
    )


def test_rule_contract_exposes_retrieval_hints_separately_from_evidence_labels() -> None:
    payload = json.loads(
        LawGuidedInvestigator._prompt(_packet(), EvidenceLedger(), [], 0)
    )
    rule = payload["engineeringRule"]

    assert rule["startingNodeTypes"] == ["AI_OUTPUT"]
    assert rule["targetNodeTypes"] == ["HTTP_RESPONSE", "NOTIFICATION"]
    assert rule["edgeStrategies"] == ["CALLS", "FLOWS_TO"]
    assert rule["graphQueries"][0]["startNodeTypes"] == ["AI_OUTPUT"]
    assert rule["retrievalHints"]["keywords"] == ["disclosure", "label", "watermark"]
    assert rule["requiredEvidence"] == ["AI_OUTPUT_SURFACE"]
    assert any("NOT Program Evidence Graph node types" in row for row in payload["claimRules"])


def test_graph_tool_schema_only_allows_canonical_node_and_edge_vocabulary() -> None:
    tools = {tool.name: tool for tool in LawGuidedInvestigator._tool_definitions()}
    search_items = tools["search_nodes"].input_schema["properties"]["node_types"]["items"]
    trace = tools["trace_static_flow"].input_schema["properties"]

    assert set(search_items["enum"]) == set(NODE_TYPES)
    assert set(trace["edge_types"]["items"]["enum"]) == set(EDGE_TYPES)
    assert set(trace["stop_node_types"]["items"]["enum"]) == set(NODE_TYPES)

    with pytest.raises(ValueError, match="non-canonical"):
        LawGuidedInvestigator._normalize_tool_arguments(
            "search_nodes",
            {"node_types": ["AI_OUTPUT_SURFACE"]},
        )


def test_code_prompt_drives_targeted_search_then_source_expansion() -> None:
    payload = json.loads(
        CodeContextLawGuidedInvestigator._code_prompt(
            _packet(), EvidenceLedger(), [], 0
        )
    )

    assert payload["codeInvestigationFlow"][0].startswith(
        "SEARCH: first use EngineeringRule retrievalHints"
    )
    assert any("get_code" in row and "implementation behavior" in row for row in payload["codeContextRules"])
    assert any("Tests, specs, mocks" in row for row in payload["codeContextRules"])
