"""Legal corpus, vectorless retrieval, and official-source runtime boundaries."""

from .retrieval.chromadb_citation_retriever import ChromaDbCitationRetriever, RetrievedChunk
from .retrieval.legal_match_builder import LegalMatchBuilder
from .retrieval.rule_applicability_evaluator import RuleApplicabilityEvaluator, RuleEvaluationResult
from .sources.official_text_extraction import (
    OfficialSourceSnapshotResolver,
    OfficialTextExtractor,
    OfficialTextExtractionRequest,
    OfficialTextExtractionResult,
)
from .sources.official_text_extraction_repository import (
    OfficialTextExtractionRecord,
    OfficialTextExtractionRepository,
)
from .sources.ocr_fallback import OcrFallbackRequest, OcrFallbackResult, OcrFallbackTool
from .sources.ocr_fallback_boundary import OcrFallbackBoundary
from .sources.ocr_fallback_repository import (
    OcrFallbackConflictError,
    OcrFallbackRecord,
    OcrFallbackRepository,
)
from .sources.ocr_quality_boundary import OcrQualityBoundary
from .sources.ocr_quality_repository import OcrQualityRecord, OcrQualityRepository
from .sources.ocr_quality_validator import EvaluateOcrQualityRequest, OcrQualityValidator
from .sources.official_text_extraction_boundary import OfficialTextExtractionBoundary
from .sources.vbpl_effected_chunk_set_boundary import VbplEffectedChunkSetBoundary

__all__ = [
    "RuleApplicabilityEvaluator",
    "RuleEvaluationResult",
    "ChromaDbCitationRetriever",
    "RetrievedChunk",
    "LegalMatchBuilder",
    "OfficialSourceSnapshotResolver",
    "OfficialTextExtractor",
    "OfficialTextExtractionRequest",
    "OfficialTextExtractionResult",
    "OfficialTextExtractionRecord",
    "OfficialTextExtractionRepository",
    "OcrFallbackRequest",
    "OcrFallbackResult",
    "OcrFallbackTool",
    "OcrFallbackBoundary",
    "OcrFallbackConflictError",
    "OcrFallbackRecord",
    "OcrFallbackRepository",
    "EvaluateOcrQualityRequest",
    "OcrQualityValidator",
    "OcrQualityBoundary",
    "OcrQualityRecord",
    "OcrQualityRepository",
    "OfficialTextExtractionBoundary",
    "VbplEffectedChunkSetBoundary",
]
