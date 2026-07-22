from __future__ import annotations

import hashlib
import json
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from lcsp_workers.scanner.dependencies.dependency_fact import (
    DependencyUsageFact,
    USAGE_MISSING,
    USAGE_TRANSITIVE,
    USAGE_UNUSED,
    is_ai_package,
)

from .tool_base import (
    OUTCOME_SUCCESS,
    OUTCOME_TOOL_FAILURE,
    OUTCOME_TOOL_TIMEOUT,
    ToolExecutionResult,
)


DEFAULT_TIMEOUT_SECONDS = 60
DEFAULT_PINNED_VERSION = "0."
DEFAULT_TOOL_NAME = "deptry"


@dataclass(frozen=True)
class DeptryRunResult:
    facts: list[DependencyUsageFact]
    execution: ToolExecutionResult


class DeptryTool:
    def __init__(
        self,
        deptry_binary: str = DEFAULT_TOOL_NAME,
        timeout_seconds: int = DEFAULT_TIMEOUT_SECONDS,
        pinned_version: str = DEFAULT_PINNED_VERSION,
    ) -> None:
        self._deptry_binary = deptry_binary
        self._timeout_seconds = timeout_seconds
        self._pinned_version = pinned_version

    @staticmethod
    def fact(
        *,
        package_name: str,
        usage_state: str,
        file_refs: list[str],
    ) -> DependencyUsageFact:
        return DependencyUsageFact(
            package_name=package_name,
            version=None,
            ecosystem="pypi",
            usage_state=usage_state,
            source_tool=DEFAULT_TOOL_NAME,
            file_refs=file_refs,
            is_ai_relevant=is_ai_package(package_name),
        )

    def run(self, workspace_path: str | Path) -> DeptryRunResult:
        workspace = Path(workspace_path)
        config_hash = self._config_hash()

        if not self._should_run(workspace):
            return DeptryRunResult(
                facts=[],
                execution=ToolExecutionResult(
                    tool_name=DEFAULT_TOOL_NAME,
                    tool_version="not-run",
                    outcome=OUTCOME_SUCCESS,
                    config_hash=config_hash,
                    messages=["deptry skipped: no Python files with dependency manifest present"],
                ),
            )

        version_result = self._read_version(config_hash)
        if version_result.outcome != OUTCOME_SUCCESS:
            return DeptryRunResult(facts=[], execution=version_result)

        with tempfile.NamedTemporaryFile(prefix="lcsp-deptry-", suffix=".json") as out:
            command = [
                self._deptry_binary,
                ".",
                "--json-output",
                out.name,
            ]
            try:
                completed = subprocess.run(
                    command,
                    cwd=workspace,
                    capture_output=True,
                    text=True,
                    timeout=self._timeout_seconds,
                    check=False,
                )
            except subprocess.TimeoutExpired:
                return DeptryRunResult(
                    facts=[],
                    execution=ToolExecutionResult(
                        tool_name=DEFAULT_TOOL_NAME,
                        tool_version=version_result.tool_version,
                        outcome=OUTCOME_TOOL_TIMEOUT,
                        config_hash=config_hash,
                        messages=[f"deptry timed out after {self._timeout_seconds}s"],
                    ),
                )
            except OSError as error:
                return DeptryRunResult(
                    facts=[],
                    execution=ToolExecutionResult(
                        tool_name=DEFAULT_TOOL_NAME,
                        tool_version=version_result.tool_version,
                        outcome=OUTCOME_TOOL_FAILURE,
                        config_hash=config_hash,
                        messages=[f"deptry execution failed: {error}"],
                    ),
                )

            payload = self._read_payload(Path(out.name), completed.stdout)
            if payload is None:
                return DeptryRunResult(
                    facts=[],
                    execution=ToolExecutionResult(
                        tool_name=DEFAULT_TOOL_NAME,
                        tool_version=version_result.tool_version,
                        outcome=OUTCOME_TOOL_FAILURE,
                        config_hash=config_hash,
                        messages=[
                            completed.stderr.strip()
                            or "deptry produced no readable JSON output"
                        ],
                    ),
                )

        return DeptryRunResult(
            facts=self._parse_facts(payload, workspace),
            execution=ToolExecutionResult(
                tool_name=DEFAULT_TOOL_NAME,
                tool_version=version_result.tool_version,
                outcome=OUTCOME_SUCCESS,
                config_hash=config_hash,
                messages=[],
            ),
        )

    def _read_version(self, config_hash: str) -> ToolExecutionResult:
        try:
            completed = subprocess.run(
                [self._deptry_binary, "--version"],
                capture_output=True,
                text=True,
                timeout=10,
                check=False,
            )
        except subprocess.TimeoutExpired:
            return ToolExecutionResult(
                tool_name=DEFAULT_TOOL_NAME,
                tool_version="unknown",
                outcome=OUTCOME_TOOL_TIMEOUT,
                config_hash=config_hash,
                messages=["deptry --version timed out"],
            )
        except OSError as error:
            return ToolExecutionResult(
                tool_name=DEFAULT_TOOL_NAME,
                tool_version="unknown",
                outcome=OUTCOME_TOOL_FAILURE,
                config_hash=config_hash,
                messages=[f"deptry not available: {error}"],
            )

        raw_version = (completed.stdout or completed.stderr).strip()
        if completed.returncode != 0 or not raw_version:
            return ToolExecutionResult(
                tool_name=DEFAULT_TOOL_NAME,
                tool_version="unknown",
                outcome=OUTCOME_TOOL_FAILURE,
                config_hash=config_hash,
                messages=["unable to determine deptry version"],
            )
        if self._pinned_version and self._pinned_version not in raw_version:
            return ToolExecutionResult(
                tool_name=DEFAULT_TOOL_NAME,
                tool_version=raw_version,
                outcome=OUTCOME_TOOL_FAILURE,
                config_hash=config_hash,
                messages=[
                    f"deptry version mismatch: expected {self._pinned_version}, got {raw_version}"
                ],
            )
        return ToolExecutionResult(
            tool_name=DEFAULT_TOOL_NAME,
            tool_version=raw_version,
            outcome=OUTCOME_SUCCESS,
            config_hash=config_hash,
            messages=[],
        )

    def _read_payload(self, output_path: Path, stdout: str) -> dict[str, Any] | None:
        text = ""
        try:
            text = output_path.read_text(encoding="utf-8")
        except OSError:
            text = stdout
        if not text.strip():
            return {}
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return None
        return payload if isinstance(payload, dict) else {}

    def _parse_facts(
        self, payload: dict[str, Any], workspace: Path
    ) -> list[DependencyUsageFact]:
        facts: list[DependencyUsageFact] = []
        for name, files in self._iter_entries(payload, "unused", "DEP002"):
            facts.append(
                self.fact(
                    package_name=name,
                    usage_state=USAGE_UNUSED,
                    file_refs=[self._relative_path(path, workspace) for path in files],
                )
            )
        for name, files in self._iter_entries(payload, "missing", "DEP001"):
            facts.append(
                self.fact(
                    package_name=name,
                    usage_state=USAGE_MISSING,
                    file_refs=[self._relative_path(path, workspace) for path in files],
                )
            )
        for name, files in self._iter_entries(payload, "transitive", "DEP003"):
            facts.append(
                self.fact(
                    package_name=name,
                    usage_state=USAGE_TRANSITIVE,
                    file_refs=[self._relative_path(path, workspace) for path in files],
                )
            )
        return facts

    def _iter_entries(
        self, payload: dict[str, Any], canonical_key: str, deptry_key: str
    ) -> list[tuple[str, list[str]]]:
        value = payload.get(canonical_key)
        if value is None:
            value = payload.get(deptry_key)
        if isinstance(value, dict):
            return [(str(name), self._read_files(details)) for name, details in value.items()]
        if isinstance(value, list):
            entries: list[tuple[str, list[str]]] = []
            for item in value:
                if isinstance(item, str):
                    entries.append((item, []))
                elif isinstance(item, dict):
                    name = item.get("module") or item.get("name") or item.get("package")
                    if isinstance(name, str):
                        entries.append((name, self._read_files(item)))
            return entries
        return []

    def _read_files(self, details: Any) -> list[str]:
        if not isinstance(details, dict):
            return []
        files = details.get("files") or details.get("file") or details.get("locations")
        if isinstance(files, str):
            return [files]
        if isinstance(files, list):
            return [item for item in files if isinstance(item, str)]
        return []

    def _relative_path(self, raw_path: str, workspace: Path) -> str:
        candidate = Path(raw_path)
        if not candidate.is_absolute():
            cleaned = raw_path.replace("\\", "/")
            return cleaned[2:] if cleaned.startswith("./") else cleaned
        try:
            return candidate.resolve(strict=False).relative_to(
                workspace.resolve(strict=False)
            ).as_posix()
        except ValueError:
            return candidate.name

    def _should_run(self, workspace: Path) -> bool:
        has_python = any(
            path.is_file() and path.suffix == ".py" for path in workspace.rglob("*")
        )
        if not has_python:
            return False
        return any(
            manifest.exists()
            for pattern in ("pyproject.toml", "requirements*.txt")
            for manifest in workspace.glob(pattern)
        )

    def _config_hash(self) -> str:
        material = f"{DEFAULT_TOOL_NAME}:{self._pinned_version}:json-output"
        return f"sha256:{hashlib.sha256(material.encode('utf-8')).hexdigest()}"
