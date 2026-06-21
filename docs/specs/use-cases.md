# LCSP Use Cases

## Purpose

This document is the canonical active use case catalog for LCSP. It recovers existing use cases from the active product/domain documents and archived requirement catalogs without creating new product scope.

## Governance

- Use case IDs in this document are canonical for active traceability.
- Legacy `UC-MXX-XX` IDs remain source aliases only.
- Deferred/Future flows are recorded only when they already exist in source material.
- Implementation details remain outside this document.

## Use Case Inventory

| UC ID | Name | Primary Actor | Status | Source Aliases |
|---|---|---|---|---|
| UC-001 | Authenticate and Manage Account | Manager / Developer | ACTIVE | UC-M01-01..UC-M01-14 |
| UC-002 | Manage Organization and Roles | Manager | ACTIVE | UC-M02-01..UC-M02-06 |
| UC-003 | Create Assessment | Manager | ACTIVE | UC-M03-01 |
| UC-004 | Complete WizardProfile | Manager | ACTIVE | UC-M03-02..UC-M03-05 |
| UC-005 | Connect Repository | Manager; delegated Developer | ACTIVE | UC-M04-02 |
| UC-006 | Create Repository Snapshot | Manager / LCSP System | ACTIVE | UC-M04-02, UC-M04-08 |
| UC-007 | Execute Repository Scan | Manager; delegated Developer; LCSP System | ACTIVE | UC-M04-08 |
| UC-008 | Generate TechnicalProfile | LCSP System | ACTIVE | UC-M05-01..UC-M05-05 |
| UC-009 | Generate AIUsageFlow | LCSP System | ACTIVE | UC-M05-04, UC-M06-01 |
| UC-010 | Resolve Conflict | Manager | ACTIVE | UC-M06-01..UC-M06-05 |
| UC-011 | Create and Approve VerifiedProfile | Manager / LCSP System | ACTIVE | UC-M06-07, UC-M06-08 |
| UC-012 | Perform Legal Matching | LCSP System | ACTIVE | UC-M07-01, UC-M07-03, UC-M07-04 |
| UC-013 | Run Risk Classification | LCSP System / Manager | ACTIVE | UC-M07-02 |
| UC-014 | Generate Gap Analysis and Document | Manager / LCSP System | ACTIVE | UC-M08-01..UC-M08-06 |
| UC-015 | Review and Export Audit Trail | Manager / LCSP System | ACTIVE | UC-M09-01, UC-M09-03..UC-M09-05 |
| UC-016 | Re-run Assessment Evidence | Manager; delegated Developer | ACTIVE | UC-M04-08, UC-M06-04 |
| UC-017 | Enforce Security and Privacy Controls | LCSP System | ACTIVE | UC-M10-01..UC-M10-05 |
| UC-018 | Submit Optional Developer Attestation | Developer / Manager | ACTIVE | UC-M04-01, UC-M04-05..UC-M04-07 |

## UC-001 Authenticate and Manage Account

| Field | Content |
|---|---|
| Goal | Allow authorized users to access LCSP through password/MFA or OAuth/OIDC while keeping account and session controls auditable. |
| Primary Actor | Manager / Developer |
| Secondary Actors | OAuth/OIDC Provider, LCSP System |
| Preconditions | User has valid invitation, organization membership or approved signup path. |
| Trigger | User starts login, OAuth/OIDC sign-in, registration, MFA setup, session action or profile/security action. |
| Main Flow | 1. User submits identity action. 2. LCSP validates credentials or OAuth/OIDC callback. 3. LCSP applies MFA/session policy. 4. LCSP creates or updates session/account state. 5. LCSP writes audit event without secrets. |
| Alternative Flows | OAuth/OIDC login validates state/nonce/issuer/audience/expiry; password-auth flow may require MFA; email verification gates sensitive access when configured. |
| Exception Flows | Invalid credential, invalid OTP, unsafe account linking, expired token, revoked session or rate limit blocks access and audits outcome. |
| Postconditions | Authenticated session exists or action is blocked with reason. |
| Business Rules | BR-001..BR-013, BR-074..BR-076, BR-086..BR-088, BR-094 |
| Referenced FRs | FR-001..FR-011, FR-063..FR-065, FR-074..FR-076 |
| Referenced ACs | AC-021, AC-022, AC-023 |

## UC-002 Manage Organization and Roles

| Field | Content |
|---|---|
| Goal | Maintain tenant boundary, Manager role and scoped Developer collaboration. |
| Primary Actor | Manager |
| Secondary Actors | Developer, LCSP System |
| Preconditions | Manager is authenticated and belongs to organization. |
| Trigger | Manager creates organization, manages members, assigns Manager, invites Developer, assigns or revokes Developer policy. |
| Main Flow | 1. Manager selects organization/assessment. 2. LCSP validates Manager permission. 3. LCSP applies membership or permission change. 4. LCSP audits change. |
| Alternative Flows | Developer receives scoped task only; Manager can revoke or override delegated action. |
| Exception Flows | Cross-tenant membership, invalid member, revoked policy or Developer attempt at Manager action is blocked. |
| Postconditions | Organization and role/policy state is updated or denied. |
| Business Rules | BR-014..BR-022, BR-089..BR-092 |
| Referenced FRs | FR-012..FR-017, FR-077, FR-078 |
| Referenced ACs | AC-024, AC-025, AC-026 |

## UC-003 Create Assessment

| Field | Content |
|---|---|
| Goal | Start a Manager-owned evidence-based compliance assessment. |
| Primary Actor | Manager |
| Secondary Actors | LCSP System |
| Preconditions | Manager is authenticated and organization-scoped. |
| Trigger | Manager creates a new assessment. |
| Main Flow | 1. Manager enters assessment identity. 2. LCSP creates Assessment. 3. LCSP records Manager as owner. 4. LCSP sets initial state. 5. LCSP writes audit event. |
| Alternative Flows | Manager may proceed directly to Wizard after creation. |
| Exception Flows | Missing organization or authorization blocks creation. |
| Postconditions | Assessment exists in `CREATED` or Wizard-start state. |
| Business Rules | BR-018, BR-023, BR-024, BR-089 |
| Referenced FRs | FR-018, FR-077 |
| Referenced ACs | AC-001, AC-024 |

## UC-004 Complete WizardProfile

| Field | Content |
|---|---|
| Goal | Capture Manager business/legal context without requiring code knowledge. |
| Primary Actor | Manager |
| Secondary Actors | LCSP System |
| Preconditions | Assessment exists and Manager owns it. |
| Trigger | Manager fills, saves or submits Wizard. |
| Main Flow | 1. Manager answers purpose, sector, data, affected user, decision role and oversight questions. 2. LCSP saves answers. 3. LCSP creates WizardProfile on submit. 4. LCSP shows readiness without risk level. |
| Alternative Flows | Manager saves draft; readiness-only export may be generated later. |
| Exception Flows | Missing critical fields are explicit readiness gaps; Wizard-only state never unlocks classification. |
| Postconditions | WizardProfile exists and assessment can proceed to repository evidence. |
| Business Rules | BR-026..BR-031 |
| Referenced FRs | FR-019..FR-023 |
| Referenced ACs | AC-002, AC-003 |

## UC-005 Connect Repository

| Field | Content |
|---|---|
| Goal | Connect selected GitHub repository as the active MVP technical evidence path. |
| Primary Actor | Manager |
| Secondary Actors | Delegated Developer, GitHub, LCSP System |
| Preconditions | Assessment exists; actor has repository connection permission. |
| Trigger | Actor starts GitHub App repository connection. |
| Main Flow | 1. Actor selects repository/branch. 2. LCSP verifies GitHub App authorization. 3. LCSP stores RepositoryConnection metadata. 4. LCSP writes audit event. |
| Alternative Flows | Developer may connect only under delegated policy. |
| Exception Flows | Missing GitHub authorization, wrong scope or OAuth/GitHub confusion blocks connection. |
| Postconditions | RepositoryConnection exists. |
| Business Rules | BR-032, BR-077, BR-088 |
| Referenced FRs | FR-025, FR-076, FR-077 |
| Referenced ACs | AC-004, AC-023 |

## UC-006 Create Repository Snapshot

| Field | Content |
|---|---|
| Goal | Pin repository evidence to branch/commit metadata before scanning. |
| Primary Actor | Manager / LCSP System |
| Secondary Actors | GitHub |
| Preconditions | RepositoryConnection exists. |
| Trigger | Manager selects branch/commit or requests scan. |
| Main Flow | 1. LCSP resolves selected branch/commit. 2. LCSP records RepositorySnapshot metadata. 3. LCSP audits snapshot creation. |
| Alternative Flows | Existing snapshot can be reused for idempotent scan request. |
| Exception Flows | Invalid repository scope or inaccessible commit blocks snapshot. |
| Postconditions | RepositorySnapshot exists. |
| Business Rules | BR-032, BR-069, BR-077 |
| Referenced FRs | FR-025, FR-056, FR-066 |
| Referenced ACs | AC-004, AC-020 |

## UC-007 Execute Repository Scan

| Field | Content |
|---|---|
| Goal | Convert repository snapshot into static technical evidence. |
| Primary Actor | Manager / LCSP System |
| Secondary Actors | Delegated Developer |
| Preconditions | RepositorySnapshot exists; actor has scan permission. |
| Trigger | Actor requests repository scan. |
| Main Flow | 1. LCSP creates ScanJob. 2. LCSP emits `command.scan.requested.v1`. 3. Scanner worker runs static analysis. 4. LCSP persists SourceFile, EvidenceReference, TechnicalFinding and TechnicalEvidenceReport. 5. LCSP emits `event.scan.completed.v1`. |
| Alternative Flows | Scan may be re-run against same/new snapshot. |
| Exception Flows | Unsupported language, parse failure or coverage limitation is recorded; fatal privacy/schema failure blocks downstream. |
| Postconditions | TechnicalEvidenceReport exists or scan failure is recorded. |
| Business Rules | BR-032, BR-036..BR-040, BR-057..BR-061, BR-077, BR-080 |
| Referenced FRs | FR-031..FR-035, FR-058..FR-062, FR-066, FR-069 |
| Referenced ACs | AC-004, AC-005, AC-006, AC-019 |

## UC-008 Generate TechnicalProfile

| Field | Content |
|---|---|
| Goal | Normalize accepted technical evidence into profile dimensions. |
| Primary Actor | LCSP System |
| Secondary Actors | None |
| Preconditions | TechnicalEvidenceReport passed schema/privacy/quality gates. |
| Trigger | `event.scan.completed.v1` leads to `command.technical-profile.requested.v1`. |
| Main Flow | 1. Worker loads accepted report. 2. Worker aggregates provider, framework, invocation, input/output, decision-flow, human-review and domain signals. 3. Worker persists TechnicalProfile. 4. Worker emits `event.technical-profile.completed.v1`. |
| Alternative Flows | Unknown fields are preserved as coverage limitations. |
| Exception Flows | Invalid/insufficient report emits failure and blocks downstream. |
| Postconditions | TechnicalProfile exists. |
| Business Rules | BR-036..BR-040, BR-080 |
| Referenced FRs | FR-031..FR-035, FR-069 |
| Referenced ACs | AC-005, AC-006, AC-007 |

## UC-009 Generate AIUsageFlow

| Field | Content |
|---|---|
| Goal | Transform WizardProfile, TechnicalProfile and findings into evidence-backed AI usage claims. |
| Primary Actor | LCSP System |
| Secondary Actors | None |
| Preconditions | WizardProfile, TechnicalProfile and TechnicalEvidenceReport exist. |
| Trigger | `event.technical-profile.completed.v1` leads to `command.ai-usage-flow.requested.v1`. |
| Main Flow | 1. Worker loads inputs. 2. Worker runs AIUsageFlow rule catalog. 3. Worker creates claims, confidence, uncertainty and conflict candidates. 4. Worker persists AIUsageFlow. 5. Worker emits `event.ai-usage-flow.completed.v1`. |
| Alternative Flows | Unknown critical usage creates `UNCLEAR` or blocked status. |
| Exception Flows | Missing inputs or failed evidence report emits `event.ai-usage-flow.failed.v1`. |
| Postconditions | AIUsageFlow exists or downstream remains blocked. |
| Business Rules | BR-080..BR-085 |
| Referenced FRs | FR-069..FR-073 |
| Referenced ACs | AC-007, AC-008, AC-009 |

## UC-010 Resolve Conflict

| Field | Content |
|---|---|
| Goal | Resolve mismatches between WizardProfile, TechnicalProfile and AIUsageFlow while preserving evidence integrity. |
| Primary Actor | Manager |
| Secondary Actors | LCSP System; optional delegated Developer |
| Preconditions | Conflict exists and Manager owns assessment. |
| Trigger | Reconciliation detects conflict or Manager opens conflict task. |
| Main Flow | 1. LCSP creates conflict. 2. Manager reviews compared values and evidence refs. 3. Manager records resolution/rationale. 4. LCSP stores resolution separately from scanner evidence. 5. Reconciliation reruns. |
| Alternative Flows | Manager requests rescan/correction; Developer clarification may be supplemental only. |
| Exception Flows | Missing rationale or unresolved conflict keeps classification blocked. |
| Postconditions | Conflict is resolved or remains blocking. |
| Business Rules | BR-041..BR-048, BR-083, BR-093 |
| Referenced FRs | FR-036..FR-041, FR-072 |
| Referenced ACs | AC-010, AC-011, AC-012, AC-013 |

## UC-011 Create and Approve VerifiedProfile

| Field | Content |
|---|---|
| Goal | Create reconciled profile required for legal matching and classification. |
| Primary Actor | Manager / LCSP System |
| Secondary Actors | None |
| Preconditions | WizardProfile, TechnicalProfile, AIUsageFlow exist and conflicts are resolved or absent. |
| Trigger | Reconciliation completes. |
| Main Flow | 1. Worker verifies no unresolved conflict. 2. Worker creates VerifiedProfile. 3. Manager reviews/approves where required. 4. LCSP emits `event.reconciliation.verified-profile-ready.v1`. |
| Alternative Flows | Manager resolution is included in merged profile with audit trail. |
| Exception Flows | Unresolved conflict or missing evidence blocks VerifiedProfile. |
| Postconditions | VerifiedProfile exists and legal matching can start. |
| Business Rules | BR-045, BR-078, BR-093 |
| Referenced FRs | FR-042, FR-067, FR-077 |
| Referenced ACs | AC-014, AC-015 |

## UC-012 Perform Legal Matching

| Field | Content |
|---|---|
| Goal | Match verified usage facts to citation-backed legal rules. |
| Primary Actor | LCSP System |
| Secondary Actors | Legal Corpus |
| Preconditions | VerifiedProfile exists and legal corpus version is available. |
| Trigger | `event.reconciliation.verified-profile-ready.v1` leads to `command.legal-matching.requested.v1`. |
| Main Flow | 1. Worker loads VerifiedProfile. 2. Worker extracts legal facts. 3. Worker retrieves candidate rules and citations. 4. Worker evaluates applicability and coverage. 5. Worker persists LegalRuleMatch records. 6. Worker emits `event.legal-matching.completed.v1`. |
| Alternative Flows | Missing non-critical citation creates degraded match. |
| Exception Flows | Missing profile, missing material citation, obsolete corpus or unknown critical fact blocks/degrades classification. |
| Postconditions | LegalRuleMatch records exist or legal matching failure is recorded. |
| Business Rules | BR-050, BR-051, BR-082, BR-084 |
| Referenced FRs | FR-043, FR-045, FR-046, FR-073 |
| Referenced ACs | AC-016, AC-017 |

## UC-013 Run Risk Classification

| Field | Content |
|---|---|
| Goal | Produce evidence- and citation-backed risk classification or blocked state. |
| Primary Actor | LCSP System |
| Secondary Actors | Manager |
| Preconditions | VerifiedProfile exists; legal matching completed. |
| Trigger | `event.legal-matching.completed.v1` leads to `command.classification.requested.v1`. |
| Main Flow | 1. Classification worker loads VerifiedProfile and LegalRuleMatch. 2. Worker verifies guardrails. 3. Worker determines risk output or blocked result. 4. Worker persists ClassificationResult. 5. Worker emits completed or blocked event. |
| Alternative Flows | Degraded classification may be visible when explicitly labeled and supported. |
| Exception Flows | Missing citation, unresolved conflict, provider-only evidence or unknown critical usage blocks classification. |
| Postconditions | ClassificationResult is completed or blocked. |
| Business Rules | BR-049..BR-051, BR-082, BR-084 |
| Referenced FRs | FR-044..FR-047, FR-073 |
| Referenced ACs | AC-016, AC-017, AC-018 |

## UC-014 Generate Gap Analysis and Document

| Field | Content |
|---|---|
| Goal | Produce gap analysis and compliance/readiness document under guardrails. |
| Primary Actor | Manager / LCSP System |
| Secondary Actors | Object Storage |
| Preconditions | ClassificationResult exists for final report; readiness-only export may occur earlier without risk level. |
| Trigger | Manager requests document or system starts document worker. |
| Main Flow | 1. LCSP validates classification/gap/citation/conflict prerequisites. 2. Worker creates gap analysis when allowed. 3. Worker generates document metadata/artifact. 4. LCSP emits generated or blocked event. |
| Alternative Flows | Readiness-only export shows missing evidence without risk level. |
| Exception Flows | Missing citation, unresolved conflict or invalid classification blocks final report. |
| Postconditions | GeneratedDocument exists or blocked reason is recorded. |
| Business Rules | BR-062..BR-066, BR-079 |
| Referenced FRs | FR-048..FR-052, FR-068 |
| Referenced ACs | AC-003, AC-018, AC-019 |

## UC-015 Review and Export Audit Trail

| Field | Content |
|---|---|
| Goal | Let Manager trace material workflow, security, evidence, conflict, classification and document events. |
| Primary Actor | Manager / LCSP System |
| Secondary Actors | None |
| Preconditions | Assessment exists. |
| Trigger | State-changing event occurs or Manager opens/export audit trail. |
| Main Flow | 1. LCSP writes audit event for material action. 2. Manager opens audit view. 3. LCSP shows redacted metadata, versions, evidence refs and decisions. 4. Manager exports allowed metadata when requested. |
| Alternative Flows | Auth/delegation events are included without raw tokens/secrets. |
| Exception Flows | Raw source, secret values, raw provider tokens and full prompts are excluded. |
| Postconditions | Audit trail is viewable/exportable without sensitive payload leakage. |
| Business Rules | BR-067..BR-070, BR-094 |
| Referenced FRs | FR-053..FR-057 |
| Referenced ACs | AC-020, AC-023, AC-026 |

## UC-016 Re-run Assessment Evidence

| Field | Content |
|---|---|
| Goal | Recover from weak/failed evidence or changed repository state without mutating historical evidence. |
| Primary Actor | Manager |
| Secondary Actors | Delegated Developer, LCSP System |
| Preconditions | Assessment has repository connection and prior scan/evidence state. |
| Trigger | Manager requests rescan after failure, conflict, weak evidence or changed commit. |
| Main Flow | 1. Manager selects snapshot. 2. LCSP creates a new ScanJob. 3. Scanner creates new evidence report. 4. Downstream profile/usage/reconciliation reruns. |
| Alternative Flows | Same commit can be rescanned idempotently if policy allows; new commit creates new snapshot. |
| Exception Flows | Unchanged failed condition remains blocked with actionable reason. |
| Postconditions | New evidence chain exists; previous chain remains traceable. |
| Business Rules | BR-040, BR-047, BR-069, BR-077 |
| Referenced FRs | FR-035, FR-056, FR-066 |
| Referenced ACs | AC-004, AC-020 |

## UC-017 Enforce Security and Privacy Controls

| Field | Content |
|---|---|
| Goal | Ensure source, secrets, prompts, identity tokens and audit records stay within privacy/security guardrails. |
| Primary Actor | LCSP System |
| Secondary Actors | GitHub, OAuth/OIDC Provider, LLM Provider |
| Preconditions | Any source/evidence/auth/LLM/audit workflow runs. |
| Trigger | Scan, prompt creation, persistence, log, audit or external integration action occurs. |
| Main Flow | 1. LCSP applies no-raw-source-to-LLM guard. 2. LCSP redacts secrets. 3. LCSP avoids long-term raw source storage. 4. LCSP cleans temp workspace. 5. LCSP audits control results. |
| Alternative Flows | Evidence refs and hashes may persist without raw source. |
| Exception Flows | Control failure blocks or fails closed. |
| Postconditions | Sensitive content is excluded or action is blocked. |
| Business Rules | BR-057..BR-061, BR-086..BR-088, BR-094 |
| Referenced FRs | FR-058..FR-062, FR-074..FR-076 |
| Referenced ACs | AC-021, AC-022, AC-023 |

## UC-018 Submit Optional Developer Attestation

| Field | Content |
|---|---|
| Goal | Capture structured Developer clarification without bypassing evidence gates or Manager authority. |
| Primary Actor | Developer |
| Secondary Actors | Manager, LCSP System |
| Preconditions | Developer has scoped task/policy. |
| Trigger | Developer opens assigned task and submits attestation. |
| Main Flow | 1. Developer submits role, claim, scope, reason and timestamp. 2. LCSP validates scope. 3. LCSP stores attestation as supplemental input. 4. Manager reviews when classification-relevant. |
| Alternative Flows | Manager may ignore, request rescan or use attestation during conflict resolution. |
| Exception Flows | Free text, missing role/scope or attempt to replace machine metadata is rejected. |
| Postconditions | Attestation is recorded and auditable but does not unlock classification by itself. |
| Business Rules | BR-052..BR-056 |
| Referenced FRs | FR-024, FR-028..FR-030, FR-057 |
| Referenced ACs | AC-012, AC-013, AC-019, AC-020 |
