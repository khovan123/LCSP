"""Language-neutral project discovery and project-aware result contracts."""
from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


PROJECT_SUCCESS = "SUCCESS"
PROJECT_PARTIAL = "PARTIAL"
PROJECT_FAILED = "FAILED"
PROJECT_UNSUPPORTED = "UNSUPPORTED"


@dataclass(frozen=True)
class ProjectDescriptor:
    project_id: str
    root_path: Path
    relative_root: str
    project_name: str | None = None
    project_kind: str | None = None
    manifest_paths: tuple[str, ...] = field(default_factory=tuple)
    parent_project_id: str | None = None
    detected_languages: tuple[str, ...] = field(default_factory=tuple)
    framework_hints: tuple[str, ...] = field(default_factory=tuple)
    workspace_membership: tuple[str, ...] = field(default_factory=tuple)
    discovery_evidence: tuple[str, ...] = field(default_factory=tuple)
    limitations: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ProjectDiscoveryResult:
    projects: tuple[ProjectDescriptor, ...] = field(default_factory=tuple)
    limitations: tuple[str, ...] = field(default_factory=tuple)
    file_ownership: dict[str, str] = field(default_factory=dict)
    unowned_files: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class ProjectLanguageResult:
    project_id: str
    language: str
    analyzer: str | None
    status: str
    capabilities: Any = None
    files: tuple[str, ...] = field(default_factory=tuple)
    coverage_limitations: tuple[str, ...] = field(default_factory=tuple)
    skipped_files: tuple[str, ...] = field(default_factory=tuple)
    failure: str | None = None


@dataclass(frozen=True)
class ProjectScanResult:
    project_id: str
    language_results: tuple[ProjectLanguageResult, ...] = field(default_factory=tuple)
    limitations: tuple[str, ...] = field(default_factory=tuple)

