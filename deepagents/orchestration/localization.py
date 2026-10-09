"""Response localization and lightweight output normalization for LCSP Deep Agents.

Enforces user/system selected language authority (e.g. en, vi) on final user-visible
agent responses via dynamic prompt guidance and a configurable lightweight post-processing
transform model.
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Mapping, Sequence
from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from pydantic import BaseModel

from orchestration.context import (
    DEFAULT_RESPONSE_LANGUAGE,
    SUPPORTED_RESPONSE_LANGUAGES,
    resolve_response_language,
)
from tools.common.capabilities.platform.logging import get_logger

logger = get_logger(__name__)


@dataclass(frozen=True)
class LocaleDefinition:
    """Metadata and prompt directive for one supported response locale."""

    code: str
    name: str
    english_name: str
    instruction: str


# Canonical registry of supported locales for deep agent response localization.
# Adding a new locale here immediately enables dynamic prompting and transform routing.
SUPPORTED_LOCALES: dict[str, LocaleDefinition] = {
    "en": LocaleDefinition(
        code="en",
        name="English",
        english_name="English",
        instruction="Produce your final user-visible response in English.",
    ),
    "vi": LocaleDefinition(
        code="vi",
        name="Tiếng Việt",
        english_name="Vietnamese",
        instruction="Produce your final user-visible response in Vietnamese (Tiếng Việt).",
    ),
}


@dataclass(frozen=True)
class ResponseLocalizationConfig:
    """Configuration for the post-processing lightweight transform model."""

    enabled: bool = True
    role: str = "response-transform"
    timeout_seconds: float = 10.0
    max_output_tokens: int = 4096
    supported_locales: tuple[str, ...] = SUPPORTED_RESPONSE_LANGUAGES


def load_localization_config() -> ResponseLocalizationConfig:
    """Load localization configuration from environment / defaults."""
    raw_enabled = os.environ.get("LCSP_RESPONSE_LOCALIZATION_ENABLED", "1").strip().lower()
    enabled = raw_enabled not in {"0", "false", "no", "off"}
    raw_timeout = os.environ.get("LCSP_LOCALIZATION_TIMEOUT_SECONDS", "10.0").strip()
    try:
        timeout = float(raw_timeout)
    except ValueError:
        timeout = 10.0
    role = os.environ.get("LCSP_LOCALIZATION_ROLE", "response-transform").strip() or "response-transform"
    return ResponseLocalizationConfig(
        enabled=enabled,
        role=role,
        timeout_seconds=timeout,
    )


def get_language_prompt_instruction(locale: str) -> str:
    """Generate dynamic system prompt instruction for the main agent."""
    normalized_locale = str(locale).strip().lower() if locale else DEFAULT_RESPONSE_LANGUAGE
    definition = SUPPORTED_LOCALES.get(normalized_locale) or SUPPORTED_LOCALES.get(DEFAULT_RESPONSE_LANGUAGE, SUPPORTED_LOCALES["en"])
    return (
        f"Final Response Language Directive:\n"
        f"- {definition.instruction}\n"
        f"- Keep all technical identifiers, file paths, URLs, citations/references, code blocks/inline code, "
        f"API field names, Jira/GitHub identifiers, and enum/constant values in their canonical format.\n"
        f"- Do NOT translate internal machine identifiers, tool names, or structured JSON keys."
    )


TRANSFORM_SYSTEM_PROMPT_TEMPLATE = """You are a specialized output localization and normalization engine for the LCSP compliance platform.
Your ONLY task is to normalize/translate the user-visible final response into the target language: {target_language} ({target_locale}).

PRESERVATION INVARIANTS (MUST PRESERVE EXACTLY WITHOUT MODIFICATION):
1. Facts, conclusions, caveats, reasoning outcomes, and recommendations.
2. Numbers, arithmetic calculations, percentages, and metrics.
3. URLs, web links, domain names, and anchors.
4. Citations and source references (e.g. [1], [file.py#L10-L20], article numbers).
5. Jira/GitHub identifiers, issue/PR numbers (e.g. LCSP-123, #456).
6. File paths, directory paths, package paths, and filenames (e.g. /workspace/repo/src/index.ts).
7. Code blocks and inline code (`...`) verbatim, including code logic, syntax, and variable names.
8. JSON keys, API field names, HTTP status codes, and SCREAMING_SNAKE_CASE enum/constant values.
9. Command names, CLI syntax, and error codes.
10. Markdown structure, formatting, tables, lists, and headings.

TRANSLATION RULES:
- Translate ONLY the natural-language explanations and user-facing descriptive text into {target_language}.
- Do NOT add any preamble, greeting, commentary, or conversational filler (e.g. do NOT say "Here is the translated response:").
- Output ONLY the final normalized response.
- If the text is already completely in {target_language}, return it unchanged.
- Never alter facts, remove warnings, or invent new information.
"""



def _get_transform_model(config: ResponseLocalizationConfig) -> Any:
    """Resolve the lightweight chat model configured for response transformation."""
    try:
        from model_policy import resolve_agent_model
        return resolve_agent_model(config.role)
    except Exception as error:
        logger.warning(
            "RESPONSE_LOCALIZATION_MODEL_RESOLUTION_FAILED",
            role=config.role,
            error=str(error),
        )
        return None


def transform_response_text(
    text: str,
    target_locale: str,
    *,
    model: Any | None = None,
    config: ResponseLocalizationConfig | None = None,
) -> tuple[str, dict[str, Any]]:
    """Transform user-visible text into the target locale using a lightweight model.

    Returns:
        (result_text, telemetry_dict)
    """
    if config is None:
        config = load_localization_config()

    normalized_locale = str(target_locale).strip().lower() if target_locale else DEFAULT_RESPONSE_LANGUAGE
    telemetry: dict[str, Any] = {
        "locale": normalized_locale,
        "status": "SKIPPED",
        "model": None,
        "latency_ms": 0.0,
        "token_usage": None,
        "fallback_used": False,
        "reason": None,
    }

    if not config.enabled:
        telemetry["reason"] = "LOCALIZATION_DISABLED"
        return text, telemetry

    if not text or not text.strip():
        telemetry["reason"] = "EMPTY_TEXT"
        return text, telemetry

    if normalized_locale not in config.supported_locales and normalized_locale not in SUPPORTED_LOCALES:
        telemetry["reason"] = f"UNSUPPORTED_LOCALE_{normalized_locale}"
        return text, telemetry

    definition = SUPPORTED_LOCALES.get(normalized_locale, SUPPORTED_LOCALES["en"])
    active_model = model or _get_transform_model(config)
    if active_model is None:
        telemetry["status"] = "FALLBACK"
        telemetry["fallback_used"] = True
        telemetry["reason"] = "MODEL_UNAVAILABLE"
        logger.warning(
            "RESPONSE_LOCALIZATION_FALLBACK",
            locale=normalized_locale,
            reason="MODEL_UNAVAILABLE",
        )
        return text, telemetry

    model_name = getattr(active_model, "model_name", None) or getattr(active_model, "model", "lightweight-transform")
    telemetry["model"] = str(model_name)

    system_prompt = TRANSFORM_SYSTEM_PROMPT_TEMPLATE.format(
        target_language=definition.name,
        target_locale=definition.code,
    )
    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=text),
    ]

    start_time = time.monotonic()
    try:
        response = active_model.invoke(messages)
        duration_ms = (time.monotonic() - start_time) * 1000.0
        telemetry["latency_ms"] = round(duration_ms, 2)

        content = response.content if hasattr(response, "content") else str(response)
        if isinstance(content, list):
            content = "".join(
                b.get("text", "") if isinstance(b, dict) else str(b) for b in content
            )
        transformed = str(content).strip()

        # Extract token usage if available
        if hasattr(response, "response_metadata") and isinstance(response.response_metadata, dict):
            usage = response.response_metadata.get("token_usage") or response.response_metadata.get("usage")
            if usage:
                telemetry["token_usage"] = usage

        if transformed:
            telemetry["status"] = "APPLIED"
            logger.info(
                "RESPONSE_LOCALIZATION_APPLIED",
                locale=normalized_locale,
                model=telemetry["model"],
                latency_ms=telemetry["latency_ms"],
                fallback_used=False,
            )
            return transformed, telemetry
        else:
            telemetry["status"] = "FALLBACK"
            telemetry["fallback_used"] = True
            telemetry["reason"] = "EMPTY_MODEL_OUTPUT"
            logger.warning(
                "RESPONSE_LOCALIZATION_FALLBACK",
                locale=normalized_locale,
                reason="EMPTY_MODEL_OUTPUT",
                latency_ms=telemetry["latency_ms"],
            )
            return text, telemetry

    except Exception as exc:
        duration_ms = (time.monotonic() - start_time) * 1000.0
        telemetry["latency_ms"] = round(duration_ms, 2)
        telemetry["status"] = "FALLBACK"
        telemetry["fallback_used"] = True
        telemetry["reason"] = type(exc).__name__
        logger.warning(
            "RESPONSE_LOCALIZATION_FAILED",
            locale=normalized_locale,
            error_type=type(exc).__name__,
            latency_ms=telemetry["latency_ms"],
            fallback_used=True,
        )
        return text, telemetry


def transform_structured_response(
    structured: Any,
    target_locale: str,
    *,
    model: Any | None = None,
    config: ResponseLocalizationConfig | None = None,
) -> tuple[Any, dict[str, Any]]:
    """Transform user-facing string fields of a structured response while preserving schema and keys."""
    normalized_locale = resolve_response_language(target_locale)
    telemetry: dict[str, Any] = {
        "locale": normalized_locale,
        "status": "SKIPPED",
        "fallback_used": False,
    }

    if structured is None:
        return structured, telemetry

    is_pydantic = isinstance(structured, BaseModel)
    data = structured.model_dump() if is_pydantic else (dict(structured) if isinstance(structured, dict) else None)
    if data is None:
        return structured, telemetry

    # User-facing fields to localize in structured objects
    user_facing_fields = {"summary", "message", "explanation", "detail", "description", "label", "notes"}
    updated = dict(data)
    any_transformed = False

    for key, value in data.items():
        if key in user_facing_fields and isinstance(value, str) and value.strip():
            transformed_val, t = transform_response_text(value, target_locale, model=model, config=config)
            if t["status"] == "APPLIED":
                updated[key] = transformed_val
                any_transformed = True

    if any_transformed:
        telemetry["status"] = "APPLIED"
        if is_pydantic:
            try:
                reconstructed = structured.__class__.model_validate(updated)
                return reconstructed, telemetry
            except Exception:
                # Schema validation failed after transform; return original structured response
                telemetry["status"] = "FALLBACK"
                telemetry["fallback_used"] = True
                telemetry["reason"] = "STRUCTURED_VALIDATION_FAILED"
                return structured, telemetry
        return updated, telemetry

    return structured, telemetry
