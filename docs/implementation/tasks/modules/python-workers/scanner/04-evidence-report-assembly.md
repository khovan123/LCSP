---
task_id: MW-scan-py-004
module: python-workers/scanner
runtime: lcsp-python-workers
priority: P0
status: READY_FOR_DEV
epic_story: 3.5
depends_on:
  - python-workers/scanner/02-syft-sbom-tool.md
  - python-workers/scanner/03-semgrep-ai-rules-tool.md
---

# Evidence Report Assembly and Callback

## Outcome

Assemble all scanner tool outputs into a single `TechnicalEvidenceReport` payload and submit to the NestJS API callback endpoint. Payload must include provenance metadata, privacy flags, and redacted findings. Raw source must never appear in the payload.

## Module Files

| File | Action | Notes |
|---|---|---|
| `lcsp-python-workers/src/lcsp_workers/scanner/evidence_assembler.py` | Create | Assembles tool outputs + validates privacy flags |
| `lcsp-python-workers/src/lcsp_workers/scanner/scan_consumer.py` | Modify | Orchestrate tools + assembler + callback |

## Evidence Payload Schema

```python
@dataclass
class EvidencePayload:
    schema_version: str                 # e.g., '1.0'
    tools_version: dict[str, str]       # { 'syft': '1.x.y', 'semgrep': '1.x.y' }
    config_hash: dict[str, str]         # { 'syft': 'sha256:...', 'semgrep-ai': 'sha256:...' }
    sbom_entries: list[SBOMEntry]
    ai_usage_signals: list[SemgrepFinding]
    tool_failures: list[ToolFailureRecord]
    coverage_notes: list[str]           # Business-language coverage limitations
    privacy_flags: PrivacyFlags

@dataclass
class PrivacyFlags:
    contains_source_code: bool          # Must be False
    secrets_redacted: bool              # Must be True
    source_stripped_from_findings: bool
```

## Business Rules

1. Run all tools in sequence: Syft → Semgrep → (future tools).
2. Apply `redact_source_code()` to all findings before assembly.
3. Apply `redact_dict()` to final payload.
4. Set `privacy_flags.contains_source_code = False`. Assert before callback.
5. Set `privacy_flags.secrets_redacted = True`. Assert before callback.
6. If assertion fails: abort callback, log error, transition job to `FAILED` with `PRIVACY_ASSERTION_FAILED` error code.
7. Submit to `POST /internal/scan-jobs/:scanJobId/callback` via `WorkerApiClient`.
8. If callback returns 422 `PRIVACY_FLAGS_INVALID`: log safe error. Do NOT retry with raw source.
9. Tool failures recorded in `tool_failures` list — not blocking the callback unless all tools failed.
10. Workspace cleanup runs AFTER callback (not before).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | All tools succeed | Full evidence payload submitted |
| T02 | One tool fails | `tool_failures` includes failure, callback still submitted |
| T03 | All tools fail | Callback submitted with empty findings, all failures recorded |
| T04 | `contains_source_code = True` detected | Abort, job `FAILED`, `PRIVACY_ASSERTION_FAILED` |
| T05 | Payload submitted, workspace then cleaned up | Cleanup order verified |
| T06 | Final payload has no source code | `redact_source_code()` applied |
| T07 | `privacy_flags` in callback body | NestJS API accepts payload |

## Definition of Done

- `contains_source_code = False` asserted before callback — abort if violated.
- `secrets_redacted = True` asserted before callback.
- Tool failures recorded but non-blocking (unless all tools failed with zero findings).
- Workspace cleanup runs after callback.
- `redact_dict()` + `redact_source_code()` applied to full payload.
