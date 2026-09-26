"""Ordered cross-provider fallback outside same-provider credential rotation."""
from __future__ import annotations

import os
import re

from langchain.agents.middleware import AgentMiddleware
from langchain.chat_models import init_chat_model

from middleware.billing_metering import active_billing_metering
from middleware.failure_policy import (
    TerminalCredentialError,
    error_status,
    is_auth_failure,
    is_provider_capacity_failure,
    is_provider_route_incompatibility,
    is_terminal_task_error,
)
from orchestration.agent_stream import publish_agent_stream_event
from middleware.token_fallback import credential_failure, model_provider
from model_policy import (
    PROVIDER_PRESETS,
    canonical_provider,
    model_name_from_spec,
    model_profile_init_kwargs,
    provider_init_kwargs,
)
from provider_credentials import (
    PROVIDER_KEY_ENV,
    credential_init_kwargs,
    provider_token_source,
)
from tools.common.capabilities.platform.logging import get_logger


logger = get_logger(__name__)
_FALLBACK_PROVIDER_ENV = re.compile(r"^LLM_FALLBACK_PROVIDER_(\d+)$")
_PERMANENT_PROVIDER_ROUTE_STATUSES = frozenset({401, 402, 403})


def configured_fallback_providers() -> tuple[str, ...]:
    """Return the ordered, de-duplicated provider fallback chain from environment."""
    indexed: list[tuple[int, str]] = []
    for env_name, raw_value in os.environ.items():
        match = _FALLBACK_PROVIDER_ENV.fullmatch(env_name)
        if match is None:
            continue
        value = raw_value.strip()
        if not value:
            continue
        provider = canonical_provider(value)
        if provider not in PROVIDER_PRESETS:
            supported = ", ".join(PROVIDER_PRESETS)
            raise RuntimeError(f"{env_name} must be one of: {supported}")
        if provider_token_source(provider) is None:
            required = " or ".join(PROVIDER_KEY_ENV[provider])
            raise RuntimeError(f"{env_name}={provider} requires {required}")
        indexed.append((int(match.group(1)), provider))

    providers: list[str] = []
    seen: set[str] = set()
    for _, provider in sorted(indexed, key=lambda item: item[0]):
        if provider in seen:
            continue
        seen.add(provider)
        providers.append(provider)
    return tuple(providers)


def _contains_terminal_credential_error(error: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, TerminalCredentialError):
            return True
        current = current.__cause__ or current.__context__
    return False


def provider_fallback_failure(error: BaseException) -> bool:
    """Return whether a provider-level route may be attempted for this failure."""
    if _contains_terminal_credential_error(error):
        return True
    if is_provider_route_incompatibility(error):
        return True
    if is_terminal_task_error(error):
        return False
    return (
        is_auth_failure(error)
        or is_provider_capacity_failure(error)
        or credential_failure(error)
    )


def provider_circuit_breaker_failure(error: BaseException) -> bool:
    """Return whether this provider route should stay disabled for the active run."""
    if is_provider_route_incompatibility(error):
        return True
    if is_terminal_task_error(error):
        return False
    return (
        error_status(error) in _PERMANENT_PROVIDER_ROUTE_STATUSES
    )


def _provider_route_disabled(provider: str | None) -> bool:
    session = active_billing_metering()
    return session is not None and session.provider_route_disabled(provider)


def _trip_provider_circuit(provider: str | None, error: BaseException) -> None:
    if not provider or not provider_circuit_breaker_failure(error):
        return
    session = active_billing_metering()
    if session is None or session.provider_route_disabled(provider):
        return
    session.disable_provider_route(provider)
    logger.warning(
        "MODEL_PROVIDER_CIRCUIT_OPENED",
        provider=provider,
        status_code=error_status(error),
        run_id=session.run_id,
    )
    # Circuit state is technical provider-routing telemetry. The customer-visible
    # fallback attempt below already carries the meaningful activity and technical
    # provider details, so do not emit a second bespoke stream event.


def fallback_model(provider: str):
    """Construct one provider-preset model using only that provider's credentials."""
    canonical = canonical_provider(provider)
    preset = PROVIDER_PRESETS[canonical]
    model_name = model_name_from_spec(preset.reasoning_model)
    return init_chat_model(
        preset.reasoning_model,
        **provider_init_kwargs(canonical),
        **model_profile_init_kwargs(canonical, model_name),
        **credential_init_kwargs(canonical),
    )


class ProviderFallbackMiddleware(AgentMiddleware):
    """Move to the next configured provider after the current provider pool fails.

    Same-provider key rotation remains the responsibility of TokenFallbackMiddleware,
    which must be nested inside this middleware in the governance chain. Permanent
    route failures are remembered only inside the active billing/run session.
    """

    @staticmethod
    def _routes(request) -> tuple[str, ...]:
        current = model_provider(request.model)
        return tuple(
            provider
            for provider in configured_fallback_providers()
            if provider != current and not _provider_route_disabled(provider)
        )

    @staticmethod
    def _log_attempt(*, current_provider: str | None, provider: str, index: int) -> None:
        session = active_billing_metering()
        publish_visible = (
            session is None
            or session.provider_fallback_should_publish(current_provider, provider)
        )
        logger.warning(
            "MODEL_PROVIDER_FALLBACK_ATTEMPT",
            current_provider=current_provider or "unknown",
            fallback_provider=provider,
            fallback_index=index,
            stream_published=publish_visible,
        )
        if not publish_visible:
            return
        publish_agent_stream_event(
            "PROVIDER_FALLBACK",
            status="RUNNING",
            text="provider fallback attempt",
            data={
                "current_provider": current_provider or "unknown",
                "fallback_provider": provider,
                "fallback_index": index,
            },
        )

    @staticmethod
    def _log_circuit_skip(provider: str) -> None:
        logger.info("MODEL_PROVIDER_CIRCUIT_SKIP", provider=provider)
        # The subsequent PROVIDER_FALLBACK event is the customer-visible activity.
        # Keep circuit skips in structured logs only to avoid stream-contract drift.

    def wrap_model_call(self, request, handler):
        current_provider = model_provider(request.model)
        routes = self._routes(request)
        first_error: BaseException | None = None

        if not _provider_route_disabled(current_provider):
            try:
                return handler(request)
            except Exception as error:
                if not provider_fallback_failure(error):
                    raise
                _trip_provider_circuit(current_provider, error)
                first_error = error
        elif current_provider:
            self._log_circuit_skip(current_provider)

        for index, provider in enumerate(routes, start=1):
            self._log_attempt(
                current_provider=current_provider,
                provider=provider,
                index=index,
            )
            try:
                return handler(request.override(model=fallback_model(provider)))
            except Exception as error:
                if not provider_fallback_failure(error):
                    raise
                _trip_provider_circuit(provider, error)
                first_error = first_error or error

        raise TerminalCredentialError(
            "All configured LLM provider routes exhausted; task stopped"
        ) from first_error

    async def awrap_model_call(self, request, handler):
        current_provider = model_provider(request.model)
        routes = self._routes(request)
        first_error: BaseException | None = None

        if not _provider_route_disabled(current_provider):
            try:
                return await handler(request)
            except Exception as error:
                if not provider_fallback_failure(error):
                    raise
                _trip_provider_circuit(current_provider, error)
                first_error = error
        elif current_provider:
            self._log_circuit_skip(current_provider)

        for index, provider in enumerate(routes, start=1):
            self._log_attempt(
                current_provider=current_provider,
                provider=provider,
                index=index,
            )
            try:
                return await handler(request.override(model=fallback_model(provider)))
            except Exception as error:
                if not provider_fallback_failure(error):
                    raise
                _trip_provider_circuit(provider, error)
                first_error = first_error or error

        raise TerminalCredentialError(
            "All configured LLM provider routes exhausted; task stopped"
        ) from first_error


__all__ = [
    "ProviderFallbackMiddleware",
    "configured_fallback_providers",
    "fallback_model",
    "provider_circuit_breaker_failure",
    "provider_fallback_failure",
]
