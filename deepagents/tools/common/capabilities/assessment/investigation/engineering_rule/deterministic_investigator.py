"""Deterministic seed-window EngineeringRule investigation.

The primary Investigator never owns repository discovery. It reads the source
locations selected by the Rule Investigation Plan, adds only Scanner-pack seeds
from the same source area, performs at most two graph traces, and gives one bounded
window to one structured model call. Weak windows stop as Scanner enrichment work;
they never trigger an implicit repository-wide search.
"""

from __future__ import annotations

import hashlib
import json
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from typing import Any

from langchain.agents import create_agent

from middleware.billing_metering import BillingAgentRoleMiddleware, BillingMeteringError
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from model_policy import INVESTIGATOR_MODEL_SPEC, resolve_agent_model
from orchestration.agent_stream import AGENT_STREAM_STAGES, invoke_with_stream
from tools.common.capabilities.assessment.claims.evidence_claim.evidence_ledger import (
    EvidenceLedger,
)
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    ENGINEERING_LIMITATION_CODES,
    EvidenceClaim,
    InvestigationPacket,
)
from tools.common.capabilities.platform.codebase_memory import codebase_memory_cli
from tools.common.capabilities.platform.logging import get_logger
from tools.common.capabilities.platform.repository_sandbox import (
    current_repository_backend,
)
from tools.common.capabilities.platform.tracing import traceable

from .investigator import LawGuidedInvestigator


logger = get_logger(__name__)

DETERMINISTIC_INVESTIGATION_VERSION = "engineering-rule-seed-window.v1"
MAX_SOURCE_SNIPPET_LINES = 160
MAX_SOURCE_WINDOW_CHARS = 80_000
MAX_GRAPH_TRACE_CHARS = 6_000

AGENTIC_FALLBACK_REASONS: dict[str, str] = {
    "scannerEnrichmentUnavailable": "SCANNER_ENRICHMENT_UNAVAILABLE",
    "explicitOperatorOverride": "EXPLICIT_OPERATOR_OVERRIDE",
}


@dataclass(frozen=True)
class SourceSnippet:
    path: str
    start_line: int
    end_line: int
    content: str
    origin: str
    symbol: str | None = None

    def to_prompt_dict(self) -> dict[str, Any]:
        return {
            "path": self.path,
            "startLine": self.start_line,
            "endLine": self.end_line,
            "origin": self.origin,
            **({"symbol": self.symbol} if self.symbol else {}),
            "source": self.content,
        }


@dataclass(frozen=True)
class EvidenceWindow:
    snippets: tuple[SourceSnippet, ...]
    graph_traces: tuple[dict[str, str], ...]
    requested_paths: tuple[str, ...]
    unreadable_paths: tuple[str, ...]
    coverage_state: str
    all_material_candidate_paths_covered: bool

    def to_prompt_dict(self) -> dict[str, Any]:
        return {
            "sourceSnippets": [item.to_prompt_dict() for item in self.snippets],
            "graphTraces": list(self.graph_traces),
            "requestedPaths": list(self.requested_paths),
            "unreadablePaths": list(self.unreadable_paths),
            "coverageState": self.coverage_state,
            "allMaterialCandidatePathsCovered": (
                self.all_material_candidate_paths_covered
            ),
        }


class NeedsScannerEnrichment(RuntimeError):
    """The bounded plan cannot support a safe technical decision."""

    def __init__(
        self,
        *,
        engineering_rule_id: str,
        reason: str,
        claims: Sequence[EvidenceClaim],
    ) -> None:
        super().__init__(f"{engineering_rule_id}: {reason}")
        self.engineering_rule_id = engineering_rule_id
        self.reason = reason
        self.claims = list(claims)


class DeterministicSeedWindowInvestigator(LawGuidedInvestigator):
    """Judge one bounded source window without exposing repository tools."""

    def __init__(
        self,
        model: str = INVESTIGATOR_MODEL_SPEC,
        *,
        agent_factory: Callable[..., Any] = create_agent,
        invoker: Callable[..., dict[str, Any]] = invoke_with_stream,
        backend_resolver: Callable[[], Any | None] = current_repository_backend,
        model_resolver: Callable[..., Any] = resolve_agent_model,
    ) -> None:
        super().__init__(model)
        self._agent_factory = agent_factory
        self._invoker = invoker
        self._backend_resolver = backend_resolver
        self._model_resolver = model_resolver
        self._plan: dict[str, Any] = {}
        self._pack: dict[str, Any] = {}
        self._window_cache: dict[str, EvidenceWindow] = {}
        self._agentic_fallback: Any | None = None
        self._fallback_observer: Callable[[dict[str, str]], None] | None = None

    def configure_plan(
        self,
        *,
        investigation_plan: Mapping[str, Any],
        intelligence_pack: Mapping[str, Any] | None,
        agentic_fallback: Any | None = None,
        fallback_observer: Callable[[dict[str, str]], None] | None = None,
    ) -> None:
        """Pin the durable plan and reset only per-dispatch source-window memory."""
        self._plan = dict(investigation_plan)
        self._pack = dict(intelligence_pack or {})
        self._window_cache = {}
        self._agentic_fallback = agentic_fallback
        self._fallback_observer = fallback_observer

    @traceable(run_type="chain", name="DeterministicSeedWindowInvestigator.investigate")
    def investigate(
        self,
        *,
        packet: InvestigationPacket,
        graph: Any,
        workflow_run_id: str,
        correlation_id: str | None = None,
    ) -> list[EvidenceClaim]:
        route = self._plan_item(packet.engineering_rule_id)
        if not route or not route.get("startingLocations"):
            return self._fallback_or_raise(
                packet=packet,
                graph=graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
                route=route,
                reason="MISSING_STARTING_LOCATIONS",
            )

        window = self._evidence_window(route)
        if not window.snippets:
            return self._fallback_or_raise(
                packet=packet,
                graph=graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
                route=route,
                reason="BOUNDED_SOURCE_WINDOW_UNAVAILABLE",
            )

        ledger = EvidenceLedger()
        for item in packet.initial_results:
            ledger.add(source="engineering_rule_seed_query", result=item)
        if packet.confirmed_customer_context:
            ledger.add(
                source="confirmed_customer_context",
                result=dict(packet.confirmed_customer_context),
            )

        agent = self._agent_factory(
            self._model_resolver(
                agent_name="lcsp-deterministic-seed-window-investigator",
                model_spec=self._model,
            ),
            tools=[],
            name="lcsp-deterministic-seed-window-investigator",
            system_prompt=(
                "Judge exactly one fixed EngineeringRule from the bounded source window "
                "provided by the runtime. You have no repository or search tools. Direct "
                "source in the window is authoritative; graph traces are navigation memory "
                "only. Never infer absence outside the window."
            ),
            response_format=self._claims_response_schema(),
            middleware=[
                BillingAgentRoleMiddleware("investigator"),
                *MODEL_GOVERNANCE_MIDDLEWARE,
            ],
        )
        try:
            response = self._invoker(
                agent,
                {
                    "messages": [
                        {
                            "role": "user",
                            "content": self._window_prompt(packet, route, window),
                        }
                    ]
                },
                config={
                    "metadata": {
                        "workflow_run_id": workflow_run_id,
                        "correlation_id": correlation_id,
                        "engineering_rule_id": packet.engineering_rule_id,
                        "investigation_version": DETERMINISTIC_INVESTIGATION_VERSION,
                    },
                    "configurable": {"thread_id": workflow_run_id},
                },
                stage=AGENT_STREAM_STAGES["investigate"],
            )
        except BillingMeteringError:
            raise

        payload = response.get("structured_response") or {}
        if hasattr(payload, "model_dump"):
            payload = payload.model_dump()
        payload = self._confine_payload(payload, window)
        rows = payload.get("claims") if isinstance(payload, dict) else None
        if not isinstance(rows, list) or not rows or all(
            str(item.get("claimType") or "").upper()
            == ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
            for item in rows
            if isinstance(item, dict)
        ):
            return self._fallback_or_raise(
                packet=packet,
                graph=graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
                route=route,
                reason="BOUNDED_EVIDENCE_INSUFFICIENT",
            )

        claims = self._claims_from_payload(payload, packet, graph, ledger)
        self._log_finish(
            packet=packet,
            claims=claims,
            workflow_run_id=workflow_run_id,
            correlation_id=correlation_id,
            forced=False,
            ledger=ledger,
        )
        return claims

    def _plan_item(self, rule_id: str) -> dict[str, Any] | None:
        for item in self._plan.get("items") or ():
            if isinstance(item, Mapping) and item.get("ruleId") == rule_id:
                return dict(item)
        return None

    def _evidence_window(self, route: Mapping[str, Any]) -> EvidenceWindow:
        cache_key = str(route.get("batchGroup") or route.get("ruleId") or "")
        cached = self._window_cache.get(cache_key)
        if cached is not None:
            return cached

        budget = route.get("budget") or {}
        max_files = max(1, min(5, int(budget.get("maxFilesRead") or 5)))
        max_traces = max(0, min(2, int(budget.get("maxGraphQueries") or 2)))
        locations = self._batch_locations(route)
        unique_paths = _unique_locations(locations)
        requested = unique_paths[:max_files]
        backend = self._backend_resolver()

        snippets: list[SourceSnippet] = []
        unreadable: list[str] = []
        if backend is None or not callable(getattr(backend, "download_files", None)):
            unreadable = [str(item["path"]) for item in requested]
        else:
            # Source is read before graph memory. The plan's locations are first in
            # ``locations``; Scanner-pack additions follow them.
            for location in requested:
                snippet = self._read_snippet(backend, location)
                if snippet is None:
                    unreadable.append(str(location["path"]))
                else:
                    snippets.append(snippet)

        traces: list[dict[str, str]] = []
        execute = getattr(backend, "execute", None) if backend is not None else None
        if callable(execute):
            for hint in self._batch_graph_hints(route)[:max_traces]:
                result = execute(
                    codebase_memory_cli(
                        "trace_path",
                        {
                            "project": "workspace-repository",
                            "function_name": hint,
                            "direction": "both",
                            "depth": 2,
                        },
                    )
                )
                if getattr(result, "exit_code", 1) == 0:
                    output = str(getattr(result, "output", "") or "").strip()
                    if output:
                        traces.append(
                            {"qualifiedName": hint, "trace": output[:MAX_GRAPH_TRACE_CHARS]}
                        )

        coverage = self._pack.get("coverageState") or {}
        coverage_state = str(coverage.get("global") or "FAILED").upper()
        coverage_gaps = any(
            coverage.get(key)
            for key in (
                "sourceCoverageGaps",
                "graphCoverageGaps",
                "unresolvedFrontiers",
            )
        )
        candidate_paths = tuple(str(item["path"]) for item in unique_paths)
        all_covered = (
            coverage_state == "READY"
            and not coverage_gaps
            and len(candidate_paths) <= max_files
            and not unreadable
            and {item.path for item in snippets} == set(candidate_paths)
        )
        window = EvidenceWindow(
            snippets=tuple(snippets),
            graph_traces=tuple(traces),
            requested_paths=tuple(str(item["path"]) for item in requested),
            unreadable_paths=tuple(unreadable),
            coverage_state=coverage_state,
            all_material_candidate_paths_covered=all_covered,
        )
        self._window_cache[cache_key] = window
        return window

    def _batch_locations(self, route: Mapping[str, Any]) -> list[dict[str, Any]]:
        group = str(route.get("batchGroup") or "")
        items = [
            item
            for item in self._plan.get("items") or ()
            if isinstance(item, Mapping)
            and (
                (group and str(item.get("batchGroup") or "") == group)
                or (not group and item.get("ruleId") == route.get("ruleId"))
            )
        ]
        locations = [
            dict(location)
            for item in items or (route,)
            for location in item.get("startingLocations") or ()
            if isinstance(location, Mapping) and location.get("path")
        ]
        for location in self._pack.get("seedLocations") or ():
            if not isinstance(location, Mapping) or not location.get("path"):
                continue
            path = _source_path(location.get("path"))
            if group and not (path == group or path.startswith(group + "/")):
                continue
            locations.append({**dict(location), "origin": "SCANNER_PACK"})
        return locations

    def _batch_graph_hints(self, route: Mapping[str, Any]) -> list[str]:
        group = str(route.get("batchGroup") or "")
        hints: list[str] = []
        for item in self._plan.get("items") or ():
            if not isinstance(item, Mapping):
                continue
            if group and str(item.get("batchGroup") or "") != group:
                continue
            if not group and item.get("ruleId") != route.get("ruleId"):
                continue
            for hint in item.get("graphHints") or ():
                value = str(hint or "").strip()
                if value and value not in hints:
                    hints.append(value)
        return hints

    @staticmethod
    def _read_snippet(backend: Any, location: Mapping[str, Any]) -> SourceSnippet | None:
        path = _source_path(location.get("path"))
        if not path:
            return None
        responses = backend.download_files([f"/{path}"])
        if (
            not responses
            or getattr(responses[0], "error", None)
            or getattr(responses[0], "content", None) is None
        ):
            return None
        try:
            lines = responses[0].content.decode("utf-8").splitlines()
        except UnicodeDecodeError:
            return None
        if not lines:
            return None
        planned_start = _positive_int(location.get("startLine"), 1)
        planned_end = _positive_int(location.get("endLine"), planned_start)
        start = max(1, planned_start - 12)
        end = min(len(lines), max(planned_end, planned_start) + 24)
        end = min(end, start + MAX_SOURCE_SNIPPET_LINES - 1)
        if start > len(lines):
            return None
        content = "\n".join(
            f"{line_number}: {lines[line_number - 1]}"
            for line_number in range(start, end + 1)
        )
        if not content.strip():
            return None
        return SourceSnippet(
            path=path,
            start_line=start,
            end_line=end,
            content=content,
            origin=str(location.get("origin") or "RULE_PLAN"),
            symbol=str(location.get("symbol") or "").strip() or None,
        )

    def _window_prompt(
        self,
        packet: InvestigationPacket,
        route: Mapping[str, Any],
        window: EvidenceWindow,
    ) -> str:
        payload = {
            "task": (
                "Judge the fixed EngineeringRule from this bounded evidence window. "
                "Do not request or assume source outside the window."
            ),
            "engineeringRule": self._rule_contract(packet),
            "ruleInvestigationPlan": {
                "ruleId": route.get("ruleId"),
                "requiredEvidence": list(route.get("requiredEvidence") or ()),
                "budget": dict(route.get("budget") or {}),
                "fallbackPolicy": route.get("fallbackPolicy"),
                "batchGroup": route.get("batchGroup"),
            },
            "evidenceWindow": window.to_prompt_dict(),
            "claimRules": [
                "Emit exactly one claim for each requiredEvidence criterion.",
                "Cite only sourceLocations that fall inside sourceSnippets you inspected.",
                "Graph traces are navigation memory and cannot override direct source.",
                "If the window cannot prove a criterion, use UNRESOLVED_ENGINEERING_FACT.",
                "RULE_REQUIREMENT_NOT_MET is allowed only when coverageState is READY and allMaterialCandidatePathsCovered is true.",
                "Never decide legal applicability, risk tier, certification, or final compliance.",
            ],
        }
        rendered = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
        if len(rendered) > MAX_SOURCE_WINDOW_CHARS:
            raise NeedsScannerEnrichment(
                engineering_rule_id=packet.engineering_rule_id,
                reason="BOUNDED_SOURCE_WINDOW_TOO_LARGE",
                claims=self._enrichment_claims(packet),
            )
        return rendered

    @staticmethod
    def _confine_payload(payload: Any, window: EvidenceWindow) -> dict[str, Any]:
        if not isinstance(payload, dict):
            return {"claims": []}
        allowed = {item.path: item for item in window.snippets}
        confined: list[dict[str, Any]] = []
        for raw in payload.get("claims") or ():
            if not isinstance(raw, dict):
                continue
            item = dict(raw)
            valid_locations: list[dict[str, Any]] = []
            invalid_location = False
            for location in item.get("sourceLocations") or ():
                if not isinstance(location, Mapping):
                    invalid_location = True
                    continue
                path = _source_path(location.get("path"))
                snippet = allowed.get(path)
                start = _positive_int(location.get("startLine"), 0)
                end = _positive_int(location.get("endLine"), 0)
                if (
                    snippet is None
                    or start < snippet.start_line
                    or end < start
                    or end > snippet.end_line
                ):
                    invalid_location = True
                    continue
                valid_locations.append(dict(location))
            negative_without_coverage = (
                str(item.get("claimType") or "").upper()
                == ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"]
                and not window.all_material_candidate_paths_covered
            )
            closed_without_source = (
                str(item.get("claimType") or "").upper()
                in {
                    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"],
                    ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"],
                }
                and not valid_locations
            )
            if invalid_location or negative_without_coverage or closed_without_source:
                item["claimType"] = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
                item["sourceLocations"] = []
                item["confidence"] = 0
                limitations = list(item.get("limitations") or ())
                limitation = ENGINEERING_LIMITATION_CODES[
                    "search_coverage_incomplete"
                    if negative_without_coverage
                    else "engineering_evidence_insufficient"
                ]
                if limitation not in limitations:
                    limitations.append(limitation)
                item["limitations"] = limitations
            else:
                item["sourceLocations"] = valid_locations
            confined.append(item)
        return {"claims": confined}

    def _fallback_or_raise(
        self,
        *,
        packet: InvestigationPacket,
        graph: Any,
        workflow_run_id: str,
        correlation_id: str | None,
        route: Mapping[str, Any] | None,
        reason: str,
    ) -> list[EvidenceClaim]:
        fallback_reason = str((route or {}).get("fallbackReason") or "").strip()
        if (
            fallback_reason in AGENTIC_FALLBACK_REASONS.values()
            and self._agentic_fallback is not None
        ):
            event = {
                "engineeringRuleId": packet.engineering_rule_id,
                "fallbackReason": fallback_reason,
                "triggerReason": reason,
            }
            if self._fallback_observer is not None:
                self._fallback_observer(event)
            logger.warning("ENGINEERING_INVESTIGATION_AGENTIC_FALLBACK", **event)
            return self._agentic_fallback.investigate(
                packet=packet,
                graph=graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
            )
        claims = self._enrichment_claims(packet)
        raise NeedsScannerEnrichment(
            engineering_rule_id=packet.engineering_rule_id,
            reason=reason,
            claims=claims,
        )

    @staticmethod
    def _enrichment_claims(packet: InvestigationPacket) -> list[EvidenceClaim]:
        criteria = tuple(dict.fromkeys(packet.required_evidence)) or (None,)
        limitations = (
            ENGINEERING_LIMITATION_CODES["needs_scanner_enrichment"],
            ENGINEERING_LIMITATION_CODES["engineering_evidence_insufficient"],
        )
        result: list[EvidenceClaim] = []
        for index, criterion in enumerate(criteria, 1):
            material = f"{packet.engineering_rule_id}:{index}:{criterion}:{limitations}"
            result.append(
                EvidenceClaim(
                    claim_id="claim:enrichment:"
                    + hashlib.sha256(material.encode()).hexdigest()[:20],
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


def _source_path(value: Any) -> str:
    path = str(value or "").replace("\\", "/").lstrip("/")
    parts = [part for part in path.split("/") if part not in {"", "."}]
    if not parts or any(part == ".." for part in parts) or parts[0] in {".git", ".lcsp"}:
        return ""
    return "/".join(parts)


def _positive_int(value: Any, default: int) -> int:
    try:
        result = int(value)
    except (TypeError, ValueError):
        return default
    return result if result > 0 else default


def _unique_locations(locations: Sequence[Mapping[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    result: list[dict[str, Any]] = []
    for location in locations:
        path = _source_path(location.get("path"))
        if not path or path in seen:
            continue
        seen.add(path)
        result.append({**dict(location), "path": path})
    return result


__all__ = [
    "AGENTIC_FALLBACK_REASONS",
    "DETERMINISTIC_INVESTIGATION_VERSION",
    "DeterministicSeedWindowInvestigator",
    "EvidenceWindow",
    "NeedsScannerEnrichment",
    "SourceSnippet",
]
