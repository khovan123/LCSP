import structlog
from lcsp_workers.platform.correlation import get_correlation_id

def _inject_correlation_id(logger, method_name, event_dict):
    event_dict["correlation_id"] = get_correlation_id()
    return event_dict

def _redact_secrets(logger, method_name, event_dict):
    SECRET_KEYS = {"password", "token", "secret", "api_key", "authorization"}
    for key in list(event_dict.keys()):
        if key.lower() in SECRET_KEYS:
            event_dict[key] = "***REDACTED***"
    return event_dict

def configure_logging(level: str = "INFO") -> None:
    structlog.configure(
        processors=[
            _inject_correlation_id,
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
    return structlog.get_logger(name)
