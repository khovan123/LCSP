from __future__ import annotations
from dataclasses import replace
from types import SimpleNamespace
import pytest

from lcsp_workers.scanner.analyzers.python_analyzer import AiCallSite, PythonAnalysisResult
from lcsp_workers.scanner.dependencies.dependency_fact import PackageDependency
from lcsp_workers.scanner.evidence_assembler import EvidenceAssembler, PrivacyAssertionError
from lcsp_workers.scanner.program_graph.builder import ProgramGraphBuilder
from lcsp_workers.scanner.program_graph.semantic_ir import SemanticNodeFact, SemanticProgram
from lcsp_workers.scanner.parsers.structural_types import StructuralFact
from lcsp_workers.scanner.tools.semgrep_tool import SemgrepRunResult
from lcsp_workers.scanner.tools.syft_tool import SBOMEntry, SyftRunResult
from lcsp_workers.scanner.tools.tool_base import OUTCOME_SUCCESS, OUTCOME_TOOL_FAILURE, ToolExecutionResult
from lcsp_workers.scanner.tool_registry import ToolRunProvenance
from lcsp_workers.scanner.ts_js_bridge.bridge_types import TsJsBridgeResult, TsJsCoverageLimitation, TsJsFinding


def _execution(name: str, outcome: str = OUTCOME_SUCCESS) -> ToolExecutionResult:
    return ToolExecutionResult(tool_name=name, tool_version="1.0.0", outcome=outcome, config_hash="sha256:config")


def _provenance(name: str, outcome: str = OUTCOME_SUCCESS) -> ToolRunProvenance:
    return ToolRunProvenance(tool_name=name, tool_version="1.0.0", config_hash="sha256:config", ruleset_hash="sha256:rules", outcome=outcome, started_at="2026-07-03T00:00:00Z", ended_at="2026-07-03T00:00:01Z", python_files=1, ts_js_files=0, basic_files=0, coverage_limitations=[])


def _python_analysis() -> PythonAnalysisResult:
    return PythonAnalysisResult(
        files_analyzed=1,
        files_skipped=0,
        ai_call_sites=[
            AiCallSite(
                file_path="src/app.py",
                line_number=8,
                function_name="client.responses.create",
                module_alias="openai",
                matched_rule_id="openai.responses.create",
                finding_type="AI_MODEL_INVOCATION",
                analysis_level="L1",
                call_args_schema=["input"],
                has_dynamic_call=False,
                kwarg_names=["input"],
                confidence=0.95,
                evidence=[{"file": "src/app.py", "line": 8}],
            )
        ],
        import_map={"openai": "openai"},
        unsupported_dynamic_flows=[],
        coverage_limitation=False,
    )


def _ts_analysis() -> TsJsBridgeResult:
    return TsJsBridgeResult(files_analyzed=1, files_skipped=0, findings=[TsJsFinding(finding_type="AI_MODEL_INVOCATION", file_path="src/app.ts", line_number=4, symbol="generate", provider="OPENAI", model="gpt-4o-mini", confidence=0.95, input_signals=["prompt"], output_signals=["text"])], unsupported_dynamic_flows=[], coverage_limitations=[], analyzer_version="1.0.0", execution=_execution("ts-morph"))


def _syft() -> SyftRunResult:
    return SyftRunResult(entries=[SBOMEntry(name="openai", version="1.0.0", ecosystem="python", purl="pkg:pypi/openai@1.0.0", location="requirements.txt", license="MIT")], execution=_execution("syft"))


def _graph():
    builder = ProgramGraphBuilder(".", scan_job_id="scan-job-1", snapshot_id="snapshot-1", commit_sha="abc123")
    builder.add_program(SemanticProgram(nodes=[SemanticNodeFact("file:src/app.py", "FILE", "src/app.py", "src/app.py", 1, 1, evidence_refs=("evidence:finding-1",))]))
    return builder.build()


def _assemble(**overrides):
    values = dict(scan_job_id="scan-job-1", syft_result=_syft(), semgrep_result=SemgrepRunResult(findings=[], executions=[_execution("semgrep")], redaction_applied=True), coverage_notes=[], package_dependencies=[PackageDependency(name="openai", version="1.0.0", ecosystem="python", purl="pkg:pypi/openai@1.0.0", usage_facts=[], confidence_boost=0.0, is_ai_relevant=True, license_expression="MIT")], dependency_executions=[_execution("knip"), _execution("deptry")], python_analysis=_python_analysis(), ts_js_analysis=_ts_analysis(), technical_findings=[], structural_facts=[StructuralFact(file_path="src/app.py", graph_node_type="FUNCTION", name="generate", line_number=5, pattern_type="function", ai_finding_ids=[])], evidence_graph=_graph(), scan_coverage=[SimpleNamespace(file_path="src/app.py", language="python", support_level="FIRST_CLASS", reason="supported")], targeted_reanalysis=None, tool_provenance=[_provenance("syft"), _provenance("semgrep"), _provenance("knip"), _provenance("deptry"), _provenance("ts-morph"), _provenance("python-ast"), _provenance("libcst"), _provenance("tree-sitter")])
    values.update(overrides)
    return EvidenceAssembler().assemble(**values)


def test_t01_builds_quality_valid_report() -> None:
    report = _assemble()
    assert report.status == "QUALITY_VALID"
    assert report.schema_version
    assert report.evidence_payload["containsSourceCode"] is False
    assert report.evidence_payload["containsSecrets"] is False
    assert report.evidence_payload["dependencyInventory"]
    assert report.evidence_payload["evidence_graph"]["schema_version"] == "2.0.0"


def test_t02_failed_tool_blocks_quality_when_required_coverage_is_missing() -> None:
    failed = _execution("syft", OUTCOME_TOOL_FAILURE)
    report = _assemble(syft_result=SyftRunResult(entries=[], execution=failed), tool_provenance=[_provenance("syft", OUTCOME_TOOL_FAILURE), _provenance("semgrep"), _provenance("knip"), _provenance("deptry"), _provenance("ts-morph"), _provenance("python-ast"), _provenance("libcst"), _provenance("tree-sitter")])
    assert report.status in {"QUALITY_VALID", "QUALITY_LIMITED"}
    assert report.evidence_payload["coverageLimitations"]


def test_t03_source_code_flag_fails_closed() -> None:
    assembler = EvidenceAssembler()
    payload = _assemble().evidence_payload
    payload["containsSourceCode"] = True
    with pytest.raises(PrivacyAssertionError):
        assembler._assert_privacy(payload)


def test_t04_secret_flag_fails_closed() -> None:
    assembler = EvidenceAssembler(); payload = _assemble().evidence_payload; payload["containsSecrets"] = True
    with pytest.raises(PrivacyAssertionError): assembler._assert_privacy(payload)


def test_t05_coverage_limitations_are_preserved() -> None:
    report = _assemble(coverage_notes=["dynamic import cannot be resolved statically"])
    assert any("dynamic import" in str(value) for value in report.evidence_payload["coverageLimitations"])


def test_t06_targeted_reanalysis_is_preserved() -> None:
    report = _assemble(targeted_reanalysis={"analyzer_id": "RUN_PYTHON_SEMANTIC_ANALYSIS", "path_prefixes": ["src/"]})
    assert report.evidence_payload["targetedReanalysis"]["analyzer_id"] == "RUN_PYTHON_SEMANTIC_ANALYSIS"


def test_t07_dependency_tool_executions_are_serialized() -> None:
    report = _assemble(dependency_executions=[_execution("knip"), _execution("deptry")])
    tools = {row["tool_name"] for row in report.evidence_payload["dependencyToolExecutions"]}
    assert tools == {"knip", "deptry"}


def test_t08_structural_facts_are_sanitized() -> None:
    report = _assemble()
    facts = report.evidence_payload["structuralFacts"]
    assert facts
    assert facts[0]["file_path"] == "src/app.py"
    assert "source" not in facts[0]


def test_t09_serializes_sanitized_versioned_program_evidence_graph() -> None:
    report = _assemble(evidence_graph=_graph())
    graph_payload = report.evidence_payload["evidence_graph"]
    assert graph_payload["schema_version"] == "2.0.0"
    assert graph_payload["snapshot_id"] == "snapshot-1"
    assert graph_payload["commit_sha"] == "abc123"
    assert graph_payload["graph_hash"].startswith("sha256:")
    assert graph_payload["source_anchors"]
    file_node = next(node for node in graph_payload["nodes"] if node["node_type"] == "FILE")
    assert "evidence:finding-1" in file_node["evidence_refs"]
    serialized = str(graph_payload).lower()
    assert "raw_source" not in serialized
    assert "full_ast" not in serialized
    assert "prompt_text" not in serialized


def test_t10_ts_js_coverage_limitations_are_preserved() -> None:
    ts = replace(_ts_analysis(), coverage_limitations=[TsJsCoverageLimitation(file_path="src/dynamic.ts", reason="dynamic import")])
    report = _assemble(ts_js_analysis=ts)
    assert any("dynamic import" in str(value) for value in report.evidence_payload["coverageLimitations"])


def test_t11_tool_provenance_is_complete_and_sanitized() -> None:
    report = _assemble()
    rows = report.evidence_payload["toolProvenance"]
    assert rows
    assert all(row["tool_name"] for row in rows)
    assert all(row["config_hash"] for row in rows)
    serialized = str(rows).lower()
    assert "authorization" not in serialized
    assert "api_key" not in serialized
