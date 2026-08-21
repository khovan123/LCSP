"""Phoenix tracing module for OpenTelemetry tracing."""

import functools
from typing import Any, Callable

from lcsp_workers.platform.config import load_tracing_config

_tracer = None


def _initialize_tracer() -> Any:
    """Initialize Phoenix tracing when enabled by worker configuration."""
    try:
        config = load_tracing_config()
        if not config.enabled:
            return None

        from openinference.instrumentation.langchain import LangChainInstrumentor
        from openinference.instrumentation.openai import OpenAIInstrumentor
        from opentelemetry import trace
        from phoenix.otel import register

        register(
            project_name=config.project_name,
            endpoint=config.collector_endpoint,
        )
        try:
            LangChainInstrumentor().instrument()
            OpenAIInstrumentor().instrument()
        except Exception:
            pass
        return trace.get_tracer("lcsp_workers")
    except Exception:
        return None


_tracer = _initialize_tracer()


def traceable(
    name: str | None = None,
    run_type: str | None = None,
    metadata: dict[str, Any] | None = None,
    *args: Any,
    **kwargs: Any,
) -> Callable[[Callable[..., Any]], Callable[..., Any]]:
    """Traceable decorator sending spans directly to Phoenix UI at http://localhost:6006."""

    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        target_name = name or func.__name__

        @functools.wraps(func)
        def wrapper(*w_args: Any, **w_kwargs: Any) -> Any:
            if _tracer is not None:
                with _tracer.start_as_current_span(target_name) as span:
                    if run_type:
                        span.set_attribute("openinference.span.kind", run_type.upper())
                    if metadata:
                        for k, v in metadata.items():
                            span.set_attribute(f"metadata.{k}", str(v))
                    return func(*w_args, **w_kwargs)
            return func(*w_args, **w_kwargs)

        return wrapper

    return decorator


def get_current_run_tree() -> Any:
    return None


__all__ = ["traceable", "get_current_run_tree"]
