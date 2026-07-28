import re

OVERCLAIM_WORDS = [
    r"certified",
    r"validated",
    r"approved",
    r"compliant",
    r"non-compliant",
    r"production\s+ready",
    r"legally\s+approved"
]

def check_overclaim(rationale_text: str) -> bool:
    """
    Check if the rationale text contains any overclaiming words.
    
    Returns:
        bool: True if an overclaim word is detected, False otherwise.
    """
    if not rationale_text:
        return False
        
    text_lower = rationale_text.lower()
    for pattern in OVERCLAIM_WORDS:
        if re.search(pattern, text_lower):
            return True
            
    return False
