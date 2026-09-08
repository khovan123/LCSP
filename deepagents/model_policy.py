"""Role-specific model policy for the LCSP Managed Deep Agents graph."""

from __future__ import annotations

import os
from dataclasses import dataclass


DEFAULT_ROOT_MODEL_SPEC = "openai:gpt-4o-mini"
DEFAULT_TRIAGE_MODEL_SPEC = "openai:gpt-4o-mini"
DEFAULT_PLANNER_MODEL_SPEC = "openai:gpt-4o-mini"
DEFAULT_INTERVIEW_MODEL_SPEC = "openai:gpt-4o-mini"
DEFAULT_INVESTIGATOR_MODEL_SPEC = "openai:gpt-4o-mini"


@dataclass(frozen=True)
class EffectiveModelConfig:
    role: str
    provider: str
    model: str
    source: str
    client: str = "chat_completions"
    tools: bool = True
    reasoning_effort: str = "unset"


def _reasoning_effort_status() -> str:
    for env_name in (
        "LCSP_REASONING_EFFORT",
        "OPENAI_REASONING_EFFORT",
        "REASONING_EFFORT",
    ):
        value = (os.getenv(env_name) or "").strip()
        if value:
            return value
    return "unset"


def _model_spec(env_name: str, default: str) -> tuple[str, str]:
    """Resolve one LangChain ``provider:model`` spec with a fail-closed shape check."""
    env_value = (os.getenv(env_name) or "").strip()
    value = env_value or default
    if not value or ":" not in value:
        raise RuntimeError(f"{env_name} must use LangChain provider:model format")
    return value, "env" if env_value else "default"


ROOT_MODEL_SPEC, ROOT_MODEL_SOURCE = _model_spec(
    "LCSP_ROOT_AGENT_MODEL", DEFAULT_ROOT_MODEL_SPEC
)
TRIAGE_MODEL_SPEC, TRIAGE_MODEL_SOURCE = _model_spec(
    "LCSP_TRIAGE_MODEL", DEFAULT_TRIAGE_MODEL_SPEC
)
PLANNER_MODEL_SPEC, PLANNER_MODEL_SOURCE = _model_spec(
    "LCSP_PLANNER_MODEL", DEFAULT_PLANNER_MODEL_SPEC
)
INTERVIEW_MODEL_SPEC, INTERVIEW_MODEL_SOURCE = _model_spec(
    "LCSP_INTERVIEW_MODEL", DEFAULT_INTERVIEW_MODEL_SPEC
)
INVESTIGATOR_MODEL_SPEC, INVESTIGATOR_MODEL_SOURCE = _model_spec(
    "LCSP_INVESTIGATOR_MODEL", DEFAULT_INVESTIGATOR_MODEL_SPEC
)

SUBAGENT_MODEL_SPECS = {
    "triage": TRIAGE_MODEL_SPEC,
    "planner": PLANNER_MODEL_SPEC,
    "interview": INTERVIEW_MODEL_SPEC,
    "investigator": INVESTIGATOR_MODEL_SPEC,
}

# Every model used by this graph receives the same LCSP harness restrictions.
ALL_LCSP_MODEL_SPECS = tuple(
    dict.fromkeys(
        (
            ROOT_MODEL_SPEC,
            TRIAGE_MODEL_SPEC,
            PLANNER_MODEL_SPEC,
            INTERVIEW_MODEL_SPEC,
            INVESTIGATOR_MODEL_SPEC,
        )
    )
)


def effective_model_configs() -> tuple[EffectiveModelConfig, ...]:
    """Return non-secret model telemetry for startup diagnostics."""
    reasoning_effort = _reasoning_effort_status()
    role_specs = (
        ("root", ROOT_MODEL_SPEC, ROOT_MODEL_SOURCE),
        ("triage", TRIAGE_MODEL_SPEC, TRIAGE_MODEL_SOURCE),
        ("planner", PLANNER_MODEL_SPEC, PLANNER_MODEL_SOURCE),
        ("interview", INTERVIEW_MODEL_SPEC, INTERVIEW_MODEL_SOURCE),
        ("investigator", INVESTIGATOR_MODEL_SPEC, INVESTIGATOR_MODEL_SOURCE),
    )
    configs: list[EffectiveModelConfig] = []
    for role, spec, source in role_specs:
        provider, model = spec.split(":", 1)
        configs.append(
            EffectiveModelConfig(
                role=role,
                provider=provider,
                model=model,
                source=source,
                reasoning_effort=reasoning_effort,
            )
        )
    return tuple(configs)
