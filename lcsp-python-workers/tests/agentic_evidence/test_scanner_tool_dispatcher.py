from __future__ import annotations

import inspect
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from lcsp_workers.agentic_evidence import scanner_tool_entrypoints
from lcsp_workers.agentic_evidence.dispatcher import (
    ALL_TOOL_BINDINGS,
    AO1_SCANNER_TOOL_BINDINGS,
    ScannerToolDispatcher,
    ToolRuntimeTarget,
    runtime_binding,
)
from lcsp_workers.agentic_evidence.registry import AgenticToolValidationError
from lcsp_workers.agentic_evidence.scanner_tool_entrypoints import (
    ScannerToolExecutionContext,
)


EXPECTED_AO1_SCANNER_TOOLS = {
    "materialize_snapshot",
    "classify_workspace_languages",
    "run_syft_inventory",
    "run_semgrep_rules",
    "run_knip_usage_analysis",
    "run_deptry_usage_analysis",
    "run_ts_js_semantic_analysis",
    "run_python_semantic_analysis",
    "run_structural_augmentation",
    "build_evidence_graph",
}


def _context() -> ScannerToolExecutionContext:
    return ScannerToolExecutionContext(
        workspace=MagicMock(),
        language_classifier=MagicMock(),
        syft_tool=MagicMock(),
        semgrep_tool=MagicMock(),
        knip_tool=MagicMock(),
        deptry_tool=MagicMock(),
        ts_js_bridge_factory=MagicMock(),
        structural_augmentor=MagicMock(),
        evidence_graph_assembler=MagicMock(),
    )


def test_ao1_scanner_bindings_are_exact_named_static_functions() -> None:
    names = {binding.tool_name for binding in AO1_SCANNER_TOOL_BINDINGS}
    assert names == EXPECTED_AO1_SCANNER_TOOLS
    assert len(names) == len(AO1_SCANNER_TOOL_BINDINGS)

    source = inspect.getsource(scanner_tool_entrypoints)
    for binding in AO1_SCANNER_TOOL_BINDINGS:
        assert binding.runtime_target == ToolRuntimeTarget.PYTHON_LOCAL
        assert binding.entrypoint.__name__ == binding.tool_name
        assert getattr(scanner_tool_entrypoints, binding.tool_name) is binding.entrypoint
        assert f"def {binding.tool_name}(" in source


def test_global_runtime_binding_index_is_unique_and_discoverable() -> None:
    names = [binding.tool_name for binding in ALL_TOOL_BINDINGS]
    assert len(names) == len(set(names))

    syft = runtime_binding("run_syft_inventory")
    assert syft.runtime_target == ToolRuntimeTarget.PYTHON_LOCAL
    assert syft.downstream_target == "SyftTool.run"
    assert syft.entrypoint.__name__ == "run_syft_inventory"

    evidence = runtime_binding("search_evidence")
    assert evidence.runtime_target == ToolRuntimeTarget.NEST_CQRS
    assert evidence.downstream_target == "SearchEvidenceQuery"


def test_scanner_dispatcher_routes_syft_through_same_named_entrypoint() -> None:
    context = _context()
    expected = object()
    context.syft_tool.run.return_value = expected
    dispatcher = ScannerToolDispatcher(context)

    result = dispatcher.dispatch(
        "run_syft_inventory",
        workspace_path=Path("/tmp/lcsp-workspace"),
    )

    assert result is expected
    context.syft_tool.run.assert_called_once_with(Path("/tmp/lcsp-workspace"))


def test_scanner_dispatcher_fails_closed_for_unknown_tool() -> None:
    dispatcher = ScannerToolDispatcher(_context())

    with pytest.raises(
        AgenticToolValidationError,
        match="SCANNER_TOOL_RUNTIME_BINDING_NOT_FOUND",
    ):
        dispatcher.dispatch("run_unknown_scanner_tool")
