from __future__ import annotations

import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Callable


HEALTH_ENDPOINT = "/health"
DEFAULT_HEALTH_PORT = 8080


class _HealthHTTPServer(ThreadingHTTPServer):
    def __init__(
        self,
        server_address: tuple[str, int],
        handler,
        *,
        worker_name: str,
        rabbitmq_connected_provider: Callable[[], bool],
    ) -> None:
        super().__init__(server_address, handler)
        self.worker_name = worker_name
        self.rabbitmq_connected_provider = rabbitmq_connected_provider


class _HealthHandler(BaseHTTPRequestHandler):
    server: _HealthHTTPServer

    def do_GET(self) -> None:  # noqa: N802 (stdlib handler naming)
        if self.path != HEALTH_ENDPOINT:
            self.send_error(404)
            return

        connected = self.server.rabbitmq_connected_provider()
        payload = {
            "status": "ok" if connected else "degraded",
            "rabbitmq": "connected" if connected else "disconnected",
            "worker": self.server.worker_name,
        }

        body = json.dumps(payload).encode("utf-8")
        self.send_response(200 if connected else 503)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args) -> None:  # noqa: A003
        # Keep health endpoint quiet to avoid noisy probe logs.
        return


class HealthServer:
    def __init__(
        self,
        *,
        worker_name: str,
        rabbitmq_connected_provider: Callable[[], bool],
        port: int = DEFAULT_HEALTH_PORT,
    ) -> None:
        self._worker_name = worker_name
        self._rabbitmq_connected_provider = rabbitmq_connected_provider
        self._requested_port = port
        self._server: _HealthHTTPServer | None = None
        self._thread: threading.Thread | None = None
        self.port = port

    def start(self) -> None:
        if self._server is not None:
            return

        server = _HealthHTTPServer(
            ("", self._requested_port),
            _HealthHandler,
            worker_name=self._worker_name,
            rabbitmq_connected_provider=self._rabbitmq_connected_provider,
        )
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()

        self._server = server
        self._thread = thread
        self.port = int(server.server_address[1])

    def stop(self) -> None:
        if self._server is None:
            return

        self._server.shutdown()
        self._server.server_close()

        if self._thread is not None:
            self._thread.join(timeout=2)

        self._server = None
        self._thread = None
