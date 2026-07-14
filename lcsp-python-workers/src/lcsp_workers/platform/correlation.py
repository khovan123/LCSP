import contextvars
import uuid

_cid: contextvars.ContextVar[str] = contextvars.ContextVar(
    "correlation_id", default="unknown"
)

def set_correlation_id(cid: str) -> None:
    _cid.set(cid)

def get_correlation_id() -> str:
    return _cid.get()

def extract_from_amqp_headers(headers: dict | None) -> str:
    """Extract correlation_id from AMQP headers or generate a new one."""
    if headers and "correlation_id" in headers:
        return str(headers["correlation_id"])
    return str(uuid.uuid4())
