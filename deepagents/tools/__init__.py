"""LCSP agent-facing authored tool namespace.

Only model-callable capability packages live physically under ``tools/``. Legacy
imports are redirected lazily to ``runtime/`` so implementation code can migrate
without re-expanding the model tool surface.
"""
from __future__ import annotations

import importlib.abc
import importlib.machinery
import importlib.util
import sys
from typing import Final


_RUNTIME_ALIASES: Final[dict[str, str]] = {
    "tools.clarification": "runtime.engineering_rule.clarification",
    "tools.classification": "runtime.classification",
    "tools.context": "runtime.orchestration.context",
    "tools.control": "runtime.orchestration.control",
    "tools.engineer_rule": "runtime.engineering_rule",
    "tools.gap": "runtime.reporting.gap",
    "tools.invocation": "runtime.orchestration.invocation",
    "tools.legal": "runtime.legal",
    "tools.reports": "runtime.reporting",
    "tools.common.agentic_evidence": "runtime.platform.agentic_evidence",
    "tools.common.dispatch": "runtime.platform.tool_dispatch",
    "tools.common.dossiers": "runtime.reporting.dossiers",
    "tools.common.llm": "runtime.platform.llm",
    "tools.common.managed": "runtime.orchestration.managed",
    "tools.common.package": "runtime.platform.package",
    "tools.common.platform": "runtime.platform.core",
    "tools.common.scripts": "runtime.platform.scripts",
    "tools.planner.investigation": "runtime.engineering_rule.planner.investigation",
    "tools.graph.scanner.program_graph": "runtime.graph",
    "tools.graph.scanner": "runtime.scanner",
}


class _RuntimeAliasFinder(importlib.abc.MetaPathFinder):
    """Resolve historical ``tools.*`` implementation imports from ``runtime.*``."""

    def find_spec(self, fullname: str, path=None, target=None):  # type: ignore[override]
        if fullname == "tools.graph":
            spec = importlib.machinery.ModuleSpec(fullname, loader=None, is_package=True)
            spec.submodule_search_locations = []
            return spec

        for legacy_prefix, runtime_prefix in sorted(
            _RUNTIME_ALIASES.items(), key=lambda item: len(item[0]), reverse=True
        ):
            if fullname != legacy_prefix and not fullname.startswith(f"{legacy_prefix}."):
                continue

            runtime_name = runtime_prefix + fullname[len(legacy_prefix) :]
            runtime_spec = importlib.util.find_spec(runtime_name)
            if runtime_spec is None:
                return None

            if runtime_spec.origin is None:
                spec = importlib.machinery.ModuleSpec(fullname, loader=None, is_package=True)
                spec.submodule_search_locations = list(
                    runtime_spec.submodule_search_locations or []
                )
                return spec

            locations = runtime_spec.submodule_search_locations
            return importlib.util.spec_from_file_location(
                fullname,
                runtime_spec.origin,
                submodule_search_locations=list(locations) if locations is not None else None,
            )
        return None


if not any(isinstance(finder, _RuntimeAliasFinder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _RuntimeAliasFinder())
