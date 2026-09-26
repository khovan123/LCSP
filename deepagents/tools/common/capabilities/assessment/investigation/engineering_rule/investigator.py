"""LLM-guided, evidence-bounded investigation over the Program Evidence Graph."""
from __future__ import annotations

from orchestration.agent_stream import AGENT_STREAM_STAGES, invoke_with_stream

import hashlib
import json
from typing import Any

from langchain.agents.middleware import ToolCallLimitMiddleware

from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from middleware.billing_metering import BillingMeteringError
from model_policy import INVESTIGATOR_MODEL_SPEC, create_lcsp_agent as create_agent
from tools.common.capabilities.platform.logging import get_logger
from tools.common.capabilities.platform.tracing import traceable

from tools.common.capabilities.assessment.claims.evidence_claim.evidence_claim_validator import EvidenceClaimValidationError, EvidenceClaimValidator
from tools.common.capabilities.assessment.claims.evidence_claim.evidence_ledger import EvidenceLedger
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    MODEL_SELECTABLE_LIMITATION_CODES,
    EvidenceClaim,
    InvestigationPacket,
)


logger = get_logger(__name__)
MAX_INVESTIGATION_STEPS = 8
MAX_WORKING_RESULTS = 4
MAX_WORKING_RESULT_CHARS = 24_000
MAX_PROMPT_CHARS = 110_000
INVESTIGATION_PROMPT_VERSION = "engineering-rule-investigation.v1"
CANONICAL_CLAIM_TYPES = frozenset(ENGINEERING_EVIDENCE_CLAIM_TYPES.values())
CLAIM_VALUE_BY_TYPE: dict[str, bool | None] = {
    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"]: True,
    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"]: False,
    ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]: None,
}


def summarize_investigation_tool_result(result: Any) -> dict[str, object]:
    """Return bounded counters for terminal-safe investigation tool telemetry."""
    if not isinstance(result, dict):
        return {"result_type": type(result).__name__}

    summary: dict[str, object] = {}
    for key in (
        "error",
        "observationId",
        "truncated",
        "total",
        "nextOffset",
        "requestedOffset",
        "autoAdvanced",
    ):
        if key in result:
            summary[key] = result[key]

    preview = result.get("preview")
    if isinstance(preview, list):
        summary["preview_count"] = len(preview)

    items = result.get("items")
    if isinstance(items, list):
        summary["item_count"] = len(items)

    results = result.get("results")
    if isinstance(results, list):
        summary["result_count"] = len(results)

    summary_data = result.get("summary")
    if isinstance(summary_data, dict):
        available_sections = summary_data.get("availableSections")
        if isinstance(available_sections, list):
            summary["available_sections"] = available_sections

    return summary or {"keys": sorted(str(key) for key in result.keys())}


class LawGuidedInvestigator:
    """Let the LLM investigate graph evidence through orchestrator-owned state.

    Full seed/tool results live in a lossless ``EvidenceLedger`` for the duration
    of the EngineeringRule run. The model sees only a pageable working view and can
    explicitly reload any observation by ID. The prompt is therefore not the source
    of truth and no observation is silently dropped to satisfy provider context limits.
    """

    def __init__(self, model: str = INVESTIGATOR_MODEL_SPEC) -> None:
        self._model = model
        self.validator = EvidenceClaimValidator()

    @traceable(run_type="chain", name="LawGuidedInvestigator.investigate")
    def investigate(
        self,
        *,
        packet: InvestigationPacket,
        graph,
        workflow_run_id: str,
        correlation_id: str | None = None,
    ) -> list[EvidenceClaim]:
        ledger = EvidenceLedger()
        for item in packet.initial_results:
            ledger.add(source="engineering_rule_seed_query", result=item)
        if packet.confirmed_customer_context:
            ledger.add(source="confirmed_customer_context", result=dict(packet.confirmed_customer_context))

        agent = create_agent(
            agent_name="law_guided_investigator",
            model=self._model,
            system_prompt=(
                "Investigate one EngineeringRule directly inside the assessment repository. "
                "Use native Deep Agents filesystem/shell/task tools as the primary source of "
                "truth. When configured, codebase_memory_graph MCP may accelerate architecture "
                "and relationship discovery, but direct repository source wins on conflict. "
                "Return exact repository source locations for every decided technical claim; "
                "never invent Program Evidence Graph node/edge IDs."
            ),
            response_format=self._claims_response_schema(),
            middleware=[
                *MODEL_GOVERNANCE_MIDDLEWARE,
                ToolCallLimitMiddleware(
                    run_limit=MAX_INVESTIGATION_STEPS,
                    exit_behavior="error",
                ),
            ],
        )
        try:
            response = invoke_with_stream(agent,
                {"messages": [{"role": "user", "content": self._prompt(packet, ledger, [], 0)}]},
                config={
                    "metadata": {
                        "workflow_run_id": workflow_run_id,
                        "correlation_id": correlation_id,
                        "engineering_rule_id": packet.engineering_rule_id,
                    }
                },
                stage=AGENT_STREAM_STAGES["investigate"],
            )
            payload = response.get("structured_response") or {}
            if hasattr(payload, "model_dump"):
                payload = payload.model_dump()
            claims = self._claims_from_payload(payload, packet, graph, ledger)
        except BillingMeteringError:
            raise
        except Exception as error:
            logger.warning(
                "ENGINEERING_INVESTIGATION_NATIVE_AGENT_FAILED",
                engineering_rule_id=packet.engineering_rule_id,
                error_type=type(error).__name__,
                error_message=str(error)[:2000],
                workflow_run_id=workflow_run_id,
                correlationId=correlation_id,
            )
            claims = self._claims_from_payload({}, packet, graph, ledger)

        self._log_finish(
            packet=packet,
            claims=claims,
            workflow_run_id=workflow_run_id,
            correlation_id=correlation_id,
            forced=False,
            ledger=ledger,
        )
        return claims

    @classmethod
    def _claims_response_schema(cls) -> dict[str, Any]:
        source_location_schema = cls._closed_schema(
            {
                "path": {"type": "string", "minLength": 1, "maxLength": 500},
                "startLine": {"type": "integer", "minimum": 1},
                "endLine": {"type": "integer", "minimum": 1},
                "symbol": {"type": "string", "maxLength": 500},
            },
            required=("path", "startLine", "endLine"),
        )
        claim_schema = cls._closed_schema(
            {
                "criterion": {"type": "string", "maxLength": 500},
                "claimType": {"type": "string", "enum": sorted(CANONICAL_CLAIM_TYPES)},
                "sourceLocations": {
                    "type": "array",
                    "items": source_location_schema,
                    "maxItems": 24,
                },
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
                "criterion",
                "claimType",
                "sourceLocations",
                "confidence",
                "limitations",
            ),
        )
        return cls._closed_schema(
            {"claims": {"type": "array", "items": claim_schema, "minItems": 1, "maxItems": 12}},
            required=("claims",),
        )

    @staticmethod
    def _closed_schema(
        properties: dict[str, Any], *, required: tuple[str, ...] = ()
    ) -> dict[str, Any]:
        schema: dict[str, Any] = {
            "type": "object", "additionalProperties": False, "properties": properties
        }
        if required:
            schema["required"] = list(required)
        return schema

    def _claims_from_payload(
        self,
        payload: dict[str, Any],
        packet: InvestigationPacket,
        graph,
        ledger: EvidenceLedger,
    ) -> list[EvidenceClaim]:
        rows = payload.get("claims")
        if not isinstance(rows, list):
            rows = []
        result: list[EvidenceClaim] = []
        required_criteria = tuple(dict.fromkeys(packet.required_evidence))

        for index, item in enumerate(rows, 1):
            if not isinstance(item, dict):
                continue
            claim_type = str(
                item.get("claimType")
                or ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
            ).strip().upper()
            if claim_type not in CANONICAL_CLAIM_TYPES:
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]

            raw_criterion = str(item.get("criterion") or "").strip()
            invalid_criterion = False
            criterion: str | None
            if raw_criterion:
                criterion = raw_criterion if raw_criterion in required_criteria else None
                invalid_criterion = bool(required_criteria) and criterion is None
            elif len(required_criteria) == 1:
                # Compatibility for older deterministic tests/provider fixtures. Runtime
                # schemas now require criterion explicitly.
                criterion = required_criteria[0]
            elif required_criteria:
                criterion = None
                invalid_criterion = True
            else:
                criterion = None

            limitations, invalid_limitation = self._normalize_limitations(
                item.get("limitations")
            )
            source_locations = tuple(
                {
                    "path": str(location.get("path") or "").replace("\\", "/").lstrip("/"),
                    "start_line": int(location.get("startLine") or location.get("start_line") or 0),
                    "end_line": int(location.get("endLine") or location.get("end_line") or 0),
                    **(
                        {"symbol": str(location.get("symbol"))}
                        if location.get("symbol")
                        else {}
                    ),
                }
                for location in item.get("sourceLocations") or []
                if isinstance(location, dict)
            )
            observation_refs = tuple(
                dict.fromkeys(
                    str(value)
                    for value in item.get("observationRefs") or []
                    if str(value)
                )
            )

            if invalid_criterion:
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                limitations = (
                    *limitations,
                    ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],
                )
            if invalid_limitation:
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                limitations = (
                    *limitations,
                    ENGINEERING_LIMITATION_CODES["model_limitation_code_invalid"],
                )

            try:
                provenance = ledger.provenance_for(observation_refs)
            except KeyError as error:
                logger.warning(
                    "ENGINEERING_INVESTIGATION_CLAIM_REJECTED",
                    engineering_rule_id=packet.engineering_rule_id,
                    criterion=criterion,
                    claim_type=claim_type,
                    observation_refs=list(observation_refs),
                    error_type=type(error).__name__,
                    error_message=str(error)[:2000],
                )
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                limitations = (
                    *limitations,
                    ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],
                )
                provenance = ledger.provenance_for(())

            has_provenance = bool(
                source_locations
                or provenance.evidence_refs
                or provenance.graph_refs
                or provenance.source_anchor_refs
            )
            if (
                claim_type
                in {
                    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"],
                    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"],
                }
                and not has_provenance
            ):
                claim_type = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                limitations = (
                    *limitations,
                    ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],
                )

            claim_value = CLAIM_VALUE_BY_TYPE[claim_type]
            seed = (
                f"{packet.engineering_rule_id}:{index}:{criterion}:{claim_type}:"
                f"{observation_refs}:{provenance}:{claim_value}:{limitations}"
            )
            claim = EvidenceClaim(
                "claim:" + hashlib.sha256(seed.encode()).hexdigest()[:24],
                packet.engineering_rule_id,
                claim_type,
                claim_value,
                provenance.evidence_refs,
                provenance.graph_refs,
                provenance.source_anchor_refs,
                source_locations,
                float(item.get("confidence") or 0),
                tuple(dict.fromkeys(limitations)),
                criterion,
            )

            if (
                claim_type == ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                and not has_provenance
            ):
                result.append(claim)
                continue

            try:
                result.append(self.validator.validate(claim, graph))
            except EvidenceClaimValidationError as error:
                logger.warning(
                    "ENGINEERING_INVESTIGATION_CLAIM_REJECTED",
                    engineering_rule_id=packet.engineering_rule_id,
                    criterion=criterion,
                    claim_id=claim.claim_id,
                    claim_type=claim.claim_type,
                    observation_refs=list(observation_refs),
                    error_type=type(error).__name__,
                    error_message=str(error)[:2000],
                    evidence_ref_count=len(claim.evidence_refs),
                    graph_path_ref_count=len(claim.graph_path_refs),
                    source_anchor_ref_count=len(claim.source_anchor_refs),
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
                        criterion=criterion,
                    )
                )

        if result and any(
            claim.evidence_refs or claim.graph_path_refs or claim.source_anchor_refs
            for claim in result
        ):
            return result

        return self._fallback_unresolved_claims(packet, graph, ledger)

    def _fallback_unresolved_claims(
        self,
        packet: InvestigationPacket,
        graph,
        ledger: EvidenceLedger,
    ) -> list[EvidenceClaim]:
        """Keep fail-closed UNKNOWN outcomes tied to the evidence already inspected.

        A native-agent runtime failure or empty structured response is not allowed to
        become an evidence-less generic UNKNOWN when LCSP already has seed/tool
        observations for the EngineeringRule. Validator filtering keeps the fallback
        limited to material production provenance.
        """
        provenance = ledger.provenance_for_all()
        criteria = tuple(dict.fromkeys(packet.required_evidence)) or (None,)
        result: list[EvidenceClaim] = []
        limitations = (
            ENGINEERING_LIMITATION_CODES["investigation_returned_no_valid_claims"],
            ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],
        )

        for index, criterion in enumerate(criteria, 1):
            seed = (
                f"{packet.engineering_rule_id}:fallback:{index}:{criterion}:"
                f"{provenance}:{limitations}"
            )
            claim = EvidenceClaim(
                "claim:" + hashlib.sha256(seed.encode()).hexdigest()[:24],
                packet.engineering_rule_id,
                ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
                None,
                provenance.evidence_refs,
                provenance.graph_refs,
                provenance.source_anchor_refs,
                confidence=0.0,
                limitations=limitations,
                criterion=criterion,
            )
            try:
                result.append(self.validator.validate(claim, graph))
            except EvidenceClaimValidationError as error:
                logger.warning(
                    "ENGINEERING_INVESTIGATION_FALLBACK_PROVENANCE_REJECTED",
                    engineering_rule_id=packet.engineering_rule_id,
                    criterion=criterion,
                    claim_id=claim.claim_id,
                    error_type=type(error).__name__,
                    error_message=str(error)[:2000],
                    evidence_ref_count=len(claim.evidence_refs),
                    graph_path_ref_count=len(claim.graph_path_refs),
                    source_anchor_ref_count=len(claim.source_anchor_refs),
                )
                result.append(
                    EvidenceClaim(
                        claim_id=claim.claim_id + ":unresolved",
                        engineering_rule_id=packet.engineering_rule_id,
                        claim_type=ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"],
                        value=None,
                        evidence_refs=(),
                        confidence=0.0,
                        limitations=limitations,
                        criterion=criterion,
                    )
                )

        return result

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
    def _bounded_debug(value: Any, *, depth: int = 5) -> Any:
        if depth <= 0:
            return "[BOUNDED]"
        if isinstance(value, tuple):
            value = list(value)
        if isinstance(value, list):
            return [
                LawGuidedInvestigator._bounded_debug(item, depth=depth - 1)
                for item in value[:20]
            ]
        if isinstance(value, dict):
            return {
                str(key): LawGuidedInvestigator._bounded_debug(
                    item,
                    depth=depth - 1,
                )
                for key, item in list(value.items())[:20]
            }
        if isinstance(value, str) and len(value) > 2000:
            return value[:2000] + "…"
        return value

    @classmethod
    def _fit_working_result(cls, value: Any) -> Any:
        rendered = json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)
        if len(rendered) <= MAX_WORKING_RESULT_CHARS:
            return value
        observation_id = value.get("observationId") if isinstance(value, dict) else None
        section = value.get("section") if isinstance(value, dict) else None
        return {
            "error": "WORKING_VIEW_TOO_LARGE",
            "observationId": observation_id,
            "section": section,
            "renderedChars": len(rendered),
            "instruction": (
                "Full observation remains in the EvidenceLedger. Retry inspect_observation "
                "with a smaller limit or a narrower section."
            ),
        }

    @staticmethod
    def _rule_contract(packet: InvestigationPacket) -> dict[str, Any]:
        return {
            "engineeringRuleId": packet.engineering_rule_id,
            "concept": packet.concept,
            "investigationGoals": list(packet.investigation_goals),
            "startingNodeTypes": list(packet.starting_node_types),
            "targetNodeTypes": list(packet.target_node_types),
            "edgeStrategies": list(packet.edge_strategies),
            "graphQueries": list(packet.graph_queries),
            "retrievalHints": {
                "keywords": list(packet.keywords),
                "commonApis": list(packet.common_apis),
                "commonLibraries": list(packet.common_libraries),
                "patterns": list(packet.patterns),
            },
            "requiredEvidence": list(packet.required_evidence),
            "supportingEvidence": list(packet.supporting_evidence),
            "negativeEvidence": list(packet.negative_evidence),
            "unresolvedConditions": list(packet.unresolved_conditions),
        }

    @classmethod
    def _render_prompt(cls, contract: dict[str, Any]) -> str:
        rendered = json.dumps(contract, ensure_ascii=False, sort_keys=True)
        if len(rendered) > MAX_PROMPT_CHARS:
            raise ValueError("ENGINEERING_INVESTIGATION_WORKING_CONTEXT_EXCEEDED")
        return rendered

    @classmethod
    def _prompt(
        cls,
        packet: InvestigationPacket,
        ledger: EvidenceLedger,
        working_results: list[dict[str, Any]],
        step: int,
    ) -> str:
        _ = (working_results, step)
        return cls._render_prompt(
            {
                "task": (
                    "Investigate the EngineeringRule directly in the repository working database. "
                    "Use native Deep Agents ls/glob/grep/read_file/execute/task tools. "
                    "Use codebase_memory_graph MCP only as optional graph memory/relationship help; "
                    "verify material facts in repository source before deciding."
                ),
                "engineeringRule": cls._rule_contract(packet),
                "seedContext": {
                    "priorDeterministicObservationCount": ledger.total,
                    "unresolvedFrontierCount": len(packet.unresolved_frontiers),
                    "confirmedCustomerContextStored": bool(packet.confirmed_customer_context),
                },
                "claimRules": [
                    "Return exactly one primary claim for each requiredEvidence criterion.",
                    "For RULE_REQUIREMENT_MET or RULE_REQUIREMENT_NOT_MET, cite one or more exact sourceLocations from customer repository source.",
                    "Each sourceLocations entry must contain repository-relative path, startLine, and endLine from source you actually inspected.",
                    "Do not cite .git or .lcsp as customer evidence.",
                    "Do not invent node_id, edge_id, source_anchor_id, evidenceRef, graphPathRef, or observationRef values.",
                    "LCSP resolves source citations to legacy graph provenance internally only when downstream deterministic topology validation still requires it.",
                    "If source and codebase_memory_graph disagree, trust direct repository source and report the graph-memory inconsistency as a limitation when material.",
                    "For negative/absence claims, inspect all material candidate paths and coverage; otherwise return UNRESOLVED_ENGINEERING_FACT.",
                    "Treat dynamic dispatch, external runtime behavior, generated code gaps, or incomplete indexing as limitations rather than evidence of absence.",
                    "Never decide legal applicability, risk tier, certification, or final compliance.",
                ],
            }
        )


    @classmethod
    def _finish_prompt(
        cls,
        packet: InvestigationPacket,
        ledger: EvidenceLedger,
        working_results: list[dict[str, Any]],
    ) -> str:
        _ = (ledger, working_results)
        return cls._render_prompt(
            {
                "task": (
                    "Finish the EngineeringRule investigation now using direct repository source "
                    "citations gathered with native Deep Agents tools."
                ),
                "engineeringRule": cls._rule_contract(packet),
                "claimRules": [
                    "Emit exactly one primary claim per requiredEvidence criterion.",
                    "Decided claims require exact sourceLocations.",
                    "If the criterion is not proven from inspected source, emit UNRESOLVED_ENGINEERING_FACT with a valid limitation code.",
                    "Do not invent Program Evidence Graph identifiers.",
                ],
            }
        )


    @staticmethod
    def _log_finish(
        *,
        packet: InvestigationPacket,
        claims: list[EvidenceClaim],
        workflow_run_id: str,
        correlation_id: str | None,
        forced: bool,
        ledger: EvidenceLedger,
    ) -> None:
        logger.info(
            "ENGINEERING_INVESTIGATION_FINISHED",
            engineering_rule_id=packet.engineering_rule_id,
            claim_count=len(claims),
            claim_types=[claim.claim_type for claim in claims],
            claims=[
                {
                    "claim_id": claim.claim_id,
                    "criterion": claim.criterion,
                    "claim_type": claim.claim_type,
                    "value": claim.value,
                    "evidence_refs": list(claim.evidence_refs),
                    "graph_path_refs": list(claim.graph_path_refs),
                    "source_anchor_refs": list(claim.source_anchor_refs),
                    "source_locations": list(claim.source_locations),
                    "confidence": claim.confidence,
                    "limitations": list(claim.limitations),
                }
                for claim in claims
            ],
            ledger_observation_count=ledger.total,
            forced_finish=forced,
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
        )
