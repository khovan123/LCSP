import os
from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain.agents.middleware import ModelRequest, ModelResponse
from langchain_core.messages import AIMessage, HumanMessage, ToolMessage
from langchain_openai import ChatOpenAI

from middleware.failure_policy import (
    TerminalCredentialError,
    is_provider_route_incompatibility,
)
from middleware.provider_fallback import (
    ProviderFallbackMiddleware,
    configured_fallback_providers,
    provider_circuit_breaker_failure,
    provider_fallback_failure,
)
from middleware.billing_metering import (
    BillingBudgetExhausted,
    BillingMeteringMiddleware,
    BillingMeteringSession,
    activate_billing_metering,
)
from middleware.token_fallback import TokenFallbackMiddleware, model_provider
from provider_credentials import credential_init_kwargs


class QuotaError(Exception):
    status_code = 429


class CapacityError(Exception):
    status_code = 402
    code = "insufficient_balance"


class AuthError(Exception):
    status_code = 401


class UpstreamUnprocessableError(Exception):
    status_code = 422
    code = "upstream_unprocessable_request"
    type = "upstream_unprocessable_request"
    body = {
        "error": {
            "code": "upstream_unprocessable_request",
            "type": "upstream_unprocessable_request",
        }
    }


class LocalValidationError(Exception):
    status_code = 422
    code = "VALIDATION_FAILED"


@pytest.fixture(autouse=True)
def clear_provider_fallback_env(monkeypatch):
    for name in list(os.environ):
        if name.startswith("LLM_FALLBACK_PROVIDER_"):
            monkeypatch.delenv(name, raising=False)
    from middleware import token_fallback

    token_fallback._DEAD_CREDENTIAL_SLOTS.clear()
    token_fallback._RATE_LIMITED_UNTIL.clear()
    # A pool whose every slot is rate limited waits once for a cooldown; advance a
    # fake clock instead of sleeping for the production 30-120s.
    clock = {"now": 1_000.0}

    def sleep(seconds: float) -> None:
        clock["now"] += seconds

    async def asleep(seconds: float) -> None:
        clock["now"] += seconds

    monkeypatch.setattr(token_fallback, "_monotonic", lambda: clock["now"])
    monkeypatch.setattr(token_fallback, "_sleep", sleep)
    monkeypatch.setattr(token_fallback, "_asleep", asleep)
    yield
    token_fallback._DEAD_CREDENTIAL_SLOTS.clear()
    token_fallback._RATE_LIMITED_UNTIL.clear()


def _openai_model():
    return ChatOpenAI(
        model="gpt-5-nano",
        use_responses_api=True,
        **credential_init_kwargs("openai"),
    )


def _llm7_model():
    return ChatOpenAI(
        model="codestral-latest",
        base_url="https://api.llm7.io/v1",
        use_responses_api=False,
        **credential_init_kwargs("llm7"),
    )


class _BillingModel:
    def __init__(self, provider: str, model_name: str = "gpt-5-nano"):
        self.provider = provider
        self.model_name = model_name


class _BillingRequest:
    def __init__(self, model, *, messages=None, tools=None):
        self.model = model
        self.messages = list(messages or [])
        self.tools = list(tools or [])

    def override(self, **kwargs):
        return _BillingRequest(
            kwargs.get("model", self.model),
            messages=self.messages,
            tools=self.tools,
        )


def _sync_chain(request, raw_handler):
    token_fallback = TokenFallbackMiddleware()
    return ProviderFallbackMiddleware().wrap_model_call(
        request,
        lambda next_request: token_fallback.wrap_model_call(next_request, raw_handler),
    )


async def _async_chain(request, raw_handler):
    token_fallback = TokenFallbackMiddleware()

    async def token_handler(next_request):
        return await token_fallback.awrap_model_call(next_request, raw_handler)

    return await ProviderFallbackMiddleware().awrap_model_call(request, token_handler)


def test_configured_provider_chain_is_numeric_ordered_aliased_and_deduplicated(monkeypatch):
    monkeypatch.setenv("GOOGLE_API_KEY", "google-test-token")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-test-token")
    monkeypatch.setenv("INCEPTION_API_KEY", "inception-test-token")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_20", "llm7")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_10", "inception")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_2", "gemini")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_3", "google_genai")

    assert configured_fallback_providers() == ("google_genai", "inception", "llm7")


def test_terminal_billing_delivery_failure_does_not_enter_provider_fallback(monkeypatch):
    import middleware.provider_fallback as fallback_module

    monkeypatch.setattr(fallback_module, "model_provider", lambda model: model.provider)
    monkeypatch.setattr(
        fallback_module, "configured_fallback_providers", lambda: ("llm7",)
    )
    monkeypatch.setattr(
        fallback_module, "fallback_model", lambda provider: _BillingModel(provider)
    )
    session = BillingMeteringSession(
        api_client=type(
            "FailingBillingClient",
            (),
            {"post_settled_usage": lambda self, _payload: (_ for _ in ()).throw(RuntimeError("api-down"))},
        )(),
        assessment_id="assessment-1",
        run_id="run-1",
        reservation_id="reservation-1",
        agent_role="planner",
        reserved_provider="OPENAI",
        reserved_model="gpt-5-nano",
    )
    provider_calls = []

    def provider_handler(_request):
        provider_calls.append(1)
        return ModelResponse(result=[])

    request = _BillingRequest(_BillingModel("openai"))
    billing = BillingMeteringMiddleware()
    with activate_billing_metering(session), pytest.raises(Exception) as error:
        ProviderFallbackMiddleware().wrap_model_call(
            request,
            lambda next_request: billing.wrap_model_call(
                next_request, provider_handler
            ),
        )
    assert type(error.value).__name__ == "BillingMeteringError"
    assert len(provider_calls) == 1


def test_llm7_402_fallback_to_google_settles_single_successful_attempt(monkeypatch):
    import middleware.provider_fallback as fallback_module

    monkeypatch.setattr(fallback_module, "model_provider", lambda model: model.provider)
    monkeypatch.setattr(
        fallback_module,
        "configured_fallback_providers",
        lambda: ("google_genai",),
    )
    monkeypatch.setattr(
        fallback_module,
        "fallback_model",
        lambda provider: _BillingModel(provider),
    )

    payloads = []
    claims = []

    class BillingClient:
        def claim_billing_invocation(self, reservation_id, payload):
            claims.append((reservation_id, payload.invocationId))

        def post_settled_usage(self, payload):
            payloads.append(payload)

    session = BillingMeteringSession(
        api_client=BillingClient(),
        assessment_id="assessment-1",
        run_id="run-1",
        reservation_id="reservation-1",
        agent_role="planner",
        reserved_provider="LLM7",
        reserved_model="gpt-5-nano",
        authorized_models={
            ("LLM7", "gpt-5-nano"),
            ("GOOGLE_GENAI", "gpt-5-nano"),
        },
        max_invocations=2,
    )
    provider_calls = []

    def provider_handler(request):
        provider_calls.append(request.model.provider)
        if request.model.provider == "llm7":
            raise CapacityError("insufficient balance")
        return ModelResponse(result=[])

    request = _BillingRequest(_BillingModel("llm7"))
    billing = BillingMeteringMiddleware()
    with activate_billing_metering(session):
        response = ProviderFallbackMiddleware().wrap_model_call(
            request,
            lambda next_request: billing.wrap_model_call(
                next_request,
                provider_handler,
            ),
        )

    assert isinstance(response, ModelResponse)
    assert provider_calls == ["llm7", "google_genai"]
    assert [reservation_id for reservation_id, _ in claims] == [
        "reservation-1",
        "reservation-1",
    ]
    assert len({invocation_id for _, invocation_id in claims}) == 2
    assert len(payloads) == 1
    assert payloads[0].reservationId == "reservation-1"
    assert payloads[0].provider == "GOOGLE_GENAI"
    assert payloads[0].invocationId == claims[-1][1]


def test_llm7_402_opens_run_scoped_circuit_and_skips_next_primary(monkeypatch):
    import middleware.provider_fallback as fallback_module

    stream_events = []
    monkeypatch.setattr(
        fallback_module,
        "publish_agent_stream_event",
        lambda event_type, **fields: stream_events.append((event_type, fields)),
    )
    monkeypatch.setattr(fallback_module, "model_provider", lambda model: model.provider)
    monkeypatch.setattr(
        fallback_module,
        "configured_fallback_providers",
        lambda: ("google_genai",),
    )
    monkeypatch.setattr(
        fallback_module,
        "fallback_model",
        lambda provider: _BillingModel(provider),
    )

    class BillingClient:
        def __init__(self):
            self.claims = []
            self.payloads = []

        def claim_billing_invocation(self, reservation_id, payload):
            self.claims.append((reservation_id, payload.invocationId))

        def post_settled_usage(self, payload):
            self.payloads.append(payload)

    client = BillingClient()
    session = BillingMeteringSession(
        api_client=client,
        assessment_id="assessment-circuit",
        run_id="run-circuit",
        reservation_id="reservation-circuit",
        agent_role="investigator",
        reserved_provider="LLM7",
        reserved_model="gpt-5-nano",
        authorized_models={
            ("LLM7", "gpt-5-nano"),
            ("GOOGLE_GENAI", "gpt-5-nano"),
        },
        max_invocations=1,
    )
    provider_calls = []

    def provider_handler(request):
        provider_calls.append(request.model.provider)
        if request.model.provider == "llm7":
            raise CapacityError("insufficient balance")
        return ModelResponse(result=[])

    request = _BillingRequest(_BillingModel("llm7"))
    fallback = ProviderFallbackMiddleware()
    billing = BillingMeteringMiddleware()

    with activate_billing_metering(session):
        for _ in range(2):
            assert isinstance(
                fallback.wrap_model_call(
                    request,
                    lambda next_request: billing.wrap_model_call(
                        next_request,
                        provider_handler,
                    ),
                ),
                ModelResponse,
            )

    assert provider_calls == ["llm7", "google_genai", "google_genai"]
    assert session.provider_route_disabled("llm7") is True
    assert len(client.claims) == 3
    assert len(client.payloads) == 2
    assert [event_type for event_type, _ in stream_events] == [
        "PROVIDER_FALLBACK",
    ]


def test_llm7_upstream_unprocessable_fallback_preserves_tool_continuation_and_opens_circuit(monkeypatch):
    import middleware.provider_fallback as fallback_module

    stream_events = []
    monkeypatch.setattr(
        fallback_module,
        "publish_agent_stream_event",
        lambda event_type, **fields: stream_events.append((event_type, fields)),
    )
    monkeypatch.setattr(fallback_module, "model_provider", lambda model: model.provider)
    monkeypatch.setattr(
        fallback_module,
        "configured_fallback_providers",
        lambda: ("google_genai",),
    )
    monkeypatch.setattr(
        fallback_module,
        "fallback_model",
        lambda provider: _BillingModel(provider, "gemini-3.5-flash-lite"),
    )

    class BillingClient:
        def __init__(self):
            self.claims = []
            self.payloads = []

        def claim_billing_invocation(self, reservation_id, payload):
            self.claims.append((reservation_id, payload.invocationId))

        def post_settled_usage(self, payload):
            self.payloads.append(payload)

    client = BillingClient()
    session = BillingMeteringSession(
        api_client=client,
        assessment_id="assessment-tools",
        run_id="run-tools",
        reservation_id="reservation-tools",
        agent_role="investigator",
        reserved_provider="LLM7",
        reserved_model="codestral-latest",
        authorized_models={
            ("LLM7", "codestral-latest"),
            ("GOOGLE_GENAI", "gemini-3.5-flash-lite"),
        },
        max_invocations=16,
    )
    messages = [
        HumanMessage(content="inspect the repository"),
        AIMessage(
            content="",
            tool_calls=[
                {
                    "name": "ls",
                    "args": {"path": "/workspace/repository"},
                    "id": "call_repository_ls",
                }
            ],
        ),
        ToolMessage(
            content='{"entries":["src"]}',
            tool_call_id="call_repository_ls",
            name="ls",
        ),
    ]
    request = _BillingRequest(
        _BillingModel("llm7", "codestral-latest"),
        messages=messages,
    )
    provider_calls = []

    def provider_handler(next_request):
        provider_calls.append((next_request.model.provider, next_request.messages))
        if next_request.model.provider == "llm7":
            raise UpstreamUnprocessableError("upstream provider could not process the request")
        return ModelResponse(
            result=[],
            structured_response={
                "summary": "Gemini completed the same repository conversation"
            },
        )

    fallback = ProviderFallbackMiddleware()
    billing = BillingMeteringMiddleware()

    with activate_billing_metering(session):
        first_response = fallback.wrap_model_call(
            request,
            lambda next_request: billing.wrap_model_call(
                next_request,
                provider_handler,
            ),
        )
        assert isinstance(first_response, ModelResponse)
        assert first_response.structured_response == {
            "summary": "Gemini completed the same repository conversation"
        }
        second_response = fallback.wrap_model_call(
            request,
            lambda next_request: billing.wrap_model_call(
                next_request,
                provider_handler,
            ),
        )
        assert isinstance(second_response, ModelResponse)

    assert provider_calls == [
        ("llm7", messages),
        ("google_genai", messages),
        ("google_genai", messages),
    ]
    assert session.provider_route_disabled("llm7") is True
    assert len(client.claims) == 3
    assert len(client.payloads) == 2
    assert [payload.provider for payload in client.payloads] == [
        "GOOGLE_GENAI",
        "GOOGLE_GENAI",
    ]
    assert [event_type for event_type, _ in stream_events] == [
        "PROVIDER_FALLBACK",
    ]


def test_provider_route_incompatibility_is_fallback_before_generic_422_terminal():
    error = UpstreamUnprocessableError("upstream provider could not process the request")

    assert is_provider_route_incompatibility(error)
    assert provider_fallback_failure(error)
    assert provider_circuit_breaker_failure(error)


def test_lcsp_billing_402_remains_terminal_without_provider_fallback():
    error = BillingBudgetExhausted(
        "Billing budget exhausted before provider call",
        error_code="BILLING_INSUFFICIENT_CREDITS",
    )

    assert not provider_fallback_failure(error)
    assert not provider_circuit_breaker_failure(error)


def test_local_validation_422_remains_terminal_without_provider_fallback():
    error = LocalValidationError("callback payload invalid")

    assert not is_provider_route_incompatibility(error)
    assert not provider_fallback_failure(error)
    assert not provider_circuit_breaker_failure(error)


def test_configured_provider_requires_its_own_credentials(monkeypatch):
    monkeypatch.delenv("LLM7_API_KEY", raising=False)
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")

    with pytest.raises(RuntimeError, match="requires LLM7_API_KEY"):
        configured_fallback_providers()


def test_invalid_fallback_provider_fails_closed(monkeypatch):
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "unknown-gateway")

    with pytest.raises(RuntimeError, match="must be one of"):
        configured_fallback_providers()


def test_primary_key_pool_exhausts_before_llm7_pool(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-a,openai-b")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-a,llm7-b")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    response = ModelResponse(result=[])
    raw_handler = MagicMock(
        side_effect=[QuotaError(), QuotaError(), QuotaError(), QuotaError(), response]
    )

    assert _sync_chain(request, raw_handler) is response
    assert raw_handler.call_count == 5
    requests = [call.args[0] for call in raw_handler.call_args_list]
    assert [model_provider(item.model) for item in requests] == [
        "openai",
        "openai",
        "openai",
        "llm7",
        "llm7",
    ]
    # The OpenAI pool waits once and retries its soonest slot before llm7 is used.
    assert [
        item.model.openai_api_key.get_secret_value()
        for item in requests
    ] == ["openai-a", "openai-b", "openai-a", "llm7-a", "llm7-b"]
    llm7_model = requests[-1].model
    assert str(llm7_model.openai_api_base).rstrip("/") == "https://api.llm7.io/v1"
    assert llm7_model.use_responses_api is False


def test_single_primary_auth_failure_moves_to_llm7(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-only")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-only")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    response = ModelResponse(result=[])
    raw_handler = MagicMock(side_effect=[AuthError(), response])

    assert _sync_chain(request, raw_handler) is response
    assert [model_provider(call.args[0].model) for call in raw_handler.call_args_list] == [
        "openai",
        "llm7",
    ]


def test_llm7_capacity_failure_rotates_keys_then_moves_to_google(monkeypatch):
    monkeypatch.setenv("LLM7_API_KEY", "llm7-a,llm7-b")
    monkeypatch.setenv("GOOGLE_API_KEY", "google-only")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "google_genai")
    request = ModelRequest(model=_llm7_model(), messages=[], tools=[])
    response = ModelResponse(result=[])
    raw_handler = MagicMock(
        side_effect=[
            CapacityError("insufficient balance"),
            CapacityError("insufficient balance"),
            response,
        ]
    )

    assert _sync_chain(request, raw_handler) is response
    requests = [call.args[0] for call in raw_handler.call_args_list]
    assert [model_provider(item.model) for item in requests] == [
        "llm7",
        "llm7",
        "google_genai",
    ]
    assert [
        item.model.openai_api_key.get_secret_value()
        for item in requests[:2]
    ] == ["llm7-a", "llm7-b"]
    assert requests[-1].model.google_api_key.get_secret_value() == "google-only"


@pytest.mark.asyncio
async def test_async_provider_fallback_keeps_llm7_key_rotation(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-only")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-a,llm7-b")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    response = ModelResponse(result=[])
    raw_handler = AsyncMock(side_effect=[QuotaError(), QuotaError(), response])

    assert await _async_chain(request, raw_handler) is response
    requests = [call.args[0] for call in raw_handler.call_args_list]
    assert [model_provider(item.model) for item in requests] == [
        "openai",
        "llm7",
        "llm7",
    ]
    assert requests[-1].model.openai_api_key.get_secret_value() == "llm7-b"


def test_chain_advances_openai_then_google_then_llm7(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-a,openai-b")
    monkeypatch.setenv("GOOGLE_API_KEY", "google-a,google-b")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-only")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "google_genai")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_2", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    response = ModelResponse(result=[])
    raw_handler = MagicMock(side_effect=[QuotaError()] * 6 + [response])

    assert _sync_chain(request, raw_handler) is response
    assert [model_provider(call.args[0].model) for call in raw_handler.call_args_list] == [
        "openai",
        "openai",
        "openai",
        "google_genai",
        "google_genai",
        "google_genai",
        "llm7",
    ]


def test_schema_request_failure_does_not_cross_provider(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-only")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-only")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    raw_handler = MagicMock(side_effect=TypeError("bad structured request"))

    with pytest.raises(TypeError, match="bad structured request"):
        _sync_chain(request, raw_handler)
    assert raw_handler.call_count == 1


def test_all_provider_pools_exhaust_to_terminal_error(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-a,openai-b")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-a,llm7-b")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    raw_handler = MagicMock(side_effect=QuotaError())

    with pytest.raises(TerminalCredentialError, match="provider routes exhausted"):
        _sync_chain(request, raw_handler)
    # Each two-slot pool: both slots, one cooldown wait, one retry of the soonest slot.
    assert raw_handler.call_count == 6


def test_current_provider_is_not_reentered_from_fallback_chain(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "openai-only")
    monkeypatch.setenv("LLM7_API_KEY", "llm7-only")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_1", "openai")
    monkeypatch.setenv("LLM_FALLBACK_PROVIDER_2", "llm7")
    request = ModelRequest(model=_openai_model(), messages=[], tools=[])
    response = ModelResponse(result=[])
    raw_handler = MagicMock(side_effect=[QuotaError(), response])

    assert _sync_chain(request, raw_handler) is response
    assert [model_provider(call.args[0].model) for call in raw_handler.call_args_list] == [
        "openai",
        "llm7",
    ]
