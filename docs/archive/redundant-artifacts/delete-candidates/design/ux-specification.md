# LCSP UX Specification

## Purpose

Tài liệu này mô tả UX ở mức design trước implementation cho Manager Workspace, Developer Workspace, authentication/MFA và các trạng thái evidence-first. Không tạo UI code.

## UX Principles

- LCSP là evidence-based compliance platform, không phải chatbot/checklist đơn giản.
- Manager không cần hiểu scanner hoặc thuật ngữ code để hoàn tất Wizard.
- Developer chỉ thấy technical task và limited assessment context được giao.
- Wizard-only không hiển thị HIGH/MEDIUM/LOW hoặc nhãn risk tạm thời.
- Classification locked state phải nói rõ lý do bị khóa và bước cần làm tiếp.
- UI phải giúp Manager/Developer hiểu AI được dùng vào mục đích gì trong business flow, không chỉ hiển thị provider/model/dependency.
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
| Manager Workspace | Dashboard, Create Assessment, Wizard, Self-Declared Readiness, GitHub Connect, Run Repository Scan, Scan Status, Technical Findings Review, AI Usage Flow Review, Reconciliation Review, VerifiedProfile Review, Classification Result, Gap Analysis, Report Generation, Audit Trail |
| Developer Workspace | Optional / limited collaborator experience: Developer Task Inbox, Assigned Repository/Scan Task, Technical Findings Review, Technical Attestation Form, Technical Clarification |
| System States | Classification Locked, Evidence Rejected, Evidence Insufficient, Conflict Blocked, Report Blocked |

## Authentication & MFA UX

| Screen/Flow | UX Requirements | Related Use Case |
| --- | --- | --- |
| Register | Collect minimal identity and organization/invite context. | UC-M01-01 Register Account |
| Login | Password/identity step first; if MFA enabled, proceed to Authenticator App code step. | UC-M01-02 Login |
| OAuth/OIDC Login | Show configured OAuth/OIDC provider entry; explain this signs into LCSP and does not connect GitHub repository. | UC-M01-14 Sign In with OAuth/OIDC |
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

OAuth/OIDC provider choice remains configuration. UI must not imply Enterprise SSO/SAML/domain federation unless those are explicitly enabled later.

## Manager Workspace UX

| Screen | Purpose | Guardrails |
| --- | --- | --- |
| Dashboard | Show owned assessments and current state. | Must not expose implementation backlog/technical internals. |
| Create Assessment | Start assessment in organization context. | Manager owns assessment. |
| Wizard | Capture business/legal truth using business language and progressive disclosure. | A1 validation required; avoid code terms. |
| Self-Declared Readiness | Show `SELF_DECLARED_READINESS`, readiness checklist and preliminary indicators. | No HIGH/MEDIUM/LOW, no provisional risk label. |
| Invite Developer | Invite Developer and select technical policies. | Developer does not receive Manager permissions. |
| Assessment Progress | Show Wizard/evidence/gate/reconciliation/classification/report progress. | Explain blocked reason and owner. |
| AI Usage Flow Review | Show inferred business process, AI purpose, input/output, downstream action, affected subjects, human review and uncertainty. | Do not show HIGH/MEDIUM/LOW; request confirmation if purpose conflicts with Wizard. |
| Reconciliation Review | Present conflicts in business language for Manager. | Manager confirms business/legal meaning only. |
| VerifiedProfile Review | Allow Manager to review/approve VerifiedProfile when ready. | Block if any unresolved conflict remains. |
| Classification Result | Show risk output, legal citation trace and caveats. | Only after VerifiedProfile and legal rules/citations. |
| Gap Analysis | Show gaps, priority, evidence basis and legal citations derived from classification. | No gap analysis without valid classification; not a final report. |
| Report Generation | Generate final report or readiness-only export depending gates. | Final report blocked if conflict/citation/evidence incomplete. |
| Audit Trail | View/export audit metadata. | No raw source or secret values. |

## Developer Workspace UX - Optional / Post-MVP Delegated Collaboration

Developer Workspace is not required to complete the MVP assessment flow. Manager can connect repository, run scan, review technical findings, resolve conflicts and unlock classification without Developer assignment. Developer screens below describe optional delegated collaboration and must not appear as mandatory MVP steps.

| Screen | Purpose | Guardrails |
| --- | --- | --- |
| Developer Task Inbox | Show assigned tasks/policies only. | No Manager-only controls. |
| Evidence Collection Task | Guide optionally delegated Developer through GitHub repository scan task when Manager grants scoped permission. | Policy-scoped actions only; no manual upload controls in MVP main UX; Manager can perform this directly. |
| GitHub Connect | Select repo/branch/commit for read-only scan when delegated. | Least privilege messaging; not required for Manager-owned MVP success path. |
| Run Scan/Re-scan | Trigger scan for selected repo/branch/commit and view scan job status. | Manager can run scan directly; delegated Developer requires `RUN_REPOSITORY_SCAN`; show failure reason and source privacy block if any. |
| Scan Status | Show queued/running/completed/failed scan status and evidence gate result. | Classification remains locked until scan completes and gates pass. |
| Technical Findings Review | Review finding detail, confidence, refs. | No long raw source snippets. |
| Technical Attestation Form | Submit role-bound claim, reason, scope and timestamp. | Cannot replace machine-generated metadata. |
| Technical Conflict Resolution | Manager resolves technical truth conflicts by reviewing evidence, requesting re-scan/correction or using optional delegated clarification. | No MVP screen depends on Developer action to unlock classification. |

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
| AI Usage Flow Review | UC-M06-01 Detect Conflict | FR-070, FR-071, FR-072 |
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

- GitHub App read-only repository scan is the only active MVP evidence path.
- Run Scan/Re-scan is always available to Manager when repository scope is connected and gates allow; delegated Developer sees it only with `RUN_REPOSITORY_SCAN`.
- Developer flow: Task Inbox -> Connect GitHub Repository -> Select repo/branch/commit -> Run Repository Scan -> View Scan Status -> View Technical Findings.
- Local/CI scanner report upload and manual technical evidence JSON are not shown in MVP main UX.
- Evidence rejected/insufficient states show actionable reason.
- Technical Findings should identify AI usage-flow signals where available: AI input, AI output, decision flow, automated decision, human review, user impact, sensitive data, domain context, prompt purpose and harm-potential signals.

## Future / Enterprise Evidence UX

- Local/CI scanner report upload may be considered for enterprise source privacy after MVP validation.
- Manual technical evidence JSON may be considered only with strict schema and A3 attestation abuse controls.
- CLI/CI evidence submission remains future/enterprise and is not part of MVP main UX.

## Reconciliation UX

- Manager sees conflict in business/legal language.
- Developer sees technical details needed to verify technical truth.
- AI Usage Flow conflicts explain what the Wizard says versus what repository scan/usage-flow evidence suggests.
- Cross-boundary conflicts show both confirmations required.
- Conflict Score is explanatory only in MVP; unresolved conflict is the blocker.
- If AI purpose is unclear, UI must show uncertainty and ask for confirmation rather than overclaiming risk.

## Classification Locked UX

Locked state must identify one or more reasons:

- Technical evidence missing.
- Schema completeness gate failed.
- Quality threshold gate failed.
- AI usage purpose is unclear or conflicts with WizardProfile.
- Reconciliation has unresolved conflict.
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
| Conflict blocked | Show Manager resolution task, blocking reason, evidence refs and optional delegated clarification state if enabled. |
| Classification locked | Show exact gate preventing classification. |
| MFA invalid code | Show invalid/expired code and retry/lock policy. |
| MFA recovery required | Explain recovery requires approved verification. |

## UX Copy Guidelines

- Use "Authenticator App" and examples: Google Authenticator, Microsoft Authenticator, 1Password, Authy or compatible TOTP app.
- Do not use SMS-based authentication labels for MVP Authenticator App MFA.
- Avoid provisional risk labels before classification unlock.
- Avoid HIGH/MEDIUM/LOW before classification is unlocked.
- Use "technical evidence required" instead of "scanner failed" when Manager does not need scanner detail.
- Use "AI usage purpose unclear" instead of pretending provider/model presence is enough to classify risk.

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
