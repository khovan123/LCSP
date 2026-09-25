"""Single governed model boundary for prepaid usage metering.

This module intentionally persists numeric provider usage only. Prompt content,
model messages and hidden reasoning are never included in the billing payload.
"""

from __future__ import annotations

import math
import time
from contextlib import contextmanager
from contextvars import ContextVar, copy_context
from dataclasses import dataclass, field
from datetime import datetime, timezone
from threading import Event, Thread
from typing import Any, Iterator
from uuid import uuid4

from langchain.agents.middleware import AgentMiddleware

from middleware.billing_recovery import (
    enqueue_release,
    enqueue_usage_and_release,
)
from middleware.token_fallback import model_provider
from orchestration.agent_stream import publish_agent_stream_event
from provider_credentials import llm_provider_timeout_seconds
from tools.common.capabilities.platform.api_client import (
    WorkerApiClient,
    WorkerCallbackError,
)
from tools.common.capabilities.platform.callback_schemas import SettledUsagePayload


_MODEL_CALL_HEARTBEAT_SECONDS = 10.0


class BillingUsageUnavailable(RuntimeError):
    """Provider returned no complete numeric usage metadata."""


class BillingReservationUnavailable(RuntimeError):
    """The broker replay found a reservation that is no longer spendable."""


class BillingMeteringError(WorkerCallbackError):
    """Usage delivery failed after a provider response was received."""

    def __init__(self, cause: BaseException) -> None:
        status_code = getattr(cause, "status_code", None)
        super().__init__("Billing usage delivery failed", status_code=status_code)
        # A provider response has already been received. Retrying the model
        # would create a second billable invocation; delivery recovery must
        # use the same invocation/response identity instead.
        self.callback_client_error = True


class BillingFinalizationError(WorkerCallbackError):
    """Reservation finalization failed after model work completed."""

    def __init__(self, cause: BaseException) -> None:
        super().__init__("Billing reservation finalization failed")
        self.callback_client_error = True
        self.__cause__ = cause


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
    workspace_id: str | None = None
    scan_job_id: str | None = None
    thread_id: str | None = None
    invocation_id: str | None = None
    model_invocation_id: str | None = None
    effective_runtime_model: dict[str, str] = field(default_factory=dict)
    recovery_store_path: str | None = None
    max_input_tokens: int | None = None
    max_input_bytes: int | None = None
    max_output_tokens: int | None = None
    max_reasoning_tokens: int | None = None
    max_invocations: int | None = None
    reserved_provider: str = ""
    reserved_model: str = ""
    authorized_models: set[tuple[str, str]] = field(default_factory=set)
    _provider_invocation_count: int = field(default=0, init=False)
    _invocation_ids: set[str] = field(default_factory=set, init=False)
    _disabled_provider_routes: set[str] = field(default_factory=set, init=False)

    @classmethod
    def reserve(
        cls,
        *,
        api_client: WorkerApiClient,
        workspace_id: str | None = None,
        assessment_id: str,
        scan_job_id: str | None = None,
        thread_id: str | None = None,
        run_id: str,
        invocation_id: str | None = None,
        model_invocation_id: str | None = None,
        agent_role: str,
        amount_credits: str,
        max_charge_credits: str,
        provider: str,
        model: str,
        max_input_tokens: str,
        max_input_bytes: str,
        max_output_tokens: str,
        max_reasoning_tokens: str,
        max_invocations: str,
        authorized_models: list[dict[str, str]],
        idempotency_key: str,
        effective_runtime_model: dict[str, str] | None = None,
        recovery_store_path: str | None = None,
    ) -> "BillingMeteringSession":
        from tools.common.capabilities.platform.callback_schemas import (
            BillingReservationPayload,
        )

        result = api_client.reserve_billing_credits(
            BillingReservationPayload(
                workspaceId=workspace_id,
                assessmentId=assessment_id,
                scanJobId=scan_job_id,
                threadId=thread_id,
                runId=run_id,
                invocationId=invocation_id,
                modelInvocationId=model_invocation_id,
                amountCredits=amount_credits,
                maxChargeCredits=max_charge_credits,
                provider=provider,
                model=model,
                maxInputTokens=max_input_tokens,
                maxInputBytes=max_input_bytes,
                maxOutputTokens=max_output_tokens,
                maxReasoningTokens=max_reasoning_tokens,
                maxInvocations=max_invocations,
                authorizedModels=authorized_models,
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
            workspace_id=workspace_id,
            assessment_id=assessment_id,
            scan_job_id=scan_job_id,
            thread_id=thread_id,
            run_id=run_id,
            invocation_id=invocation_id,
            model_invocation_id=model_invocation_id,
            reservation_id=reservation_id,
            agent_role=agent_role,
            effective_runtime_model=dict(effective_runtime_model or {}),
            recovery_store_path=recovery_store_path,
            max_input_tokens=_parse_limit(max_input_tokens),
            max_input_bytes=_parse_limit(max_input_bytes),
            max_output_tokens=_parse_limit(max_output_tokens),
            max_reasoning_tokens=_parse_limit(max_reasoning_tokens),
            max_invocations=_parse_limit(max_invocations),
            reserved_provider=provider.upper(),
            reserved_model=model,
            authorized_models={
                (str(item["provider"]).upper(), str(item["model"]))
                for item in authorized_models
            },
        )

    def release(self) -> None:
        from tools.common.capabilities.platform.callback_schemas import (
            BillingReservationReleasePayload,
        )

        payload = BillingReservationReleasePayload(
            assessmentId=self.assessment_id
        )
        try:
            self.api_client.release_billing_reservation(
                self.reservation_id, payload
            )
        except Exception:
            if self.recovery_store_path:
                enqueue_release(self.recovery_store_path, self.reservation_id, payload)
                _emit_billing_callback_warning(
                    "release",
                    reservation_id=self.reservation_id,
                    invocation_id=None,
                )
                return
            raise

    def new_invocation_id(self) -> str:
        invocation_id = str(uuid4())
        self._invocation_ids.add(invocation_id)
        return invocation_id

    def claim_provider_invocation(self, invocation_id: str) -> None:
        """Track one provider attempt without imposing a run-level call limit.

        max_invocations is reservation sizing/audit metadata only. LCSP is bounded
        by real credit and token ceilings rather than an arbitrary provider-call count.
        """
        if self.max_invocations is not None:
            from tools.common.capabilities.platform.callback_schemas import (
                BillingReservationClaimPayload,
            )

            self.api_client.claim_billing_invocation(
                self.reservation_id,
                BillingReservationClaimPayload(
                    assessmentId=self.assessment_id,
                    invocationId=invocation_id,
                ),
            )
        self._provider_invocation_count += 1

    def disable_provider_route(self, provider: str) -> None:
        self._disabled_provider_routes.add(provider.strip().lower())

    def provider_route_disabled(self, provider: str | None) -> bool:
        return bool(
            provider
            and provider.strip().lower() in self._disabled_provider_routes
        )

    def assert_model_identity(self, model: Any, response: Any | None = None) -> None:
        if not self.authorized_models and not (
            self.reserved_provider or self.reserved_model
        ):
            return
        provider, model_name = provider_identity(model, response)
        envelope = self.authorized_models or {
            (self.reserved_provider, self.reserved_model)
        }
        if (provider, model_name) not in envelope:
            raise BillingReservationUnavailable(
                "Provider/model differs from the reserved pricing envelope"
            )

    def assert_input_within_limit(self, request: Any) -> None:
        if self.max_input_bytes is None and self.max_input_tokens is None:
            return
        request_input = {
            "messages": getattr(request, "messages", None),
            "tools": getattr(request, "tools", None),
            "system": getattr(request, "system_prompt", None),
        }
        if all(value is None for value in request_input.values()):
            return
        encoded = str(request_input).encode("utf-8")
        byte_count = len(encoded)
        if self.max_input_bytes is not None and byte_count > self.max_input_bytes:
            raise BillingUsageUnavailable(
                "Input exceeds the reserved byte ceiling"
            )
        if (
            self.max_input_tokens is not None
            and _estimate_input_tokens(encoded) > self.max_input_tokens
        ):
            raise BillingUsageUnavailable(
                "Input exceeds the reserved token ceiling"
            )

    def bounded_model(self, model: Any) -> Any:
        output_limit = (self.max_output_tokens or 0) + (
            self.max_reasoning_tokens or 0
        )
        if not output_limit or not hasattr(model, "bind"):
            return model
        provider, _ = provider_identity(model, None)
        parameter = "max_output_tokens" if provider in {"OPENAI", "GOOGLE_GENAI"} else "max_tokens"
        return model.bind(**{parameter: output_limit})

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
            occurredAt=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            **usage,
        )
        try:
            self.api_client.post_settled_usage(payload)
        except BillingMeteringError:
            raise
        except Exception as error:
            if self.recovery_store_path:
                from tools.common.capabilities.platform.callback_schemas import (
                    BillingReservationReleasePayload,
                )

                try:
                    enqueue_usage_and_release(
                        self.recovery_store_path,
                        payload,
                        BillingReservationReleasePayload(
                            assessmentId=self.assessment_id
                        ),
                    )
                except Exception as recovery_error:
                    # The provider already succeeded. A recovery-store failure
                    # is still terminal: replaying the model would double-spend.
                    raise BillingMeteringError(recovery_error) from error
                _emit_billing_callback_warning(
                    "usage",
                    reservation_id=self.reservation_id,
                    invocation_id=invocation_id,
                )
                return
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


def _estimate_input_tokens(encoded: bytes) -> int:
    """Estimate prompt tokens separately from byte ceilings.

    Exact tokenizer choice is provider/model-specific. LCSP uses a conservative
    ASCII-heavy estimate here so a token ceiling is not accidentally interpreted
    as the same number of bytes before the provider receives the request.
    """

    if not encoded:
        return 0
    return math.ceil(len(encoded) / 3)


@contextmanager
def activate_billing_agent_role(agent_role: str) -> Iterator[str]:
    token = _active_agent_role.set(agent_role)
    try:
        yield agent_role
    finally:
        _active_agent_role.reset(token)


def active_billing_agent_role() -> str | None:
    return _active_agent_role.get()


def _emit_billing_callback_warning(
    callback_kind: str,
    *,
    reservation_id: str,
    invocation_id: str | None,
) -> None:
    publish_agent_stream_event(
        "BILLING_CALLBACK_RECOVERY_QUEUED",
        status="WAITING",
        text="billing callback queued for recovery",
        data={
            "callback_kind": callback_kind,
            "reservation_id": reservation_id,
            **({"invocation_id": invocation_id} if invocation_id else {}),
        },
    )


class _ModelCallTelemetry:
    """Emit safe progress around one blocking provider call."""

    def __init__(self, model: Any) -> None:
        self.provider, self.model_name = provider_identity(model)
        self.timeout_seconds = llm_provider_timeout_seconds()
        self._started_at = time.monotonic()
        self._stop = Event()
        self._context = copy_context()
        self._thread: Thread | None = None

    def start(self) -> None:
        self._emit(
            "MODEL_CALL_STARTED",
            status="RUNNING",
            text="model call started",
            data=self._data(elapsed_seconds=0),
        )
        self._thread = Thread(
            target=self._heartbeat,
            name="lcsp-model-call-heartbeat",
            daemon=True,
        )
        self._thread.start()

    def complete(self) -> None:
        self._finish(
            "MODEL_CALL_COMPLETED",
            status="COMPLETED",
            text="model call completed",
        )

    def fail(self, error: BaseException) -> None:
        timeout = _is_timeout_error(error)
        self._finish(
            "MODEL_CALL_TIMEOUT" if timeout else "MODEL_CALL_FAILED",
            status="FAILED",
            text="model call timed out" if timeout else "model call failed",
            data_extra={
                "error_type": type(error).__name__,
            },
        )

    def _finish(
        self,
        event_type: str,
        *,
        status: str,
        text: str,
        data_extra: dict[str, Any] | None = None,
    ) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=0.25)
        data = self._data(elapsed_seconds=self._elapsed_seconds())
        if data_extra:
            data.update(data_extra)
        self._emit(event_type, status=status, text=text, data=data)

    def _heartbeat(self) -> None:
        while not self._stop.wait(_MODEL_CALL_HEARTBEAT_SECONDS):
            self._emit(
                "MODEL_CALL_HEARTBEAT",
                status="RUNNING",
                text="model call waiting",
                data=self._data(elapsed_seconds=self._elapsed_seconds()),
            )

    def _elapsed_seconds(self) -> int:
        return max(0, int(time.monotonic() - self._started_at))

    def _data(self, *, elapsed_seconds: int) -> dict[str, Any]:
        return {
            "provider": self.provider.lower(),
            "model": self.model_name,
            "timeout_seconds": self.timeout_seconds,
            "elapsed_seconds": elapsed_seconds,
        }

    def _emit(self, event_type: str, **fields: Any) -> None:
        self._context.run(publish_agent_stream_event, event_type, **fields)


def _is_timeout_error(error: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, TimeoutError):
            return True
        name = type(current).__name__.lower()
        if "timeout" in name or "timedout" in name:
            return True
        current = current.__cause__ or current.__context__
    return False


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
        session.assert_input_within_limit(request)
        invocation_id = session.new_invocation_id()
        # Keep the authorized candidate for settlement. Applying bind() below
        # returns a RunnableBinding that no longer exposes provider identity.
        billing_model = request.model
        session.assert_model_identity(billing_model)
        session.claim_provider_invocation(invocation_id)
        if hasattr(request, "override"):
            request = request.override(model=session.bounded_model(billing_model))
        telemetry = _ModelCallTelemetry(billing_model)
        telemetry.start()
        try:
            response = handler(request)
        except Exception as error:
            telemetry.fail(error)
            raise
        telemetry.complete()
        session.record(
            response,
            billing_model,
            invocation_id,
            agent_role=active_billing_agent_role(),
        )
        return response

    async def awrap_model_call(self, request, handler):
        session = active_billing_metering()
        if session is None:
            return await handler(request)
        session.assert_input_within_limit(request)
        invocation_id = session.new_invocation_id()
        billing_model = request.model
        session.assert_model_identity(billing_model)
        session.claim_provider_invocation(invocation_id)
        if hasattr(request, "override"):
            request = request.override(model=session.bounded_model(billing_model))
        telemetry = _ModelCallTelemetry(billing_model)
        telemetry.start()
        try:
            response = await handler(request)
        except Exception as error:
            telemetry.fail(error)
            raise
        telemetry.complete()
        session.record(
            response,
            billing_model,
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

    result: dict[str, Any] = {"outputTokens": str(output_tokens)}
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
    cached_input = int(result.get("cachedInputTokens", "0"))
    cache_write = int(result.get("cacheWriteTokens", "0"))
    provider, _ = provider_identity(model, response)
    # OpenAI prompt_tokens is a total that includes cached and cache-write
    # slices. Convert it to the disjoint canonical uncached bucket. Other
    # providers already expose input_tokens as the uncached dimension.
    if provider in {"OPENAI", "GOOGLE_GENAI"}:
        if cached_input + cache_write > input_tokens:
            return None
        input_tokens = max(input_tokens - cached_input - cache_write, 0)
    result["inputTokens"] = str(input_tokens)
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


def _parse_limit(value: str | None) -> int | None:
    if value is None or not value.strip():
        return None
    if not value.isdigit():
        raise ValueError("billing token limits must be non-negative integers")
    return int(value)


__all__ = [
    "BillingMeteringMiddleware",
    "BillingAgentRoleMiddleware",
    "BillingMeteringSession",
    "BillingMeteringError",
    "BillingUsageUnavailable",
    "BillingReservationUnavailable",
    "BillingFinalizationError",
    "activate_billing_metering",
    "active_billing_metering",
    "active_billing_agent_role",
    "activate_billing_agent_role",
    "extract_provider_usage",
]
