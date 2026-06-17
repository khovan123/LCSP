# Failure Mode and Recovery Test Design

## Purpose

Define failure injection and recovery acceptance design for LCSP. This is documentation only and does not create executable failure tests.

## Scope

Covers authentication, GitHub App, scanner, evidence gates, queue, worker, RAG, LLM, object storage, document rendering and audit failures.

## Failure Matrix

| Failure mode | Injection method | Expected automatic behavior | Required user-visible behavior | Audit/alert evidence | Recovery acceptance condition |
| --- | --- | --- | --- | --- | --- |
| OAuth provider unavailable | Fake provider timeout/unreachable | Login start/callback fails closed | Login temporarily unavailable | auth outage metric/alert | Provider restored; login succeeds |
| OAuth callback invalid | Invalid state/nonce/redirect/issuer | Reject callback | Login failed safely | callback validation failure audit | Valid callback still works |
| GitHub App authorization failure | Invalid installation/token/ref | Block repository scan | Repo access issue shown | GitHub access denied audit | Reconnect or valid token enables scan |
| Repository unavailable | Missing repo/branch/commit | Scan not queued or fails safely | Repository unavailable | scan blocked/failed audit | Valid repo/commit can scan |
| Clone failure | Simulated clone/network error | Retry if transient then fail | Scan failed/retryable | clone failure audit | Retry succeeds or blocked reason persists |
| Scanner timeout | Worker timeout | Cancel/fail job, cleanup workspace | Scan timed out | timeout + cleanup audit | New scan can run without retained source |
| Scanner crash | Worker process failure | Resume/retry from checkpoint or fail closed | Scan failed/delayed | worker crash audit | Workflow state consistent |
| Scanner finds unsupported dynamic flow | Fixture with dynamic import/queue break | Emit limitation/unknown | Usage needs clarification | coverage limitation audit | Classification remains blocked if critical |
| Workspace cleanup failure | Simulated delete failure | Critical security alert; fail closed | Workflow blocked/security issue | cleanup failure alert | Workspace removed and incident resolved |
| Secret-redaction failure | Synthetic secret survives redaction check | Reject persistence/report | Evidence rejected/security issue | redaction failure alert | Secret absent from persisted artifacts |
| Evidence report schema invalid | Invalid report fixture | Schema Gate fail | Evidence rejected | `EVIDENCE_SCHEMA_FAILED` | Valid report passes |
| Evidence quality insufficient | Missing critical evidence | Quality Gate insufficient | Re-scan/correction needed | `EVIDENCE_QUALITY_INSUFFICIENT` | Sufficient report unlocks next stage |
| Queue outage | Broker unavailable | Enqueue/consume blocked safely | Async action unavailable | queue outage alert | Queue restored; no duplicate unsafe state |
| Duplicate message | Redeliver same job | Idempotent no-op or existing result | No duplicate user result | duplicate/idempotency audit | Single authoritative result |
| Poison job | Permanent invalid job | Dead-letter after retry budget | Operation failed with support ref | dead-letter audit/alert | Operator can inspect redacted metadata |
| Worker crash during pause/resume | Crash after conflict task or resume signal | Resume from checkpoint | Workflow remains paused/resumable | checkpoint/recovery audit | No lost conflict resolution |
| Database transaction failure | Simulated commit failure | Roll back state and audit where atomic | Action failed; retry possible | DB failure metric | Retry succeeds without partial state |
| RAG retrieval failure | Vector store/corpus unavailable | Retry/degrade/block | Classification unavailable | retrieval failure audit | Retrieval restored with corpus version |
| Missing citation | Corpus fixture with no citation | Block/degrade output | Legal basis unavailable | citation missing audit | Citation added or output stays blocked |
| LLM timeout | Gateway timeout | Retry then fail closed | Step delayed/blocked | model timeout audit | Retry/fallback completes or blocked |
| LLM malformed output | Invalid schema response | Reject output, retry/fail closed | Step blocked/degraded | schema invalid audit | Valid schema accepted |
| Object storage failure | Storage write/read error | Retry then fail | Document unavailable | storage failure audit | Artifact write/read succeeds |
| Document rendering failure | Template/data mapping error | Document job fails | Document generation failed | render failure audit | Template/data fixed and regenerated |
| Audit-write failure | Audit store unavailable | Fail closed for critical transition | Action blocked | critical audit alert | Audit restored; transition retried |

## Recovery Test Principles

- Recovery tests must validate workflow state, not only HTTP status.
- Every failure path must preserve auditability or fail closed.
- No recovery path may bypass VerifiedProfile, conflict, citation or privacy gates.
- Diagnostics must be redacted and reference-based.

## Testability Labels

| Failure Area | Label |
| --- | --- |
| OAuth/GitHub/queue/storage provider failures | TESTABLE_AFTER_IMPLEMENTATION |
| Scanner unsupported dynamic flow and schema/quality failures | TESTABLE_WITH_FIXTURE |
| Missing citation and ambiguous legal mapping | TESTABLE_WITH_FIXTURE / MANUAL_VALIDATION_REQUIRED |
| Audit-write failure policy | TESTABLE_AFTER_IMPLEMENTATION |

