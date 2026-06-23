# LCSP Functional Requirements

## Purpose

This document is the canonical active functional requirements catalog for LCSP. It normalizes all active and recovered legacy functional requirements into a single `FR-001` sequence.

No new requirements are created. Legacy requirements are either retained as active canonical requirements, merged into canonical requirements, superseded by domain behavior specs, marked as platform baseline, or deferred where the active source already marked them Future/Post-MVP.

## ID Scheme

All active functional requirements use:

```text
FR-001
FR-002
FR-003
```

No active `FR-E*`, `FR-A*`, or legacy alias is authoritative after this document.

## Functional Requirement Catalog

| ID | Title | Description | Priority | MVP? | Source Use Cases | Business Rules | Acceptance Criteria | Dependencies | Domain |
|---|---|---|---|---|---|---|---|---|---|
| FR-001 | Register account | Allow a user to register through approved signup or invitation path. | Should | Y | UC-001 | BR-001, BR-002 | AC-021 | NFR-001, NFR-012 | Platform |
| FR-002 | Login | Authenticate user before workspace access. | Must | Y | UC-001 | BR-003 | AC-021 | NFR-001, NFR-002 | Platform |
| FR-003 | Configure MFA | Support Authenticator App setup, OTP verification, login, disable and reset under policy. | Should | Y | UC-001 | BR-006..BR-013 | AC-021 | NFR-003, NFR-004, NFR-005 | Platform |
| FR-004 | Manage session and profile | Support session expiration/revocation, password reset/change, email verification and profile updates without permission changes. | Should | Y | UC-001 | BR-004, BR-005, BR-074..BR-076 | AC-021, AC-022 | NFR-002, NFR-006 | Platform |
| FR-005 | OAuth/OIDC login | Support OAuth/OIDC login with callback validation and safe account linking. | Must | Y | UC-001 | BR-086, BR-087, BR-094 | AC-023 | NFR-001, NFR-012 | Platform |
| FR-006 | Separate OAuth and GitHub access | Keep OAuth/OIDC login separate from GitHub App repository authorization. | Must | Y | UC-001, UC-005 | BR-088 | AC-023 | NFR-001, NFR-007 | Platform |
| FR-007 | Create organization | Allow authorized Manager to create organization. | Must | Y | UC-002 | BR-014 | AC-024 | NFR-008 | Administration |
| FR-008 | Manage organization members | Allow Manager-scoped membership management within tenant boundary. | Should | Y | UC-002 | BR-015 | AC-024 | NFR-008, NFR-009 | Administration |
| FR-009 | Assign Manager role | Allow valid organization member to receive Manager role. | Must | Y | UC-002 | BR-016 | AC-024 | NFR-008, NFR-009 | Administration |
| FR-010 | Invite Developer | Allow Manager to invite Developer into assessment context. | Must | Y | UC-002 | BR-017, BR-020 | AC-025 | NFR-008, NFR-009 | Administration |
| FR-011 | Assign and revoke Developer policy | Allow Manager to assign/revoke scoped Developer policies. | Must | Y | UC-002, UC-018 | BR-021, BR-022, BR-090..BR-092 | AC-025, AC-026 | NFR-008, NFR-009, NFR-010 | Administration |
| FR-012 | Enforce Manager-only actions | Prevent Developer from final conflict resolution, VerifiedProfile approval, classification, report generation and Manager decision changes. | Must | Y | UC-002, UC-010, UC-011, UC-013, UC-014 | BR-018, BR-019, BR-089, BR-091 | AC-025, AC-026 | NFR-008, NFR-009 | Administration |
| FR-013 | Create assessment | Allow Manager to create and own assessment. | Must | Y | UC-003 | BR-018, BR-023, BR-024, BR-089 | AC-001 | NFR-008 | Assessment |
| FR-014 | Complete WizardProfile | Capture Manager business/legal answers covering purpose, sector, data type, user group, user impact, decision role, oversight and external LLM usage. | Must | Y | UC-004 | BR-026..BR-029, BR-031 | AC-002 | NFR-011 | Assessment |
| FR-015 | Show readiness without risk level | Show readiness checklist/preliminary indicators only before technical evidence and verified basis exist. | Must | Y | UC-004, UC-014 | BR-030, BR-065 | AC-003 | NFR-011, NFR-018 | Assessment |
| FR-016 | Connect GitHub repository | Allow Manager, or delegated Developer, to connect selected read-only GitHub repository. | Must | Y | UC-005 | BR-032, BR-077, BR-088 | AC-004 | NFR-007, NFR-013 | Repository |
| FR-017 | Create repository snapshot | Create commit-pinned RepositorySnapshot metadata before scan. | Must | Y | UC-006 | BR-032, BR-069, BR-077 | AC-004, AC-020 | FR-016 | Repository |
| FR-018 | Run repository scan | Create ScanJob and run static repository scan via standalone Python Worker. | Must | Y | UC-007, UC-016 | BR-032, BR-077 | AC-004 | FR-017, NFR-013, NFR-014 | Scanner |
| FR-019 | Enforce scanner privacy | Ensure scan path does not send raw source to LLM, store raw source long term or persist secrets. | Must | Y | UC-007, UC-017 | BR-057..BR-061 | AC-019, AC-022 | NFR-013, NFR-014, NFR-015 | Scanner |
| FR-020 | Validate evidence schema and privacy flags | Validate TechnicalEvidenceReport required schema groups and privacy flags. | Must | Y | UC-007, UC-008 | BR-036, BR-037 | AC-005 | FR-018, NFR-016 | Scanner |
| FR-021 | Evaluate evidence quality | Evaluate evidence quality and mark rejected, insufficient or ready with actionable reason. | Must | Y | UC-008 | BR-038, BR-040 | AC-006 | FR-020, NFR-018 | Technical Profile |
| FR-022 | Generate TechnicalProfile | Derive TechnicalProfile from accepted technical evidence. | Must | Y | UC-008 | BR-039, BR-080 | AC-007 | FR-021 | Technical Profile |
| FR-023 | Detect AI usage signals | Capture AI input, output, decision-flow, automated-decision, human-review, user-impact, sensitive-data, domain-context and harm-potential signals when detectable. | Must | Y | UC-008, UC-009 | BR-080 | AC-007 | FR-018, FR-022 | AI Usage Flow |
| FR-024 | Generate AIUsageFlow | Generate AIUsageFlow after TechnicalProfile and before Reconciliation using evidence refs and sanitized metadata. | Must | Y | UC-009 | BR-081 | AC-008 | FR-014, FR-022, FR-023 | AI Usage Flow |
| FR-025 | Mark unclear AI usage | Mark unknown/unclear usage and coverage limitations instead of unsupported certainty. | Must | Y | UC-009 | BR-081, BR-082 | AC-009 | FR-024, NFR-018 | AI Usage Flow |
| FR-026 | Compare profiles and detect conflict | Compare WizardProfile, TechnicalProfile and AIUsageFlow to create conflicts when material mismatch exists. | Must | Y | UC-010 | BR-041, BR-083 | AC-010 | FR-014, FR-022, FR-024 | Reconciliation |
| FR-027 | Calculate conflict score | Calculate Conflict Score as explanatory support only. | Should | Y | UC-010 | BR-048, BR-085 | AC-011 | FR-026 | Reconciliation |
| FR-028 | Route conflicts to Manager | Route MVP conflicts to Manager resolution task. | Must | Y | UC-010 | BR-042, BR-043, BR-072 | AC-012 | FR-026, NFR-008 | Reconciliation |
| FR-029 | Resolve conflicts by Manager | Allow Manager to resolve technical and business/legal conflicts while preserving scanner evidence. | Must | Y | UC-010 | BR-042, BR-043, BR-047, BR-093 | AC-012, AC-013 | FR-028 | Reconciliation |
| FR-030 | Create VerifiedProfile | Create VerifiedProfile only after evidence is ready and conflicts are resolved or absent. | Must | Y | UC-011 | BR-045, BR-078 | AC-014, AC-015 | FR-026, FR-029 | Reconciliation |
| FR-031 | Approve VerifiedProfile | Require Manager review/approval where active workflow requires it, and block approval if conflict remains. | Must | Y | UC-011 | BR-078 | AC-015 | FR-030, NFR-010 | Reconciliation |
| FR-032 | Retrieve legal rules and citations | Retrieve candidate rules and citations from pinned legal corpus using PostgreSQL FTS + pgvector hybrid retrieval. | Must | Y | UC-012 | BR-050, BR-084 | AC-016 | FR-030, NFR-017 | Legal Matching |
| FR-033 | Match legal rules by usage flow | Match legal rules using business process, purpose, automation level, subjects, data types, human review and harm categories. | Must | Y | UC-012 | BR-082, BR-084 | AC-016 | FR-024, FR-032 | Legal Matching |
| FR-034 | Block/degrade legal matching without citation | Block or degrade material legal match when required citation/rule is missing. | Must | Y | UC-012, UC-013 | BR-050, BR-051, BR-073 | AC-017 | FR-032, NFR-017, NFR-018 | Legal Matching |
| FR-035 | Run risk classification | Run risk classification only after VerifiedProfile and LegalRuleMatch exist. | Must | Y | UC-013 | BR-049, BR-082, BR-084 | AC-016, AC-018 | FR-030, FR-032, FR-033 | Classification |
| FR-036 | Produce evidence-based classification result | Produce risk output with risk level, confidence, triggered rules and legal refs only when prerequisites pass. | Must | Y | UC-013 | BR-049, BR-050, BR-051 | AC-017, AC-018 | FR-035, NFR-017, NFR-018 | Classification |
| FR-037 | View classification result | Allow Manager to view valid or explicitly degraded/blocked classification status. | Must | Y | UC-013 | BR-049, BR-073 | AC-018 | FR-036 | Classification |
| FR-038 | Generate gap analysis | Generate GapAnalysis from valid or explicitly degraded classification with evidence/legal basis. | Must | Y | UC-014 | BR-062, BR-079 | AC-018 | FR-036 | Document Generation |
| FR-039 | Generate compliance report | Generate final compliance report only when classification/gap/legal/citation/conflict prerequisites pass. | Must | Y | UC-014 | BR-025, BR-063, BR-064 | AC-018, AC-019 | FR-038, NFR-018 | Document Generation |
| FR-040 | Generate readiness-only export | Generate readiness-only export without risk level before evidence is complete. | Should | Y | UC-004, UC-014 | BR-065 | AC-003 | FR-015 | Document Generation |
| FR-041 | View and download document status/artifact | Allow Manager to view document state and download generated artifact when ready. | Should | Y | UC-014 | BR-066 | AC-019 | FR-039 | Document Generation |
| FR-042 | Write audit events | Write audit events for material workflow, evidence, security, conflict, attestation, classification and document actions. | Must | Y | UC-015, UC-017 | BR-024, BR-067, BR-094 | AC-020, AC-023 | NFR-010 | Audit |
| FR-043 | View and export audit trail | Allow Manager to view/export audit metadata without raw source/secrets. | Must | Y | UC-015 | BR-068 | AC-020 | FR-042, NFR-010, NFR-015 | Audit |
| FR-044 | Track artifact versions | Track evidence, report, legal corpus, classification and document versions. | Must | Y | UC-015, UC-016 | BR-069 | AC-020 | FR-018, FR-032, FR-039 | Audit |
| FR-045 | Track attestation usage | Record and disclose human technical attestation usage when used. | Must | Y | UC-015, UC-018 | BR-055, BR-070 | AC-013, AC-020 | FR-046 | Audit |
| FR-046 | Submit structured technical attestation | Allow Developer to submit structured attestation as supplemental input only. | Should | Y | UC-018 | BR-052..BR-056 | AC-013 | FR-011, FR-012 | Audit |
| FR-047 | Accept Developer task | Allow invited Developer to accept scoped task. | Must | Y | UC-018 | BR-019, BR-021, BR-071 | AC-025 | FR-010, FR-011 | Administration |
| FR-048 | Review technical findings | Allow Manager and scoped Developer to view redacted findings and evidence refs. | Must | Y | UC-007, UC-018 | BR-035 | AC-007, AC-022 | FR-018, NFR-014, NFR-015 | Scanner |
| FR-049 | Re-run repository scan | Allow Manager, or delegated Developer, to rerun scan without mutating prior evidence. | Must | Y | UC-016 | BR-040, BR-047, BR-069, BR-077 | AC-004, AC-020 | FR-017, FR-018 | Scanner |
| FR-050 | Support deferred Local/CI scanner report upload | Preserve future Local/CI scanner evidence path as deferred, not active MVP main flow. | Deferred | N | UC-016 | BR-033 | AC-005 | NFR-016 | Platform |
| FR-051 | Support deferred manual evidence JSON upload | Preserve future structured manual evidence path as deferred, not active MVP main flow. | Deferred | N | UC-016 | BR-034 | AC-005, AC-013 | NFR-016 | Platform |
| FR-052 | Support deferred delegated technical clarification | Preserve future delegated technical clarification path while keeping Manager final authority. | Deferred | N | UC-010, UC-018 | BR-044, BR-054 | AC-012, AC-013 | FR-011, FR-029 | Platform |
| FR-053 | Ingest legal sources | Ingest legal source documents from approved URLs (vbpl.vn, vanban.chinhphu.vn), store PDF/HTML snapshots, compute content hashes, and index metadata. | Must | Y | UC-012 | BR-050, BR-084 | AC-016 | NFR-017 | Legal Ingestion |
| FR-054 | Legal corpus review gate | Enforce formal review and approval gate to transition draft corpus items to an active, immutable LegalCorpusVersion. | Must | Y | UC-012 | BR-050 | AC-016 | NFR-017 | Legal Ingestion |
| FR-055 | Configure LLM provider | Support configuration of credentials, endpoints, cost boundaries and timeout rules for a real LLM provider and embedding model. | Must | Y | UC-013 | BR-049 | AC-018 | NFR-001 | Platform |
| FR-056 | Hybrid search | Retrieve citations via combined full-text keyword search and pgvector semantic cosine similarity search. | Must | Y | UC-012 | BR-050, BR-084 | AC-016 | NFR-017 | Legal Matching |

## Legacy Requirements Resolution

| Legacy FR | Resolution | Canonical FR |
|---|---|---|
| FR-001..FR-011 | PLATFORM_BASELINE | FR-001..FR-004 |
| FR-012..FR-014 | PLATFORM_BASELINE | FR-007..FR-009 |
| FR-015..FR-017 | ACTIVE | FR-010, FR-011 |
| FR-018..FR-023 | ACTIVE | FR-013..FR-015 |
| FR-024..FR-025 | ACTIVE | FR-047, FR-016 |
| FR-026 | SUPERSEDED | FR-050 |
| FR-027 | SUPERSEDED | FR-051 |
| FR-028..FR-030 | ACTIVE | FR-048, FR-052, FR-046 |
| FR-031..FR-035 | ACTIVE | FR-020..FR-022 |
| FR-036..FR-042 | ACTIVE | FR-026..FR-030 |
| FR-043..FR-047 | ACTIVE | FR-032..FR-037 |
| FR-048..FR-052 | ACTIVE | FR-038..FR-041 |
| FR-053..FR-057 | ACTIVE | FR-042..FR-045 |
| FR-058..FR-062 | ACTIVE | FR-019 |
| FR-063..FR-065 | PLATFORM_BASELINE | FR-004 |
| FR-066 | ACTIVE | FR-018, FR-049 |
| FR-067 | ACTIVE | FR-030, FR-031 |
| FR-068 | ACTIVE | FR-038 |
| FR-069..FR-073 | ACTIVE | FR-023..FR-025, FR-032..FR-036 |
| FR-074..FR-076 | PLATFORM_BASELINE | FR-005, FR-006 |
| FR-077 | ACTIVE | FR-012, FR-049 |
| FR-078 | MERGED | FR-011, FR-052 |
