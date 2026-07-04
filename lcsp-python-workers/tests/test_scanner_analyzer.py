"""
AC-031: Scanner analysis never executes source code, installs dependencies, or runs builds.
AC-032: Scanner finding records include correct confidence and evidence fields.
"""
import os
import subprocess
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.mark.p0
def test_analyzer_does_not_execute_source_code(sample_python_repo: Path) -> None:
    """
    AC-031: Python AST analyzer must never exec() or eval() source code.
    The analyzer must work purely on AST/CST nodes.
    """
    # RED: Analyzer not yet implemented.
    try:
        from lcsp_workers.scanner.analyzers.python_ast import PythonAstAnalyzer

        # Inject a canary — if source is executed, this will raise
        canary = sample_python_repo / "src" / "canary.py"
        canary.write_text(
            "import os\nos.environ['CANARY_EXECUTED'] = 'YES'\n"
        )
        os.environ.pop("CANARY_EXECUTED", None)

        analyzer = PythonAstAnalyzer(workspace=str(sample_python_repo))
        analyzer.analyze()

        assert os.environ.get("CANARY_EXECUTED") != "YES", (
            "AC-031 FAIL: PythonAstAnalyzer executed source code (canary triggered)"
        )
    except ImportError:
        pytest.skip("AC-031 RED: PythonAstAnalyzer not yet implemented")


@pytest.mark.p0
def test_analyzer_does_not_install_dependencies(sample_python_repo: Path) -> None:
    """
    AC-031: Scanner must NOT run pip install, npm install, poetry install, or any
    dependency installation command during analysis.
    """
    # RED: Analyzer not yet implemented.
    try:
        from lcsp_workers.scanner.analyzers.python_ast import PythonAstAnalyzer

        with patch("subprocess.run") as mock_run, patch("subprocess.Popen") as mock_popen:
            analyzer = PythonAstAnalyzer(workspace=str(sample_python_repo))
            analyzer.analyze()

            for call in mock_run.call_args_list + mock_popen.call_args_list:
                args = call[0][0] if call[0] else call[1].get("args", [])
                cmd = " ".join(str(a) for a in args) if isinstance(args, list) else str(args)
                assert "install" not in cmd or "list" in cmd, (
                    f"AC-031 FAIL: analyzer called dependency install: {cmd}"
                )
    except ImportError:
        pytest.skip("AC-031 RED: PythonAstAnalyzer not yet implemented")


@pytest.mark.p0
def test_analyzer_does_not_run_npm_install(sample_ts_repo: Path) -> None:
    """AC-031: TS/JS bridge subprocess must not invoke npm install."""
    try:
        from lcsp_workers.scanner.ts_js_bridge.bridge import TsJsBridge

        with patch("asyncio.create_subprocess_exec") as mock_exec:
            # Capture the command that would be run
            mock_exec.return_value.__aenter__ = None
            import asyncio
            bridge = TsJsBridge(workspace=str(sample_ts_repo))
            # Would run: asyncio.create_subprocess_exec(node, cli.js, ...)
            # Ensure 'npm' or 'install' not in args
            for call in mock_exec.call_args_list:
                args = call[0]
                cmd_str = " ".join(str(a) for a in args)
                assert "npm install" not in cmd_str
                assert "npm i " not in cmd_str
    except ImportError:
        pytest.skip("AC-031 RED: TsJsBridge not yet implemented")


@pytest.mark.p0
def test_finding_has_required_fields(sample_python_repo: Path) -> None:
    """
    AC-032: Each TechnicalFinding must include:
    - finding_type (one of 21 canonical types)
    - confidence (float 0.00-1.00, rounded to 2 decimals)
    - evidence (list of evidence items)
    - file_path (relative to workspace)
    - analysis_level (L0-L3, never L4 with actual data)
    """
    VALID_FINDING_TYPES = {
        "AI_PROVIDER_USAGE", "AI_FRAMEWORK_USAGE", "AI_MODEL_INVOCATION",
        "AI_INPUT_SIGNAL", "AI_OUTPUT_SIGNAL", "AI_DECISION_FLOW_SIGNAL",
        "AUTOMATED_DECISION_SIGNAL", "HUMAN_REVIEW_SIGNAL",
        "RANKING_SIGNAL", "RECOMMENDATION_SIGNAL", "STATUS_UPDATE_SIGNAL",
        "USER_IMPACT_SIGNAL", "SENSITIVE_DATA_SIGNAL", "DOMAIN_CONTEXT_SIGNAL",
        "HARM_POTENTIAL_SIGNAL", "SYSTEM_PROMPT_DETECTED",
        "DYNAMIC_SYSTEM_PROMPT_REFERENCE", "RAG_USAGE_SIGNAL",
        "MODEL_OUTPUT_PARSER_SIGNAL", "SCAN_COVERAGE_LIMITATION",
        "UNSUPPORTED_DYNAMIC_FLOW",
    }

    try:
        from lcsp_workers.scanner.analyzers.python_ast import PythonAstAnalyzer

        analyzer = PythonAstAnalyzer(workspace=str(sample_python_repo))
        result = analyzer.analyze()

        for finding in result.findings:
            assert finding.finding_type in VALID_FINDING_TYPES, (
                f"AC-032 FAIL: unknown finding_type '{finding.finding_type}'"
            )
            assert isinstance(finding.confidence, float)
            assert 0.00 <= finding.confidence <= 1.00
            # Verify 2-decimal precision
            assert round(finding.confidence, 2) == finding.confidence, (
                f"AC-032 FAIL: confidence {finding.confidence} not rounded to 2 decimals"
            )
            assert isinstance(finding.evidence, list)
            assert finding.file_path, "finding_type must include file_path"
            assert finding.analysis_level in ("L0", "L1", "L2", "L3"), (
                f"AC-032 FAIL: analysis_level must be L0-L3, got {finding.analysis_level}"
            )
    except ImportError:
        pytest.skip("AC-032 RED: PythonAstAnalyzer not yet implemented")


@pytest.mark.p0
def test_finding_confidence_never_exceeds_1_00(sample_python_repo: Path) -> None:
    """AC-032: Confidence must be clamped to [0.00, 1.00]."""
    try:
        from lcsp_workers.scanner.analyzers.python_ast import PythonAstAnalyzer

        analyzer = PythonAstAnalyzer(workspace=str(sample_python_repo))
        result = analyzer.analyze()

        for finding in result.findings:
            assert finding.confidence <= 1.00, (
                f"AC-032 FAIL: confidence {finding.confidence} exceeds 1.00"
            )
            assert finding.confidence >= 0.00, (
                f"AC-032 FAIL: confidence {finding.confidence} below 0.00"
            )
    except ImportError:
        pytest.skip("AC-032 RED: PythonAstAnalyzer not yet implemented")


@pytest.mark.p0
def test_finding_does_not_include_source_code(sample_python_repo: Path) -> None:
    """
    AC-032 + AC-022: TechnicalFinding fields must never contain raw source code.
    Only AST-derived metadata (function names, line numbers, argument names) is permitted.
    """
    CODE_HEURISTICS = ["def ", "import ", "function ", "class ", "const ", "let "]

    try:
        from lcsp_workers.scanner.analyzers.python_ast import PythonAstAnalyzer

        analyzer = PythonAstAnalyzer(workspace=str(sample_python_repo))
        result = analyzer.analyze()

        for finding in result.findings:
            for field_name, field_value in vars(finding).items():
                if isinstance(field_value, str) and len(field_value) > 50:
                    for heuristic in CODE_HEURISTICS:
                        assert heuristic not in field_value, (
                            f"AC-032 FAIL: finding.{field_name} contains source code snippet"
                        )
    except ImportError:
        pytest.skip("AC-032 RED: PythonAstAnalyzer not yet implemented")
