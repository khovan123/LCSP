# State Machine Spec

## Status

AUTHORITATIVE

## Merged From

- `docs/specs/state-machine.md`
- Runtime refinements from `docs/developer-execution-blueprints/01-end-to-end-system-execution.md`

---

# LCSP State Machine

## Purpose

This document describes LCSP assessment states before implementation. It is a product/architecture state model, not code.

## State Table

| State | Meaning | Entry condition | Exit condition | Allowed transitions | Blocked transitions | Responsible role/module |
| --- | --- | --- | --- | --- | --- | --- |
| WIZARD_IN_PROGRESS | Manager is filling Wizard | Assessment created | Wizard submitted | TECHNICAL_EVIDENCE_REQUIRED, TECHNICAL_EVIDENCE_MISSING | READY_FOR_CLASSIFICATION | Manager / Wizard |
| TECHNICAL_EVIDENCE_REQUIRED | Evidence is required before classification; in MVP this means waiting for repository scan result, not manual evidence submission | Wizard submitted without accepted repository scan evidence | Manager or delegated Developer starts repository scan path | WAITING_FOR_REPOSITORY_CONNECTION, TECHNICAL_EVIDENCE_MISSING, DEVELOPER_INVITED as optional collaboration | READY_FOR_CLASSIFICATION | Assessment |
| DEVELOPER_INVITED | Developer has been invited | Manager sends invite | Developer accepts/starts task | EVIDENCE_COLLECTION_IN_PROGRESS | APPROVE_VERIFIED_PROFILE by Developer | Manager / RBAC |
| WAITING_FOR_REPOSITORY_CONNECTION | Manager connects GitHub repository before scan; optional delegated Developer can act only within Manager-granted scope | Technical evidence required | Repository connected | REPOSITORY_CONNECTED | Risk classification, final report | Manager / Evidence |
| REPOSITORY_CONNECTED | GitHub repository/branch/commit scope connected | Manager connects GitHub repository, or optional delegated Developer connects within Manager scope | Scan starts | WAITING_FOR_REPOSITORY_SCAN, REPOSITORY_SCAN_RUNNING | Risk classification, final report | Manager / Evidence |
| WAITING_FOR_REPOSITORY_SCAN | Repository connected but scan not completed | Repository connected or scan retry required | Scan starts/completes/fails | REPOSITORY_SCAN_RUNNING, REPOSITORY_SCAN_COMPLETED, REPOSITORY_SCAN_FAILED | Risk classification, final report | Manager / Evidence |
| REPOSITORY_SCAN_RUNNING | Repository scanner job is running | Manager runs Repository Scan, or optional delegated Developer runs scan within Manager scope | Scan completes or fails | REPOSITORY_SCAN_COMPLETED, REPOSITORY_SCAN_FAILED | Reconciliation, classification | Worker / Scanner |
| REPOSITORY_SCAN_FAILED | Repository scan failed | Scanner/job failure | Manager retries scan, requests correction, or uses optional delegated scan actor within Manager scope | WAITING_FOR_REPOSITORY_SCAN, REPOSITORY_SCAN_RUNNING | Reconciliation, classification | Worker / Scanner |
| REPOSITORY_SCAN_COMPLETED | Scanner generated TechnicalEvidenceReport | Scanner job completed | Evidence gates run | TECHNICAL_EVIDENCE_REJECTED, TECHNICAL_EVIDENCE_INSUFFICIENT, TECHNICAL_EVIDENCE_READY | Classification until gates pass | Worker / Evidence |
| EVIDENCE_COLLECTION_IN_PROGRESS | Legacy umbrella state; in MVP use repository connection/scan states instead | Manager connects repository or scan runs; optional delegated Developer is non-blocking | Repository scan completes or fails | REPOSITORY_SCAN_RUNNING, REPOSITORY_SCAN_COMPLETED, REPOSITORY_SCAN_FAILED | READY_FOR_CLASSIFICATION | Manager / Evidence |
| TECHNICAL_EVIDENCE_MISSING | No repository scan result exists | Wizard submitted without scan result | Repository scan starts | DEVELOPER_INVITED, WAITING_FOR_REPOSITORY_CONNECTION, WAITING_FOR_REPOSITORY_SCAN | Risk classification, final report | Evidence |
| TECHNICAL_EVIDENCE_REJECTED | Scanner-generated TechnicalEvidenceReport failed schema/privacy/provenance/integrity | Repository scan completed but report rejected | New scan submitted | WAITING_FOR_REPOSITORY_SCAN, REPOSITORY_SCAN_RUNNING | Reconciliation, classification | Evidence Gate |
| TECHNICAL_EVIDENCE_INSUFFICIENT | Scanner-generated TechnicalEvidenceReport accepted but quality too low | Schema pass, quality fail | Rescan or valid attestation path if allowed by A3 | WAITING_FOR_REPOSITORY_SCAN, REPOSITORY_SCAN_RUNNING, TECHNICAL_EVIDENCE_READY | READY_FOR_CLASSIFICATION | Evidence Gate |
| TECHNICAL_EVIDENCE_READY | Evidence passes schema and quality gates | Evidence gate pass | TechnicalProfile and AIUsageFlow analysis begins | AI_USAGE_FLOW_ANALYSIS_READY | Direct final report, classification | Evidence Gate |
| AI_USAGE_FLOW_ANALYSIS_READY | AIUsageFlow has identified AI purpose/input/output/downstream action/affected subjects or explicit uncertainty | TechnicalProfile generated and usage flow analysis completed | Reconciliation begins | RECONCILIATION_REQUIRED, RECONCILIATION_RUNNING, CONFLICT_RESOLUTION_REQUIRED | READY_FOR_CLASSIFICATION before reconciliation | AI Usage Flow / Evidence |
| RECONCILIATION_RUNNING | Comparing WizardProfile with TechnicalProfile and AIUsageFlow | AIUsageFlow ready | Conflict decision produced | CONFLICT_RESOLUTION_REQUIRED, VERIFIED_PROFILE_READY | READY_FOR_CLASSIFICATION before conflict decision | Reconciliation |
| RECONCILIATION_REQUIRED | Legacy alias; use `RECONCILIATION_RUNNING` for MVP docs | AIUsageFlow ready | Conflict decision produced | CONFLICT_RESOLUTION_REQUIRED, VERIFIED_PROFILE_READY | READY_FOR_CLASSIFICATION before conflict decision | Reconciliation |
| CONFLICT_RESOLUTION_REQUIRED | Có mâu thuẫn, cần Manager xử lý trước khi classification | Reconciliation detects any conflict | Manager resolves conflict and reconciliation no longer finds unresolved conflict | VERIFIED_PROFILE_READY | Risk classification, final report | Reconciliation / Manager |
| DEVELOPER_CONFIRMATION_REQUIRED | Legacy/post-MVP optional clarification state; not required in MVP main flow | Manager delegates technical clarification post-MVP | Developer responds; Manager still resolves | CONFLICT_RESOLUTION_REQUIRED | Classification unlock by Developer alone | Optional Developer / Reconciliation |
| MANAGER_CONFIRMATION_REQUIRED | Manager conflict resolution task required | Any conflict is routed to Manager | Manager resolves | CONFLICT_RESOLUTION_REQUIRED, VERIFIED_PROFILE_READY | Developer-only business or technical final resolution | Manager / Reconciliation |
| VERIFIED_PROFILE_READY | VerifiedProfile candidate created and awaiting Manager approval | Evidence ready and conflicts resolved | Manager approves VerifiedProfile | READY_FOR_CLASSIFICATION, CONFLICT_RESOLUTION_REQUIRED if new conflict appears | Wizard-only final report, Risk Classification before approval | Reconciliation / Manager |
| READY_FOR_CLASSIFICATION | Classification can run | VerifiedProfile exists, Manager approval recorded, and no unresolved conflict | Classification completes | CLASSIFICATION_COMPLETED | Wizard edit without reassessment | Classification |
| CLASSIFICATION_COMPLETED | Risk Classification completed with rule trace | Classification agent completes | Gap/report generation | REPORT_READY | Final output if citation missing | Classification |
| REPORT_READY | Report can be generated/exported | Classification/gap/doc generated and no unresolved conflict | Export/close | Closed/exported state if later defined | Generation with unresolved conflict | Document |

## Global Guards

- Wizard-only states cannot show HIGH/MEDIUM/LOW or provisional risk label.
- Risk Classification cannot run before approved VerifiedProfile and `READY_FOR_CLASSIFICATION`.
- Reconciliation must compare WizardProfile with TechnicalProfile and AIUsageFlow.
- Risk Classification must not be based only on AI model/provider/framework presence.
- `CONFLICT_RESOLUTION_REQUIRED` blocks Risk Classification and Final Report.
- Developer assignment is not required to leave `CONFLICT_RESOLUTION_REQUIRED`; Manager resolution is the MVP resume condition.
- Final report cannot be generated while any unresolved conflict remains.
- Human attestation cannot bypass forbidden metadata requirements.
- Protected assessment transitions require authenticated session.
- MFA-enabled users must complete Authenticator App OTP verification before entering Manager or Developer Workspace.
- Authentication/MFA event names are tracked in `docs/specs/data-model-draft.md`; they do not change the assessment state machine unless access is denied.
