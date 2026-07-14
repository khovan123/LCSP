import httpx

class ApiClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def post(self, path: str, payload: dict, correlation_id: str) -> dict:
        """
        POST to NestJS API.
        """
        resp = httpx.post(
            f"{self._base_url}{path}",
            json=payload,
            headers={
                "X-Worker-Api-Key": self._api_key,
                "X-Correlation-Id": correlation_id,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        return resp.json()
