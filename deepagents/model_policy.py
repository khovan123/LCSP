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

# LangChain provider identifiers are canonical routing keys. Deployment-friendly
# aliases are normalized before Deep Agents resolves provider:model specs.
PROVIDER_ALIASES = {
    "google": "google_genai",
    "google_ai": "google_genai",
    "googleai": "google_genai",
    "gemini": "google_genai",
}

PROVIDER_CLIENTS = {
    "openai": "responses_api",
    "anthropic": "anthropic",
    "google_genai": "google_genai",
}


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
    router: str = "langchain_init_chat_model"


def canonical_provider(provider: str) -> str:
    """Return the canonical LangChain provider key used for model routing."""
    normalized = provider.strip().lower().replace("-", "_")
    if not normalized:
        raise RuntimeError("model provider must not be blank")
    return PROVIDER_ALIASES.get(normalized, normalized)


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


def normalize_model_spec(value: str, *, source_name: str = "model spec") -> str:
    """Normalize one ``provider:model`` spec to a canonical LangChain provider key."""
    provider, separator, model = value.strip().partition(":")
    if not separator or not provider.strip() or not model.strip() or ":" in model:
        raise RuntimeError(f"{source_name} must use LangChain provider:model format")
    return f"{canonical_provider(provider)}:{model.strip()}"


def _model_spec(env_name: str, default: str) -> tuple[str, str]:
    """Resolve one LangChain ``provider:model`` spec with a fail-closed shape check."""
    env_value = (os.getenv(env_name) or "").strip()
    value = env_value or default
    return (
        normalize_model_spec(value, source_name=env_name),
        "env" if env_value else "default",
    )


def provider_from_model_spec(spec: str) -> str:
    """Return the canonical provider routing key from one model spec."""
    normalized = normalize_model_spec(spec)
    provider, _, _ = normalized.partition(":")
    return provider


def providers_for_model_specs(model_specs: tuple[str, ...]) -> tuple[str, ...]:
    """Return active provider routing keys in first-seen order."""
    return tuple(dict.fromkeys(provider_from_model_spec(spec) for spec in model_specs))


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


def provider_init_kwargs(provider: str) -> dict[str, object]:
    """Return constructor kwargs scoped to one provider only.

    The provider:model prefix selects the LangChain integration. OpenAI additionally
    needs the LCSP Responses API contract. Other providers intentionally receive no
    OpenAI-only kwargs and use their native LangChain constructor defaults.
    """
    canonical = canonical_provider(provider)
    if canonical == "openai":
        return openai_responses_init_kwargs()
    return {}


def provider_client(provider: str) -> str:
    """Return non-secret telemetry describing the selected provider client."""
    canonical = canonical_provider(provider)
    return PROVIDER_CLIENTS.get(canonical, "langchain_provider_default")


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
                client=provider_client(provider),
                reasoning_effort=(
                    REASONING_EFFORT if is_openai else "provider_default"
                ),
                output_version=(
                    RESPONSES_OUTPUT_VERSION if is_openai else "provider_default"
                ),
            )
        )
    return tuple(configs)
