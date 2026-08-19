"""Language-neutral fallback for literal registration/dispatch architectures.

Framework-specific adapters should win when a library has richer semantics. This pass
covers custom registries/event buses across supported languages by pairing an exact
literal registration with a dispatch on the same namespace. It never guesses a dynamic
key or ambiguous handler; those become unresolved frontiers.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from .semantic_ir import SemanticEdgeFact, SemanticNodeFact, SemanticProgram
from .source_roles import is_test_source_path

_EXTENSIONS = {
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".java",
    ".kt",
    ".kts",
    ".go",
    ".cs",
    ".rs",
}
_EXCLUDED = {
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
    "target",
    "bin",
    "obj",
}
_SYMBOL_RE = re.compile(
    r"\b(?:def|func|function|fn|class|struct)\s+([A-Za-z_$][\w$]*)"
    r"|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>"
)
_REGISTER_RE = re.compile(
    r"\b([A-Za-z_$][\w$]*)\.(?:register|Register|bind|Bind|handle|Handle)\s*\(\s*['\"]([^'\"]+)['\"]\s*,\s*([A-Za-z_$][\w$]*)"
)
_DISPATCH_LITERAL_RE = re.compile(
    r"\b([A-Za-z_$][\w$]*)\.(dispatch|Dispatch|execute|Execute|publish|Publish|send|Send)\s*\(\s*['\"]([^'\"]+)['\"]"
)
_DISPATCH_DYNAMIC_RE = re.compile(
    r"\b([A-Za-z_$][\w$]*)\.(dispatch|Dispatch|execute|Execute|publish|Publish|send|Send)\s*\(\s*([A-Za-z_$][\w$]*)"
)


@dataclass(frozen=True)
class _Binding:
    namespace: str
    identity: str
    handler: str
    rel: str
    line: int


class GenericDispatchResolver:
    """Resolve custom literal-key registries across supported languages."""

    def __init__(self, workspace_path: str | Path) -> None:
        self.workspace = Path(workspace_path).resolve(strict=False)

    def enrich(self, program: SemanticProgram) -> SemanticProgram:
        sources = self._sources()
        symbols = self._symbols(sources)
        bindings: dict[tuple[str, str], list[_Binding]] = {}
        namespaces: set[str] = set()
        for rel, text in sources:
            for match in _REGISTER_RE.finditer(text):
                binding = _Binding(
                    match.group(1),
                    match.group(2),
                    match.group(3),
                    rel,
                    _line(text, match.start()),
                )
                bindings.setdefault((binding.namespace, binding.identity), []).append(binding)
                namespaces.add(binding.namespace)

        for (namespace, identity), rows in sorted(bindings.items()):
            key = self._binding_key(namespace, identity)
            program.add_node(
                SemanticNodeFact(
                    key,
                    "TYPE",
                    f"{namespace}:{identity}",
                    attributes={
                        "frameworkBoundary": "GENERIC_DISPATCH",
                        "bindingKey": identity,
                        "namespace": namespace,
                    },
                )
            )
            handlers = {row.handler for row in rows}
            targets = [
                symbol_rows[0][0]
                for handler in handlers
                if len((symbol_rows := symbols.get(handler, []))) == 1
            ]
            if len(rows) == 1 and len(handlers) == 1 and len(targets) == 1:
                program.add_edge(SemanticEdgeFact("RESOLVES_TO", key, targets[0]))
            else:
                _mark_unresolved(program, f"{namespace}:{identity}", key, rows[0].rel, rows[0].line)

        for rel, text in sources:
            for match in _DISPATCH_LITERAL_RE.finditer(text):
                namespace, method, identity = match.groups()
                if (namespace, identity) not in bindings:
                    continue
                line = _line(text, match.start())
                call_key = f"call:{rel}:{line}:generic-dispatch:{_safe(namespace)}:{_safe(identity)}"
                program.add_node(
                    SemanticNodeFact(
                        call_key,
                        "CALL_SITE",
                        f"{namespace}.{method}",
                        rel,
                        line,
                        line,
                        attributes={"frameworkBoundary": "GENERIC_DISPATCH"},
                    )
                )
                program.add_edge(SemanticEdgeFact("CALLS", _module_key(rel), call_key))
                program.add_edge(
                    SemanticEdgeFact(
                        "RESOLVES_TO",
                        call_key,
                        self._binding_key(namespace, identity),
                    )
                )

            for match in _DISPATCH_DYNAMIC_RE.finditer(text):
                namespace, method, identity_var = match.groups()
                if namespace not in namespaces:
                    continue
                # Literal dispatches also match the broad pattern only when the first
                # token is an identifier, so this branch is strictly dynamic.
                line = _line(text, match.start())
                call_key = f"call:{rel}:{line}:generic-dispatch-dynamic:{_safe(namespace)}"
                program.add_node(
                    SemanticNodeFact(
                        call_key,
                        "CALL_SITE",
                        f"{namespace}.{method}",
                        rel,
                        line,
                        line,
                        attributes={"frameworkBoundary": "GENERIC_DISPATCH"},
                    )
                )
                program.add_edge(SemanticEdgeFact("CALLS", _module_key(rel), call_key))
                _mark_unresolved(
                    program,
                    f"{namespace}:dynamic:{identity_var}",
                    call_key,
                    rel,
                    line,
                )
        return program

    def _sources(self) -> tuple[tuple[str, str], ...]:
        result: list[tuple[str, str]] = []
        for path in sorted(p for p in self.workspace.rglob("*") if p.is_file()):
            try:
                relative = path.relative_to(self.workspace)
            except ValueError:
                continue
            if any(part in _EXCLUDED for part in relative.parts):
                continue
            rel = relative.as_posix()
            if is_test_source_path(rel) or path.suffix.lower() not in _EXTENSIONS:
                continue
            try:
                text = path.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            result.append((rel, text))
        return tuple(result)

    @staticmethod
    def _symbols(sources: tuple[tuple[str, str], ...]) -> dict[str, list[tuple[str, str, int]]]:
        result: dict[str, list[tuple[str, str, int]]] = {}
        for rel, text in sources:
            for match in _SYMBOL_RE.finditer(text):
                name = match.group(1) or match.group(2)
                if not name:
                    continue
                result.setdefault(name, []).append(
                    (f"symbol:{rel}:{name}", rel, _line(text, match.start()))
                )
        return result

    @staticmethod
    def _binding_key(namespace: str, identity: str) -> str:
        return f"generic-dispatch:{_safe(namespace)}:{_safe(identity)}"


def _mark_unresolved(
    program: SemanticProgram,
    identity: str,
    source_key: str,
    rel: str,
    line: int,
) -> None:
    key = f"framework-unresolved:GENERIC_DISPATCH:{_safe(identity)}:{source_key}"
    program.add_node(
        SemanticNodeFact(
            key,
            "UNRESOLVED_DYNAMIC_TARGET",
            f"GENERIC_DISPATCH:{identity}",
            rel,
            line,
            line,
            attributes={
                "frameworkBoundary": "GENERIC_DISPATCH",
                "boundaryIdentity": identity,
                "resolutionState": "UNRESOLVED",
            },
            coverage_state="LIMITED",
        )
    )
    program.add_edge(
        SemanticEdgeFact(
            "RESOLVES_TO",
            source_key,
            key,
            attributes={"frameworkBoundary": "GENERIC_DISPATCH"},
            coverage_state="LIMITED",
        )
    )
    if key not in program.unresolved_frontiers:
        program.unresolved_frontiers.append(key)


def _module_key(rel: str) -> str:
    if rel.endswith(".py"):
        return f"module:{rel[:-3].replace('/', '.')}"
    return f"module:{rel}"


def _safe(value: str) -> str:
    return re.sub(r"[^A-Za-z0-9_.:/-]+", "_", value)[:160] or "unknown"


def _line(text: str, offset: int) -> int:
    return text.count("\n", 0, max(0, offset)) + 1
