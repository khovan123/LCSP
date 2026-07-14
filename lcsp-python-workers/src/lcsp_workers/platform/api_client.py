import time
import httpx
from typing import Any, Dict
from structlog import get_logger

from lcsp_workers.platform.correlation import get_correlation_id
from lcsp_workers.platform.callback_schemas import (
    CallbackResponse,
    ScanCallbackPayload,
    TechnicalProfileCallbackPayload,
    AIUsageFlowCallbackPayload,
    VerifiedProfileCallbackPayload,
    LegalRuleMatchCallbackPayload,
    ClassificationCallbackPayload,
)

logger = get_logger(__name__)

class WorkerCallbackError(Exception):
    """Raised when an API callback permanently fails (after retries or due to 4xx client errors)."""
    pass

class WorkerApiClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key
        self._timeout = 30.0
        self._max_retries = 3

    def _post_with_retry(self, path: str, payload: dict) -> dict:
        """
        Executes a POST request with exponential backoff for network and 5xx errors.
        Fails fast on 4xx errors.
        """
        url = f"{self._base_url}{path}"
        cid = get_correlation_id()
        headers = {
            "X-Worker-Api-Key": self._api_key,
            "X-Correlation-Id": cid,
        }

        for attempt in range(self._max_retries):
            try:
                resp = httpx.post(url, json=payload, headers=headers, timeout=self._timeout)
                
                # Check for 4xx errors (client error, do not retry)
                if 400 <= resp.status_code < 500:
                    logger.error("API_CALLBACK_CLIENT_ERROR", path=path, status_code=resp.status_code)
                    raise WorkerCallbackError(f"Callback failed with client error {resp.status_code}.")

                # Check for 5xx errors (server error, retry)
                if resp.status_code >= 500:
                    if attempt < self._max_retries - 1:
                        backoff = 2 ** attempt
                        logger.warning("API_CALLBACK_SERVER_ERROR_RETRYING", path=path, status_code=resp.status_code, attempt=attempt+1, sleep=backoff)
                        time.sleep(backoff)
                        continue
                    else:
                        logger.error("API_CALLBACK_SERVER_ERROR_TERMINAL", path=path, status_code=resp.status_code)
                        raise WorkerCallbackError(f"Callback failed after {self._max_retries} attempts with server error {resp.status_code}.")

                # Success
                return resp.json()

            except httpx.RequestError as exc:
                if attempt < self._max_retries - 1:
                    backoff = 2 ** attempt
                    logger.warning("API_CALLBACK_NETWORK_ERROR_RETRYING", path=path, error=type(exc).__name__, attempt=attempt+1, sleep=backoff)
                    time.sleep(backoff)
                    continue
                else:
                    logger.error("API_CALLBACK_NETWORK_ERROR_TERMINAL", path=path, error=type(exc).__name__)
                    raise WorkerCallbackError(f"Callback network request failed after {self._max_retries} attempts.")

        # Should not reach here
        raise WorkerCallbackError("Callback failed unexpectedly.")

    def post_scan_callback(self, scan_job_id: str, payload: ScanCallbackPayload) -> CallbackResponse:
        path = f"/internal/callbacks/scan/{scan_job_id}"
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_technical_profile_callback(self, payload: TechnicalProfileCallbackPayload) -> CallbackResponse:
        path = "/internal/callbacks/technical-profile"
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_ai_usage_flow_callback(self, payload: AIUsageFlowCallbackPayload) -> CallbackResponse:
        path = "/internal/callbacks/ai-usage-flow"
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_verified_profile_callback(self, payload: VerifiedProfileCallbackPayload) -> CallbackResponse:
        path = "/internal/callbacks/verified-profile"
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_legal_rule_match_callback(self, payload: LegalRuleMatchCallbackPayload) -> CallbackResponse:
        path = "/internal/callbacks/legal-rule-match"
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_classification_callback(self, payload: ClassificationCallbackPayload) -> CallbackResponse:
        path = "/internal/callbacks/classification"
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)
