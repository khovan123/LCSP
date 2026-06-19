# Traceability and Quality-Gate Review

## Purpose

Provide the Phase 3.3 traceability review for LCSP documentation. This review connects canonical requirements and invariants to implementation documentation, test design, fixtures/manual validation and NFR/release quality gates.

## Scope

This document is documentation-only. It does not create source code, test source, automation framework configuration, CI/CD YAML, Dockerfile, backlog, epic, story, sprint, task or development execution.

## Traceability Status Labels

| Status | Meaning |
| --- | --- |
| DESIGN_TRACE_COMPLETE | Required documentation trace exists through implementation docs, test scenario, validation/fixture and gate. |
| DESIGN_TRACE_COMPLETE_WITH_DECISION | Trace exists, but a decision is still required before implementation or validation completion. |
| VALIDATION_REQUIRED | Trace exists, but A1, A2, A2-b or A3 result is still required before backlog/implementation readiness can change. |
| FUTURE_SCOPE_TRACE | Trace belongs to explicitly deferred/future scope. |

## Complete Traceability Review

| Source Type | Source ID | Requirement / Invariant | Implementation Document | Test Scenario | Fixture / Validation Protocol | NFR Gate | Release Quality Gate | Status | Gap |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Use Case | UC-M01-14 | OAuth/OIDC login is active MVP identity login | `docs/implementation/auth-oauth-mfa-rbac-implementation.md` | TSC-002 | F-AUTH-01 | NFR-GATE-01 | RQG-02 | DESIGN_TRACE_COMPLETE | None |
| FR | FR-074, FR-075 | OAuth/OIDC callback and account linking validation | `docs/implementation/auth-oauth-mfa-rbac-implementation.md`, `docs/implementation/api-and-async-event-contracts.md` | TSC-002 | F-AUTH-01 | NFR-GATE-01 | RQG-02 | DESIGN_TRACE_COMPLETE | None |
| BR | BR-086, BR-087 | Authorization code flow, callback validation and safe linking | `docs/implementation/auth-oauth-mfa-rbac-implementation.md` | TSC-002 | F-AUTH-01 | NFR-GATE-01 | RQG-02 | DESIGN_TRACE_COMPLETE_WITH_DECISION | Exact provider remains configuration decision |
| NFR | NFR-027, NFR-031 | OAuth callback security and identity linking safety | `docs/qa/security-privacy-control-verification.md` | TSC-002 | F-AUTH-01 | NFR-GATE-01 | RQG-02 | DESIGN_TRACE_COMPLETE | None |
| Architecture Invariant | OAuth/GitHub boundary | OAuth/OIDC login is separate from GitHub App authorization | `docs/implementation/github-app-repository-scan-implementation.md`, `docs/implementation/auth-oauth-mfa-rbac-implementation.md` | TSC-004 | F-AUTH-02 | NFR-GATE-04 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| FR | FR-076 | OAuth/OIDC login does not create repository connection or scan permission | `docs/implementation/auth-oauth-mfa-rbac-implementation.md`, `docs/implementation/github-app-repository-scan-implementation.md` | TSC-004, TSC-035 | F-AUTH-02 | NFR-GATE-04 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| BR | BR-088 | OAuth/OIDC authenticates LCSP user identity only | `docs/implementation/security-privacy-implementation.md` | TSC-004 | F-AUTH-02 | NFR-GATE-04 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| NFR | NFR-028 | OAuth/GitHub boundary separation | `docs/qa/security-privacy-control-verification.md` | TSC-004 | F-AUTH-02 | NFR-GATE-04 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| Architecture Invariant | Manager super-role | Manager can complete MVP without Developer assignment | `docs/implementation/web-frontend-implementation.md`, `docs/implementation/auth-oauth-mfa-rbac-implementation.md` | TSC-001, TSC-033, TSC-034 | F-AUTH-02, A3 protocol | NFR-GATE-03 | RQG-02, RQG-11 | VALIDATION_REQUIRED | A3 validation still required for governance abuse risk |
| FR | FR-077 | Manager has all active MVP permissions | `docs/implementation/auth-oauth-mfa-rbac-implementation.md`, `docs/implementation/nestjs-api-implementation.md` | TSC-001, TSC-033 | F-AUTH-02 | NFR-GATE-03 | RQG-02 | DESIGN_TRACE_COMPLETE | None |
| BR | BR-089, BR-091, BR-093 | Developer is optional; Manager finalizes MVP conflict and compliance actions | `docs/implementation/evidence-gates-reconciliation-implementation.md` | TSC-001, TSC-021, TSC-028 | F-CONFLICT-01, A3 protocol | NFR-GATE-03, NFR-GATE-09 | RQG-06, RQG-11 | VALIDATION_REQUIRED | A3 validation still pending |
| NFR | NFR-008, NFR-032 | RBAC and Manager super-role enforcement | `docs/qa/security-privacy-control-verification.md`, `docs/qa/accessibility-usability-nfr-review.md` | TSC-001, TSC-033, TSC-034 | F-AUTH-02 | NFR-GATE-03, NFR-GATE-15 | RQG-02, RQG-12 | DESIGN_TRACE_COMPLETE | None |
| Future Scope | FR-078 | Post-MVP scoped Developer delegation never reduces Manager authority | `docs/implementation/auth-oauth-mfa-rbac-implementation.md`, `docs/implementation/data-persistence-and-migration-plan.md` | Post-MVP delegation scenarios in Phase 2/3 docs | A3 protocol | NFR-GATE-12 | RQG-11 | FUTURE_SCOPE_TRACE | Future governance policy remains outside MVP |
| Use Case | UC-M04-02, UC-M04-08 | Manager connects GitHub repository and runs Repository Scan | `docs/implementation/github-app-repository-scan-implementation.md` | TSC-005, TSC-006 | F-OPS-01 | NFR-GATE-04, NFR-GATE-11 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| FR | FR-025, FR-066 | GitHub App repository connection and async scan job | `docs/implementation/github-app-repository-scan-implementation.md`, `docs/implementation/queue-jobs-retry-idempotency.md` | TSC-005, TSC-006, TSC-029 | F-OPS-01 | NFR-GATE-04, NFR-GATE-11 | RQG-03, RQG-09 | DESIGN_TRACE_COMPLETE | None |
| BR | BR-032, BR-077 | Repository Scan is the only active MVP technical-evidence path | `docs/implementation/github-app-repository-scan-implementation.md`, `docs/implementation/api-and-async-event-contracts.md` | TSC-004, TSC-006, TSC-035 | F-OPS-01 | NFR-GATE-04, NFR-GATE-11 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| Architecture Invariant | Repository Scan-only evidence | Manual/local/CI/API probing are not active MVP evidence flows | `docs/implementation/implementation-scope-and-invariants.md`, `docs/implementation/github-app-repository-scan-implementation.md` | TSC-035 | Manual validation review | NFR-GATE-04 | RQG-03 | DESIGN_TRACE_COMPLETE | None |
| Architecture Invariant | Static-only scanner | Scanner never executes customer code, scripts, installs, builds, tests, Docker, CI workflows or API probes | `docs/implementation/ai-usage-flow-implementation.md`, `docs/implementation/github-app-repository-scan-implementation.md` | TSC-016, TSC-017, TSC-035 | F-SCAN-10, F-SCAN-11 | NFR-GATE-05, NFR-GATE-06 | RQG-04 | DESIGN_TRACE_COMPLETE | None |
| FR | FR-058..FR-062 | Source privacy, redaction, cleanup, no raw source to LLM/storage | `docs/implementation/security-privacy-implementation.md`, `docs/implementation/llm-gateway-implementation.md` | TSC-016, TSC-017, TSC-032 | F-SCAN-11 | NFR-GATE-05, NFR-GATE-06, NFR-GATE-12 | RQG-04, RQG-10 | DESIGN_TRACE_COMPLETE | None |
| BR | BR-057..BR-061 | Raw source, full prompt, secrets and full AST bodies are excluded from LLM, audit and long-term persistence | `docs/implementation/security-privacy-implementation.md`, `docs/implementation/ai-usage-flow-implementation.md` | TSC-016, TSC-017, TSC-031 | F-SCAN-11 | NFR-GATE-06 | RQG-04 | DESIGN_TRACE_COMPLETE | None |
| NFR | NFR-012..NFR-016 | Source/privacy scanner controls | `docs/qa/security-privacy-control-verification.md`, `docs/qa/nfr-measurement-and-evidence-plan.md` | TSC-016, TSC-017 | F-SCAN-11 | NFR-GATE-05, NFR-GATE-06 | RQG-04 | DESIGN_TRACE_COMPLETE | None |
| Pipeline Invariant | Evidence pipeline | TechnicalEvidenceReport -> Schema Gate -> Quality Gate -> TechnicalProfile -> AIUsageFlow -> Reconciliation -> VerifiedProfile -> Legal Rule Matching/RAG -> Risk Classification -> Gap Analysis -> Document Generation | `docs/implementation/python-worker-orchestrator-implementation.md`, `docs/implementation/evidence-gates-reconciliation-implementation.md` | TSC-018..TSC-028 | F-SCAN, F-RAG, F-CONFLICT fixtures | NFR-GATE-07..NFR-GATE-10 | RQG-05..RQG-08 | DESIGN_TRACE_COMPLETE | None |
| FR | FR-031..FR-035 | Schema Gate and Quality Gate protect TechnicalProfile creation | `docs/implementation/evidence-gates-reconciliation-implementation.md` | TSC-018, TSC-019 | Invalid/insufficient evidence fixtures | NFR-GATE-07 | RQG-05 | DESIGN_TRACE_COMPLETE | None |
| NFR | NFR-017, NFR-023 | Evidence hash traceability and gate observability | `docs/qa/nfr-quality-audit.md`, `docs/qa/nfr-measurement-and-evidence-plan.md` | TSC-018, TSC-019 | Evidence contract validation | NFR-GATE-07 | RQG-05 | DESIGN_TRACE_COMPLETE | None |
| Use Case | UC-M05-04, UC-M05-05 | AIUsageFlow generated after TechnicalProfile and marks unclear fields | `docs/implementation/ai-usage-flow-implementation.md` | TSC-007..TSC-015, TSC-020, TSC-023 | F-SCAN-01..F-SCAN-12, A2-b protocol | NFR-GATE-08 | RQG-06, RQG-11 | VALIDATION_REQUIRED | A2-b results pending |
| FR | FR-069..FR-073 | AI usage signals, AIUsageFlow, unclear purpose and legal rule matching | `docs/implementation/ai-usage-flow-implementation.md`, `docs/implementation/legal-rag-rule-matching-implementation.md` | TSC-007..TSC-015, TSC-020, TSC-023, TSC-024 | F-SCAN-01..F-SCAN-12, F-RAG-01, A2-b protocol | NFR-GATE-08, NFR-GATE-10 | RQG-06, RQG-07, RQG-11 | VALIDATION_REQUIRED | A2/A2-b results pending |
| BR | BR-080..BR-085 | AI provider/model/framework detection alone cannot classify risk; legal matching uses AIUsageFlow | `docs/implementation/ai-usage-flow-implementation.md`, `docs/implementation/legal-rag-rule-matching-implementation.md` | TSC-007..TSC-015, TSC-020, TSC-023, TSC-024 | F-SCAN-07, F-SCAN-12, A2-b protocol | NFR-GATE-08, NFR-GATE-10 | RQG-06, RQG-07 | VALIDATION_REQUIRED | A2-b mapping accuracy pending |
| NFR | NFR-026 | AI usage-flow traceability | `docs/qa/nfr-measurement-and-evidence-plan.md` | TSC-007..TSC-015, TSC-020, TSC-023, TSC-034 | F-SCAN-01..F-SCAN-12 | NFR-GATE-08 | RQG-06 | VALIDATION_REQUIRED | A2-b results pending |
| Use Case | UC-M06-01..UC-M06-08 | Reconciliation detects conflicts and Manager resolves before VerifiedProfile | `docs/implementation/evidence-gates-reconciliation-implementation.md` | TSC-021, TSC-022 | F-CONFLICT-01, F-CONFLICT-02, A3 protocol | NFR-GATE-09 | RQG-06 | VALIDATION_REQUIRED | A3 validation pending |
| FR | FR-067 | Manager-approved VerifiedProfile required before classification | `docs/implementation/evidence-gates-reconciliation-implementation.md` | TSC-021, TSC-022 | F-CONFLICT-01 | NFR-GATE-09 | RQG-07 | DESIGN_TRACE_COMPLETE | None |
| BR | BR-078, BR-083, BR-093 | Unresolved conflict blocks classification and final report | `docs/implementation/evidence-gates-reconciliation-implementation.md`, `docs/implementation/document-generation-implementation.md` | TSC-021, TSC-028 | F-CONFLICT-01, F-CONFLICT-02 | NFR-GATE-09 | RQG-06, RQG-08 | VALIDATION_REQUIRED | A3 validation pending |
| Use Case | UC-M07-01..UC-M07-05 | Legal Rule Matching/RAG and classification require citations | `docs/implementation/legal-rag-rule-matching-implementation.md` | TSC-024, TSC-025, TSC-031 | F-RAG-01, F-RAG-02, F-RAG-03, A2 protocol | NFR-GATE-10 | RQG-07, RQG-08 | VALIDATION_REQUIRED | A2 legal corpus validation pending |
| FR | FR-044..FR-046, FR-073 | Classification requires VerifiedProfile, legal rules, AIUsageFlow and citations | `docs/implementation/legal-rag-rule-matching-implementation.md`, `docs/implementation/llm-gateway-implementation.md` | TSC-022, TSC-024, TSC-025, TSC-031 | F-RAG-01..F-RAG-03 | NFR-GATE-09, NFR-GATE-10 | RQG-07, RQG-08 | VALIDATION_REQUIRED | A2 results pending |
| BR | BR-049..BR-051, BR-084 | Unsupported legal conclusions are blocked/degraded | `docs/implementation/legal-rag-rule-matching-implementation.md`, `docs/implementation/document-generation-implementation.md` | TSC-024, TSC-025, TSC-027, TSC-028 | F-RAG-01, F-RAG-02 | NFR-GATE-10 | RQG-08 | VALIDATION_REQUIRED | A2 results pending |
| NFR | NFR-019..NFR-021 | Legal citation traceability and output overclaim prevention | `docs/qa/nfr-acceptance-gates.md`, `docs/qa/security-privacy-control-verification.md` | TSC-024, TSC-025, TSC-027, TSC-028 | F-RAG-01, F-RAG-02, A2 protocol | NFR-GATE-10 | RQG-08 | VALIDATION_REQUIRED | A2/A3 results pending |
| Use Case | UC-M08-02..UC-M08-06 | Document generation only after valid classification, gaps and citations | `docs/implementation/document-generation-implementation.md` | TSC-027, TSC-028 | F-RAG-01, F-RAG-02 | NFR-GATE-10, NFR-GATE-13 | RQG-08 | VALIDATION_REQUIRED | A2/A3 results pending |
| Use Case | UC-M09-01..UC-M09-05 | Audit material security, evidence, classification and document transitions | `docs/implementation/audit-observability-implementation.md` | TSC-032 | Full workflow fixture | NFR-GATE-12 | RQG-10 | DESIGN_TRACE_COMPLETE_WITH_DECISION | Audit immutability mechanism decision pending |
| FR | FR-053..FR-057 | Audit events, export and artifact versioning | `docs/implementation/audit-observability-implementation.md`, `docs/implementation/api-and-async-event-contracts.md` | TSC-032 | Full workflow fixture | NFR-GATE-12 | RQG-10 | DESIGN_TRACE_COMPLETE_WITH_DECISION | Audit evidence retention/immutability decisions pending |
| BR | BR-067..BR-070, BR-094 | Material events audited without raw source/tokens/secrets | `docs/qa/observability-operational-readiness-audit.md` | TSC-032 | Audit event contract | NFR-GATE-12 | RQG-10 | DESIGN_TRACE_COMPLETE_WITH_DECISION | Audit immutability mechanism decision pending |
| NFR | NFR-007, NFR-018, NFR-029, NFR-030 | Auth, audit immutability and permission auditability | `docs/qa/nfr-measurement-and-evidence-plan.md` | TSC-032 | A3 protocol | NFR-GATE-12 | RQG-10, RQG-11 | VALIDATION_REQUIRED | A3 and audit immutability decision pending |
| Runtime Invariant | Async jobs | API delegates scan/classification/document work to Queue + Worker + Orchestrator | `docs/implementation/python-worker-orchestrator-implementation.md`, `docs/implementation/queue-jobs-retry-idempotency.md` | TSC-006, TSC-029, TSC-030 | F-OPS-01, F-OPS-02 | NFR-GATE-11, NFR-GATE-13 | RQG-09 | DESIGN_TRACE_COMPLETE | None |
| NFR | NFR-022, NFR-025 | Async workload reliability and worker scalability path | `docs/qa/reliability-resilience-quality-design.md`, `docs/qa/performance-capacity-quality-design.md` | TSC-006, TSC-029, TSC-030 | F-OPS-01, F-OPS-02 | NFR-GATE-11, NFR-GATE-14 | RQG-09 | DESIGN_TRACE_COMPLETE_WITH_DECISION | Performance/capacity thresholds pending |
| UX/NFR | NFR-010, NFR-011 | Wizard usability and locked-state clarity | `docs/implementation/web-frontend-implementation.md`, `docs/qa/accessibility-usability-nfr-review.md` | TSC-001, TSC-021, TSC-034, TSC-035 | A1 protocol | NFR-GATE-15 | RQG-11 | VALIDATION_REQUIRED | A1 results and accessibility target pending |

## Mandatory Invariant Coverage

| Invariant | Trace Status | Verification Method |
| --- | --- | --- |
| Manager can complete every MVP workflow without Developer assignment | DESIGN_TRACE_COMPLETE | TSC-001, TSC-033, NFR-GATE-03, RQG-02 |
| OAuth/OIDC login is separate from GitHub App authorization | DESIGN_TRACE_COMPLETE | TSC-004, NFR-GATE-04, RQG-03 |
| Repository Scan is the only active MVP technical-evidence path | DESIGN_TRACE_COMPLETE | TSC-035, RQG-03 |
| Scanner is static-analysis only and never executes customer code | DESIGN_TRACE_COMPLETE | TSC-016, TSC-017, NFR-GATE-05, RQG-04 |
| Evidence-to-decision workflow order is preserved | DESIGN_TRACE_COMPLETE | TSC-018..TSC-028, RQG-05..RQG-08 |
| Provider/model/framework detection alone does not determine legal risk | VALIDATION_REQUIRED | TSC-007, F-SCAN-07, A2-b protocol, RQG-06 |
| Unknown or unclear critical usage blocks final classification or requires traceable Manager clarification | VALIDATION_REQUIRED | TSC-014, TSC-020, TSC-023, F-SCAN-08, F-SCAN-12, A2-b protocol |
| Raw source, full prompts, secrets and full AST bodies never enter LLM, ordinary audit logs or long-term persistence | DESIGN_TRACE_COMPLETE | TSC-016, TSC-017, TSC-031, NFR-GATE-06, RQG-04 |

## Validation Dependency Review

| Validation | Linked Requirements | Linked Scenarios / Fixtures | Success Evidence | Decision Impact | Required Document Updates After Results |
| --- | --- | --- | --- | --- | --- |
| A1 | FR-019..FR-023, FR-033, FR-035, FR-036, FR-042, FR-050, FR-067, FR-069..FR-072; NFR-010, NFR-011, NFR-023, NFR-026 | TSC-001, TSC-019, TSC-021, TSC-034, TSC-035; Wizard and Manager usability protocol | Manager can complete Wizard and understand evidence/locked states without material confusion | May alter WizardProfile, locked-state UX and readiness gates | PRD, UX spec, FR/BR/NFR, acceptance criteria, implementation readiness |
| A2 | FR-043..FR-049, FR-056, FR-068, FR-069..FR-073; BR-049..BR-051, BR-062..BR-064, BR-069, BR-073, BR-079..BR-085; NFR-019..NFR-021, NFR-026 | TSC-009, TSC-010, TSC-011, TSC-024, TSC-025, TSC-027; F-RAG-01..F-RAG-03 | Legal rules/citations reliably support classification and document output | May alter Legal RAG, rule matching, citation guardrails and output wording | Legal rule/citation contract, AI usage rule mapping, classification/design docs |
| A2-b | FR-069..FR-073; BR-080..BR-085; NFR-026 | TSC-007..TSC-015, TSC-020, TSC-023; F-SCAN-01..F-SCAN-12 | Scanner and AIUsageFlow map usage purpose, input/output, downstream action, human review and uncertainty accurately enough for legal matching | Must pass before implementation backlog can unblock | Scanner contract, AIUsageFlow spec, signal taxonomy, RAG mapping, test fixtures |
| A3 | FR-016, FR-017, FR-027, FR-029, FR-030, FR-036..FR-042, FR-049, FR-053..FR-057, FR-066, FR-067, FR-078; BR-019, BR-021, BR-022, BR-041..BR-047, BR-052..BR-056, BR-063, BR-064, BR-067..BR-070, BR-072, BR-073, BR-077, BR-078, BR-090..BR-094 | TSC-001, TSC-021, TSC-028, TSC-032, TSC-033; F-CONFLICT-01, F-CONFLICT-02, F-AUTH-02 | Manager conflict resolution and future delegation do not create governance abuse risk | May tighten conflict resolution, attestation, delegation and audit controls | PRD, ADR, reconciliation policy, RBAC, audit docs, acceptance criteria |

## A2-b Required Fixture Coverage

| A2-b Required Case | Scenario | Fixture | Expected Coverage |
| --- | --- | --- | --- |
| Internal summarization | TSC-008 | F-SCAN-01 | Internal productivity + summarization + no automated-decision overclaim |
| Customer chatbot without material decision | TSC-009 | F-SCAN-02 | Chatbot/display_to_user + no high-risk by presence alone |
| Loan approval / credit scoring | TSC-010 | F-SCAN-03 | scoring + approve_reject + customer affected + legal eligibility |
| HR ranking | TSC-011 | F-SCAN-04 | recruitment + ranking + candidate affected |
| Human-reviewed decision | TSC-012 | F-SCAN-05 | human_review=present only with bounded evidence |
| Automated approval/rejection | TSC-013 | F-SCAN-06 | output + decision rule + state change + no evidenced review |
| Unknown / dynamic / unsupported flow | TSC-014, TSC-015, TSC-023 | F-SCAN-08, F-SCAN-09, F-SCAN-10, F-SCAN-12 | coverage limitation or unsupported flow; classification blocked or clarification required |

## Orphan Review Summary

| Orphan Check | Result | Notes |
| --- | --- | --- |
| Requirement without implementation document | No critical orphan found | All critical MVP groups map to Phase 2 implementation documents. |
| Requirement without test scenario | No critical orphan found | Critical flows map to TSC-001..TSC-035. |
| Critical business rule without acceptance criterion | No critical orphan found | Acceptance criteria and must-not-pass conditions cover core blockers. |
| NFR without NFR gate | No critical orphan found | NFR-001..NFR-032 map to NFR-GATE coverage or future/deferred notes. |
| Test scenario without requirement linkage | No critical orphan found | TSC catalogue includes linked UC/FR/BR/NFR. |
| Fixture without expected AIUsageFlow or gate outcome | No critical orphan found | Fixture design documents expected findings/claims/gates. |
| Architecture invariant without verification method | No critical orphan found | Mandatory invariants map to scenarios and gates. |
| Validation protocol without linked decision/update path | No critical orphan found | A1/A2/A2-b/A3 include document update path. |
| Open implementation decision without owner/timing | Non-blocking gaps remain | See `docs/qa/coverage-gap-register.md`. |

