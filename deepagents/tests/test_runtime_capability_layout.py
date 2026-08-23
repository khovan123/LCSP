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

    assert _directories(root) == {
        "contract",
        "scripts",
        "observability",
        "clarification",
    }
    assert _implementation_files(root) == {"tool_dispatch.py", "graph_runtime.py"}
    assert _implementation_files(root / "observability") == {
        "correlation.py",
        "dev_unsafe_instrumentation.py",
        "dev_unsafe_trace.py",
        "logging.py",
        "logging_config.py",
        "logging_path.py",
        "orchestration_logging.py",
        "tracing.py",
    }
    assert _implementation_files(root / "clarification") == {
        "wizard_clarification.py",
    }


def test_flat_dispatch_observability_import_routes_to_owner_package() -> None:
    legacy = importlib.import_module("runtime.infrastructure.dispatch.correlation")
    canonical = importlib.import_module(
        "runtime.infrastructure.dispatch.observability.correlation"
    )
    assert Path(str(legacy.__file__)).resolve() == Path(
        str(canonical.__file__)
    ).resolve()


def test_flat_dispatch_clarification_import_routes_to_owner_package() -> None:
    legacy = importlib.import_module(
        "runtime.infrastructure.dispatch.wizard_clarification"
    )
    canonical = importlib.import_module(
        "runtime.infrastructure.dispatch.clarification.wizard_clarification"
    )
    assert Path(str(legacy.__file__)).resolve() == Path(
        str(canonical.__file__)
    ).resolve()
