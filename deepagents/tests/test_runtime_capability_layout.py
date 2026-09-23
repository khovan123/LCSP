from __future__ import annotations

import importlib
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))


def _directories(path: Path) -> set[str]:
    return {
        entry.name
        for entry in path.iterdir()
        if entry.is_dir() and entry.name != "__pycache__"
    }


def _implementation_files(path: Path) -> set[str]:
    return {
        entry.name
        for entry in path.iterdir()
        if entry.is_file() and entry.suffix == ".py" and entry.name != "__init__.py"
    }


def test_dispatch_runtime_groups_support_capabilities() -> None:
    root = PROJECT_ROOT / "runtime" / "infrastructure" / "dispatch"

    assert not root.exists()

    platform = PROJECT_ROOT / "tools" / "common" / "capabilities" / "platform"
    assert _implementation_files(platform) == {
        "api_client.py",
        "artifact_storage.py",
        "callback_schemas.py",
        "config.py",
        "correlation.py",
        "dev_unsafe_trace.py",
        "env.py",
        "file_lock.py",
        "graph_runtime.py",
        "logging.py",
        "logging_config.py",
        "logging_path.py",
        "managed_workspace.py",
        "orchestration_logging.py",
        "rbac_client.py",
        "repository_snapshot_client.py",
        "repository_workspace.py",
        "source_clarification.py",
        "tracing.py",
    }


def _assert_import_blocked(module_name: str) -> None:
    try:
        importlib.import_module(module_name)
    except ModuleNotFoundError:
        return
    raise AssertionError(f"legacy import unexpectedly resolved: {module_name}")


def test_flat_dispatch_observability_import_is_not_supported() -> None:
    _assert_import_blocked("runtime.infrastructure.dispatch.correlation")


def test_flat_dispatch_clarification_import_is_not_supported() -> None:
    _assert_import_blocked("runtime.infrastructure.dispatch.source_clarification")


def test_program_graph_runtime_groups_owned_capabilities() -> None:
    root = PROJECT_ROOT / "tools" / "common" / "capabilities" / "evidence" / "graph"

    assert _directories(root) == {"schema", "query"}
    assert _implementation_files(root) == set()
    assert _implementation_files(root / "schema") == {
        "models.py",
        "source_roles.py",
        "vocabulary.py",
    }
    assert _implementation_files(root / "query") == {"query_engine.py"}


def test_flat_program_graph_import_is_not_supported() -> None:
    _assert_import_blocked("tools.common.capabilities.evidence.graph.models")


def test_graph_schema_and_query_import_without_legacy_builder_runtime() -> None:
    schema = importlib.import_module("tools.common.capabilities.evidence.graph.schema.models")
    query_engine = importlib.import_module("tools.common.capabilities.evidence.graph.query.query_engine")
    assert schema is not None
    assert query_engine is not None
    _assert_import_blocked(
        "tools.common.capabilities.evidence.graph.construction.assembly.builder"
    )
