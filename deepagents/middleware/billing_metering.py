"""Single governed model boundary for prepaid usage metering.

This module intentionally persists numeric provider usage only. Prompt content,
model messages and hidden reasoning are never included in the billing payload.
"""

from __future__ import annotations

from contextlib import contextmanager
from contextvars import ContextVar
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Iterator
from uuid import uuid4

from langchain.agents.middleware import AgentMiddleware

from middleware.token_fallback import model_provider
from tools.common.capabilities.platform.api_client import (
    WorkerApiClient,
    WorkerCallbackError,
)
from tools.common.capabilities.platform.callback_schemas import SettledUsagePayload


class BillingUsageUnavailable(RuntimeError):
    """Provider returned no complete numeric usage metadata."""


class BillingReservationUnavailable(RuntimeError):
    """The broker replay found a reservation that is no longer spendable."""


class BillingMeteringError(WorkerCallbackError):
    """Usage delivery failed after a provider response was received."""

    def __init__(self, cause: BaseException) -> None:
        status_code = getattr(cause, "status_code", None)
        super().__init__("Billing usage delivery failed", status_code=status_code)
        self.callback_client_error = bool(
            getattr(cause, "callback_client_error", False)
        )


_active_agent_role: ContextVar[str | None] = ContextVar(
    "active_billing_agent_role", default=None
)


@dataclass
class BillingMeteringSession:
    """Durable identity and API port for one reserved run/invocation group."""

    api_client: WorkerApiClient
    assessment_id: str
    run_id: str
    reservation_id: str
    agent_role: str
    effective_runtime_model: dict[str, str] = field(default_factory=dict)
    _invocation_ids: set[str] = field(default_factory=set, init=False)

    @classmethod
    def reserve(
        cls,
        *,
        api_client: WorkerApiClient,
        assessment_id: str,
        run_id: str,
        agent_role: str,
        amount_credits: str,
        max_charge_credits: str,
        idempotency_key: str,
        effective_runtime_model: dict[str, str] | None = None,
    ) -> "BillingMeteringSession":
        from tools.common.capabilities.platform.callback_schemas import (
            BillingReservationPayload,
        )

        result = api_client.reserve_billing_credits(
            BillingReservationPayload(
                assessmentId=assessment_id,
                runId=run_id,
                amountCredits=amount_credits,
                maxChargeCredits=max_charge_credits,
                idempotencyKey=idempotency_key,
            )
        )
        reservation_id = result.get("id") or result.get("reservationId")
        if not isinstance(reservation_id, str) or not reservation_id:
            raise RuntimeError("Billing reservation response did not include an id")
        status = result.get("status")
        if status is not None and status != "RESERVED":
            raise BillingReservationUnavailable(
                f"Billing reservation is not spendable: {status}"
            )
        return cls(
            api_client=api_client,
            assessment_id=assessment_id,
            run_id=run_id,
            reservation_id=reservation_id,
            agent_role=agent_role,
            effective_runtime_model=dict(effective_runtime_model or {}),
        )

    def release(self) -> None:
        from tools.common.capabilities.platform.callback_schemas import (
            BillingReservationReleasePayload,
        )

        self.api_client.release_billing_reservation(
            self.reservation_id,
            BillingReservationReleasePayload(assessmentId=self.assessment_id),
        )

    def new_invocation_id(self) -> str:
        invocation_id = str(uuid4())
        self._invocation_ids.add(invocation_id)
        return invocation_id

    def record(
        self,
        response: Any,
        model: Any,
        invocation_id: str,
        *,
        agent_role: str | None = None,
    ) -> None:
        usage = extract_provider_usage(response, model)
        if usage is None:
            usage = {}
            response_id = _response_identity(response)
            if response_id:
                usage["providerResponseId"] = response_id
        provider, model_name = provider_identity(model, response)
        payload = SettledUsagePayload(
            assessmentId=self.assessment_id,
            runId=self.run_id,
            reservationId=self.reservation_id,
            invocationId=invocation_id,
            agentRole=agent_role or self.agent_role,
            providerResponseId=usage.pop("providerResponseId", None),
            provider=provider,
            model=model_name,
            effectiveRuntimeModel=(
                {
                    **self.effective_runtime_model,
                    "provider": provider,
                    "model": model_name,
                }
                if self.effective_runtime_model
                else None
            ),
            occurredAt=datetime.now(timezone.utc).isoformat(),
            **usage,
        )
        try:
            self.api_client.post_settled_usage(payload)
        except BillingMeteringError:
            raise
        except Exception as error:
            raise BillingMeteringError(error) from error


_active_session: ContextVar[BillingMeteringSession | None] = ContextVar(
    "active_billing_metering_session", default=None
)


@contextmanager
def activate_billing_metering(
    session: BillingMeteringSession | None,
) -> Iterator[BillingMeteringSession | None]:
    token = _active_session.set(session)
    try:
        yield session
    finally:
        _active_session.reset(token)


def active_billing_metering() -> BillingMeteringSession | None:
    return _active_session.get()


@contextmanager
def activate_billing_agent_role(agent_role: str) -> Iterator[str]:
    token = _active_agent_role.set(agent_role)
    try:
        yield agent_role
    finally:
        _active_agent_role.reset(token)


def active_billing_agent_role() -> str | None:
    return _active_agent_role.get()


class BillingAgentRoleMiddleware(AgentMiddleware):
    """Attach the canonical policy role to every model call of one agent."""

    def __init__(self, agent_role: str):
        self.agent_role = agent_role

    def wrap_model_call(self, request, handler):
        with activate_billing_agent_role(self.agent_role):
            return handler(request)

    async def awrap_model_call(self, request, handler):
        with activate_billing_agent_role(self.agent_role):
            return await handler(request)


class BillingMeteringMiddleware(AgentMiddleware):
    """Meter each actual downstream provider response exactly once."""

    def wrap_model_call(self, request, handler):
        session = active_billing_metering()
        if session is None:
            return handler(request)
        invocation_id = session.new_invocation_id()
        response = handler(request)
        session.record(
            response,
            request.model,
            invocation_id,
            agent_role=active_billing_agent_role(),
        )
        return response

    async def awrap_model_call(self, request, handler):
        session = active_billing_metering()
        if session is None:
            return await handler(request)
        invocation_id = session.new_invocation_id()
        response = await handler(request)
        session.record(
            response,
            request.model,
            invocation_id,
            agent_role=active_billing_agent_role(),
        )
        return response


def provider_identity(model: Any, response: Any | None = None) -> tuple[str, str]:
    provider = model_provider(model) or getattr(model, "provider", None)
    provider = provider or getattr(model, "_llm_type", None) or "UNKNOWN"
    response_metadata = getattr(response, "response_metadata", None)
    if isinstance(response_metadata, dict):
        provider = provider if provider != "UNKNOWN" else response_metadata.get("provider", provider)
    model_name = (
        getattr(model, "model_name", None)
        or getattr(model, "model", None)
        or getattr(model, "model_id", None)
        or (response_metadata.get("model") if isinstance(response_metadata, dict) else None)
        or (response_metadata.get("model_name") if isinstance(response_metadata, dict) else None)
        or "UNKNOWN"
    )
    return str(provider).upper(), str(model_name)


def extract_provider_usage(response: Any, model: Any) -> dict[str, Any] | None:
    """Normalize LangChain/provider numeric usage without inferring missing fields."""
    metadata = _usage_metadata(response)
    if not isinstance(metadata, dict):
        return None

    input_tokens = _number(
        metadata,
        "input_tokens",
        "prompt_tokens",
        "promptTokenCount",
        "inputTokenCount",
    )
    output_tokens = _number(
        metadata,
        "output_tokens",
        "completion_tokens",
        "candidates_tokens",
        "candidatesTokenCount",
        "outputTokenCount",
    )
    if input_tokens is None or output_tokens is None:
        return None

    result: dict[str, Any] = {
        "inputTokens": str(input_tokens),
        "outputTokens": str(output_tokens),
    }
    nested_input = metadata.get("input_token_details")
    nested_output = metadata.get("output_token_details")
    if isinstance(nested_input, dict):
        metadata = {**metadata, **nested_input}
    if isinstance(nested_output, dict):
        metadata = {**metadata, **nested_output}
    optional = (
        (
            "cachedInputTokens",
            "cached_input_tokens",
            "cache_read_input_tokens",
            "cache_read",
            "cached_tokens",
            "cache_read_tokens",
            "cached_content_token_count",
            "cachedContentTokenCount",
        ),
        (
            "cacheWriteTokens",
            "cache_creation_input_tokens",
            "cache_write_input_tokens",
            "cache_creation",
            "cache_creation_tokens",
            "cache_write_tokens",
            "cacheWriteTokenCount",
        ),
        (
            "reasoningTokens",
            "reasoning_tokens",
            "reasoning",
            "thoughts_token_count",
            "reasoningTokenCount",
        ),
        ("totalTokens", "total_tokens", "total_token_count", "totalTokenCount"),
    )
    for target, *keys in optional:
        value = _number(metadata, *keys)
        if value is not None:
            result[target] = str(value)
    response_id = _response_identity(response)
    if response_id:
        result["providerResponseId"] = response_id
    return result


def _usage_metadata(response: Any) -> dict[str, Any] | None:
    candidates = [getattr(response, "usage_metadata", None)]
    response_metadata = getattr(response, "response_metadata", None)
    if isinstance(response_metadata, dict):
        candidates.extend(
            [
                response_metadata.get("token_usage"),
                response_metadata.get("usage"),
                response_metadata,
            ]
        )
    result = getattr(response, "result", None)
    if isinstance(result, (list, tuple)):
        candidates.extend(getattr(item, "usage_metadata", None) for item in result)
        candidates.extend(getattr(item, "response_metadata", None) for item in result)
    for candidate in candidates:
        if isinstance(candidate, dict):
            return candidate
    return None


def _response_identity(response: Any) -> str | None:
    for source in (response, *(getattr(response, "result", None) or ())):
        metadata = getattr(source, "response_metadata", None)
        if isinstance(metadata, dict):
            for key in ("id", "response_id", "responseId", "request_id"):
                value = metadata.get(key)
                if value:
                    return str(value)
        value = getattr(source, "id", None)
        if value:
            return str(value)
    return None


def _number(value: dict[str, Any], *keys: str) -> int | None:
    for key in keys:
        candidate = value.get(key)
        if isinstance(candidate, bool):
            return None
        if isinstance(candidate, int) and candidate >= 0:
            return candidate
        if isinstance(candidate, str) and candidate.isdigit():
            return int(candidate)
    return None


__all__ = [
    "BillingMeteringMiddleware",
    "BillingAgentRoleMiddleware",
    "BillingMeteringSession",
    "BillingMeteringError",
    "BillingUsageUnavailable",
    "BillingReservationUnavailable",
    "activate_billing_metering",
    "active_billing_metering",
    "active_billing_agent_role",
    "activate_billing_agent_role",
    "extract_provider_usage",
]
