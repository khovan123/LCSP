"""Shared terminal failure classification for model calls and queue delivery."""
from langchain.agents.structured_output import StructuredOutputError
from langchain_core.exceptions import (
    ModelAuthenticationError,
    ModelError,
    ModelPermissionDeniedError,
)
from pydantic import ValidationError


_AUTH_FAILURE_STATUSES = frozenset({401, 403})
# Typed provider rejections of the credential, not of the request. They are
# non-retryable for the same credential, yet another credential or provider may succeed.
_CREDENTIAL_MODEL_ERRORS = (ModelAuthenticationError, ModelPermissionDeniedError)
_PROVIDER_CAPACITY_STATUSES = frozenset({402, 429})
_PROVIDER_CAPACITY_CODES = frozenset(
    {
        "billing_hard_limit_reached",
        "insufficient_balance",
        "insufficient_quota",
        "quota_exceeded",
        "rate_limit_exceeded",
    }
)
_PROVIDER_ROUTE_INCOMPATIBILITY_CODES = frozenset(
    {
        "upstream_unprocessable_request",
    }
)


class TerminalCredentialError(RuntimeError):
    """Every configured credential has failed; do not retry the list."""


class TerminalSchemaError(ValueError):
    """Structured output repair would repeat a failed task."""


def error_status(error: BaseException) -> int | None:
    """Return the first integer HTTP-like status found on an exception chain."""
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        status = getattr(current, "status_code", None) or getattr(current, "code", None)
        if isinstance(status, int):
            return status
        current = current.__cause__ or current.__context__
    return None


def _error_codes(error: BaseException) -> set[str]:
    codes: set[str] = set()
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        for attr in ("error_code", "type", "code"):
            value = getattr(current, attr, None)
            if isinstance(value, str) and value.strip():
                codes.add(value.strip().lower())
        for payload in (
            getattr(current, "body", None),
            getattr(current, "response", None),
        ):
            if isinstance(payload, dict):
                error_payload = payload.get("error")
                if isinstance(error_payload, dict):
                    for key in ("code", "type"):
                        value = error_payload.get(key)
                        if isinstance(value, str) and value.strip():
                            codes.add(value.strip().lower())
        text = str(current).lower()
        for code in _PROVIDER_CAPACITY_CODES:
            if code in text:
                codes.add(code)
        current = current.__cause__ or current.__context__
    return codes


def _is_credential_model_error(error: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, _CREDENTIAL_MODEL_ERRORS):
            return True
        current = current.__cause__ or current.__context__
    return False


def is_auth_failure(error: BaseException) -> bool:
    """Return whether the provider rejected the credential (401/403 or typed auth error).

    An auth failure is never retried with the same credential (see retry_model_error),
    but it is not a terminal task error: credential and provider fallback may continue.
    """
    return error_status(error) in _AUTH_FAILURE_STATUSES or _is_credential_model_error(error)


def is_provider_capacity_failure(error: BaseException) -> bool:
    if error_status(error) in _PROVIDER_CAPACITY_STATUSES:
        return True
    return bool(_error_codes(error) & _PROVIDER_CAPACITY_CODES)


def is_provider_route_incompatibility(error: BaseException) -> bool:
    """Return whether an external provider route rejected a valid agent turn shape."""
    return (
        error_status(error) == 422
        and bool(_error_codes(error) & _PROVIDER_ROUTE_INCOMPATIBILITY_CODES)
    )


def is_terminal_task_error(error: BaseException) -> bool:
    seen: set[int] = set()
    current: BaseException | None = error
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        if isinstance(current, (TypeError, ValidationError, StructuredOutputError, TerminalSchemaError, TerminalCredentialError)):
            return True
        if type(current).__name__ == "BillingBudgetExhausted":
            return True
        # Our own API rejected this payload. The boundary re-runs the model on every
        # redelivery, so requeueing an identical rejected decision is an unbounded spend
        # that never converges; fail loudly instead. Duck-typed to keep the queue policy
        # independent of the API client module.
        if getattr(current, "callback_client_error", False):
            return True
        if type(current).__name__ == "BillingFinalizationError":
            return True
        # Provider request/schema rejection cannot succeed with the same request.
        status = getattr(current, "status_code", None) or getattr(current, "code", None)
        if status in (400, 404, 422):
            return True
        # A non-retryable credential rejection only rules out the same credential; it is
        # classified by is_auth_failure so credential/provider fallback can continue.
        if (
            isinstance(current, ModelError)
            and not current.is_retryable
            and not isinstance(current, _CREDENTIAL_MODEL_ERRORS)
        ):
            return True
        current = current.__cause__ or current.__context__
    return False


def is_terminal_boundary_error(error: BaseException) -> bool:
    """Return whether a failure that escaped the model stack must stop the whole task.

    Inside the model stack an auth failure moves to another credential or provider. Once
    it escapes to a task boundary, every eligible route has already been tried, so
    redelivering the task would only resend a rejected credential. A non-retryable
    boundary failure is never redelivered either, so its reservation can be released.
    """
    return (
        is_terminal_task_error(error)
        or is_auth_failure(error)
        or _is_non_retryable_boundary_error(error)
    )


def _is_non_retryable_boundary_error(error: BaseException) -> bool:
    # Duck-typed to keep the failure policy independent of the Agent Runtime module.
    return any(
        cls.__name__ == "NonRetryableAgentBoundaryError" for cls in type(error).__mro__
    )


def retry_model_error(error: Exception) -> bool:
    # Re-sending the same request with the same rejected credential cannot succeed.
    # Queue redelivery policy lives in is_terminal_boundary_error.
    return (
        not is_terminal_task_error(error)
        and not is_auth_failure(error)
        and not is_provider_capacity_failure(error)
    )
