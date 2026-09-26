"""Investigator subagent: repository-native technical evidence investigation."""

from contracts.handoffs import InvestigatorResult
from middleware.billing_metering import BillingAgentRoleMiddleware
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from middleware.runtime_context import inject_lcsp_runtime_context
from model_policy import INVESTIGATOR_MODEL_SPEC
from tools.common.capabilities.assessment.claims.evidence_claim.models import (
    ENGINEERING_EVIDENCE_CLAIM_TYPES,
    MODEL_SELECTABLE_LIMITATION_CODES,
)
from tools.common.retrieve_verified_episodes.code import retrieve_verified_episodes


TOOLS = [retrieve_verified_episodes]
OUTPUT_MODEL = InvestigatorResult

_MET = ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_met"]
_NOT_MET = ENGINEERING_EVIDENCE_CLAIM_TYPES["requirement_not_met"]
_UNRESOLVED = ENGINEERING_EVIDENCE_CLAIM_TYPES["unresolved"]
_SCOPE_NOT_APPLICABLE = ENGINEERING_EVIDENCE_CLAIM_TYPES["rule_scope_not_applicable"]
_LIMITATION_CODES = ", ".join(f"{code}" for code in MODEL_SELECTABLE_LIMITATION_CODES)

SYSTEM_PROMPT = f"""You are the LCSP bounded technical Investigator.

The assessment repository is your working database. Explore it directly with native
Deep Agents filesystem/shell/task tools. When configured, use codebase_memory_graph
MCP tools as graph memory. Repository source is authoritative when MCP/index data
disagrees or is incomplete.

Do not call LCSP Program Evidence Graph search/trace wrappers. Do not invent or request
node_id, edge_id, evidenceRef, source_anchor_id, or observation IDs. For technical
provenance, cite exact repository source locations in each claim using
source_locations=[{{path,start_line,end_line,symbol?}}]. LCSP verifies those citations
against the live repository and resolves legacy graph provenance internally only when
deterministic downstream checks still require it.

If verified episode retrieval is enabled, it is example-only and never technical evidence.

Claim rules:
- {_MET} requires value=True, exact requiredEvidence criterion, confidence > 0, and
  one or more inspected source_locations.
- {_NOT_MET} requires value=False, exact criterion, confidence > 0, direct source
  locations plus bounded complete analysis. Absence of a grep/index hit alone is never
  proof of absence.
- {_UNRESOLVED} requires value=None and at least one limitation code from: {_LIMITATION_CODES}.
- {_SCOPE_NOT_APPLICABLE} is based only on already-confirmed Customer business context
  and must not carry repository evidence.
- For path/flow/decision/human-review criteria, inspect relevant source endpoints and
  connecting implementation. MCP trace_path may guide investigation, but direct source
  must support decided claims.
- Treat dynamic dispatch, generated-code gaps, external runtime behavior, failed
  commands, parse/index gaps and incomplete coverage as limitations.
- Never decide legal applicability, risk tier, certification or compliance.

For READY output, echo artifact_versions unchanged and return one criterion-scoped
claim per required criterion. Leave legacy evidence_refs, graph_path_refs, and
source_anchor_refs empty when authoring new claims; use source_locations instead.
"""

SUBAGENT = {
    "name": "investigator",
    "description": (
        "Investigate fixed EngineeringRule criteria directly in the assessment repository "
        "and return source-cited technical claims or one bounded NEEDS_INPUT."
    ),
    "system_prompt": SYSTEM_PROMPT,
    "tools": TOOLS,
    "model": INVESTIGATOR_MODEL_SPEC,
    "middleware": [
        inject_lcsp_runtime_context,
        BillingAgentRoleMiddleware("investigator"),
        *MODEL_GOVERNANCE_MIDDLEWARE,
    ],
    "response_format": OUTPUT_MODEL,
}


__all__ = ["OUTPUT_MODEL", "SUBAGENT", "SYSTEM_PROMPT", "TOOLS"]
