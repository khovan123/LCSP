import re

class PromptSafetyViolation(Exception):
    """Raised when a prompt contains forbidden patterns like source code."""
    pass

FORBIDDEN_PROMPT_PATTERNS = [
    r'def\s+\w+\s*\(',          # Python function definition
    r'function\s+\w+\s*\(',      # JS function definition
    r'class\s+\w+[:\{]',        # Class definition
    r'import\s+\w+',             # Import statement (heuristic)
    r'```[\s\S]{500,}```',       # Long code block
]

_COMPILED_PATTERNS = [re.compile(pattern) for pattern in FORBIDDEN_PROMPT_PATTERNS]

def check_prompt_safety(prompt: str) -> None:
    """
    Check prompt against forbidden patterns.
    Raises PromptSafetyViolation if any match is found.
    """
    for pattern in _COMPILED_PATTERNS:
        if pattern.search(prompt):
            raise PromptSafetyViolation("Prompt failed safety check (forbidden pattern matched).")
