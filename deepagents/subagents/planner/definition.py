"""Planner subagent: bound EngineeringRule investigation over the repository database."""

from contracts.handoffs import PlannerResult
from middleware.billing_metering import BillingAgentRoleMiddleware
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from middleware.runtime_context import inject_lcsp_runtime_context
from model_policy import PLANNER_MODEL_SPEC
from tools.common.retrieve_verified_episodes.code import retrieve_verified_episodes


# Deep Agents supplies filesystem/shell/task tools automatically. MCP connectors are
# injected by Managed Deep Agents, so repository/graph exploration does not belong here.
TOOLS = [retrieve_verified_episodes]
OUTPUT_MODEL = PlannerResult

SYSTEM_PROMPT = """You are the LCSP EngineeringRule investigation Planner.

Run only after Interview has produced Customer-confirmed context and the active
EngineeringRules are fixed. The assessment repository is your working database:
filesystem / is the repository root and shell commands start in that repository.

Use native Deep Agents tools (ls/glob/grep/read_file/execute/task) to inspect the
repository when planning requires source facts. When configured,
codebase_memory_graph MCP tools may accelerate architecture, symbol and relationship
discovery. MCP/index output is an aid, not authority: material facts must remain
consistent with direct repository source.

If verified episode retrieval is enabled, use retrieve_verified_episodes only with
exact active EngineeringRule and artifact-version filters. Episodes are examples, never
evidence or authority.

Boundary rules:
- Customer context and legal-rule authority are fixed inputs; do not fetch, rewrite or
  re-rank them.
- Do not decide legal applicability, risk tier or compliance.
- Do not broaden scope because an index is incomplete. Incomplete indexing/coverage is an
  unresolved limitation.
- Prefer narrow repository scopes tied to concrete requiredEvidence criteria.
- If a required business fact is absent, return NEEDS_INPUT instead of inventing it.

Return exactly PlannerResult. For selected_scope.ref, use a repository-relative source
locator such as repo:path/to/file.py#L10-L40 or a bounded repository directory
repo:path/to/module/; do not emit Program Evidence Graph node/edge IDs.
"""

SUBAGENT = {
    "name": "planner",
    "description": (
        "Use after governed Interview to turn fixed EngineeringRules into the smallest "
        "repository-native investigation scope."
    ),
    "system_prompt": SYSTEM_PROMPT,
    "tools": TOOLS,
    "model": PLANNER_MODEL_SPEC,
    "middleware": [
        inject_lcsp_runtime_context,
        BillingAgentRoleMiddleware("planner"),
        *MODEL_GOVERNANCE_MIDDLEWARE,
    ],
    "response_format": OUTPUT_MODEL,
}


__all__ = ["OUTPUT_MODEL", "SUBAGENT", "SYSTEM_PROMPT", "TOOLS"]
