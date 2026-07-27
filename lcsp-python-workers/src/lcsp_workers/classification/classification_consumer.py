import requests
from lcsp_workers.platform.queue_consumer import ConsumerBase
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.llm.gateway_client import LLMGatewayClient

from .risk_tier_calculator import calculate_risk_tier
from .citation_guardrail import check_citations
from .overclaim_detector import check_overclaim
from .rationale_narrator import RationaleNarrator

logger = get_logger(__name__)

class ClassificationConsumer(ConsumerBase):
    queue_name = "classification.legal-rule-match-ready"
    routing_key = "legal-rule-match-ready"
    requires_pbac = False  # System event

    def __init__(self, config, llm_client: LLMGatewayClient = None):
        super().__init__(config)
        # Using the provided LLMGatewayClient or instantiating a new one if allowed
        self.llm_client = llm_client
        self.narrator = RationaleNarrator(llm_client) if llm_client else None

    def handle(self, message: dict, correlation_id: str) -> None:
        """
        Handle legal-rule-match-ready event.
        """
        logger.info("PROCESSING_CLASSIFICATION", correlation_id=correlation_id)
        
        classification_version = message.get("classification_version", "1.0")
        usage_claims = message.get("usage_claims", [])
        applicable_rules = message.get("applicable_rules", [])
        citation_allowlist = message.get("citation_allowlist", [])
        
        # Extract all citation refs from matches
        citation_refs = []
        for rule in applicable_rules:
            refs = rule.get("citation_chunk_ids", [])
            citation_refs.extend(refs)
            
        # 1. Citation Guardrail
        guardrail_status, guardrail_reason = check_citations(
            citation_refs=citation_refs,
            citation_allowlist=citation_allowlist
        )
        
        if guardrail_status == "blocked":
            logger.warning("CLASSIFICATION_BLOCKED", reason=guardrail_reason)
            self._submit_callback({
                "classification_version": classification_version,
                "usage_claims": usage_claims,
                "applicable_rules": applicable_rules,
                "risk_level": "BLOCKED",
                "applicability_assessment": "not_applicable",
                "citation_refs": citation_refs,
                "citation_coverage": "NO_CITATION",
                "rationale": None,
                "guardrail_status": guardrail_status,
                "guardrail_reason": guardrail_reason
            })
            return

        # 2. Deterministic Risk Tier Calculation
        risk_level, applicability_assessment, citation_coverage = calculate_risk_tier(applicable_rules)
        
        # 3. LLM Rationale Draft (Optional)
        rationale = None
        if self.narrator:
            rationale_draft = self.narrator.generate_rationale(
                usage_claims=usage_claims,
                applicable_rules=applicable_rules,
                risk_level=risk_level,
                applicability_assessment=applicability_assessment
            )
            
            # 4. Overclaim Detection
            if rationale_draft:
                has_overclaim = check_overclaim(rationale_draft)
                if has_overclaim:
                    logger.warning("OVERCLAIM_DETECTED", msg="Rationale rejected due to overclaiming words")
                    guardrail_status = "blocked"
                    guardrail_reason = "Rationale contains overclaiming terms"
                    rationale = None
                else:
                    rationale = rationale_draft

        # 5. Submit to Callback
        payload = {
            "classification_version": classification_version,
            "usage_claims": usage_claims,
            "applicable_rules": applicable_rules,
            "risk_level": risk_level,
            "applicability_assessment": applicability_assessment,
            "citation_refs": citation_refs,
            "citation_coverage": citation_coverage,
            "rationale": rationale,
            "guardrail_status": guardrail_status,
            "guardrail_reason": guardrail_reason
        }
        
        self._submit_callback(payload)

    def _submit_callback(self, payload: dict) -> None:
        """
        Submit results to NestJS API callback.
        """
        # Assuming internal API URL is provided in config
        # url = f"{self._config.internal_api_url}/internal/classification/result-callback"
        url = "http://localhost:3000/internal/classification/result-callback"
        
        logger.info("SUBMITTING_CLASSIFICATION_RESULT", payload_keys=list(payload.keys()))
        try:
            response = requests.post(url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("CLASSIFICATION_RESULT_SUBMITTED_SUCCESS")
        except requests.RequestException as e:
            logger.error("CLASSIFICATION_RESULT_SUBMIT_FAILED", error=str(e))
            raise
