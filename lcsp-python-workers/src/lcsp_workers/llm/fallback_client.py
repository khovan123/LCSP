"""Dispatch LLM calls across primary/fallback providers under explicit policy."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

import httpx

from lcsp_workers.platform.logging import get_logger

from .budget_tracker import BudgetExceeded
from .gateway_client import (
    LLMGatewayClient,
    LLMResponse,
    LLMToolDefinition,
    LLMToolResponse,
)
from .prompt_safety import PromptSafetyViolation


logger = get_logger(__name__)


@runtime_checkable
class LLMClientProtocol(Protocol):
    """Minimal completion interface consumed by worker orchestration code."""

    def complete(
        self,
        prompt: str,
        workflow_run_id: str,
        node_name: str,
        max_tokens: int | None = None,
        correlationId: str | None = None,
    ) -> LLMResponse:
        """Execute a plain-text completion request."""
        ...

    def complete_with_tools(
        self,
        prompt: str,
        *,
        tools: list[LLMToolDefinition],
        workflow_run_id: str,
        node_name: str,
        max_tokens: int | None = None,
        correlationId: str | None = None,
    ) -> LLMToolResponse:
        """Execute a completion request that may return structured tool calls."""
        ...


class LlmProviderAuthError(Exception):
    """Raised for provider authentication failures."""


class LlmProviderRateLimitError(Exception):
    """Raised when a provider rejects a request due to rate limiting."""


class LlmProviderQuotaError(Exception):
    """Raised when a provider account has exhausted its quota."""


class LlmProviderTimeoutError(Exception):
    """Raised when a provider request exceeds its timeout."""


class LlmProviderNetworkError(Exception):
    """Raised for transport-level provider connectivity failures."""


class LlmProviderUnavailableError(Exception):
    """Raised when no eligible provider completes the operation."""

    def __init__(self, reasons: list[str]):
        """Store provider failure reasons for audit/debug visibility.

        Args:
            reasons: Ordered ``provider:error_code`` entries from attempted providers.
        """
        self.reasons = reasons
        super().__init__("No eligible LLM provider completed the request.")


@dataclass(frozen=True)
class LlmProviderCandidate:
    """Named LLM gateway client considered during provider dispatch."""

    name: str
    client: LLMGatewayClient


class PrimaryThenFallbackLLMClient:
    """Try providers in order while honoring explicit fallback error codes."""

    def __init__(
        self,
        providers: tuple[LlmProviderCandidate, ...],
        *,
        fallback_on_codes: tuple[str, ...],
        max_provider_attempts: int,
    ) -> None:
        """Create a bounded provider-fallback dispatcher.

        Args:
            providers: Ordered provider candidates; first entry is primary.
            fallback_on_codes: Classified error codes allowed to trigger fallback.
            max_provider_attempts: Maximum provider calls for one logical request.

        Raises:
            ValueError: If no providers are supplied or the attempt limit is invalid.
        """
        if not providers:
            raise ValueError("at least one LLM provider candidate is required")
        if max_provider_attempts < 1:
            raise ValueError("max_provider_attempts must be >= 1")
        self._providers = providers
        self._fallback_on_codes = {code.upper() for code in fallback_on_codes}
        self._max_provider_attempts = max_provider_attempts

    def complete(
        self,
        prompt: str,
        workflow_run_id: str,
        node_name: str,
        max_tokens: int | None = None,
        correlationId: str | None = None,
    ) -> LLMResponse:
        """Dispatch a plain completion and emit safe request/response telemetry."""
        self._log_request(
            operation="complete",
            prompt=prompt,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            max_tokens=max_tokens,
            correlation_id=correlationId,
        )
        try:
            result = self._dispatch(
                lambda client: client.complete(
                    prompt=prompt,
                    workflow_run_id=workflow_run_id,
                    node_name=node_name,
                    max_tokens=max_tokens,
                    correlationId=correlationId,
                )
            )
        except Exception as exc:
            self._log_failure(
                operation="complete",
                workflow_run_id=workflow_run_id,
                node_name=node_name,
                correlation_id=correlationId,
                error=exc,
            )
            raise
        self._log_response(
            operation="complete",
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            correlation_id=correlationId,
            response=result,
        )
        return result

    def complete_with_tools(
        self,
        prompt: str,
        *,
        tools: list[LLMToolDefinition],
        workflow_run_id: str,
        node_name: str,
        max_tokens: int | None = None,
        correlationId: str | None = None,
    ) -> LLMToolResponse:
        """Dispatch a tool-enabled completion and emit safe request telemetry."""
        self._log_request(
            operation="complete_with_tools",
            prompt=prompt,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            max_tokens=max_tokens,
            correlation_id=correlationId,
            tool_names=[tool.name for tool in tools],
        )
        try:
            result = self._dispatch(
                lambda client: client.complete_with_tools(
                    prompt=prompt,
                    tools=tools,
                    workflow_run_id=workflow_run_id,
                    node_name=node_name,
                    max_tokens=max_tokens,
                    correlationId=correlationId,
                )
            )
        except Exception as exc:
            self._log_failure(
                operation="complete_with_tools",
                workflow_run_id=workflow_run_id,
                node_name=node_name,
                correlation_id=correlationId,
                error=exc,
            )
            raise
        self._log_response(
            operation="complete_with_tools",
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            correlation_id=correlationId,
            response=result,
        )
        return result

    def _dispatch(self, operation):
        """Run one operation against eligible providers until policy stops fallback."""
        reasons: list[str] = []
        attempts = 0
        for provider in self._providers:
            if attempts >= self._max_provider_attempts:
                break
            attempts += 1
            try:
                return operation(provider.client)
            except (PromptSafetyViolation, BudgetExceeded):
                raise
            except Exception as exc:
                code = _classify_provider_error(exc)
                reasons.append(f"{provider.name}:{code}")
                if code not in self._fallback_on_codes:
                    raise
                continue
        raise LlmProviderUnavailableError(reasons)

    def _log_request(
        self,
        *,
        operation: str,
        prompt: str,
        workflow_run_id: str,
        node_name: str,
        max_tokens: int | None,
        correlation_id: str | None,
        tool_names: list[str] | None = None,
    ) -> None:
        """Log one safe logical LLM request without prompt or credential contents."""
        logger.info(
            "LLM_REQUEST",
            operation=operation,
            provider_chain=[provider.name for provider in self._providers],
            model_chain=[provider.client.model for provider in self._providers],
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            max_tokens=max_tokens,
            prompt_chars=len(prompt),
            tool_names=tool_names or [],
            correlationId=correlation_id,
        )

    @staticmethod
    def _log_response(
        *,
        operation: str,
        workflow_run_id: str,
        node_name: str,
        correlation_id: str | None,
        response: LLMResponse,
    ) -> None:
        """Log normalized provider usage after a successful LLM request."""
        logger.info(
            "LLM_RESPONSE",
            operation=operation,
            provider=response.provider,
            model=response.model,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            request_id=response.request_id,
            input_tokens=response.input_tokens,
            output_tokens=response.output_tokens,
            tool_call_count=len(getattr(response, "tool_calls", ()) or ()),
            correlationId=correlation_id,
        )

    @staticmethod
    def _log_failure(
        *,
        operation: str,
        workflow_run_id: str,
        node_name: str,
        correlation_id: str | None,
        error: Exception,
    ) -> None:
        """Log safe failure metadata while preserving the original exception."""
        logger.error(
            "LLM_REQUEST_FAILED",
            operation=operation,
            workflow_run_id=workflow_run_id,
            node_name=node_name,
            error_type=type(error).__name__,
            error_code=_classify_provider_error(error),
            correlationId=correlation_id,
        )


def _classify_provider_error(exc: Exception) -> str:
    """Normalize provider/transport exceptions into fallback policy codes.

    Args:
        exc: Exception raised by a provider client.

    Returns:
        One of the known provider error codes or ``UNKNOWN``.
    """
    if isinstance(exc, LlmProviderAuthError):
        return "AUTH"
    if isinstance(exc, LlmProviderRateLimitError):
        return "RATE_LIMIT"
    if isinstance(exc, LlmProviderQuotaError):
        return "QUOTA"
    if isinstance(exc, LlmProviderTimeoutError):
        return "TIMEOUT"
    if isinstance(exc, LlmProviderNetworkError):
        return "NETWORK"

    status_code = getattr(exc, "status_code", None)
    if status_code == 401 or status_code == 403:
        return "AUTH"
    if status_code == 408:
        return "TIMEOUT"
    if status_code == 429:
        return "RATE_LIMIT"

    response = getattr(exc, "response", None)
    if response is not None:
        response_status = getattr(response, "status_code", None)
        if response_status == 401 or response_status == 403:
            return "AUTH"
        if response_status == 408:
            return "TIMEOUT"
        if response_status == 429:
            return "RATE_LIMIT"

    if isinstance(exc, httpx.TimeoutException):
        return "TIMEOUT"
    if isinstance(exc, httpx.RequestError):
        return "NETWORK"

    message = str(exc).lower()
    if "quota" in message or "insufficient_quota" in message:
        return "QUOTA"
    if "rate limit" in message or "too many requests" in message:
        return "RATE_LIMIT"
    if "timeout" in message or "timed out" in message:
        return "TIMEOUT"
    if "network" in message or "connection" in message:
        return "NETWORK"
    if "auth" in message or "invalid api key" in message or "unauthorized" in message:
        return "AUTH"
    return "UNKNOWN"
