import time
import httpx
from structlog import get_logger

from lcsp_workers.platform.api_client_contracts import (
    CORRELATION_ID_HEADER,
    WORKER_API_KEY_HEADER,
    CallbackLogEvent,
    CallbackPath,
    client_error_message,
    network_error_message,
    server_error_message,
    unexpected_error_message,
)
from lcsp_workers.platform.correlation import get_correlation_id
from lcsp_workers.platform.redaction import redact_dict, redact_source_code
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
            WORKER_API_KEY_HEADER: self._api_key,
            CORRELATION_ID_HEADER: cid,
        }
        safe_payload = self._redact_callback_payload(payload)

        for attempt in range(self._max_retries):
            try:
                resp = httpx.post(
                    url,
                    json=safe_payload,
                    headers=headers,
                    timeout=self._timeout,
                )

                # Check for 4xx errors (client error, do not retry)
                if 400 <= resp.status_code < 500:
                    logger.error(
                        CallbackLogEvent.CLIENT_ERROR,
                        path=path,
                        status_code=resp.status_code,
                    )
                    raise WorkerCallbackError(client_error_message(resp.status_code))

                # Check for 5xx errors (server error, retry)
                if resp.status_code >= 500:
                    if attempt < self._max_retries - 1:
                        backoff = 2 ** attempt
                        logger.warning(
                            CallbackLogEvent.SERVER_ERROR_RETRYING,
                            path=path,
                            status_code=resp.status_code,
                            attempt=attempt + 1,
                            sleep=backoff,
                        )
                        time.sleep(backoff)
                        continue
                    else:
                        logger.error(
                            CallbackLogEvent.SERVER_ERROR_TERMINAL,
                            path=path,
                            status_code=resp.status_code,
                        )
                        raise WorkerCallbackError(
                            server_error_message(self._max_retries, resp.status_code)
                        )

                # Success
                return resp.json()

            except httpx.RequestError as exc:
                if attempt < self._max_retries - 1:
                    backoff = 2 ** attempt
                    logger.warning(
                        CallbackLogEvent.NETWORK_ERROR_RETRYING,
                        path=path,
                        error=type(exc).__name__,
                        attempt=attempt + 1,
                        sleep=backoff,
                    )
                    time.sleep(backoff)
                    continue
                else:
                    logger.error(
                        CallbackLogEvent.NETWORK_ERROR_TERMINAL,
                        path=path,
                        error=type(exc).__name__,
                    )
                    raise WorkerCallbackError(network_error_message(self._max_retries))

        # Should not reach here
        raise WorkerCallbackError(unexpected_error_message())

    def _redact_callback_payload(self, payload: dict) -> dict:
        safe_payload = dict(payload)
        findings = safe_payload.get("findings")
        if isinstance(findings, list):
            safe_payload["findings"] = redact_source_code(
                [finding for finding in findings if isinstance(finding, dict)]
            )
        return redact_dict(safe_payload)

    def post_scan_callback(
        self, scan_job_id: str, payload: ScanCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.SCAN.format(scan_job_id=scan_job_id)
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_technical_profile_callback(
        self, payload: TechnicalProfileCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.TECHNICAL_PROFILE
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_ai_usage_flow_callback(
        self, payload: AIUsageFlowCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.AI_USAGE_FLOW
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_verified_profile_callback(
        self, payload: VerifiedProfileCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.VERIFIED_PROFILE
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_legal_rule_match_callback(
        self, payload: LegalRuleMatchCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.LEGAL_RULE_MATCH
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)

    def post_classification_callback(
        self, payload: ClassificationCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.CLASSIFICATION
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)
