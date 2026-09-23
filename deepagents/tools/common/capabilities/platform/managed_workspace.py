"""Assessment repository as the persistent working database for Managed Deep Agents."""

from __future__ import annotations

import io
import json
import re
import shlex
import tarfile
import tempfile
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path, PurePosixPath
from typing import Any, Iterator, Mapping

from deepagents.backends.protocol import (
    DeleteResult,
    EditResult,
    FileDownloadResponse,
    FileUploadResponse,
    GlobResult,
    GrepResult,
    LsResult,
    SandboxBackendProtocol,
    WriteResult,
)
from tools.common.capabilities.platform.config import load_config
from tools.common.capabilities.platform.repository_snapshot_client import (
    RepositoryArchiveRequest,
    RepositorySnapshotClient,
)
from tools.common.capabilities.platform.repository_workspace import RepositoryWorkspace


REPOSITORY_ROOT = "/workspace/repository"
REPOSITORY_META = f"{REPOSITORY_ROOT}/.lcsp/repository.json"
REPOSITORY_AGENT_STATE = f"{REPOSITORY_ROOT}/.lcsp/agent"
_ARCHIVE_PATH = "/tmp/lcsp-assessment-repository.tar.gz"
_RESERVED_REPOSITORY_DIRS = {".git", ".lcsp"}
_ACTIVE_BACKEND: ContextVar[object | None] = ContextVar(
    "lcsp_managed_thread_backend",
    default=None,
)

class AssessmentRepositoryBackend(SandboxBackendProtocol):
    """Expose the assessment repository itself as the Deep Agent filesystem root.

    The physical directory is /workspace/repository in the MDA-owned sandbox.
    Agent-facing / means the repository root, and shell commands execute with
    the repository as their working directory, matching a coding CLI checkout.
    """

    def __init__(self, backend: object) -> None:
        self._backend = backend

    @property
    def id(self) -> str:
        backend_id = getattr(self._backend, "id", "managed")
        return f"{backend_id}:assessment-repository"

    def ls(self, path: str) -> LsResult:
        result = self._backend.ls(_real_path(path))
        if result.entries is None:
            return LsResult(error=result.error)
        return LsResult(
            error=result.error,
            entries=[_virtual_file_info(item) for item in result.entries],
        )

    def read(self, file_path: str, offset: int = 0, limit: int = 2000):
        return self._backend.read(_real_path(file_path), offset=offset, limit=limit)

    def grep(
        self,
        pattern: str,
        path: str | None = None,
        glob: str | None = None,
        *,
        max_count: int | None = None,
    ) -> GrepResult:
        real_path = _real_path(path or "/")
        kwargs = {"max_count": max_count} if max_count is not None else {}
        try:
            result = self._backend.grep(pattern, real_path, glob, **kwargs)
        except TypeError:
            result = self._backend.grep(pattern, real_path, glob)
        if result.matches is None:
            return GrepResult(error=result.error, truncated=result.truncated)
        matches = []
        for item in result.matches:
            copy = dict(item)
            copy["path"] = _virtual_path(str(item["path"]))
            matches.append(copy)
        return GrepResult(
            error=result.error,
            matches=matches,
            truncated=result.truncated,
        )

    def glob(self, pattern: str, path: str | None = None) -> GlobResult:
        result = self._backend.glob(pattern, _real_path(path or "/"))
        if result.matches is None:
            return GlobResult(
                error=result.error,
                truncated=result.truncated,
                truncation_reason=result.truncation_reason,
            )
        return GlobResult(
            error=result.error,
            matches=[_virtual_file_info(item) for item in result.matches],
            truncated=result.truncated,
            truncation_reason=result.truncation_reason,
        )

    def write(self, file_path: str, content: str) -> WriteResult:
        result = self._backend.write(_real_path(file_path), content)
        return WriteResult(
            error=result.error,
            path=_virtual_path(result.path) if result.path else None,
        )

    def edit(
        self,
        file_path: str,
        old_string: str,
        new_string: str,
        replace_all: bool = False,
    ) -> EditResult:
        result = self._backend.edit(
            _real_path(file_path),
            old_string,
            new_string,
            replace_all=replace_all,
        )
        return EditResult(
            error=result.error,
            path=_virtual_path(result.path) if result.path else None,
            occurrences=result.occurrences,
        )

    def delete(self, file_path: str) -> DeleteResult:
        result = self._backend.delete(_real_path(file_path))
        return DeleteResult(
            error=result.error,
            path=_virtual_path(result.path) if result.path else None,
        )

    def upload_files(
        self,
        files: list[tuple[str, bytes]],
    ) -> list[FileUploadResponse]:
        requested = [path for path, _ in files]
        translated = [(_real_path(path), content) for path, content in files]
        results = self._backend.upload_files(translated)
        return [
            FileUploadResponse(path=requested[index], error=result.error)
            for index, result in enumerate(results)
        ]

    def download_files(self, paths: list[str]) -> list[FileDownloadResponse]:
        results = self._backend.download_files([_real_path(path) for path in paths])
        return [
            FileDownloadResponse(
                path=paths[index],
                content=result.content,
                error=result.error,
            )
            for index, result in enumerate(results)
        ]

    def execute(self, command: str, *, timeout: int | None = None):
        """Run shell commands with the assessment repository as the CWD."""
        scoped = f"cd {shlex.quote(REPOSITORY_ROOT)} && {command}"
        if timeout is not None:
            try:
                return self._backend.execute(scoped, timeout=timeout)
            except TypeError:
                return self._backend.execute(scoped)
        return self._backend.execute(scoped)


def resolve_managed_thread_backend(config: object | None) -> object:
    """Resolve the exact sandbox backend MDA owns for the current durable thread.

    Managed Deep Agents 0.7 does not yet expose the resolved backend on Tool/Agent
    Runtime. Keep this compatibility call isolated here so an MDA 0.8 public accessor
    can replace it without changing LCSP orchestration.
    """
    from managed_deepagents.runtime import _resolve_managed_sandbox
    from sandbox import sandbox as sandbox_definition

    return _resolve_managed_sandbox(sandbox_definition, config)


def repository_database_backend(backend: object) -> AssessmentRepositoryBackend:
    """Return the repository-rooted database view used by every assessment agent."""
    if isinstance(backend, AssessmentRepositoryBackend):
        return backend
    return AssessmentRepositoryBackend(backend)


def current_managed_backend() -> object | None:
    """Current repository-rooted backend shared by nested Deep Agents."""
    return _ACTIVE_BACKEND.get()


@contextmanager
def activate_managed_backend(backend: object) -> Iterator[object]:
    """Expose one repository database backend to nested Deep Agent construction."""
    repository_backend = repository_database_backend(backend)
    token = _ACTIVE_BACKEND.set(repository_backend)
    try:
        yield repository_backend
    finally:
        _ACTIVE_BACKEND.reset(token)


def hydrate_repository(
    backend: object,
    *,
    snapshot_id: str,
    scan_job_id: str,
    commit_sha: str = "",
    assessment_id: str = "",
    correlation_id: str | None = None,
) -> None:
    """Create/reuse the live repository database from an immutable baseline snapshot."""
    marker = _read_marker(backend)
    if marker.get("snapshotId") == snapshot_id and marker.get("scanJobId") == scan_job_id:
        return

    config = load_config()
    archive = RepositorySnapshotClient(
        config.nestjs_api_base_url,
        config.worker_api_key,
    ).download_archive(
        RepositoryArchiveRequest(
            snapshot_id=snapshot_id,
            scan_job_id=scan_job_id,
            correlation_id=correlation_id or scan_job_id,
        )
    )
    sanitized_archive = _sanitize_archive(archive, snapshot_id=snapshot_id)

    upload_files = getattr(backend, "upload_files", None)
    execute = getattr(backend, "execute", None)
    write = getattr(backend, "write", None)
    if not callable(upload_files) or not callable(execute) or not callable(write):
        raise RuntimeError(
            "managed assessment backend does not support sandbox filesystem operations"
        )

    uploads = upload_files([(_ARCHIVE_PATH, sanitized_archive)])
    if not uploads or getattr(uploads[0], "error", None):
        raise RuntimeError("failed to upload assessment repository into managed sandbox")

    baseline_label = (
        commit_sha.lower()
        if re.fullmatch(r"[0-9a-fA-F]{7,64}", commit_sha or "")
        else "unknown"
    )
    repository = shlex.quote(REPOSITORY_ROOT)
    archive_path = shlex.quote(_ARCHIVE_PATH)
    bootstrap = (
        f"rm -rf {repository} && mkdir -p {repository} "
        f"&& tar -xzf {archive_path} -C {repository} "
        f"&& mkdir -p {shlex.quote(REPOSITORY_AGENT_STATE)} "
        f"&& cd {repository} "
        "&& if command -v git >/dev/null 2>&1; then "
        "git init -q "
        "&& git config user.email lcsp-managed-agent@local "
        "&& git config user.name 'LCSP Managed Agent' "
        "&& git add -A "
        f"&& git commit -q --allow-empty -m {shlex.quote('LCSP baseline ' + baseline_label)} "
        "&& printf '\\n.lcsp/\\n' >> .git/info/exclude; "
        "fi"
    )
    extraction = execute(bootstrap, timeout=120)
    if getattr(extraction, "exit_code", 1) != 0:
        raise RuntimeError("failed to materialize assessment repository database")

    marker_payload = json.dumps(
        {
            "assessmentId": assessment_id,
            "snapshotId": snapshot_id,
            "scanJobId": scan_job_id,
            "commitSha": commit_sha,
            "repositoryRoot": REPOSITORY_ROOT,
            "agentFilesystemRoot": "/",
            "role": "assessment_repository_database",
        },
        separators=(",", ":"),
        sort_keys=True,
    )
    write_result = write(REPOSITORY_META, marker_payload)
    if getattr(write_result, "error", None):
        raise RuntimeError("failed to persist repository database metadata")


def ensure_repository_for_event(
    backend: object,
    boundary_name: str,
    event: Mapping[str, Any],
) -> None:
    """Recover the repository database for later stages after sandbox recreation."""
    _ = boundary_name
    snapshot_id = _event_text(event, "snapshotId", "snapshot_id")
    scan_job_id = _event_text(event, "scanJobId", "scan_job_id")
    assessment_id = _event_text(event, "assessmentId", "assessment_id") or ""
    correlation_id = _event_text(event, "correlationId", "correlation_id")

    if snapshot_id and scan_job_id:
        hydrate_repository(
            backend,
            snapshot_id=snapshot_id,
            scan_job_id=scan_job_id,
            commit_sha=_event_text(event, "commitSha", "commit_sha") or "",
            assessment_id=assessment_id,
            correlation_id=correlation_id,
        )
        return

    evidence_report_id = _event_text(event, "evidenceReportId", "evidence_report_id")
    if not evidence_report_id:
        return

    from tools.common.capabilities.platform.api_client import WorkerApiClient

    config = load_config()
    report = WorkerApiClient(
        config.nestjs_api_base_url,
        config.worker_api_key,
    ).get_accepted_technical_evidence_report(evidence_report_id)
    snapshot_id = _event_text(report, "snapshotId", "snapshot_id")
    scan_job_id = _event_text(report, "scanJobId", "scan_job_id")
    if not snapshot_id or not scan_job_id:
        return
    hydrate_repository(
        backend,
        snapshot_id=snapshot_id,
        scan_job_id=scan_job_id,
        commit_sha=_event_text(report, "commitSha", "commit_sha") or "",
        assessment_id=_event_text(report, "assessmentId", "assessment_id") or assessment_id,
        correlation_id=correlation_id,
    )


def _read_marker(backend: object) -> dict[str, Any]:
    read = getattr(backend, "read", None)
    if not callable(read):
        return {}
    result = read(REPOSITORY_META, offset=0, limit=200)
    if getattr(result, "error", None):
        return {}
    file_data = getattr(result, "file_data", None)
    content = file_data.get("content") if isinstance(file_data, Mapping) else None
    if not isinstance(content, str):
        return {}
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _sanitize_archive(archive: bytes, *, snapshot_id: str) -> bytes:
    """Apply archive guards and reserve .git/.lcsp for the agent database."""
    with tempfile.TemporaryDirectory(prefix="lcsp-mda-repo-") as root:
        workspace = RepositoryWorkspace(Path(root))
        result = workspace.materialize("snapshot", archive, snapshot_id=snapshot_id)
        source_root = _repository_root(result.workspace_path)
        output = io.BytesIO()
        with tarfile.open(fileobj=output, mode="w:gz") as sanitized:
            for path in sorted(source_root.rglob("*")):
                if not path.is_file():
                    continue
                relative = path.relative_to(source_root)
                if relative.parts and relative.parts[0] in _RESERVED_REPOSITORY_DIRS:
                    continue
                sanitized.add(
                    path,
                    arcname=relative.as_posix(),
                    recursive=False,
                )
        return output.getvalue()


def _repository_root(workspace_path: Path) -> Path:
    entries = list(workspace_path.iterdir())
    if len(entries) == 1 and entries[0].is_dir():
        return entries[0]
    return workspace_path


def _real_path(path: str) -> str:
    value = path.strip() or "/"
    pure = PurePosixPath(value)
    parts = pure.parts[1:] if pure.is_absolute() else pure.parts
    if any(part in {"..", "~"} for part in parts):
        raise ValueError("repository database paths cannot escape the repository root")
    suffix = "/".join(part for part in parts if part not in {"", "."})
    return REPOSITORY_ROOT if not suffix else f"{REPOSITORY_ROOT}/{suffix}"


def _virtual_path(path: str) -> str:
    normalized = str(PurePosixPath(path))
    if normalized == REPOSITORY_ROOT:
        return "/"
    prefix = REPOSITORY_ROOT + "/"
    if not normalized.startswith(prefix):
        raise RuntimeError(
            "managed repository backend returned a path outside repository database"
        )
    return "/" + normalized[len(prefix) :]


def _virtual_file_info(item: Mapping[str, Any]) -> dict[str, Any]:
    copy = dict(item)
    copy["path"] = _virtual_path(str(item["path"]))
    return copy


def _event_text(value: Mapping[str, Any], *keys: str) -> str | None:
    for key in keys:
        candidate = value.get(key)
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()
    return None


__all__ = [
    "AssessmentRepositoryBackend",
    "REPOSITORY_AGENT_STATE",
    "REPOSITORY_META",
    "REPOSITORY_ROOT",
    "activate_managed_backend",
    "current_managed_backend",
    "ensure_repository_for_event",
    "hydrate_repository",
    "repository_database_backend",
    "resolve_managed_thread_backend",
]
