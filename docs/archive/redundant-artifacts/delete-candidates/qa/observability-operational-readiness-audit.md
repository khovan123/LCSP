# Observability and Operational Readiness Audit

## Purpose

Define observability and operational readiness requirements for LCSP MVP implementation. This document is design-only and does not create dashboards, alert rules, monitoring configuration or executable checks.

## Scope

This audit covers structured logs, metrics, traces, audit events, security events, workflow transitions, scanner coverage limits, LLM Gateway metadata, queue metadata and document-generation status.

## Dependencies / Source References

- `docs/specs/implementation-contract.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/implementation/audit-observability-implementation.md`
- `docs/implementation/queue-jobs-retry-idempotency.md`
- `docs/implementation/operational-failure-recovery-runbook.md`
- `docs/security/threat-model.md`
- `docs/design/non-functional-requirements.md`

## Implementation Boundaries

- Observability must not expose raw source code, full prompts, secrets or full AST bodies.
- Audit events must retain correlation and decision metadata without storing sensitive payload bodies.
- Operational telemetry must distinguish workflow state, queue state, scanner state, LLM Gateway state and document-generation state.
- Metrics and alert design are specified here; dashboard and alert implementation remain future implementation work.

## Required Correlation Dimensions

| Correlation Dimension | Purpose | Redaction Rule |
| --- | --- | --- |
| `assessment_id` | Join workflow, evidence and output records | Not secret |
| `organization_id` | Tenant boundary and operational grouping | Not secret |
| `repository_id` | Repository connection and scan linkage | Do not include repository token |
| `scan_id` | Scanner job and evidence linkage | Not secret |
| `commit_sha` | Commit-pinned provenance | Not secret |
| `workflow_run_id` | Orchestrator run trace | Not secret |
| `job_id` | Queue and worker diagnostics | Not secret |
| `event_id` | Async event de-duplication | Not secret |
| `model_run_id` | LLM Gateway call trace | Do not include raw prompt/input |
| `document_id` | Generated output trace | Not secret |
| `audit_event_id` | Compliance trace | Not secret |

## Required Telemetry

| Telemetry Type | Collection Point | Required Fields | Privacy Constraint | Operational Use |
| --- | --- | --- | --- | --- |
| Structured logs | Web, API, Worker, Orchestrator, LLM Gateway | correlation IDs, actor type, component, status, error category | No raw source, full prompt, secret or token | Debugging and incident triage |
| Metrics | API, Queue, Worker, Scanner, RAG, LLM Gateway, Document Generator | count, duration, failure rate, queue age, retry count | Aggregate only where possible | Health and capacity monitoring |
| Distributed traces | API -> Queue -> Worker -> Orchestrator node | workflow_run_id, job_id, node_name, duration | No payload body capture | Cross-component latency analysis |
| Audit events | Auth, evidence, gate, conflict, classification, document, delegation | actor, action, timestamp, outcome, evidence refs | Redacted and append-oriented | Compliance and forensic review |
| Security events | OAuth, MFA, session, permission, GitHub App | actor, source, reason, result | No provider tokens or MFA seed | Account and access abuse detection |
| Workflow state transitions | Orchestrator | previous_state, next_state, gate result, blocker reason | No raw evidence body | State-machine audit and recovery |
| Scanner coverage limitations | Scanner | scan_id, file category, limitation type, confidence | No source body | A2-b quality and abstention analysis |
| LLM Gateway metadata | LLM Gateway | provider, model, prompt_version, input_reference, output_hash, status | Sanitized metadata only | Cost, reliability and policy checks |
| Queue retry/dead-letter metadata | Queue/Worker | job_type, idempotency_key, retry_count, failure_class | No payload secrets | Reliability and poison-job handling |
| Document-generation status | Worker/Object Storage | document_id, template_version, storage_ref, status | No sensitive document body in log | Output recovery and support |

## Dashboard and Alert Design

| Dashboard / Alert Concern | Metric or Signal | Alert Intent | Status |
| --- | --- | --- | --- |
| Scan success/failure rate | `repository_scan_completed`, `repository_scan_failed` | Detect scanner degradation | TESTABLE_AFTER_IMPLEMENTATION |
| Scan coverage limitation rate | `SCAN_COVERAGE_LIMITATION`, `UNSUPPORTED_DYNAMIC_FLOW` count | Detect scanner quality drift | TESTABLE_AFTER_IMPLEMENTATION |
| Schema failure rate | `EVIDENCE_SCHEMA_FAILED` | Detect contract regression | TESTABLE_AFTER_IMPLEMENTATION |
| Quality-insufficient rate | `EVIDENCE_QUALITY_INSUFFICIENT` | Detect low evidence usefulness | TESTABLE_AFTER_IMPLEMENTATION |
| AIUsageFlow uncertainty rate | unclear/unknown claim ratio | Track A2-b readiness and abstention | MANUAL_VALIDATION_REQUIRED |
| Conflict rate and age | `CONFLICT_FOUND`, unresolved age | Detect workflow bottlenecks | TESTABLE_AFTER_IMPLEMENTATION |
| VerifiedProfile creation rate | `VERIFIED_PROFILE_READY` | Confirm progression after reconciliation | TESTABLE_AFTER_IMPLEMENTATION |
| Classification block rate | `CLASSIFICATION_BLOCKED` | Detect missing evidence/citation/conflict blockers | TESTABLE_AFTER_IMPLEMENTATION |
| Citation-missing rate | Citation Guardrail block/degrade count | Detect legal corpus/retrieval gaps | MANUAL_VALIDATION_REQUIRED |
| LLM timeout/invalid-output rate | LLM Gateway timeout/schema-failure count | Detect provider/prompt issues | TESTABLE_AFTER_IMPLEMENTATION |
| Queue latency | job age and processing duration | Detect queue or worker saturation | TESTABLE_AFTER_IMPLEMENTATION |
| Dead-letter count | DLQ count by job type | Detect unrecoverable workflow failures | TESTABLE_AFTER_IMPLEMENTATION |
| Worker failure rate | crash/timeout count | Detect worker instability | TESTABLE_AFTER_IMPLEMENTATION |
| Document-generation failure rate | document job failures | Detect output pipeline issues | TESTABLE_AFTER_IMPLEMENTATION |
| Audit-write failure rate | audit write failures and fallback status | Detect compliance trace risk | TESTABLE_AFTER_IMPLEMENTATION |

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| Workflow run metadata | Correlated workflow trace |
| Queue/job metadata | Queue latency, retry and DLQ signals |
| Scanner coverage metadata | Coverage limitation metrics |
| LLM Gateway metadata | Model run observability without raw prompt/source |
| Audit event stream | Compliance trace and operational review inputs |

## State / Error / Failure Handling

| Failure | Required Behavior | Audit / Alert |
| --- | --- | --- |
| Missing correlation ID | Reject or synthesize controlled system correlation before async handoff | Audit component and correction |
| Telemetry write failure | Do not bypass compliance gates; degrade operational visibility with alert | Alert operator |
| Audit write failure | Fail closed for compliance-critical transitions where audit is mandatory | Alert and block transition where required |
| Excessive coverage limitations | Preserve unknown/unclear AIUsageFlow claims and block final classification when critical | Alert A2-b quality risk |

## Security and Privacy Considerations

- Logs and metrics must use IDs, hashes, statuses and classifications, not raw source or prompt content.
- Audit export must preserve redaction and tenant isolation.
- LLM Gateway observability must record `input_reference` and `output_hash`, not raw model input/output content unless explicitly allowed by a future policy.
- Scanner telemetry must include file category and limitation type, not raw file body.

## Audit Requirements

Audit events are required for OAuth/OIDC login outcomes, MFA changes, GitHub repository connection, scan request/start/complete/fail, gate pass/fail, AIUsageFlow ready, conflict found/resolved, VerifiedProfile ready, classification requested/completed/blocked, citation guardrail block/degrade, document generation requested/completed/blocked and final output gate.

## Decision Required

| Decision | Classification | Recommended Default | Owner | Required Before |
| --- | --- | --- | --- | --- |
| Production observability backend | CONFIGURATION_DECISION | Use adapter-neutral structured logs, metrics and tracing contracts until deployment tooling is selected | Architecture/DevOps | Implementation |
| Audit immutability mechanism | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Append-oriented database records plus exportable audit hash chain if needed for validation | Architecture/Security | Implementation |

