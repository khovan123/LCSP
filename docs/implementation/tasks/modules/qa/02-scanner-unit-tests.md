---
task_id: MW-qa-002
module: qa
runtime: lcsp-python-workers
priority: P0
status: READY_FOR_DEV
epic_story: 3.5
depends_on:
  - python-workers/scanner/04-evidence-report-assembly.md
---

# Python Scanner Unit Tests

## Outcome

Unit tests for all scanner tool wrappers, workspace setup, evidence assembly, and redaction utilities. Use fixtures for tool outputs — no actual Syft/Semgrep execution in unit tests.

## Module Files

| File | Action | Notes |
|---|---|---|
| `tests/workers/scanner/test_workspace.py` | Create | Workspace setup/cleanup + size limits |
| `tests/workers/scanner/test_syft_tool.py` | Create | SBOM parsing + path stripping |
| `tests/workers/scanner/test_semgrep_tool.py` | Create | Finding parsing + source stripping |
| `tests/workers/scanner/test_evidence_assembler.py` | Create | Privacy flag assertion |
| `tests/workers/platform/test_redaction.py` | Create | All redaction utility functions |

## Critical Assertions

- `contains_source_code = False` always asserted before callback
- Absolute paths stripped from findings
- `extra.lines` stripped from Semgrep findings
- GitHub token pattern detected and redacted
- `redact_dict()` recursive up to depth 10

## Definition of Done

- All scanner tool functions covered by unit tests with fixtures.
- Privacy flag assertions tested for abort path.
- Redaction utilities fully unit-tested.
