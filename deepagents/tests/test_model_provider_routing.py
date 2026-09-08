from __future__ import annotations

import harness
from model_policy import (
    REASONING_EFFORT,
    _model_spec,
    canonical_provider,
    openai_responses_init_kwargs,
    provider_client,
    provider_init_kwargs,
    providers_for_model_specs,
)


def test_provider_aliases_route_to_langchain_canonical_keys(monkeypatch) -> None:
    monkeypatch.setenv("LCSP_PLANNER_MODEL", "googleai:gemini-3.1-pro-preview")

    model_spec, source = _model_spec(
        "LCSP_PLANNER_MODEL",
        "openai:gpt-5.6-sol",
    )

    assert model_spec == "google_genai:gemini-3.1-pro-preview"
    assert source == "env"
    assert canonical_provider("Google-AI") == "google_genai"


def test_provider_constructor_kwargs_are_isolated() -> None:
    assert provider_init_kwargs("openai") == openai_responses_init_kwargs()
    assert provider_init_kwargs("anthropic") == {}
    assert provider_init_kwargs("google_genai") == {}

    assert provider_client("openai") == "responses_api"
    assert provider_client("anthropic") == "anthropic"
    assert provider_client("googleai") == "google_genai"

    openai_kwargs = provider_init_kwargs("openai")
    assert openai_kwargs["reasoning"] == {"effort": REASONING_EFFORT}
    assert "use_responses_api" not in provider_init_kwargs("anthropic")
    assert "reasoning" not in provider_init_kwargs("google_genai")


def test_active_provider_routes_preserve_first_seen_order() -> None:
    specs = (
        "openai:gpt-5.6-sol",
        "anthropic:claude-sonnet-4-6",
        "google_genai:gemini-3.1-pro-preview",
        "openai:gpt-5.6-terra",
    )

    assert providers_for_model_specs(specs) == (
        "openai",
        "anthropic",
        "google_genai",
    )


def test_harness_registers_each_active_provider_without_cross_provider_kwargs(
    monkeypatch,
) -> None:
    mixed_specs = (
        "openai:gpt-5.6-sol",
        "anthropic:claude-sonnet-4-6",
        "google_genai:gemini-3.1-pro-preview",
    )
    provider_registrations: list[tuple[str, object]] = []
    harness_registrations: list[tuple[str, object]] = []

    monkeypatch.setattr(harness, "ALL_LCSP_MODEL_SPECS", mixed_specs)
    monkeypatch.setattr(
        harness,
        "register_provider_profile",
        lambda key, profile: provider_registrations.append((key, profile)),
    )
    monkeypatch.setattr(
        harness,
        "register_harness_profile",
        lambda model_spec, profile: harness_registrations.append(
            (model_spec, profile)
        ),
    )

    harness.configure_lcsp_harness()

    assert tuple(key for key, _ in provider_registrations) == (
        "openai",
        "anthropic",
        "google_genai",
    )

    profiles = {key: profile for key, profile in provider_registrations}
    assert dict(profiles["openai"].init_kwargs) == openai_responses_init_kwargs()
    assert dict(profiles["anthropic"].init_kwargs) == {}
    assert dict(profiles["google_genai"].init_kwargs) == {}

    assert tuple(model_spec for model_spec, _ in harness_registrations) == mixed_specs
    assert all(
        profile is harness.LCSP_HARNESS_PROFILE
        for _, profile in harness_registrations
    )
