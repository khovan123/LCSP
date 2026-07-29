def map_severity(condition: str) -> str:
    mapper = {
        "unsupported_language": "ACCEPTED_WITH_LIMITATION",
        "non_critical_timeout": "ACCEPTED_WITH_LIMITATION",
        "critical_timeout": "INSUFFICIENT_EVIDENCE",
        "tool_crash": "RETRYABLE_FAILURE",
        "malformed_output": "INSUFFICIENT_EVIDENCE",
        "missing_config_hash": "PROVENANCE_BLOCKED",
        "missing_ruleset_hash": "PROVENANCE_BLOCKED",
        "redaction_failure": "PRIVACY_BLOCKED",
        "secret_detected": "PRIVACY_BLOCKED",
        "raw_source_persisted": "TERMINAL_PRIVACY_FAILURE",
        "cleanup_failure": "CLEANUP_BLOCKED",
        "dependency_installation_attempted": "POLICY_VIOLATION",
        "source_execution_attempted": "POLICY_VIOLATION",
        "all_evidence_present": "ACCEPTED"
    }
    return mapper.get(condition, "UNKNOWN")
