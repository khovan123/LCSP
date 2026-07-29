import os
import asyncio
from typing import Any

class CleanupBlockedError(Exception):
    pass

async def mark_terminal_state(job_id: str, quality_state: str, api_client: Any) -> None:
    attempts = 0
    max_attempts = 3
    while attempts < max_attempts:
        try:
            await api_client.mark_scan_job_complete(job_id, quality_state)
            return
        except Exception as e:
            attempts += 1
            if attempts >= max_attempts:
                raise RuntimeError(f"Callback failed after {max_attempts} attempts: {e}")
            await asyncio.sleep(1) # simple backoff

async def verify_workspace_cleanup(workspace_path: str) -> bool:
    if os.path.exists(workspace_path):
        raise CleanupBlockedError(f"Workspace still exists after callback: {workspace_path}")
    return True
