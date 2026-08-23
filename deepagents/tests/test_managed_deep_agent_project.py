from __future__ import annotations

import ast
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from tools.context import get_assessment_context, retrieve_legal_basis
from tools.control import request_targeted_reanalysis, resume_waiting_runs
from tools.invocation import invoke_lcsp_boundary
from tools.common.managed.invocation import invocation_boundary_manifest


def test_managed_deep_agent_project_exports_single_root_agent() -> None:
    source = (PROJECT_ROOT / "agent.py").read_text()
    tree = ast.parse(source)

    assigned_names = {
        target.id
        for node in tree.body
        if isinstance(node, ast.Assign)
        for target in node.targets
        if isinstance(target, ast.Name)
    }

    assert "agent" in assigned_names
    assert "agents" not in assigned_names


def test_managed_schedule_exports_static_schedule_declaration() -> None:
    schedule_path = PROJECT_ROOT / "schedules" / "legal_catalog_daily.py"
    source = schedule_path.read_text()
    tree = ast.parse(source)

    assigned_names = {
        target.id
        for node in tree.body
        if isinstance(node, ast.Assign)
        for target in node.targets
        if isinstance(target, ast.Name)
    }

    assert "schedule" in assigned_names
    assert "os.getenv" not in source
    assert "load_config" not in source


def test_managed_tools_have_explicit_input_schema() -> None:
    lcsp_server_tools = (
        get_assessment_context,
        retrieve_legal_basis,
        request_targeted_reanalysis,
        resume_waiting_runs,
    )

    for managed_tool in lcsp_server_tools:
        schema = managed_tool.args_schema.model_json_schema()
        assert schema["additionalProperties"] is False
        assert "assessment_id" in schema["properties"]
        assert "input" in schema["properties"]

    invocation_schema = invoke_lcsp_boundary.args_schema.model_json_schema()
    assert invocation_schema["additionalProperties"] is False
    assert "boundary_name" in invocation_schema["properties"]
    assert "message" in invocation_schema["properties"]


def test_managed_project_uses_foldered_tool_application_structure() -> None:
    tool_packages = {
        path.name
        for path in (PROJECT_ROOT / "tools").iterdir()
        if path.is_dir() and not path.name.startswith("__")
    }

    assert tool_packages >= {
        "clarification",
        "legal",
        "engineer_rule",
        "graph",
        "planner",
        "classification",
        "gap",
        "reports",
        "common",
        "context",
        "control",
        "invocation",
    }
    assert (PROJECT_ROOT / "channels").is_dir()
    assert (PROJECT_ROOT / "connectors").is_dir()
    assert (PROJECT_ROOT / "evals" / "tasks").is_dir()
    assert (PROJECT_ROOT / "evals" / "scaffold").is_dir()
    assert (PROJECT_ROOT / "instructions.md").is_file()
    assert (PROJECT_ROOT / "identity.py").is_file()
    assert (PROJECT_ROOT / "memory.py").is_file()
    assert (PROJECT_ROOT / "middleware").is_dir()
    assert (PROJECT_ROOT / "sandbox" / "__init__.py").is_file()
    assert (PROJECT_ROOT / "skills" / "lcsp" / "SKILL.md").is_file()
    assert not (PROJECT_ROOT / "src").exists()
    assert not (PROJECT_ROOT / "scripts").exists()
    assert not list((PROJECT_ROOT / "tools").glob("*/lcsp_workers"))
    assert {
        path.name
        for path in (PROJECT_ROOT / "tools").glob("*.py")
    } == {"__init__.py"}


def test_all_former_consumers_have_managed_invocation_boundaries() -> None:
    manifest = invocation_boundary_manifest()

    assert len(manifest) == 23
    assert {entry["name"] for entry in manifest} >= {
        "scan_requested",
        "engineering_assessment_requested",
        "legal_change_detection_requested",
        "final_report_requested",
    }
