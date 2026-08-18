"""LLM-guided, evidence-bounded investigation over the Program Evidence Graph."""
from __future__ import annotations

import hashlib
import json
from typing import Any, Callable

from lcsp_workers.llm.fallback_client import LLMClientProtocol
from lcsp_workers.scanner.program_graph.query_engine import ProgramGraphQueryEngine

from .evidence_claim_validator import EvidenceClaimValidator
from .models import EvidenceClaim, InvestigationPacket


MAX_TOOL_STEPS = 4
MAX_OBSERVATION_ITEMS = 40
CANONICAL_CLAIM_TYPES = {
    "RULE_REQUIREMENT_MET",
    "RULE_REQUIREMENT_NOT_MET",
    "UNRESOLVED_ENGINEERING_FACT",
}


class LawGuidedInvestigator:
    """Let the LLM choose bounded graph tools under EngineeringRule criteria."""

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
        engine = ProgramGraphQueryEngine(graph)
        observations: list[dict[str, Any]] = [
            {
                "source": "engineering_rule_seed_query",
                "result": self._bounded(item),
            }
            for item in packet.initial_results[:MAX_OBSERVATION_ITEMS]
        ]

        for step in range(MAX_TOOL_STEPS):
            response = self.llm.complete(
                prompt=self._prompt(packet, observations, step),
                workflow_run_id=workflow_run_id,
                node_name="investigate_engineering_rule",
                max_tokens=3500,
                correlationId=correlation_id,
            )
            payload = _json(response.content)
            action = str(payload.get("action") or "finish").strip().lower()

            if action == "finish":
                return self._claims_from_payload(payload, packet, graph)

            tool_name = str(payload.get("tool") or "").strip()
            arguments = payload.get("arguments")
            if not isinstance(arguments, dict):
                arguments = {}
            observation = self._execute_tool(engine, tool_name, arguments)
            observations.append(
                {
                    "step": step + 1,
                    "tool": tool_name,
                    "arguments": self._bounded(arguments),
                    "result": self._bounded(observation),
                }
            )

        response = self.llm.complete(
            prompt=self._finish_prompt(packet, observations),
            workflow_run_id=workflow_run_id,
            node_name="investigate_engineering_rule_finish",
            max_tokens=3000,
            correlationId=correlation_id,
        )
        payload = _json(response.content)
        payload["action"] = "finish"
        return self._claims_from_payload(payload, packet, graph)

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
                "investigation. Choose graph tools when more evidence is needed. Never decide "
                "legal compliance, legal risk tier, certification, or infer facts outside evidence."
            ),
            "engineeringRule": LawGuidedInvestigator._rule_contract(packet),
            "wizardContext": packet.wizard_context,
            "seedEvidenceRefs": packet.evidence_refs,
            "unresolvedFrontiers": packet.unresolved_frontiers,
            "observations": observations,
            "toolStep": step + 1,
            "allowedTools": {
                "search_nodes": {
                    "node_types": [],
                    "text": None,
                    "semantic_types": [],
                    "max_results": 25,
                },
                "trace_static_flow": {
                    "start_ref": "node id",
                    "direction": "FORWARD|BACKWARD|BOTH",
                    "max_hops": 12,
                    "edge_types": [],
                    "stop_node_types": [],
                    "max_results": 80,
                },
                "inspect_data_path": {"start_ref": "node id"},
                "inspect_decision_path": {"start_ref": "node id"},
                "inspect_human_review_path": {"start_ref": "node id"},
                "symbol_context": {"symbol_ref": "symbol or node ref"},
                "provider_invocations": {"provider": None},
            },
            "output": {
                "action": "tool|finish",
                "tool": "one allowed tool when action=tool",
                "arguments": {},
                "claims": [
                    {
                        "claimType": (
                            "RULE_REQUIREMENT_MET|RULE_REQUIREMENT_NOT_MET|"
                            "UNRESOLVED_ENGINEERING_FACT"
                        ),
                        "value": True,
                        "evidenceRefs": [],
                        "graphPathRefs": [],
                        "sourceAnchorRefs": [],
                        "confidence": 0.0,
                        "limitations": [],
                    }
                ],
            },
            "claimRules": [
                "Evaluate only the supplied EngineeringRule evidence criteria.",
                "MET/NOT_MET require concrete graph, path, or source-anchor evidence references.",
                "Absence is NOT_MET only when the searched path is bounded and complete.",
                "Dynamic, truncated, external, or insufficient paths are UNRESOLVED.",
                "Wizard context may explain an external boundary but never overrides repository evidence.",
                "Use action=finish as soon as the EngineeringRule criteria are sufficiently evidenced.",
            ],
        }
        return "Return JSON only.\n" + json.dumps(
            contract, ensure_ascii=False, sort_keys=True
        )

    @staticmethod
    def _finish_prompt(
        packet: InvestigationPacket,
        observations: list[dict[str, Any]],
    ) -> str:
        contract = {
            "task": (
                "Tool budget is exhausted. Produce final engineering evidence claims only "
                "against the supplied EngineeringRule criteria. Do not request more tools "
                "and do not decide legal compliance."
            ),
            "engineeringRule": LawGuidedInvestigator._rule_contract(packet),
            "wizardContext": packet.wizard_context,
            "unresolvedFrontiers": packet.unresolved_frontiers,
            "observations": observations,
            "output": {
                "action": "finish",
                "claims": [
                    {
                        "claimType": (
                            "RULE_REQUIREMENT_MET|RULE_REQUIREMENT_NOT_MET|"
                            "UNRESOLVED_ENGINEERING_FACT"
                        ),
                        "value": True,
                        "evidenceRefs": [],
                        "graphPathRefs": [],
                        "sourceAnchorRefs": [],
                        "confidence": 0.0,
                        "limitations": [],
                    }
                ],
            },
            "claimRules": [
                "If the EngineeringRule criteria are not sufficiently evidenced, emit UNRESOLVED_ENGINEERING_FACT.",
                "Do not convert missing repository evidence into a legal conclusion.",
            ],
        }
        return "Return JSON only.\n" + json.dumps(
            contract, ensure_ascii=False, sort_keys=True
        )


def _json(text: str) -> dict[str, Any]:
    start, end = text.find("{"), text.rfind("}")
    if start < 0 or end < start:
        raise ValueError("investigator output is not JSON")
    value = json.loads(text[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("investigator output must be object")
    return value
