"""Bounded Wizard clarification request payloads for runtime events."""

from __future__ import annotations

from typing import Any

WIZARD_CLARIFICATION_REQUEST_KIND = "WIZARD_CONTEXT_REQUEST"

WIZARD_CLARIFICATION_SCOPES = {
    "pre_scan": "PRE_SCAN",
    "post_graph": "POST_GRAPH",
}

WIZARD_CLARIFICATION_REQUESTERS = {
    "wizard": "WIZARD",
    "scanner": "SCANNER",
    "planner": "PLANNER",
}

WIZARD_CLARIFICATION_QUESTION_IDS = {
    "missing_graph_context": "MISSING_GRAPH_CONTEXT",
    "missing_rule_scope": "MISSING_RULE_SCOPE",
    "missing_human_review_boundary": "MISSING_HUMAN_REVIEW_BOUNDARY",
}


def engineering_rule_source_clarification_summary(
    *,
    base_summary: dict[str, Any],
) -> dict[str, Any]:
    """Build the bounded post-graph context request for missing rule sources."""
    return {
        **base_summary,
        "kind": WIZARD_CLARIFICATION_REQUEST_KIND,
        "scope": WIZARD_CLARIFICATION_SCOPES["post_graph"],
        "requestedBy": WIZARD_CLARIFICATION_REQUESTERS["planner"],
        "reasonCode": "NO_ENGINEERING_RULE_SOURCE_RULES",
        "questionIds": [
            WIZARD_CLARIFICATION_QUESTION_IDS["missing_rule_scope"],
            WIZARD_CLARIFICATION_QUESTION_IDS["missing_graph_context"],
            WIZARD_CLARIFICATION_QUESTION_IDS["missing_human_review_boundary"],
        ],
    }
