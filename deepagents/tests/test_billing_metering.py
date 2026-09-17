from types import SimpleNamespace

from middleware.billing_metering import (
    BillingReservationUnavailable,
    BillingMeteringError,
    BillingMeteringMiddleware,
    BillingMeteringSession,
    activate_billing_metering,
    extract_provider_usage,
)
from tools.common.capabilities.managed.invocation import _billing_metering_session
from tools.common.capabilities.managed.rabbitmq_consumer import _with_billing_attempt


class FakeClient:
    def __init__(self):
        self.payloads = []

    def post_settled_usage(self, payload):
        self.payloads.append(payload)


class FailingClient:
    def post_settled_usage(self, _payload):
        raise RuntimeError("billing-api-unavailable")


def response(*, input_tokens=3, output_tokens=2, cached=1, response_id="resp-1"):
    return SimpleNamespace(
        usage_metadata={
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "total_tokens": input_tokens + output_tokens,
            "input_token_details": {"cache_read": cached},
        },
        response_metadata={"id": response_id},
    )


def test_extract_provider_usage_is_numeric_and_does_not_persist_reasoning_content():
    usage = extract_provider_usage(
        response(), SimpleNamespace(provider="openai", model_name="gpt-test")
    )

    assert usage == {
        "inputTokens": "3",
        "cachedInputTokens": "1",
        "outputTokens": "2",
        "totalTokens": "5",
        "providerResponseId": "resp-1",
    }
    assert "reasoning" not in usage


def test_extract_provider_usage_fails_closed_when_required_dimensions_are_missing():
    assert extract_provider_usage(
        SimpleNamespace(usage_metadata={"input_tokens": 1}),
        SimpleNamespace(provider="openai", model_name="gpt-test"),
    ) is None


def test_metering_middleware_records_one_payload_for_one_response():
    client = FakeClient()
    session = BillingMeteringSession(
        api_client=client,
        assessment_id="assessment-1",
        run_id="run-1",
        reservation_id="reservation-1",
        agent_role="planner",
        effective_runtime_model={
            "policyVersion": "policy-1",
            "effectiveAt": "2026-01-01T00:00:00Z",
        },
    )
    request = SimpleNamespace(model=SimpleNamespace(provider="openai", model_name="gpt-test"))
    middleware = BillingMeteringMiddleware()

    with activate_billing_metering(session):
        result = middleware.wrap_model_call(request, lambda _: response())

    assert result is not None
    assert len(client.payloads) == 1
    payload = client.payloads[0]
    assert payload.assessmentId == "assessment-1"
    assert payload.runId == "run-1"
    assert payload.agentRole == "planner"
    assert payload.providerResponseId == "resp-1"
    assert payload.model_dump(exclude_none=True).get("reasoningTokens") is None


def test_metering_middleware_records_missing_usage_for_terminal_release():
    client = FakeClient()
    session = BillingMeteringSession(
        api_client=client,
        assessment_id="assessment-1",
        run_id="run-1",
        reservation_id="reservation-1",
        agent_role="planner",
        effective_runtime_model={
            "policyVersion": "policy-1",
            "effectiveAt": "2026-01-01T00:00:00Z",
        },
    )
    request = SimpleNamespace(model=SimpleNamespace(provider="openai", model_name="gpt-test"))

    with activate_billing_metering(session):
        BillingMeteringMiddleware().wrap_model_call(
            request,
            lambda _: SimpleNamespace(
                usage_metadata={"input_tokens": 1},
                response_metadata={"id": "missing-usage-response"},
            ),
        )
    assert len(client.payloads) == 1
    assert client.payloads[0].inputTokens is None
    assert client.payloads[0].outputTokens is None
    assert client.payloads[0].providerResponseId == "missing-usage-response"


def test_reservation_replay_refuses_a_terminal_reservation_before_model_spend():
    class Client(FakeClient):
        def reserve_billing_credits(self, _payload):
            return {"id": "reservation-1", "status": "RELEASED"}

    with __import__("pytest").raises(BillingReservationUnavailable):
        BillingMeteringSession.reserve(
            api_client=Client(),
            assessment_id="assessment-1",
            run_id="run-1",
            agent_role="planner",
            amount_credits="100",
            idempotency_key="outbox:1:planner",
        )


def test_assessment_invocation_cannot_bypass_server_issued_billing_context():
    import pytest

    with pytest.raises(ValueError, match="billing context is required"):
        _billing_metering_session(
            "planner",
            {"assessmentId": "assessment-1", "runId": "run-1"},
            "corr-1",
        )


def test_non_assessment_invocation_can_remain_unbilled():
    assert _billing_metering_session("legal", {"requestId": "request-1"}, "corr-1") is None


def test_broker_retry_attempt_is_carried_only_inside_billing_context():
    message = {
        "assessmentId": "assessment-1",
        "billing": {"idempotencyKey": "outbox:1:billing-reservation"},
    }
    retried = _with_billing_attempt(message, 2)

    assert retried["billing"]["attempt"] == "2"
    assert "attempt" not in message["billing"]


def test_usage_delivery_failure_is_not_converted_to_provider_fallback():
    session = BillingMeteringSession(
        api_client=FailingClient(),
        assessment_id="assessment-1",
        run_id="run-1",
        reservation_id="reservation-1",
        agent_role="planner",
    )
    request = SimpleNamespace(
        model=SimpleNamespace(provider="openai", model_name="gpt-test")
    )

    import pytest

    with activate_billing_metering(session), pytest.raises(BillingMeteringError):
        BillingMeteringMiddleware().wrap_model_call(request, lambda _: response())
