"""Scanner runtime with Program Evidence Graph split into ``runtime.graph``.

Legacy scanner modules still import ``.program_graph``. Keep that import path as a
runtime-only compatibility alias while the implementation lives canonically in
``runtime.graph``.
"""
from __future__ import annotations

import importlib
import sys
from typing import Any

sys.modules[f"{__name__}.program_graph"] = importlib.import_module("runtime.graph")

__all__ = [
    "ScanBoundary",
    "TargetedReanalysisBoundary",
    "SnapshotArchiveRequest",
    "SnapshotServiceClient",
    "ScannerWorker",
    "ArchiveMaterializationError",
    "MaterializationResult",
    "ScannerWorkspace",
]


def __getattr__(name: str) -> Any:
    if name == "ScanBoundary":
        from .scan_boundary import ScanBoundary
        return ScanBoundary
    if name == "TargetedReanalysisBoundary":
        from .targeted_reanalysis_boundary import TargetedReanalysisBoundary
        return TargetedReanalysisBoundary
    if name in {"SnapshotArchiveRequest", "SnapshotServiceClient"}:
        from .snapshot_service_client import SnapshotArchiveRequest, SnapshotServiceClient
        return {"SnapshotArchiveRequest": SnapshotArchiveRequest, "SnapshotServiceClient": SnapshotServiceClient}[name]
    if name == "ScannerWorker":
        from .worker import ScannerWorker
        return ScannerWorker
    if name in {"ArchiveMaterializationError", "MaterializationResult", "ScannerWorkspace"}:
        from .workspace import ArchiveMaterializationError, MaterializationResult, ScannerWorkspace
        return {"ArchiveMaterializationError": ArchiveMaterializationError, "MaterializationResult": MaterializationResult, "ScannerWorkspace": ScannerWorkspace}[name]
    raise AttributeError(name)
