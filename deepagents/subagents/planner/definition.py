"""Planner subagent: bound EngineeringRule investigation over the repository database."""

from contracts.handoffs import PlannerResult
from middleware.billing_metering import BillingAgentRoleMiddleware
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from middleware.runtime_context import inject_lcsp_runtime_context
from middleware.tool_scope import AllowedToolsMiddleware
from model_policy import PLANNER_MODEL_SPEC
from tools.common.retrieve_verified_episodes.code import retrieve_verified_episodes


# Deep Agents attaches filesystem/shell/task tools to every subagent; the Planner never
# reads source, so AllowedToolsMiddleware keeps only its own tools visible.
TOOLS = [retrieve_verified_episodes]
OUTPUT_MODEL = PlannerResult

SYSTEM_PROMPT = """You are the LCSP EngineeringRule Planner.

Run only after Interview has produced Customer-confirmed business context and the
active EngineeringRules are fixed. Your only inputs are those EngineeringRules and the
confirmed context. Do not read, search or scan repository source: technical evidence
is gathered later by the Investigator.

If verified episode retrieval is enabled, use retrieve_verified_episodes only with
exact active EngineeringRule and artifact-version filters. Episodes are examples, never
evidence or authority.

Boundary rules:
- Customer context and legal-rule authority are fixed inputs; do not fetch, rewrite or
  re-rank them.
- Do not decide legal applicability, risk tier or compliance.
- Select a rule whenever confirmed context makes it relevant or does not rule it out.
- When selecting a rule depends on a business fact that confirmed context does not
  state, return NEEDS_INPUT with that fact in unresolved_facts. Root Orchestration
  routes it to Interview, which asks the Customer; never guess the fact.

Return exactly PlannerResult. For selected_scope.ref, use the EngineeringRule reference
engineering-rule:<engineeringRuleId> with the requiredEvidence criterion it covers.
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
        AllowedToolsMiddleware({tool.name for tool in TOOLS}),
        inject_lcsp_runtime_context,
        BillingAgentRoleMiddleware("planner"),
        *MODEL_GOVERNANCE_MIDDLEWARE,
    ],
    "response_format": OUTPUT_MODEL,
}


__all__ = ["OUTPUT_MODEL", "SUBAGENT", "SYSTEM_PROMPT", "TOOLS"]
