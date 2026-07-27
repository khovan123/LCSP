from __future__ import annotations

from pathlib import Path

from lcsp_workers.scanner.evidence_assembler import EvidenceAssembler
from lcsp_workers.scanner.parsers.structural_augmentor import StructuralAugmentor
from lcsp_workers.scanner.parsers.tree_sitter_parser import StructuralParser
from lcsp_workers.scanner.tools.semgrep_tool import SemgrepFinding, SemgrepRunResult
from lcsp_workers.scanner.tools.tool_base import OUTCOME_SUCCESS, ToolExecutionResult


def _semgrep_result() -> SemgrepRunResult:
    return SemgrepRunResult(
        findings=[
            SemgrepFinding(
                rule_id="lcsp.openai-client",
                signal_type="provider_integration",
                file_path="src/ai.py",
                line_start=3,
                line_end=3,
                message="OpenAI client import detected",
                severity="INFO",
            )
        ],
        executions=[
            ToolExecutionResult(
                tool_name="semgrep_ai_usage",
                tool_version="semgrep 1.99.0",
                outcome=OUTCOME_SUCCESS,
                config_hash="sha256:semgrep-ai",
                messages=[],
            )
        ],
        redaction_applied=False,
    )


def test_structural_parser_falls_back_to_regex_for_route_and_async_patterns(tmp_path: Path) -> None:
    file_path = tmp_path / "src" / "ai.py"
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(
        "@router.get('/predict')\n"
        "async def predict(request):\n"
        "    return client.chat.completions.create(messages=[...] )\n",
        encoding="utf-8",
    )

    facts = StructuralParser().parse_file(file_path)
    assert any(fact.pattern_type == "route_handler" for fact in facts)
    assert any(fact.pattern_type == "async_ai_function" for fact in facts)
    assert all(fact.parse_source == "custom_regex_fallback" for fact in facts)


def test_structural_augmentor_links_facts_to_existing_findings(tmp_path: Path) -> None:
    workspace = tmp_path / "workspace"
    workspace.mkdir(parents=True, exist_ok=True)
    target = workspace / "src" / "ai.py"
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(
        "@router.get('/predict')\n"
        "async def predict(request):\n"
        "    return client.chat.completions.create(messages=[...])\n",
        encoding="utf-8",
    )

    augmentor = StructuralAugmentor(workspace_path=str(workspace))
    facts = augmentor.augment(
        files=["src/ai.py"],
        finding_ids=["finding-1"],
    )

    assert len(facts) >= 2
    assert facts[0].ai_finding_ids == ["finding-1"]

    payload = EvidenceAssembler().assemble(
        scan_job_id="scan-job-1",
        syft_result=None,  # type: ignore[arg-type]
        semgrep_result=_semgrep_result(),
        coverage_notes=[],
        structural_facts=facts,
    )

    assert payload.evidence_payload["structural_facts"][0]["pattern_type"] == "route_handler"
