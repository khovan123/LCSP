import time
import httpx
from structlog import get_logger

from package.contract.api_client_contracts import (
    CORRELATION_ID_HEADER,
    WORKER_API_KEY_HEADER,
    CallbackLogEvent,
    CallbackPath,
    InternalPath,
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
    AuditExportCallbackPayload,
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

    def _get_with_retry(self, path: str, params: dict = None) -> dict | list:
        """
        Executes a GET request with exponential backoff for network and 5xx errors.
        Fails fast on 4xx errors.
        """
        url = f"{self._base_url}{path}"
        cid = get_correlation_id()
        headers = {
            WORKER_API_KEY_HEADER: self._api_key,
            CORRELATION_ID_HEADER: cid,
        }

        for attempt in range(self._max_retries):
            try:
                resp = httpx.get(
                    url,
                    params=params,
                    headers=headers,
                    timeout=self._timeout,
                )

                if 400 <= resp.status_code < 500:
                    logger.error(
                        CallbackLogEvent.CLIENT_ERROR,
                        path=path,
                        status_code=resp.status_code,
                    )
                    raise WorkerCallbackError(client_error_message(resp.status_code))

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

        raise WorkerCallbackError(unexpected_error_message())

    def _redact_callback_payload(self, payload: dict) -> dict:
        safe_payload = dict(payload)
        findings = safe_payload.get("findings")
        if isinstance(findings, list):
            safe_payload["findings"] = redact_source_code(
                [finding for finding in findings if isinstance(finding, dict)]
            )
        evidence_payload = safe_payload.get("evidence_payload")
        if isinstance(evidence_payload, dict):
            safe_evidence_payload = dict(evidence_payload)
            signals = safe_evidence_payload.get("ai_usage_signals")
            if isinstance(signals, list):
                safe_evidence_payload["ai_usage_signals"] = redact_source_code(
                    [signal for signal in signals if isinstance(signal, dict)]
                )
            safe_payload["evidence_payload"] = safe_evidence_payload
        return redact_dict(safe_payload)

    def post_scan_callback(
        self, scan_job_id: str, payload: ScanCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.SCAN.format(scan_job_id=scan_job_id)
        request_payload = payload.model_dump(exclude_none=True)
        if request_payload.get("findings") == []:
            request_payload.pop("findings")
        resp_data = self._post_with_retry(path, request_payload)
        return CallbackResponse(**resp_data)

    def post_technical_profile_callback(
        self, payload: TechnicalProfileCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.TECHNICAL_PROFILE
        resp_data = self._post_with_retry(path, payload.model_dump(exclude_none=True))
        return CallbackResponse(**resp_data)

    def get_accepted_technical_evidence_report(self, evidence_report_id: str) -> dict:
        path = InternalPath.TECHNICAL_EVIDENCE_REPORT.format(
            evidence_report_id=evidence_report_id
        )
        data = self._get_with_retry(path)
        if not isinstance(data, dict):
            raise WorkerCallbackError("Technical evidence report response was invalid.")
        status = str(data.get("status", "")).lower()
        if status and status != "accepted":
            raise WorkerCallbackError("Technical evidence report is not accepted.")
        return data

    def post_ai_usage_flow_callback(
        self, payload: AIUsageFlowCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.AI_USAGE_FLOW
        resp_data = self._post_with_retry(path, payload.model_dump(exclude_none=True))
        return CallbackResponse(**resp_data)

    def get_accepted_technical_profile(self, technical_profile_id: str) -> dict:
        path = InternalPath.TECHNICAL_PROFILE.format(
            technical_profile_id=technical_profile_id
        )
        data = self._get_with_retry(path)
        if not isinstance(data, dict):
            raise WorkerCallbackError("Technical profile response was invalid.")
        status = str(data.get("status", "")).lower()
        if status and status != "accepted":
            raise WorkerCallbackError("Technical profile is not accepted.")
        return data

    def get_wizard_profile_for_assessment(self, assessment_id: str) -> dict | None:
        path = InternalPath.WIZARD_PROFILE.format(assessment_id=assessment_id)
        try:
            data = self._get_with_retry(path)
        except WorkerCallbackError as exc:
            if "client error 404" in str(exc):
                return None
            raise
        if data is None:
            return None
        if not isinstance(data, dict):
            raise WorkerCallbackError("Wizard profile response was invalid.")
        return data

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

    def get_audit_events(
        self, organization_id: str, from_date: str, to_date: str
    ) -> list[dict]:
        path = InternalPath.AUDIT_EVENTS.format(organization_id=organization_id)
        params = {"from_date": from_date, "to_date": to_date}
        return self._get_with_retry(path, params=params)

    def post_audit_export_callback(
        self, export_request_id: str, payload: AuditExportCallbackPayload
    ) -> CallbackResponse:
        path = CallbackPath.AUDIT_EXPORT.format(export_request_id=export_request_id)
        resp_data = self._post_with_retry(path, payload.model_dump())
        return CallbackResponse(**resp_data)
