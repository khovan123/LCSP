import requests
from lcsp_workers.platform.queue_consumer import ConsumerBase
from lcsp_workers.platform.logging import get_logger
from lcsp_workers.llm.gateway_client import LLMGatewayClient

from .classification_graph import ClassificationGraph
from .classification_proposer import ModelAssistedClassificationProposer
from .rationale_narrator import RationaleNarrator

logger = get_logger(__name__)

class ClassificationConsumer(ConsumerBase):
    queue_name = "classification.legal-rule-match-ready"
    routing_key = "legal-rule-match-ready"
    requires_pbac = False  # System event

    def __init__(self, config, llm_client: LLMGatewayClient = None):
        super().__init__(config)
        self.graph = ClassificationGraph(
            proposer=ModelAssistedClassificationProposer(llm_client) if llm_client else None,
            narrator=RationaleNarrator(llm_client) if llm_client else None,
            logger=logger,
        )

    def handle(self, message: dict, correlation_id: str) -> None:
        """
        Handle legal-rule-match-ready event.
        """
        logger.info("PROCESSING_CLASSIFICATION", correlation_id=correlation_id)
        
        result = self.graph.run(message=message, correlation_id=correlation_id)
        self._submit_callback(result.payload)

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
