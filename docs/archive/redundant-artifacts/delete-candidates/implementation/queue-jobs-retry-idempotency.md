# Queue Jobs, Retry and Idempotency

## Purpose

Define queue job types, job envelope, retry policy, idempotency and failure handling for long-running LCSP workflows.

## Scope

Queue handles Repository Scan, workflow/orchestration work, classification/RAG steps, document generation and recovery jobs. API remains responsive and does not execute long-running work synchronously.

## Dependencies / Source References

- [Python Worker and Orchestrator Implementation](python-worker-orchestrator-implementation.md)
- [System Runtime and Component Contracts](system-runtime-and-component-contracts.md)

## Implementation Boundaries

- Queue payloads contain references only.
- Worker consumes jobs and persists progress/checkpoints.
- Retry must be bounded and auditable.
- Raw source, prompts, secrets and full AST bodies must never be queue payloads.

## Job Types

| Job Type | Purpose | Idempotency Basis |
| --- | --- | --- |
| `repository_scan` | Static scan selected repo/commit | repo + commit + scanner version + ruleset version |
| `workflow_continue` | Resume orchestrator after node/result | workflow run + state version |
| `classification_run` | Legal RAG + risk classification | VerifiedProfile version + corpus version |
| `document_generation` | Generate document artifact | assessment + template + result versions |
| `cleanup_verification` | Verify scanner workspace cleanup | scan id + workspace id |
| `recovery_replay` | Reconcile stuck job/state | workflow run + checkpoint |

## Job Envelope

| Field | Required | Notes |
| --- | ---: | --- |
| `job_id` | Yes | Unique job identity |
| `job_type` | Yes | Stable type |
| `correlation_id` | Yes | Audit/trace |
| `assessment_id` | Yes | Scope |
| `workflow_run_id` | Yes | Orchestration scope |
| `idempotency_key` | Yes | Duplicate handling |
| `input_refs` | Yes | DB/object refs only |
| `attempt` | Yes | Retry count |
| `created_at` | Yes | Timeout/retry |

## Retryable and Non-Retryable Failures

| Failure | Retry? | Behavior |
| --- | ---: | --- |
| Transient GitHub/network failure | Yes | Retry with backoff |
| Queue delivery interruption | Yes | Re-deliver idempotently |
| Worker crash | Yes | Resume from checkpoint |
| Invalid evidence schema | No | Reject report, classification locked |
| Missing authorization/precondition | No | Fail closed |
| Missing citation | No automatic retry | Block/degrade until corpus/rule issue addressed |
| Raw source cleanup failure | Escalate | Critical security alert |

## Retry Budget and Backoff

Use per-job retry budgets and exponential backoff with jitter. Poison jobs move to dead-letter with redacted diagnostic metadata and operator remediation path.

## Idempotency Rules

- Duplicate scan request for same repo/commit/scanner/ruleset returns existing job/result when safe.
- Classification duplicate for same VerifiedProfile/corpus version returns existing run/result.
- Document duplicate for same template/result versions returns existing artifact or creates new explicit regeneration version.

## Progress Reporting

Worker writes job progress and node state to durable state. API exposes progress through polling or SSE projection. Web never reads queue directly.

## Timeout and Cancellation

Timeouts mark jobs failed or recoverable depending on node. Cancellation is allowed only where state can be safely rolled forward or marked canceled without leaving untracked raw workspace.

## Security and Privacy Considerations

Queue payloads must be redacted and reference-based. No source, prompts, secrets, raw provider tokens or full AST bodies.

## Audit Requirements

Audit job queued, started, checkpointed, retried, dead-lettered, canceled, completed and failed.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Retry budget values per job type | Policy required; values deferred | Implementation |
| Queue topology | RabbitMQ-compatible boundary; deployment topology config-specific | Implementation configuration |

