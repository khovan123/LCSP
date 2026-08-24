"""EngineeringRule corpus runtime grouped by lifecycle capability."""
from __future__ import annotations

import importlib.abc
import importlib.util
import sys
from typing import Final

from .registry.cache import EngineeringRuleCache
from .compilation.compiler import COMPILER_VERSION, PROMPT_VERSION, EngineeringRuleCompiler
from .compilation.fingerprint import engineering_rule_fingerprint
from .contract.legal_reasoning_contract import (
    LEGAL_REASONING_CONTRACT_SCHEMA_VERSION,
    LEGAL_REASONING_PLANNER_AUTHORITY,
    LegalReasoningContract,
    LegalReasoningContractValidationError,
    build_legal_reasoning_contract,
    validate_legal_reasoning_contract,
)
from .contract.models import ENGINEERING_RULE_SCHEMA_VERSION, EngineeringRule, GraphQueryTemplate
from .orchestration.service import EngineeringRuleService
from .contract.validator import EngineeringRuleValidationError, validate_engineering_rule

_CAPABILITY_MODULES: Final[dict[str, frozenset[str]]] = {
    "contract": frozenset({"models", "legal_reasoning_contract", "validator"}),
    "compilation": frozenset({"chunk_triage", "compiler", "fingerprint"}),
    "registry": frozenset({"cache", "precompiled_contract_overrides", "precompiled_registry"}),
    "orchestration": frozenset({"service"}),
}
_PREFIX = f"{__name__}."


def _owner(module: str) -> str | None:
    for capability, modules in _CAPABILITY_MODULES.items():
        if module in modules:
            return capability
    return None


def _canonical_engineering_rule_name(fullname: str) -> str | None:
    if not fullname.startswith(_PREFIX):
        return None
    parts = fullname[len(_PREFIX) :].split(".")
    if not parts:
        return None
    if parts[0] in _CAPABILITY_MODULES:
        if len(parts) >= 2:
            owner = _owner(parts[1])
            if owner is not None and owner != parts[0]:
                target = f"{_PREFIX}{owner}.{parts[1]}"
                tail = ".".join(parts[2:])
                return f"{target}.{tail}" if tail else target
        return None
    owner = _owner(parts[0])
    if owner is None:
        return None
    target = f"{_PREFIX}{owner}.{parts[0]}"
    tail = ".".join(parts[1:])
    return f"{target}.{tail}" if tail else target


class _EngineeringRuleCapabilityAliasFinder(importlib.abc.MetaPathFinder):
    """Route flat and moved-relative EngineeringRule imports to canonical owners."""

    def find_spec(self, fullname: str, path=None, target=None):  # type: ignore[override]
        canonical = _canonical_engineering_rule_name(fullname)
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


if not any(
    isinstance(finder, _EngineeringRuleCapabilityAliasFinder) for finder in sys.meta_path
):
    sys.meta_path.insert(0, _EngineeringRuleCapabilityAliasFinder())

__all__ = [
    "EngineeringRuleCache",
    "EngineeringRuleService",
    "COMPILER_VERSION",
    "PROMPT_VERSION",
    "EngineeringRuleCompiler",
    "engineering_rule_fingerprint",
    "ENGINEERING_RULE_SCHEMA_VERSION",
    "LEGAL_REASONING_CONTRACT_SCHEMA_VERSION",
    "LEGAL_REASONING_PLANNER_AUTHORITY",
    "EngineeringRule",
    "GraphQueryTemplate",
    "LegalReasoningContract",
    "LegalReasoningContractValidationError",
    "build_legal_reasoning_contract",
    "validate_legal_reasoning_contract",
    "EngineeringRuleValidationError",
    "validate_engineering_rule",
]
