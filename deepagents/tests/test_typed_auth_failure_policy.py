"""Typed provider auth errors (real LangChain ``ModelError`` subclasses) are credential
failures: never retried on the same credential, but rotated to another credential or
provider instead of aborting the task.

Reproduces scan d3be1a28 (run 01a0dc37): Google slot 0 timed out, slot 1 returned
401 UNAUTHENTICATED (ACCOUNT_STATE_INVALID) and a raw GoogleAuthenticationError
escaped the middleware stack because ``ModelError.is_retryable is False`` made it a
terminal task error.
"""
from unittest.mock import AsyncMock, MagicMock

import httpx
import pytest
from google.genai.errors import ClientError
from langchain.agents.middleware import ModelRequest, ModelResponse, ModelRetryMiddleware
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai.chat_models import (
    GoogleAuthenticationError,
    GoogleModelNotFoundError,
    GooglePermissionDeniedError,
)
from langchain_openai.chat_models.base import OpenAIAuthenticationError, OpenAIPermissionDeniedError

from middleware.billing_metering import (
    BillingMeteringMiddleware,
    BillingMeteringSession,
    activate_billing_metering,
)
from middleware.failure_policy import (
    TerminalCredentialError,
    error_status,
    is_auth_failure,
    is_terminal_boundary_error,
    is_terminal_task_error,
    retry_model_error,
)
from middleware.provider_fallback import (
    ProviderFallbackMiddleware,
    provider_circuit_breaker_failure,
    provider_fallback_failure,
)
from middleware.token_fallback import TokenFallbackMiddleware
from provider_credentials import credential_init_kwargs


GOOGLE_KEY_SLOTS = "google-slot-0-test-token,google-slot-1-test-token,google-slot-2-test-token"


@pytest.fixture(autouse=True)
def isolated_credential_health(monkeypatch):
    from middleware import token_fallback

    for name in ("LLM_FALLBACK_PROVIDER_1", "LLM_FALLBACK_PROVIDER_2"):
        monkeypatch.delenv(name, raising=False)
    token_fallback._DEAD_CREDENTIAL_SLOTS.clear()
    token_fallback._RATE_LIMITED_UNTIL.clear()

    def forbid_sleep(seconds: float) -> None:
        raise AssertionError(f"auth failures must never wait; slept {seconds}s")

    async def forbid_asleep(seconds: float) -> None:
        raise AssertionError(f"auth failures must never wait; slept {seconds}s")

    monkeypatch.setattr(token_fallback, "_sleep", forbid_sleep)
    monkeypatch.setattr(token_fallback, "_asleep", forbid_asleep)
    yield
    token_fallback._DEAD_CREDENTIAL_SLOTS.clear()
    token_fallback._RATE_LIMITED_UNTIL.clear()


def _google_auth_error() -> GoogleAuthenticationError:
    source = ClientError(
        401,
        {
            "error": {
                "code": 401,
                "message": "The bound service account is deleted or disabled.",
                "status": "UNAUTHENTICATED",
            }
        },
    )
    error = GoogleAuthenticationError("auth failed")
    error.__cause__ = source
    return error


def _google_permission_error() -> GooglePermissionDeniedError:
    source = ClientError(
        403,
        {
            "error": {
                "code": 403,
                "message": "Permission denied on resource project.",
                "status": "PERMISSION_DENIED",
            }
        },
    )
    error = GooglePermissionDeniedError("permission denied")
    error.__cause__ = source
    return error


def _openai_error(error_type, status: int):
    request = httpx.Request("POST", "https://api.llm7.io/v1/chat/completions")
    return error_type(
        "credential rejected",
        response=httpx.Response(status, request=request),
        body=None,
    )


def _google_timeout() -> RuntimeError:
    error = RuntimeError("model failure")
    error.__cause__ = httpx.ReadTimeout("provider timed out")
    return error


def _google_model_not_found() -> GoogleModelNotFoundError:
    source = ClientError(
        404,
        {"error": {"code": 404, "message": "model no longer available", "status": "NOT_FOUND"}},
    )
    error = GoogleModelNotFoundError("model no longer available")
    error.__cause__ = source
    return error


TYPED_AUTH_ERRORS = {
    "google-401": (_google_auth_error, 401),
    "google-403": (_google_permission_error, 403),
    "openai-401": (lambda: _openai_error(OpenAIAuthenticationError, 401), 401),
    "openai-403": (lambda: _openai_error(OpenAIPermissionDeniedError, 403), 403),
}


@pytest.mark.parametrize("case", list(TYPED_AUTH_ERRORS))
def test_typed_auth_errors_are_credential_failures_not_terminal_tasks(case):
    factory, status = TYPED_AUTH_ERRORS[case]
    error = factory()

    assert error_status(error) == status
    assert is_auth_failure(error) is True
    assert is_terminal_task_error(error) is False
    # The same request with the same rejected credential must never be resent.
    assert retry_model_error(error) is False
    assert provider_fallback_failure(error) is True
    assert provider_circuit_breaker_failure(error) is True
    # Once it has escaped every credential and provider route, the task stops.
    assert is_terminal_boundary_error(error) is True


def test_retryable_transient_failures_are_not_terminal_at_the_boundary():
    assert is_terminal_boundary_error(_google_timeout()) is False


@pytest.mark.parametrize(
    "error_type",
    [GoogleAuthenticationError, GooglePermissionDeniedError],
)
def test_typed_auth_error_without_status_metadata_is_still_an_auth_failure(error_type):
    error = error_type("credential rejected")

    assert error_status(error) is None
    assert is_auth_failure(error) is True
    assert is_terminal_task_error(error) is False
    assert retry_model_error(error) is False
    assert provider_fallback_failure(error) is True
    assert provider_circuit_breaker_failure(error) is True


def test_exhausted_credential_pool_is_terminal_but_may_enter_provider_fallback():
    exhausted = TerminalCredentialError("All configured retryable provider credential slots failed")
    exhausted.__cause__ = _google_auth_error()

    assert is_terminal_task_error(exhausted) is True
    assert provider_fallback_failure(exhausted) is True


def test_non_auth_non_retryable_model_errors_stay_terminal_without_fallback():
    error = _google_model_not_found()

    assert is_auth_failure(error) is False
    assert is_terminal_task_error(error) is True
    assert retry_model_error(error) is False
    assert provider_fallback_failure(error) is False
    assert provider_circuit_breaker_failure(error) is False


def _gemini_request() -> ModelRequest:
    model = ChatGoogleGenerativeAI(
        model="gemini-3.5-flash-lite",
        thinking_level="minimal",
        **credential_init_kwargs("google_genai"),
    )
    return ModelRequest(model=model, messages=[], tools=[])


def _google_keys(handler) -> list[str]:
    return [call.args[0].model.google_api_key.get_secret_value() for call in handler.call_args_list]


async def _call(middleware, request, handler, asynchronous: bool):
    if asynchronous:
        return await middleware.awrap_model_call(request, handler)
    return middleware.wrap_model_call(request, handler)


@pytest.mark.parametrize("auth_error", [_google_auth_error, _google_permission_error])
@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_production_sequence_timeout_then_typed_auth_rotates_to_next_slot(
    monkeypatch, auth_error, asynchronous
):
    from middleware import token_fallback

    monkeypatch.setenv("GOOGLE_API_KEY", GOOGLE_KEY_SLOTS)
    logger_events = []
    monkeypatch.setattr(
        token_fallback.logger,
        "warning",
        lambda event, **fields: logger_events.append((event, fields)),
    )
    response = ModelResponse(result=[])
    side_effect = [_google_timeout(), auth_error(), response]
    handler = AsyncMock(side_effect=side_effect) if asynchronous else MagicMock(side_effect=side_effect)
    middleware = TokenFallbackMiddleware()

    assert await _call(middleware, _gemini_request(), handler, asynchronous) is response

    assert _google_keys(handler) == [
        "google-slot-0-test-token",
        "google-slot-1-test-token",
        "google-slot-2-test-token",
    ]
    key = ("google_genai", "GOOGLE_API_KEY")
    # Slot 0 timed out: transient, neither dead nor cooling. Slot 1: dead, no cooldown.
    assert token_fallback._DEAD_CREDENTIAL_SLOTS[key] == {1}
    assert token_fallback._RATE_LIMITED_UNTIL.get(key, {}) == {}
    dead_events = [fields for event, fields in logger_events if event == "MODEL_CREDENTIAL_FALLBACK_SLOT_DEAD"]
    assert [fields["credential_slot"] for fields in dead_events] == [1]
    assert "test-token" not in str(logger_events)

    # The dead slot is never reused later in the process; the timed-out slot is.
    later = AsyncMock(side_effect=[response]) if asynchronous else MagicMock(side_effect=[response])
    assert await _call(middleware, _gemini_request(), later, asynchronous) is response
    assert _google_keys(later) == ["google-slot-0-test-token"]


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_timeout_then_typed_auth_on_last_slot_ends_with_bounded_credential_error(
    monkeypatch, asynchronous
):
    monkeypatch.setenv("GOOGLE_API_KEY", "google-slot-0-test-token,google-slot-1-test-token")
    side_effect = [_google_timeout(), _google_auth_error(), _google_timeout()]
    handler = AsyncMock(side_effect=side_effect) if asynchronous else MagicMock(side_effect=side_effect)

    with pytest.raises(TerminalCredentialError) as caught:
        await _call(TokenFallbackMiddleware(), _gemini_request(), handler, asynchronous)

    assert handler.call_count == 3
    assert _google_keys(handler) == [
        "google-slot-0-test-token",
        "google-slot-1-test-token",
        "google-slot-0-test-token",
    ]
    assert not isinstance(caught.value, GoogleAuthenticationError)
    assert "test-token" not in str(caught.value)


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_exhausted_google_pool_with_typed_auth_moves_to_next_provider(monkeypatch, asynchronous):
    monkeypatch.setenv("GOOGLE_API_KEY", "google-slot-0-test-token,google-slot-1-test-token")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-only-test-token")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")
    response = ModelResponse(result=[])
    side_effect = [_google_timeout(), _google_auth_error(), _google_timeout(), response]
    handler = AsyncMock(side_effect=side_effect) if asynchronous else MagicMock(side_effect=side_effect)
    token_fallback = TokenFallbackMiddleware()
    provider_fallback = ProviderFallbackMiddleware()

    if asynchronous:
        async def token_handler(next_request):
            return await token_fallback.awrap_model_call(next_request, handler)

        result = await provider_fallback.awrap_model_call(_gemini_request(), token_handler)
    else:
        result = provider_fallback.wrap_model_call(
            _gemini_request(),
            lambda next_request: token_fallback.wrap_model_call(next_request, handler),
        )

    assert result is response
    models = [call.args[0].model for call in handler.call_args_list]
    assert [type(model).__name__ for model in models] == [
        "ChatGoogleGenerativeAI",
        "ChatGoogleGenerativeAI",
        "ChatGoogleGenerativeAI",
        "ChatOpenAI",
    ]
    assert models[-1].openai_api_key.get_secret_value() == "llm7-only-test-token"


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_typed_auth_opens_provider_circuit_and_later_calls_skip_that_provider(
    monkeypatch, asynchronous
):
    import middleware.provider_fallback as fallback_module

    class _BillingModel:
        def __init__(self, provider: str):
            self.provider = provider
            self.model_name = "gemini-3.5-flash-lite"

    class _BillingRequest:
        def __init__(self, model):
            self.model = model
            self.messages = []
            self.tools = []

        def override(self, **kwargs):
            return _BillingRequest(kwargs.get("model", self.model))

    class BillingClient:
        def __init__(self):
            self.claims = []
            self.payloads = []

        def claim_billing_invocation(self, reservation_id, payload):
            self.claims.append((reservation_id, payload.invocationId))

        def post_settled_usage(self, payload):
            self.payloads.append(payload)

    monkeypatch.setattr(fallback_module, "publish_agent_stream_event", lambda *args, **kwargs: None)
    monkeypatch.setattr(fallback_module, "model_provider", lambda model: model.provider)
    monkeypatch.setattr(fallback_module, "configured_fallback_providers", lambda: ("llm7",))
    monkeypatch.setattr(fallback_module, "fallback_model", lambda provider: _BillingModel(provider))
    client = BillingClient()
    session = BillingMeteringSession(
        api_client=client,
        assessment_id="assessment-typed-auth",
        run_id="run-typed-auth",
        reservation_id="reservation-typed-auth",
        agent_role="investigator",
        reserved_provider="GOOGLE_GENAI",
        reserved_model="gemini-3.5-flash-lite",
        authorized_models={
            ("GOOGLE_GENAI", "gemini-3.5-flash-lite"),
            ("LLM7", "gemini-3.5-flash-lite"),
        },
        max_invocations=1,
    )
    provider_calls = []

    def provider_handler(request):
        provider_calls.append(request.model.provider)
        if request.model.provider == "google_genai":
            raise _google_auth_error()
        return ModelResponse(result=[])

    async def async_provider_handler(request):
        return provider_handler(request)

    fallback = ProviderFallbackMiddleware()
    billing = BillingMeteringMiddleware()
    request = _BillingRequest(_BillingModel("google_genai"))

    with activate_billing_metering(session):
        for _ in range(2):
            if asynchronous:
                async def metered(next_request):
                    return await billing.awrap_model_call(next_request, async_provider_handler)

                result = await fallback.awrap_model_call(request, metered)
            else:
                result = fallback.wrap_model_call(
                    request,
                    lambda next_request: billing.wrap_model_call(next_request, provider_handler),
                )
            assert isinstance(result, ModelResponse)

    # Google is tried once, its run-scoped circuit opens, and the next call skips it.
    assert provider_calls == ["google_genai", "llm7", "llm7"]
    assert session.provider_route_disabled("google_genai") is True
    # One invocation claim per provider attempt, usage only for the two successes.
    assert len(client.claims) == 3
    assert len(client.payloads) == 2


@pytest.mark.parametrize("auth_error", [_google_auth_error, _google_permission_error])
@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_model_retry_never_resends_typed_auth_failure_on_same_credential(auth_error, asynchronous):
    from middleware.failure_policy import retry_model_error as retry_on

    retry = ModelRetryMiddleware(max_retries=2, retry_on=retry_on, on_failure="error", initial_delay=0)
    error = auth_error()
    handler = AsyncMock(side_effect=error) if asynchronous else MagicMock(side_effect=error)
    request = ModelRequest(model=MagicMock(), messages=[], tools=[])

    with pytest.raises(type(error)):
        if asynchronous:
            await retry.awrap_model_call(request, handler)
        else:
            retry.wrap_model_call(request, handler)
    assert handler.call_count == 1


def test_non_retryable_boundary_failures_are_terminal_at_the_boundary():
    from tools.common.capabilities.agent_runtime.boundary import NonRetryableAgentBoundaryError
    from tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary import (
        TechnicalRecoveryNotStarted,
    )

    # Never redelivered, so the invocation's billing reservation must be released.
    assert is_terminal_boundary_error(NonRetryableAgentBoundaryError("scan job is terminal")) is True
    assert is_terminal_boundary_error(TechnicalRecoveryNotStarted("recovery not requested")) is True
    # Model-stack routing is unchanged: these are boundary outcomes, not model errors.
    assert is_terminal_task_error(NonRetryableAgentBoundaryError("scan job is terminal")) is False


@pytest.mark.parametrize(
    ("error_factory", "released"),
    [
        (lambda: __import__(
            "tools.common.capabilities.assessment.investigation.engineering_rule.interview_gated_boundary",
            fromlist=["TechnicalRecoveryNotStarted"],
        ).TechnicalRecoveryNotStarted("recovery not requested"), True),
        (lambda: RuntimeError("transient provider outage"), False),
    ],
)
def test_invoke_boundary_releases_reservation_only_for_non_redelivered_failures(
    monkeypatch, error_factory, released
):
    from tools.common.capabilities.agent_runtime import invocation

    class FakeBillingSession:
        def __init__(self):
            self.released = 0

        def release(self):
            self.released += 1

    session = FakeBillingSession()
    error = error_factory()

    def failing_handler(*_args):
        raise error

    monkeypatch.setattr(invocation, "build_boundary", lambda _target: object())
    monkeypatch.setattr(invocation, "_agent_stream_session", lambda *_args: None)
    monkeypatch.setattr(invocation, "_billing_metering_session", lambda *_args: session)
    monkeypatch.setattr(invocation, "_run_boundary_handler", failing_handler)

    with pytest.raises(type(error)):
        invocation.invoke_boundary("engineering_assessment_requested", {}, "corr-release")

    assert session.released == (1 if released else 0)
