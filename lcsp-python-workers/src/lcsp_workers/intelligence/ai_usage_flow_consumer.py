from __future__ import annotations

from typing import Any

from structlog import get_logger

from lcsp_workers.platform.api_client import WorkerApiClient
from lcsp_workers.platform.callback_schemas import AIUsageFlowCallbackPayload
from lcsp_workers.platform.queue_consumer import ConsumerBase

from .ai_usage_flow_rule_engine import AIUsageFlowRuleEngine


logger = get_logger(__name__)


class AIUsageFlowConsumer(ConsumerBase):
    queue_name = "intelligence.technical-profile-ready"
    routing_key = "technical-profile-ready"
    requires_pbac = False

    def __init__(
        self,
        config,
        pbac_client=None,
        api_client: WorkerApiClient | None = None,
        rule_engine: AIUsageFlowRuleEngine | None = None,
    ) -> None:
        super().__init__(config, pbac_client)
        self._api_client = api_client or WorkerApiClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )
        self._rule_engine = rule_engine or AIUsageFlowRuleEngine()

    def handle(self, message: dict, correlation_id: str) -> None:
        technical_profile_id = self._required_message_id(message, "technicalProfileId")
        assessment_id = self._required_message_id(message, "assessmentId")
        technical_profile = self._api_client.get_accepted_technical_profile(
            technical_profile_id
        )
        evidence_report_id = (
            message.get("evidenceReportId")
            or message.get("evidence_report_id")
            or technical_profile.get("evidence_report_id")
            or technical_profile.get("evidenceReportId")
        )
        if not evidence_report_id:
            raise ValueError("missing evidenceReportId")
        evidence_report = self._api_client.get_accepted_technical_evidence_report(
            str(evidence_report_id)
        )
        wizard_profile = self._api_client.get_wizard_profile_for_assessment(
            assessment_id
        )
        flow = self._rule_engine.generate(
            technical_profile=technical_profile,
            evidence_report=evidence_report,
            wizard_profile=wizard_profile,
        )
        callback_payload = AIUsageFlowCallbackPayload(
            technical_profile_id=flow.technical_profile_id,
            assessment_id=flow.assessment_id,
            schema_version=flow.schema_version,
            provider_version=flow.provider_version,
            claims=[claim.to_dict() for claim in flow.claims],
            unknown_usages=[
                {"reason": reason} for reason in flow.uncertainty_reasons
            ],
            privacy_flags=flow.privacy_flags,
            flow_data=flow.to_dict(),
        )
        if callback_payload.privacy_flags.get("containsSourceCode") is not False:
            raise ValueError("AIUsageFlow callback privacy flag is unsafe")
        self._api_client.post_ai_usage_flow_callback(callback_payload)
        logger.info(
            "AI_USAGE_FLOW_CALLBACK_SUBMITTED",
            technical_profile_id=flow.technical_profile_id,
            assessment_id=flow.assessment_id,
            status=flow.status,
            correlation_id=correlation_id,
        )

    def _required_message_id(self, message: dict[str, Any], key: str) -> str:
        snake_key = key[0].lower() + "".join(
            f"_{char.lower()}" if char.isupper() else char for char in key[1:]
        )
        value = message.get(key) or message.get(snake_key)
        if not value:
            raise ValueError(f"missing {key}")
        return str(value)
