import httpx
from typing import Literal

class PbacClient:
    def __init__(self, base_url: str, api_key: str) -> None:
        self._base_url = base_url.rstrip("/")
        self._api_key = api_key

    def check(
        self,
        user_id: str,
        organization_id: str,
        action: str,
        correlation_id: str,
    ) -> Literal["allow", "deny"]:
        """
        Calls POST /internal/pbac/preflight to check permissions.
        Returns "allow" or "deny".
        Raises ConnectionError if the PBAC server is unreachable.
        """
        try:
            resp = httpx.post(
                f"{self._base_url}/internal/pbac/preflight",
                json={
                    "user_id": user_id,
                    "organization_id": organization_id,
                    "action": action,
                    "correlation_id": correlation_id,
                },
                headers={"X-Worker-Api-Key": self._api_key},
                timeout=5.0,
            )
            resp.raise_for_status()
            return resp.json().get("decision", "deny")
        except httpx.ConnectError as e:
            raise ConnectionError("PBAC preflight unreachable") from e
