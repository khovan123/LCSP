import re

OVERCLAIM_WORDS = [
    r"certified",
    r"validated",
    r"compliant",
    r"non-compliant",
    r"approved",
    r"production\s+ready"
]

class OutputGuardrail:
    @staticmethod
    def check(content: str) -> bool:
        """
        Check if the content contains any overclaiming words.
        Returns False if safe (no overclaim), True if overclaim is detected.
        """
        if not content:
            return False
            
        text_lower = content.lower()
        for pattern in OVERCLAIM_WORDS:
            if re.search(pattern, text_lower):
                return True
                
        return False
