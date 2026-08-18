"""Detect narrative overclaims while allowing canonical machine status labels."""

import re

OVERCLAIM_WORDS = [
    r"certified",
    r"validated",
    r"compliant",
    r"non-compliant",
    r"approved",
    r"production\s+ready",
]

CANONICAL_STATUS_TOKENS = (
    "NON_COMPLIANT",
    "COMPLIANT",
    "UNKNOWN",
)


class OutputGuardrail:
    """Stateless reporting guardrail for certainty/compliance overclaims."""

    @staticmethod
    def check(content: str) -> bool:
        if not content:
            return False

        normalized = content
        for token in CANONICAL_STATUS_TOKENS:
            normalized = normalized.replace(token, "ENGINEERING_RULE_STATUS")

        text_lower = normalized.lower()
        for pattern in OVERCLAIM_WORDS:
            if re.search(pattern, text_lower):
                return True

        return False
