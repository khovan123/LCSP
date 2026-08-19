"""Phoenix tracing module for 100% account-free OpenTelemetry tracing."""

import functools
from typing import Any, Callable

from openinference.instrumentation.langchain import LangChainInstrumentor
from openinference.instrumentation.openai import OpenAIInstrumentor
from opentelemetry import trace
from phoenix.otel import register

# Automatically register Phoenix collector endpoint (http://localhost:6006/v1/traces)
register(
    project_name="lcsp-python-workers",
    endpoint="http://localhost:6006/v1/traces",
)

try:
    LangChainInstrumentor().instrument()
    OpenAIInstrumentor().instrument()
except Exception:
    pass

_tracer = trace.get_tracer("lcsp_workers")


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
            with _tracer.start_as_current_span(target_name) as span:
                if run_type:
                    span.set_attribute("openinference.span.kind", run_type.upper())
                if metadata:
                    for k, v in metadata.items():
                        span.set_attribute(f"metadata.{k}", str(v))
                return func(*w_args, **w_kwargs)

        return wrapper

    return decorator


def get_current_run_tree() -> Any:
    return None


__all__ = ["traceable", "get_current_run_tree"]
