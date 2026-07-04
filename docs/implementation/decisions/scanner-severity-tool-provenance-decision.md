---
status: ACTIVE_PLANNING_AUTHORITY
artifact_type: implementation_decision
decision_id: DEC-SCANNER-SEVERITY-001
owner: Scanner
resolves:
  - SCANNER_FAILURE_SEVERITY_TABLE_AND_TOOL_VERSION_CONFIG_RULESET_HASH_POLICY
---

# Scanner Severity and Tool Provenance Decision

## Decision

Scanner output eligibility is determined by a canonical severity table plus required tool provenance. A scan may complete with accepted limitations, become insufficient, retry, fail terminally, or block downstream when privacy/security cleanup fails.

## Required Tool Provenance

Every scanner run must record:

- scanner worker version;
- tool name and version;
- tool config hash;
- ruleset hash where applicable;
- start/end timestamp;
- language profile;
- repository snapshot ID and commit SHA;
- output hash for normalized safe output;
- coverage limitations;
- redaction status;
- cleanup verification status.

Missing scanner worker version, config hash, ruleset hash, report hash, or cleanup verification blocks downstream TechnicalProfile generation.

## Severity Table

| Condition | Severity | Downstream eligibility | Retry |
|---|---|---|---|
| unsupported language/tool not applicable | `ACCEPTED_WITH_LIMITATION` | eligible with coverage limitation | no |
| non-critical tool timeout with other evidence available | `ACCEPTED_WITH_LIMITATION` | eligible if quality threshold passes | optional rerun |
| critical tool timeout for required dimension | `INSUFFICIENT_EVIDENCE` | no TechnicalProfile ready | yes |
| tool crash before safe output | `RETRYABLE_FAILURE` | no downstream | yes |
| malformed tool output | `INSUFFICIENT_EVIDENCE` | no downstream until corrected/rerun | yes |
| missing config hash | `PROVENANCE_BLOCKED` | no downstream | after config fix |
| missing ruleset hash | `PROVENANCE_BLOCKED` | no downstream | after ruleset fix |
| redaction failure | `PRIVACY_BLOCKED` | no downstream | after fix/rerun |
| secret detected in output | `PRIVACY_BLOCKED` | no downstream | after fix/rerun |
| raw source persisted outside workspace | `TERMINAL_PRIVACY_FAILURE` | terminal no downstream | operator incident |
| cleanup verification failure | `CLEANUP_BLOCKED` | no completed scan event | after cleanup/retry |
| repository dependency installation attempted | `POLICY_VIOLATION` | terminal no downstream | no |
| source execution attempted | `POLICY_VIOLATION` | terminal no downstream | no |
| all required evidence groups present | `ACCEPTED` | eligible | no |

## Evidence Gate Mapping

| TechnicalEvidenceReport state | Required severity outcome |
|---|---|
| `QUALITY_VALID` | all critical dimensions `ACCEPTED` or acceptable limitations |
| `QUALITY_INSUFFICIENT` | one or more critical dimensions `INSUFFICIENT_EVIDENCE` |
| `FAILED` | privacy, cleanup, policy, or terminal scanner failure |
| `BLOCKED` | provenance fields missing or operator action required |

## User/Operator Signals

| Severity | User-facing wording class | Operator detail |
|---|---|---|
| `ACCEPTED_WITH_LIMITATION` | coverage limitation | affected tool/dimension |
| `INSUFFICIENT_EVIDENCE` | evidence insufficient | missing dimension/retry hint |
| `PROVENANCE_BLOCKED` | scanner configuration incomplete | missing hash/version |
| `PRIVACY_BLOCKED` | privacy guardrail blocked evidence | redaction/secret category |
| `CLEANUP_BLOCKED` | workspace cleanup not verified | cleanup target ref |
| `POLICY_VIOLATION` | unsupported scanner operation blocked | attempted forbidden action |

No UI, audit export, report, prompt, or document may expose raw source, secrets, full tool output bodies, or full AST bodies.

## Acceptance Evidence

| Requirement | Required evidence |
|---|---|
| FR-019 | cleanup failure blocks scan completion |
| FR-020 | invalid privacy/provenance flags reject evidence |
| FR-021 | insufficient evidence produces actionable blocked state |
| NFR-016 | scanner/tool versions and hashes persisted |
| NFR-035 | no install/build/test/source execution and cleanup verified |

## Implementation References

- `docs/specs/scanner-spec.md`
- `docs/implementation/scanner-worker-implementation.md`
- `docs/implementation/tasks/modules/python-workers/scanner/01-scanner-workspace-setup.md`
- `docs/implementation/tasks/modules/python-workers/scanner/04-evidence-report-assembly.md`

```text
SCANNER_SEVERITY_POLICY_RESOLVED
TOOL_PROVENANCE_REQUIRED
PRIVACY_FAILURE_FAILS_CLOSED
CLEANUP_VERIFICATION_BLOCKS_COMPLETION
```
