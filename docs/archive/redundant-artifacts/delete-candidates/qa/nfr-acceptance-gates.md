# NFR Acceptance Gates

## Purpose

Define go/no-go NFR gates for LCSP. These gates are design-level quality gates; they do not execute tests or create CI configuration.

## Gate Outcomes

- `PASS`: Evidence satisfies the gate.
- `CONCERNS`: Evidence exists but unresolved non-blocking risk remains with owner/mitigation.
- `FAIL`: Gate blocks the next phase or release decision.
- `WAIVED`: Explicit owner-approved waiver with expiry; not allowed for privacy/citation critical blockers unless governance approves.

## NFR Gates

| Gate ID | Quality Area | Entry Condition | Required Evidence | Failure Condition | Owner | Blocks What |
| --- | --- | --- | --- | --- | --- | --- |
| NFR-GATE-01 | Authentication and OAuth/OIDC Safety | OAuth/OIDC flow implemented/configured | Valid callback accepted; invalid state/nonce/redirect/issuer/audience/expiry rejected and audited | Invalid callback creates session or account link unsafe | Security + Backend | Auth release |
| NFR-GATE-02 | MFA and Session Security | MFA/session implemented | MFA setup/challenge/reset/revocation tests and audit events | MFA bypass, plaintext seed, session reuse after revocation | Security + Backend | Auth release |
| NFR-GATE-03 | Manager Authorization and Developer Optionality | RBAC implemented | Manager can complete full MVP; Developer cannot perform final Manager-only actions | Developer required for MVP transition or Developer finalizes conflict/report | Product + Backend | MVP workflow acceptance |
| NFR-GATE-04 | GitHub App Least-Privilege Boundary | GitHub App integration implemented | Read-only selected repo scope; OAuth does not grant repo access | OAuth login grants repository scan or overbroad GitHub scope | Security + Backend | Repository scan release |
| NFR-GATE-05 | Static Scanner Non-Execution and Workspace Isolation | Scanner implemented | No install/build/test/Docker/CI/API probing; non-root isolated workspace | Customer source executes or workspace not isolated | Security + Scanner | Scanner release |
| NFR-GATE-06 | Source, Prompt, AST and Secret Privacy | Scanner/evidence/LLM implemented | No raw source/full prompt/full AST/secrets in DB, audit, object storage or LLM | Any forbidden artifact persists or reaches LLM/audit | Security + Scanner | Evidence pipeline release |
| NFR-GATE-07 | Evidence Integrity and Report Hash Traceability | Evidence contract implemented | `TechnicalEvidenceReport` has report hash, commit, scanner/ruleset version and refs | Report accepted without required integrity metadata | Backend + Worker | TechnicalProfile creation |
| NFR-GATE-08 | AIUsageFlow Claim Evidence Completeness | AIUsageFlow implemented | Material claims have value, confidence, evidence refs, source type and uncertainty reason where needed | Claim without refs drives legal matching | Worker + QA | Legal rule matching |
| NFR-GATE-09 | VerifiedProfile and Classification Gate Enforcement | Reconciliation/profile implemented | No classification before VerifiedProfile; unresolved conflict/unknown purpose blocks | Classification runs before prerequisites | Worker + Backend | Classification release |
| NFR-GATE-10 | Legal Citation Coverage and Output Guardrail | Legal RAG/classification implemented | Rule/citation trace for critical legal output; missing citation blocks/degrades | Unsupported legal conclusion emitted | Legal/RAG + Worker | Classification/document release |
| NFR-GATE-11 | Queue Reliability, Retry and Idempotency | Queue/worker implemented | Duplicate/retry/dead-letter behavior tested; idempotency keys enforced | Duplicate unsafe results or silent job loss | Backend + DevOps | Async workflow release |
| NFR-GATE-12 | Audit Event Integrity and Correlation | Audit implemented | Critical events have correlation ids and redacted context | Missing audit for critical transition or secret/raw source in audit | Backend + Security | Compliance trace acceptance |
| NFR-GATE-13 | Failure Recovery and Operational Readiness | Ops runbook implemented | Recovery tests for provider, queue, worker, DB, storage, LLM, audit | Recovery bypasses gates or no user-visible blocking reason | DevOps + Backend | Operational readiness |
| NFR-GATE-14 | Performance and Capacity Baseline | Implemented system in test environment | Baseline measurements for API, scan queue, scanner duration, RAG, LLM, document generation | No baseline or threshold decision before release | DevOps + QA | Performance acceptance |
| NFR-GATE-15 | Accessibility and Manager Usability | Manager UI implemented | Keyboard/focus/error/blocked-state review on critical screens; A1 validation where applicable | Manager cannot understand or complete critical workflow | UX + QA + Product | UX acceptance |

## NFR-GATE-14 Threshold Policy

No hard performance or availability number is approved in canonical docs. Gate 14 requires measurement design now and threshold decision before implementation/release. Candidate thresholds must be approved by Product, Architecture, DevOps and QA after implementation environment shape is known.

## Phase 3.3 Release Quality Gate Crosswalk

The Phase 3.3 release quality gate model maps NFR gates into documentation-level release gates. These release quality gates do not declare implementation readiness or production readiness.

| NFR Gate | Related Release Quality Gate |
| --- | --- |
| NFR-GATE-01 | RQG-02 Authentication, MFA and Authorization Safety |
| NFR-GATE-02 | RQG-02 Authentication, MFA and Authorization Safety |
| NFR-GATE-03 | RQG-02 Authentication, MFA and Authorization Safety |
| NFR-GATE-04 | RQG-03 GitHub App and Repository Boundary |
| NFR-GATE-05 | RQG-04 Static Scanner Safety and Privacy |
| NFR-GATE-06 | RQG-04 Static Scanner Safety and Privacy |
| NFR-GATE-07 | RQG-05 Evidence Integrity and Quality Gates |
| NFR-GATE-08 | RQG-06 AIUsageFlow and Reconciliation Integrity |
| NFR-GATE-09 | RQG-07 VerifiedProfile and Classification Safeguards |
| NFR-GATE-10 | RQG-08 Legal Citation and Document Output Guardrails |
| NFR-GATE-11 | RQG-09 Queue, Worker and Recovery Design |
| NFR-GATE-12 | RQG-10 Auditability and Observability |
| NFR-GATE-13 | RQG-09 Queue, Worker and Recovery Design |
| NFR-GATE-14 | RQG-12 Implementation Handoff Readiness |
| NFR-GATE-15 | RQG-11 A1/A2/A2-b/A3 Validation Readiness |
