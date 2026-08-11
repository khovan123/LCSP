from __future__ import annotations


CLAIM_CATEGORY_BASE = {
    "MODEL_PROVIDER_USAGE": 0.35,
    "MODEL_INVOCATION": 0.70,
    "AI_GENERATED_OUTPUT": 0.65,
    "DOWNSTREAM_ACTION": 0.70,
    "AUTOMATED_DECISION": 0.80,
    "HUMAN_REVIEW": 0.70,
    "PROMPT_STORAGE": 0.55,
    "PERSONAL_DATA_INPUT": 0.60,
    "TRAINING_ACTIVITY": 0.60,
    "RAG_USAGE": 0.65,
    "DOCUMENT_GENERATION": 0.65,
    "CONTENT_LABELING": 0.60,
    "HUMAN_OVERSIGHT_CONTROL": 0.65,
    "AI_INTERACTION_DISCLOSURE": 0.60,
    "INCIDENT_HANDLING": 0.55,
}


def calculate_claim_confidence(
    claim_category: str,
    required_evidence_present: bool,
    optional_signal_count: int,
    material_coverage_limitations: int,
    has_wizard_conflict: bool,
    missing_required_evidence_class: bool,
) -> tuple[float, dict[str, float]]:
    base = CLAIM_CATEGORY_BASE[claim_category]
    d_bonus = 0.10 if required_evidence_present else 0.0
    o_bonus = min(optional_signal_count * 0.05, 0.10)
    c_penalty = min(material_coverage_limitations * 0.15, 0.30)
    k_penalty = 0.20 if has_wizard_conflict else 0.0
    m_penalty = 0.35 if missing_required_evidence_class else 0.0
    raw = base + d_bonus + o_bonus - c_penalty - k_penalty - m_penalty
    confidence = max(0.00, min(1.00, raw))
    return round(confidence, 2), {
        "base": base,
        "D": d_bonus,
        "O": o_bonus,
        "C": c_penalty,
        "K": k_penalty,
        "M": m_penalty,
    }


def lifecycle_for_confidence(
    confidence: float,
    *,
    has_conflict: bool = False,
    missing_evidence_ref: bool = False,
) -> str:
    if missing_evidence_ref:
        return "REJECTED"
    if has_conflict:
        return "CONFLICTED"
    if confidence < 0.40:
        return "ABSTAINED"
    if confidence < 0.65:
        return "DETECTED"
    return "VALIDATED"
