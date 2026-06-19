# Python Worker and Orchestrator Implementation

## Purpose

Define the Python Worker and LangGraph Orchestrator implementation contract for LCSP long-running workflows.

## Scope

The Worker consumes queue jobs, executes bounded workflow nodes, persists checkpoints/results and emits audit events. It does not expose UI or auth controllers.

## Dependencies / Source References

- [System Runtime and Component Contracts](system-runtime-and-component-contracts.md)
- [Static Analysis Scanner Contract](../specs/static-analysis-scanner-contract.md)
- [State Machine](../specs/state-machine.md)

## Implementation Boundaries

- API enqueues jobs; Worker consumes jobs.
- Orchestrator owns workflow transitions, gates, pauses, retries and audit hooks.
- Human pause/resume is represented as durable workflow state.
- All LLM calls go through LLM Gateway.
- Raw source exists only in temporary scanner workspace.

## Job Envelope

| Field | Purpose |
| --- | --- |
| `job_id` | Durable job identity |
| `job_type` | Scan, classification, document or recovery operation |
| `assessment_id` | Assessment scope |
| `workflow_run_id` | Orchestrator run scope |
| `correlation_id` | Audit/trace correlation |
| `idempotency_key` | Duplicate handling |
| `input_refs` | DB/object refs only; no raw source/secrets |
| `requested_by_actor_id` / `role` | Audit and authorization trace |
| `created_at`, `attempt` | Retry and timeout control |

## Required Node Order

| Order | Node | Blocking Output |
| ---: | --- | --- |
| 1 | Repository Scan | `TechnicalEvidenceReport` or scan failed |
| 2 | Evidence Normalization | Normalized findings |
| 3 | Schema Gate | Pass/fail |
| 4 | Quality Gate | Ready/insufficient |
| 5 | TechnicalProfile Builder | `TechnicalProfile` |
| 6 | AI Usage Flow Analysis | `AIUsageFlow` or uncertainty/conflict signal |
| 7 | Reconciliation | Conflict found/no conflict |
| 8 | Manager Conflict Resolution Wait | Durable pause until Manager resolution |
| 9 | VerifiedProfile Builder | `VerifiedProfile` |
| 10 | Legal Retrieval / RAG | Rules/citations |
| 11 | Risk Classification | Classification result or blocked/degraded |
| 12 | Citation Guardrail | Valid/missing/invalid citation |
| 13 | Gap Analysis | Gap result |
| 14 | Document Generation | Document artifact metadata |
| 15 | Output Guardrail | Final output allowed/blocked |
| 16 | Final State Update | Terminal workflow state |

## Checkpoint and Resume

- Persist workflow state after every critical node.
- Store node input/output references, not raw source or full prompt bodies.
- On conflict, pause workflow and create Manager Conflict Resolution Task through API/domain state.
- Resume only after Manager resolution is recorded and Reconciliation passes.

## Idempotency / Retry / Timeout

- Node execution must be idempotent against job id, workflow run id, input version and node name.
- Retry transient external failures within retry budget.
- Fail closed on invalid schema, missing evidence, unresolved conflict, missing citation or output guardrail failure.
- Dead-letter poison jobs with safe diagnostic metadata.

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| Queue job envelope | Workflow run state |
| Repository connection refs | Scan result/report refs |
| Evidence/Profile refs | AIUsageFlow, conflict, VerifiedProfile |
| VerifiedProfile + legal corpus version | Classification/gap/document refs |

## Security and Privacy Considerations

- Queue payloads contain references only.
- Worker cannot persist raw source outside temporary workspace.
- LLM Gateway receives sanitized metadata only.
- Model outputs are schema-validated before state use.

## Audit Requirements

Emit audit for job received, node started/completed/failed/skipped, checkpoint persisted, retry scheduled, human pause, resume, classification blocked, final output blocked/allowed and cleanup status.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Orchestrator checkpoint persistence strategy | LangGraph-compatible checkpointing with deterministic state and audit refs | Implementation |
| Retry budgets per job type | Required policy, detailed values deferred | Implementation |

