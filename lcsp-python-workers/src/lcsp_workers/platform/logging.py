"""Configure structured worker logging with correlation and secret redaction."""

import structlog
from lcsp_workers.platform.correlation import get_correlationId
from lcsp_workers.platform.dev_unsafe_trace import unsafe_dev_trace_enabled
from lcsp_workers.platform.redaction import redact_dict


def _inject_correlationId(logger, method_name, event_dict):
    """Attach the active correlation identifier to a structured log event.

    Args:
        logger: Structlog logger invoking the processor.
        method_name: Logging method name supplied by structlog.
        event_dict: Mutable structured event payload.

    Returns:
        The event payload enriched with ``correlationId``.
    """
    event_dict["correlationId"] = get_correlationId()
    return event_dict


def _redact_secrets(logger, method_name, event_dict):
    """Remove configured secret values before a log event is rendered.

    ``LCSP_DEV_UNSAFE_TRACE=true`` deliberately disables this log-rendering
    redaction in non-production environments so local developers can inspect
    exact payloads. Runtime persistence/callback privacy controls are separate
    and remain active.

    Args:
        logger: Structlog logger invoking the processor.
        method_name: Logging method name supplied by structlog.
        event_dict: Structured event payload to sanitize.

    Returns:
        A redacted copy normally, or the original event in explicitly unsafe
        development tracing mode.
    """
    if unsafe_dev_trace_enabled():
        return event_dict
    return redact_dict(event_dict)


def configure_logging(level: str = "INFO") -> None:
    """Configure JSON logging for worker processes.

    Correlation enrichment and secret redaction run before log-level and
    rendering processors. Raw development tracing can explicitly disable log
    redaction but is rejected when ``NODE_ENV=production``.

    Args:
        level: Minimum log level accepted by the bound logger.
    """
    # Evaluate once during configuration so an unsafe production combination
    # fails at process startup rather than after the first diagnostic event.
    unsafe_dev_trace_enabled()
    structlog.configure(
        processors=[
            _inject_correlationId,
            _redact_secrets,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(structlog.stdlib.logging, level.upper(), structlog.stdlib.logging.INFO)
        ),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


def get_logger(name: str):
    """Return a named structlog logger.

    Args:
        name: Logical logger/component name.

    Returns:
        A structlog bound logger for the requested component.
    """
    return structlog.get_logger(name)
