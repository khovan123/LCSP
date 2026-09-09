"""Official LangChain middleware shared by LCSP model-assisted boundaries."""

from __future__ import annotations

from langchain.agents.middleware import (
    ModelCallLimitMiddleware,
    ModelRetryMiddleware,
    PIIMiddleware,
)
from middleware.redaction import (
    ANTHROPIC_KEY_PATTERN,
    AWS_ACCESS_KEY_PATTERN,
    BEARER_TOKEN_PATTERN,
    GENERIC_ASSIGNMENT_PATTERN,
    GITHUB_TOKEN_PATTERN,
)


def _redacting_pii(pii_type: str, detector: str | None = None) -> PIIMiddleware:
    """Create the standard LangChain PII guardrail for model data surfaces."""
    return PIIMiddleware(
        pii_type,
        detector=detector,
        strategy="redact",
        apply_to_output=True,
        apply_to_tool_results=True,
    )


# These are framework middleware instances, not a second policy engine. Domain
# guardrails stay at their deterministic persistence boundaries.
MODEL_GOVERNANCE_MIDDLEWARE = (
    _redacting_pii("email"),
    _redacting_pii("credit_card"),
    _redacting_pii("github_token", GITHUB_TOKEN_PATTERN.pattern),
    _redacting_pii("bearer_token", BEARER_TOKEN_PATTERN.pattern),
    _redacting_pii("aws_access_key", AWS_ACCESS_KEY_PATTERN.pattern),
    _redacting_pii("anthropic_key", ANTHROPIC_KEY_PATTERN.pattern),
    _redacting_pii("credential_assignment", GENERIC_ASSIGNMENT_PATTERN.pattern),
    # A synthetic error message has no structured handoff and hides the cause.
    ModelRetryMiddleware(max_retries=2, on_failure="error"),
    ModelCallLimitMiddleware(run_limit=2, exit_behavior="error"),
)

TRIAGE_MODEL_GOVERNANCE_MIDDLEWARE = (
    *MODEL_GOVERNANCE_MIDDLEWARE[:-1],
    # Read/persist up to 500 claimed rules, then finish and return the handoff.
    ModelCallLimitMiddleware(run_limit=1100, exit_behavior="error"),
)
