import re
from collections.abc import Mapping, Sequence
from typing import Any

REDACTED_VALUE = "[REDACTED]"
REDACTED_GITHUB_TOKEN = "[REDACTED:GITHUB_TOKEN]"
REDACTED_MAX_DEPTH = "[REDACTED:MAX_DEPTH]"

SENSITIVE_KEY_PATTERN = re.compile(
    r"password|token|secret|key|nonce|code|hash|credential|auth|api_key",
    re.IGNORECASE,
)

GITHUB_TOKEN_PATTERN = re.compile(r"ghp_[A-Za-z0-9]{36}")
BEARER_TOKEN_PATTERN = re.compile(r"\bBearer\s+[A-Za-z0-9._-]+")
GENERIC_ASSIGNMENT_PATTERN = re.compile(
    r"\b(?P<key>api_key|key|token|secret|password|credential|auth)"
    r"(?P<sep>\s*[:=]\s*)"
    r"(?P<quote>['\"]?)"
    r"(?P<value>[A-Za-z0-9._~+/=-]{12,})"
    r"(?P=quote)",
    re.IGNORECASE,
)
AWS_ACCESS_KEY_PATTERN = re.compile(r"\bAKIA[0-9A-Z]{16}\b")
ANTHROPIC_KEY_PATTERN = re.compile(r"\bsk-ant-[A-Za-z0-9._-]+\b")


def redact_dict(obj: dict, depth: int = 10) -> dict:
    """Recursively redact sensitive keys and string values from a dict."""
    return _redact_mapping(obj, max(depth, 0), set())


def redact_string(text: str) -> str:
    """Redact known secret patterns from free text."""
    redacted = GITHUB_TOKEN_PATTERN.sub(REDACTED_GITHUB_TOKEN, text)
    redacted = BEARER_TOKEN_PATTERN.sub("Bearer [REDACTED]", redacted)
    redacted = AWS_ACCESS_KEY_PATTERN.sub("[REDACTED:AWS_ACCESS_KEY]", redacted)
    redacted = ANTHROPIC_KEY_PATTERN.sub("[REDACTED:ANTHROPIC_KEY]", redacted)
    return GENERIC_ASSIGNMENT_PATTERN.sub(_redact_assignment, redacted)


def redact_source_code(findings: list[dict]) -> list[dict]:
    """Remove findings that contain raw source code according to a small heuristic."""
    redacted_findings: list[dict] = []
    for finding in findings:
        if _contains_source_code(finding):
            continue
        redacted_findings.append(redact_dict(finding))
    return redacted_findings


def _redact_mapping(obj: Mapping[Any, Any], depth: int, seen: set[int]) -> Any:
    if depth <= 0:
        return REDACTED_MAX_DEPTH

    obj_id = id(obj)
    if obj_id in seen:
        return REDACTED_MAX_DEPTH

    seen.add(obj_id)
    redacted: dict[Any, Any] = {}
    try:
        for key, value in obj.items():
            key_text = str(key)
            if SENSITIVE_KEY_PATTERN.search(key_text):
                redacted[key] = REDACTED_VALUE
            else:
                redacted[key] = _redact_value(value, depth - 1, seen)
    finally:
        seen.remove(obj_id)

    return redacted


def _redact_value(value: Any, depth: int, seen: set[int]) -> Any:
    if isinstance(value, str):
        return redact_string(value)

    if isinstance(value, Mapping):
        return _redact_mapping(value, depth, seen)

    if isinstance(value, tuple):
        return tuple(_redact_value(item, depth, seen) for item in value)

    if isinstance(value, list):
        if depth <= 0:
            return REDACTED_MAX_DEPTH
        return [_redact_value(item, depth - 1, seen) for item in value]

    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray)):
        if depth <= 0:
            return REDACTED_MAX_DEPTH
        return [_redact_value(item, depth - 1, seen) for item in value]

    return value


def _redact_assignment(match: re.Match[str]) -> str:
    return f"{match.group('key')}{match.group('sep')}{REDACTED_VALUE}"


def _contains_source_code(value: Any) -> bool:
    if isinstance(value, str):
        return _looks_like_source_code(value)

    if isinstance(value, Mapping):
        return any(_contains_source_code(item) for item in value.values())

    if isinstance(value, Sequence) and not isinstance(value, (bytes, bytearray, str)):
        return any(_contains_source_code(item) for item in value)

    return False


def _looks_like_source_code(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False

    score = 0
    if re.search(r"\bdef\s+\w+\s*\(", normalized):
        score += 2
    if re.search(r"\bfunction\s+\w*\s*\(", normalized):
        score += 2
    if re.search(r"\bimport\s+[\w{*]", normalized):
        score += 1
    if re.search(r"\b(from\s+\w+(?:\.\w+)*\s+import|class\s+\w+)", normalized):
        score += 1
    if re.search(r"\b(const|let|var)\s+\w+\s*=", normalized):
        score += 1
    if "=>" in normalized:
        score += 1
    if normalized.count("{") + normalized.count("}") >= 2:
        score += 1
    if ";" in normalized and ("\n" in normalized or "{" in normalized):
        score += 1

    return score >= 2
