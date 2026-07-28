import pytest
from unittest.mock import MagicMock, patch
from lcsp_workers.reporting.gap_analysis_generator import GapAnalysisGenerator
from lcsp_workers.reporting.output_guardrail import OutputGuardrail
from lcsp_workers.reporting.gap_analysis_consumer import GapAnalysisConsumer

def test_t01_valid_result_ready():
    """T01: Valid classification result -> READY"""
    consumer = GapAnalysisConsumer(config=MagicMock())
    
    with patch.object(consumer, '_submit_callback') as mock_submit:
        with patch('lcsp_workers.reporting.gap_analysis_consumer.StorageUploader.upload_document', return_value="https://url"):
            message = {
                "document_id": "doc123",
                "assessment_name": "Test Assessment"
            }
            consumer.handle(message, "corr-id")
            
            mock_submit.assert_called_once()
            args = mock_submit.call_args[0]
            assert args[0] == "doc123"
            assert args[1]["status"] == "READY"
            assert args[1]["document_url"] == "https://url"

def test_t02_content_contains_certified():
    """T02: Content contains 'certified' -> BLOCKED"""
    assert OutputGuardrail.check("This is certified.") == True
    
    consumer = GapAnalysisConsumer(config=MagicMock())
    with patch.object(consumer, '_submit_callback') as mock_submit:
        # Mock generator to return bad text
        with patch('lcsp_workers.reporting.gap_analysis_consumer.GapAnalysisGenerator.generate', return_value="We are certified."):
            consumer.handle({"document_id": "doc123"}, "corr-id")
            
            mock_submit.assert_called_once()
            args = mock_submit.call_args[0]
            assert args[1]["status"] == "BLOCKED"

def test_t03_no_raw_source_code():
    """T03: No raw source code in document"""
    content = GapAnalysisGenerator.generate("Name", "Ctx", ["ev1"], [], [], [], [])
    assert "class " not in content
    assert "def " not in content

def test_t04_upload_fails():
    """T04: Upload fails -> FAILED"""
    consumer = GapAnalysisConsumer(config=MagicMock())
    
    with patch.object(consumer, '_submit_callback') as mock_submit:
        with patch('lcsp_workers.reporting.gap_analysis_consumer.StorageUploader.upload_document', side_effect=Exception("S3 Error")):
            consumer.handle({"document_id": "doc123"}, "corr-id")
            
            mock_submit.assert_called_once()
            args = mock_submit.call_args[0]
            assert args[1]["status"] == "FAILED"
            assert "S3 Error" in args[1]["blocked_reason"]

def test_t05_title_inspection():
    """T05: Document title has no risk labels"""
    content = GapAnalysisGenerator.generate("Name", "Ctx", [], [], [], [], [])
    lines = content.split('\n')
    assert "Title: Gap Analysis" in lines[0]
    assert "Label: Wizard Readiness and Legal Gap Analysis" in lines[1]
    assert "certified" not in lines[0].lower()
    assert "compliant" not in lines[1].lower()

def test_t06_no_llm_calls():
    """T06: No LLM calls -> Confirmed by lack of any LLM Client in signature."""
    import inspect
    sig = inspect.signature(GapAnalysisGenerator.generate)
    assert 'llm_client' not in sig.parameters
