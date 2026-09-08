"""Role-specific model policy for the LCSP Managed Deep Agents graph."""

from __future__ import annotations

import os
from dataclasses import dataclass


DEFAULT_ROOT_MODEL_SPEC = "openai:gpt-5.6-terra"
DEFAULT_TRIAGE_MODEL_SPEC = "openai:gpt-5.6-sol"
DEFAULT_PLANNER_MODEL_SPEC = "openai:gpt-5.6-sol"
DEFAULT_INTERVIEW_MODEL_SPEC = "openai:gpt-5.6-sol"
DEFAULT_INVESTIGATOR_MODEL_SPEC = "openai:gpt-5.6-terra"

DEFAULT_REASONING_EFFORT = "medium"
RESPONSES_OUTPUT_VERSION = "responses/v1"
SUPPORTED_REASONING_EFFORTS = frozenset(
    {
        "none",
        "low",
        "medium",
        "high",
        "xhigh",
        "max",
    }
)


@dataclass(frozen=True)
class EffectiveModelConfig:
    role: str
    provider: str
    model: str
    source: str
    client: str
    tools: bool = True
    reasoning_effort: str = "provider_default"
    output_version: str = "provider_default"


def _reasoning_effort_status() -> str:
    """Resolve the OpenAI Responses API reasoning effort with fail-closed validation."""
    for env_name in (
        "LCSP_REASONING_EFFORT",
        "OPENAI_REASONING_EFFORT",
        "REASONING_EFFORT",
    ):
        value = (os.getenv(env_name) or "").strip().lower()
        if not value:
            continue
        if value not in SUPPORTED_REASONING_EFFORTS:
            supported = ", ".join(sorted(SUPPORTED_REASONING_EFFORTS))
            raise RuntimeError(
                f"{env_name} must be one of the supported reasoning efforts: {supported}"
            )
        return value
    return DEFAULT_REASONING_EFFORT


def _model_spec(env_name: str, default: str) -> tuple[str, str]:
    """Resolve one LangChain ``provider:model`` spec with a fail-closed shape check."""
    env_value = (os.getenv(env_name) or "").strip()
    value = env_value or default
    if not value or ":" not in value:
        raise RuntimeError(f"{env_name} must use LangChain provider:model format")
    return value, "env" if env_value else "default"


REASONING_EFFORT = _reasoning_effort_status()

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


def openai_responses_init_kwargs() -> dict[str, object]:
    """Return the explicit OpenAI Responses API construction contract for LCSP."""
    return {
        "use_responses_api": True,
        "output_version": RESPONSES_OUTPUT_VERSION,
        "reasoning": {"effort": REASONING_EFFORT},
    }


def effective_model_configs() -> tuple[EffectiveModelConfig, ...]:
    """Return non-secret model telemetry for startup diagnostics."""
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
        is_openai = provider == "openai"
        configs.append(
            EffectiveModelConfig(
                role=role,
                provider=provider,
                model=model,
                source=source,
                client="responses_api" if is_openai else "provider_default",
                reasoning_effort=(
                    REASONING_EFFORT if is_openai else "provider_default"
                ),
                output_version=(
                    RESPONSES_OUTPUT_VERSION if is_openai else "provider_default"
                ),
            )
        )
    return tuple(configs)
