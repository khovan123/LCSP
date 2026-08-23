"""Managed Deep Agents entry point for LCSP.

The root agent is an orchestrator. Specialized subagents own bounded node tool
surfaces; deterministic runtime code remains the authority for the final gate.
"""

from managed_deepagents import define_deep_agent

from flow import ORCHESTRATION_TOOL_NAMES
from subagents import FLOW_SUBAGENTS
from tools.orchestration.request_targeted_reanalysis.code import (
    request_targeted_reanalysis,
)


ROOT_TOOLS = [
    request_targeted_reanalysis,
]

if tuple(tool.name for tool in ROOT_TOOLS) != ORCHESTRATION_TOOL_NAMES:
    raise RuntimeError("root orchestration tools drifted from the canonical flow manifest")


agent = define_deep_agent(
    name="lcsp-agent",
    model="openai:gpt-5",
    tools=ROOT_TOOLS,
    subagents=FLOW_SUBAGENTS,
    interrupt_on={
        "request_targeted_reanalysis": True,
    },
)
