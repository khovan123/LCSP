"""LLM runtime grouped by client entrypoint and owned support capabilities."""
from __future__ import annotations

import importlib.abc
import importlib.util
import sys
from typing import Final

from .deep_agent_client import (
    DeepAgentClient,
    LLMResponse,
    LLMStructuredResponse,
    LLMToolCall,
    LLMToolDefinition,
    LLMToolResponse,
)
from .providers.fallback_client import (
    LLMClientProtocol,
    LlmProviderCandidate,
    LlmProviderUnavailableError,
    PrimaryThenFallbackLLMClient,
    classify_provider_error,
    llm_limit_wait_reason,
)
from .safety.prompt_safety import PromptSafetyViolation, check_prompt_safety
from .budget.budget_tracker import BudgetTracker, BudgetExceeded

_CAPABILITY_MODULES: Final[dict[str, frozenset[str]]] = {
    "providers": frozenset({"fallback_client"}),
    "budget": frozenset({"budget_tracker"}),
    "safety": frozenset({"prompt_safety"}),
    "sandbox": frozenset({"docker_sandbox"}),
}
_ROOT_MODULES: Final[frozenset[str]] = frozenset({"deep_agent_client"})
_PREFIX = f"{__name__}."


def _owner(module: str) -> str | None:
    for capability, modules in _CAPABILITY_MODULES.items():
        if module in modules:
            return capability
    return None


def _canonical_llm_name(fullname: str) -> str | None:
    if not fullname.startswith(_PREFIX):
        return None
    parts = fullname[len(_PREFIX) :].split(".")
    if not parts:
        return None
    if parts[0] in _ROOT_MODULES or parts[0] == "deep_agent_skills":
        return None
    if parts[0] in _CAPABILITY_MODULES:
        if len(parts) >= 2:
            nested = parts[1]
            tail = ".".join(parts[2:])
            if nested in _ROOT_MODULES:
                target = f"{_PREFIX}{nested}"
                return f"{target}.{tail}" if tail else target
            owner = _owner(nested)
            if owner is not None and owner != parts[0]:
                target = f"{_PREFIX}{owner}.{nested}"
                return f"{target}.{tail}" if tail else target
        return None
    owner = _owner(parts[0])
    if owner is None:
        return None
    target = f"{_PREFIX}{owner}.{parts[0]}"
    tail = ".".join(parts[1:])
    return f"{target}.{tail}" if tail else target


class _LlmCapabilityAliasFinder(importlib.abc.MetaPathFinder):
    """Route flat and moved-relative LLM support imports to canonical owners."""

    def find_spec(self, fullname: str, path=None, target=None):  # type: ignore[override]
        canonical = _canonical_llm_name(fullname)
        if canonical is None or canonical == fullname:
            return None
        spec = importlib.util.find_spec(canonical)
        if spec is None or spec.origin is None:
            return None
        locations = spec.submodule_search_locations
        return importlib.util.spec_from_file_location(
            fullname,
            spec.origin,
            submodule_search_locations=list(locations) if locations is not None else None,
        )


if not any(isinstance(finder, _LlmCapabilityAliasFinder) for finder in sys.meta_path):
    sys.meta_path.insert(0, _LlmCapabilityAliasFinder())

__all__ = [
    "DeepAgentClient",
    "LLMResponse",
    "LLMStructuredResponse",
    "LLMToolCall",
    "LLMToolDefinition",
    "LLMToolResponse",
    "LLMClientProtocol",
    "LlmProviderCandidate",
    "LlmProviderUnavailableError",
    "PrimaryThenFallbackLLMClient",
    "classify_provider_error",
    "llm_limit_wait_reason",
    "PromptSafetyViolation",
    "check_prompt_safety",
    "BudgetTracker",
    "BudgetExceeded",
]
