from enum import StrEnum


WORKER_API_KEY_HEADER = "X-Worker-Api-Key"
CORRELATION_ID_HEADER = "X-Correlation-Id"


class CallbackPath(StrEnum):
    SCAN = "/internal/callbacks/scan/{scan_job_id}"
    TECHNICAL_PROFILE = "/internal/callbacks/technical-profile"
    AI_USAGE_FLOW = "/internal/callbacks/ai-usage-flow"
    VERIFIED_PROFILE = "/internal/callbacks/verified-profile"
    LEGAL_RULE_MATCH = "/internal/callbacks/legal-rule-match"
    CLASSIFICATION = "/internal/callbacks/classification"


class CallbackLogEvent(StrEnum):
    CLIENT_ERROR = "API_CALLBACK_CLIENT_ERROR"
    SERVER_ERROR_RETRYING = "API_CALLBACK_SERVER_ERROR_RETRYING"
    SERVER_ERROR_TERMINAL = "API_CALLBACK_SERVER_ERROR_TERMINAL"
    NETWORK_ERROR_RETRYING = "API_CALLBACK_NETWORK_ERROR_RETRYING"
    NETWORK_ERROR_TERMINAL = "API_CALLBACK_NETWORK_ERROR_TERMINAL"


def client_error_message(status_code: int) -> str:
    return f"Callback failed with client error {status_code}."


def server_error_message(max_retries: int, status_code: int) -> str:
    return (
        f"Callback failed after {max_retries} attempts "
        f"with server error {status_code}."
    )


def network_error_message(max_retries: int) -> str:
    return f"Callback network request failed after {max_retries} attempts."


def unexpected_error_message() -> str:
    return "Callback failed unexpectedly."
