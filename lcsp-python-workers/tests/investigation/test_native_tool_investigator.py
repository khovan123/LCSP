from __future__ import annotations

from dataclasses import dataclass, field

from lcsp_workers.investigation.investigator import (
    FINISH_TOOL_NAME,
    GRAPH_TOOL_NAMES,
    LawGuidedInvestigator,
)
from lcsp_workers.investigation.models import (
    ENGINEERING_LIMITATION_CODES,
    MODEL_SELECTABLE_LIMITATION_CODES,
    InvestigationPacket,
)
from lcsp_workers.llm import LLMToolCall, LLMToolResponse


@dataclass
class NativeToolClient:
    responses: list[LLMToolResponse]
    calls: list[dict] = field(default_factory=list)

    def complete(self, *args, **kwargs):
        raise AssertionError("LawGuidedInvestigator must not use text completion")

    def complete_with_tools(self, **kwargs):
        self.calls.append(kwargs)
        if not self.responses:
            raise AssertionError("unexpected native LLM call")
        return self.responses.pop(0)


def _response(*tool_calls: LLMToolCall, content: str = "") -> LLMToolResponse:
    return LLMToolResponse(
        content=content,
        input_tokens=10,
        output_tokens=5,
        model="gpt-4o-mini",
        provider="openai",
        request_id="req-1",
        tool_calls=tuple(tool_calls),
    )


def _graph() -> dict:
    return {
        "graph_id": "graph-1",
        "snapshot_id": "snapshot-1",
        "commit_sha": "abc123",
        "node_count": 1,
        "edge_count": 0,
        "nodes": [
            {
                "node_id": "node-1",
                "node_type": "HUMAN_REVIEW",
                "label": "human review",
                "source": {"file_path": "src/review.py", "symbol_ref": "review"},
                "attributes": {},
                "semantic_types": ["HUMAN_OVERSIGHT"],
                "evidence_refs": ["evidence:review-1"],
            }
        ],
        "edges": [],
        "source_anchors": [],
        "indexes": {},
        "unresolved_frontiers": [],
        "coverage_state": "SUFFICIENT",
        "coverage_notes": [],
        "provenance": {"scan_job_id": "scan-1"},
        "evidence_refs": ["evidence:review-1"],
        "graph_hash": "sha256:graph",
        "schema_version": "2.0.0",
    }


def _packet() -> InvestigationPacket:
    return InvestigationPacket(
        engineering_rule_id="eng-1",
        concept="HUMAN_OVERSIGHT",
        investigation_goals=("Find human review controls",),
        initial_results=(),
        required_evidence=("A bounded human review path",),
    )


def _finish_call(*, limitations: list[str] | None = None) -> LLMToolCall:
    return LLMToolCall(
        name=FINISH_TOOL_NAME,
        call_id="call-finish",
        arguments={
            "claims": [
                {
                    "claimType": "RULE_REQUIREMENT_MET",
                    "evidenceRefs": ["evidence:review-1"],
                    "graphPathRefs": ["node-1"],
                    "sourceAnchorRefs": [],
                    "confidence": 0.95,
                    "limitations": limitations or [],
                }
            ]
        },
    )


def test_investigator_uses_native_graph_tool_then_native_finish() -> None:
    client = NativeToolClient(
        responses=[
            _response(
                LLMToolCall(
                    name="search_nodes",
                    arguments={
                        "node_types": ["HUMAN_REVIEW"],
                        "max_results": 5,
                    },
                    call_id="call-search",
                )
            ),
            _response(_finish_call()),
        ]
    )

    claims = LawGuidedInvestigator(client).investigate(
        packet=_packet(),
        graph=_graph(),
        workflow_run_id="workflow-1",
        correlation_id="corr-1",
    )

    assert len(claims) == 1
    assert claims[0].claim_type == "RULE_REQUIREMENT_MET"
    assert claims[0].value is True
    assert claims[0].evidence_refs == ("evidence:review-1",)
    assert claims[0].graph_path_refs == ("node-1",)

    assert len(client.calls) == 2
    first_tool_names = {tool.name for tool in client.calls[0]["tools"]}
    assert first_tool_names == {*GRAPH_TOOL_NAMES, FINISH_TOOL_NAME}
    assert client.calls[0]["node_name"] == "investigate_engineering_rule"
    assert "JSON pseudo-tool" in client.calls[0]["prompt"]
    assert "search_nodes" not in client.calls[0]["prompt"]


def test_finish_schema_derives_value_and_closes_limitations_to_machine_codes() -> None:
    finish = LawGuidedInvestigator._finish_tool_definition()
    claim_schema = finish.input_schema["properties"]["claims"]["items"]
    claim_properties = claim_schema["properties"]

    assert "value" not in claim_properties
    assert "value" not in claim_schema["required"]
    assert claim_properties["limitations"]["items"]["enum"] == sorted(
        MODEL_SELECTABLE_LIMITATION_CODES
    )


def test_investigator_forces_native_finish_after_tool_rounds_without_calls() -> None:
    client = NativeToolClient(
        responses=[
            _response(content="plain text is ignored"),
            _response(content="still no native call"),
            _response(content="still no native call"),
            _response(content="still no native call"),
            _response(_finish_call()),
        ]
    )

    claims = LawGuidedInvestigator(client).investigate(
        packet=_packet(),
        graph=_graph(),
        workflow_run_id="workflow-1",
    )

    assert claims[0].claim_type == "RULE_REQUIREMENT_MET"
    assert claims[0].value is True
    assert len(client.calls) == 5
    assert [tool.name for tool in client.calls[-1]["tools"]] == [FINISH_TOOL_NAME]
    assert client.calls[-1]["node_name"] == "investigate_engineering_rule_finish"


def test_investigator_fails_closed_on_noncanonical_model_limitation() -> None:
    client = NativeToolClient(
        responses=[
            _response(
                _finish_call(
                    limitations=["System appears compliant based on external evidence."]
                )
            )
        ]
    )

    claims = LawGuidedInvestigator(client).investigate(
        packet=_packet(),
        graph=_graph(),
        workflow_run_id="workflow-1",
    )

    assert claims[0].claim_type == "UNRESOLVED_ENGINEERING_FACT"
    assert claims[0].value is None
    assert claims[0].limitations == (
        ENGINEERING_LIMITATION_CODES["model_limitation_code_invalid"],
    )


def test_investigator_fails_closed_when_provider_never_calls_finish() -> None:
    client = NativeToolClient(responses=[_response() for _ in range(5)])

    claims = LawGuidedInvestigator(client).investigate(
        packet=_packet(),
        graph=_graph(),
        workflow_run_id="workflow-1",
    )

    assert len(claims) == 1
    assert claims[0].claim_type == "UNRESOLVED_ENGINEERING_FACT"
    assert claims[0].value is None
    assert claims[0].confidence == 0.0
    assert claims[0].limitations == (
        ENGINEERING_LIMITATION_CODES["investigation_returned_no_valid_claims"],
    )
