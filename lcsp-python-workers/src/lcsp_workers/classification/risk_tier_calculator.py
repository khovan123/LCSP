from typing import Dict, List, Tuple

def calculate_risk_tier(matches: List[Dict]) -> Tuple[str, str, str]:
    """
    Calculate risk_level, applicability_assessment, and citation_coverage deterministically.
    Never uses an LLM.
    
    Args:
        matches: List of dicts representing LegalRuleMatch.
            Expects keys: 'status', 'confidence', 'coverage_status'.
            
    Returns:
        tuple: (risk_level, applicability_assessment, citation_coverage)
    """
    if not matches:
        return "LOW", "not_applicable", "NO_CITATION"
        
    applicability = "applicable"
    
    # Calculate aggregate citation coverage
    coverages = [m.get("coverage_status", "NO_CITATION") for m in matches]
    if all(c == "COMPLETE_CITATION" for c in coverages):
        overall_coverage = "COMPLETE_CITATION"
    elif all(c == "NO_CITATION" for c in coverages):
        overall_coverage = "NO_CITATION"
    else:
        overall_coverage = "PARTIAL_CITATION"
        
    # Calculate Risk Level deterministically
    # Simple logic based on confidence and coverage for now
    max_confidence = max([m.get("confidence", 0.0) for m in matches], default=0.0)
    
    if overall_coverage == "NO_CITATION":
        # Missing citations block or degrade classification
        risk_level = "BLOCKED"
    elif overall_coverage == "PARTIAL_CITATION":
        risk_level = "HIGH"
        applicability = "partially_applicable"
    else:
        if max_confidence > 0.8:
            risk_level = "HIGH"
        elif max_confidence > 0.5:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

    return risk_level, applicability, overall_coverage
