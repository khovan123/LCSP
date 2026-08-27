"""Bounded tools exposed only to the Legal Rule Triage subagent."""

from __future__ import annotations

from typing import Any

from langchain.tools import tool
from pydantic import BaseModel, ConfigDict, Field

from .service import LegalRuleTriageService


class GetLegalRuleTriageWorkItemsInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    affected_rule_ids: list[str] = Field(default_factory=list, max_length=500)


class PersistLegalRuleTriageResultInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    legal_rule_id: str = Field(min_length=1, max_length=240)
    legal_rule_catalog_version_id: str = Field(min_length=1, max_length=240)
    legal_corpus_version_id: str = Field(min_length=1, max_length=240)
    chunk_analyses: list[dict[str, Any]] = Field(min_length=1, max_length=500)
    engineering_rules: list[dict[str, Any]] = Field(default_factory=list, max_length=500)
    workflow_run_id: str = Field(min_length=1, max_length=240)
    correlation_id: str | None = Field(default=None, max_length=160)


@tool(args_schema=GetLegalRuleTriageWorkItemsInput)
def get_legal_rule_triage_work_items(
    affected_rule_ids: list[str] | None = None,
) -> dict[str, Any]:
    """Load approved LegalRules and their exact active legal chunks for agent triage."""
    return LegalRuleTriageService().get_work_items(
        affected_rule_ids=list(affected_rule_ids or []),
    )


@tool(args_schema=PersistLegalRuleTriageResultInput)
def persist_legal_rule_triage_result(
    legal_rule_id: str,
    legal_rule_catalog_version_id: str,
    legal_corpus_version_id: str,
    chunk_analyses: list[dict[str, Any]],
    engineering_rules: list[dict[str, Any]],
    workflow_run_id: str,
    correlation_id: str | None = None,
) -> dict[str, Any]:
    """Validate and persist the triage agent's decisions and EngineeringRule proposals."""
    return LegalRuleTriageService().persist_result(
        legal_rule_id=legal_rule_id,
        legal_rule_catalog_version_id=legal_rule_catalog_version_id,
        legal_corpus_version_id=legal_corpus_version_id,
        chunk_analyses=chunk_analyses,
        engineering_rules=engineering_rules,
        workflow_run_id=workflow_run_id,
        correlation_id=correlation_id,
    )
