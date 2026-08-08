from __future__ import annotations

import json
from typing import Any

from lcsp_workers.llm.gateway_client import LLMGatewayClient


ALLOWED_SUMMARY_FIELDS = {
    "businessProcess",
    "aiPurpose",
    "affectedSubjects",
    "humanReview",
}


class AIUsageFlowModelAssistedProposer:
    def __init__(self, llm_client: LLMGatewayClient):
        self.llm_client = llm_client

    def generate_summary_proposal(
        self,
        *,
        baseline_summary: dict[str, Any],
        wizard_profile: dict[str, Any] | None,
        validated_claims: list[dict[str, Any]],
        workflow_run_id: str,
        node_name: str,
        correlation_id: str | None = None,
    ) -> dict[str, Any] | None:
        prompt = f"""
        You are an AIUsageFlow summary proposal assistant.
        Return JSON only.

        BASELINE_SUMMARY:
        {baseline_summary}

        WIZARD_PROFILE:
        {wizard_profile or {}}

        VALIDATED_CLAIMS:
        {validated_claims}

        OUTPUT_SCHEMA:
        {{
          "summary_updates": {{
            "businessProcess": "optional string",
            "aiPurpose": "optional string",
            "affectedSubjects": "optional list or string",
            "humanReview": "optional string"
          }}
        }}

        RULES:
        - Only include keys that should change.
        - Do not propose values outside the wizard-authoritative business context.
        - Do not invent claims, evidence refs, confidence, or privacy flags.
        - Do not output markdown fences.
        """
        try:
            response = self.llm_client.complete(
                prompt=prompt,
                workflow_run_id=workflow_run_id,
                node_name=node_name,
                max_tokens=256,
                correlation_id=correlation_id,
            )
        except Exception:
            return None

        try:
            proposal = json.loads(response.content)
        except json.JSONDecodeError:
            return None

        summary_updates = proposal.get("summary_updates")
        if not isinstance(summary_updates, dict):
            return None

        if any(key not in ALLOWED_SUMMARY_FIELDS for key in summary_updates):
            return None

        return {
            "summary_updates": summary_updates,
            "request_id": response.request_id,
        }
