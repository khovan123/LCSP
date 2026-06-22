# Requirements Baseline

## Purpose

This document recovers the active requirements baseline from existing active documents and archived delete-candidate requirements. It does not create new requirements.

## Governance

- This document is authoritative for the recovered UC inventory, FR crosswalk, and NFR crosswalk.
- Canonical active FR namespace: `FR-E*` from `docs/product/prd.md`.
- Canonical active NFR namespace: `NFR-1..NFR-14` from `docs/product/prd.md`.
- Legacy `FR-###` and `NFR-###` IDs are traceability aliases recovered from archived requirement catalogs.
- `NO_ACTIVE_PRD_EQUIVALENT` means the legacy ID is referenced by active business rules but no equivalent active PRD requirement currently exists. This is not a new requirement.
- Archived requirement catalogs remain archived and are not active source-of-truth documents.

## Active Canonical Sources

- `docs/product/prd.md`
- `docs/product/business-rules.md`

## Historical Recovery Inputs

These archived documents were used only to recover legacy IDs and traceability aliases. They are not active implementation or requirements authority.

- `docs/archive/decisions/requirements-baseline-audit-report.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/use-case-specification.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/functional-requirements.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/non-functional-requirements.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/traceability-matrix.md`

## Canonical Active FR Inventory

| Canonical FR | Name | Source |
| --- | --- | --- |
| FR-E1-1 | Create assessment | docs/product/prd.md |
| FR-E1-2 | Invite Developer | docs/product/prd.md |
| FR-E1-3 | Assign Developer policies | docs/product/prd.md |
| FR-E1-4 | Restrict Manager-only actions | docs/product/prd.md |
| FR-E2-1 | Capture WizardProfile | docs/product/prd.md |
| FR-E2-2 | Use business language | docs/product/prd.md |
| FR-E2-3 | Show readiness without risk level | docs/product/prd.md |
| FR-E2-4 | Set Wizard-only state | docs/product/prd.md |
| FR-E3-1 | GitHub App read-only evidence path | docs/product/prd.md |
| FR-E3-2 | Local/CI evidence upload | docs/product/prd.md |
| FR-E3-3 | Manual technical evidence JSON upload | docs/product/prd.md |
| FR-E3-4 | Privacy flags validation | docs/product/prd.md |
| FR-E3-5 | Human technical attestation as supplement | docs/product/prd.md |
| FR-E4-1 | Schema completeness gate | docs/product/prd.md |
| FR-E4-2 | Technical profile dimensions | docs/product/prd.md |
| FR-E4-3 | Quality threshold gate | docs/product/prd.md |
| FR-E4-4 | Context-aware threshold | docs/product/prd.md |
| FR-E5-1 | Compare WizardProfile and TechnicalProfile | docs/product/prd.md |
| FR-E5-2 | Generate Conflict Score | docs/product/prd.md |
| FR-E5-3 | Route technical conflicts to Manager | docs/product/prd.md |
| FR-E5-4 | Route business/legal conflicts to Manager | docs/product/prd.md |
| FR-E5-5 | Manager resolves MVP conflicts | docs/product/prd.md |
| FR-E5-6 | Block critical unresolved conflicts | docs/product/prd.md |
| FR-E6-1 | Create VerifiedProfile | docs/product/prd.md |
| FR-E6-2 | Lock classification until conditions pass | docs/product/prd.md |
| FR-E6-3 | Produce evidence-based risk output | docs/product/prd.md |
| FR-E6-4 | Degrade or block when legal rule/citation is missing | docs/product/prd.md |
| FR-E6-5 | Preserve rule precedence | docs/product/prd.md |
| FR-E7-1 | Generate gap analysis after risk result | docs/product/prd.md |
| FR-E7-2 | Generate compliance document/report | docs/product/prd.md |
| FR-E7-3 | Support readiness-only export | docs/product/prd.md |
| FR-E7-4 | Disclose attestation use | docs/product/prd.md |
| FR-E8-1 | Audit Wizard answers | docs/product/prd.md |
| FR-E8-2 | Audit technical evidence metadata | docs/product/prd.md |
| FR-E8-3 | Audit conflict resolution | docs/product/prd.md |
| FR-E8-4 | Audit human technical attestation | docs/product/prd.md |
| FR-E8-5 | Audit classification and generated documents | docs/product/prd.md |

## Canonical Active NFR Inventory

| Canonical NFR | Statement | Source |
| --- | --- | --- |
| NFR-1 | Raw source code must not be sent to LLM. | docs/product/prd.md |
| NFR-2 | Raw source code must not be stored long term. | docs/product/prd.md |
| NFR-3 | GitHub App access must be read-only and limited to selected repositories for MVP default path. | docs/product/prd.md |
| NFR-4 | Technical findings shown to Manager must avoid unnecessary source/code exposure. | docs/product/prd.md |
| NFR-5 | Secrets must be redacted before any evidence snippet or summary is stored. | docs/product/prd.md |
| NFR-6 | Risk classification must be repeatable for the same VerifiedProfile, legal corpus/rule version and evidence version. | docs/product/prd.md |
| NFR-7 | Every final report must be traceable to assessment, evidence, rules, conflict resolutions and document version. | docs/product/prd.md |
| NFR-8 | Legal corpus/rule version used for classification must be recorded. | docs/product/prd.md |
| NFR-9 | System must fail closed for missing critical evidence, missing legal trace or unresolved material conflict. | docs/product/prd.md |
| NFR-10 | Manager-facing language must avoid technical implementation terms unless accompanied by plain-language explanation. | docs/product/prd.md |
| NFR-11 | Developer-facing tasks must include enough assessment context to act without exposing unnecessary business data. | docs/product/prd.md |
| NFR-12 | Evidence statuses must be understandable to both Manager and Developer. | docs/product/prd.md |
| NFR-13 | MVP UI copy and documents should support Vietnamese as primary language. | docs/product/prd.md |
| NFR-14 | Web UI should target common accessibility expectations for forms, status messages and document review. | docs/product/prd.md |

## UC Inventory

| UC ID | Name | Actor | Status | Source |
| --- | --- | --- | --- | --- |
| UC-M01-01 | Register Account | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-02 | Login | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-04 | Setup MFA Using Authenticator App | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-05 | Verify MFA Code | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-06 | Disable MFA | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-07 | Reset MFA | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-08 | Manage Session | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-09 | Reset Password | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-10 | Login With MFA | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-11 | Verify Email | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-12 | Change Password | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-13 | Manage Personal Profile | Manager/Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M01-14 | Sign In with OAuth/OIDC | Manager/Developer, OAuth/OIDC Provider, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M02-01 | Create Organization | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M02-02 | Manage Organization Members | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M02-03 | Assign Manager Role | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M02-04 | Invite Developer | Manager, Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M02-05 | Assign Developer Policy | Manager, Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M02-06 | Revoke Developer Access | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M03-01 | Create Assessment | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M03-02 | Fill Web Wizard | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M03-03 | Save Wizard Progress | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M03-04 | Submit WizardProfile | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M03-05 | View Self-Declared Readiness | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M04-01 | Accept Developer Task | Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M04-02 | Connect GitHub Repository | Manager; optional delegated Developer; GitHub; LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M04-03 | Upload Local/CI Scanner Report | Developer, LCSP System | OUT_OF_SCOPE | active business-rules.md; archived traceability-matrix.md |
| UC-M04-04 | Upload Manual Technical Evidence JSON | Developer, LCSP System | OUT_OF_SCOPE | active business-rules.md; archived traceability-matrix.md |
| UC-M04-05 | Review Technical Findings | Manager; optional delegated Developer; LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M04-06 | Confirm Technical Truth | Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M04-07 | Provide Structured Technical Attestation | Developer, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M04-08 | Run Repository Scan | Manager; optional delegated Developer; LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M05-01 | Validate Evidence Schema | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M05-02 | Validate Privacy Flags | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M05-03 | Evaluate Evidence Quality | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M05-04 | Generate TechnicalProfile | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M05-05 | Mark Evidence as Rejected, Insufficient, or Ready | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-01 | Detect Conflict | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-02 | Calculate Conflict Score | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-03 | Route Conflict to Manager | LCSP System; Manager | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-04 | Resolve Technical Conflict | Manager; optional delegated Developer input; LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-05 | Resolve Business/Legal Conflict | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-06 | Post-MVP Delegated Technical Clarification | Manager, optional Developer, LCSP System | OUT_OF_SCOPE | active business-rules.md; archived use-case-specification.md |
| UC-M06-07 | Create VerifiedProfile | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M06-08 | Review and Approve VerifiedProfile | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M07-01 | Retrieve Legal Rules/Citations | LCSP System, Legal Corpus | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M07-02 | Run Risk Classification Agent | LCSP System, LLM Provider | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M07-03 | Trace Classification to Legal Rule | LCSP System, Legal Corpus | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M07-04 | Block or Degrade Classification if Citation Missing | LCSP System, Legal Corpus | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M08-01 | Run Gap Analysis Agent | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M08-02 | Generate Compliance Report | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M08-03 | Generate Readiness-Only Export | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M08-04 | View Document Status | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M08-06 | View Gap Analysis | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M09-01 | Write Audit Event | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M09-03 | Export Audit Trail | Manager, LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M09-04 | Track Evidence, Report, and Document Version | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M09-05 | Track Human Attestation Usage | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M10-01 | Enforce Source Code Privacy Policy | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M10-02 | Redact Secrets | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M10-03 | Clean Temporary Workspace | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M10-04 | Enforce No Raw Source to LLM | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |
| UC-M10-05 | Enforce No Long-Term Raw Source Storage | LCSP System | ACTIVE | active business-rules.md; archived use-case-specification.md |

## FR Namespace Crosswalk

| Legacy FR | Legacy Name | Canonical FR | Resolution | Source |
| --- | --- | --- | --- | --- |
| FR-001 | Register account | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-002 | Login | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-003 | Enable Authenticator App MFA | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-004 | Generate MFA setup secret or QR code | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-005 | Verify MFA setup code | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-006 | Login with MFA | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-007 | Reject invalid or expired MFA code | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-008 | Disable MFA after re-authentication | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-009 | Reset MFA under recovery policy | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-010 | Manage session | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-011 | Reset password | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-012 | Create organization | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-013 | Manage organization members | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-014 | Assign Manager role | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-015 | Invite Developer | FR-E1-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-016 | Assign Developer policy | FR-E1-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-017 | Revoke Developer access | FR-E1-3, FR-E1-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-018 | Create assessment | FR-E1-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-019 | Fill Web Wizard | FR-E2-1, FR-E2-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-020 | Save Wizard progress | FR-E2-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-021 | Submit WizardProfile | FR-E2-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-022 | Show Self-Declared Readiness only | FR-E2-3, FR-E2-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-023 | Show preliminary indicators only | FR-E2-3, FR-E2-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-024 | Accept Developer task | FR-E1-2, FR-E1-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-025 | Connect GitHub repository | FR-E3-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-026 | Upload Local/CI scanner report | FR-E3-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-027 | Upload manual technical evidence JSON | FR-E3-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-028 | Review technical findings | FR-E3-1, FR-E4-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-029 | Respond to technical clarification | FR-E5-3, FR-E5-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-030 | Provide structured technical attestation | FR-E3-5, FR-E8-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-031 | Validate evidence schema | FR-E4-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-032 | Validate privacy flags | FR-E3-4, FR-E4-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-033 | Evaluate evidence quality | FR-E4-3, FR-E4-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-034 | Generate TechnicalProfile | FR-E4-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-035 | Mark evidence status | FR-E4-3, FR-E4-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-036 | Detect conflict | FR-E5-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-037 | Calculate Conflict Score | FR-E5-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-038 | Route conflict to Manager | FR-E5-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-039 | Resolve technical conflict by Manager | FR-E5-3, FR-E5-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-040 | Resolve business/legal conflict | FR-E5-4, FR-E5-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-041 | Optional delegated technical clarification | FR-E5-3, FR-E5-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-042 | Create VerifiedProfile | FR-E6-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-043 | Retrieve legal rules/citations | FR-E6-3, FR-E6-4, FR-E6-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-044 | Run Risk Classification Agent | FR-E6-2, FR-E6-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-045 | Trace classification to legal rule | FR-E6-3, FR-E6-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-046 | Block/degrade classification without citation | FR-E6-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-047 | View classification result | FR-E6-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-048 | Run gap analysis | FR-E7-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-049 | Generate compliance report | FR-E7-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-050 | Generate readiness-only export | FR-E7-3 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-051 | View document status | FR-E7-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-052 | Download generated document | FR-E7-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-053 | Write audit event | FR-E8-1, FR-E8-2, FR-E8-3, FR-E8-4, FR-E8-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-054 | View audit trail | FR-E8-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-055 | Export audit trail | FR-E8-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-056 | Track artifact versions | FR-E8-2, FR-E8-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-057 | Track attestation usage | FR-E7-4, FR-E8-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-058 | Enforce source code privacy policy | FR-E3-1, FR-E8-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-059 | Redact secrets | FR-E3-4, FR-E8-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-060 | Clean temporary workspace | FR-E3-1, FR-E8-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-061 | Enforce no raw source to LLM | FR-E3-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-062 | Enforce no long-term raw source storage | FR-E3-1, FR-E8-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-063 | Verify email | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-064 | Change password | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-065 | Manage personal profile | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-066 | Run repository scan | FR-E3-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-067 | Review and approve VerifiedProfile | FR-E6-1, FR-E6-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-068 | View gap analysis | FR-E7-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-069 | Detect AI usage flow signals | FR-E4-2, FR-E5-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-070 | Generate AIUsageFlow | FR-E4-2, FR-E5-1 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-071 | Mark unclear AI usage purpose | FR-E4-3, FR-E6-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-072 | Reconcile AIUsageFlow | FR-E5-1, FR-E5-6 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-073 | Match legal rules using AIUsageFlow | FR-E6-3, FR-E6-4, FR-E6-5 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-074 | Sign in with OAuth/OIDC | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-075 | Validate OAuth/OIDC callback and account linking | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-076 | Separate OAuth/OIDC from GitHub repository access | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived functional-requirements.md; active PRD |
| FR-077 | Manager superset MVP permissions | FR-E1-4, FR-E5-5, FR-E6-2, FR-E7-2 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |
| FR-078 | Post-MVP delegated Developer permissions | FR-E1-3, FR-E1-4 | CANONICAL_MAPPING | archived functional-requirements.md; active PRD |

## NFR Namespace Crosswalk

| Legacy NFR | Legacy Name | Canonical NFR | Resolution | Source |
| --- | --- | --- | --- | --- |
| NFR-001 | Password security | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-002 | MFA secret protection | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-003 | OTP verification security | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-004 | Session security | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-005 | Brute-force protection | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-006 | Secure MFA recovery/reset | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-007 | Auth event auditability | NFR-7 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-008 | Role-based access control | NFR-9, NFR-11 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-009 | Developer task policy isolation | NFR-11 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-010 | Wizard usability | NFR-10 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-011 | Classification locked-state clarity | NFR-12 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-012 | No raw source to LLM | NFR-1 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-013 | No long-term raw source storage | NFR-2 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-014 | Least privilege GitHub App | NFR-3 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-015 | Secret redaction | NFR-5 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-016 | Temporary workspace cleanup | NFR-2 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-017 | Evidence report hashing | NFR-7 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-018 | Audit event immutability expectation | NFR-7 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-019 | Legal citation traceability | NFR-7, NFR-8 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-020 | Rule-backed classification | NFR-8, NFR-9 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-021 | Document overclaim prevention | NFR-9 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-022 | Async workload reliability | NFR-6, NFR-9 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-023 | Evidence gate observability | NFR-12 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-027 | OAuth/OIDC callback security | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-028 | OAuth/GitHub boundary separation | NFR-3 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-029 | Permission delegation auditability | NFR-7, NFR-11 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-030 | Role/permission revocation behavior | NFR-11 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |
| NFR-031 | OAuth identity linking safety | NO_ACTIVE_PRD_EQUIVALENT | ARCHIVED_ALIAS_ONLY | archived non-functional-requirements.md; active PRD |
| NFR-032 | Manager super-role enforcement | NFR-9 | CANONICAL_MAPPING | archived non-functional-requirements.md; active PRD |

## Acceptance Criteria Inventory

| AC | Statement | Source |
| --- | --- | --- |
| AC-1 | A Wizard-only assessment never displays HIGH/MEDIUM/LOW. | docs/product/prd.md |
| AC-2 | Risk Classification Agent cannot run before VerifiedProfile exists. | docs/product/prd.md |
| AC-3 | Technical evidence must pass schema completeness gate before reconciliation. | docs/product/prd.md |
| AC-4 | Technical evidence must pass quality threshold gate before classification unlock. | docs/product/prd.md |
| AC-5 | Any unresolved conflict blocks final classification/report until resolved. | docs/product/prd.md |
| AC-6 | Manager conflict resolution is required and sufficient for MVP conflict completion when evidence gates pass. | docs/product/prd.md |
| AC-7 | Evidence Confidence Score and AI Intervention Score never block workflow alone. | docs/product/prd.md |
| AC-8 | Conflict handling uses binary MVP routing: conflict exists or not. Conflict Score may explain seriousness but does not create multiple routes. | docs/product/prd.md |
| AC-9 | Human technical attestation cannot replace machine-generated metadata listed in A3. | docs/product/prd.md |
| AC-10 | Final report includes legal citation/rule trace or is not final. | docs/product/prd.md |
| AC-11 | Final report discloses human technical attestation when used for classification. | docs/product/prd.md |
| AC-12 | Audit trail records wizard, evidence, conflict, attestation, classification and document generation events. | docs/product/prd.md |
| AC-13 | PRD preserves all mandatory product decisions from Product Brief. | docs/product/prd.md |
| AC-14 | PRD contains section for high-risk assumptions and validation requirements. | docs/product/prd.md |
| AC-15 | PRD does not define architecture, backlog or code. | docs/product/prd.md |
| AC-16 | PRD is clear enough for Architect Agent to identify product constraints and unresolved assumptions. | docs/product/prd.md |

## Recovery Verification

| Check | Result | Evidence |
| --- | --- | --- |
| All active BR legacy FR references listed | PASS | 78 unique legacy FR refs recovered |
| All active BR legacy NFR references listed | PASS | 29 unique legacy NFR refs recovered |
| Unmapped legacy FR IDs | PASS | None |
| Unmapped legacy NFR IDs | PASS | None |
| Legacy FR IDs without active PRD equivalent | OPEN_BASELINE_GAP | FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010, FR-011, FR-012, FR-013, FR-014, FR-063, FR-064, FR-065, FR-074, FR-075, FR-076 |
| Legacy NFR IDs without active PRD equivalent | OPEN_BASELINE_GAP | NFR-001, NFR-002, NFR-003, NFR-004, NFR-005, NFR-006, NFR-027, NFR-031 |
