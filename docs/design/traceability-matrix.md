# LCSP Traceability Matrix

## Purpose

Tài liệu này kiểm tra mapping giữa Use Case, Functional Requirement, Non-Functional Requirement, Business Rule, UX, flowchart, sequence diagram và entity. Đây là artifact consistency trước backlog, không phải backlog.

## ID Conventions

| Artifact | Convention |
| --- | --- |
| Use Case | `UC-MXX-XX` |
| Functional Requirement | `FR-XXX` |
| Non-Functional Requirement | `NFR-XXX` |
| Business Rule | `BR-XXX` |

## Use Case to FR Matrix

| Use Case ID | Use Case Name | Related FR IDs |
| --- | --- | --- |
| UC-M01-01 | Register Account | FR-001 |
| UC-M01-02 | Login | FR-002 |
| UC-M01-03 | Logout | FR-010 |
| UC-M01-04 | Setup MFA Using Authenticator App | FR-003, FR-004 |
| UC-M01-05 | Verify MFA Code | FR-005, FR-007 |
| UC-M01-06 | Disable MFA | FR-008 |
| UC-M01-07 | Reset MFA | FR-009 |
| UC-M01-08 | Manage Session | FR-010 |
| UC-M01-09 | Reset Password | FR-011 |
| UC-M01-10 | Login With MFA | FR-006 |
| UC-M01-11 | Verify Email | FR-063 |
| UC-M01-12 | Change Password | FR-064 |
| UC-M01-13 | Manage Personal Profile | FR-065 |
| UC-M02-01 | Create Organization | FR-012 |
| UC-M02-02 | Manage Organization Members | FR-013 |
| UC-M02-03 | Assign Manager Role | FR-014 |
| UC-M02-04 | Invite Developer | FR-015 |
| UC-M02-05 | Assign Developer Policy | FR-016 |
| UC-M02-06 | Revoke Developer Access | FR-017 |
| UC-M03-01 | Create Assessment | FR-018 |
| UC-M03-02 | Fill Web Wizard | FR-019 |
| UC-M03-03 | Save Wizard Progress | FR-020 |
| UC-M03-04 | Submit WizardProfile | FR-021 |
| UC-M03-05 | View Self-Declared Readiness | FR-022 |
| UC-M03-06 | View Preliminary Indicators | FR-023 |
| UC-M04-01 | Accept Developer Task | FR-024 |
| UC-M04-02 | Connect GitHub Repository | FR-025 |
| UC-M04-03 | Upload Local/CI Scanner Report | FR-026 - Deferred / Future / Enterprise |
| UC-M04-04 | Upload Manual Technical Evidence JSON | FR-027 - Deferred / Future / Enterprise |
| UC-M04-05 | Review Technical Findings | FR-028 |
| UC-M04-06 | Confirm Technical Truth | FR-029 |
| UC-M04-07 | Provide Structured Technical Attestation | FR-030 |
| UC-M04-08 | Run Repository Scan | FR-066 |
| UC-M05-01 | Validate Evidence Schema | FR-031 |
| UC-M05-02 | Validate Privacy Flags | FR-032 |
| UC-M05-03 | Evaluate Evidence Quality | FR-033 |
| UC-M05-04 | Generate TechnicalProfile | FR-034, FR-069, FR-070 |
| UC-M05-05 | Mark Evidence as Rejected, Insufficient, or Ready | FR-035, FR-071 |
| UC-M06-01 | Detect Conflict | FR-036, FR-072 |
| UC-M06-02 | Calculate Conflict Score | FR-037 |
| UC-M06-03 | Route Conflict to Manager | FR-038 |
| UC-M06-04 | Resolve Technical Conflict | FR-039 |
| UC-M06-05 | Resolve Business/Legal Conflict | FR-040 |
| UC-M06-06 | Post-MVP Delegated Technical Clarification | FR-041 |
| UC-M06-07 | Create VerifiedProfile | FR-042 |
| UC-M06-08 | Review and Approve VerifiedProfile | FR-067 |
| UC-M07-01 | Retrieve Legal Rules/Citations | FR-043, FR-073 |
| UC-M07-02 | Run Risk Classification Agent | FR-044 |
| UC-M07-03 | Trace Classification to Legal Rule | FR-045 |
| UC-M07-04 | Block or Degrade Classification if Citation Missing | FR-046 |
| UC-M07-05 | View Classification Result | FR-047 |
| UC-M08-01 | Run Gap Analysis Agent | FR-048 |
| UC-M08-02 | Generate Compliance Report | FR-049 |
| UC-M08-03 | Generate Readiness-Only Export | FR-050 |
| UC-M08-04 | View Document Status | FR-051 |
| UC-M08-05 | Download Generated Document | FR-052 |
| UC-M08-06 | View Gap Analysis | FR-068 |
| UC-M09-01 | Write Audit Event | FR-053 |
| UC-M09-02 | View Audit Trail | FR-054 |
| UC-M09-03 | Export Audit Trail | FR-055 |
| UC-M09-04 | Track Evidence, Report, and Document Version | FR-056 |
| UC-M09-05 | Track Human Attestation Usage | FR-057 |
| UC-M10-01 | Enforce Source Code Privacy Policy | FR-058 |
| UC-M10-02 | Redact Secrets | FR-059 |
| UC-M10-03 | Clean Temporary Workspace | FR-060 |
| UC-M10-04 | Enforce No Raw Source to LLM | FR-061 |
| UC-M10-05 | Enforce No Long-Term Raw Source Storage | FR-062 |

## FR to BR Matrix

| FR Range | Business Rule IDs |
| --- | --- |
| FR-001..FR-011 | BR-001..BR-013 |
| FR-012..FR-017 | BR-014..BR-022 |
| FR-018..FR-023 | BR-023..BR-031 |
| FR-024..FR-030 | BR-021, BR-032..BR-035, BR-046, BR-052..BR-056 |
| FR-031..FR-035 | BR-036..BR-040 |
| FR-036..FR-042 | BR-041..BR-048, BR-083 |
| FR-043..FR-047 | BR-049..BR-051, BR-084 |
| FR-048..FR-052 | BR-062..BR-066 |
| FR-053..FR-057 | BR-067..BR-070 |
| FR-058..FR-062 | BR-057..BR-061 |
| FR-063..FR-065 | BR-074..BR-076 |
| FR-066 | BR-077 |
| FR-067 | BR-078 |
| FR-068 | BR-079 |
| FR-069..FR-073 | BR-080..BR-085 |

## FR to NFR Matrix

| FR IDs | Related NFR IDs |
| --- | --- |
| FR-001, FR-011 | NFR-001 |
| FR-003, FR-004 | NFR-002 |
| FR-005, FR-007 | NFR-003, NFR-005 |
| FR-006, FR-010 | NFR-003, NFR-004, NFR-005 |
| FR-008, FR-009 | NFR-006, NFR-007 |
| FR-016, FR-024 | NFR-008, NFR-009 |
| FR-019..FR-023 | NFR-010, NFR-011 |
| FR-025, FR-066 | NFR-014, NFR-022 |
| FR-031..FR-035, FR-069..FR-071 | NFR-017, NFR-019, NFR-020, NFR-023, NFR-026 |
| FR-036, FR-072 | NFR-018, NFR-026 |
| FR-043..FR-047, FR-073 | NFR-019, NFR-020, NFR-026 |
| FR-049, FR-050, FR-068 | NFR-021 |
| FR-053..FR-057 | NFR-007, NFR-018 |
| FR-058..FR-062 | NFR-012, NFR-013, NFR-015, NFR-016 |

## Use Case to Sequence Diagram Matrix

| Use Case ID | Use Case Name | Sequence Diagram |
| --- | --- | --- |
| UC-M01-01 | Register Account | Register and Login |
| UC-M01-02 | Login | Register and Login |
| UC-M01-04 | Setup MFA Using Authenticator App | Setup MFA Using Authenticator App |
| UC-M01-05 | Verify MFA Code | Setup MFA Using Authenticator App; Login With MFA |
| UC-M01-06 | Disable MFA | Disable / Reset MFA |
| UC-M01-07 | Reset MFA | Disable / Reset MFA |
| UC-M01-10 | Login With MFA | Login With MFA |
| UC-M01-11 | Verify Email | Register and Login |
| UC-M01-12 | Change Password | Register and Login |
| UC-M01-13 | Manage Personal Profile | Register and Login |
| UC-M03-01 | Create Assessment | Manager Creates Assessment |
| UC-M02-04 | Invite Developer | Manager Invites Developer |
| UC-M02-05 | Assign Developer Policy | Manager Invites Developer |
| UC-M04-02 | Connect GitHub Repository | Manager Runs Repository Scan; Scanner-to-AIUsageFlow Static Analysis Sequence |
| UC-M04-08 | Run Repository Scan | Manager Runs Repository Scan; Scanner-to-AIUsageFlow Static Analysis Sequence |
| UC-M04-03 | Upload Local/CI Scanner Report | Deferred / Future Evidence Sequences |
| UC-M05-01..UC-M05-05 | Evidence gate and AI Usage Flow use cases | Evidence Gate Processing; AI Usage Flow Analysis |
| UC-M06-01..UC-M06-06 | Reconciliation use cases | Reconciliation with Conflict; AI Usage Flow Analysis |
| UC-M04-07 | Provide Structured Technical Attestation | Human Attestation |
| UC-M06-07 | Create VerifiedProfile | VerifiedProfile Creation and Approval |
| UC-M06-08 | Review and Approve VerifiedProfile | VerifiedProfile Creation and Approval |
| UC-M07-01..UC-M07-04 | Classification/citation use cases | Risk Classification with Legal Citation |
| UC-M08-01..UC-M08-06 | Gap/document use cases | Document Generation |
| UC-M09-01 | Write Audit Event | Audit Event Recording |

## Use Case to Flowchart Matrix

| Flowchart | Related Use Cases |
| --- | --- |
| Overall Assessment Flow | UC-M03-01, UC-M03-02, UC-M03-04, UC-M02-04, UC-M02-05, UC-M04-02, UC-M04-08, UC-M05-01..UC-M05-05, UC-M06-01..UC-M06-08, UC-M07-02, UC-M08-01, UC-M08-02, UC-M08-06, UC-M09-01 |
| Login With MFA Flow | UC-M01-02, UC-M01-10, UC-M01-05 |
| Setup MFA Using Authenticator App Flow | UC-M01-04, UC-M01-05 |
| Manager Wizard Flow | UC-M03-01..UC-M03-06 |
| Developer Evidence Flow | UC-M04-01, UC-M04-02, UC-M04-08 |
| Evidence Gate Flow | UC-M05-01..UC-M05-05 |
| AI Usage Flow Analysis Flow | UC-M05-04, UC-M05-05, UC-M06-01, UC-M07-01 |
| Static Analysis Scanner Subsystem Flow | UC-M04-08, UC-M05-01..UC-M05-05, UC-M06-01 |
| Reconciliation Flow | UC-M06-01..UC-M06-08 |
| Risk Classification Flow | UC-M07-01..UC-M07-05 |
| Report Generation Flow | UC-M08-02, UC-M08-03, UC-M08-06 |
| Human Attestation Flow | UC-M04-07, UC-M06-06, UC-M09-05 |
| Blocked State Flow | UC-M05-05, UC-M06-06, UC-M07-04, UC-M08-02 |

## Use Case to UX Screen Matrix

| UX Screen | Related Use Cases |
| --- | --- |
| Register/Login/Profile/OAuth-OIDC | UC-M01-01, UC-M01-02, UC-M01-03, UC-M01-10, UC-M01-11, UC-M01-12, UC-M01-13, UC-M01-14 |
| MFA setup / QR / manual key | UC-M01-04 |
| OTP verification / MFA login | UC-M01-05, UC-M01-10 |
| MFA recovery/reset | UC-M01-06, UC-M01-07 |
| Dashboard/Create Assessment | UC-M03-01 |
| Wizard | UC-M03-02, UC-M03-03, UC-M03-04 |
| Self-Declared Readiness | UC-M03-05, UC-M03-06 |
| Invite Developer | UC-M02-04, UC-M02-05, UC-M02-06 |
| Developer Task Inbox | UC-M04-01 |
| GitHub Connect/Run Scan | UC-M04-02, UC-M04-08 |
| Technical Findings Review | UC-M04-05, UC-M04-06 |
| Technical Attestation Form | UC-M04-07 |
| AI Usage Flow Review/Uncertainty | UC-M05-04, UC-M05-05, UC-M06-01 |
| Reconciliation Review/VerifiedProfile Review | UC-M06-01..UC-M06-08 |
| Classification Result/Locked | UC-M07-02..UC-M07-05 |
| Gap Analysis/Report Generation | UC-M08-02..UC-M08-06 |
| Audit Trail | UC-M09-01..UC-M09-05 |

## Entity to Use Case Matrix

| Entity | Related Use Cases |
| --- | --- |
| User | UC-M01-01..UC-M01-14 |
| OAuthIdentity | UC-M01-14 |
| UserMfaMethod | UC-M01-04..UC-M01-07 |
| Organization | UC-M02-01..UC-M02-03 |
| Assessment | UC-M03-01, UC-M09-01 |
| AssessmentMember | UC-M02-04, UC-M04-01 |
| DeveloperPolicy | UC-M02-05, UC-M02-06, UC-M04-01 |
| PermissionGrant | UC-M02-05, UC-M02-06, UC-M06-06 |
| WizardProfile | UC-M03-02..UC-M03-06 |
| TechnicalEvidenceReport | UC-M04-02, UC-M04-08, UC-M05-01..UC-M05-05; UC-M04-03/04 only Deferred/Future |
| EvidenceFinding | UC-M04-05, UC-M05-04 |
| EvidenceGateResult | UC-M05-01..UC-M05-05 |
| TechnicalProfile | UC-M05-04, UC-M06-01 |
| AIUsageFlow | UC-M05-04, UC-M05-05, UC-M06-01, UC-M07-01 |
| Conflict | UC-M06-01..UC-M06-06 |
| ConflictResolution | UC-M06-04..UC-M06-06 |
| HumanAttestation | UC-M04-07, UC-M09-05 |
| VerifiedProfile | UC-M06-07, UC-M06-08, UC-M07-02 |
| RiskClassificationResult | UC-M07-02..UC-M07-05 |
| GapAnalysisResult | UC-M08-01, UC-M08-06 |
| ComplianceDocument | UC-M08-02..UC-M08-05 |
| GeneratedDocumentFile | UC-M08-05 |
| AuditEvent | UC-M09-01..UC-M09-05 |
| LegalDocumentVersion | UC-M07-01 |
| LegalRule | UC-M07-01..UC-M07-04 |
| LegalCitation | UC-M07-01..UC-M07-04 |

## Spec-to-Requirement Traceability

| Spec Document | Related FRs | Related BRs | Related NFRs | Related Object / Node | Validation Dependency |
| --- | --- | --- | --- | --- | --- |
| `docs/specs/ai-usage-flow-analysis-spec.md` | FR-069..FR-073 | BR-080..BR-085 | NFR-026 | `AIUsageFlow`, AI Usage Flow Analysis Node, Reconciliation, Legal Rule Matching | A1, A2, A2-b |
| `docs/specs/static-analysis-scanner-contract.md` | FR-069..FR-073 | BR-080..BR-085 | NFR-026 | `StaticAnalysisScan`, `ScannerGraph`, `TechnicalEvidenceReport`, `EvidenceFinding`, AI Usage Flow Analysis Node | A2-b |
| `docs/architecture/architecture.md#scanner-subsystem-architecture` | FR-066, FR-069..FR-073 | BR-057, BR-080..BR-085 | NFR-026 | Static-analysis scanner subsystem, Tree-sitter, TS semantic sidecar, Python semantic analyzer, evidence graph | A2-b |
| `docs/implementation/system-runtime-and-component-contracts.md#scanner-subsystem-runtime` | FR-066, FR-069..FR-073 | BR-057, BR-080..BR-085 | NFR-026 | Scanner runtime contracts, temporary workspace, graph persistence, redaction/cleanup | A2-b |
| `docs/specs/scanner-signal-taxonomy.md` | FR-069..FR-071 | BR-080..BR-082, BR-085 | NFR-026 | `TechnicalEvidenceReport`, `EvidenceFinding`, `TechnicalProfile`, scanner findings | A2-b |
| `docs/specs/ai-usage-rule-mapping-spec.md` | FR-073 | BR-082, BR-084 | NFR-019, NFR-020, NFR-026 | Legal Rule Matching, `LegalRule`, `LegalCitation`, `RiskClassificationResult` | A2, A2-b |
| OAuth/OIDC MVP authentication decision | FR-074..FR-076 | BR-086..BR-088, BR-094 | NFR-027, NFR-028, NFR-031 | `OAuthIdentity`, Authentication & OAuth/OIDC API group | None |
| Manager superset and delegation decision | FR-077..FR-078 | BR-089..BR-094 | NFR-008, NFR-029, NFR-030, NFR-032 | `PermissionGrant`, Manager Workspace, Reconciliation | A3/Post-MVP |

## OAuth / Role / Permission Traceability

| Topic | Use Cases | FRs | BRs | NFRs | QA / Acceptance Focus |
| --- | --- | --- | --- | --- | --- |
| OAuth/OIDC MVP login | UC-M01-14 | FR-074, FR-075, FR-076 | BR-086, BR-087, BR-088, BR-094 | NFR-027, NFR-028, NFR-031 | Callback validation, safe linking, MFA policy, no GitHub repository access grant |
| Manager superset MVP role | UC-M03-01, UC-M04-02, UC-M04-08, UC-M06-04, UC-M06-05, UC-M08-02 | FR-066, FR-077 | BR-018, BR-035, BR-077, BR-089, BR-093 | NFR-008, NFR-032 | Manager can complete assessment without Developer assignment |
| Manager-only MVP conflict resolution | UC-M06-03, UC-M06-04, UC-M06-05, UC-M06-07, UC-M06-08 | FR-038, FR-039, FR-040, FR-042, FR-067, FR-077 | BR-041..BR-047, BR-078, BR-093 | NFR-008, NFR-018, NFR-021, NFR-032 | Any conflict creates Manager task; no MVP test depends on Developer action |
| Post-MVP delegated Developer permissions | UC-M02-05, UC-M02-06, UC-M06-06 | FR-016, FR-017, FR-041, FR-078 | BR-090, BR-091, BR-092, BR-094 | NFR-009, NFR-029, NFR-030 | Delegation scoped/revocable/audited; Manager keeps all permissions |

## A2-b Traceability

| Validation Item | Scope | Related Specs | Related FRs | Related BRs | Acceptance Focus |
| --- | --- | --- | --- | --- | --- |
| A2-b - Scanner + AI Usage Flow Analysis mapping accuracy | Scanner and AIUsageFlow must map AI usage purpose to legal rule/corpus accurately enough for compliance classification | `static-analysis-scanner-contract.md`, `ai-usage-flow-analysis-spec.md`, `scanner-signal-taxonomy.md`, `ai-usage-rule-mapping-spec.md` | FR-069..FR-073 | BR-080..BR-085 | Static-analysis-only scanner; do not classify based only on model/provider; use claim-level evidence for purpose, input/output, downstream action, affected subject, human review, harm potential and evidence refs |

## Phase 2 Implementation Documentation Traceability

| Concern | Primary Implementation Document | Related Use Cases / FRs | Related BRs / NFRs | QA / Acceptance Focus |
| --- | --- | --- | --- | --- |
| Frontend Manager workflow | `docs/implementation/web-frontend-implementation.md` | UC-M03-01..UC-M08-06, FR-018..FR-052, FR-066..FR-078 | BR-077..BR-094, NFR-008, NFR-018, NFR-021 | Manager can complete MVP without Developer assignment |
| API backend and async boundary | `docs/implementation/nestjs-api-implementation.md`, `docs/implementation/api-and-async-event-contracts.md` | UC-M01-01..UC-M10-05, FR-001..FR-078 | All active BR/NFR groups | API validates state, enqueues long-running work and emits audit |
| Auth/OAuth/MFA/RBAC | `docs/implementation/auth-oauth-mfa-rbac-implementation.md` | UC-M01-01..UC-M01-14, UC-M02-05..UC-M02-06 | BR-001..BR-013, BR-086..BR-094, NFR-001..NFR-009, NFR-027..NFR-032 | OAuth/OIDC MVP login, MFA, Manager super-role, delegated Developer post-MVP |
| GitHub Repository Scan | `docs/implementation/github-app-repository-scan-implementation.md`, `docs/implementation/python-worker-orchestrator-implementation.md` | UC-M04-02, UC-M04-08, UC-M05-01..UC-M05-05 | BR-057..BR-061, BR-077, BR-080..BR-085, NFR-012..NFR-016, NFR-026 | Static-analysis-only scan and no manual/local/API probing MVP path |
| AIUsageFlow and reconciliation | `docs/implementation/ai-usage-flow-implementation.md`, `docs/implementation/evidence-gates-reconciliation-implementation.md` | UC-M05-04..UC-M06-08, FR-069..FR-073 | BR-080..BR-085, NFR-018, NFR-026 | Claim-level evidence, uncertainty, Manager conflict task |
| Legal RAG and classification | `docs/implementation/legal-rag-rule-matching-implementation.md`, `docs/implementation/llm-gateway-implementation.md` | UC-M07-01..UC-M07-05, FR-043..FR-047, FR-073 | BR-049..BR-051, BR-084, NFR-019, NFR-020, NFR-026 | Provider/model presence alone cannot classify risk; citation guardrail |
| Documents and final output | `docs/implementation/document-generation-implementation.md` | UC-M08-01..UC-M08-06, FR-048..FR-052, FR-068 | BR-062..BR-066, NFR-021 | Final report gate blocks unresolved conflict, missing citation or invalid classification |
| Persistence, queue, audit and operations | `docs/implementation/data-persistence-and-migration-plan.md`, `docs/implementation/queue-jobs-retry-idempotency.md`, `docs/implementation/audit-observability-implementation.md`, `docs/implementation/operational-failure-recovery-runbook.md` | UC-M09-01..UC-M09-05, UC-M10-01..UC-M10-05 | BR-057..BR-070, NFR-007, NFR-012..NFR-018 | Traceability, idempotency, failure recovery, no raw source/secrets in audit |
| Security, environments and deployment | `docs/implementation/security-privacy-implementation.md`, `docs/implementation/configuration-secrets-environments.md`, `docs/implementation/infrastructure-deployment-implementation.md`, `docs/implementation/ci-cd-implementation.md` | UC-M01-01..UC-M10-05 | BR-057..BR-061, BR-086..BR-094, all security NFRs | OAuth boundary, GitHub boundary, scanner isolation, LLM Gateway, no CI/CD compliance gate in MVP |
| Testing and handoff | `docs/implementation/testing-implementation.md`, `docs/implementation/readiness-gates-and-handoff.md` | All active MVP use cases | All active BR/NFR groups | A1/A2/A2-b/A3 validation remains required before backlog |

## Phase 3.1 Test Architecture Traceability

| Test Design Document | Related Scenarios | Related UC / FR | Related BR / NFR | Validation Dependency |
| --- | --- | --- | --- | --- |
| `docs/qa/test-architecture.md` | TSC-001..TSC-035 | All active MVP use cases, FR-001..FR-078 | All active BR/NFR groups | A1/A2/A2-b/A3 |
| `docs/qa/risk-based-test-design.md` | Critical and High scenario priorities | UC-M01-14, UC-M04-08, UC-M06-08, UC-M07-04, UC-M08-02, UC-M09-01, UC-M10-01..UC-M10-05 | BR-051, BR-057..BR-061, BR-077..BR-094, NFR-007, NFR-012..NFR-032 | A2/A2-b/A3 |
| `docs/qa/test-scenario-catalog.md` | TSC-001..TSC-035 | UC-M01-14, UC-M03-01, UC-M04-02, UC-M04-08, UC-M05-01..UC-M08-06, UC-M09-01..UC-M10-05 | BR-036..BR-094, NFR-007..NFR-032 | A1/A2/A2-b/A3 |
| `docs/qa/test-fixture-and-test-data-design.md` | F-SCAN, F-RAG, F-CONFLICT, F-AUTH, F-OPS fixture families | UC-M04-08, UC-M05-01..UC-M07-04, UC-M10-01..UC-M10-05 | BR-057..BR-061, BR-080..BR-085, NFR-012..NFR-026 | A2/A2-b/A3 |
| `docs/qa/contract-and-integration-test-design.md` | AUTH_CONTRACT through AUDIT_EVENT_CONTRACT | UC-M01-01..UC-M10-05, FR-001..FR-078 | All active BR/NFR groups | A1/A2/A2-b/A3 |
| `docs/qa/failure-mode-and-recovery-test-design.md` | Operational and security failure modes | UC-M01-14, UC-M04-08, UC-M05-01..UC-M08-05, UC-M09-01, UC-M10-01..UC-M10-05 | BR-051, BR-057..BR-070, BR-077..BR-094, NFR-007..NFR-032 | A2/A2-b/A3 |
| `docs/qa/manual-validation-protocols.md` | A1, A2, A2-b, A3 protocols | Validation Dependency Matrix rows | Validation Dependency Matrix rows | A1/A2/A2-b/A3 |

## Phase 3.2 NFR Gate Traceability

| Concern | Use Case | FR | BR | NFR | Phase 3.1 Scenario | Phase 3.2 NFR Gate | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- |
| OAuth/OIDC safety and boundary | UC-M01-14, UC-M04-02 | FR-074, FR-075, FR-076, FR-025 | BR-086, BR-087, BR-088, BR-094 | NFR-027, NFR-028, NFR-031 | TSC-002, TSC-004 | NFR-GATE-01, NFR-GATE-04 | None |
| MFA and session safety | UC-M01-04..UC-M01-10 | FR-004..FR-010 | BR-007..BR-013 | NFR-002..NFR-007 | TSC-003 | NFR-GATE-02 | None / Open Question for recovery |
| Manager super-role and Developer optionality | UC-M03-01, UC-M04-08, UC-M06-05, UC-M08-02 | FR-066, FR-077 | BR-077, BR-089, BR-091, BR-093 | NFR-008, NFR-032 | TSC-001, TSC-033, TSC-034 | NFR-GATE-03 | A3 |
| Repository Scan and GitHub boundary | UC-M04-02, UC-M04-08 | FR-025, FR-066 | BR-032, BR-077, BR-088 | NFR-014, NFR-022, NFR-028 | TSC-004, TSC-005, TSC-006, TSC-035 | NFR-GATE-04, NFR-GATE-11 | None |
| Static scanner privacy and safety | UC-M10-01..UC-M10-05 | FR-058..FR-062 | BR-057..BR-061 | NFR-012..NFR-016 | TSC-016, TSC-017 | NFR-GATE-05, NFR-GATE-06 | None |
| Evidence integrity and AIUsageFlow claims | UC-M05-01..UC-M06-01 | FR-031..FR-035, FR-069..FR-073 | BR-036..BR-040, BR-080..BR-085 | NFR-017, NFR-023, NFR-026 | TSC-018, TSC-019, TSC-020, TSC-023 | NFR-GATE-07, NFR-GATE-08 | A1/A2-b |
| VerifiedProfile and classification guardrails | UC-M06-07, UC-M06-08, UC-M07-02..UC-M07-05 | FR-042..FR-047, FR-067 | BR-048..BR-051, BR-078 | NFR-018..NFR-021, NFR-026 | TSC-021, TSC-022, TSC-024, TSC-025 | NFR-GATE-09, NFR-GATE-10 | A2/A3 |
| Document-generation final gate | UC-M08-02..UC-M08-06 | FR-049..FR-052, FR-068 | BR-062..BR-066, BR-079 | NFR-021 | TSC-027, TSC-028 | NFR-GATE-10, NFR-GATE-13 | A2/A3 |
| Queue, retry and audit integrity | UC-M09-01..UC-M09-05 | FR-053..FR-057 | BR-067..BR-070 | NFR-007, NFR-018, NFR-022, NFR-025 | TSC-029, TSC-030, TSC-032 | NFR-GATE-11, NFR-GATE-12, NFR-GATE-13 | A3 |
| Performance and capacity baseline | UC-M04-08, UC-M07-02, UC-M08-02 | FR-066, FR-044, FR-049 | BR-040, BR-066, BR-077 | NFR-022, NFR-025 | TSC-006, TSC-029, TSC-031 | NFR-GATE-14 | None / implementation threshold decision |
| Accessibility and Manager usability | UC-M03-02, UC-M05-05, UC-M06-04, UC-M07-05 | FR-019, FR-023, FR-035, FR-039, FR-047 | BR-026, BR-030, BR-040, BR-045, BR-049 | NFR-010, NFR-011, NFR-021, NFR-026, NFR-032 | TSC-001, TSC-021, TSC-034 | NFR-GATE-15 | A1/A2-b |

## Phase 3.2 NFR Documentation Traceability

| NFR Document | Related Gates | Related Phase 3.1 Scenarios | Related NFRs |
| --- | --- | --- | --- |
| `docs/qa/nfr-quality-audit.md` | NFR-GATE-01..NFR-GATE-15 | TSC-001..TSC-035 | NFR-001..NFR-032 |
| `docs/qa/nfr-acceptance-gates.md` | NFR-GATE-01..NFR-GATE-15 | TSC-001..TSC-035 | NFR-001..NFR-032 |
| `docs/qa/security-privacy-control-verification.md` | NFR-GATE-01..NFR-GATE-06, NFR-GATE-12 | TSC-002, TSC-003, TSC-004, TSC-016, TSC-017, TSC-033 | NFR-001..NFR-016, NFR-027..NFR-032 |
| `docs/qa/reliability-resilience-quality-design.md` | NFR-GATE-07, NFR-GATE-09..NFR-GATE-13 | TSC-018, TSC-019, TSC-021..TSC-032 | NFR-017..NFR-023, NFR-025, NFR-026 |
| `docs/qa/performance-capacity-quality-design.md` | NFR-GATE-14 | TSC-006, TSC-029..TSC-031 | NFR-022, NFR-025 |
| `docs/qa/observability-operational-readiness-audit.md` | NFR-GATE-11..NFR-GATE-13 | TSC-029..TSC-032 | NFR-007, NFR-017, NFR-018, NFR-022, NFR-023, NFR-026 |
| `docs/qa/accessibility-usability-nfr-review.md` | NFR-GATE-15 | TSC-001, TSC-021, TSC-034, TSC-035 | NFR-010, NFR-011, NFR-021, NFR-026, NFR-032 |
| `docs/qa/nfr-measurement-and-evidence-plan.md` | NFR-GATE-01..NFR-GATE-15 | TSC-001..TSC-035 | NFR-001..NFR-032 |

## Phase 3.3 Traceability and Release Quality Gate Matrix

| Release Quality Gate | Primary Trace Document | Related NFR Gates | Related Scenarios | Validation Dependency |
| --- | --- | --- | --- | --- |
| RQG-01 Architecture and Contract Consistency | `docs/qa/release-quality-gate-model.md` | N/A | Architecture review reports | None |
| RQG-02 Authentication, MFA and Authorization Safety | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-01..NFR-GATE-03 | TSC-001..TSC-004, TSC-033 | A3 for governance abuse |
| RQG-03 GitHub App and Repository Boundary | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-04 | TSC-004, TSC-005, TSC-006, TSC-035 | None |
| RQG-04 Static Scanner Safety and Privacy | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-05, NFR-GATE-06 | TSC-016, TSC-017, TSC-031 | None |
| RQG-05 Evidence Integrity and Quality Gates | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-07 | TSC-018, TSC-019 | A1/A2-b |
| RQG-06 AIUsageFlow and Reconciliation Integrity | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-08, NFR-GATE-09 | TSC-007..TSC-023 | A1/A2-b/A3 |
| RQG-07 VerifiedProfile and Classification Safeguards | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-09, NFR-GATE-10 | TSC-021..TSC-025 | A2/A3 |
| RQG-08 Legal Citation and Document Output Guardrails | `docs/qa/traceability-and-quality-gate-review.md` | NFR-GATE-10, NFR-GATE-13 | TSC-024..TSC-028 | A2/A3 |
| RQG-09 Queue, Worker and Recovery Design | `docs/qa/release-quality-gate-model.md` | NFR-GATE-11, NFR-GATE-13 | TSC-006, TSC-029, TSC-030 | None |
| RQG-10 Auditability and Observability | `docs/qa/release-quality-gate-model.md` | NFR-GATE-12 | TSC-032 | A3 |
| RQG-11 A1/A2/A2-b/A3 Validation Readiness | `docs/qa/release-quality-gate-model.md`, `docs/qa/coverage-gap-register.md` | NFR-GATE-08, NFR-GATE-10, NFR-GATE-15 | TSC-001..TSC-035 | A1/A2/A2-b/A3 |
| RQG-12 Implementation Handoff Readiness | `docs/qa/coverage-gap-register.md` | NFR-GATE-14 | Phase 3 reports | A1/A2/A2-b/A3 before backlog |

## Validation Dependency Matrix

| Assumption | Use Cases | FRs | BRs | NFRs | Entities |
| --- | --- | --- | --- | --- | --- |
| A1 - Wizard simplicity vs completeness | UC-M03-02..UC-M03-06, UC-M05-03..UC-M05-05, UC-M06-01, UC-M06-07, UC-M06-08 | FR-019..FR-023, FR-033, FR-035, FR-036, FR-042, FR-050, FR-067, FR-069..FR-072 | BR-026..BR-031, BR-038, BR-040, BR-041, BR-045, BR-048, BR-065, BR-073, BR-078, BR-080, BR-081, BR-083, BR-085 | NFR-010, NFR-011, NFR-019, NFR-020, NFR-023, NFR-026 | WizardProfile, EvidenceGateResult, AIUsageFlow, Conflict, VerifiedProfile |
| A2 - Legal corpus / rule reliability | UC-M05-04, UC-M05-05, UC-M07-01..UC-M07-05, UC-M08-01, UC-M08-02, UC-M08-06 | FR-043..FR-049, FR-056, FR-068..FR-073 | BR-049..BR-051, BR-062..BR-064, BR-069, BR-073, BR-079..BR-085 | NFR-019, NFR-020, NFR-021, NFR-026 | AIUsageFlow, LegalDocumentVersion, LegalRule, LegalCitation, RiskClassificationResult, GapAnalysisResult |
| A3 - Human attestation abuse risk | UC-M02-05, UC-M02-06, UC-M04-06, UC-M04-07, UC-M04-08, UC-M06-03..UC-M06-06, UC-M06-08, UC-M09-01, UC-M09-05 | FR-016, FR-017, FR-027, FR-029, FR-030, FR-036..FR-042, FR-049, FR-053..FR-057, FR-066, FR-067, FR-078 | BR-019, BR-021, BR-022, BR-041..BR-047, BR-052..BR-056, BR-063, BR-064, BR-067..BR-070, BR-072, BR-073, BR-077, BR-078, BR-090..BR-094 | NFR-008, NFR-009, NFR-018, NFR-021, NFR-029, NFR-030 | DeveloperPolicy, PermissionGrant, ConflictResolution, HumanAttestation, AuditEvent |

## Consistency Check Notes

- FR references use existing `UC-MXX-XX` IDs from `docs/design/use-case-specification.md`.
- BR references use existing `FR-XXX` IDs from `docs/design/functional-requirements.md`.
- NFR references use existing `FR-XXX`, `BR-XXX` and `UC-MXX-XX` IDs.
- Sequence diagram names use the same use case names as the use case specification.
- Flowchart labels use the same use case names as the use case specification.
- UX screens map to the same use case names and no SMS-based OTP flow is defined for MVP.

## Backlog Gate

Traceability normalization does not unblock backlog. Backlog remains blocked until A1-A3 validation results exist and required PRD/Architecture/ADR updates are complete.

## Phase 4.1 Validation Execution Preparation Traceability

Phase 4.1 adds execution preparation documents for the existing validation dependencies. It does not create new requirements, implementation work, backlog items or validation results.

| Validation | Linked Requirements / Invariants | Execution Preparation Document | Scenarios / Fixtures / Protocols | Decision or Gate |
| --- | --- | --- | --- | --- |
| A1 - Wizard simplicity and completeness | UC-M03-02..UC-M03-06, FR-019..FR-023, BR-026..BR-031, NFR-010, NFR-011; Manager completes Wizard without Developer dependency | `docs/validation/a1-wizard-validation-execution-pack.md` | A1-T01..A1-T05, TSC-001, TSC-019, TSC-021, TSC-034, TSC-035 | RQG-11, A1 validation decision rubric |
| A2 - Legal corpus and rule reliability | UC-M07-01..UC-M08-06, FR-043..FR-049, BR-049..BR-051, NFR-019..NFR-021; legal output requires rule/citation trace | `docs/validation/a2-legal-corpus-validation-execution-pack.md` | F-RAG-01..F-RAG-03, TSC-024, TSC-025, TSC-027 | RQG-07, RQG-08, A2 validation decision rubric |
| A2-b - Scanner and AIUsageFlow mapping accuracy | UC-M05-01..UC-M07-05, FR-069..FR-073, BR-080..BR-085, NFR-023, NFR-026; provider/model detection alone does not determine legal risk | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md` | F-SCAN-01..F-SCAN-12, F-CONFLICT-01..F-CONFLICT-02, TSC-007..TSC-015, TSC-020, TSC-023 | RQG-06, RQG-11, A2-b validation decision rubric |
| A3 - Human attestation abuse and governance | UC-M06-03..UC-M06-08, UC-M09-01, FR-036..FR-042, FR-053..FR-057, BR-041..BR-047, BR-067..BR-070; Manager is final conflict resolver and conflict remains auditable | `docs/validation/a3-human-attestation-validation-execution-pack.md` | A3-S1..A3-S6, F-CONFLICT-01..F-CONFLICT-02, F-AUTH-02, TSC-001, TSC-021, TSC-028, TSC-032, TSC-033 | RQG-02, RQG-06, RQG-10, A3 validation decision rubric |
| Common validation governance | No real customer repository/source/secret/raw prompt/personal data; implementation backlog remains blocked until real results and required updates are complete | `docs/validation/participant-and-reviewer-recruitment-plan.md`, `docs/validation/consent-privacy-and-data-handling-plan.md`, `docs/validation/validation-evidence-capture-template.md`, `docs/validation/validation-decision-rubric.md`, `docs/validation/validation-fixture-release-register.md` | All A1/A2/A2-b/A3 validation protocols | RQG-11, RQG-12, readiness remains unchanged |

## Phase 4.1.1 Validation Decision Resolution Traceability

| Decision | Related Validation | Decision Source | Blocks Until | Trace Target |
| --- | --- | --- | --- | --- |
| D-01 Validation ownership and reviewer roster | A1/A2/A2-b/A3 | `docs/validation/validation-execution-decision-log.md` | Required rows are `APPROVED_FOR_EXECUTION` | Phase 4.2 readiness recheck |
| D-02 A1 session design and thresholds | A1 | `docs/validation/a1-wizard-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | Product Manager confirms selected values | A1 readiness |
| D-03 A2 corpus/reviewer protocol | A2 | `docs/validation/a2-legal-corpus-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | Corpus sources, reviewer roster and disagreement protocol are approved | A2 readiness |
| D-04 A2-b scope split and A2-b1 thresholds | A2-b | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | A2-b1 reviewers, fixture hashes and thresholds are approved | A2-b1 readiness |
| D-05 A3 governance threshold | A3 | `docs/validation/a3-human-attestation-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | Governance/security reviewers and fail-closed thresholds are approved | A3 readiness |
| D-06 Evidence storage and privacy | A1/A2/A2-b/A3 | `docs/validation/consent-privacy-and-data-handling-plan.md`, `docs/validation/validation-execution-decision-log.md` | Storage location, custodian, ACL, retention and deletion process are approved | Any validation execution readiness |
| D-07 Fixture release governance | A2-b/A3 fixture-based checks | `docs/validation/validation-fixture-release-register.md`, `docs/validation/validation-execution-decision-log.md` | Fixture spec artifacts are finalized, hashed and approved | A2-b1 fixture readiness |

## Phase 4.1.2 Validation Approval Normalization Traceability

| Decision | Related Validation | Normalized Source | Current Status | Trace Target |
| --- | --- | --- | --- | --- |
| D-01 Reviewer roster | A1/A2-b1/A3; A2 internal only | `docs/validation/approvals/DEC-VAL-2026-001.md`, `docs/validation/validation-execution-decision-log.md` | APPROVED_FOR_EXECUTION with A2 formal legal limitation | Phase 4.2 readiness recheck |
| D-02 A1 session design and thresholds | A1 | `docs/validation/a1-wizard-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | APPROVED_FOR_EXECUTION | A1 readiness recheck |
| D-03 A2 legal corpus and reviewer protocol | A2 | `docs/validation/a2-legal-corpus-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | PENDING_OWNER_CONFIRMATION for formal legal reliability; internal review only | A2 formal legal validation blocker |
| D-04 A2-b1 mapping design | A2-b1 | `docs/validation/a2b-scanner-aiusageflow-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | APPROVED_FOR_EXECUTION for design validation scope | A2-b1 readiness recheck, subject to D-07 |
| D-05 A3 governance validation | A3 | `docs/validation/a3-human-attestation-validation-execution-pack.md`, `docs/validation/validation-execution-decision-log.md` | APPROVED_FOR_EXECUTION | A3 readiness recheck |
| D-06 evidence storage and privacy | A1/A2/A2-b1/A3 | `docs/validation/consent-privacy-and-data-handling-plan.md`, `docs/validation/validation-execution-decision-log.md` | APPROVED_FOR_EXECUTION by owner attestation | Phase 4.2 readiness recheck |
| D-07 fixture release governance | A2-b1 | `docs/validation/validation-fixture-release-register.md`, `docs/validation/validation-execution-decision-log.md` | PENDING_OWNER_CONFIRMATION | A2-b1 evidence collection blocker |
