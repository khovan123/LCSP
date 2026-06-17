# LCSP State Machine

## Purpose

This document describes LCSP assessment states before implementation. It is a product/architecture state model, not code.

## State Table

| State | Meaning | Entry condition | Exit condition | Allowed transitions | Blocked transitions | Responsible role/module |
| --- | --- | --- | --- | --- | --- | --- |
| WIZARD_IN_PROGRESS | Manager is filling Wizard | Assessment created | Wizard submitted | TECHNICAL_EVIDENCE_REQUIRED, TECHNICAL_EVIDENCE_MISSING | READY_FOR_CLASSIFICATION | Manager / Wizard |
| TECHNICAL_EVIDENCE_REQUIRED | Evidence is required before classification | Wizard submitted without accepted evidence | Developer invited or evidence provided | DEVELOPER_INVITED, EVIDENCE_COLLECTION_IN_PROGRESS, TECHNICAL_EVIDENCE_MISSING | READY_FOR_CLASSIFICATION | Assessment |
| DEVELOPER_INVITED | Developer has been invited | Manager sends invite | Developer accepts/starts task | EVIDENCE_COLLECTION_IN_PROGRESS | APPROVE_VERIFIED_PROFILE by Developer | Manager / RBAC |
| EVIDENCE_COLLECTION_IN_PROGRESS | Evidence is being collected | Developer connects repo or uploads report | Evidence received or fails | TECHNICAL_EVIDENCE_REJECTED, TECHNICAL_EVIDENCE_INSUFFICIENT, TECHNICAL_EVIDENCE_READY | READY_FOR_CLASSIFICATION | Developer / Evidence |
| TECHNICAL_EVIDENCE_MISSING | No technical evidence exists | Wizard submitted without evidence | Evidence collection starts | DEVELOPER_INVITED, EVIDENCE_COLLECTION_IN_PROGRESS | Risk classification, final report | Evidence |
| TECHNICAL_EVIDENCE_REJECTED | Evidence failed schema/privacy/provenance/integrity | Evidence submitted and rejected | New report submitted | EVIDENCE_COLLECTION_IN_PROGRESS | Reconciliation, classification | Evidence Gate |
| TECHNICAL_EVIDENCE_INSUFFICIENT | Evidence accepted but quality too low | Schema pass, quality fail | More evidence/attestation/rescan | EVIDENCE_COLLECTION_IN_PROGRESS, TECHNICAL_EVIDENCE_READY | READY_FOR_CLASSIFICATION | Evidence Gate |
| TECHNICAL_EVIDENCE_READY | Evidence passes schema and quality gates | Evidence gate pass | Reconciliation begins | RECONCILIATION_REQUIRED, VERIFIED_PROFILE_READY | Direct final report | Evidence Gate |
| RECONCILIATION_REQUIRED | WizardProfile and TechnicalProfile must be compared/resolved | Evidence ready | Conflicts resolved or routed | DEVELOPER_CONFIRMATION_REQUIRED, MANAGER_CONFIRMATION_REQUIRED, VERIFIED_PROFILE_READY, BLOCKED_BY_CONFLICT | READY_FOR_CLASSIFICATION if conflicts unresolved | Reconciliation |
| DEVELOPER_CONFIRMATION_REQUIRED | Technical truth confirmation required | Technical/material conflict created | Developer confirms | MANAGER_CONFIRMATION_REQUIRED, VERIFIED_PROFILE_READY, BLOCKED_BY_CONFLICT | Manager-only technical resolution | Developer / Reconciliation |
| MANAGER_CONFIRMATION_REQUIRED | Business/legal meaning confirmation required | Business/material conflict created | Manager confirms | DEVELOPER_CONFIRMATION_REQUIRED, VERIFIED_PROFILE_READY, BLOCKED_BY_CONFLICT | Developer-only business resolution | Manager / Reconciliation |
| VERIFIED_PROFILE_READY | VerifiedProfile candidate created and awaiting Manager approval | Evidence ready and conflicts resolved | Manager approves VerifiedProfile | READY_FOR_CLASSIFICATION, BLOCKED_BY_CONFLICT | Wizard-only final report, Risk Classification before approval | Reconciliation / Manager |
| READY_FOR_CLASSIFICATION | Classification can run | VerifiedProfile exists, Manager approval recorded, and no unresolved material/critical conflict | Classification completes | CLASSIFICATION_COMPLETED | Wizard edit without reassessment | Classification |
| CLASSIFICATION_COMPLETED | Risk Classification completed with rule trace | Classification agent completes | Gap/report generation | REPORT_READY | Final output if citation missing | Classification |
| REPORT_READY | Report can be generated/exported | Classification/gap/doc generated and no unresolved conflict | Export/close | Closed/exported state if later defined | Generation with unresolved material conflict | Document |
| BLOCKED_BY_CONFLICT | Material/critical conflict blocks final workflow | Conflict Score threshold hit and unresolved | Dual confirmation resolves | DEVELOPER_CONFIRMATION_REQUIRED, MANAGER_CONFIRMATION_REQUIRED, VERIFIED_PROFILE_READY | Final report, classification | Reconciliation |

## Global Guards

- Wizard-only states cannot show HIGH/MEDIUM/LOW or provisional risk label.
- Risk Classification cannot run before approved VerifiedProfile and `READY_FOR_CLASSIFICATION`.
- Final report cannot be generated while `BLOCKED_BY_CONFLICT`.
- Human attestation cannot bypass forbidden metadata requirements.
- Protected assessment transitions require authenticated session.
- MFA-enabled users must complete Authenticator App OTP verification before entering Manager or Developer Workspace.
- Authentication/MFA event names are tracked in `docs/specs/data-model-draft.md`; they do not change the assessment state machine unless access is denied.
