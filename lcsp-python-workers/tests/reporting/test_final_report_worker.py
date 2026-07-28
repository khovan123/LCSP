import pytest
from unittest.mock import MagicMock, patch
from lcsp_workers.reporting.final_report_generator import FinalReportGenerator
from lcsp_workers.reporting.final_report_consumer import FinalReportConsumer
from lcsp_workers.reporting.output_guardrail import OutputGuardrail

def test_t01_classification_guardrail_passed():
    """T01: guardrailStatus = passed -> Report generated"""
    mock_llm = MagicMock()
    mock_llm.complete.return_value = MagicMock(content="Summary of system.")
    
    consumer = FinalReportConsumer(config=MagicMock(), llm_client=mock_llm)
    
    with patch.object(consumer, '_submit_callback') as mock_submit:
        with patch('lcsp_workers.reporting.final_report_consumer.StorageUploader.upload_document', return_value="https://url"):
            message = {
                "document_id": "doc123",
                "guardrailStatus": "passed",
                "assessment_name": "Test Assessment"
            }
            consumer.handle(message, "corr-id")
            
            mock_submit.assert_called_once()
            args = mock_submit.call_args[0]
            assert args[0] == "doc123"
            assert args[1]["status"] == "READY"
            assert args[1]["document_url"] == "https://url"

def test_t02_report_contains_certified():
    """T02: Report contains 'certified' -> BLOCKED"""
    mock_llm = MagicMock()
    mock_llm.complete.return_value = MagicMock(content="The system is certified.")
    
    consumer = FinalReportConsumer(config=MagicMock(), llm_client=mock_llm)
    
    with patch.object(consumer, '_submit_callback') as mock_submit:
        consumer.handle({"document_id": "doc123", "guardrailStatus": "passed"}, "corr-id")
        
        mock_submit.assert_called_once()
        args = mock_submit.call_args[0]
        assert args[1]["status"] == "BLOCKED"
        assert "overclaiming" in args[1]["blocked_reason"]

def test_t03_prompt_safety_violation():
    """T03: LLM prompt contains source code -> PromptSafetyViolation"""
    class PromptSafetyViolation(Exception):
        pass
        
    mock_llm = MagicMock()
    mock_llm.complete.side_effect = PromptSafetyViolation("Raw source code in prompt")
    
    consumer = FinalReportConsumer(config=MagicMock(), llm_client=mock_llm)
    
    with patch.object(consumer, '_submit_callback') as mock_submit:
        consumer.handle({"document_id": "doc123", "guardrailStatus": "passed"}, "corr-id")
        
        mock_submit.assert_called_once()
        args = mock_submit.call_args[0]
        assert args[1]["status"] == "FAILED"
        assert "Raw source code in prompt" in args[1]["blocked_reason"]

def test_t04_budget_exceeded():
    """T04: Budget exceeded -> BudgetExceeded, status = FAILED"""
    class BudgetExceeded(Exception):
        pass
        
    mock_llm = MagicMock()
    mock_llm.complete.side_effect = BudgetExceeded("Monthly cap reached")
    
    consumer = FinalReportConsumer(config=MagicMock(), llm_client=mock_llm)
    
    with patch.object(consumer, '_submit_callback') as mock_submit:
        consumer.handle({"document_id": "doc123", "guardrailStatus": "passed"}, "corr-id")
        
        mock_submit.assert_called_once()
        args = mock_submit.call_args[0]
        assert args[1]["status"] == "FAILED"
        assert "Monthly cap reached" in args[1]["blocked_reason"]

def test_t05_citation_references():
    """T05: Report has citation references -> Citations traceable to chunk IDs"""
    mock_llm = MagicMock()
    mock_llm.complete.return_value = MagicMock(content="Summary.")
    
    generator = FinalReportGenerator(mock_llm)
    content = generator.generate(
        assessment_name="Test",
        assessment_context="Ctx",
        technical_evidence=[],
        verified_ai_usage=[],
        legal_rule_applicability=[],
        citations=["chunk-1::art-2", "chunk-5::art-9"],
        limitations="",
        evidence_provenance=""
    )
    
    assert "chunk-1::art-2" in content
    assert "chunk-5::art-9" in content
