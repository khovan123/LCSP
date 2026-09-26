"""Single governed model boundary for prepaid usage metering.

This module intentionally persists numeric provider usage only. Prompt content,
model messages and hidden reasoning are never included in the billing payload.
"""

from __future__ import annotations

import json
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
from tools.common.capabilities.platform.logging import get_logger


_MODEL_CALL_HEARTBEAT_SECONDS = 10.0
logger = get_logger(__name__)


class BillingUsageUnavailable(RuntimeError):
    """Provider returned no complete numeric usage metadata."""


class BillingBudgetExhausted(RuntimeError):
    """The active billing reservation cannot authorize another provider call."""

    def __init__(self, message: str, *, error_code: str | None = None) -> None:
        super().__init__(message)
        self.status_code = 402
        self.error_code = error_code or "BILLING_BUDGET_EXHAUSTED"


class BillingReservationUnavailable(RuntimeError):
    """The broker replay found a reservation that is no longer spendable."""


class ModelContextWindowExceeded(RuntimeError):
    """The active provider/model cannot accept the request after context reduction."""


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
    _announced_provider_fallbacks: set[tuple[str, str]] = field(default_factory=set, init=False)

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

    def claim_provider_invocation(
        self,
        invocation_id: str,
        metrics: "InvocationAuthorizationMetrics | None" = None,
    ) -> None:
        """Track one provider attempt without imposing a run-level call limit.

        max_invocations is reservation sizing/audit metadata only. LCSP is bounded
        by real credit and token ceilings rather than an arbitrary provider-call count.
        """
        if self.max_invocations is not None:
            from tools.common.capabilities.platform.callback_schemas import (
                BillingReservationClaimPayload,
            )

            payload = BillingReservationClaimPayload(
                assessmentId=self.assessment_id,
                invocationId=invocation_id,
                provider=metrics.provider if metrics else None,
                model=metrics.model if metrics else None,
                estimatedInputTokens=(
                    str(metrics.estimated_input_tokens) if metrics else None
                ),
                estimatedInputBytes=(
                    str(metrics.estimated_input_bytes) if metrics else None
                ),
                maxOutputTokens=(
                    str(metrics.max_output_tokens) if metrics else None
                ),
                maxReasoningTokens=(
                    str(metrics.max_reasoning_tokens) if metrics else None
                ),
            )
            try:
                self.api_client.claim_billing_invocation(
                    self.reservation_id,
                    payload,
                )
            except WorkerCallbackError as error:
                if error.status_code == 402 and (
                    error.error_code is None
                    or error.error_code
                    in {
                        "BILLING_INSUFFICIENT_CREDITS",
                        "BILLING_BUDGET_EXHAUSTED",
                    }
                ):
                    raise BillingBudgetExhausted(
                        "Billing budget exhausted before provider call",
                        error_code=error.error_code,
                    ) from error
                raise
        self._provider_invocation_count += 1

    def provider_fallback_should_publish(
        self, current_provider: str | None, fallback_provider: str
    ) -> bool:
        key = (
            (current_provider or "unknown").strip().lower(),
            fallback_provider.strip().lower(),
        )
        if key in self._announced_provider_fallbacks:
            return False
        self._announced_provider_fallbacks.add(key)
        return True

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

    def authorize_request_context(
        self, request: Any, model: Any
    ) -> "InvocationAuthorizationMetrics":
        metrics = estimate_invocation_authorization_metrics(
            request,
            model,
            max_output_tokens=self.max_output_tokens or 0,
            max_reasoning_tokens=self.max_reasoning_tokens or 0,
        )
        context_limit = metrics.provider_context_limit
        if (
            context_limit is not None
            and metrics.estimated_input_tokens > context_limit
        ):
            raise ModelContextWindowExceeded(
                "Input exceeds the active provider context window"
            )
        return metrics

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


@dataclass(frozen=True)
class InvocationAuthorizationMetrics:
    provider: str
    model: str
    estimated_input_tokens: int
    estimated_input_bytes: int
    max_output_tokens: int
    max_reasoning_tokens: int
    provider_context_limit: int | None
    message_count: int
    tool_result_count: int


def _estimate_input_tokens(encoded: bytes) -> int:
    """Estimate prompt tokens separately from byte ceilings.

    Exact tokenizer choice is provider/model-specific. LCSP uses a conservative
    ASCII-heavy estimate here so a token ceiling is not accidentally interpreted
    as the same number of bytes before the provider receives the request.
    """

    if not encoded:
        return 0
    return math.ceil(len(encoded) / 3)


def estimate_invocation_authorization_metrics(
    request: Any,
    model: Any,
    *,
    max_output_tokens: int,
    max_reasoning_tokens: int,
) -> InvocationAuthorizationMetrics:
    provider, model_name = provider_identity(model)
    messages = getattr(request, "messages", None)
    message_list = messages if isinstance(messages, list) else []
    tool_messages = [
        message
        for message in message_list
        if _message_role_shape(message) == "tool"
    ]
    encoded = _safe_json_bytes(
        {
            "system": _jsonable(getattr(request, "system_prompt", None)),
            "messages": [_message_estimation_payload(message) for message in message_list],
            "tools": _tools_estimation_payload(getattr(request, "tools", None)),
            "response_format": _response_format_estimation_payload(
                getattr(request, "response_format", None)
            ),
        }
    )
    return InvocationAuthorizationMetrics(
        provider=provider,
        model=model_name,
        estimated_input_bytes=len(encoded),
        estimated_input_tokens=_estimate_input_tokens(encoded),
        max_output_tokens=max(0, int(max_output_tokens or 0)),
        max_reasoning_tokens=max(0, int(max_reasoning_tokens or 0)),
        provider_context_limit=_provider_context_limit_tokens(model),
        message_count=len(message_list),
        tool_result_count=len(tool_messages),
    )


def _safe_json_bytes(value: Any) -> bytes:
    return json.dumps(
        _jsonable(value),
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    ).encode("utf-8")


def _jsonable(value: Any, *, depth: int = 0) -> Any:
    if depth > 8:
        return repr(type(value).__name__)
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, bytes):
        return value.decode("utf-8", errors="replace")
    if isinstance(value, dict):
        return {
            str(key): _jsonable(item, depth=depth + 1)
            for key, item in value.items()
        }
    if isinstance(value, (list, tuple, set)):
        return [_jsonable(item, depth=depth + 1) for item in value]
    if hasattr(value, "model_dump"):
        try:
            return _jsonable(value.model_dump(mode="json"), depth=depth + 1)
        except TypeError:
            return _jsonable(value.model_dump(), depth=depth + 1)
        except Exception:
            pass
    if hasattr(value, "dict"):
        try:
            return _jsonable(value.dict(), depth=depth + 1)
        except Exception:
            pass
    return {
        key: _jsonable(getattr(value, key), depth=depth + 1)
        for key in (
            "name",
            "description",
            "args",
            "args_schema",
            "schema",
            "parameters",
            "content",
            "additional_kwargs",
            "tool_calls",
            "tool_call_id",
            "role",
            "type",
        )
        if hasattr(value, key)
    } or repr(type(value).__name__)


def _message_estimation_payload(message: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "role": _message_role_shape(message),
        "content": _jsonable(getattr(message, "content", None)),
    }
    for key in ("name", "tool_call_id", "tool_calls", "additional_kwargs"):
        if hasattr(message, key):
            payload[key] = _jsonable(getattr(message, key))
    return payload


def _tools_estimation_payload(tools: Any) -> Any:
    if not isinstance(tools, list):
        return _jsonable(tools)
    return [_tool_estimation_payload(tool) for tool in tools]


def _tool_estimation_payload(tool: Any) -> Any:
    if isinstance(tool, dict):
        return _jsonable(tool)
    schema = None
    args_schema = getattr(tool, "args_schema", None)
    if args_schema is not None:
        try:
            schema = args_schema.model_json_schema()
        except Exception:
            schema = _jsonable(args_schema)
    return {
        "name": getattr(tool, "name", None),
        "description": getattr(tool, "description", None),
        "args": _jsonable(getattr(tool, "args", None)),
        "schema": _jsonable(schema),
    }


def _response_format_estimation_payload(response_format: Any) -> Any:
    if response_format is None:
        return None
    schema = None
    for key in ("schema", "schema_", "output_schema"):
        if not hasattr(response_format, key):
            continue
        schema = getattr(response_format, key)
        break
    if hasattr(schema, "model_json_schema"):
        try:
            schema = schema.model_json_schema()
        except Exception:
            schema = _jsonable(schema)
    return {
        "strategy": type(response_format).__name__,
        "schema": _jsonable(schema),
    }


def _provider_context_limit_tokens(model: Any) -> int | None:
    profile = getattr(model, "profile", None)
    if profile is None:
        return None
    if isinstance(profile, dict):
        value = profile.get("max_input_tokens")
    else:
        value = getattr(profile, "max_input_tokens", None)
    if isinstance(value, int) and value > 0:
        return value
    return None


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
    # Recovery is an internal durability concern, not a customer-visible activity.
    # The durable recovery row remains the source of truth. Emitting a bespoke stream
    # event here previously violated the shared agent-stream contract and produced
    # HTTP 400 responses in otherwise healthy scan runs.
    del callback_kind, reservation_id, invocation_id


class _ModelCallTelemetry:
    """Emit safe progress around one blocking provider call."""

    def __init__(self, model: Any) -> None:
        self.provider, self.model_name = provider_identity(model)
        self.timeout_seconds = llm_provider_timeout_seconds(self.provider)
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


def _message_role_shape(message: Any) -> str:
    role = (
        getattr(message, "role", None)
        or getattr(message, "type", None)
        or type(message).__name__
    )
    normalized = {
        "ai": "assistant",
        "human": "user",
    }.get(str(role), str(role))
    tool_calls = getattr(message, "tool_calls", None)
    if normalized == "assistant" and isinstance(tool_calls, list) and tool_calls:
        return "assistant(tool_calls)"
    return normalized


def _tool_call_id_shape(value: Any) -> dict[str, Any]:
    text = str(value or "")
    return {
        "length": len(text),
        "has_call_prefix": text.startswith("call_"),
        "contains_whitespace": any(character.isspace() for character in text),
    }


def _safe_scalar(value: Any) -> Any:
    return value if isinstance(value, (str, int, float, bool)) or value is None else None


def _request_shape_diagnostic(request: Any, model: Any) -> dict[str, Any]:
    provider, model_name = provider_identity(model)
    messages = getattr(request, "messages", None)
    message_list = messages if isinstance(messages, list) else []
    tools = getattr(request, "tools", None)
    tool_list = tools if isinstance(tools, list) else []
    tool_messages = [
        message
        for message in message_list
        if _message_role_shape(message) == "tool"
    ]
    tool_call_id_shapes = [
        _tool_call_id_shape(getattr(message, "tool_call_id", None))
        for message in tool_messages
    ]
    return {
        "provider": provider.lower(),
        "model": model_name,
        "message_count": len(message_list),
        "message_roles": [_message_role_shape(message) for message in message_list],
        "tool_count": len(tool_list),
        "tool_result_count": len(tool_messages),
        "tool_call_id_shapes": tool_call_id_shapes,
        "response_format_type": type(getattr(request, "response_format", None)).__name__,
        "tool_choice": _safe_scalar(getattr(request, "tool_choice", None)),
        "tool_choice_type": type(getattr(request, "tool_choice", None)).__name__,
        "parallel_tool_calls": getattr(request, "parallel_tool_calls", None),
        "stream": getattr(model, "streaming", getattr(model, "stream", None)),
    }


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
        invocation_id = session.new_invocation_id()
        # Keep the authorized candidate for settlement. Applying bind() below
        # returns a RunnableBinding that no longer exposes provider identity.
        billing_model = request.model
        session.assert_model_identity(billing_model)
        metrics = session.authorize_request_context(request, billing_model)
        logger.info(
            "MODEL_CONTEXT_DIAGNOSTIC",
            provider=metrics.provider.lower(),
            model=metrics.model,
            message_count=metrics.message_count,
            tool_result_count=metrics.tool_result_count,
            estimated_input_tokens=metrics.estimated_input_tokens,
            estimated_input_bytes=metrics.estimated_input_bytes,
            provider_context_limit=metrics.provider_context_limit,
            reservation_max_input_tokens=session.max_input_tokens,
            reservation_max_input_bytes=session.max_input_bytes,
        )
        logger.info(
            "MODEL_REQUEST_DIAGNOSTIC",
            **_request_shape_diagnostic(request, billing_model),
        )
        session.claim_provider_invocation(invocation_id, metrics)
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
        invocation_id = session.new_invocation_id()
        billing_model = request.model
        session.assert_model_identity(billing_model)
        metrics = session.authorize_request_context(request, billing_model)
        logger.info(
            "MODEL_CONTEXT_DIAGNOSTIC",
            provider=metrics.provider.lower(),
            model=metrics.model,
            message_count=metrics.message_count,
            tool_result_count=metrics.tool_result_count,
            estimated_input_tokens=metrics.estimated_input_tokens,
            estimated_input_bytes=metrics.estimated_input_bytes,
            provider_context_limit=metrics.provider_context_limit,
            reservation_max_input_tokens=session.max_input_tokens,
            reservation_max_input_bytes=session.max_input_bytes,
        )
        logger.info(
            "MODEL_REQUEST_DIAGNOSTIC",
            **_request_shape_diagnostic(request, billing_model),
        )
        session.claim_provider_invocation(invocation_id, metrics)
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
    "BillingBudgetExhausted",
    "BillingMeteringMiddleware",
    "BillingAgentRoleMiddleware",
    "BillingMeteringSession",
    "BillingMeteringError",
    "BillingUsageUnavailable",
    "BillingReservationUnavailable",
    "ModelContextWindowExceeded",
    "BillingFinalizationError",
    "activate_billing_metering",
    "active_billing_metering",
    "active_billing_agent_role",
    "activate_billing_agent_role",
    "extract_provider_usage",
]
