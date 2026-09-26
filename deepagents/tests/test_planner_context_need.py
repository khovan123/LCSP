from __future__ import annotations

import re
from dataclasses import dataclass, field, replace
from pathlib import Path
from typing import Any

from langchain_core.messages import ToolMessage

from middleware.tool_scope import AllowedToolsMiddleware
from tools.common.capabilities.assessment.planning.engineering_rule.engineering_rule_planner import (
    PLANNER_CONTEXT_REQUIRED,
    PlannerContextPending,
)
from tools.common.capabilities.workflow.recovery import interview_boundary


@dataclass
class _Tool:
    name: str


@dataclass
class _Request:
    tools: list[Any] = field(default_factory=list)
    tool_call: dict[str, Any] = field(default_factory=dict)

    def override(self, **changes: Any) -> "_Request":
        return replace(self, **changes)


def test_allowed_tools_hides_and_rejects_repository_tools():
    middleware = AllowedToolsMiddleware({"retrieve_verified_episodes"})
    seen: list[list[str]] = []

    middleware.wrap_model_call(
        _Request(tools=[_Tool("read_file"), _Tool("grep"), _Tool("retrieve_verified_episodes")]),
        lambda request: seen.append([tool.name for tool in request.tools]),
    )
    rejected = middleware.wrap_tool_call(
        _Request(tool_call={"name": "read_file", "id": "call-1"}),
        lambda request: "executed",
    )
    allowed = middleware.wrap_tool_call(
        _Request(tool_call={"name": "retrieve_verified_episodes", "id": "call-2"}),
        lambda request: "executed",
    )

    assert seen == [["retrieve_verified_episodes"]]
    assert isinstance(rejected, ToolMessage) and rejected.status == "error"
    assert allowed == "executed"


def test_planner_pause_is_not_a_run_failure():
    # Like TargetedInterviewPending, it must pass through generic failure handlers.
    assert not issubclass(PlannerContextPending, Exception)


def test_planner_resume_authors_a_same_revision_question():
    assert PLANNER_CONTEXT_REQUIRED in interview_boundary._SAME_REVISION_RESUME_REASONS


def test_planner_resume_reason_matches_shared_typescript_contract():
    contract = (
        Path(__file__).resolve().parents[2]
        / "packages/contracts/src/evidence/assessment-interview.ts"
    ).read_text()
    block = re.search(
        r"export const ASSESSMENT_INTERVIEW_RESUME_REASONS = \{(.*?)\} as const;",
        contract,
        re.S,
    )
    assert block is not None
    assert f'plannerContextRequired: "{PLANNER_CONTEXT_REQUIRED}"' in block.group(1)
