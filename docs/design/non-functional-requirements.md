# LCSP Non-Functional Requirements Specification

## Purpose

Tài liệu này chuẩn hóa NFR cho LCSP theo ID tuần tự toàn cục `NFR-XXX`, đồng bộ với use case, FR và BR. Đây là tài liệu product/architecture-level, không chọn implementation stack mới.

## NFR Summary

| NFR ID | NFR Name | Category | Related Module | Validation Dependency |
| --- | --- | --- | --- | --- |
| NFR-001 | Password security | Security | M01 | Open Question |
| NFR-002 | MFA secret protection | Security | M01 | None |
| NFR-003 | OTP verification security | Security | M01 | None |
| NFR-004 | Session security | Security | M01 | None |
| NFR-005 | Brute-force protection | Security | M01 | None |
| NFR-006 | Secure MFA recovery/reset | Security | M01 | Open Question |
| NFR-007 | Auth event auditability | Auditability | M01/M09 | None |
| NFR-008 | Role-based access control | Security | M02 | A3 |
| NFR-009 | Developer task policy isolation | Security | M02/M04 | A3 |
| NFR-010 | Wizard usability | Usability | M03 | A1 |
| NFR-011 | Classification locked-state clarity | Usability | M03/M07 | A1 |
| NFR-012 | No raw source to LLM | Privacy | M10 | None |
| NFR-013 | No long-term raw source storage | Privacy | M10 | None |
| NFR-014 | Least privilege GitHub App | Security | M04/M10 | None |
| NFR-015 | Secret redaction | Privacy | M10 | None |
| NFR-016 | Temporary workspace cleanup | Privacy | M10 | None |
| NFR-017 | Evidence report hashing | Traceability | M05/M09 | None |
| NFR-018 | Audit event immutability expectation | Auditability | M09 | A3 |
| NFR-019 | Legal citation traceability | Traceability | M07 | A2 |
| NFR-020 | Rule-backed classification | Compliance | M07 | A2 |
| NFR-021 | Document overclaim prevention | Compliance | M08 | A2/A3 |
| NFR-022 | Async workload reliability | Reliability | M05/M07/M08 | None |
| NFR-023 | Evidence gate observability | Observability | M05 | A1 |
| NFR-024 | Modular maintainability | Maintainability | All | None |
| NFR-025 | Worker scalability path | Scalability | M05/M07/M08/M10 | None |
| NFR-026 | AI usage-flow traceability | Traceability | M05/M06/M07 | A1/A2 |
| NFR-027 | OAuth/OIDC callback security | Security | M01 | None |
| NFR-028 | OAuth/GitHub boundary separation | Security | M01/M04 | None |
| NFR-029 | Permission delegation auditability | Auditability | M02/M09 | A3/Post-MVP |
| NFR-030 | Role/permission revocation behavior | Security | M02 | A3/Post-MVP |
| NFR-031 | OAuth identity linking safety | Security | M01 | None |
| NFR-032 | Manager super-role enforcement | Security | M02/M04/M06/M08 | None |

## Security Requirements

| NFR ID | NFR Name | Category | Requirement Statement | Rationale | Measurement / Acceptance Criteria | Related Architecture Section | Related Risk | Related Module | Related Use Case ID | Related FR ID | Related Business Rule ID | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFR-001 | Password security | Security | Password-auth accounts must follow configured strength and reset policy. | Reduce account compromise. | Weak password rejected when password auth is in scope. | Privacy & Security Architecture | Weak password/account takeover | M01 | UC-M01-01 | FR-001, FR-011 | BR-001, BR-004 | Open Question |
| NFR-002 | MFA secret protection | Security | Authenticator App MFA secret must not be stored or logged in plaintext. | Prevent MFA seed compromise. | Persistent record stores encrypted secret/reference only; logs contain no seed. | Privacy & Security Architecture | MFA secret leakage | M01 | UC-M01-04 | FR-004 | BR-011 | None |
| NFR-003 | OTP verification security | Security | OTP verification must reject invalid, expired and replayed codes. | Prevent MFA bypass. | Invalid/expired OTP cannot enable MFA or create session. | Privacy & Security Architecture | OTP brute force/replay | M01 | UC-M01-05 | FR-005, FR-007 | BR-007, BR-009 | None |
| NFR-004 | Session security | Security | Sessions must expire, be revocable and respect MFA state. | Limit stale/compromised sessions. | Expired/revoked sessions cannot call protected endpoints. | Privacy & Security Architecture | Session hijacking | M01 | UC-M01-08 | FR-010 | BR-005 | None |
| NFR-005 | Brute-force protection | Security | Login and MFA verification must rate-limit repeated failures. | Reduce credential/OTP attacks. | Repeated failed password/OTP attempts trigger rate limit or temporary lock. | Threat Model | Brute force/account takeover | M01 | UC-M01-02, UC-M01-05, UC-M01-10 | FR-002, FR-006, FR-007 | BR-003, BR-008, BR-009 | None |
| NFR-006 | Secure MFA recovery/reset | Security | MFA reset must require verified recovery/support/admin process and must not bypass auth policy. | Prevent recovery bypass. | Reset action requires defined recovery authority and audit event. | Threat Model | Recovery bypass | M01 | UC-M01-07 | FR-009 | BR-012, BR-013 | Open Question |
| NFR-007 | Auth event auditability | Auditability | MFA, login, logout, password reset and session security events must be auditable. | Support incident/compliance review. | Auth events write actor/action/time/outcome without secrets. | Audit Trail Architecture | Missing auth audit | M01/M09 | UC-M09-01 | FR-053 | BR-067 | None |
| NFR-008 | Role-based access control | Security | UI/API must enforce Manager and Developer permissions. | Preserve truth ownership and least privilege. | Developer cannot access Manager-only actions. | Role/Permission Module | Unauthorized Developer access | M02 | UC-M02-05 | FR-016 | BR-018, BR-019 | A3 |
| NFR-009 | Developer task policy isolation | Security | Developer access must be scoped to assigned assessment tasks/policies. | Prevent broad technical access. | Developer sees only assigned technical tasks and limited context. | Role/Permission Module | Unauthorized data access | M02/M04 | UC-M04-01 | FR-024 | BR-021 | A3 |
| NFR-010 | Wizard usability | Usability | Manager-facing Wizard must use business language and be validated with A1 scenarios. | Wizard is highest-risk entry point. | A1 validation shows Manager understands critical questions without Developer. | Wizard Module | Wizard incompleteness/confusion | M03 | UC-M03-02 | FR-019, FR-021 | BR-026, BR-027 | A1 |
| NFR-011 | Classification locked-state clarity | Usability | UI must clearly explain why classification/report is locked. | Prevent false confidence and support next action. | Locked state explains missing evidence, failed gate, conflict or citation issue. | State Model | User confusion/overclaim | M03/M07 | UC-M07-05 | FR-023, FR-047 | BR-030, BR-049 | A1 |
| NFR-027 | OAuth/OIDC callback security | Security | OAuth/OIDC callback handling must validate redirect URI, state, nonce, issuer, audience, token expiry and PKCE policy. | Prevent login CSRF, token substitution and callback replay. | Invalid callback/state/nonce/issuer/audience/expiry is rejected and audited. | Authentication Architecture / Threat Model | Account takeover via OAuth callback | M01 | UC-M01-14 | FR-074, FR-075 | BR-086, BR-087 | None |
| NFR-028 | OAuth/GitHub boundary separation | Security | OAuth/OIDC user login must remain separate from GitHub App repository authorization. | Avoid privilege confusion between identity login and source access. | OAuth login does not create repository connection or grant scan permission. | Role/Permission Module / Evidence Collection Architecture | Unauthorized repository access | M01/M04 | UC-M01-14, UC-M04-02 | FR-076, FR-025 | BR-088 | None |
| NFR-031 | OAuth identity linking safety | Security | OAuth/OIDC linked identities must not create privilege escalation or account takeover through unsafe linking. | Protect existing accounts and organization membership. | Account linking rejects unverified email-only matches and logs linking decisions without raw tokens. | Threat Model | Account takeover / recovery bypass | M01 | UC-M01-14 | FR-075 | BR-087, BR-094 | None |
| NFR-032 | Manager super-role enforcement | Security | Authorization checks must enforce Manager as the superset MVP role across assessment, evidence, conflict, classification, report and audit actions. | Ensure Manager can complete MVP while Developer remains optional. | Manager can run MVP flow without Developer; Developer cannot perform final Manager actions. | Role/Permission Module | Workflow deadlock / privilege escalation | M02/M04/M06/M08 | UC-M03-01, UC-M04-08, UC-M06-05, UC-M08-02 | FR-077 | BR-089, BR-091 | None |

## Privacy Requirements

| NFR ID | NFR Name | Category | Requirement Statement | Rationale | Measurement / Acceptance Criteria | Related Architecture Section | Related Risk | Related Module | Related Use Case ID | Related FR ID | Related Business Rule ID | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFR-012 | No raw source to LLM | Privacy | Raw source code must never be sent to LLM Provider. | Protect customer source and reduce data leakage. | Agent prompts contain VerifiedProfile, normalized evidence and legal context only. | Scanner and Source Code Boundary | Raw source leakage | M10 | UC-M10-04 | FR-061 | BR-057 | None |
| NFR-013 | No long-term raw source storage | Privacy | Raw source code must not be stored long-term in LCSP persistent stores. | Preserve enterprise source privacy. | DB/object storage contain metadata, evidence refs and hashes only. | Scanner and Source Code Boundary | Raw source leakage | M10 | UC-M10-05 | FR-062 | BR-058 | None |
| NFR-014 | Least privilege GitHub App | Security | GitHub App must request only read-only selected repo/scope permissions needed for scan. | Reduce blast radius of token misuse. | Permission list documents read-only selected repository access. | Privacy & Security Architecture | GitHub token misuse | M04/M10 | UC-M04-02, UC-M04-08 | FR-025, FR-066 | BR-032, BR-077 | None |
| NFR-015 | Secret redaction | Privacy | Secrets must be redacted before logs, findings, reports or audit records. | Prevent secret leakage through evidence pipeline. | Persisted artifacts contain no secret value. | Source Code Privacy Policy | Secret leakage | M10 | UC-M10-02 | FR-059 | BR-059 | None |
| NFR-016 | Temporary workspace cleanup | Privacy | Temporary scanner workspace must be cleaned after success/failure. | Avoid long-term source retention. | Cleanup event exists; cleanup failure is audited. | Deployment View / Worker Boundary | Raw source retention | M10 | UC-M10-03 | FR-060 | BR-060 | None |

## Auditability Requirements

| NFR ID | NFR Name | Category | Requirement Statement | Rationale | Measurement / Acceptance Criteria | Related Architecture Section | Related Risk | Related Module | Related Use Case ID | Related FR ID | Related Business Rule ID | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFR-017 | Evidence report hashing | Traceability | Accepted MVP repository scan evidence report must include `report_hash`. | Detect scanner result tampering and support provenance. | Scanner-generated `TechnicalEvidenceReport` cannot be `TECHNICAL_EVIDENCE_READY` without report_hash. | Evidence Report Contract | Repository scan result tampering | M05/M09 | UC-M09-04 | FR-056 | BR-069 | None |
| NFR-018 | Audit event immutability expectation | Auditability | Audit trail must be append-oriented with controlled correction model. | Preserve compliance trace. | Material audit events are not silently edited/deleted. | Audit Trail Architecture | Audit log tampering | M09 | UC-M09-01 | FR-053 | BR-067 | A3 |
| NFR-019 | Legal citation traceability | Traceability | Risk output must trace to legal rule_id, citation and version. | Prevent unsupported legal conclusions. | 100% critical classification outputs trace to rule_id. | Legal Corpus/RAG Architecture | Legal citation hallucination | M07 | UC-M07-03 | FR-045 | BR-050 | A2 |
| NFR-020 | Rule-backed classification | Compliance | Classification must be based on retrieved legal rules/citations, not unsupported LLM reasoning. | Maintain legal defensibility. | Unsupported legal conclusion is rejected, degraded or blocked. | Risk Classification Agent Boundary | LLM legal overclaim | M07 | UC-M07-02 | FR-044, FR-046 | BR-049, BR-051 | A2 |
| NFR-021 | Document overclaim prevention | Compliance | Generated documents and gap views must not overclaim risk, evidence or legal certainty. | Avoid misleading compliance output. | Final report blocked if evidence/citation/conflict prerequisites fail; gap view is not presented as final report. | Document Generation Architecture | Report overclaim | M08 | UC-M08-02, UC-M08-06 | FR-049, FR-068 | BR-063, BR-064, BR-079 | A2/A3 |
| NFR-026 | AI usage-flow traceability | Traceability | AIUsageFlow claims must trace to repository scan findings/evidence refs and must mark unclear fields explicitly. | Prevent risk classification from relying only on model/provider presence. | AIUsageFlow records evidence_refs for purpose/input/output/downstream action/affected subject claims; unclear usage creates confirmation/conflict instead of unsupported classification. | Multi-Agent System Architecture / Evidence Report Contract | Legal overclaim from AI presence-only detection | M05/M06/M07 | UC-M05-04, UC-M06-01, UC-M07-01 | FR-069, FR-070, FR-071, FR-072, FR-073 | BR-080, BR-081, BR-082, BR-083, BR-084 | A1/A2 |
| NFR-029 | Permission delegation auditability | Auditability | Post-MVP permission grants, revocations, delegated actions and denied actions must be auditable. | Preserve governance and explain access decisions. | Each grant/revoke/action stores actor, grantee, scope, permission_code, timestamp and status. | Audit Trail Architecture | Unauthorized Developer access | M02/M09 | UC-M02-05, UC-M02-06 | FR-016, FR-017, FR-078 | BR-090, BR-092 | A3/Post-MVP |
| NFR-030 | Role/permission revocation behavior | Security | Revoked Developer permission grants must stop new delegated actions and be reflected in audit. | Prevent stale access. | Revoked grant cannot be used for new repository scan, findings view or clarification task. | Role/Permission Module | Unauthorized Developer access | M02 | UC-M02-06 | FR-017, FR-078 | BR-092, BR-094 | A3/Post-MVP |

## Reliability, Performance, Maintainability, Scalability, Observability

| NFR ID | NFR Name | Category | Requirement Statement | Rationale | Measurement / Acceptance Criteria | Related Architecture Section | Related Risk | Related Module | Related Use Case ID | Related FR ID | Related Business Rule ID | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NFR-022 | Async workload reliability | Reliability | Scan, classification and document jobs must not depend on web request lifecycle completion. | Avoid timeout and partial workflow state. | Long-running jobs have status and failure reason. | Queue/Job System | Stuck workflow | M04/M05/M07/M08 | UC-M04-08, UC-M05-03, UC-M07-02, UC-M08-02 | FR-066, FR-033, FR-044, FR-049 | BR-077, BR-040, BR-066 | None |
| NFR-023 | Evidence gate observability | Observability | Evidence gate failures must be visible with actionable reason. | Help Manager/Developer recover. | Rejected/insufficient states show reason and next action. | Evidence Gate Architecture | Operational opacity | M05 | UC-M05-05 | FR-035 | BR-040 | A1 |
| NFR-024 | Modular maintainability | Maintainability | MVP architecture must keep modules separable under modular monolith. | Preserve migration path without premature microservices. | Module ownership and dependencies documented. | Module Decomposition | Premature coupling | All | None | None | None | None |
| NFR-025 | Worker scalability path | Scalability | Scanner/agent/document workloads must remain separable from API runtime. | Allow future scale and source handling isolation. | Python worker boundary remains explicit in architecture. | ADR-002 | Workload contention/source risk | M05/M07/M08/M10 | UC-M05-04, UC-M07-02, UC-M08-02 | FR-034, FR-044, FR-049 | BR-060 | None |

## NFR Acceptance Criteria

- No NFR uses category-prefixed IDs.
- MFA-related NFRs cover secret protection, OTP security, brute-force protection, session security, auditability and recovery/reset.
- OAuth/OIDC NFRs cover callback validation, safe identity linking, token secrecy, session/MFA policy and separation from GitHub App repository access.
- Manager super-role NFR ensures Manager can complete MVP flow without Developer assignment.
- Post-MVP delegation NFRs require scoped, revocable and audited Developer permissions.
- Source/privacy NFRs keep raw source out of LLM and long-term storage.
- AI usage-flow traceability requires evidence refs and prevents model/provider-only risk classification.
- A1-A3 dependent NFRs remain conditional until validation results exist.

## Phase 3.2 NFR Quality Audit References

The Phase 3.2 quality-audit pack maps the existing NFRs above to quality gates, control verification and evidence plans. It does not introduce new NFR IDs and does not change MVP scope or readiness status.

| Phase 3.2 Document | Related NFR Focus |
| --- | --- |
| `docs/qa/nfr-quality-audit.md` | NFR-001..NFR-032 quality-attribute review and status classification |
| `docs/qa/nfr-acceptance-gates.md` | NFR-GATE-01..NFR-GATE-15 go/no-go gates |
| `docs/qa/security-privacy-control-verification.md` | NFR-001..NFR-009, NFR-012..NFR-016, NFR-027..NFR-032 |
| `docs/qa/reliability-resilience-quality-design.md` | NFR-017..NFR-023, NFR-025, NFR-026 |
| `docs/qa/performance-capacity-quality-design.md` | NFR-022, NFR-025 and performance/capacity threshold decisions |
| `docs/qa/observability-operational-readiness-audit.md` | NFR-007, NFR-017, NFR-018, NFR-022, NFR-023, NFR-026 |
| `docs/qa/accessibility-usability-nfr-review.md` | NFR-010, NFR-011, NFR-021, NFR-026, NFR-032 |
| `docs/qa/nfr-measurement-and-evidence-plan.md` | Evidence collection and redaction plan for all NFR gates |
