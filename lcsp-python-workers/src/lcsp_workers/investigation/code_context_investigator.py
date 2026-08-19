"""Agentic RAG investigator with progressive, symbol-based repository code access."""
from __future__ import annotations

import json
from typing import Any

from lcsp_workers.llm import LLMToolDefinition
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.scanner.program_graph.query_engine import ProgramGraphQueryEngine

from .code_context import CodeContextSession
from .evidence_ledger import EvidenceLedger
from .investigator import (
    FINISH_TOOL_NAME,
    GRAPH_TOOL_NAMES,
    MAX_GRAPH_TOOL_STEPS,
    MAX_INVESTIGATION_STEPS,
    MAX_WORKING_RESULTS,
    STATE_TOOL_NAMES,
    LawGuidedInvestigator,
)
from .models import EvidenceClaim, InvestigationPacket


logger = get_logger(__name__)
CODE_CONTEXT_TOOL_NAMES = (
    "repo_map",
    "search_code",
    "get_symbol",
    "get_file_outline",
    "get_code",
    "find_references",
    "workspace_update",
    "workspace_get",
)
MAX_CODE_CONTEXT_TOOL_STEPS = 12


class CodeContextLawGuidedInvestigator(LawGuidedInvestigator):
    """Investigate with graph tools plus AST/CST symbol-level progressive disclosure.

    Program Evidence Graph remains the canonical evidence source. Code-context tools
    only expose an ephemeral, commit-pinned working view over source materialized from
    the RepositorySnapshot. Full source is never persisted into the assessment artifact.
    """

    def investigate(
        self,
        *,
        packet: InvestigationPacket,
        graph,
        workflow_run_id: str,
        correlation_id: str | None = None,
        code_context: CodeContextSession | None = None,
    ) -> list[EvidenceClaim]:
        if code_context is None or not code_context.available:
            return super().investigate(
                packet=packet,
                graph=graph,
                workflow_run_id=workflow_run_id,
                correlation_id=correlation_id,
            )

        engine = ProgramGraphQueryEngine(graph)
        ledger = EvidenceLedger()
        for item in packet.initial_results:
            ledger.add(source="engineering_rule_seed_query", result=item)
        if packet.wizard_context:
            ledger.add(source="wizard_context", result=dict(packet.wizard_context))

        tools = self._code_aware_tool_definitions()
        graph_tool_calls_used = 0
        code_tool_calls_used = 0
        working_results: list[dict[str, Any]] = []

        for step in range(MAX_INVESTIGATION_STEPS):
            response = self.llm.complete_with_tools(
                prompt=self._code_prompt(packet, ledger, working_results, step),
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
                continue

            for call in response.tool_calls:
                logger.info(
                    "ENGINEERING_INVESTIGATION_TOOL_CALL",
                    engineering_rule_id=packet.engineering_rule_id,
                    step=step + 1,
                    tool=call.name,
                    call_id=call.call_id,
                    arguments=self._bounded_debug(call.arguments),
                    graph_tool_calls_used=graph_tool_calls_used,
                    code_tool_calls_used=code_tool_calls_used,
                    ledger_observation_count=ledger.total,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )

                if call.name == FINISH_TOOL_NAME:
                    claims = self._claims_from_finish_arguments(
                        call.arguments,
                        packet,
                        graph,
                        ledger,
                    )
                    self._log_finish(
                        packet=packet,
                        claims=claims,
                        workflow_run_id=workflow_run_id,
                        correlation_id=correlation_id,
                        forced=False,
                        ledger=ledger,
                    )
                    return claims

                if call.name in GRAPH_TOOL_NAMES:
                    if graph_tool_calls_used >= MAX_GRAPH_TOOL_STEPS:
                        tool_result = {
                            "error": "GRAPH_TOOL_BUDGET_EXHAUSTED",
                            "truncated": True,
                        }
                    else:
                        graph_tool_calls_used += 1
                        raw_result = self._execute_graph_tool(
                            engine,
                            call.name,
                            call.arguments,
                        )
                        tool_result = self._store_observation(
                            ledger,
                            source="graph_tool",
                            tool=call.name,
                            call_id=call.call_id,
                            arguments=call.arguments,
                            result=raw_result,
                        )
                elif call.name in CODE_CONTEXT_TOOL_NAMES:
                    if code_tool_calls_used >= MAX_CODE_CONTEXT_TOOL_STEPS:
                        tool_result = {
                            "error": "CODE_CONTEXT_TOOL_BUDGET_EXHAUSTED",
                            "truncated": True,
                        }
                    else:
                        code_tool_calls_used += 1
                        raw_result = self._execute_code_tool(
                            code_context,
                            call.name,
                            call.arguments,
                        )
                        tool_result = self._store_observation(
                            ledger,
                            source="code_context_tool",
                            tool=call.name,
                            call_id=call.call_id,
                            arguments=call.arguments,
                            result=raw_result,
                            expose_result=call.name in {"get_code", "get_symbol"},
                        )
                elif call.name == "list_observations":
                    tool_result = ledger.index(
                        offset=int(call.arguments.get("offset") or 0),
                        limit=int(call.arguments.get("limit") or 20),
                    )
                elif call.name == "inspect_observation":
                    try:
                        tool_result = ledger.inspect(
                            str(call.arguments.get("observation_id") or ""),
                            section=(
                                str(call.arguments.get("section"))
                                if call.arguments.get("section")
                                else None
                            ),
                            offset=int(call.arguments.get("offset") or 0),
                            limit=int(call.arguments.get("limit") or 12),
                        )
                    except KeyError as error:
                        tool_result = {
                            "error": "UNKNOWN_OBSERVATION_REF",
                            "detail": str(error),
                        }
                else:
                    tool_result = {
                        "error": "UNKNOWN_INVESTIGATION_TOOL",
                        "allowedTools": sorted(
                            {
                                *GRAPH_TOOL_NAMES,
                                *CODE_CONTEXT_TOOL_NAMES,
                                *STATE_TOOL_NAMES,
                                FINISH_TOOL_NAME,
                            }
                        ),
                    }

                working_result = self._fit_working_result(tool_result)
                logger.info(
                    "ENGINEERING_INVESTIGATION_TOOL_RESULT",
                    engineering_rule_id=packet.engineering_rule_id,
                    step=step + 1,
                    tool=call.name,
                    call_id=call.call_id,
                    result=working_result,
                    graph_tool_calls_used=graph_tool_calls_used,
                    code_tool_calls_used=code_tool_calls_used,
                    ledger_observation_count=ledger.total,
                    workflow_run_id=workflow_run_id,
                    correlationId=correlation_id,
                )
                working_results.append(
                    {
                        "step": step + 1,
                        "tool": call.name,
                        "callId": call.call_id,
                        "result": working_result,
                    }
                )
                working_results = working_results[-MAX_WORKING_RESULTS:]

        response = self.llm.complete_with_tools(
            prompt=self._code_finish_prompt(packet, ledger, working_results),
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
                    ledger,
                )
                self._log_finish(
                    packet=packet,
                    claims=claims,
                    workflow_run_id=workflow_run_id,
                    correlation_id=correlation_id,
                    forced=True,
                    ledger=ledger,
                )
                return claims
        logger.warning(
            "ENGINEERING_INVESTIGATION_FINISH_MISSING",
            engineering_rule_id=packet.engineering_rule_id,
            ledger_observation_count=ledger.total,
            workflow_run_id=workflow_run_id,
            correlationId=correlation_id,
        )
        return self._claims_from_payload({}, packet, graph, ledger)

    @classmethod
    def _code_aware_tool_definitions(cls) -> list[LLMToolDefinition]:
        # Graph resource guards are intentionally internal. The model sees only the
        # canonical truncated signal and continuation frontiers in tool results.
        graph_tools: list[LLMToolDefinition] = []
        for tool in super()._tool_definitions():
            if tool.name not in GRAPH_TOOL_NAMES:
                continue
            properties = dict(tool.input_schema.get("properties") or {})
            for internal in ("max_hops", "max_results", "max_neighbors"):
                properties.pop(internal, None)
            required = tuple(
                value
                for value in tool.input_schema.get("required") or []
                if value in properties
            )
            graph_tools.append(
                LLMToolDefinition(
                    name=tool.name,
                    description=tool.description,
                    input_schema=cls._closed_schema(properties, required=required),
                )
            )

        string_array = {"type": "array", "items": {"type": "string"}}
        code_tools = [
            LLMToolDefinition(
                name="repo_map",
                description=(
                    "Read a hierarchical repository/file/symbol map without implementation source. "
                    "Use only when the EngineeringRule retrieval hints do not already give a targeted "
                    "search term or path clue; use cursor when truncated=true."
                ),
                input_schema=cls._closed_schema({"cursor": {"type": "string"}}),
            ),
            LLMToolDefinition(
                name="search_code",
                description=(
                    "Hybrid search over AST/CST symbol chunks using the EngineeringRule keywords, APIs, "
                    "libraries and patterns. Results are candidates: inspect the most relevant production "
                    "symbol with get_code before using implementation behavior as evidence."
                ),
                input_schema=cls._closed_schema(
                    {
                        "query": {"type": "string"},
                        "scope": string_array,
                        "cursor": {"type": "string"},
                    }
                ),
            ),
            LLMToolDefinition(
                name="get_symbol",
                description="Get commit-pinned symbol metadata and direct caller/callee IDs.",
                input_schema=cls._closed_schema(
                    {"symbol_id": {"type": "string"}}, required=("symbol_id",)
                ),
            ),
            LLMToolDefinition(
                name="get_file_outline",
                description="Get all AST/CST symbols and line ranges for one repository file.",
                input_schema=cls._closed_schema(
                    {"file_path": {"type": "string"}}, required=("file_path",)
                ),
            ),
            LLMToolDefinition(
                name="get_code",
                description=(
                    "Read one bounded source page inside a semantic symbol chunk. Use this after search_code "
                    "or get_symbol when implementation behavior is relevant. The chunk boundary is a "
                    "function/method/class/etc.; use nextCursor until the needed behavior is visible."
                ),
                input_schema=cls._closed_schema(
                    {
                        "symbol_id": {"type": "string"},
                        "chunk_id": {"type": "string"},
                        "cursor": {"type": "string"},
                    }
                ),
            ),
            LLMToolDefinition(
                name="find_references",
                description="Follow direct callers/callees/references from a commit-pinned symbol ID.",
                input_schema=cls._closed_schema(
                    {
                        "symbol_id": {"type": "string"},
                        "direction": {
                            "type": "string",
                            "enum": ["CALLERS", "CALLEES", "ALL"],
                        },
                    },
                    required=("symbol_id",),
                ),
            ),
            LLMToolDefinition(
                name="workspace_update",
                description=(
                    "Update orchestrator-owned working memory with important symbols or concise hypotheses. "
                    "This avoids resending repository context through the prompt."
                ),
                input_schema=cls._closed_schema(
                    {
                        "add_symbols": string_array,
                        "remove_symbols": string_array,
                        "notes": string_array,
                    }
                ),
            ),
            LLMToolDefinition(
                name="workspace_get",
                description="Read the current commit-pinned server-side code investigation workspace.",
                input_schema=cls._closed_schema({}),
            ),
        ]
        state_tools = [
            tool
            for tool in super()._tool_definitions()
            if tool.name in STATE_TOOL_NAMES
        ]
        return [*graph_tools, *code_tools, *state_tools, cls._finish_tool_definition()]

    def _execute_code_tool(
        self,
        code_context: CodeContextSession,
        tool_name: str,
        arguments: dict[str, Any],
    ) -> dict[str, Any]:
        try:
            if tool_name == "repo_map":
                return code_context.repo_map(cursor=arguments.get("cursor"))
            if tool_name == "search_code":
                return code_context.search_code(
                    query=arguments.get("query"),
                    scope=arguments.get("scope") or (),
                    cursor=arguments.get("cursor"),
                )
            if tool_name == "get_symbol":
                return code_context.get_symbol(str(arguments.get("symbol_id") or ""))
            if tool_name == "get_file_outline":
                return code_context.get_file_outline(str(arguments.get("file_path") or ""))
            if tool_name == "get_code":
                return code_context.get_code(
                    symbol_id=(str(arguments.get("symbol_id")) if arguments.get("symbol_id") else None),
                    chunk_id=(str(arguments.get("chunk_id")) if arguments.get("chunk_id") else None),
                    cursor=(str(arguments.get("cursor")) if arguments.get("cursor") else None),
                )
            if tool_name == "find_references":
                return code_context.find_references(
                    symbol_id=str(arguments.get("symbol_id") or ""),
                    direction=str(arguments.get("direction") or "ALL"),
                )
            if tool_name == "workspace_update":
                return code_context.workspace_update(
                    add_symbols=arguments.get("add_symbols") or (),
                    remove_symbols=arguments.get("remove_symbols") or (),
                    notes=arguments.get("notes") or (),
                )
            if tool_name == "workspace_get":
                return code_context.workspace_get()
        except (TypeError, ValueError) as error:
            return {
                "error": "INVALID_CODE_CONTEXT_TOOL_ARGUMENTS",
                "tool": tool_name,
                "errorType": type(error).__name__,
            }
        return {"error": "UNKNOWN_CODE_CONTEXT_TOOL", "tool": tool_name}

    @classmethod
    def _code_prompt(
        cls,
        packet: InvestigationPacket,
        ledger: EvidenceLedger,
        working_results: list[dict[str, Any]],
        step: int,
    ) -> str:
        payload = json.loads(super()._prompt(packet, ledger, working_results, step))
        payload["lcspCodeContextProtocol"] = "AST_SYMBOL_CHUNKS_V1"
        payload["codeInvestigationFlow"] = [
            "SEARCH: first use EngineeringRule retrievalHints with search_code; use repo_map only when no targeted clue exists",
            "IDENTIFY: search_code preview already exposes candidate symbolId/chunkId; use get_symbol only when caller/callee metadata is needed",
            "EXPAND: call get_code on the most relevant production candidate when implementation behavior matters",
            "FOLLOW_REFERENCES: use find_references and graph tools for callers/callees/data/decision paths",
            "REMEMBER: pin important symbols/hypotheses with workspace_update when useful",
            "FINISH: reference EvidenceLedger observations only; LCSP derives provenance",
        ]
        payload["codeContextRules"] = [
            "requiredEvidence/supportingEvidence/negativeEvidence are criterion labels, not graph node types or default code-search queries.",
            "Prefer the EngineeringRule retrievalHints keywords/commonApis/commonLibraries/patterns and canonical start/target node types.",
            "search_code results are candidate metadata, not proof of implementation behavior; when source is available and behavior matters, inspect a relevant symbol with get_code before finishing MET/NOT_MET.",
            "Prefer runtime/production source. Tests, specs, mocks, fixtures and examples may corroborate behavior but must not by themselves prove production behavior unless the EngineeringRule explicitly targets them.",
            "Every EvidenceLedger summary contains availableSections. Use those exact names and do not guess sections from another observation type.",
            "Never request an entire repository or file when a symbol/chunk is sufficient.",
            "Source pages are bounded inside AST/CST symbol boundaries; follow nextCursor when truncated=true and more source is still necessary.",
            "search_code cursors are stable for this commit and search session.",
            "Do not infer search semantics from max_hops/max_results/node/edge/neighbor limits; those guards are internal.",
        ]
        return cls._render_prompt(payload)

    @classmethod
    def _code_finish_prompt(
        cls,
        packet: InvestigationPacket,
        ledger: EvidenceLedger,
        working_results: list[dict[str, Any]],
    ) -> str:
        payload = json.loads(super()._finish_prompt(packet, ledger, working_results))
        payload["lcspCodeContextProtocol"] = "AST_SYMBOL_CHUNKS_V1"
        payload["codeContextRule"] = (
            "Do not mark a criterion unresolved merely because a bounded code/search page is truncated "
            "when concrete observation evidence already proves the criterion. Search-result metadata alone "
            "does not prove implementation behavior when source was available but never inspected."
        )
        return cls._render_prompt(payload)

    @classmethod
    def _store_observation(
        cls,
        ledger: EvidenceLedger,
        *,
        source: str,
        tool: str,
        call_id: str | None,
        arguments: dict[str, Any],
        result: Any,
        expose_result: bool = False,
    ) -> dict[str, Any]:
        observation = ledger.add(
            source=source,
            tool=tool,
            call_id=call_id,
            arguments=dict(arguments),
            result=result,
        )
        payload: dict[str, Any] = {
            "observationId": observation.observation_id,
            "summary": ledger.summary(observation),
            "instruction": (
                "Full result is retained by LCSP. The summary advertises availableSections; "
                "use those exact sections or the returned cursor when more context is needed."
            ),
        }
        if expose_result:
            payload["result"] = result
        else:
            payload["preview"] = ledger.preview(observation.observation_id, limit=6)
        return payload
