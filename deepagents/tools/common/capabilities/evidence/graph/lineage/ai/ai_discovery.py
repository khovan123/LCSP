"""Deterministic Scanner/PGE AI-discovery enrichment and gate projection.

This module is deliberately pre-Interview. It may inspect raw source only inside the
ephemeral scanner workspace, but emits metadata/source anchors only. It never assigns a
custom endpoint to a provider without repository evidence and never treats a package or
provider reference as proof of model execution.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path
from urllib.parse import urlsplit

from tools.common.capabilities.evidence.graph.schema.models import ProgramEvidenceGraph
from tools.common.capabilities.evidence.graph.schema.semantic_ir import (
    SemanticEdgeFact,
    SemanticNodeFact,
    SemanticProgram,
)
from tools.common.capabilities.evidence.graph.schema.source_roles import is_test_source_path


AI_DISCOVERY_SCHEMA_VERSION = "1.0.0"
AI_CONFIRMED = "AI_CONFIRMED"
AI_ABSENT_CONFIRMED = "AI_ABSENT_CONFIRMED"
AI_UNKNOWN = "AI_UNKNOWN"

CONFIRMED_AI_CALL = "CONFIRMED_AI_CALL"
POSSIBLE_AI_CALL = "POSSIBLE_AI_CALL"
AI_PROVIDER_REFERENCE = "AI_PROVIDER_REFERENCE"
UNRESOLVED_DYNAMIC = "UNRESOLVED_DYNAMIC"

_SOURCE_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".java",
    ".kt",
    ".cs",
}
_EXCLUDED_PARTS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "coverage",
    "vendor",
    ".venv",
    "venv",
    "__pycache__",
}
_ENV_PATTERNS = (
    re.compile(r"process\.env\.([A-Za-z_][A-Za-z0-9_]*)"),
    re.compile(r"process\.env\[['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]\]"),
    re.compile(r"os\.getenv\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
    re.compile(r"os\.environ(?:\.get\()?\s*\[?\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
    re.compile(r"Environment\.GetEnvironmentVariable\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
    re.compile(r"System\.getenv\(\s*['\"]([A-Za-z_][A-Za-z0-9_]*)['\"]"),
)
_HTTP_CALL_RE = re.compile(
    r"\b(fetch|axios(?:\.(?:get|post|put|patch|delete|request))?|"
    r"requests\.(?:get|post|put|patch|delete)|httpx\.(?:get|post|put|patch|delete)|"
    r"urllib\.request|(?:\w+\.)?HttpClient\.(?:GetAsync|PostAsync|SendAsync)|"
    r"(?:\w+\.)?(?:WebClient|RestTemplate|OkHttpClient)\.\w+)\s*\(",
    re.I,
)
_URL_RE = re.compile(r"https?://[^'\"\s)`},]+", re.I)
_AI_PAYLOAD_KEY_RE = re.compile(
    r"(?:['\"](?:model|messages|prompt|input|tools|embedding|contents)['\"]\s*:|"
    r"\b(?:model|messages|prompt|input|tools|embedding|contents)\s*(?::|=))",
    re.I,
)
_AI_ENDPOINT_RE = re.compile(
    r"/(?:v\d+/)?(?:chat/completions|completions|responses|messages|embeddings|"
    r"models/[^/]+:generateContent|invoke|converse)(?=[/'\"?\s,)}`]|$)",
    re.I,
)
_AI_ENV_RE = re.compile(
    r"(?:AI|LLM|MODEL|GPT|OPENAI|ANTHROPIC|GEMINI|GENAI|BEDROCK|OLLAMA)", re.I
)
_ENDPOINT_ENV_RE = re.compile(r"(?:URL|URI|HOST|ENDPOINT|GATEWAY|BASE|API)", re.I)
_FEATURE_ENV_RE = re.compile(
    r"(?:ENABLE|ENABLED|FEATURE|USE|DISABLE).*(?:AI|LLM|MODEL)|"
    r"(?:AI|LLM|MODEL).*(?:ENABLE|ENABLED|FEATURE|USE|DISABLE)",
    re.I,
)
_CONDITION_RE = re.compile(r"\bif\s*\(|^\s*if\b|\bwhen\s*\(", re.I)
_ASSIGNMENT_RE = re.compile(
    r"\b(?:const|let|var)?\s*([A-Za-z_$][\w$]*)\s*=|^\s*([A-Za-z_][\w]*)\s*="
)

_PROVIDER_HOSTS = (
    ("OPENAI", ("api.openai.com",)),
    ("AZURE_OPENAI", ("openai.azure.com",)),
    ("ANTHROPIC", ("api.anthropic.com",)),
    (
        "GOOGLE_GENAI",
        ("generativelanguage.googleapis.com", "aiplatform.googleapis.com"),
    ),
    ("AWS_BEDROCK", ("bedrock-runtime.",)),
    ("HUGGINGFACE", ("api-inference.huggingface.co",)),
    ("OPENROUTER", ("openrouter.ai",)),
)


def _env_names(text: str) -> list[str]:
    values: list[str] = []
    for pattern in _ENV_PATTERNS:
        values.extend(match.group(1) for match in pattern.finditer(text))
    return list(dict.fromkeys(values))


def _provider_for_host(host: str) -> str | None:
    lower = host.lower()
    for provider, hints in _PROVIDER_HOSTS:
        if any(hint in lower for hint in hints):
            return provider
    return None


def _method_for_call(name: str) -> str | None:
    lower = name.lower()
    for method in ("get", "post", "put", "patch", "delete"):
        if lower.endswith(f".{method}") or lower.endswith(f"{method}async"):
            return method.upper()
    return None


class AIDiscoveryEnricher:
    """Add only AI-material config/control/outbound facts to a semantic graph."""

    def __init__(self, workspace_path: str | Path) -> None:
        self.workspace = Path(workspace_path).resolve(strict=False)

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        invocation_by_file: dict[str, list[SemanticNodeFact]] = {}
        for node in program.nodes:
            if node.node_type == "AI_MODEL_INVOCATION" and node.file_path:
                invocation_by_file.setdefault(
                    node.file_path.replace("\\", "/"), []
                ).append(node)

        for path in self._source_files():
            relative = path.relative_to(self.workspace).as_posix()
            try:
                lines = path.read_text(
                    encoding="utf-8", errors="replace"
                ).splitlines()
            except OSError as exc:
                program.coverage_notes.append(
                    f"ai_discovery_read_failed:file={relative}:reason={type(exc).__name__}"
                )
                continue
            aliases = _env_aliases(lines)
            self._environment_and_conditions(program, relative, lines, aliases)
            self._outbound_candidates(program, relative, lines, aliases)
            self._guard_invocations(
                program,
                relative,
                lines,
                invocation_by_file.get(relative, []),
                aliases,
            )
        return program

    def _source_files(self) -> list[Path]:
        result: list[Path] = []
        for path in self.workspace.rglob("*"):
            if (
                not path.is_file()
                or path.suffix.lower() not in _SOURCE_EXTENSIONS
            ):
                continue
            relative = path.relative_to(self.workspace)
            rel = relative.as_posix()
            if any(part in _EXCLUDED_PARTS for part in relative.parts):
                continue
            if is_test_source_path(rel):
                continue
            result.append(path)
        return sorted(result)

    def _environment_and_conditions(
        self,
        program: SemanticProgram,
        relative: str,
        lines: list[str],
        aliases: dict[str, str],
    ) -> None:
        for line_no, line in enumerate(lines, start=1):
            names = _env_names(line)
            if _CONDITION_RE.search(line):
                names.extend(
                    env_name
                    for alias, env_name in aliases.items()
                    if re.search(rf"\b{re.escape(alias)}\b", line)
                )
                names = list(dict.fromkeys(names))
            for name in names:
                env_key = self._env_node(program, relative, line_no, name)
                if _FEATURE_ENV_RE.search(name):
                    feature_key = f"feature-flag:{relative}:{name}"
                    program.add_node(
                        SemanticNodeFact(
                            feature_key,
                            "FEATURE_FLAG",
                            name,
                            relative,
                            line_no,
                            line_no,
                            attributes={"sourceKind": "ENV_NAME"},
                            resolution_state="UNRESOLVED",
                        )
                    )
                    program.add_edge(
                        SemanticEdgeFact(
                            "CONFIGURES",
                            env_key,
                            feature_key,
                            resolution_state="OBSERVED",
                        )
                    )
            if names and _CONDITION_RE.search(line):
                condition_key = f"control-condition:{relative}:{line_no}"
                program.add_node(
                    SemanticNodeFact(
                        condition_key,
                        "CONTROL_CONDITION",
                        "runtime configuration condition",
                        relative,
                        line_no,
                        line_no,
                        attributes={"configNames": sorted(names)},
                        resolution_state="UNRESOLVED",
                    )
                )
                for name in names:
                    program.add_edge(
                        SemanticEdgeFact(
                            "CONTROLS",
                            f"env:{relative}:{name}",
                            condition_key,
                            resolution_state="OBSERVED",
                        )
                    )

    def _outbound_candidates(
        self,
        program: SemanticProgram,
        relative: str,
        lines: list[str],
        aliases: dict[str, str],
    ) -> None:
        for index, line in enumerate(lines):
            match = _HTTP_CALL_RE.search(line)
            if not match:
                continue
            line_no = index + 1
            window = "\n".join(lines[index : min(len(lines), index + 5)])
            urls = _URL_RE.findall(window)
            env_names = _env_names(window)
            env_names.extend(
                env_name
                for alias, env_name in aliases.items()
                if re.search(rf"\b{re.escape(alias)}\b", window)
            )
            env_names = list(dict.fromkeys(env_names))
            payload_hints = sorted(
                {
                    _payload_hint_name(item.group(0))
                    for item in _AI_PAYLOAD_KEY_RE.finditer(window)
                }
            )[:8]
            host = ""
            path_value = ""
            provider: str | None = None
            if urls:
                parsed = urlsplit(urls[0])
                host = parsed.hostname or ""
                path_value = parsed.path or "/"
                provider = _provider_for_host(host)
            endpoint_signature = bool(_AI_ENDPOINT_RE.search(window))
            payload_signature = bool(payload_hints)
            strong_payload_signature = len(
                set(payload_hints)
                & {"model", "messages", "prompt", "input", "tools", "contents"}
            ) >= 2
            ai_named_envs = [
                name
                for name in env_names
                if _AI_ENV_RE.search(name) and _ENDPOINT_ENV_RE.search(name)
            ]

            if provider and endpoint_signature:
                state = CONFIRMED_AI_CALL
                resolution = "CORROBORATED"
                clarification = "AI_PURPOSE_FEATURE_MAPPING"
            elif provider or endpoint_signature or (
                ai_named_envs and payload_signature
            ):
                state = POSSIBLE_AI_CALL
                resolution = "UNRESOLVED"
                clarification = "OUTBOUND_AI_CONFIRMATION"
            elif strong_payload_signature and (urls or env_names):
                state = POSSIBLE_AI_CALL
                resolution = "UNRESOLVED"
                clarification = "OUTBOUND_AI_CONFIRMATION"
            else:
                # A normal HTTP call remains an EXTERNAL_API/CALL_SITE elsewhere in
                # the PGE. It is deliberately not promoted without an AI signal.
                continue

            key = f"ai-api-candidate:{relative}:{line_no}:{match.group(1)}"
            attrs: dict[str, object] = {
                "discoveryState": state,
                "clarificationOwner": "CUSTOMER",
                "clarificationKind": clarification,
                "endpointSource": (
                    "LITERAL"
                    if urls
                    else f"ENV:{ai_named_envs[0]}"
                    if ai_named_envs
                    else "DYNAMIC"
                ),
            }
            method = _method_for_call(match.group(1))
            if provider:
                attrs["provider"] = provider
            if host:
                attrs["host"] = host
            if path_value:
                attrs["path"] = path_value
            if method:
                attrs["method"] = method
            if payload_hints:
                attrs["payloadHints"] = payload_hints
            if ai_named_envs:
                attrs["configNames"] = sorted(ai_named_envs)
            program.add_node(
                SemanticNodeFact(
                    key,
                    "AI_API_CANDIDATE",
                    (
                        "known AI API call"
                        if state == CONFIRMED_AI_CALL
                        else "unresolved AI-capable outbound API"
                    ),
                    relative,
                    line_no,
                    line_no,
                    attributes=attrs,
                    resolution_state=resolution,
                )
            )
            call = self._call_node(program, relative, line_no)
            if call:
                program.add_edge(
                    SemanticEdgeFact(
                        "CALLS_EXTERNAL",
                        call.key,
                        key,
                        resolution_state=resolution,
                    )
                )
            for name in ai_named_envs:
                env_key = self._env_node(program, relative, line_no, name)
                program.add_edge(
                    SemanticEdgeFact(
                        "CONFIGURES",
                        env_key,
                        key,
                        resolution_state="OBSERVED",
                    )
                )

    def _guard_invocations(
        self,
        program: SemanticProgram,
        relative: str,
        lines: list[str],
        invocations: list[SemanticNodeFact],
        aliases: dict[str, str],
    ) -> None:
        for invocation in invocations:
            if not invocation.start_line:
                continue
            start = max(0, invocation.start_line - 12)
            invocation_index = invocation.start_line - 1
            invocation_window = "\n".join(
                lines[invocation_index : min(len(lines), invocation_index + 5)]
            )
            config_names = _env_names(invocation_window)
            config_names.extend(
                env_name
                for alias, env_name in aliases.items()
                if re.search(rf"\b{re.escape(alias)}\b", invocation_window)
            )
            for name in dict.fromkeys(config_names):
                env_key = self._env_node(
                    program, relative, invocation.start_line, name
                )
                program.add_edge(
                    SemanticEdgeFact(
                        "CONFIGURES",
                        env_key,
                        invocation.key,
                        resolution_state="OBSERVED",
                    )
                )
            for index in range(invocation.start_line - 2, start - 1, -1):
                if index < 0 or index >= len(lines):
                    continue
                line = lines[index]
                names = _env_names(line)
                names.extend(
                    env_name
                    for alias, env_name in aliases.items()
                    if re.search(rf"\b{re.escape(alias)}\b", line)
                )
                names = list(dict.fromkeys(names))
                if not names or not _CONDITION_RE.search(line):
                    continue
                condition_line = index + 1
                condition_key = f"control-condition:{relative}:{condition_line}"
                program.add_node(
                    SemanticNodeFact(
                        condition_key,
                        "CONTROL_CONDITION",
                        "runtime configuration condition",
                        relative,
                        condition_line,
                        condition_line,
                        attributes={
                            "configNames": sorted(names),
                            "aiMaterial": True,
                        },
                        resolution_state="UNRESOLVED",
                    )
                )
                for name in names:
                    env_key = self._env_node(
                        program, relative, condition_line, name
                    )
                    program.add_edge(
                        SemanticEdgeFact(
                            "CONTROLS", env_key, condition_key
                        )
                    )
                program.add_edge(
                    SemanticEdgeFact(
                        "GUARDS",
                        condition_key,
                        invocation.key,
                        coverage_state="LIMITED",
                        resolution_state="UNRESOLVED",
                    )
                )
                break

    @staticmethod
    def _call_node(
        program: SemanticProgram, relative: str, line_no: int
    ) -> SemanticNodeFact | None:
        return next(
            (
                node
                for node in program.nodes
                if node.file_path == relative
                and node.start_line == line_no
                and node.node_type in {"CALL_SITE", "AI_MODEL_INVOCATION"}
            ),
            None,
        )

    @staticmethod
    def _env_node(
        program: SemanticProgram, relative: str, line_no: int, name: str
    ) -> str:
        key = f"env:{relative}:{name}"
        program.add_node(
            SemanticNodeFact(
                key,
                "ENV_SOURCE",
                name,
                relative,
                line_no,
                line_no,
                attributes={"name": name, "valuePersisted": False},
                resolution_state="UNRESOLVED",
            )
        )
        return key


def _payload_hint_name(raw: str) -> str:
    match = re.search(
        r"(?:model|messages|prompt|input|tools|embedding|contents)", raw, re.I
    )
    return match.group(0).lower() if match else "ai-payload"


def _env_aliases(lines: list[str]) -> dict[str, str]:
    """Resolve one-hop local aliases without persisting environment values."""
    aliases: dict[str, str] = {}
    for line in lines:
        names = _env_names(line)
        if not names:
            continue
        match = _ASSIGNMENT_RE.search(line)
        if not match:
            continue
        alias = match.group(1) or match.group(2)
        if alias:
            aliases[alias] = names[0]
    return aliases


def summarize_ai_discovery(graph: ProgramEvidenceGraph) -> dict[str, object]:
    """Project the full PGE into a small privacy-safe Scanner→Interview contract."""
    coverage = _coverage_state(graph.coverage_state)
    nodes = [item for item in graph.nodes if isinstance(item, dict)]
    edges = [item for item in graph.edges if isinstance(item, dict)]
    by_id = {str(node.get("node_id") or ""): node for node in nodes}
    incoming_guards: dict[str, list[dict]] = {}
    for edge in edges:
        if edge.get("edge_type") == "GUARDS":
            incoming_guards.setdefault(
                str(edge.get("target_node_id") or ""), []
            ).append(edge)

    findings: list[dict[str, object]] = []
    material_frontiers: set[str] = set()
    unguarded_confirmed = False
    guarded_confirmed = False

    for node in nodes:
        node_type = str(node.get("node_type") or "")
        attrs = (
            node.get("attributes")
            if isinstance(node.get("attributes"), dict)
            else {}
        )
        finding: dict[str, object] | None = None
        if node_type == "AI_MODEL_INVOCATION" and str(
            node.get("resolution_state") or ""
        ) in {"OBSERVED", "CORROBORATED"}:
            guards = incoming_guards.get(str(node.get("node_id") or ""), [])
            guard_name = _guard_name(guards, by_id)
            if guard_name:
                guarded_confirmed = True
            else:
                unguarded_confirmed = True
            finding = _finding(
                graph,
                node,
                state=CONFIRMED_AI_CALL,
                kind="SDK_INVOCATION",
                clarification_owner="CUSTOMER",
                clarification_kind=(
                    "AI_RUNTIME_REACHABILITY"
                    if guard_name
                    else "AI_PURPOSE_FEATURE_MAPPING"
                ),
                runtime_guard=guard_name,
            )
        elif node_type == "AI_API_CANDIDATE":
            state = str(attrs.get("discoveryState") or POSSIBLE_AI_CALL)
            if state == CONFIRMED_AI_CALL:
                unguarded_confirmed = True
            finding = _finding(
                graph,
                node,
                state=state,
                kind="OUTBOUND_API",
                clarification_owner=str(
                    attrs.get("clarificationOwner") or "CUSTOMER"
                ),
                clarification_kind=str(
                    attrs.get("clarificationKind")
                    or "OUTBOUND_AI_CONFIRMATION"
                ),
            )
        elif node_type == "SDK_CLIENT" and str(
            attrs.get("semanticRole") or ""
        ).startswith("PROVIDER_"):
            finding = _finding(
                graph,
                node,
                state=AI_PROVIDER_REFERENCE,
                kind="PROVIDER_REFERENCE",
                clarification_owner="TECHNICAL",
                clarification_kind="TARGETED_TECHNICAL_REANALYSIS",
            )
        elif (
            node_type == "PACKAGE_DEPENDENCY"
            and attrs.get("aiRelevant") is True
        ):
            finding = _finding(
                graph,
                node,
                state=AI_PROVIDER_REFERENCE,
                kind="PROVIDER_REFERENCE",
                clarification_owner="TECHNICAL",
                clarification_kind="TARGETED_TECHNICAL_REANALYSIS",
            )
        elif (
            node_type == "UNRESOLVED_DYNAMIC_TARGET"
            and attrs.get("aiMaterial") is True
        ):
            material_frontiers.add(str(node.get("node_id") or ""))
            finding = _finding(
                graph,
                node,
                state=UNRESOLVED_DYNAMIC,
                kind="DYNAMIC_TARGET",
                clarification_owner="TECHNICAL",
                clarification_kind="TARGETED_TECHNICAL_REANALYSIS",
            )
        if finding:
            findings.append(finding)

    findings = _dedupe_findings(findings)
    possible = any(
        item.get("state")
        in {POSSIBLE_AI_CALL, AI_PROVIDER_REFERENCE, UNRESOLVED_DYNAMIC}
        for item in findings
    )
    if unguarded_confirmed:
        gate = AI_CONFIRMED
    elif guarded_confirmed or possible or material_frontiers or coverage != "READY":
        gate = AI_UNKNOWN
    else:
        gate = AI_ABSENT_CONFIRMED

    return {
        "schema_version": AI_DISCOVERY_SCHEMA_VERSION,
        "gate": gate,
        "coverage_state": coverage,
        "findings": findings[:64],
        "material_unresolved_frontiers": sorted(material_frontiers)[:64],
    }


def _coverage_state(value: object) -> str:
    normalized = str(value or "").strip().upper()
    if normalized in {"READY", "SUFFICIENT"}:
        return "READY"
    if normalized in {"PARTIAL", "LIMITED"}:
        return "PARTIAL"
    return "UNAVAILABLE"


def _guard_name(guards: list[dict], by_id: dict[str, dict]) -> str | None:
    for edge in guards:
        source = by_id.get(str(edge.get("source_node_id") or ""), {})
        attrs = (
            source.get("attributes")
            if isinstance(source.get("attributes"), dict)
            else {}
        )
        names = attrs.get("configNames")
        if isinstance(names, list) and names:
            return str(names[0])
    return None


def _finding(
    graph: ProgramEvidenceGraph,
    node: dict,
    *,
    state: str,
    kind: str,
    clarification_owner: str,
    clarification_kind: str,
    runtime_guard: str | None = None,
) -> dict[str, object]:
    attrs = (
        node.get("attributes")
        if isinstance(node.get("attributes"), dict)
        else {}
    )
    node_id = str(node.get("node_id") or "")
    evidence_id = "ai-evidence:" + hashlib.sha256(
        f"{graph.snapshot_id}|{node_id}|{state}|{clarification_kind}".encode()
    ).hexdigest()[:24]
    result: dict[str, object] = {
        "evidence_id": evidence_id,
        "state": state,
        "resolution_state": str(
            node.get("resolution_state") or "UNRESOLVED"
        ),
        "kind": kind,
        "clarification_owner": clarification_owner,
        "clarification_kind": clarification_kind,
        "evidence_refs": sorted(
            str(value) for value in (node.get("evidence_refs") or []) if value
        ),
    }
    for output, attr in (
        ("provider", "provider"),
        ("host", "host"),
        ("path", "path"),
        ("method", "method"),
        ("endpoint_source", "endpointSource"),
    ):
        if attrs.get(attr):
            result[output] = str(attrs[attr])[:240]
    hints = attrs.get("payloadHints")
    if isinstance(hints, list):
        result["payload_hints"] = [
            str(value)[:80] for value in hints[:8]
        ]
    if runtime_guard:
        result["runtime_guard"] = runtime_guard[:120]
    source = (
        node.get("source") if isinstance(node.get("source"), dict) else None
    )
    if source and source.get("file_path") and source.get("start_line"):
        start = max(1, int(source["start_line"]))
        raw_end = int(source.get("end_line") or start)
        end = max(start, min(raw_end, start + 6))
        evidence_hash = "sha256:" + hashlib.sha256(
            (
                f"{graph.snapshot_id}|{graph.commit_sha}|"
                f"{source.get('file_path')}|{start}|{end}|{node_id}"
            ).encode()
        ).hexdigest()
        result["snippet_ref"] = {
            "snapshot_id": graph.snapshot_id,
            "commit_sha": graph.commit_sha,
            "file_path": str(source["file_path"]),
            "symbol": source.get("symbol_ref"),
            "start_line": start,
            "end_line": end,
            "evidence_hash": evidence_hash,
            "snippet_policy": "PINNED_SNAPSHOT_BOUNDED_REDACTED_V1",
        }
    return result


def _dedupe_findings(
    findings: list[dict[str, object]],
) -> list[dict[str, object]]:
    seen: set[tuple[object, ...]] = set()
    result: list[dict[str, object]] = []
    for item in sorted(
        findings, key=lambda row: str(row.get("evidence_id") or "")
    ):
        snippet = (
            item.get("snippet_ref")
            if isinstance(item.get("snippet_ref"), dict)
            else {}
        )
        key = (
            item.get("state"),
            item.get("kind"),
            snippet.get("file_path"),
            snippet.get("start_line"),
            item.get("provider"),
            item.get("endpoint_source"),
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(item)
    return result


__all__ = [
    "AIDiscoveryEnricher",
    "summarize_ai_discovery",
    "AI_CONFIRMED",
    "AI_ABSENT_CONFIRMED",
    "AI_UNKNOWN",
]
