# Reliability and Resilience Quality Design

## Purpose

Define reliability and recovery behavior to verify after implementation. No recovery automation or failure injection code is created here.

## Gate Preservation Rule

Workflow recovery cannot bypass Schema Gate, Quality Gate, Reconciliation, VerifiedProfile, Citation Guardrail or Output Guardrail.

## Resilience Matrix

| Failure Mode | Detection | Degradation Policy | Retry / Recovery Policy | Data Integrity Rule | User-facing State | Required Audit / Alert |
| --- | --- | --- | --- | --- | --- | --- |
| Queue outage | Broker health / enqueue failure | Async actions unavailable | Stop enqueue, retry after broker restored | No partial job state without durable record | Action temporarily unavailable | queue outage alert |
| Duplicate event | Duplicate event/job id | Idempotent no-op or existing result | Return existing job/result | Single authoritative state transition | No duplicate output | duplicate/idempotency audit |
| Poison job | Retry budget exceeded | Dead-letter and fail safe | Operator review with redacted metadata | No infinite retry or partial transition | Operation failed with support ref | dead-letter alert |
| Worker crash | Heartbeat/job timeout | Job delayed or failed closed | Resume from checkpoint or retry | Checkpoint state is authoritative | Job delayed/failed | worker crash audit |
| Worker pause/resume during conflict | Workflow state paused | Keep classification locked | Resume only after Manager resolution | Conflict state immutable/audited | Manager task open | conflict age metric |
| Repository clone failure | Clone error | Scan failed/retryable | Retry if transient; Manager can re-run | No report created from partial clone | Scan failed | scan failure audit |
| Scanner timeout | Worker timeout | Scan failed, classification locked | Cleanup workspace, allow re-run | No partial report accepted | Scan timed out | timeout + cleanup audit |
| Workspace cleanup failure | Cleanup controller error | Security block | Operator remediation before reuse | Raw source not considered safe until removed | Workflow blocked/security issue | critical security alert |
| Database outage | DB health/transaction failure | API/worker fail closed | Restore DB and retry safe operations | No state transition without transaction | Service unavailable/action failed | DB outage alert |
| Object-storage outage | Storage write/read error | Document artifact unavailable | Retry or regenerate later | Metadata and artifact hash must align | Document unavailable | storage failure audit |
| LLM provider outage | Gateway timeout/provider error | Retry then fail closed/degrade by node | Provider fallback only if configured | No unvalidated output used | Step delayed/blocked | model outage metric |
| LLM malformed response | Schema validation failure | Reject output | Controlled retry then fail closed | Invalid output never enters state | Step blocked/degraded | invalid output audit |
| RAG retrieval failure | Retrieval/vector store error | Classification unavailable/degraded | Retry after corpus/store restored | No unsupported rule generated | Classification unavailable | retrieval failure audit |
| Citation guardrail failure | Missing/invalid citation | Block/degrade output | Corpus/rule correction required | No unsupported legal conclusion | Legal basis missing | citation missing audit |
| Document rendering failure | Template/data mapping error | Document job failed | Retry after template/data fix | No partial final output | Document generation failed | render failure audit |
| Audit write failure | Audit service error | Fail closed for critical transitions | Restore audit path and retry | Critical transitions require audit | Action blocked | critical audit alert |
| OAuth provider outage | Provider health/callback failure | Login unavailable | Retry after provider restore | No session from failed provider | Login unavailable | auth outage alert |
| GitHub App token failure | GitHub access failure | Scan blocked/failed | Reconnect/rotate token | No scan without valid repo access | Repository access issue | GitHub token alert |

## Recovery Acceptance Criteria

- Recovery preserves workflow state and audit trace.
- Retried work is idempotent.
- User sees actionable blocked state.
- No recovery path creates classification before VerifiedProfile or output without citation guardrail.

