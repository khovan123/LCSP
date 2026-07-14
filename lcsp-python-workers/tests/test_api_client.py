import pytest
import httpx
from unittest.mock import patch, MagicMock
from pydantic import ValidationError

from lcsp_workers.platform.api_client import WorkerApiClient, WorkerCallbackError
from lcsp_workers.platform.callback_schemas import ScanCallbackPayload, CallbackResponse
from lcsp_workers.platform.correlation import set_correlation_id

@pytest.fixture
def client():
    # Fast retry for tests by patching time.sleep
    with patch("lcsp_workers.platform.api_client.time.sleep"):
        yield WorkerApiClient(base_url="http://testserver", api_key="test-api-key")

@pytest.fixture
def dummy_payload():
    return ScanCallbackPayload(status="COMPLETED", findings=[])

def test_t01_successful_callback(client, dummy_payload):
    """T01: Successful callback parses response."""
    with patch("lcsp_workers.platform.api_client.httpx.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"success": True, "message": "OK"}
        mock_post.return_value = mock_resp
        
        response = client.post_scan_callback("job123", dummy_payload)
        
        assert isinstance(response, CallbackResponse)
        assert response.success is True
        assert response.message == "OK"
        mock_post.assert_called_once()

def test_t02_5xx_response(client, dummy_payload):
    """T02: 5xx response is retried 3 times then raises WorkerCallbackError."""
    with patch("lcsp_workers.platform.api_client.httpx.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 503
        mock_post.return_value = mock_resp
        
        with pytest.raises(WorkerCallbackError) as exc_info:
            client.post_scan_callback("job123", dummy_payload)
            
        assert "server error 503" in str(exc_info.value)
        assert mock_post.call_count == 3

def test_t03_422_response(client, dummy_payload):
    """T03: 422 response is NOT retried, raises WorkerCallbackError immediately."""
    with patch("lcsp_workers.platform.api_client.httpx.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 422
        mock_post.return_value = mock_resp
        
        with pytest.raises(WorkerCallbackError) as exc_info:
            client.post_scan_callback("job123", dummy_payload)
            
        assert "client error 422" in str(exc_info.value)
        assert mock_post.call_count == 1

def test_t04_network_timeout(client, dummy_payload):
    """T04: Network timeout is retried 3 times."""
    with patch("lcsp_workers.platform.api_client.httpx.post") as mock_post:
        mock_post.side_effect = httpx.TimeoutException("Timeout")
        
        with pytest.raises(WorkerCallbackError) as exc_info:
            client.post_scan_callback("job123", dummy_payload)
            
        assert "network request failed" in str(exc_info.value)
        assert mock_post.call_count == 3

def test_t05_t06_headers(client, dummy_payload):
    """T05 & T06: X-Worker-Api-Key and X-Correlation-Id are included in every request."""
    set_correlation_id("test-cid-999")
    with patch("lcsp_workers.platform.api_client.httpx.post") as mock_post:
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"success": True}
        mock_post.return_value = mock_resp
        
        client.post_scan_callback("job123", dummy_payload)
        
        _, kwargs = mock_post.call_args
        headers = kwargs.get("headers", {})
        assert headers.get("X-Worker-Api-Key") == "test-api-key"
        assert headers.get("X-Correlation-Id") == "test-cid-999"

def test_t07_raw_source_code_rejected():
    """T07: Raw source code or extra fields are rejected by Pydantic 'forbid' config."""
    with pytest.raises(ValidationError):
        ScanCallbackPayload(
            status="COMPLETED",
            findings=[],
            raw_source_code="print('hello')",  # Not allowed
        )
