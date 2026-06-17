# LCSP Functional Requirements Specification

## Purpose

Tài liệu này chuẩn hóa Functional Requirements cho LCSP theo ID tuần tự toàn cục `FR-XXX`, đồng bộ với use case module grouping, business rules và validation A1-A3. Đây không phải backlog.

## Requirement Numbering Convention

| Artifact | Convention | Example |
| --- | --- | --- |
| Functional Requirement | `FR-XXX` | `FR-001` |
| Use Case | `UC-MXX-XX` | `UC-M03-02` |
| Business Rule | `BR-XXX` | `BR-030` |
| Non-Functional Requirement | `NFR-XXX` | `NFR-001` |

## Functional Requirement Summary

| Module | Range | Focus |
| --- | --- | --- |
| M01 - Authentication & Account Security | FR-001..FR-011, FR-063..FR-065 | Account, login, Authenticator App MFA, session, password reset, email verification, password/profile maintenance |
| M02 - Organization & Role Management | FR-012..FR-017 | Organization, members, Manager role, Developer invite/policy/revoke |
| M03 - Assessment Setup & Web Wizard | FR-018..FR-023 | Assessment, WizardProfile, self-declared readiness |
| M04 - Developer Task & Evidence Collection | FR-024..FR-030, FR-066 | Developer task, evidence modes, scan/re-scan, findings, attestation |
| M05 - Evidence Gates & Technical Profile | FR-031..FR-035 | Schema/privacy/quality gates, TechnicalProfile, evidence status |
| M06 - Reconciliation & VerifiedProfile | FR-036..FR-042, FR-067 | Conflict detection/routing/resolution, dual confirmation, VerifiedProfile approval |
| M07 - Risk Classification & Legal Rule Citation | FR-043..FR-047 | Legal retrieval, classification, citation trace, blocked/degraded behavior |
| M08 - Gap Analysis & Document Generation | FR-048..FR-052, FR-068 | Gap analysis, view gap result, final report, readiness-only export, document status/download |
| M09 - Audit Trail & Compliance Monitoring | FR-053..FR-057 | Audit events, export, artifact versioning, attestation usage |
| M10 - Security & Privacy Controls | FR-058..FR-062 | Source privacy, redaction, temp cleanup, LLM/source storage guardrails |

## Detailed Functional Requirements by Module

| Requirement ID | Requirement Name | Requirement Statement | Priority | Related Module | Related Use Case ID | Related Use Case Name | Related Business Rule ID | Acceptance Criteria | Validation Dependency |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| FR-001 | Register account | LCSP shall allow a Manager or Developer to register an account through an approved signup/invite path. | Must | M01 | UC-M01-01 | Register Account | BR-001 | Account is created only with valid identity fields and organization/invite context. | None |
| FR-002 | Login | LCSP shall authenticate users using password or approved enterprise identity path before allowing workspace access. | Must | M01 | UC-M01-02 | Login | BR-003 | Invalid login is rejected and successful login creates session or MFA challenge. | None |
| FR-003 | Enable Authenticator App MFA | LCSP shall allow a user to start MFA setup using an Authenticator App compatible with TOTP. | Must | M01 | UC-M01-04 | Setup MFA Using Authenticator App | BR-006 | Setup starts without enabling MFA until OTP verification succeeds. | None |
| FR-004 | Generate MFA setup secret or QR code | LCSP shall generate a setup secret/QR code for Authenticator App enrollment. | Must | M01 | UC-M01-04 | Setup MFA Using Authenticator App | BR-011 | Setup response provides QR/manual key reference and does not expose plaintext secret in persistent records. | None |
| FR-005 | Verify MFA setup code | LCSP shall require a valid OTP code before marking MFA as enabled. | Must | M01 | UC-M01-05 | Verify MFA Code | BR-007 | MFA remains disabled until OTP verification succeeds. | None |
| FR-006 | Login with MFA | LCSP shall require password plus valid MFA code when MFA is enabled for the user. | Must | M01 | UC-M01-10 | Login With MFA | BR-008 | MFA-enabled account cannot create active session without valid OTP. | None |
| FR-007 | Reject invalid or expired MFA code | LCSP shall reject invalid, expired, or replayed MFA codes and count failed attempts. | Must | M01 | UC-M01-05 | Verify MFA Code | BR-009 | Invalid OTP does not create session and triggers rate-limit/lock policy after repeated failures. | None |
| FR-008 | Disable MFA after re-authentication | LCSP shall allow MFA disablement only after re-authentication and valid MFA confirmation. | Should | M01 | UC-M01-06 | Disable MFA | BR-010 | MFA disable event is blocked without re-authentication. | None |
| FR-009 | Reset MFA under recovery policy | LCSP shall support MFA reset only through Manager/admin recovery policy or support/admin verification defined for MVP. | Should | M01 | UC-M01-07 | Reset MFA | BR-012 | Reset path is audited and cannot bypass authentication policy. | Open Question |
| FR-010 | Manage session | LCSP shall enforce session lifetime, refresh, logout and expiration behavior. | Must | M01 | UC-M01-08 | Manage Session | BR-005 | Expired or revoked sessions cannot access protected endpoints. | None |
| FR-011 | Reset password | LCSP shall provide password reset for password-auth accounts when in scope. | Should | M01 | UC-M01-09 | Reset Password | BR-004 | Reset requires valid token and creates audit event. | Open Question |
| FR-012 | Create organization | LCSP shall allow an authorized Manager to create an organization. | Must | M02 | UC-M02-01 | Create Organization | BR-014 | Organization is created with unique identity and ownership context. | None |
| FR-013 | Manage organization members | LCSP shall allow authorized Manager actions for organization membership within scope. | Should | M02 | UC-M02-02 | Manage Organization Members | BR-015 | Member changes are scoped to the organization and audited. | None |
| FR-014 | Assign Manager role | LCSP shall support assigning Manager role to a valid organization member. | Must | M02 | UC-M02-03 | Assign Manager Role | BR-016 | Only valid member can become Manager. | None |
| FR-015 | Invite Developer | LCSP shall allow Manager to invite Developer into a specific assessment context. | Must | M02 | UC-M02-04 | Invite Developer | BR-017 | Developer invitation does not grant Manager permissions. | None |
| FR-016 | Assign Developer policy | LCSP shall allow Manager to assign one or more Developer policies for an assessment. | Must | M02 | UC-M02-05 | Assign Developer Policy | BR-021 | Developer can only see and act within granted policies. | A3 |
| FR-017 | Revoke Developer access | LCSP shall allow Manager to revoke Developer assessment access/policies. | Should | M02 | UC-M02-06 | Revoke Developer Access | BR-022 | Revoked Developer cannot perform new actions on assessment. | A3 |
| FR-018 | Create assessment | LCSP shall allow Manager to create an assessment owned by Manager. | Must | M03 | UC-M03-01 | Create Assessment | BR-023 | Assessment starts in `WIZARD_IN_PROGRESS`. | None |
| FR-019 | Fill Web Wizard | LCSP shall provide Manager-facing Wizard questions in business/legal language. | Must | M03 | UC-M03-02 | Fill Web Wizard | BR-026 | Manager can answer without Developer in A1 validation scenarios. | A1 |
| FR-020 | Save Wizard progress | LCSP shall allow Wizard progress to be saved before submission. | Should | M03 | UC-M03-03 | Save Wizard Progress | BR-028 | Partial answers persist without creating risk level. | A1 |
| FR-021 | Submit WizardProfile | LCSP shall create WizardProfile from submitted Wizard answers. | Must | M03 | UC-M03-04 | Submit WizardProfile | BR-029 | Critical fields are captured: purpose, sector, data type, user group, user impact, decision role, human oversight, external LLM usage. | A1 |
| FR-022 | Show Self-Declared Readiness only | LCSP shall show `SELF_DECLARED_READINESS` when WizardProfile exists without technical evidence. | Must | M03 | UC-M03-05 | View Self-Declared Readiness | BR-030 | No HIGH/MEDIUM/LOW or provisional risk label appears. | A1 |
| FR-023 | Show preliminary indicators only | LCSP shall show preliminary indicators without risk labels before evidence gates pass. | Must | M03 | UC-M03-06 | View Preliminary Indicators | BR-030 | UI explains technical evidence is required before classification. | A1 |
| FR-024 | Accept Developer task | LCSP shall allow invited Developer to accept an assigned task. | Must | M04 | UC-M04-01 | Accept Developer Task | BR-021 | Developer sees only assigned task and limited context. | None |
| FR-025 | Connect GitHub repository | LCSP shall allow Developer to connect/select GitHub repository only when policy permits. | Must | M04 | UC-M04-02 | Connect GitHub Repository | BR-032 | GitHub App uses read-only selected repo/scope. | None |
| FR-026 | Upload Local/CI scanner report | LCSP shall allow Developer to upload Local/CI evidence report. | Must | M04 | UC-M04-03 | Upload Local/CI Scanner Report | BR-033 | Uploaded report enters evidence schema gate. | None |
| FR-027 | Upload manual technical evidence JSON | LCSP shall allow Developer to upload structured manual technical evidence JSON. | Should | M04 | UC-M04-04 | Upload Manual Technical Evidence JSON | BR-034 | Free text cannot unlock classification. | A3 |
| FR-028 | Review technical findings | LCSP shall allow Developer to view technical findings when policy permits. | Must | M04 | UC-M04-05 | Review Technical Findings | BR-035 | Findings show evidence refs and confidence, not raw source snippets. | None |
| FR-029 | Confirm technical truth | LCSP shall allow Developer to confirm technical truth for findings/conflicts. | Must | M04 | UC-M04-06 | Confirm Technical Truth | BR-046 | Developer cannot confirm business/legal meaning. | A3 |
| FR-030 | Provide structured technical attestation | LCSP shall allow Developer to submit schema-bound technical attestation within role scope. | Should | M04 | UC-M04-07 | Provide Structured Technical Attestation | BR-052 | Attestation includes role, claim, reason, scope and timestamp. | A3 |
| FR-031 | Validate evidence schema | LCSP shall validate required evidence report field groups. | Must | M05 | UC-M05-01 | Validate Evidence Schema | BR-036 | Missing required field rejects report. | None |
| FR-032 | Validate privacy flags | LCSP shall validate privacy flags and source handling metadata before accepting evidence. | Must | M05 | UC-M05-02 | Validate Privacy Flags | BR-037 | Raw source to LLM or long-term raw source storage is rejected. | None |
| FR-033 | Evaluate evidence quality | LCSP shall evaluate evidence quality threshold using Wizard context. | Must | M05 | UC-M05-03 | Evaluate Evidence Quality | BR-038 | Insufficient evidence does not unlock classification. | A1 |
| FR-034 | Generate TechnicalProfile | LCSP shall derive TechnicalProfile from accepted technical evidence. | Must | M05 | UC-M05-04 | Generate TechnicalProfile | BR-039 | TechnicalProfile is normalized and ready for reconciliation. | None |
| FR-035 | Mark evidence status | LCSP shall mark evidence as rejected, insufficient or ready based on gates. | Must | M05 | UC-M05-05 | Mark Evidence as Rejected, Insufficient, or Ready | BR-040 | Status uses `TECHNICAL_EVIDENCE_REJECTED`, `TECHNICAL_EVIDENCE_INSUFFICIENT`, or `TECHNICAL_EVIDENCE_READY`. | A1 |
| FR-036 | Detect conflict | LCSP shall compare WizardProfile and TechnicalProfile to detect conflicts. | Must | M06 | UC-M06-01 | Detect Conflict | BR-041 | Critical mismatch creates conflict record. | A1/A3 |
| FR-037 | Calculate Conflict Score | LCSP shall calculate Conflict Score for reconciliation conflicts. | Must | M06 | UC-M06-02 | Calculate Conflict Score | BR-048 | Conflict Score is persisted and can block workflow. | A1/A3 |
| FR-038 | Route conflict | LCSP shall route conflict to Manager and/or Developer based on ownership. | Must | M06 | UC-M06-03 | Route Conflict to Manager or Developer | BR-042 | Technical truth routes to Developer; business/legal meaning routes to Manager. | A3 |
| FR-039 | Resolve technical conflict | LCSP shall allow Developer to resolve technical conflicts in assigned scope. | Must | M06 | UC-M06-04 | Resolve Technical Conflict | BR-042 | Developer resolution cannot edit business/legal answers. | A3 |
| FR-040 | Resolve business/legal conflict | LCSP shall allow Manager to resolve business/legal conflicts. | Must | M06 | UC-M06-05 | Resolve Business/Legal Conflict | BR-043 | Manager resolution cannot replace technical evidence. | A3 |
| FR-041 | Perform dual confirmation | LCSP shall require both Manager and Developer confirmation for material/critical conflicts. | Must | M06 | UC-M06-06 | Perform Dual Confirmation | BR-044 | Single-role confirmation does not unblock material/critical conflict. | A3 |
| FR-042 | Create VerifiedProfile | LCSP shall create VerifiedProfile only after gates pass and conflicts are resolved. | Must | M06 | UC-M06-07 | Create VerifiedProfile | BR-045 | VerifiedProfile is not created with unresolved material/critical conflict. | A1/A3 |
| FR-043 | Retrieve legal rules/citations | LCSP shall retrieve versioned legal rules/citations for classification. | Must | M07 | UC-M07-01 | Retrieve Legal Rules/Citations | BR-050 | Critical rules include rule_id, source, citation, version and effective date if available. | A2 |
| FR-044 | Run Risk Classification Agent | LCSP shall run Risk Classification only after VerifiedProfile and legal rules are available. | Must | M07 | UC-M07-02 | Run Risk Classification Agent | BR-049 | Classification before VerifiedProfile is rejected. | A2 |
| FR-045 | Trace classification to legal rule | LCSP shall trace classification output to legal rule_id and citation. | Must | M07 | UC-M07-03 | Trace Classification to Legal Rule | BR-050 | 100% critical outputs trace to rule_id. | A2 |
| FR-046 | Block/degrade classification without citation | LCSP shall block or degrade classification when required legal citation/rule is missing. | Must | M07 | UC-M07-04 | Block or Degrade Classification if Citation Missing | BR-051 | LLM cannot create unsupported legal conclusion. | A2 |
| FR-047 | View classification result | LCSP shall allow Manager to view classification result only when classification is valid or explicitly degraded. | Must | M07 | UC-M07-05 | View Classification Result | BR-049 | Wizard-only never shows HIGH/MEDIUM/LOW. | A2 |
| FR-048 | Run gap analysis | LCSP shall generate gap analysis from valid risk classification. | Must | M08 | UC-M08-01 | Run Gap Analysis Agent | BR-062 | Gap analysis is blocked without valid classification. | A2 |
| FR-049 | Generate compliance report | LCSP shall generate final compliance report only after classification/gap inputs are valid and conflicts resolved. | Must | M08 | UC-M08-02 | Generate Compliance Report | BR-063 | Final report includes evidence source, legal basis and attestation usage if any. | A2/A3 |
| FR-050 | Generate readiness-only export | LCSP shall generate readiness-only export before technical evidence without risk level. | Should | M08 | UC-M08-03 | Generate Readiness-Only Export | BR-065 | Export contains no HIGH/MEDIUM/LOW or final classification. | A1 |
| FR-051 | View document status | LCSP shall show document job status and blocked reasons. | Should | M08 | UC-M08-04 | View Document Status | BR-066 | Manager sees pending/ready/blocked/failed. | None |
| FR-052 | Download generated document | LCSP shall allow Manager to download generated document when ready. | Should | M08 | UC-M08-05 | Download Generated Document | BR-066 | Download requires Manager ownership/permission. | None |
| FR-053 | Write audit event | LCSP shall write audit events for material lifecycle/security/compliance actions. | Must | M09 | UC-M09-01 | Write Audit Event | BR-067 | Event records actor, action, object, timestamp and relevant metadata. | A3 |
| FR-054 | View audit trail | LCSP shall allow Manager to view audit trail for assessment. | Must | M09 | UC-M09-02 | View Audit Trail | BR-068 | Audit view excludes raw source code. | A3 |
| FR-055 | Export audit trail | LCSP shall allow Manager to export audit trail metadata. | Should | M09 | UC-M09-03 | Export Audit Trail | BR-068 | Export includes evidence hash, scanner/ruleset, legal corpus version where applicable. | A3 |
| FR-056 | Track artifact versions | LCSP shall track evidence, report, document and legal corpus versions. | Must | M09 | UC-M09-04 | Track Evidence, Report, and Document Version | BR-069 | Accepted evidence has report_hash and version metadata. | A2/A3 |
| FR-057 | Track attestation usage | LCSP shall record when classification/report uses human attestation. | Must | M09 | UC-M09-05 | Track Human Attestation Usage | BR-070 | Report and audit trail disclose attestation usage. | A3 |
| FR-058 | Enforce source code privacy policy | LCSP shall enforce source code privacy policy across scanner, evidence and agent paths. | Must | M10 | UC-M10-01 | Enforce Source Code Privacy Policy | BR-057 | Raw source never enters LLM or long-term storage. | None |
| FR-059 | Redact secrets | LCSP shall redact secrets before persistence, logs or evidence output. | Must | M10 | UC-M10-02 | Redact Secrets | BR-059 | Secret values are not persisted in findings/audit. | None |
| FR-060 | Clean temporary workspace | LCSP scanner/worker shall clean temporary source workspace after scan completion/failure. | Must | M10 | UC-M10-03 | Clean Temporary Workspace | BR-060 | Cleanup success/failure is auditable. | None |
| FR-061 | Enforce no raw source to LLM | LCSP shall prevent raw source code from being sent to LLM Provider. | Must | M10 | UC-M10-04 | Enforce No Raw Source to LLM | BR-057 | Agent prompts contain normalized evidence only. | None |
| FR-062 | Enforce no long-term raw source storage | LCSP shall prevent long-term storage of raw source code. | Must | M10 | UC-M10-05 | Enforce No Long-Term Raw Source Storage | BR-058 | Persistent stores contain metadata/evidence refs/hash, not raw source. | None |
| FR-063 | Verify email | LCSP shall allow password-auth users to verify email after registration or email change. | Should | M01 | UC-M01-11 | Verify Email | BR-074 | Account remains restricted until valid verification token is accepted when email verification is in scope. | Open Question |
| FR-064 | Change password | LCSP shall allow password-auth users to change password after session validation and re-authentication/current password check. | Should | M01 | UC-M01-12 | Change Password | BR-075 | Password changes only when current credential and new password policy pass. | Open Question |
| FR-065 | Manage personal profile | LCSP shall allow users to update allowed personal profile fields without changing role, policy or assessment ownership. | Could | M01 | UC-M01-13 | Manage Personal Profile | BR-076 | User can update allowed fields only; permission fields are rejected. | Open Question |
| FR-066 | Run repository scan | LCSP shall allow Developer to run or re-run repository scan when granted `RUN_SCAN` policy. | Must | M04 | UC-M04-08 | Run Repository Scan | BR-077 | Scan job is created only for valid repo/branch/commit and policy scope; output enters evidence gates. | None |
| FR-067 | Review and approve VerifiedProfile | LCSP shall require Manager review and approval of VerifiedProfile before `READY_FOR_CLASSIFICATION`. | Must | M06 | UC-M06-08 | Review and Approve VerifiedProfile | BR-078 | Manager cannot approve if material/critical conflict or required Developer confirmation is unresolved. | A1/A3 |
| FR-068 | View gap analysis | LCSP shall allow Manager to view GapAnalysisResult with priority, evidence basis and legal citation trace after gap analysis completes. | Should | M08 | UC-M08-06 | View Gap Analysis | BR-079 | Gap analysis view is not shown as final report and is blocked/degraded if classification basis is invalid. | A2 |

## Traceability to Use Cases

Every FR above references a `UC-MXX-XX` ID and exact use case name from `docs/design/use-case-specification.md`. Full matrix is maintained in `docs/design/traceability-matrix.md`.

## Traceability to Business Rules

Every FR references a `BR-XXX` ID defined in `docs/design/business-rules.md`. A business rule may support multiple FRs where the rule is a cross-cutting guardrail.

## Validation Dependencies

| Assumption | Related FR IDs | Impact |
| --- | --- | --- |
| A1 - Wizard simplicity vs completeness | FR-019, FR-020, FR-021, FR-022, FR-023, FR-033, FR-035, FR-036, FR-042, FR-050, FR-067 | WizardProfile and reconciliation input may change after validation |
| A2 - Legal corpus / rule reliability | FR-043, FR-044, FR-045, FR-046, FR-047, FR-048, FR-049, FR-056, FR-068 | Legal rule/citation contract and classification behavior may change |
| A3 - Human attestation abuse risk | FR-016, FR-017, FR-027, FR-029, FR-030, FR-036..FR-042, FR-049, FR-053..FR-057, FR-066, FR-067 | Attestation policy, permission enforcement and audit requirements may tighten |

## Open Questions

| Area | Question |
| --- | --- |
| MFA recovery | MVP recovery owner is not final because only Manager and Developer are exposed roles; support/admin verification remains an open operating policy. |
| Wizard validation | Exact Wizard questions must be tested before backlog. |
| Legal corpus | Final legal rule coverage and citation format remain validation-required. |
| Attestation | Which claims must always require dual confirmation remains validation-required. |
