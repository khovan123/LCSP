"""Full-harness Deep Agent repository analysis.

Each assessment owns a live repository working tree inside the LCSP Docker
sandbox assigned to its durable thread. The pinned snapshot is only the
immutable baseline for that working database. Repository analysis reuses the same
repository-rooted backend; it never creates a child sandbox or host-local workspace.
Language-specific scanners are intentionally not part of this path.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from importlib.metadata import version
from typing import Any

from deepagents import create_deep_agent
from deepagents.backends import BackendProtocol
from langchain.agents.middleware import TodoListMiddleware

from harness import configure_lcsp_harness
from middleware.billing_metering import BillingAgentRoleMiddleware
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from model_policy import INVESTIGATOR_MODEL_SPEC, resolve_agent_model
from orchestration.agent_stream import invoke_with_stream
from orchestration.technical_coverage_policy import attach_partial_coverage_policy
from tools.common.capabilities.platform.repository_sandbox import current_repository_backend

from .models import AiFinding, RepositoryAnalysisResult, SourceAnchor


REPOSITORY_ANALYSIS_VERSION = "1.0.0"

SYSTEM_PROMPT = """You are LCSP's repository evidence analyst running as a full Deep Agent.

The assessment repository is your persistent working database, like the checkout used by a coding
CLI agent. The pinned snapshot is only its immutable baseline/provenance. Your filesystem root `/`
and shell working directory are the repository itself; use ls, glob, grep, read_file, write_file,
edit_file, execute, task/subagents and planning against that same working tree. `.lcsp/` is reserved
for agent/runtime state and `.git/` is repository bookkeeping; neither is customer evidence.
You are not limited to a predefined language scanner. Detect the repository's actual languages, frameworks,
build systems, generated code, configuration, AI SDKs, HTTP clients, runtime indirection, queues,
persistence, decision paths and human-review paths from the evidence you inspect.

The sandbox also contains the pinned upstream Codebase Memory MCP engine as
`codebase-memory-graph`. Use the engine's one-shot CLI mode through `execute`
when structural navigation is useful; each CLI command invokes the same MCP tool
implementation. Start broad analysis by indexing this checkout when useful:
`codebase-memory-graph cli index_repository --repo-path /workspace/repository --name assessment --mode full`.
Then use graph tools such as `get_architecture`, `search_graph`, `search_code`, `trace_path`,
`query_graph`, `detect_changes`, and `check_index_coverage` to accelerate structural reasoning.
Treat this graph as an index/memory aid, not source authority: inspect material source directly with
read_file/grep/execute before grounding final evidence. For absence or exhaustive claims, check graph
coverage and independently verify any skipped, excluded, partial, generated, dynamic, or unresolved area.
Do not copy the Codebase Memory database into the LCSP evidence graph; emit only grounded semantic
nodes/edges/source anchors in RepositoryAnalysisResult.

Build a compact semantic evidence graph grounded only in source you actually inspected. Evidence
must be represented by repository-relative file paths and line ranges; never return raw source
code, prompts, secrets, credentials or full command output. Prefer stable semantic node/edge labels
over prose. Mark inferred or dynamic relationships UNRESOLVED instead of inventing certainty.

AI discovery gate:
- AI_CONFIRMED only when you observed a concrete AI/model invocation or outbound AI call.
- AI_ABSENT_CONFIRMED only after broad repository inventory/search is complete, all material
  candidate paths were inspected, and there is no unresolved generated/dynamic/configured/runtime
  frontier that could conceal AI use.
- Otherwise AI_UNKNOWN.
- AI_ABSENT_CONFIRMED requires coverage_state READY both globally and in ai_discovery.
- Any material dynamic target, generated source gap, unreadable area, failed search/build command,
  unsupported binary/config indirection, or unresolved outbound endpoint makes coverage PARTIAL
  and prevents AI_ABSENT_CONFIRMED.

Use task delegation when parallel exploration helps (for example separate languages or architecture
areas). Use shell commands only inside the isolated sandbox and do not install or execute repository
application dependencies unless inspection genuinely requires it. Static inspection is preferred.

Return only the structured RepositoryAnalysisResult. Keep labels and notes concise and source-safe.
"""


@dataclass
class RepositoryAnalysisArtifact:
    result: RepositoryAnalysisResult
    evidence_payload: dict[str, Any]
    tools_version: dict[str, str]
    config_hash: dict[str, str]


class RepositoryDeepAnalyzer:
    """Analyze one pinned repository snapshot using the native Deep Agents harness."""

    def __init__(
        self,
        *,
        model_spec: str = INVESTIGATOR_MODEL_SPEC,
        backend: BackendProtocol | None = None,
    ) -> None:
        self._model_spec = model_spec
        self._backend = backend

    def analyze(
        self,
        *,
        snapshot_id: str,
        commit_sha: str,
        scan_job_id: str,
        targeted_scope: dict[str, Any] | None = None,
        backend: BackendProtocol | None = None,
    ) -> RepositoryAnalysisArtifact:
        repository_backend = backend or self._backend or current_repository_backend()
        if repository_backend is None:
            raise RuntimeError(
                "repository analysis requires the current LCSP repository sandbox backend"
            )
        result = self._invoke(
            repository_backend,
            snapshot_id=snapshot_id,
            commit_sha=commit_sha,
            scan_job_id=scan_job_id,
            targeted_scope=targeted_scope,
        )
        result = enforce_ai_absence_backstop(repository_backend, result)
        return RepositoryAnalysisArtifact(
            result=result,
            evidence_payload=self._evidence_payload(
                repository_backend,
                result,
                snapshot_id=snapshot_id,
                commit_sha=commit_sha,
                scan_job_id=scan_job_id,
            ),
            tools_version={
                "deepagents": version("deepagents"),
                "repository-analysis": REPOSITORY_ANALYSIS_VERSION,
            },
            config_hash={
                "repository-analysis": "sha256:"
                + hashlib.sha256(
                    (SYSTEM_PROMPT + "\n" + self._model_spec).encode("utf-8")
                ).hexdigest()
            },
        )

    def _invoke(
        self,
        backend: BackendProtocol,
        *,
        snapshot_id: str,
        commit_sha: str,
        scan_job_id: str,
        targeted_scope: dict[str, Any] | None,
    ) -> RepositoryAnalysisResult:
        configure_lcsp_harness()
        model = resolve_agent_model(
            agent_name="investigator",
            model_spec=self._model_spec,
        )
        agent = create_deep_agent(
            name="repository-analyst",
            model=model,
            backend=backend,
            system_prompt=SYSTEM_PROMPT,
            middleware=[
                TodoListMiddleware(),
                BillingAgentRoleMiddleware("investigator"),
                *MODEL_GOVERNANCE_MIDDLEWARE,
            ],
            subagents=[
                {
                    "name": "repository-explorer",
                    "description": (
                        "Fork the current investigation to explore a language, package, "
                        "framework, dependency surface, or architecture path in parallel."
                    ),
                    "mode": "fork",
                    "model": model,
                },
            ],
            response_format=RepositoryAnalysisResult,
            debug=False,
        )
        scope_text = (
            json.dumps(targeted_scope, ensure_ascii=False, sort_keys=True)
            if targeted_scope
            else "whole repository"
        )
        instruction = (
            f"Analyze snapshot {snapshot_id} at commit {commit_sha or 'unknown'} for scan "
            f"{scan_job_id}. Scope: {scope_text}. Build grounded technical evidence and decide "
            "AI discovery coverage using the rules in your system instructions."
        )
        response = invoke_with_stream(
            agent,
            {"messages": [{"role": "user", "content": instruction}]},
            config={
                "configurable": {"thread_id": f"repository-analysis:{scan_job_id}"},
                "metadata": {
                    "scan_job_id": scan_job_id,
                    "snapshot_id": snapshot_id,
                    "commit_sha": commit_sha,
                },
            },
        )
        if not isinstance(response, dict) or response.get("structured_response") is None:
            raise RuntimeError("repository Deep Agent did not return structured_response")
        return RepositoryAnalysisResult.model_validate(response["structured_response"])

    @staticmethod
    def _evidence_payload(
        backend: BackendProtocol,
        result: RepositoryAnalysisResult,
        *,
        snapshot_id: str,
        commit_sha: str,
        scan_job_id: str,
    ) -> dict[str, Any]:
        anchors: list[dict[str, Any]] = []
        anchor_by_id: dict[str, dict[str, Any]] = {}
        for anchor in result.source_anchors:
            relative = anchor.file_path.replace("\\", "/").lstrip("/")
            if relative in {".git", ".lcsp"} or relative.startswith((".git/", ".lcsp/")):
                continue
            downloaded = backend.download_files([f"/{relative}"])
            if not downloaded:
                continue
            source_file = downloaded[0]
            if source_file.error or source_file.content is None:
                continue
            source_hash = "sha256:" + hashlib.sha256(source_file.content).hexdigest()
            body = {
                "anchor_id": anchor.anchor_id,
                "snapshot_id": snapshot_id,
                "commit_sha": commit_sha,
                "file_path": relative,
                "symbol_ref": anchor.symbol_ref,
                "start_line": anchor.start_line,
                "end_line": anchor.end_line,
                "source_hash": source_hash,
            }
            anchors.append(body)
            anchor_by_id[anchor.anchor_id] = body

        nodes = []
        for node in result.nodes:
            anchor = anchor_by_id.get(node.anchor_id or "")
            nodes.append(
                {
                    "node_id": node.node_id,
                    "node_type": node.node_type,
                    "label": node.label,
                    "source": (
                        {
                            "file_path": anchor["file_path"],
                            "start_line": anchor["start_line"],
                            "end_line": anchor["end_line"],
                            "symbol_ref": anchor["symbol_ref"],
                            "source_hash": anchor["source_hash"],
                        }
                        if anchor
                        else None
                    ),
                    "semantic_types": node.semantic_types,
                    "evidence_refs": [node.anchor_id] if anchor else [],
                    "coverage_state": (
                        "LIMITED" if node.resolution_state == "UNRESOLVED" else "SUFFICIENT"
                    ),
                    "origin": "DEEP_AGENT",
                    "resolution_state": node.resolution_state,
                }
            )

        edges = [
            {
                "edge_id": edge.edge_id,
                "edge_type": edge.edge_type,
                "source_node_id": edge.source_node_id,
                "target_node_id": edge.target_node_id,
                "confidence": edge.confidence,
                "evidence_refs": [],
                "coverage_state": (
                    "LIMITED" if edge.resolution_state == "UNRESOLVED" else "SUFFICIENT"
                ),
                "origin": "DEEP_AGENT",
                "resolution_state": edge.resolution_state,
            }
            for edge in result.edges
        ]

        findings = []
        for finding in result.ai_discovery.findings:
            anchor = anchor_by_id.get(finding.anchor_id or "")
            body = finding.model_dump(exclude_none=True)
            body.pop("anchor_id", None)
            if anchor:
                body["snippet_ref"] = {
                    "snapshot_id": snapshot_id,
                    "commit_sha": commit_sha,
                    "file_path": anchor["file_path"],
                    "symbol": anchor["symbol_ref"],
                    "start_line": anchor["start_line"],
                    "end_line": anchor["end_line"],
                    "evidence_hash": anchor["source_hash"],
                    "snippet_policy": "PINNED_SNAPSHOT_BOUNDED_REDACTED_V1",
                }
                if finding.anchor_id not in body["evidence_refs"]:
                    body["evidence_refs"].append(finding.anchor_id)
            findings.append(body)

        graph = {
            "graph_id": f"deep-agent:{scan_job_id}",
            "snapshot_id": snapshot_id,
            "commit_sha": commit_sha,
            "node_count": len(nodes),
            "edge_count": len(edges),
            "nodes": nodes,
            "edges": edges,
            "source_anchors": anchors,
            "indexes": {},
            "unresolved_frontiers": result.unresolved_frontiers,
            "coverage_state": result.coverage_state,
            "coverage_notes": result.coverage_notes,
            "provenance": {
                "engine": "deepagents",
                "analysisVersion": REPOSITORY_ANALYSIS_VERSION,
            },
            "evidence_refs": [item["anchor_id"] for item in anchors],
            "graph_hash": "",
            "schema_version": "deep-agent-1.0.0",
        }
        payload = {
            "summary": result.summary,
            "languages": result.languages,
            "frameworks": result.frameworks,
            "technicalCoverageState": result.coverage_state,
            "coverageLimitations": result.coverage_notes,
            "evidence_graph": graph,
            "ai_discovery": {
                "schema_version": "1.0.0",
                "gate": result.ai_discovery.gate,
                "coverage_state": result.ai_discovery.coverage_state,
                "findings": findings,
                "material_unresolved_frontiers": result.ai_discovery.material_unresolved_frontiers,
            },
        }
        # Initial Interview may start from PARTIAL coverage only with this auditable
        # scanner-workflow decision (bounded, pinned, evidence-backed limitations).
        return attach_partial_coverage_policy(payload)

# Deterministic contradiction check for the model's AI absence claim. Literal patterns
# (backend grep is substring, not regex) mapped to a provider label.
_AI_IMPORT_SIGNALS: tuple[tuple[str, tuple[str, ...], str], ...] = (
    ("import openai", ("**/*.py",), "openai"),
    ("from openai", ("**/*.py",), "openai"),
    ("import anthropic", ("**/*.py",), "anthropic"),
    ("from anthropic", ("**/*.py",), "anthropic"),
    ("from langchain", ("**/*.py",), "langchain"),
    ("from google import genai", ("**/*.py",), "google-genai"),
    ("import google.generativeai", ("**/*.py",), "google-genai"),
    ("import litellm", ("**/*.py",), "litellm"),
    ("from litellm", ("**/*.py",), "litellm"),
)
_JS_SOURCE_GLOBS = ("**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs", "**/*.cjs")
_JS_AI_MODULES: tuple[tuple[str, str], ...] = (
    ("openai", "openai"),
    ("@google/genai", "google-genai"),
    ("@google/generative-ai", "google-genai"),
    ("@anthropic-ai/sdk", "anthropic"),
    ("@aws-sdk/client-bedrock-runtime", "bedrock"),
    ("@mistralai/mistralai", "mistral"),
    ("@langchain/", "langchain"),
    ("langchain", "langchain"),
)
_AI_MANIFEST_SIGNALS: tuple[tuple[str, tuple[str, ...], str], ...] = (
    *(
        (f'"{module}' + ("" if module.endswith("/") else '"'), ("**/package.json",), provider)
        for module, provider in _JS_AI_MODULES
    ),
    *(
        (package, ("**/pyproject.toml", "**/requirements*.txt"), provider)
        for package, provider in (
            ("openai", "openai"),
            ("anthropic", "anthropic"),
            ("langchain", "langchain"),
            ("google-genai", "google-genai"),
            ("google-generativeai", "google-genai"),
            ("litellm", "litellm"),
        )
    ),
)
_AI_SIGNALS = (
    *_AI_IMPORT_SIGNALS,
    *(
        (f'from {quote}{module}', _JS_SOURCE_GLOBS, provider)
        for module, provider in _JS_AI_MODULES
        for quote in ('"', "'")
    ),
    *(
        (f'require("{module}', _JS_SOURCE_GLOBS, provider)
        for module, provider in _JS_AI_MODULES
    ),
    *_AI_MANIFEST_SIGNALS,
)
_NON_PRODUCT_SEGMENTS = frozenset(
    {
        "node_modules", ".venv", "venv", ".git", ".lcsp", "dist", "build", "vendor",
        "site-packages", "__pycache__", "tests", "test", "__tests__", "fixtures",
    }
)
_MAX_BACKSTOP_MATCHES = 50


def _product_path(path: str) -> bool:
    parts = [part for part in path.replace("\\", "/").split("/") if part]
    if not parts or any(part in _NON_PRODUCT_SEGMENTS for part in parts[:-1]):
        return False
    name = parts[-1]
    return not (name.startswith("test_") or ".spec." in name or ".test." in name)


def _first_product_match(backend: BackendProtocol, pattern: str, globs: tuple[str, ...]):
    for glob in globs:
        found = backend.grep(pattern, path="/", glob=glob, max_count=_MAX_BACKSTOP_MATCHES)
        if getattr(found, "error", None):
            raise RuntimeError(str(found.error))
        for match in getattr(found, "matches", None) or []:
            if _product_path(str(match.get("path") or "")):
                return match
    return None


def enforce_ai_absence_backstop(
    backend: BackendProtocol, result: RepositoryAnalysisResult
) -> RepositoryAnalysisResult:
    """Refuse a model-asserted AI_ABSENT_CONFIRMED that repository files contradict.

    Absence is only legal under genuinely READY coverage (ai-discovery-gate.md), yet READY
    is the model's own claim. Product imports or dependency declarations of AI SDKs are
    provider references requiring technical resolution, so the gate drops to AI_UNKNOWN.
    If the deterministic search itself fails, absence is unproven and also drops.
    """
    discovery = result.ai_discovery
    if discovery.gate != "AI_ABSENT_CONFIRMED":
        return result

    hits: dict[str, dict[str, Any]] = {}
    frontiers: list[str] = []
    try:
        for pattern, globs, provider in _AI_SIGNALS:
            if provider in hits:
                continue
            match = _first_product_match(backend, pattern, globs)
            if match is not None:
                hits[provider] = match
    except Exception as error:  # noqa: BLE001 - any search failure leaves absence unproven
        frontiers.append(
            "AI absence could not be verified: deterministic SDK scan failed "
            f"({type(error).__name__})"
        )
    if not hits and not frontiers:
        return result

    data = result.model_dump()
    findings = list(data["ai_discovery"]["findings"])
    anchors = list(data["source_anchors"])
    taken = {anchor["anchor_id"] for anchor in anchors}
    for index, (provider, match) in enumerate(sorted(hits.items()), start=1):
        anchor_id = f"ai-absence-backstop-{index}"
        while anchor_id in taken:
            anchor_id += "-x"
        taken.add(anchor_id)
        file_path = str(match["path"]).lstrip("/")
        line = int(match.get("line") or 1)
        anchors.append(
            SourceAnchor(
                anchor_id=anchor_id, file_path=file_path, start_line=line, end_line=line
            ).model_dump()
        )
        findings.append(
            AiFinding(
                evidence_id=anchor_id,
                state="AI_PROVIDER_REFERENCE",
                resolution_state="OBSERVED",
                kind="PROVIDER_REFERENCE",
                provider=provider,
                clarification_owner="TECHNICAL",
                clarification_kind="TARGETED_TECHNICAL_REANALYSIS",
                evidence_refs=[anchor_id],
                anchor_id=anchor_id,
            ).model_dump()
        )
        frontiers.append(
            f"Deterministic SDK scan found {provider} referenced at {file_path}:{line}; "
            "AI absence is not proven"
        )
    data["source_anchors"] = anchors
    data["ai_discovery"].update(
        gate="AI_UNKNOWN",
        findings=findings,
        material_unresolved_frontiers=[
            *data["ai_discovery"]["material_unresolved_frontiers"],
            *frontiers,
        ],
    )
    data["coverage_notes"] = [
        *data["coverage_notes"],
        "AI_ABSENT_CONFIRMED was downgraded to AI_UNKNOWN by the deterministic "
        "AI SDK dependency/import check"
        + (f" ({', '.join(sorted(hits))})" if hits else "")
        + ".",
    ]
    return RepositoryAnalysisResult.model_validate(data)


__all__ = [
    "REPOSITORY_ANALYSIS_VERSION",
    "RepositoryAnalysisArtifact",
    "RepositoryDeepAnalyzer",
    "SYSTEM_PROMPT",
    "enforce_ai_absence_backstop",
]
