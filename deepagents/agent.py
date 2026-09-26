"""Local Deep Agents entry point for LCSP.

The root agent is the supervisor. LangGraph hosts the graph locally while LCSP
owns repository sandboxing and event dispatch.
"""

import os
from pathlib import Path

from langsmith_bootstrap import disable_langsmith_tracing_by_default

disable_langsmith_tracing_by_default()

from deepagents import create_deep_agent
from langchain.agents.middleware import TodoListMiddleware

from harness import LCSP_MODEL_SPEC, configure_lcsp_harness
from middleware.model_governance import (
    MODEL_GOVERNANCE_MIDDLEWARE,
    governed_general_purpose_subagent,
)
from middleware.billing_metering import BillingAgentRoleMiddleware
from middleware.runtime_context import inject_lcsp_runtime_context
from middleware.specialist_handoff_validation import validate_lcsp_specialist_task_handoff
from middleware.system_event_dispatch import dispatch_agent_runtime_system_event
from middleware.triage_singleton import guard_triage_singleton_task
from model_policy import effective_model_configs
from orchestration.context import LCSPRunContext
from subagents import FLOW_SUBAGENTS
from tools.mcp import load_optional_mcp_tools
from tools.common.capabilities.platform.repository_sandbox import (
    REPOSITORY_SKILLS,
    RuntimeRepositoryBackend,
)
from tools.common.capabilities.platform.logging import (
    get_logger,
    suppress_langgraph_heartbeat_logs,
)
from tools.orchestration.request_targeted_reanalysis.code import (
    request_targeted_reanalysis,
)


ROOT_TOOLS = [request_targeted_reanalysis, *load_optional_mcp_tools()]
SYSTEM_PROMPT = (Path(__file__).with_name("instructions.md")).read_text(
    encoding="utf-8"
)


# Register provider-aware model construction plus the same full harness profile
# for the root and every child before Deep Agents resolves specs.
configure_lcsp_harness()
suppress_langgraph_heartbeat_logs()
logger = get_logger(__name__)
for model_config in effective_model_configs():
    logger.info(
        "LCSP_EFFECTIVE_MODEL_CONFIG",
        role=model_config.role,
        provider=model_config.provider,
        model=model_config.model,
        source=model_config.source,
        client=model_config.client,
        router=model_config.router,
        tools=model_config.tools,
        reasoning_effort=model_config.reasoning_effort,
        reasoning_policy=model_config.reasoning_policy,
        output_version=model_config.output_version,
    )

if os.environ.get("LCSP_LOCAL_GRAPH_DEV") == "1":
    # LangGraph dev's blocking-call detector rejects deepagents' editable-version
    # filesystem scan while Studio requests graph metadata.
    import deepagents._version as deepagents_version
    import deepagents.graph as deepagents_graph

    deepagents_version._lc_version = lambda: deepagents_version.__version__
    deepagents_graph._lc_version = deepagents_version._lc_version


def create_lcsp_agent(*, checkpointer=None, store=None):
    """Build the native LCSP Deep Agent graph for local or hosted runtimes."""
    return create_deep_agent(
        name="lcsp-agent",
        model=LCSP_MODEL_SPEC,
        tools=ROOT_TOOLS,
        backend=RuntimeRepositoryBackend(),
        skills=[(REPOSITORY_SKILLS, "LCSP Runtime")],
        system_prompt=SYSTEM_PROMPT,
        middleware=[
            dispatch_agent_runtime_system_event,
            guard_triage_singleton_task,
            validate_lcsp_specialist_task_handoff,
            inject_lcsp_runtime_context,
            BillingAgentRoleMiddleware("root"),
            *MODEL_GOVERNANCE_MIDDLEWARE,
            TodoListMiddleware(),
        ],
        context_schema=LCSPRunContext,
        subagents=[
            *FLOW_SUBAGENTS,
            governed_general_purpose_subagent(LCSP_MODEL_SPEC, billing_role="root"),
        ],
        interrupt_on={
            "request_targeted_reanalysis": True,
        },
        checkpointer=checkpointer,
        store=store,
    )


agent = create_lcsp_agent()
