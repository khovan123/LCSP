from typing import List, Dict, Any

def classify_quality(findings: List[Any], tool_provenance: List[Dict[str, Any]]) -> str:
    CRITICAL_TOOLS = {"syft", "semgrep", "python_ast"}

    critical_timeouts = {
        p["tool_name"] for p in tool_provenance
        if p.get("tool_name") in CRITICAL_TOOLS and p.get("outcome") == "timeout"
    }
    
    malformed_output = {
        p["tool_name"] for p in tool_provenance
        if p.get("outcome") == "malformed_output"
    }

    if critical_timeouts or malformed_output.intersection(CRITICAL_TOOLS):
        return "QUALITY_INSUFFICIENT"

    ai_findings = []
    for f in findings:
        f_type = f.finding_type if hasattr(f, 'finding_type') else f.get('finding_type')
        if f_type not in ("SCAN_COVERAGE_LIMITATION", "UNSUPPORTED_DYNAMIC_FLOW"):
            ai_findings.append(f)

    if len(ai_findings) == 0:
        return "QUALITY_INSUFFICIENT"

    return "QUALITY_VALID"
