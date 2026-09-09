from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain.agents.middleware import ModelResponse, ModelRetryMiddleware, PIIMiddleware

from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE


def test_model_governance_redacts_standard_and_lcsp_credentials() -> None:
    pii_middleware = {
        middleware.pii_type: middleware
        for middleware in MODEL_GOVERNANCE_MIDDLEWARE
        if isinstance(middleware, PIIMiddleware)
    }

    assert set(pii_middleware) == {
        "email",
        "credit_card",
        "github_token",
        "bearer_token",
        "aws_access_key",
        "anthropic_key",
        "credential_assignment",
    }
    assert all(
        middleware.apply_to_output and middleware.apply_to_tool_results
        for middleware in pii_middleware.values()
    )


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_exhausted_model_retries_preserve_original_error(monkeypatch, asynchronous) -> None:
    retry = next(
        item for item in MODEL_GOVERNANCE_MIDDLEWARE
        if isinstance(item, ModelRetryMiddleware)
    )
    monkeypatch.setattr(retry, "initial_delay", 0)
    error = RuntimeError("provider rejected structured output")
    handler = AsyncMock(side_effect=error) if asynchronous else MagicMock(side_effect=error)

    with pytest.raises(RuntimeError) as caught:
        if asynchronous:
            await retry.awrap_model_call(MagicMock(), handler)
        else:
            retry.wrap_model_call(MagicMock(), handler)

    assert caught.value is error
    assert handler.call_count == 3


def test_model_retry_preserves_structured_response_after_transient_failure(monkeypatch) -> None:
    retry = next(
        item for item in MODEL_GOVERNANCE_MIDDLEWARE
        if isinstance(item, ModelRetryMiddleware)
    )
    monkeypatch.setattr(retry, "initial_delay", 0)
    response = ModelResponse(result=[], structured_response={"outcome": "FAILED"})
    handler = MagicMock(side_effect=[RuntimeError("temporary provider failure"), response])

    assert retry.wrap_model_call(MagicMock(), handler) is response
    assert handler.call_count == 2
