"""
AC-030: Scanner worker clones workspace via internal snapshot service (no direct GitHub access).
        Workspace is ephemeral — cleaned up after scan regardless of outcome.
"""
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest


@pytest.mark.p0
@pytest.mark.asyncio
async def test_workspace_cloned_via_internal_service_not_github(
    scan_job_payload: dict,
    workspace_dir: Path,
) -> None:
    """
    AC-030: Workspace must be obtained from internal snapshot service, not from
    direct GitHub API calls inside the scanner worker.
    """
    # RED: ScannerWorker not yet implemented.
    # When implemented: ScannerWorker.__init__ must not import or call any
    # GitHub OAuth client. Clone must go through SnapshotServiceClient.
    with pytest.raises(ImportError):
        from lcsp_workers.scanner.worker import ScannerWorker  # noqa: F401


@pytest.mark.p0
@pytest.mark.asyncio
async def test_workspace_cleaned_up_after_successful_scan(
    scan_job_payload: dict,
    workspace_dir: Path,
) -> None:
    """
    AC-030: Workspace directory must not exist after scan completes successfully.
    """
    # RED: ScannerWorker not yet implemented.
    # When implemented: after run(), workspace_path must not exist on filesystem.
    workspace_path = workspace_dir / "clone"
    workspace_path.mkdir()
    assert workspace_path.exists()

    # Stub: after implementation, assert:
    # await worker.run(scan_job_payload)
    # assert not workspace_path.exists()
    pytest.skip("AC-030 RED: ScannerWorker not implemented — cleanup contract not verifiable yet")


@pytest.mark.p0
@pytest.mark.asyncio
async def test_workspace_cleaned_up_after_failed_scan(
    scan_job_payload: dict,
    workspace_dir: Path,
) -> None:
    """
    AC-030: Workspace directory must not exist after scan fails (except TERMINAL_PRIVACY_FAILURE).
    """
    # RED: ScannerWorker not yet implemented.
    pytest.skip("AC-030 RED: ScannerWorker not implemented — cleanup on failure not verifiable yet")


@pytest.mark.p0
@pytest.mark.asyncio
async def test_workspace_preserved_on_terminal_privacy_failure(
    scan_job_payload: dict,
    workspace_dir: Path,
) -> None:
    """
    AC-030: On TERMINAL_PRIVACY_FAILURE the workspace must be PRESERVED for incident investigation.
    """
    # RED: ScannerWorker not yet implemented.
    pytest.skip("AC-030 RED: ScannerWorker not implemented — privacy failure preservation not verifiable yet")


@pytest.mark.p0
def test_scanner_worker_does_not_import_github_oauth_client() -> None:
    """
    AC-030: Scanner worker module must not depend on GitHub OAuth client.
    """
    # RED: Module not yet importable.
    try:
        import lcsp_workers.scanner.worker as worker_mod
        source = Path(worker_mod.__file__).read_text()
        assert "github_oauth" not in source, "Scanner must not import GitHub OAuth client"
        assert "GitHubOAuthClient" not in source
    except ImportError:
        pytest.skip("AC-030 RED: lcsp_workers.scanner.worker not yet implemented")
