# LCSP Business Rules Specification

## Purpose

Tài liệu này chuẩn hóa business rules cho LCSP ở mức analysis/design trước implementation. Business rules bao gồm rule truyền thống của web/compliance platform và guardrail đặc thù LCSP. Đây không phải backlog.

## Scope

Áp dụng cho Authentication, Organization, Role/Permission, Assessment lifecycle, Wizard, Evidence, Reconciliation, Scoring, Classification, Legal citation, Human Attestation, Report, Audit, Security/Privacy và Notification/Task.

## Business Rule Categories

1. Account & Authentication Rules
2. MFA / Authenticator App Rules
3. Organization & Membership Rules
4. Role & Permission Rules
5. Assessment Lifecycle Rules
6. Wizard Rules
7. Evidence Collection Rules
8. Evidence Gate Rules
9. Reconciliation Rules
10. Scoring Rules
11. Risk Classification Rules
12. Legal Rule & Citation Rules
13. Human Attestation Rules
14. Report & Document Rules
15. Audit Trail Rules
16. Security & Privacy Rules
17. Notification / Task Rules

## Rule ID Convention

Business Rule ID dùng convention tuần tự toàn cục:

```text
BR-001
BR-002
BR-003
```

Không dùng prefix category; toàn bộ rule dùng ID tuần tự `BR-XXX`.

## Business Rule Summary Table

| Category | Rule Range |
| --- | --- |
| Account & Authentication Rules | BR-001..BR-005, BR-074..BR-076 |
| MFA / Authenticator App Rules | BR-006..BR-013 |
| Organization & Membership Rules | BR-014..BR-017 |
| Role & Permission Rules | BR-018..BR-022 |
| Assessment Lifecycle Rules | BR-023..BR-025 |
| Wizard Rules | BR-026..BR-031 |
| Evidence Collection Rules | BR-032..BR-035, BR-077 |
| Evidence Gate Rules | BR-036..BR-040 |
| Reconciliation Rules | BR-041..BR-047, BR-078 |
| Scoring Rules | BR-048 |
| Risk Classification Rules | BR-049 |
| Legal Rule & Citation Rules | BR-050..BR-051 |
| Human Attestation Rules | BR-052..BR-056 |
| Security & Privacy Rules | BR-057..BR-061 |
| Report & Document Rules | BR-062..BR-066, BR-079 |
| Audit Trail Rules | BR-067..BR-070 |
| Notification / Task Rules | BR-071..BR-073 |

## Detailed Business Rules by Category

| Rule ID | Rule Name | Rule Statement | Category | Rationale | Applies To | Enforcement Point | Exception | Related Use Case ID | Related Use Case Name | Related FR ID | Related NFR ID | Related State | Audit Event | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BR-001 | Password strength | Password-auth accounts must meet configured password strength policy. | Account & Authentication Rules | Reduce account compromise. | User/Auth | UI/API/Policy | Enterprise SSO may replace password auth. | UC-M01-01 | Register Account | FR-001 | NFR-001 | Any | USER_REGISTERED | Open Question |
| BR-002 | Email or invite identity validation | Account creation must verify email/invite identity before sensitive access. | Account & Authentication Rules | Prevent unauthorized tenant access. | User/Organization | API/Policy | SSO identity provider may own verification. | UC-M01-01 | Register Account | FR-001 | NFR-001 | Any | USER_REGISTERED | Open Question |
| BR-003 | Login attempt protection | Repeated failed login attempts must trigger rate limit or temporary lock. | Account & Authentication Rules | Prevent brute-force login. | User/Auth | API/Policy | SSO-managed failure handling if SSO used. | UC-M01-02 | Login | FR-002 | NFR-005 | Any | LOGIN_FAILED | None |
| BR-004 | Password reset token validity | Password reset token must be short-lived and single-use. | Account & Authentication Rules | Prevent reset abuse. | User/Auth | API/Policy | SSO-managed accounts redirect to IdP. | UC-M01-09 | Reset Password | FR-011 | NFR-001 | Any | PASSWORD_RESET_COMPLETED | Open Question |
| BR-005 | Session expiration | Authenticated sessions must expire after configured inactivity/absolute lifetime and be revocable. | Account & Authentication Rules | Limit stale access. | Session | API/Policy | None. | UC-M01-08 | Manage Session | FR-010 | NFR-004 | Any | SESSION_EXPIRED | None |
| BR-006 | MFA setup starts pending | MFA setup may start only for authenticated users and must remain pending until OTP verification succeeds. | MFA / Authenticator App Rules | Prevent half-enabled MFA state. | UserMfaMethod | UI/API | None. | UC-M01-04 | Setup MFA Using Authenticator App | FR-003 | NFR-002 | Any | MFA_SETUP_STARTED | None |
| BR-007 | MFA setup verification required | MFA setup is complete only when a valid Authenticator App OTP is verified. | MFA / Authenticator App Rules | Prevent unverified MFA enrollment. | UserMfaMethod | API/Policy | None. | UC-M01-05 | Verify MFA Code | FR-005 | NFR-003 | Any | MFA_ENABLED | None |
| BR-008 | MFA login required | MFA-enabled accounts must provide a valid Authenticator App OTP after password/identity verification before session creation. | MFA / Authenticator App Rules | Prevent MFA bypass. | User/Session | API/Policy | Trusted SSO MFA may be an explicit future enterprise decision. | UC-M01-10 | Login With MFA | FR-006 | NFR-003 | Any | MFA_LOGIN_SUCCESS | None |
| BR-009 | OTP validity and lockout | OTP codes are valid only for a short time window; repeated invalid OTP attempts must be rate-limited or temporarily locked. | MFA / Authenticator App Rules | Reduce OTP brute force. | UserMfaMethod | API/Policy | None. | UC-M01-05 | Verify MFA Code | FR-007 | NFR-003, NFR-005 | Any | MFA_LOGIN_FAILED | None |
| BR-010 | Disable MFA requires re-authentication | Disabling MFA requires recent re-authentication and valid OTP verification. | MFA / Authenticator App Rules | Prevent attacker disabling MFA after session hijack. | UserMfaMethod | UI/API/Policy | Recovery flow uses BR-012/BR-013. | UC-M01-06 | Disable MFA | FR-008 | NFR-006 | Any | MFA_DISABLED | None |
| BR-011 | MFA secret protection | MFA setup secret must not be stored or logged in plaintext. | MFA / Authenticator App Rules | Protect OTP seed. | UserMfaMethod | API/DB/Logging | None. | UC-M01-04 | Setup MFA Using Authenticator App | FR-004 | NFR-002 | Any | MFA_SETUP_STARTED | None |
| BR-012 | MFA reset recovery verification | MFA reset requires Manager/admin recovery policy or support/admin verification defined for MVP. | MFA / Authenticator App Rules | Prevent recovery bypass. | UserMfaMethod | Policy/API | Open until recovery owner is finalized. | UC-M01-07 | Reset MFA | FR-009 | NFR-006 | Any | MFA_RESET_REQUESTED | Open Question |
| BR-013 | MFA recovery cannot bypass authentication policy | Recovery flow cannot grant assessment access without completing approved identity verification and session policy. | MFA / Authenticator App Rules | Maintain account security. | User/Session | Policy/API | None. | UC-M01-07 | Reset MFA | FR-009 | NFR-006 | Any | MFA_RESET_COMPLETED | Open Question |
| BR-014 | Organization required | A user must belong to an organization before creating or joining assessments. | Organization & Membership Rules | Tenant isolation. | User/Organization | API/DB policy | Future platform admin out of MVP. | UC-M02-01 | Create Organization | FR-012 | None | Any | ORGANIZATION_CREATED | None |
| BR-015 | Organization member boundary | Organization membership changes must remain inside organization boundary. | Organization & Membership Rules | Prevent cross-tenant leakage. | Organization/User | API/DB policy | None. | UC-M02-02 | Manage Organization Members | FR-013 | None | Any | ORG_MEMBER_UPDATED | None |
| BR-016 | Manager role assignment | Only valid organization members may receive Manager role. | Organization & Membership Rules | Keep ownership accountable. | AssessmentMember | API/Policy | Future admin role TBD. | UC-M02-03 | Assign Manager Role | FR-014 | None | Any | ROLE_ASSIGNED | None |
| BR-017 | Developer invite scope | Developer invite is scoped to a specific organization and assessment. | Organization & Membership Rules | Prevent broad access. | AssessmentMember | UI/API | None. | UC-M02-04 | Invite Developer | FR-015 | None | DEVELOPER_INVITED | DEVELOPER_INVITED | None |
| BR-018 | Manager assessment ownership | Manager owns assessment and business/legal truth. | Role & Permission Rules | Clear accountability. | Manager/Assessment | UI/API/Policy | State gates can restrict final actions. | UC-M03-01 | Create Assessment | FR-018 | NFR-008 | Any | PERMISSION_CHECKED | None |
| BR-019 | Developer no Manager permissions | Developer cannot approve VerifiedProfile, generate final report, edit Manager-only business/legal answers, invite users or change Manager decisions. | Role & Permission Rules | Preserve role separation. | Developer | UI/API/Policy | Explicit Manager-granted technical policy only. | UC-M04-01 | Accept Developer Task | FR-024 | NFR-008 | Any | UNAUTHORIZED_ACTION_BLOCKED | A3 |
| BR-020 | Manager invites Developer | Only Manager can invite Developer into assessment in MVP. | Role & Permission Rules | Assessment owner controls participation. | Manager/Developer | UI/API | Future admin role TBD. | UC-M02-04 | Invite Developer | FR-015 | None | DEVELOPER_INVITED | DEVELOPER_INVITED | None |
| BR-021 | Developer policy scope | Developer may act only on policies assigned by Manager. | Role & Permission Rules | Least privilege. | DeveloperPolicy | UI/API/Policy | None. | UC-M02-05 | Assign Developer Policy | FR-016 | NFR-009 | Any | DEVELOPER_POLICY_ASSIGNED | A3 |
| BR-022 | Developer access revocation | Manager may revoke Developer access; revoked Developer cannot perform new actions. | Role & Permission Rules | Access lifecycle control. | DeveloperPolicy | UI/API | Active async job handling remains architecture question. | UC-M02-06 | Revoke Developer Access | FR-017 | NFR-009 | Any | DEVELOPER_ACCESS_REVOKED | A3 |
| BR-023 | Assessment initial state | New assessment starts in `WIZARD_IN_PROGRESS`. | Assessment Lifecycle Rules | State consistency. | Assessment | API/DB | None. | UC-M03-01 | Create Assessment | FR-018 | None | WIZARD_IN_PROGRESS | ASSESSMENT_CREATED | None |
| BR-024 | Assessment state transition guard | Assessment state must follow documented state machine. | Assessment Lifecycle Rules | Prevent gate bypass. | Assessment | API/Worker | Admin repair flow TBD. | UC-M09-01 | Write Audit Event | FR-053 | NFR-018 | Any | STATE_CHANGED | None |
| BR-025 | Conflict lock | Assessment with unresolved material/critical conflict cannot reach final report. | Assessment Lifecycle Rules | Prevent unsafe output. | Assessment/Conflict | API/Worker | Readiness-only export may still be allowed. | UC-M08-02 | Generate Compliance Report | FR-049 | NFR-021 | BLOCKED_BY_CONFLICT | REPORT_BLOCKED | A3 |
| BR-026 | Wizard critical fields | Wizard must capture purpose, sector, data type, user group, user impact, decision role, human oversight and external LLM usage. | Wizard Rules | Reconciliation/classification depends on business context. | WizardProfile | UI/API | Unknown value may be allowed but creates readiness gap. | UC-M03-02 | Fill Web Wizard | FR-019, FR-021 | NFR-010 | WIZARD_IN_PROGRESS | WIZARD_PROGRESS_SAVED | A1 |
| BR-027 | Wizard business language | Wizard questions must use Manager-readable business/legal language, not code terminology. | Wizard Rules | Avoid requiring Developer to complete Manager truth. | Wizard UI | UI/Content | Technical examples may be hidden behind help text. | UC-M03-02 | Fill Web Wizard | FR-019 | NFR-010 | WIZARD_IN_PROGRESS | WIZARD_PROGRESS_SAVED | A1 |
| BR-028 | Wizard draft save | Wizard progress can be saved without creating risk classification. | Wizard Rules | Support completion without false risk. | WizardProfile | UI/API | None. | UC-M03-03 | Save Wizard Progress | FR-020 | NFR-010 | WIZARD_IN_PROGRESS | WIZARD_PROGRESS_SAVED | A1 |
| BR-029 | WizardProfile submission | Submitted WizardProfile must map important questions to structured fields. | Wizard Rules | Enable reconciliation. | WizardProfile | API/DB | Unknown values are explicit. | UC-M03-04 | Submit WizardProfile | FR-021 | NFR-010 | TECHNICAL_EVIDENCE_REQUIRED | WIZARD_PROFILE_SUBMITTED | A1 |
| BR-030 | Wizard-only no risk level | Wizard-only output may show `SELF_DECLARED_READINESS`, readiness checklist and preliminary indicators only; it must not show HIGH/MEDIUM/LOW or provisional risk label. | Wizard Rules | Preserve evidence-based positioning. | Manager UI | UI/API | None. | UC-M03-05 | View Self-Declared Readiness | FR-022, FR-023 | NFR-011 | TECHNICAL_EVIDENCE_REQUIRED | READINESS_VIEWED | A1 |
| BR-031 | Progressive disclosure | Complex Wizard questions should use progressive disclosure and examples. | Wizard Rules | Improve completion without oversimplifying. | Wizard UI | UI/Content | Exact copy depends on A1 validation. | UC-M03-02 | Fill Web Wizard | FR-019 | NFR-010 | WIZARD_IN_PROGRESS | WIZARD_HELP_VIEWED | A1 |
| BR-032 | GitHub read-only evidence path | GitHub App scan must use read-only selected repository/scope. | Evidence Collection Rules | Default MVP path with limited permission. | GitHub Integration | API/GitHub App | Local/CI path available. | UC-M04-02 | Connect GitHub Repository | FR-025 | NFR-014 | EVIDENCE_COLLECTION_IN_PROGRESS | GITHUB_REPOSITORY_CONNECTED | None |
| BR-033 | Local/CI report metadata | Local/CI scanner report must include required provenance and scanner metadata. | Evidence Collection Rules | Enterprise-safe evidence must be comparable. | TechnicalEvidenceReport | API/Gate | Missing required fields rejected. | UC-M04-03 | Upload Local/CI Scanner Report | FR-026 | NFR-017 | EVIDENCE_COLLECTION_IN_PROGRESS | EVIDENCE_REPORT_UPLOADED | None |
| BR-034 | Manual JSON structure | Manual technical evidence JSON must conform to evidence schema; free text cannot unlock classification. | Evidence Collection Rules | Prevent weak evidence bypass. | TechnicalEvidenceReport | API/Gate | None. | UC-M04-04 | Upload Manual Technical Evidence JSON | FR-027 | None | EVIDENCE_COLLECTION_IN_PROGRESS | MANUAL_EVIDENCE_UPLOADED | A3 |
| BR-035 | Technical finding visibility | Developer can view findings only when granted `VIEW_TECHNICAL_FINDINGS`. | Evidence Collection Rules | Policy-scoped visibility. | EvidenceFinding | UI/API | Manager retains progress view. | UC-M04-05 | Review Technical Findings | FR-028 | NFR-009 | TECHNICAL_EVIDENCE_READY | TECHNICAL_FINDINGS_REVIEWED | None |
| BR-036 | Schema completeness gate | Schema completeness gate accepts or rejects evidence report based on required fields. | Evidence Gate Rules | Ensure reliable contract. | EvidenceGateResult | Worker/API | None. | UC-M05-01 | Validate Evidence Schema | FR-031 | NFR-017 | TECHNICAL_EVIDENCE_REJECTED | EVIDENCE_SCHEMA_VALIDATED | None |
| BR-037 | Privacy flags gate | Privacy flags must prove no raw source to LLM and no long-term raw source storage. | Evidence Gate Rules | Enforce privacy boundary. | TechnicalEvidenceReport | Worker/API | None. | UC-M05-02 | Validate Privacy Flags | FR-032 | NFR-012, NFR-013 | TECHNICAL_EVIDENCE_REJECTED | PRIVACY_FLAGS_VALIDATED | None |
| BR-038 | Quality threshold gate | Quality threshold gate determines whether evidence is insufficient or ready for reconciliation. | Evidence Gate Rules | Avoid weak evidence classification. | EvidenceGateResult | Worker | Thresholds remain validation/tuning item. | UC-M05-03 | Evaluate Evidence Quality | FR-033 | NFR-023 | TECHNICAL_EVIDENCE_INSUFFICIENT | EVIDENCE_QUALITY_EVALUATED | A1 |
| BR-039 | TechnicalProfile from accepted evidence | TechnicalProfile may be generated only from accepted normalized technical evidence. | Evidence Gate Rules | Prevent untrusted technical profile. | TechnicalProfile | Worker | Unknown fields allowed but explicit. | UC-M05-04 | Generate TechnicalProfile | FR-034 | None | TECHNICAL_EVIDENCE_READY | TECHNICAL_PROFILE_GENERATED | None |
| BR-040 | Evidence status actionability | Evidence rejected/insufficient/ready status must include actionable reason. | Evidence Gate Rules | Help recovery. | EvidenceGateResult | UI/API | None. | UC-M05-05 | Mark Evidence as Rejected, Insufficient, or Ready | FR-035 | NFR-023 | TECHNICAL_EVIDENCE_REJECTED | EVIDENCE_STATUS_CHANGED | A1 |
| BR-041 | Conflict creation | Conflict is created when WizardProfile and TechnicalProfile materially disagree or critical data is missing. | Reconciliation Rules | Make disagreement explicit. | Conflict | Reconciliation Service | No conflict path continues. | UC-M06-01 | Detect Conflict | FR-036 | None | RECONCILIATION_REQUIRED | CONFLICT_CREATED | A1/A3 |
| BR-042 | Technical conflict owner | Technical truth conflicts route to Developer. | Reconciliation Rules | Developer owns technical truth. | Conflict | Workflow/Policy | If no Developer assigned, Manager must invite/assign. | UC-M06-04 | Resolve Technical Conflict | FR-038, FR-039 | NFR-009 | DEVELOPER_CONFIRMATION_REQUIRED | CONFLICT_ROUTED | A3 |
| BR-043 | Business/legal conflict owner | Business/legal meaning conflicts route to Manager. | Reconciliation Rules | Manager owns business/legal truth. | Conflict | Workflow/Policy | None. | UC-M06-05 | Resolve Business/Legal Conflict | FR-038, FR-040 | NFR-008 | MANAGER_CONFIRMATION_REQUIRED | BUSINESS_CONFLICT_RESOLVED | A3 |
| BR-044 | Material conflict dual confirmation | Material/critical conflicts require Manager and Developer confirmation. | Reconciliation Rules | Prevent one-sided resolution. | ConflictResolution | Workflow/Policy | None. | UC-M06-06 | Perform Dual Confirmation | FR-041 | NFR-018 | BLOCKED_BY_CONFLICT | DUAL_CONFIRMATION_COMPLETED | A3 |
| BR-045 | VerifiedProfile creation gate | VerifiedProfile is created only after evidence is ready, conflicts resolved and required confirmations exist. | Reconciliation Rules | Risk classification depends on verified facts. | VerifiedProfile | Worker/API | None. | UC-M06-07 | Create VerifiedProfile | FR-042 | None | VERIFIED_PROFILE_READY | VERIFIED_PROFILE_CREATED | A1/A3 |
| BR-046 | Developer technical confirmation scope | Developer can confirm technical truth only within assigned policy/task scope. | Reconciliation Rules | Prevent overbroad attestation. | Developer/Conflict | UI/API/Policy | None. | UC-M04-06 | Confirm Technical Truth | FR-029 | NFR-009 | DEVELOPER_CONFIRMATION_REQUIRED | TECHNICAL_TRUTH_CONFIRMED | A3 |
| BR-047 | Manager cannot replace technical truth | Manager cannot resolve technical truth alone or replace evidence with business/legal assertion. | Reconciliation Rules | Preserve technical evidence integrity. | Manager/Conflict | UI/API/Policy | Manager resolves meaning/context. | UC-M06-05 | Resolve Business/Legal Conflict | FR-040 | NFR-008 | MANAGER_CONFIRMATION_REQUIRED | UNAUTHORIZED_ACTION_BLOCKED | A3 |
| BR-048 | Conflict Score only blocking score | Only Conflict Score can block workflow; Evidence Confidence Score and AI Intervention Score are supporting signals. | Scoring Rules | Avoid hidden blockers and preserve product decision. | Scoring Module | Worker/Workflow | Gate statuses can block by state, but not by supporting scores alone. | UC-M06-02 | Calculate Conflict Score | FR-037 | None | BLOCKED_BY_CONFLICT | CONFLICT_SCORE_CALCULATED | A1/A3 |
| BR-049 | Classification after VerifiedProfile | Risk Classification Agent may run only after VerifiedProfile exists and prerequisite gates pass. | Risk Classification Rules | No evidence/verified facts, no risk level. | Classification | API/Worker/Agent | None. | UC-M07-02 | Run Risk Classification Agent | FR-044, FR-047 | NFR-020 | READY_FOR_CLASSIFICATION | RISK_CLASSIFICATION_RUN | A2 |
| BR-050 | Legal rule trace required | Critical classification outputs must trace to `rule_id`, legal source, citation, version and effective date if available. | Legal Rule & Citation Rules | Legal defensibility. | LegalRule/LegalCitation | RAG/Agent/API | None for critical outputs. | UC-M07-03 | Trace Classification to Legal Rule | FR-043, FR-045 | NFR-019 | READY_FOR_CLASSIFICATION | CLASSIFICATION_TRACE_RECORDED | A2 |
| BR-051 | Unsupported legal conclusion blocked | LLM must not create legal conclusion without retrieved legal rule/citation; missing critical citation blocks final classification. | Legal Rule & Citation Rules | Prevent hallucinated legal basis. | Agent/RAG | Agent Guardrail | Non-critical advisory may be degraded. | UC-M07-04 | Block or Degrade Classification if Citation Missing | FR-046 | NFR-020 | READY_FOR_CLASSIFICATION | CLASSIFICATION_BLOCKED_OR_DEGRADED | A2 |
| BR-052 | Attestation schema required | Human attestation must include role, claim, reason, scope, timestamp and assessment id. | Human Attestation Rules | Prevent vague claims. | HumanAttestation | UI/API | None. | UC-M04-07 | Provide Structured Technical Attestation | FR-030 | None | DEVELOPER_CONFIRMATION_REQUIRED | HUMAN_ATTESTATION_SUBMITTED | A3 |
| BR-053 | Role-bound attestation claims | Manager can confirm business/legal meaning; Developer can confirm technical truth. | Human Attestation Rules | Preserve truth ownership. | HumanAttestation | UI/API/Policy | Dual confirmation for critical claims. | UC-M04-07 | Provide Structured Technical Attestation | FR-030 | NFR-008 | Any | HUMAN_ATTESTATION_SUBMITTED | A3 |
| BR-054 | Critical attestation dual confirmation | Critical attestation claims require dual confirmation from Manager and Developer. | Human Attestation Rules | Prevent attestation bypass. | HumanAttestation | Workflow/Policy | None. | UC-M06-06 | Perform Dual Confirmation | FR-041 | NFR-018 | BLOCKED_BY_CONFLICT | DUAL_CONFIRMATION_COMPLETED | A3 |
| BR-055 | Attestation usage disclosure | Report and audit trail must disclose when classification uses human attestation. | Human Attestation Rules | Transparency. | HumanAttestation/Report | Document/Audit | None. | UC-M09-05 | Track Human Attestation Usage | FR-057 | NFR-018 | REPORT_READY | ATTESTATION_USAGE_RECORDED | A3 |
| BR-056 | Attestation cannot replace metadata | Human attestation cannot replace report hash, scanner version, ruleset version, scan timestamp, repo/commit metadata, legal corpus version, evidence report integrity or machine-generated privacy flags. | Human Attestation Rules | Prevent weak evidence bypass. | HumanAttestation | API/Gate | None. | UC-M04-07 | Provide Structured Technical Attestation | FR-030 | NFR-017 | Any | ATTESTATION_REJECTED | A3 |
| BR-057 | No raw source to LLM | Raw source code must never be sent to LLM Provider. | Security & Privacy Rules | Protect source confidentiality. | Scanner/Agent | Worker/Agent Guardrail | None. | UC-M10-04 | Enforce No Raw Source to LLM | FR-058, FR-061 | NFR-012 | Any | LLM_INPUT_GUARD_APPLIED | None |
| BR-058 | No long-term raw source storage | Raw source code must not be persisted long-term. | Security & Privacy Rules | Enterprise privacy requirement. | Worker/Storage | Worker/DB/Object Storage | Temporary workspace during scan only. | UC-M10-05 | Enforce No Long-Term Raw Source Storage | FR-058, FR-062 | NFR-013 | Any | RAW_SOURCE_STORAGE_GUARD_APPLIED | None |
| BR-059 | Secret redaction required | Secrets must be redacted before persistence, logs, findings, reports or audit. | Security & Privacy Rules | Prevent secret leakage. | Scanner/Worker | Worker/API | Secret type metadata may be stored without value. | UC-M10-02 | Redact Secrets | FR-059 | NFR-015 | Any | SECRET_REDACTION_COMPLETED | None |
| BR-060 | Temporary workspace cleanup | Temporary scanner workspace must be deleted after scan success/failure. | Security & Privacy Rules | Avoid source retention. | Worker | Worker | Cleanup failure must be audited and retried. | UC-M10-03 | Clean Temporary Workspace | FR-060 | NFR-016 | Any | TEMP_WORKSPACE_CLEANED | None |
| BR-061 | Evidence-only persistence | Persistent records store normalized evidence, metadata, refs and hashes, not raw code. | Security & Privacy Rules | Minimize sensitive data retention. | DB/Object Storage | API/Worker | None. | UC-M10-01 | Enforce Source Code Privacy Policy | FR-058 | NFR-013 | Any | SOURCE_PRIVACY_POLICY_ENFORCED | None |
| BR-062 | Gap analysis after classification | Gap analysis runs only after valid classification result exists. | Report & Document Rules | Avoid gaps based on unverified risk. | GapAnalysisResult | Agent/Worker | None. | UC-M08-01 | Run Gap Analysis Agent | FR-048 | NFR-020 | CLASSIFICATION_COMPLETED | GAP_ANALYSIS_RUN | A2 |
| BR-063 | Final report gate | Final compliance report requires valid classification, gap analysis, evidence/rule trace and no unresolved material/critical conflict. | Report & Document Rules | Prevent overclaim. | ComplianceDocument | API/Worker | Readiness-only export allowed. | UC-M08-02 | Generate Compliance Report | FR-049 | NFR-021 | REPORT_READY | COMPLIANCE_REPORT_GENERATED | A2/A3 |
| BR-064 | Report evidence and legal basis disclosure | Final report must include evidence sources, classification basis, legal citations and attestation usage when applicable. | Report & Document Rules | Traceability. | ComplianceDocument | Document Generator | None. | UC-M08-02 | Generate Compliance Report | FR-049 | NFR-019, NFR-021 | REPORT_READY | COMPLIANCE_REPORT_GENERATED | A2/A3 |
| BR-065 | Readiness-only export limits | Readiness-only export can be generated without technical evidence but must not include risk level. | Report & Document Rules | Preserve evidence-first principle. | ComplianceDocument | Document Generator | None. | UC-M08-03 | Generate Readiness-Only Export | FR-050 | NFR-011 | TECHNICAL_EVIDENCE_REQUIRED | READINESS_EXPORT_GENERATED | A1 |
| BR-066 | Document status visibility | Document generation status must show pending, ready, blocked or failed with reason. | Report & Document Rules | Operational clarity. | ComplianceDocument | UI/API | None. | UC-M08-04 | View Document Status | FR-051, FR-052 | NFR-022 | REPORT_READY | DOCUMENT_STATUS_VIEWED | None |
| BR-067 | Audit material events | Material security, workflow, evidence, conflict, attestation, classification and document events must be audited. | Audit Trail Rules | Compliance traceability. | AuditEvent | API/Worker/Audit | None. | UC-M09-01 | Write Audit Event | FR-053 | NFR-007, NFR-018 | Any | AUDIT_EVENT_WRITTEN | A3 |
| BR-068 | Audit export excludes raw source | Audit view/export must include metadata and hashes but never raw source code. | Audit Trail Rules | Protect sensitive source. | AuditEvent | UI/API | None. | UC-M09-03 | Export Audit Trail | FR-054, FR-055 | NFR-012, NFR-018 | Any | AUDIT_TRAIL_EXPORTED | A3 |
| BR-069 | Artifact version tracking | Evidence, report, document and legal corpus versions must be tracked. | Audit Trail Rules | Reproducibility. | AuditEvent/Artifact | API/Worker | None. | UC-M09-04 | Track Evidence, Report, and Document Version | FR-056 | NFR-017, NFR-019 | Any | ARTIFACT_VERSION_RECORDED | A2/A3 |
| BR-070 | Attestation audit trail | Human attestation and usage must be audit-visible. | Audit Trail Rules | Prevent hidden attestation bypass. | HumanAttestation/AuditEvent | API/Audit | None. | UC-M09-05 | Track Human Attestation Usage | FR-057 | NFR-018 | Any | ATTESTATION_USAGE_RECORDED | A3 |
| BR-071 | Developer task notification | Developer receives task notification only for assigned assessment/policy. | Notification / Task Rules | Avoid overexposure. | DeveloperTask | Notification/UI | Notification channel TBD. | UC-M04-01 | Accept Developer Task | FR-024 | NFR-009 | DEVELOPER_INVITED | DEVELOPER_TASK_CREATED | None |
| BR-072 | Conflict notification | Manager/Developer are notified when a conflict requires their role-specific action. | Notification / Task Rules | Keep reconciliation moving. | Conflict | Workflow/Notification | Channel TBD. | UC-M06-03 | Route Conflict to Manager or Developer | FR-038 | None | RECONCILIATION_REQUIRED | CONFLICT_ROUTED | A3 |
| BR-073 | Blocked state notification | Manager is notified when classification/report remains blocked by evidence, conflict or citation issue. | Notification / Task Rules | Improve recovery. | Assessment | UI/Notification | Channel TBD. | UC-M07-04 | Block or Degrade Classification if Citation Missing | FR-046 | NFR-011 | BLOCKED_BY_CONFLICT | WORKFLOW_BLOCKED | A1/A2/A3 |
| BR-074 | Email verification gate | Password-auth accounts that require email verification must not receive sensitive workspace access until a valid verification token is accepted. | Account & Authentication Rules | Prevent unverified account access. | User/Auth | UI/API/Policy | Enterprise identity provider may own verification. | UC-M01-11 | Verify Email | FR-063 | NFR-001 | Any | EMAIL_VERIFIED | Open Question |
| BR-075 | Password change re-authentication | Password change requires current password or recent re-authentication and a new password that passes policy. | Account & Authentication Rules | Prevent credential takeover after session compromise. | User/Auth | UI/API/Policy | SSO-managed accounts redirect to IdP. | UC-M01-12 | Change Password | FR-064 | NFR-001 | Any | PASSWORD_CHANGED | Open Question |
| BR-076 | Profile cannot change permissions | Personal profile updates cannot change organization role, Developer policy, assessment ownership or security-sensitive account state. | Account & Authentication Rules | Keep profile edits separate from permission management. | User/Profile | UI/API/Policy | Email change may require Verify Email flow if scoped. | UC-M01-13 | Manage Personal Profile | FR-065 | NFR-008 | Any | PROFILE_UPDATED | Open Question |
| BR-077 | Repository scan requires RUN_SCAN policy | Developer may run or re-run repository scan only when assigned `RUN_SCAN` policy and a valid repo/branch/commit scope exists. | Evidence Collection Rules | Prevent unauthorized scan and preserve task policy isolation. | DeveloperPolicy/Scanner | UI/API/Worker/Policy | Local/CI or manual upload remains alternative evidence path. | UC-M04-08 | Run Repository Scan | FR-066 | NFR-009, NFR-014, NFR-022 | EVIDENCE_COLLECTION_IN_PROGRESS | REPOSITORY_SCAN_STARTED | None |
| BR-078 | Manager approval of VerifiedProfile | Approved VerifiedProfile requires Manager review after reconciliation; approval is blocked if material/critical conflict or required Developer confirmation is unresolved. | Reconciliation Rules | Make Manager ownership explicit before classification. | VerifiedProfile/Assessment | UI/API/Workflow | Manager cannot approve technical truth alone. | UC-M06-08 | Review and Approve VerifiedProfile | FR-067 | NFR-008, NFR-018 | VERIFIED_PROFILE_READY | VERIFIED_PROFILE_APPROVED | A1/A3 |
| BR-079 | Gap Analysis view requires valid basis | Manager may view GapAnalysisResult only when generated from valid or explicitly degraded classification with evidence/legal basis; it must not be presented as final report. | Report & Document Rules | Prevent overclaim and distinguish analysis from final document. | GapAnalysisResult | UI/API | Locked state shown if classification basis is missing. | UC-M08-06 | View Gap Analysis | FR-068 | NFR-019, NFR-021 | CLASSIFICATION_COMPLETED | GAP_ANALYSIS_VIEWED | A2 |

## Rule-to-Use-Case Traceability

Primary rule-to-use-case mapping is embedded in the detailed rule table. Full cross-matrix is maintained in `docs/design/traceability-matrix.md`.

## Rule-to-Requirement Traceability

Every rule that constrains a functional behavior references a valid `FR-XXX`. Cross-cutting policies may reference `None` only when no single FR owns the rule.

## Rule-to-State Traceability

State-sensitive rules include `Related State`. State machine source remains `docs/specs/state-machine.md`.

## Rule-to-Audit Traceability

Rules that affect access, evidence, classification, attestation, documents or security controls define an audit event. Audit event names are normalized in specs and QA docs.

## Validation Dependencies A1-A3

| Assumption | Affected Rule IDs | Impact |
| --- | --- | --- |
| A1 - Wizard simplicity vs completeness | BR-026..BR-031, BR-038, BR-040, BR-041, BR-045, BR-048, BR-065, BR-073, BR-078 | WizardProfile fields, evidence quality, reconciliation and readiness-only behavior may change |
| A2 - Legal corpus / rule reliability | BR-049..BR-051, BR-062..BR-064, BR-069, BR-073, BR-079 | Legal rule/citation contract and report/classification finality may change |
| A3 - Human attestation abuse risk | BR-019, BR-021, BR-022, BR-041..BR-047, BR-052..BR-056, BR-063, BR-064, BR-067..BR-070, BR-072, BR-073, BR-077, BR-078 | Permission, attestation schema, dual confirmation and audit rules may tighten |

## Open Business Rule Questions

| Area | Open Question |
| --- | --- |
| MFA recovery | MVP exposes only Manager/Developer, so support/admin recovery policy needs explicit operating decision before implementation backlog. |
| Password auth vs SSO | Technical specification does not finalize enterprise SSO vs password-first auth; rules keep password auth conditional where relevant. |
| A1 Wizard copy | Exact Wizard questions and progressive disclosure copy depend on validation result. |
| A2 legal corpus | Legal rule format and citation coverage depend on validation result. |
| A3 attestation | Critical claim catalog and dual-confirmation scope depend on validation result. |
