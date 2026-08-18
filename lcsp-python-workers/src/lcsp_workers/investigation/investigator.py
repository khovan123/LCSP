"""LLM-guided, evidence-bounded investigation over the Program Evidence Graph."""
from __future__ import annotations

import hashlib
import json
from typing import Any, Callable

from lcsp_workers.llm import LLMToolDefinition
from lcsp_workers.llm.fallback_client import LLMClientProtocol
from lcsp_workers.scanner.program_graph.query_engine import ProgramGraphQueryEngine

from .evidence_claim_validator import EvidenceClaimValidator
from .models import EvidenceClaim, InvestigationPacket


MAX_TOOL_STEPS = 4
MAX_OBSERVATION_ITEMS = 40
FINISH_TOOL_NAME = "finish"
GRAPH_TOOL_NAMES = (
    "search_nodes",
    "trace_static_flow",
    "inspect_data_path",
    "inspect_decision_path",
    "inspect_human_review_path",
    "symbol_context",
    "provider_invocations",
)
CANONICAL_CLAIM_TYPES = {
    "RULE_REQUIREMENT_MET",
    "RULE_REQUIREMENT_NOT_MET",
    "UNRESOLVED_ENGINEERING_FACT",
}


class LawGuidedInvestigator:
    """Let the LLM choose bounded native graph tools under EngineeringRule criteria."""

    def __init__(self, llm_client: LLMClientProtocol) -> None:
        self.llm = llm_client
        self.validator = EvidenceClaimValidator()

    def investigate(
        self,
        *,
        packet: InvestigationPacket,
        graph,
        workflow_run_id: str,
        correlation_id: str | None = None,
    ) -> list[EvidenceClaim]:
        """Run a provider-native tool loop and return validated engineering claims.

        The provider receives closed JSON-schema tool definitions. LCSP executes
        every graph tool itself against the pinned Program Evidence Graph; provider
        SDK automatic execution remains disabled. A dedicated ``finish`` tool is
        the only native action allowed to submit final evidence claims.
        """
        engine = ProgramGraphQueryEngine(graph)
        observations: list[dict[str, Any]] = [
            {
                "source": "engineering_rule_seed_query",
                "result": self._bounded(item),
            }
            for item in packet.initial_results[:MAX_OBSERVATION_ITEMS]
        ]
        tools = self._tool_definitions()
        graph_tool_calls_used = 0

        for step in range(MAX_TOOL_STEPS):
            response = self.llm.complete_with_tools(
                prompt=self._prompt(packet, observations, step),
                tools=tools,
                workflow_run_id=workflow_run_id,
                node_name="investigate_engineering_rule",
                max_tokens=3500,
                correlationId=correlation_id,
            )

            if not response.tool_calls:
                observations.append(
                    {
                        "step": step + 1,
                        "error": "MODEL_RETURNED_NO_NATIVE_TOOL_CALL",
                        "content": self._bounded(response.content),
                    }
                )
                continue

            for call in response.tool_calls:
                if call.name == FINISH_TOOL_NAME:
                    return self._claims_from_finish_arguments(
                        call.arguments,
                        packet,
                        graph,
                    )

                if graph_tool_calls_used >= MAX_TOOL_STEPS:
                    break

                graph_tool_calls_used += 1
                observation = self._execute_tool(engine, call.name, call.arguments)
                observations.append(
                    {
                        "step": step + 1,
                        "toolCall": graph_tool_calls_used,
                        "tool": call.name,
                        "callId": call.call_id,
                        "arguments": self._bounded(call.arguments),
                        "result": self._bounded(observation),
                    }
                )

            if graph_tool_calls_used >= MAX_TOOL_STEPS:
                break

        # The graph-tool budget is exhausted. Keep finalization native as well:
        # the provider receives only the finish function and cannot request more
        # repository traversal in this final round.
        response = self.llm.complete_with_tools(
            prompt=self._finish_prompt(packet, observations),
            tools=[self._finish_tool_definition()],
            workflow_run_id=workflow_run_id,
            node_name="investigate_engineering_rule_finish",
            max_tokens=3000,
            correlationId=correlation_id,
        )
        for call in response.tool_calls:
            if call.name == FINISH_TOOL_NAME:
                return self._claims_from_finish_arguments(
                    call.arguments,
                    packet,
                    graph,
                )

        return self._claims_from_payload({}, packet, graph)

    def _execute_tool(
        self,
        engine: ProgramGraphQueryEngine,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any] | list[dict[str, Any]]:
        tools: dict[str, Callable[..., Any]] = {
            "search_nodes": engine.search_nodes,
            "trace_static_flow": engine.trace_static_flow,
            "inspect_data_path": engine.inspect_data_path,
            "inspect_decision_path": engine.inspect_decision_path,
            "inspect_human_review_path": engine.inspect_human_review_path,
            "symbol_context": engine.symbol_context,
            "provider_invocations": engine.provider_invocations,
        }
        tool = tools.get(tool_name)
        if tool is None:
            return {
                "error": "UNKNOWN_GRAPH_TOOL",
                "allowedTools": sorted(tools),
            }
        try:
            result = tool(**self._normalize_tool_arguments(tool_name, arguments))
        except (TypeError, ValueError) as error:
            return {
                "error": "INVALID_GRAPH_TOOL_ARGUMENTS",
                "tool": tool_name,
                "errorType": type(error).__name__,
            }
        return result.to_dict() if hasattr(result, "to_dict") else result

    @staticmethod
    def _normalize_tool_arguments(
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        aliases = {
            "nodeTypes": "node_types",
            "pathPrefixes": "path_prefixes",
            "semanticTypes": "semantic_types",
            "maxResults": "max_results",
            "startRef": "start_ref",
            "maxHops": "max_hops",
            "edgeTypes": "edge_types",
            "stopNodeTypes": "stop_node_types",
            "actionCategories": "action_categories",
            "symbolRef": "symbol_ref",
            "maxNeighbors": "max_neighbors",
        }
        normalized = {aliases.get(key, key): value for key, value in arguments.items()}
        if tool_name == "search_nodes":
            normalized.setdefault("max_results", 25)
        elif tool_name in {
            "trace_static_flow",
            "inspect_data_path",
            "inspect_decision_path",
            "inspect_human_review_path",
        }:
            normalized.setdefault("max_results", 80)
        return normalized

    @classmethod
    def _tool_definitions(cls) -> list[LLMToolDefinition]:
        """Build the closed provider-native tool catalog for one investigation."""
        string_array = {"type": "array", "items": {"type": "string"}}
        graph_tools = [
            LLMToolDefinition(
                name="search_nodes",
                description=(
                    "Search bounded Program Evidence Graph nodes by structural type, source path, "
                    "semantic type, or text. Use this to discover concrete node refs before tracing."
                ),
                input_schema=cls._closed_schema(
                    {
                        "node_types": string_array,
                        "text": {"type": "string"},
                        "path_prefixes": string_array,
                        "semantic_types": string_array,
                        "max_results": {"type": "integer", "minimum": 1, "maximum": 25},
                    }
                ),
            ),
            LLMToolDefinition(
                name="trace_static_flow",
                description=(
                    "Trace a bounded static control/data/event flow from a concrete graph node ref."
                ),
                input_schema=cls._closed_schema(
                    {
                        "start_ref": {"type": "string"},
                        "direction": {"type": "string", "enum": ["FORWARD", "BACKWARD", "BOTH"]},
                        "max_hops": {"type": "integer", "minimum": 1, "maximum": 12},
                        "edge_types": string_array,
                        "stop_node_types": string_array,
                        "max_results": {"type": "integer", "minimum": 1, "maximum": 80},
                    },
                    required=("start_ref",),
                ),
            ),
            LLMToolDefinition(
                name="inspect_data_path",
                description="Inspect bounded data-flow evidence from a concrete graph node ref.",
                input_schema=cls._closed_schema(
                    {
                        "start_ref": {"type": "string"},
                        "direction": {"type": "string", "enum": ["FORWARD", "BACKWARD", "BOTH"]},
                        "max_hops": {"type": "integer", "minimum": 1, "maximum": 10},
                        "max_results": {"type": "integer", "minimum": 1, "maximum": 80},
                    },
                    required=("start_ref",),
                ),
            ),
            LLMToolDefinition(
                name="inspect_decision_path",
                description=(
                    "Inspect bounded decision/action flow evidence from a concrete graph node ref."
                ),
                input_schema=cls._closed_schema(
                    {
                        "start_ref": {"type": "string"},
                        "max_hops": {"type": "integer", "minimum": 1, "maximum": 12},
                        "action_categories": string_array,
                        "max_results": {"type": "integer", "minimum": 1, "maximum": 80},
                    },
                    required=("start_ref",),
                ),
            ),
            LLMToolDefinition(
                name="inspect_human_review_path",
                description=(
                    "Inspect bounded human-review/override evidence on a decision path from a node ref."
                ),
                input_schema=cls._closed_schema(
                    {
                        "start_ref": {"type": "string"},
                        "max_hops": {"type": "integer", "minimum": 1, "maximum": 12},
                        "max_results": {"type": "integer", "minimum": 1, "maximum": 80},
                    },
                    required=("start_ref",),
                ),
            ),
            LLMToolDefinition(
                name="symbol_context",
                description=(
                    "Resolve one symbol or graph node ref and return its bounded neighboring context."
                ),
                input_schema=cls._closed_schema(
                    {
                        "symbol_ref": {"type": "string"},
                        "max_neighbors": {"type": "integer", "minimum": 1, "maximum": 50},
                    },
                    required=("symbol_ref",),
                ),
            ),
            LLMToolDefinition(
                name="provider_invocations",
                description=(
                    "Return bounded AI model invocation nodes, optionally filtered by provider."
                ),
                input_schema=cls._closed_schema(
                    {
                        "provider": {"type": "string"},
                        "max_results": {"type": "integer", "minimum": 1, "maximum": 80},
                    }
                ),
            ),
        ]
        return [*graph_tools, cls._finish_tool_definition()]

    @classmethod
    def _finish_tool_definition(cls) -> LLMToolDefinition:
        """Return the native terminal action used to submit evidence claims."""
        claim_schema = cls._closed_schema(
            {
                "claimType": {
                    "type": "string",
                    "enum": sorted(CANONICAL_CLAIM_TYPES),
                },
                "value": {"type": "boolean"},
                "evidenceRefs": {"type": "array", "items": {"type": "string"}},
                "graphPathRefs": {"type": "array", "items": {"type": "string"}},
                "sourceAnchorRefs": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "limitations": {"type": "array", "items": {"type": "string"}},
            },
            required=(
                "claimType",
                "value",
                "evidenceRefs",
                "graphPathRefs",
                "sourceAnchorRefs",
                "confidence",
                "limitations",
            ),
        )
        return LLMToolDefinition(
            name=FINISH_TOOL_NAME,
            description=(
                "Finish this EngineeringRule investigation and submit only technical evidence "
                "claims. Never submit a legal conclusion."
            ),
            input_schema=cls._closed_schema(
                {
                    "claims": {
                        "type": "array",
                        "items": claim_schema,
                        "minItems": 1,
                        "maxItems": 12,
                    }
                },
                required=("claims",),
            ),
        )

    @staticmethod
    def _closed_schema(
        properties: dict[str, Any],
        *,
        required: tuple[str, ...] = (),
    ) -> dict[str, Any]:
        schema: dict[str, Any] = {
            "type": "object",
            "additionalProperties": False,
            "properties": properties,
        }
        if required:
            schema["required"] = list(required)
        return schema

    def _claims_from_finish_arguments(
        self,
        arguments: dict[str, Any],
        packet: InvestigationPacket,
        graph,
    ) -> list[EvidenceClaim]:
        return self._claims_from_payload(
            {"claims": arguments.get("claims")},
            packet,
            graph,
        )

    def _claims_from_payload(
        self,
        payload: dict[str, Any],
        packet: InvestigationPacket,
        graph,
    ) -> list[EvidenceClaim]:
        rows = payload.get("claims")
        if not isinstance(rows, list):
            rows = []
        result: list[EvidenceClaim] = []
        for index, item in enumerate(rows, 1):
            if not isinstance(item, dict):
                continue
            claim_type = str(
                item.get("claimType") or "UNRESOLVED_ENGINEERING_FACT"
            ).strip().upper()
            if claim_type not in CANONICAL_CLAIM_TYPES:
                claim_type = "UNRESOLVED_ENGINEERING_FACT"
            refs = tuple(
                str(value)
                for value in item.get("evidenceRefs") or []
                if str(value)
            )
            graph_refs = tuple(
                str(value)
                for value in item.get("graphPathRefs") or []
                if str(value)
            )
            source_refs = tuple(
                str(value)
                for value in item.get("sourceAnchorRefs") or []
                if str(value)
            )
            seed = (
                f"{packet.engineering_rule_id}:{index}:{claim_type}:"
                f"{refs}:{graph_refs}:{source_refs}:{item.get('value')}"
            )
            claim = EvidenceClaim(
                "claim:" + hashlib.sha256(seed.encode()).hexdigest()[:24],
                packet.engineering_rule_id,
                claim_type,
                item.get("value"),
                refs,
                graph_refs,
                source_refs,
                float(item.get("confidence") or 0),
                tuple(
                    str(value)
                    for value in item.get("limitations") or []
                    if str(value)
                ),
            )
            result.append(self.validator.validate(claim, graph))

        if result:
            return result

        return [
            EvidenceClaim(
                "claim:"
                + hashlib.sha256(
                    f"{packet.engineering_rule_id}:empty".encode()
                ).hexdigest()[:24],
                packet.engineering_rule_id,
                "UNRESOLVED_ENGINEERING_FACT",
                None,
                (),
                confidence=0.0,
                limitations=("INVESTIGATION_RETURNED_NO_VALID_CLAIMS",),
            )
        ]

    @staticmethod
    def _bounded(value: Any) -> Any:
        if isinstance(value, list):
            return [
                LawGuidedInvestigator._bounded(item)
                for item in value[:MAX_OBSERVATION_ITEMS]
            ]
        if isinstance(value, dict):
            result: dict[str, Any] = {}
            for index, (key, item) in enumerate(value.items()):
                if index >= MAX_OBSERVATION_ITEMS:
                    break
                result[str(key)] = LawGuidedInvestigator._bounded(item)
            return result
        if isinstance(value, str) and len(value) > 2000:
            return value[:2000] + "…"
        return value

    @staticmethod
    def _rule_contract(packet: InvestigationPacket) -> dict[str, Any]:
        return {
            "engineeringRuleId": packet.engineering_rule_id,
            "concept": packet.concept,
            "investigationGoals": packet.investigation_goals,
            "requiredEvidence": packet.required_evidence,
            "supportingEvidence": packet.supporting_evidence,
            "negativeEvidence": packet.negative_evidence,
            "unresolvedConditions": packet.unresolved_conditions,
        }

    @staticmethod
    def _prompt(
        packet: InvestigationPacket,
        observations: list[dict[str, Any]],
        step: int,
    ) -> str:
        contract = {
            "task": (
                "Investigate the supplied EngineeringRule against the Program Evidence Graph. "
                "The EngineeringRule evidence criteria are authoritative for this technical "
                "investigation. Use exactly one provider-native tool call in this response. "
                "Use a graph tool when more evidence is needed; call finish when the rule is "
                "sufficiently evidenced or cannot be resolved within bounded static evidence. "
                "Do not answer with a JSON pseudo-tool command or plain-text conclusion. Never "
                "decide legal compliance, legal risk tier, certification, or infer facts outside evidence."
            ),
            "engineeringRule": LawGuidedInvestigator._rule_contract(packet),
            "wizardContext": packet.wizard_context,
            "seedEvidenceRefs": packet.evidence_refs,
            "unresolvedFrontiers": packet.unresolved_frontiers,
            "observations": observations,
            "nativeToolStep": step + 1,
            "claimRules": [
                "Evaluate only the supplied EngineeringRule evidence criteria.",
                "MET/NOT_MET require concrete graph, path, or source-anchor evidence references.",
                "Absence is NOT_MET only when the searched path is bounded and complete.",
                "Dynamic, truncated, external, or insufficient paths are UNRESOLVED.",
                "Wizard context may explain an external boundary but never overrides repository evidence.",
                "Use finish as soon as the EngineeringRule criteria are sufficiently evidenced.",
            ],
        }
        return json.dumps(contract, ensure_ascii=False, sort_keys=True)

    @staticmethod
    def _finish_prompt(
        packet: InvestigationPacket,
        observations: list[dict[str, Any]],
    ) -> str:
        contract = {
            "task": (
                "The graph-tool budget is exhausted. You have exactly one available native tool: "
                "finish. Call finish now with final engineering evidence claims only. Do not emit "
                "plain text, request more graph traversal, or decide legal compliance."
            ),
            "engineeringRule": LawGuidedInvestigator._rule_contract(packet),
            "wizardContext": packet.wizard_context,
            "unresolvedFrontiers": packet.unresolved_frontiers,
            "observations": observations,
            "claimRules": [
                "If the EngineeringRule criteria are not sufficiently evidenced, emit UNRESOLVED_ENGINEERING_FACT.",
                "Do not convert missing repository evidence into a legal conclusion.",
            ],
        }
        return json.dumps(contract, ensure_ascii=False, sort_keys=True)
