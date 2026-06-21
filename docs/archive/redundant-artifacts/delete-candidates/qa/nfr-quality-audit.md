# NFR Quality Audit

## Purpose

Tài liệu này audit non-functional requirements của LCSP ở mức design/evidence-plan. Đây không phải bằng chứng runtime sau implementation và không tạo test source, load-test script, penetration-test script hoặc dashboard.

## Status Classification

| Status | Meaning |
| --- | --- |
| IMPLEMENTATION_READY | Requirement and evidence expectation are clear enough for future implementation. |
| TESTABLE_AFTER_IMPLEMENTATION | Verification requires implemented system behavior. |
| MANUAL_VALIDATION_REQUIRED | Validation requires human review or A1/A2/A2-b/A3 protocol. |
| DECISION_REQUIRED_BEFORE_IMPLEMENTATION | A threshold, owner, provider or control detail must be decided before implementation. |
| FUTURE_SCOPE | Not active MVP scope. |

## NFR Quality-Attribute Review

| NFR Area | Canonical Source | Architecture Surface | Primary Risk | Required Evidence | Validation Method | Status |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-SEC Security | NFR-001..NFR-006, NFR-027, NFR-031 | Auth API, OAuth/OIDC, MFA, Session, LLM Gateway | Account takeover, callback replay, MFA bypass | Auth security tests, rejected callback audit, MFA event audit | Contract/security tests + manual security review | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-PRIV Privacy | NFR-012..NFR-016 | Scanner workspace, Evidence persistence, LLM Gateway, Audit | Raw source/secret leakage | Redaction evidence, cleanup audit, no raw source in LLM/audit/DB | Scanner fixture + security verification | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-AUTH Authentication and Authorization | NFR-004, NFR-008, NFR-027..NFR-032 | API guards, Manager workspace, PermissionGrant future model | Unauthorized actions or workflow deadlock | RBAC matrix test results, denied action audit | API contract + E2E | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-AUDIT Auditability | NFR-007, NFR-017..NFR-019, NFR-029 | Audit Logger, WorkflowRun, ModelRunMetadata | Missing compliance trace | Audit event coverage and correlation IDs | Audit contract + operational review | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-REL Reliability | NFR-022 | Queue, Worker, Orchestrator, status API | Stuck or lost workflow | Job status, retry/dead-letter evidence | Queue/recovery tests | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-RES Resilience | NFR-022, operational runbooks | Queue, Worker, DB, RAG, LLM Gateway, Object Storage | Unsafe recovery bypassing gates | Failure-mode evidence and recovery audit | Failure-mode test design | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-PERF Performance | No hard numeric canonical target | Web/API, OAuth callback, RAG, LLM Gateway, document generation | Unbounded latency and poor UX | Baseline latency metrics by workflow step | Measurement plan first; thresholds TBD | DECISION_REQUIRED_BEFORE_IMPLEMENTATION |
| NFR-CAP Capacity and Scalability | NFR-025 | Worker boundary, queue, scanner sandbox, API runtime | API/Worker contention, queue backlog | Worker concurrency and queue backlog metrics | Capacity baseline after implementation | DECISION_REQUIRED_BEFORE_IMPLEMENTATION |
| NFR-OBS Observability | NFR-023 | Metrics, structured logs, traces, audit events | Operators cannot diagnose gate or workflow failures | Dashboard/alert evidence and event correlation | Observability audit | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-MAINT Maintainability | NFR-024 | Modular monolith, Worker, contracts, rulesets | Coupling blocks safe evolution | Module dependency review, ADR alignment | Architecture/document review | IMPLEMENTATION_READY |
| NFR-CONFIG Configurability | Configuration docs | OAuth provider, queue, storage, LLM, corpus, scanner rulesets | Unsafe environment drift | Config matrix and secret references | Config review | DECISION_REQUIRED_BEFORE_IMPLEMENTATION |
| NFR-ACC Accessibility | UX spec + Phase 3.1 | Manager-facing UI | Manager cannot complete workflow accessibly | Screen accessibility review evidence | Manual accessibility review + future UI tests | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-UX Usability | NFR-010, NFR-011 | Wizard, locked-state UI, conflict workspace | Manager misunderstands evidence/conflict/blocked state | A1 validation, usability review notes | Manual validation | MANUAL_VALIDATION_REQUIRED |
| NFR-DATA Data Integrity | NFR-017, data persistence docs | PostgreSQL, object storage, report hash, snapshots | Tampered/stale evidence drives output | Hash, version, transaction and idempotency evidence | Contract/integration tests | TESTABLE_AFTER_IMPLEMENTATION |
| NFR-LEGAL Legal Output and Citation Quality | NFR-019..NFR-021, NFR-026 | Legal RAG, Citation Guardrail, Document Generator | Unsupported legal conclusion | Rule/citation trace, citation missing block evidence | RAG evaluation + A2 validation | MANUAL_VALIDATION_REQUIRED |
| NFR-OPS Operational Readiness | Operational runbook | Queue, Worker, DB, Object Storage, LLM, audit | No recovery path or alert | Recovery runbook execution evidence | Operational readiness review | TESTABLE_AFTER_IMPLEMENTATION |

## Quality-Attribute Scenarios

| Scenario | Related NFR | Stimulus | Expected Response | Evidence |
| --- | --- | --- | --- | --- |
| OAuth/OIDC callback handling | NFR-027, NFR-031 | Invalid state/nonce/issuer/audience/expiry | Login rejected and audited | Auth contract test + audit event |
| MFA challenge and recovery | NFR-002..NFR-006 | Invalid/replayed OTP or reset request | Session blocked; recovery audited | MFA security test |
| Manager authorization | NFR-008, NFR-032 | Manager performs scan/conflict/classification/report | Allowed when gates pass | E2E/API test |
| GitHub App authorization | NFR-014, NFR-028 | OAuth user tries scan without GitHub App | Scan blocked | API contract test |
| Repository scan lifecycle | NFR-022, NFR-025 | Manager requests scan | Async job queued and tracked | Queue/worker test |
| Static scanner workspace safety | NFR-012..NFR-016 | Scan fixture includes code/secrets | No execution; redacted findings; cleanup | Scanner/security test |
| Source cleanup | NFR-016 | Scan succeeds/fails | Workspace cleanup audited | Cleanup audit |
| Secret redaction | NFR-015 | Synthetic secret-like value | No persisted secret | Redaction evidence |
| Technical evidence persistence | NFR-017 | Report emitted | `report_hash` and refs exist | Contract test |
| AIUsageFlow uncertainty | NFR-026 | Dynamic/unsupported flow | Unknown/unclear and block/clarification | Fixture result |
| Conflict-resolution pause/resume | NFR-018, NFR-032 | Reconciliation detects conflict | Manager task, workflow paused, resume after resolution | Workflow/audit test |
| VerifiedProfile gating | NFR-020, NFR-021 | Classification before VerifiedProfile | Blocked | API/workflow test |
| RAG retrieval and citation coverage | NFR-019, NFR-020 | Legal rule retrieval | Citation trace exists or output blocked | RAG evaluation |
| LLM Gateway timeout/schema failure | NFR-020, NFR-022 | Timeout or malformed output | Retry/fail closed | Gateway test |
| Document-generation gate | NFR-021 | Missing conflict/citation/gap prerequisite | Final report blocked | Document contract test |
| Queue duplicate/retry/dead-letter | NFR-022 | Duplicate/poison job | Idempotent result or dead-letter | Queue test |
| Audit-event integrity | NFR-007, NFR-018 | Critical state transition | Redacted audit event with correlation ids | Audit contract |
| Object storage failure | NFR-021, OPS | Artifact write fails | Generation failed/retryable | Ops recovery test |
| Worker crash/restart | NFR-022, NFR-025 | Worker crash during workflow | Resume or fail closed | Recovery test |
| Database outage | OPS/DATA | DB unavailable | Requests fail closed; no partial transition | Recovery test |

