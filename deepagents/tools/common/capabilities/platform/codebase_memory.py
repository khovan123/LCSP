"""Deterministic Codebase Memory index of the hydrated assessment repository.

The sandbox ships the pinned upstream Codebase Memory MCP engine as the
``codebase-memory-graph`` command. Agents query its graph through typed tools
(see ``tools.common.capabilities.platform.codebase_memory_tools``); those queries
are only useful once the exact hydrated repository has been indexed, so every
dispatch ensures that here instead of hoping an agent runs the indexer itself.

The index is stamped with the repository hydration marker, so a new snapshot is
always re-indexed and an unchanged one is reused.
"""

from __future__ import annotations

import hashlib
import json
import re
import shlex
from collections.abc import Callable
from contextvars import ContextVar
from dataclasses import asdict, dataclass
from typing import Any

from .repository_sandbox import REPOSITORY_META, REPOSITORY_ROOT

CODEBASE_MEMORY_COMMAND = "codebase-memory-graph"
CODEBASE_MEMORY_PROJECT = "workspace-repository"
_INDEX_STAMP = "/workspace/runtime/codebase-memory/lcsp-index-stamp.json"

CodebaseMemoryLifecycle = Callable[[str], None]


@dataclass(frozen=True)
class CodebaseMemoryIndexIdentity:
    """Durable identity of the index a dispatch runs against (no sandbox paths)."""

    project_id: str
    index_stamp: str
    reused: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "codebaseMemoryProjectId": self.project_id,
            "codebaseMemoryIndexStamp": self.index_stamp,
            "codebaseMemoryIndexReused": self.reused,
        }


_ACTIVE_INDEX: ContextVar[CodebaseMemoryIndexIdentity | None] = ContextVar(
    "lcsp_codebase_memory_index", default=None
)


def active_codebase_memory_index() -> CodebaseMemoryIndexIdentity | None:
    """The index identity the current dispatch ensured, if any."""
    return _ACTIVE_INDEX.get()


def _stamp_hash(marker: str) -> str:
    return "sha256:" + hashlib.sha256(marker.encode("utf-8")).hexdigest()


class CodebaseMemoryIndexError(RuntimeError):
    """The hydrated repository could not be indexed for graph queries."""


def codebase_memory_cli(tool: str, arguments: dict[str, Any]) -> str:
    """Shell command running one Codebase Memory MCP tool in one-shot CLI mode."""
    return (
        f"{CODEBASE_MEMORY_COMMAND} cli --quiet {shlex.quote(tool)} "
        f"{shlex.quote(json.dumps(arguments, separators=(',', ':')))}"
    )


def ensure_codebase_memory_index(
    backend: object,
    *,
    lifecycle: CodebaseMemoryLifecycle | None = None,
) -> bool:
    """Index the hydrated repository unless the current snapshot already is.

    Returns False when no repository is hydrated in this sandbox (boundaries
    that do not work on source). Raises CodebaseMemoryIndexError when indexing
    fails, so a dispatch never silently runs without the graph.
    """
    execute = getattr(backend, "execute", None)
    if not callable(execute):
        return False
    marker = _output(execute(f"cat {shlex.quote(REPOSITORY_META)} 2>/dev/null"))
    if not marker:
        return False
    stamp = _output(execute(f"cat {shlex.quote(_INDEX_STAMP)} 2>/dev/null"))
    if stamp == marker and _project_indexed(execute):
        _ACTIVE_INDEX.set(
            CodebaseMemoryIndexIdentity(CODEBASE_MEMORY_PROJECT, _stamp_hash(marker), True)
        )
        _emit(lifecycle, "codebase_memory_index_reused")
        return True

    _emit(lifecycle, "codebase_memory_indexing")
    result = execute(
        codebase_memory_cli(
            "index_repository",
            {"repo_path": REPOSITORY_ROOT, "mode": "full"},
        ),
        timeout=None,
    )
    output = _output(result)
    if getattr(result, "exit_code", 1) != 0 or '"status":"indexed"' not in output:
        _emit(lifecycle, "codebase_memory_index_failed")
        raise CodebaseMemoryIndexError(
            "Codebase Memory could not index the assessment repository"
            + (f": {output[-500:]}" if output else "")
        )
    execute(
        f"printf %s {shlex.quote(marker)} > {shlex.quote(_INDEX_STAMP)}"
    )
    _ACTIVE_INDEX.set(
        CodebaseMemoryIndexIdentity(CODEBASE_MEMORY_PROJECT, _stamp_hash(marker), False)
    )
    _emit(lifecycle, "codebase_memory_indexed")
    return True


@dataclass(frozen=True)
class GraphLocation:
    """One symbol the index knows about: where it is, never its source text."""

    qualified_name: str
    label: str
    path: str
    start_line: int | None
    end_line: int | None

    def to_dict(self) -> dict[str, Any]:
        return {key: value for key, value in asdict(self).items() if value is not None}


_ROW = re.compile(r"^\s+(?P<qn>\S+)\s+(?P<label>\S+)\s+(?P<file>\S+)\s+(?P<lines>\S+)\s+\d+\s+\d+\s*$")


_REF = re.compile(r"^\s+(?P<id>\d+)\s+(?P<prefix>\S+)\s*$")
_REF_USE = re.compile(r"@(?P<id>\d+)\+")


def _expander(output: str) -> Callable[[str], str]:
    """Large results compress shared prefixes into a `results_refs` table and
    use `@N+suffix` in rows (`results_ref_rule`); expand them back."""
    refs: dict[str, str] = {}
    in_refs = False
    for line in output.splitlines():
        if line.startswith("results_refs:"):
            in_refs = True
            continue
        if in_refs:
            ref = _REF.match(line)
            if ref:
                refs[ref["id"]] = ref["prefix"]
                continue
            in_refs = False
    return lambda value: _REF_USE.sub(lambda m: refs.get(m["id"], m.group(0)), value)


def parse_search_graph_rows(output: str) -> list[GraphLocation]:
    """Parse the CLI's compact `qn label file lines in out` table."""
    expand = _expander(output)
    rows: list[GraphLocation] = []
    for line in output.splitlines():
        match = _ROW.match(line)
        if not match or match["file"] == "-":
            continue
        start, _, end = match["lines"].partition("-")
        rows.append(
            GraphLocation(
                qualified_name=expand(match["qn"]).strip('"'),
                label=match["label"],
                path=expand(match["file"]),
                start_line=int(start) if start.isdigit() else None,
                end_line=int(end) if end.isdigit() else None,
            )
        )
    return rows


def parse_search_graph_names(output: str) -> list[str]:
    """Qualified names from a search table, including file-less rows (routes)."""
    expand = _expander(output)
    return [
        expand(match["qn"]).strip('"')
        for line in output.splitlines()
        if (match := _ROW.match(line))
    ]


class CodebaseMemoryGraphReader:
    """Bounded, deterministic queries against the indexed repository graph."""

    def __init__(self, execute: Callable[..., Any]) -> None:
        self._execute = execute

    def search(
        self,
        *,
        name_pattern: str | None = None,
        label: str | None = None,
        limit: int = 20,
    ) -> list[GraphLocation]:
        arguments: dict[str, Any] = {"project": CODEBASE_MEMORY_PROJECT, "limit": limit}
        if name_pattern:
            arguments["name_pattern"] = name_pattern
        if label:
            arguments["label"] = label
        result = self._execute(codebase_memory_cli("search_graph", arguments))
        if getattr(result, "exit_code", 1) != 0:
            return []
        return parse_search_graph_rows(_output(result))

    def route_names(self, *, limit: int = 20) -> list[str]:
        """HTTP route identifiers, which the index stores without a file."""
        result = self._execute(
            codebase_memory_cli(
                "search_graph",
                {"project": CODEBASE_MEMORY_PROJECT, "label": "Route", "limit": limit},
            )
        )
        if getattr(result, "exit_code", 1) != 0:
            return []
        return parse_search_graph_names(_output(result))


def _project_indexed(execute: Callable[..., Any]) -> bool:
    listing = _output(execute(codebase_memory_cli("list_projects", {})))
    return f"{CODEBASE_MEMORY_PROJECT} {REPOSITORY_ROOT}" in listing


def _output(result: Any) -> str:
    return str(getattr(result, "output", "") or "").strip()


def _emit(lifecycle: CodebaseMemoryLifecycle | None, event: str) -> None:
    if lifecycle is not None:
        lifecycle(event)


__all__ = [
    "CODEBASE_MEMORY_PROJECT",
    "CodebaseMemoryGraphReader",
    "CodebaseMemoryIndexIdentity",
    "GraphLocation",
    "active_codebase_memory_index",
    "parse_search_graph_names",
    "parse_search_graph_rows",
    "CodebaseMemoryIndexError",
    "codebase_memory_cli",
    "ensure_codebase_memory_index",
]
