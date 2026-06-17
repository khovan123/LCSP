# LCSP UX Specification

## Purpose

Tài liệu này mô tả UX ở mức design trước implementation cho Manager Workspace, Developer Workspace, authentication/MFA và các trạng thái evidence-first. Không tạo UI code.

## UX Principles

- LCSP là evidence-based compliance platform, không phải chatbot/checklist đơn giản.
- Manager không cần hiểu scanner hoặc thuật ngữ code để hoàn tất Wizard.
- Developer chỉ thấy technical task và limited assessment context được giao.
- Wizard-only không hiển thị HIGH/MEDIUM/LOW hoặc nhãn risk tạm thời.
- Classification locked state phải nói rõ lý do bị khóa và bước cần làm tiếp.
- Human attestation phải hiển thị như evidence supplement có kiểm soát, không phải nút bypass.

## Personas

| Persona | Needs |
| --- | --- |
| Manager | Tạo assessment, trả lời Wizard bằng ngôn ngữ nghiệp vụ, mời Developer, theo dõi progress, resolve business/legal conflict, approve VerifiedProfile, generate report |
| Developer | Nhận task, kết nối repo/upload report, review findings, confirm technical truth, provide structured attestation trong scope |

## Information Architecture

| Area | Primary Screens |
| --- | --- |
| Authentication & Account Security | Register, Login, MFA setup, QR/manual key entry, OTP verification, MFA login, MFA disable/reset, session expired |
| Manager Workspace | Dashboard, Create Assessment, Wizard, Self-Declared Readiness, Invite Developer, Assessment Progress, Reconciliation Review, VerifiedProfile Review, Classification Result, Gap Analysis, Report Generation, Audit Trail |
| Developer Workspace | Developer Task Inbox, Evidence Collection Task, GitHub Connect, Evidence Upload, Technical Findings Review, Technical Attestation Form, Technical Conflict Resolution |
| System States | Classification Locked, Evidence Rejected, Evidence Insufficient, Conflict Blocked, Report Blocked |

## Authentication & MFA UX

| Screen/Flow | UX Requirements | Related Use Case |
| --- | --- | --- |
| Register | Collect minimal identity and organization/invite context. | UC-M01-01 Register Account |
| Login | Password/identity step first; if MFA enabled, proceed to Authenticator App code step. | UC-M01-02 Login |
| Verify Email | Show verification result and resend option when token is expired. | UC-M01-11 Verify Email |
| Change Password | Require current password/re-authentication and show password policy feedback. | UC-M01-12 Change Password |
| Personal Profile | Allow only safe profile fields; do not expose role/policy edits. | UC-M01-13 Manage Personal Profile |
| MFA setup screen | Explain that user will use an Authenticator App such as Google Authenticator, Microsoft Authenticator, 1Password, Authy or compatible TOTP app. | UC-M01-04 Setup MFA Using Authenticator App |
| QR code / manual key entry | Show QR code and manual key entry option; warn user that setup is not complete until OTP is verified. | UC-M01-04 Setup MFA Using Authenticator App |
| OTP verification | Ask for current 6-digit app code; show clear invalid/expired state. | UC-M01-05 Verify MFA Code |
| MFA login step | Show OTP challenge after password verification for MFA-enabled accounts. | UC-M01-10 Login With MFA |
| MFA recovery/reset state | Explain reset requires approved recovery/support/admin verification; do not imply self-service bypass. | UC-M01-07 Reset MFA |
| MFA error state | Explain invalid/expired code and lock/rate-limit if too many attempts. | UC-M01-05 Verify MFA Code |

SMS-based OTP is not in MVP scope unless explicitly added later. UX copy must not label this Authenticator App flow as SMS-based authentication.

## Manager Workspace UX

| Screen | Purpose | Guardrails |
| --- | --- | --- |
| Dashboard | Show owned assessments and current state. | Must not expose implementation backlog/technical internals. |
| Create Assessment | Start assessment in organization context. | Manager owns assessment. |
| Wizard | Capture business/legal truth using business language and progressive disclosure. | A1 validation required; avoid code terms. |
| Self-Declared Readiness | Show `SELF_DECLARED_READINESS`, readiness checklist and preliminary indicators. | No HIGH/MEDIUM/LOW, no provisional risk label. |
| Invite Developer | Invite Developer and select technical policies. | Developer does not receive Manager permissions. |
| Assessment Progress | Show Wizard/evidence/gate/reconciliation/classification/report progress. | Explain blocked reason and owner. |
| Reconciliation Review | Present conflicts in business language for Manager. | Manager confirms business/legal meaning only. |
| VerifiedProfile Review | Allow Manager to review/approve VerifiedProfile when ready. | Block if unresolved material/critical conflict. |
| Classification Result | Show risk output, legal citation trace and caveats. | Only after VerifiedProfile and legal rules/citations. |
| Gap Analysis | Show gaps, priority, evidence basis and legal citations derived from classification. | No gap analysis without valid classification; not a final report. |
| Report Generation | Generate final report or readiness-only export depending gates. | Final report blocked if conflict/citation/evidence incomplete. |
| Audit Trail | View/export audit metadata. | No raw source or secret values. |

## Developer Workspace UX

| Screen | Purpose | Guardrails |
| --- | --- | --- |
| Developer Task Inbox | Show assigned tasks/policies only. | No Manager-only controls. |
| Evidence Collection Task | Choose GitHub read-only scan, Local/CI upload, or manual JSON. | Policy-scoped actions only. |
| GitHub Connect | Select repo/branch/commit for read-only scan. | Least privilege messaging. |
| Run Scan/Re-scan | Trigger scan for selected repo/branch/commit and view scan job status. | Requires `RUN_SCAN`; show failure reason and source privacy block if any. |
| Evidence Upload | Upload scanner report or manual technical JSON. | Show schema requirements and gate result. |
| Technical Findings Review | Review finding detail, confidence, refs. | No long raw source snippets. |
| Technical Attestation Form | Submit role-bound claim, reason, scope and timestamp. | Cannot replace machine-generated metadata. |
| Technical Conflict Resolution | Resolve technical truth conflicts. | Critical/material conflicts require dual confirmation. |

## Key Screens

| Screen | Related Use Case | Related FR |
| --- | --- | --- |
| MFA Setup | UC-M01-04 Setup MFA Using Authenticator App | FR-003, FR-004 |
| MFA OTP Verification | UC-M01-05 Verify MFA Code | FR-005, FR-007 |
| MFA Login | UC-M01-10 Login With MFA | FR-006 |
| Verify Email | UC-M01-11 Verify Email | FR-063 |
| Change Password | UC-M01-12 Change Password | FR-064 |
| Personal Profile | UC-M01-13 Manage Personal Profile | FR-065 |
| Wizard | UC-M03-02 Fill Web Wizard | FR-019 |
| Self-Declared Readiness | UC-M03-05 View Self-Declared Readiness | FR-022 |
| Classification Locked | UC-M07-04 Block or Degrade Classification if Citation Missing | FR-046 |
| Technical Attestation Form | UC-M04-07 Provide Structured Technical Attestation | FR-030 |
| Run Scan/Re-scan | UC-M04-08 Run Repository Scan | FR-066 |
| VerifiedProfile Review | UC-M06-08 Review and Approve VerifiedProfile | FR-067 |
| Gap Analysis | UC-M08-06 View Gap Analysis | FR-068 |

## Wizard UX

- Questions use business/legal wording.
- Critical fields: purpose, sector, data type, user group, user impact, decision role, human oversight, external LLM usage.
- Progressive disclosure is used for difficult questions.
- Examples clarify without turning Manager into Developer.
- Each important question maps to WizardProfile field.
- A1 validation must test Internal AI chatbot, Credit scoring/loan approval, HR screening/recruitment AI.

## Evidence Collection UX

- GitHub App read-only is default MVP path.
- Run Scan/Re-scan is shown only when Developer has `RUN_SCAN`.
- Local/CI scanner report upload is enterprise-safe alternative.
- Manual technical evidence JSON is structured fallback, not free text.
- Evidence rejected/insufficient states show actionable reason.

## Reconciliation UX

- Manager sees conflict in business/legal language.
- Developer sees technical details needed to verify technical truth.
- Material/critical conflicts show both confirmations required.
- Conflict Score may block workflow; supporting scores do not display as blockers.

## Classification Locked UX

Locked state must identify one or more reasons:

- Technical evidence missing.
- Schema completeness gate failed.
- Quality threshold gate failed.
- Reconciliation has unresolved material/critical conflict.
- VerifiedProfile not created.
- Legal rule/citation missing.

## Report Generation UX

- Final report button remains disabled/blocked until prerequisites pass.
- Readiness-only export remains available when no technical evidence exists, but contains no risk level.
- Report preview must disclose evidence source, legal citation trace and human attestation usage if used.

## Audit Trail UX

- Audit trail is filterable by Wizard, evidence, gate, conflict, attestation, classification, document, auth/MFA and security events.
- Audit exports include hashes and versions, not raw source or secrets.

## Error / Empty / Blocked States

| State | UX Behavior |
| --- | --- |
| Empty Developer task inbox | Explain no task has been assigned. |
| Evidence rejected | Show missing/invalid schema/privacy fields. |
| Evidence insufficient | Show quality reason and next action. |
| Conflict blocked | Show owner(s) needed and dual confirmation if applicable. |
| Classification locked | Show exact gate preventing classification. |
| MFA invalid code | Show invalid/expired code and retry/lock policy. |
| MFA recovery required | Explain recovery requires approved verification. |

## UX Copy Guidelines

- Use "Authenticator App" and examples: Google Authenticator, Microsoft Authenticator, 1Password, Authy or compatible TOTP app.
- Do not use SMS-based authentication labels for MVP Authenticator App MFA.
- Avoid provisional risk labels before classification unlock.
- Avoid HIGH/MEDIUM/LOW before classification is unlocked.
- Use "technical evidence required" instead of "scanner failed" when Manager does not need scanner detail.

## Accessibility Notes

- MFA QR setup must include manual key entry.
- Error states must be text-visible, not color-only.
- Wizard and conflict copy should be readable without technical jargon.

## Validation Dependency A1

A1 directly affects Wizard UX, Self-Declared Readiness, preliminary indicators, Manager conflict language and classification locked explanations.

## Open UX Questions

| Question | Dependency |
| --- | --- |
| Final Wizard copy and examples | A1 |
| Exact legal citation presentation | A2 |
| Human attestation warning/disclosure copy | A3 |
| MFA recovery owner and copy | Open Question |
