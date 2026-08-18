"""LLM-guided, evidence-bounded investigation over the Program Evidence Graph."""
from __future__ import annotations

import hashlib
import json
from typing import Any, Callable

from lcsp_workers.llm import LLMToolDefinition
from lcsp_workers.llm.fallback_client import LLMClientProtocol
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.scanner.program_graph.query_engine import ProgramGraphQueryEngine

from .evidence_claim_validator import EvidenceClaimValidationError, EvidenceClaimValidator
from .models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    MODEL_SELECTABLE_LIMITATION_CODES,
    EvidenceClaim,
    InvestigationPacket,
)


logger = get_logger(__name__)
MAX_TOOL_STEPS = 4
MAX_OBSERVATION_ITEMS = 12
MAX_OBSERVATION_STRING_CHARS = 800
MAX_SEED_OBSERVATIONS = 12
MAX_PROMPT_OBSERVATIONS = 12
MAX_PROMPT_EVIDENCE_REFS = 160
MAX_PROMPT_UNRESOLVED_FRONTIERS = 80
MAX_PROMPT_CHARS = 90_000
MAX_RESULT_NODES = 16
MAX_RESULT_EDGES = 24
MAX_RESULT_PATHS = 12
MAX_RESULT_REFS = 60
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
CANONICAL_CLAIM_TYPES = frozenset(ENGINEERING_EVIDENCE_CLAIM_TYPES.values())
CLAIM_VALUE_BY_TYPE: dict[str, bool | None] = {
    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"]: True,
    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"]: False,
    ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]: None,
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
                "result": self._compact_observation(item),
            }
            for item in self._select_seed_results(packet.initial_results)
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
                logger.warning(
                    "ENGINEERING_INVESTIGATION_NO_NATIVE_TOOL_CALL",
                    engineering_rule_id=packet.engineering_rule_id,
                    step=step + 1,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )
                observations.append(
                    {
                        "step": step + 1,
                        "error": "MODEL_RETURNED_NO_NATIVE_TOOL_CALL",
                        "content": self._bounded(response.content),
                    }
                )
                continue

            for call in response.tool_calls:
                bounded_arguments = self._bounded(call.arguments)
                logger.info(
                    "ENGINEERING_INVESTIGATION_TOOL_CALL",
                    engineering_rule_id=packet.engineering_rule_id,
                    step=step + 1,
                    tool=call.name,
                    call_id=call.call_id,
                    arguments=bounded_arguments,
                    graph_tool_calls_used=graph_tool_calls_used,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )
                if call.name == FINISH_TOOL_NAME:
                    claims = self._claims_from_finish_arguments(
                        call.arguments,
                        packet,
                        graph,
                    )
                    self._log_finish(
                        packet=packet,
                        claims=claims,
                        workflow_run_id=workflow_run_id,
                        correlation_id=correlation_id,
                        forced=False,
                    )
                    return claims

                if graph_tool_calls_used >= MAX_TOOL_STEPS:
                    break

                graph_tool_calls_used += 1
                observation = self._execute_tool(engine, call.name, call.arguments)
                bounded_observation = self._compact_observation(observation)
                logger.info(
                    "ENGINEERING_INVESTIGATION_TOOL_RESULT",
                    engineering_rule_id=packet.engineering_rule_id,
                    step=step + 1,
                    tool_call_index=graph_tool_calls_used,
                    tool=call.name,
                    call_id=call.call_id,
                    arguments=bounded_arguments,
                    result=bounded_observation,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )
                observations.append(
                    {
                        "step": step + 1,
                        "toolCall": graph_tool_calls_used,
                        "tool": call.name,
                        "callId": call.call_id,
                        "arguments": bounded_arguments,
                        "result": bounded_observation,
                    }
                )

            if graph_tool_calls_used >= MAX_TOOL_STEPS:
                break

        # The graph-tool budget is exhausted. Keep finalization native as well:
        # the provider receives only the finish function and cannot request more
        # repository traversal in this final round. The finish tool marks native
        # tool choice as required, so supported providers cannot silently return
        # a plain-text answer here.
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
                claims = self._claims_from_finish_arguments(
                    call.arguments,
                    packet,
                    graph,
                )
                self._log_finish(
                    packet=packet,
                    claims=claims,
                    workflow_run_id=workflow_run_id,
                    correlation_id=correlation_id,
                    forced=True,
                )
                return claims

        logger.warning(
            "ENGINEERING_INVESTIGATION_FINISH_MISSING",
            engineering_rule_id=packet.engineering_rule_id,
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
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
        """Return the native terminal action used to submit evidence claims.

        The model selects only a claim type, evidence references, confidence, and
        closed limitation codes. LCSP derives ``value`` deterministically from the
        claim type, so provider-authored prose or contradictory boolean values cannot
        enter the persisted claim artifact.
        """
        claim_schema = cls._closed_schema(
            {
                "claimType": {
                    "type": "string",
                    "enum": sorted(CANONICAL_CLAIM_TYPES),
                },
                "evidenceRefs": {"type": "array", "items": {"type": "string"}},
                "graphPathRefs": {"type": "array", "items": {"type": "string"}},
                "sourceAnchorRefs": {"type": "array", "items": {"type": "string"}},
                "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                "limitations": {
                    "type": "array",
                    "items": {
                        "type": "string",
                        "enum": sorted(MODEL_SELECTABLE_LIMITATION_CODES),
                    },
                },
            },
            required=(
                "claimType",
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
                "claims. Never submit a legal conclusion. Limitation values must be selected "
                "from the provided machine-code enum."
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
            # This policy marker is present in every EngineeringRule tool catalog.
            # Therefore provider AUTO mode is disabled for every investigation turn;
            # in the terminal round this is the only tool and ``finish`` is forced.
            tool_choice_required=True,
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
                item.get("claimType")
                or ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
            ).strip().upper()
            if claim_type not in CANONICAL_CLAIM_TYPES:
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]

            limitations, invalid_limitation = self._normalize_limitations(
                item.get("limitations")
            )
            if invalid_limitation:
                # Fail closed if a provider violates the native limitation enum.
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                limitations = (
                    *limitations,
                    ENGINEERING_LIMITATION_CODES["model_limitation_code_invalid"],
                )

            claim_value = CLAIM_VALUE_BY_TYPE[claim_type]
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
                f"{refs}:{graph_refs}:{source_refs}:{claim_value}:{limitations}"
            )
            claim = EvidenceClaim(
                "claim:" + hashlib.sha256(seed.encode()).hexdigest()[:24],
                packet.engineering_rule_id,
                claim_type,
                claim_value,
                refs,
                graph_refs,
                source_refs,
                float(item.get("confidence") or 0),
                limitations,
            )
            try:
                result.append(self.validator.validate(claim, graph))
            except EvidenceClaimValidationError as error:
                logger.warning(
                    "ENGINEERING_INVESTIGATION_CLAIM_REJECTED",
                    engineering_rule_id=packet.engineering_rule_id,
                    claim_id=claim.claim_id,
                    claim_type=claim.claim_type,
                    error_type=type(error).__name__,
                    error_message=str(error)[:2000],
                    evidence_ref_count=len(refs),
                    graph_path_ref_count=len(graph_refs),
                    source_anchor_ref_count=len(source_refs),
                )
                result.append(
                    EvidenceClaim(
                        claim_id=claim.claim_id + ":unresolved",
                        engineering_rule_id=packet.engineering_rule_id,
                        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
                        value=None,
                        evidence_refs=(),
                        confidence=0.0,
                        limitations=(
                            ENGINEERING_LIMITATION_CODES[
                                "engineering_evidence_insufficient"
                            ],
                        ),
                    )
                )

        if result:
            return result

        return [
            EvidenceClaim(
                "claim:"
                + hashlib.sha256(
                    f"{packet.engineering_rule_id}:empty".encode()
                ).hexdigest()[:24],
                packet.engineering_rule_id,
                ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
                None,
                (),
                confidence=0.0,
                limitations=(
                    ENGINEERING_LIMITATION_CODES[
                        "investigation_returned_no_valid_claims"
                    ],
                ),
            )
        ]

    @staticmethod
    def _normalize_limitations(value: Any) -> tuple[tuple[str, ...], bool]:
        if value is None:
            return (), False
        if not isinstance(value, list):
            return (), True

        allowed = set(MODEL_SELECTABLE_LIMITATION_CODES)
        result: list[str] = []
        invalid = False
        for item in value:
            code = str(item).strip().upper()
            if not code:
                continue
            if code not in allowed:
                invalid = True
                continue
            if code not in result:
                result.append(code)
        return tuple(result), invalid

    @staticmethod
    def _select_seed_results(
        initial_results: tuple[dict[str, Any], ...],
    ) -> tuple[dict[str, Any], ...]:
        """Sample deterministic seed-query results across the full result set."""
        if len(initial_results) <= MAX_SEED_OBSERVATIONS:
            return initial_results
        if MAX_SEED_OBSERVATIONS <= 1:
            return initial_results[:1]
        last_index = len(initial_results) - 1
        indexes = {
            round(index * last_index / (MAX_SEED_OBSERVATIONS - 1))
            for index in range(MAX_SEED_OBSERVATIONS)
        }
        return tuple(initial_results[index] for index in sorted(indexes))

    @staticmethod
    def _bounded(value: Any) -> Any:
        if isinstance(value, tuple):
            value = list(value)
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
        if isinstance(value, str) and len(value) > MAX_OBSERVATION_STRING_CHARS:
            return value[:MAX_OBSERVATION_STRING_CHARS] + "…"
        return value

    @classmethod
    def _compact_observation(cls, value: Any) -> Any:
        """Keep graph identities/provenance while bounding prompt and debug-log size."""
        if isinstance(value, tuple):
            value = list(value)
        if isinstance(value, list):
            if all(isinstance(item, dict) and "node_id" in item for item in value):
                return [cls._compact_node(item) for item in value[:MAX_RESULT_NODES]]
            return [cls._bounded(item) for item in value[:MAX_OBSERVATION_ITEMS]]
        if not isinstance(value, dict):
            return cls._bounded(value)

        result: dict[str, Any] = {}
        node_keys = {"nodes", "reviewNodes", "finalActions", "neighbors"}
        for key, item in value.items():
            if key in node_keys and isinstance(item, list):
                result[key] = [
                    cls._compact_node(node)
                    for node in item[:MAX_RESULT_NODES]
                    if isinstance(node, dict)
                ]
            elif key == "symbol" and isinstance(item, dict):
                result[key] = cls._compact_node(item)
            elif key == "edges" and isinstance(item, list):
                result[key] = [
                    cls._compact_edge(edge)
                    for edge in item[:MAX_RESULT_EDGES]
                    if isinstance(edge, dict)
                ]
            elif key == "paths" and isinstance(item, list):
                result[key] = [
                    [str(ref) for ref in path[:MAX_OBSERVATION_ITEMS]]
                    for path in item[:MAX_RESULT_PATHS]
                    if isinstance(path, (list, tuple))
                ]
            elif key in {"evidenceRefs", "unresolvedFrontiers"} and isinstance(item, list):
                result[key] = [str(ref) for ref in item[:MAX_RESULT_REFS]]
            else:
                result[str(key)] = cls._bounded(item)
        return result

    @classmethod
    def _compact_node(cls, node: dict[str, Any]) -> dict[str, Any]:
        source = node.get("source") if isinstance(node.get("source"), dict) else {}
        attributes = (
            node.get("attributes") if isinstance(node.get("attributes"), dict) else {}
        )
        compact = {
            "node_id": node.get("node_id"),
            "node_type": node.get("node_type"),
            "label": cls._bounded(node.get("label")),
            "source": {
                key: cls._bounded(source.get(key))
                for key in ("file_path", "symbol_ref", "line_start", "line_end")
                if source.get(key) is not None
            },
            "semantic_types": [
                str(value)
                for value in (node.get("semantic_types") or [])[:MAX_OBSERVATION_ITEMS]
            ],
            "evidence_refs": [
                str(value)
                for value in (node.get("evidence_refs") or [])[:MAX_RESULT_REFS]
            ],
        }
        if attributes:
            compact["attributes"] = cls._bounded(attributes)
        return {key: value for key, value in compact.items() if value not in (None, {}, [])}

    @classmethod
    def _compact_edge(cls, edge: dict[str, Any]) -> dict[str, Any]:
        compact = {
            "edge_id": edge.get("edge_id"),
            "edge_type": edge.get("edge_type"),
            "source_node_id": edge.get("source_node_id"),
            "target_node_id": edge.get("target_node_id"),
            "evidence_refs": [
                str(value)
                for value in (edge.get("evidence_refs") or [])[:MAX_RESULT_REFS]
            ],
        }
        return {key: value for key, value in compact.items() if value not in (None, [])}

    @staticmethod
    def _rule_contract(packet: InvestigationPacket) -> dict[str, Any]:
        return {
            "engineeringRuleId": packet.engineering_rule_id,
            "concept": packet.concept,
            "investigationGoals": list(packet.investigation_goals[:MAX_OBSERVATION_ITEMS]),
            "requiredEvidence": list(packet.required_evidence[:MAX_OBSERVATION_ITEMS]),
            "supportingEvidence": list(packet.supporting_evidence[:MAX_OBSERVATION_ITEMS]),
            "negativeEvidence": list(packet.negative_evidence[:MAX_OBSERVATION_ITEMS]),
            "unresolvedConditions": list(
                packet.unresolved_conditions[:MAX_OBSERVATION_ITEMS]
            ),
        }

    @classmethod
    def _render_prompt(cls, contract: dict[str, Any]) -> str:
        """Serialize a valid JSON prompt under a hard character budget."""
        bounded = dict(contract)
        bounded["wizardContext"] = cls._bounded(bounded.get("wizardContext") or {})
        bounded["seedEvidenceRefs"] = list(
            bounded.get("seedEvidenceRefs") or []
        )[:MAX_PROMPT_EVIDENCE_REFS]
        bounded["unresolvedFrontiers"] = list(
            bounded.get("unresolvedFrontiers") or []
        )[:MAX_PROMPT_UNRESOLVED_FRONTIERS]
        observations = list(bounded.get("observations") or [])[-MAX_PROMPT_OBSERVATIONS:]
        bounded["observations"] = observations

        def render() -> str:
            return json.dumps(bounded, ensure_ascii=False, sort_keys=True)

        rendered = render()
        while len(rendered) > MAX_PROMPT_CHARS and bounded["observations"]:
            bounded["observations"] = bounded["observations"][1:]
            rendered = render()

        if len(rendered) > MAX_PROMPT_CHARS:
            bounded["wizardContext"] = {"_lcsp_truncated": True}
            bounded["seedEvidenceRefs"] = bounded["seedEvidenceRefs"][:40]
            bounded["unresolvedFrontiers"] = bounded["unresolvedFrontiers"][:20]
            rendered = render()

        if len(rendered) > MAX_PROMPT_CHARS:
            bounded["observations"] = []
            rendered = render()

        if len(rendered) > MAX_PROMPT_CHARS:
            raise ValueError("ENGINEERING_INVESTIGATION_PROMPT_BUDGET_EXCEEDED")
        return rendered

    @classmethod
    def _prompt(
        cls,
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
            "engineeringRule": cls._rule_contract(packet),
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
                "Claim value is derived by LCSP from claimType; do not invent a separate value.",
                "Limitations must use only the machine-code enum exposed by finish.",
                "Use only evidence/node/edge/anchor identifiers visible in the supplied observations.",
                "Use finish as soon as the EngineeringRule criteria are sufficiently evidenced.",
            ],
        }
        return cls._render_prompt(contract)

    @classmethod
    def _finish_prompt(
        cls,
        packet: InvestigationPacket,
        observations: list[dict[str, Any]],
    ) -> str:
        contract = {
            "task": (
                "The graph-tool budget is exhausted. You have exactly one available native tool: "
                "finish. Call finish now with final engineering evidence claims only. Do not emit "
                "plain text, request more graph traversal, or decide legal compliance."
            ),
            "engineeringRule": cls._rule_contract(packet),
            "wizardContext": packet.wizard_context,
            "seedEvidenceRefs": packet.evidence_refs,
            "unresolvedFrontiers": packet.unresolved_frontiers,
            "observations": observations,
            "claimRules": [
                "If the EngineeringRule criteria are not sufficiently evidenced, emit UNRESOLVED_ENGINEERING_FACT.",
                "Claim value is derived by LCSP from claimType.",
                "Use only the machine-code limitation values exposed by finish.",
                "Use only evidence/node/edge/anchor identifiers visible in the supplied observations.",
                "Do not convert missing repository evidence into a legal conclusion.",
            ],
        }
        return cls._render_prompt(contract)

    @staticmethod
    def _log_finish(
        *,
        packet: InvestigationPacket,
        claims: list[EvidenceClaim],
        workflow_run_id: str,
        correlation_id: str | None,
        forced: bool,
    ) -> None:
        logger.info(
            "ENGINEERING_INVESTIGATION_FINISHED",
            engineering_rule_id=packet.engineering_rule_id,
            claim_count=len(claims),
            claim_types=[claim.claim_type for claim in claims],
            claims=[
                {
                    "claim_id": claim.claim_id,
                    "claim_type": claim.claim_type,
                    "value": claim.value,
                    "evidence_refs": list(claim.evidence_refs),
                    "graph_path_refs": list(claim.graph_path_refs),
                    "source_anchor_refs": list(claim.source_anchor_refs),
                    "confidence": claim.confidence,
                    "limitations": list(claim.limitations),
                }
                for claim in claims
            ],
            limitation_codes=sorted(
                {
                    limitation
                    for claim in claims
                    for limitation in claim.limitations
                    if limitation
                }
            ),
            evidence_ref_count=len(
                {
                    ref
                    for claim in claims
                    for ref in (
                        *claim.evidence_refs,
                        *claim.graph_path_refs,
                        *claim.source_anchor_refs,
                    )
                    if ref
                }
            ),
            forced_finish=forced,
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
        )
