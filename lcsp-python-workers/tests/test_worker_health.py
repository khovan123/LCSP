from __future__ import annotations

import json
from urllib import error, request

import pytest

from lcsp_workers.platform.config import WorkerConfig
from lcsp_workers.platform.health import DEFAULT_HEALTH_PORT, HealthServer
from lcsp_workers.platform.queue_consumer import ConsumerBase


class DummyConsumer(ConsumerBase):
    queue_name = "health.test"
    routing_key = "health.test"

    def handle(self, message: dict, correlation_id: str) -> None:
        del message
        del correlation_id


@pytest.fixture
def config() -> WorkerConfig:
    return WorkerConfig(
        rabbitmq_url="amqp://guest:guest@localhost/",
        rabbitmq_exchange="test.events",
        nestjs_api_base_url="http://localhost:3000",
        worker_api_key="test-key",
        log_level="INFO",
        max_retries=3,
    )


def _get_json(port: int) -> tuple[int, dict]:
    url = f"http://127.0.0.1:{port}/health"
    try:
        with request.urlopen(url, timeout=2) as response:
            return int(response.status), json.loads(response.read().decode("utf-8"))
    except error.HTTPError as http_error:
        return int(http_error.code), json.loads(http_error.read().decode("utf-8"))


@pytest.mark.p1
def test_t01_health_connected_returns_200() -> None:
    server = HealthServer(
        worker_name="ScannerWorker",
        rabbitmq_connected_provider=lambda: True,
        port=0,
    )
    server.start()
    try:
        status_code, payload = _get_json(server.port)
        assert status_code == 200
        assert payload["status"] == "ok"
        assert payload["rabbitmq"] == "connected"
        assert payload["worker"] == "ScannerWorker"
    finally:
        server.stop()


@pytest.mark.p1
def test_t02_health_disconnected_returns_503() -> None:
    server = HealthServer(
        worker_name="ScannerWorker",
        rabbitmq_connected_provider=lambda: False,
        port=0,
    )
    server.start()
    try:
        status_code, payload = _get_json(server.port)
        assert status_code == 503
        assert payload["status"] == "degraded"
        assert payload["rabbitmq"] == "disconnected"
        assert payload["worker"] == "ScannerWorker"
    finally:
        server.stop()


@pytest.mark.p1
def test_t03_health_response_has_no_secrets() -> None:
    server = HealthServer(
        worker_name="ScannerWorker",
        rabbitmq_connected_provider=lambda: True,
        port=0,
    )
    server.start()
    try:
        _, payload = _get_json(server.port)
        rendered = json.dumps(payload)

        assert set(payload.keys()) == {"status", "rabbitmq", "worker"}
        assert "rabbitmq_url" not in rendered
        assert "worker_api_key" not in rendered
        assert "queue_name" not in rendered
    finally:
        server.stop()


@pytest.mark.p1
def test_t04_health_port_uses_env(monkeypatch: pytest.MonkeyPatch, config: WorkerConfig) -> None:
    monkeypatch.setenv("HEALTH_PORT", "18080")
    consumer = DummyConsumer(config, pbac_client=None)

    assert consumer._read_health_port() == 18080


@pytest.mark.p1
def test_health_port_falls_back_to_default_on_invalid_env(
    monkeypatch: pytest.MonkeyPatch,
    config: WorkerConfig,
) -> None:
    monkeypatch.setenv("HEALTH_PORT", "invalid")
    consumer = DummyConsumer(config, pbac_client=None)

    assert consumer._read_health_port() == DEFAULT_HEALTH_PORT
