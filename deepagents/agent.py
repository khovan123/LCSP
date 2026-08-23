"""Managed Deep Agents entry point for LCSP.

The root agent is an orchestrator. Specialized subagents own bounded node tool
surfaces; deterministic runtime code remains the authority for the final gate.
"""

from managed_deepagents import define_deep_agent

from flow import ORCHESTRATION_TOOL_NAMES
from harness import LCSP_FILESYSTEM_PERMISSIONS, LCSP_MODEL_SPEC, configure_lcsp_harness
from subagents import FLOW_SUBAGENTS
from tools.orchestration.request_targeted_reanalysis.code import (
    request_targeted_reanalysis,
)


ROOT_TOOLS = [
    request_targeted_reanalysis,
]

if tuple(tool.name for tool in ROOT_TOOLS) != ORCHESTRATION_TOOL_NAMES:
    raise RuntimeError("root orchestration tools drifted from the canonical flow manifest")


# Deep Agents tools are additive to harness tools. Register the LCSP profile first
# so the managed graph has no default general-purpose subagent and no unrestricted
# filesystem/shell surface.
configure_lcsp_harness()


agent = define_deep_agent(
    name="lcsp-agent",
    model=LCSP_MODEL_SPEC,
    tools=ROOT_TOOLS,
    subagents=FLOW_SUBAGENTS,
    permissions=LCSP_FILESYSTEM_PERMISSIONS,
    interrupt_on={
        "request_targeted_reanalysis": True,
    },
)
