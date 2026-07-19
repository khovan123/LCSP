"""AC-030 - LCSP-113 scanner workspace setup tests."""

from __future__ import annotations

import io
import tarfile
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from lcsp_workers.platform.config import WorkerConfig
from lcsp_workers.scanner import scan_consumer as scan_consumer_module
from lcsp_workers.scanner.scan_consumer import ScanConsumer
from lcsp_workers.scanner.snapshot_service_client import (
    SnapshotArchiveRequest,
    SnapshotServiceClient,
)
from lcsp_workers.scanner import workspace as workspace_module
from lcsp_workers.scanner.workspace import (
    ArchiveMaterializationError,
    ScannerWorkspace,
)


def _build_tar_gz(members: dict[str, bytes]) -> bytes:
    archive = io.BytesIO()
    with tarfile.open(fileobj=archive, mode="w:gz") as tar:
        for member_name, content in members.items():
            info = tarfile.TarInfo(name=member_name)
            info.size = len(content)
            tar.addfile(info, io.BytesIO(content))
    return archive.getvalue()


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_materializes_archive_and_records_stats(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner")
    archive = _build_tar_gz(
        {
            "repo/README.md": b"hello world\n",
            "repo/src/app.py": b"print('ok')\n",
        }
    )

    result = workspace.materialize("job-1", archive, snapshot_id="snap-1")

    assert result.job_id == "job-1"
    assert result.snapshot_id == "snap-1"
    assert result.total_size_bytes == len(b"hello world\n") + len(b"print('ok')\n")
    assert result.extracted_files == 2
    assert result.skipped_files == 0
    assert result.coverage_limited is False
    assert (result.workspace_path / "repo" / "README.md").read_text() == "hello world\n"
    assert (result.workspace_path / "repo" / "src" / "app.py").read_text() == "print('ok')\n"

    workspace.cleanup("job-1")
    assert not result.workspace_path.exists()


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_skips_files_over_limit_and_marks_coverage_limited(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(
        root_path=workspace_dir / "scanner",
        max_file_size_bytes=100,
    )
    archive = _build_tar_gz(
        {
            "repo/small.txt": b"small",
            "repo/large.bin": b"x" * 101,
        }
    )

    result = workspace.materialize("job-2", archive)

    assert result.extracted_files == 1
    assert result.skipped_files == 1
    assert result.coverage_limited is True
    assert (result.workspace_path / "repo" / "small.txt").exists()
    assert not (result.workspace_path / "repo" / "large.bin").exists()

    workspace.cleanup("job-2")


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_rejects_path_traversal_and_cleans_up(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner")
    archive = _build_tar_gz({"../escape.txt": b"nope"})

    with pytest.raises(ArchiveMaterializationError):
        workspace.materialize("job-3", archive)

    assert not workspace.workspace_path("job-3").exists()


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_rejects_excessive_depth(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner", max_path_depth=3)
    archive = _build_tar_gz({"repo/a/b/c/d.txt": b"deep"})

    with pytest.raises(ArchiveMaterializationError):
        workspace.materialize("job-4", archive)

    assert not workspace.workspace_path("job-4").exists()


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_rejects_excessive_member_count(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner", max_member_count=1)
    archive = _build_tar_gz({
        "repo/first.txt": b"one",
        "repo/second.txt": b"two",
    })

    with pytest.raises(ArchiveMaterializationError):
        workspace.materialize("job-5", archive)

    assert not workspace.workspace_path("job-5").exists()


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_cleanup_failure_blocks_completion(
    workspace_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner")
    archive = _build_tar_gz({"repo/README.md": b"hello\n"})

    workspace.materialize("job-6", archive)

    def failing_rmtree(path: Path) -> None:
        raise OSError("cleanup failed")

    monkeypatch.setattr(workspace_module.shutil, "rmtree", failing_rmtree)

    with pytest.raises(ArchiveMaterializationError):
        workspace.cleanup("job-6")


@pytest.mark.p0
@pytest.mark.integration
def test_workspace_rejects_decompression_bomb(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner", max_expansion_ratio=5)
    archive = _build_tar_gz({"repo/bomb.txt": b"A" * 1024})

    with pytest.raises(ArchiveMaterializationError):
        workspace.materialize("job-7", archive)

    assert not workspace.workspace_path("job-7").exists()


@pytest.mark.p0
@pytest.mark.integration
def test_scan_consumer_uses_internal_snapshot_service_and_cleans_up(
    workspace_dir: Path,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner")
    archive = _build_tar_gz({"repo/README.md": b"hello\n"})

    snapshot_client = MagicMock(spec=SnapshotServiceClient)
    snapshot_client.download_snapshot_archive.return_value = archive

    config = WorkerConfig(
        rabbitmq_url="amqp://guest:guest@localhost/",
        rabbitmq_exchange="test.events",
        nestjs_api_base_url="http://api.test",
        worker_api_key="worker-test-key",
        log_level="INFO",
        max_retries=3,
    )
    consumer = ScanConsumer(config, snapshot_client=snapshot_client, workspace=workspace)

    consumer.handle(
        {
            "scanJobId": "job-4",
            "snapshotId": "snap-4",
            "correlationId": "corr-4",
        },
        correlation_id="fallback-corr",
    )

    snapshot_client.download_snapshot_archive.assert_called_once_with(
        SnapshotArchiveRequest(
            snapshot_id="snap-4",
            scan_job_id="job-4",
            correlation_id="corr-4",
        )
    )
    assert not workspace.workspace_path("job-4").exists()


@pytest.mark.p0
@pytest.mark.integration
def test_scan_consumer_cleanup_runs_on_timeout(
    workspace_dir: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    workspace = ScannerWorkspace(root_path=workspace_dir / "scanner")
    archive = _build_tar_gz({"repo/README.md": b"hello\n"})

    snapshot_client = MagicMock(spec=SnapshotServiceClient)
    snapshot_client.download_snapshot_archive.return_value = archive

    config = WorkerConfig(
        rabbitmq_url="amqp://guest:guest@localhost/",
        rabbitmq_exchange="test.events",
        nestjs_api_base_url="http://api.test",
        worker_api_key="worker-test-key",
        log_level="INFO",
        max_retries=3,
    )
    consumer = ScanConsumer(config, snapshot_client=snapshot_client, workspace=workspace)
    consumer.scan_timeout_seconds = 0

    times = iter([1.0, 2.0])
    monkeypatch.setattr(scan_consumer_module.time, "monotonic", lambda: next(times))

    with pytest.raises(ArchiveMaterializationError):
        consumer.handle(
            {
                "scanJobId": "job-5",
                "snapshotId": "snap-5",
                "correlationId": "corr-5",
            },
            correlation_id="fallback-corr",
        )

    assert not workspace.workspace_path("job-5").exists()

