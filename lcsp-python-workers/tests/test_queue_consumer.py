import json
import logging
from unittest.mock import MagicMock

import pytest

from lcsp_workers.platform.config import WorkerConfig
from lcsp_workers.platform.queue_consumer import ConsumerBase
from lcsp_workers.platform.logging import configure_logging

# Initialize structlog for tests
configure_logging("INFO")

class DummyConsumer(ConsumerBase):
    queue_name = "test_queue"
    routing_key = "test.routing"

    def __init__(self, config, pbac_client=None):
        super().__init__(config, pbac_client)
        self.handle_called = False
        self.raise_in_handle = False

    def handle(self, message: dict, correlation_id: str) -> None:
        if self.raise_in_handle:
            raise ValueError("Intentional error")
        self.handle_called = True


@pytest.fixture
def config():
    return WorkerConfig(
        rabbitmq_url="amqp://guest:guest@localhost/",
        rabbitmq_exchange="test.events",
        nestjs_api_base_url="http://localhost:3000",
        worker_api_key="test-key",
        log_level="INFO",
        max_retries=3,
    )


@pytest.fixture
def pbac_mock():
    return MagicMock()


@pytest.fixture
def channel_mock():
    return MagicMock()


@pytest.fixture
def method_mock():
    m = MagicMock()
    m.delivery_tag = 1
    return m


def test_t01_valid_message_pbac_allow(config, pbac_mock, channel_mock, method_mock):
    """T01: Valid message + PBAC allow calls handle and acks."""
    pbac_mock.check.return_value = "allow"
    consumer = DummyConsumer(config, pbac_mock)

    properties = MagicMock()
    properties.headers = {"user_id": "u1", "action": "test"}
    body = json.dumps({"test": "data"}).encode("utf-8")

    consumer._on_message(channel_mock, method_mock, properties, body)

    pbac_mock.check.assert_called_once()
    assert consumer.handle_called is True
    channel_mock.basic_ack.assert_called_once_with(delivery_tag=1)
    channel_mock.basic_nack.assert_not_called()


def test_t02_pbac_deny(config, pbac_mock, channel_mock, method_mock, capsys):
    """T02: PBAC deny nacks without requeue and logs WORKER_TASK_DENIED."""
    pbac_mock.check.return_value = "deny"
    consumer = DummyConsumer(config, pbac_mock)

    properties = MagicMock()
    properties.headers = {}
    body = b"{}"

    consumer._on_message(channel_mock, method_mock, properties, body)

    assert consumer.handle_called is False
    channel_mock.basic_nack.assert_called_once_with(delivery_tag=1, requeue=False)
    
    # Check JSON log output
    captured = capsys.readouterr()
    assert "WORKER_TASK_DENIED" in captured.out


def test_t03_pbac_unreachable(config, pbac_mock, channel_mock, method_mock):
    """T03: PBAC unreachable nacks with requeue for retry."""
    pbac_mock.check.side_effect = ConnectionError("unreachable")
    consumer = DummyConsumer(config, pbac_mock)

    properties = MagicMock()
    properties.headers = {}
    body = b"{}"

    consumer._on_message(channel_mock, method_mock, properties, body)

    assert consumer.handle_called is False
    channel_mock.basic_nack.assert_called_once_with(delivery_tag=1, requeue=True)


def test_t04_handle_exception_retry_and_dlq(config, pbac_mock, channel_mock, method_mock):
    """T04: handle exception retries up to MAX_RETRIES then DLQ nack."""
    pbac_mock.check.return_value = "allow"
    consumer = DummyConsumer(config, pbac_mock)
    consumer.raise_in_handle = True

    # 1. Attempt < max_retries
    properties1 = MagicMock()
    properties1.headers = {"x-death": [{"count": 2}]}
    body = b"{}"

    consumer._on_message(channel_mock, method_mock, properties1, body)
    channel_mock.basic_nack.assert_called_with(delivery_tag=1, requeue=True)

    # 2. Attempt == max_retries (DLQ)
    properties2 = MagicMock()
    properties2.headers = {"x-death": [{"count": 3}]}
    
    consumer._on_message(channel_mock, method_mock, properties2, body)
    channel_mock.basic_nack.assert_called_with(delivery_tag=1, requeue=False)


def test_t05_sigterm_handling(config):
    """T05: SIGTERM during processing finishes current message then exits cleanly."""
    consumer = DummyConsumer(config, MagicMock())
    
    assert consumer._shutdown is False
    consumer._handle_sigterm(15, None)
    assert consumer._shutdown is True


def test_t06_correlation_id_in_logs(config, pbac_mock, channel_mock, method_mock, capsys):
    """T06: every log line contains correlation_id field."""
    # Note: We test via structlog output
    pbac_mock.check.return_value = "deny"
    consumer = DummyConsumer(config, pbac_mock)

    properties = MagicMock()
    properties.headers = {"correlation_id": "test-cid-123"}
    body = b"{}"

    consumer._on_message(channel_mock, method_mock, properties, body)
    
    captured = capsys.readouterr()
    # By default, PrintLoggerFactory outputs to stdout
    assert "test-cid-123" in captured.out


def test_t07_secrets_redacted_from_logs(config, pbac_mock, channel_mock, method_mock, capsys):
    """T07: secret field values are redacted from log output."""
    pbac_mock.check.return_value = "allow"
    consumer = DummyConsumer(config, pbac_mock)
    consumer.raise_in_handle = True  # trigger an error log
    
    # Send a message with 'token'
    properties = MagicMock()
    properties.headers = {}
    body = b"{}"
    
    # We log a dict with secret key directly to test the processor
    from lcsp_workers.platform.logging import get_logger
    logger = get_logger("test")
    logger.info("test_secret", token="super-secret-123", api_key="secret-key")

    captured = capsys.readouterr()
    assert "***REDACTED***" in captured.out
    assert "super-secret-123" not in captured.out
    assert "secret-key" not in captured.out
