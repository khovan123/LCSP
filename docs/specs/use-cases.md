# LCSP Use Cases

## Purpose

This document is the canonical active use-case catalog for LCSP. It defines user and system outcomes for the A-to-Z runnable MVP without creating implementation detail, backlog, stories, or new product scope.

## Governance

- Canonical use-case IDs are `UC-001..UC-018`.
- Legacy `UC-MXX-XX` identifiers are source aliases only and must not appear in active traceability columns.
- Canonical functional requirement IDs are `FR-001..FR-056`.
- `FR-050..FR-052` are Deferred and are never part of the active MVP golden path.
- Optional Developer participation must not block Manager completion.
- Structured technical attestation under `FR-046` is active optional MVP input; delegated technical clarification workflow under `FR-052` is Deferred.
- Legal corpus ingestion and approval are internal operations, not Manager/Developer product UX in the MVP.

## Use Case Inventory

| UC ID | Name | Primary Actor | Status | Canonical FRs |
|---|---|---|---|---|
| UC-001 | Authenticate and Manage Account | Manager / Developer | ACTIVE | FR-001..FR-006 |
| UC-002 | Manage Organization and Roles | Manager | ACTIVE | FR-007..FR-012 |
| UC-003 | Create Assessment | Manager | ACTIVE | FR-013 |
| UC-004 | Complete WizardProfile and Readiness | Manager | ACTIVE | FR-014, FR-015, FR-040 |
| UC-005 | Connect Repository | Manager; optional delegated Developer | ACTIVE | FR-006, FR-016 |
| UC-006 | Create Repository Snapshot | Manager / LCSP System | ACTIVE | FR-017 |
| UC-007 | Execute Repository Scan | Manager / LCSP System; optional delegated Developer | ACTIVE | FR-018..FR-020, FR-048 |
| UC-008 | Generate TechnicalProfile | LCSP System | ACTIVE | FR-021..FR-023 |
| UC-009 | Generate AIUsageFlow | LCSP System | ACTIVE | FR-023..FR-025 |
| UC-010 | Resolve Conflict | Manager | ACTIVE | FR-026..FR-029 |
| UC-011 | Create and Approve VerifiedProfile | Manager / LCSP System | ACTIVE | FR-030, FR-031 |
| UC-012 | Operate Legal Corpus and Perform Legal Matching | Internal Legal Operator / LCSP System | ACTIVE | FR-032..FR-034, FR-053, FR-054, FR-056 |
| UC-013 | Run Risk Classification | Manager / LCSP System | ACTIVE | FR-035..FR-037, FR-055 |
| UC-014 | Generate Gap Analysis and Documents | Manager / LCSP System | ACTIVE | FR-038..FR-041 |
| UC-015 | Review and Export Audit Trail | Manager / LCSP System | ACTIVE | FR-042..FR-045 |
| UC-016 | Re-run Assessment Evidence | Manager; optional delegated Developer | ACTIVE | FR-049 |
| UC-017 | Enforce Security and Privacy Controls | LCSP System | ACTIVE | FR-019, FR-042, FR-048 |
| UC-018 | Submit Optional Developer Attestation | Developer / Manager | ACTIVE | FR-010..FR-012, FR-045..FR-047 |

## UC-001 Authenticate and Manage Account

| Field | Content |
|---|---|
| Goal | Allow authorized users to register, authenticate, configure MFA, and manage account/session state. |
| Preconditions | User has a valid invitation, organization membership, or approved signup path. |
| Main flow | Validate password or OAuth/OIDC callback, enforce MFA/session policy, create or update the session, and audit the outcome without secrets. |
| Exceptions | Invalid credentials, OTP, callback, linking, expired session, or rate limit blocks access with a safe error. |
| Postconditions | Authenticated session exists or access is denied with an auditable reason. |
| Business Rules | BR-001..BR-013, BR-074..BR-076, BR-086..BR-088, BR-094 |
| Functional Requirements | FR-001..FR-006 |
| Acceptance Criteria | AC-021, AC-023 |

## UC-002 Manage Organization and Roles

| Field | Content |
|---|---|
| Goal | Maintain tenant, Manager authority, and scoped Developer collaboration. |
| Preconditions | Manager is authenticated and organization-scoped. |
| Main flow | Create organization, manage members, assign Manager role, invite Developer, and assign or revoke scoped Developer policies. |
| Exceptions | Cross-tenant action, revoked policy, or Developer attempt at Manager-only action is denied and audited. |
| Postconditions | Membership and policy state is updated or denied. |
| Business Rules | BR-014..BR-022, BR-089..BR-092 |
| Functional Requirements | FR-007..FR-012 |
| Acceptance Criteria | AC-024..AC-026 |

## UC-003 Create Assessment

| Field | Content |
|---|---|
| Goal | Start a Manager-owned compliance assessment. |
| Preconditions | Manager is authenticated and organization-scoped. |
| Main flow | Create Assessment, record owner, set initial state, and write AuditEvent. |
| Exceptions | Missing tenant or authorization blocks creation. |
| Postconditions | Assessment exists in `CREATED`. |
| Functional Requirements | FR-013 |
| Acceptance Criteria | AC-001 |

## UC-004 Complete WizardProfile and Readiness

| Field | Content |
|---|---|
| Goal | Capture business/legal context in plain language and show readiness without a risk label. |
| Preconditions | Assessment exists and Manager owns it. |
| Main flow | Save and submit purpose, sector, data, affected people, decision role, oversight, and external LLM answers. |
| Exceptions | Missing critical fields remain explicit readiness gaps; Wizard-only state never unlocks classification. |
| Postconditions | WizardProfile exists; readiness or readiness-only export may be shown without HIGH/MEDIUM/LOW. |
| Functional Requirements | FR-014, FR-015, FR-040 |
| Acceptance Criteria | AC-002, AC-003 |

## UC-005 Connect Repository

| Field | Content |
|---|---|
| Goal | Connect a selected GitHub repository as the active MVP technical-evidence path. |
| Preconditions | Assessment exists and actor has repository permission. |
| Main flow | Select repository/branch, verify GitHub App read-only authorization, persist RepositoryConnection, and audit. |
| Exceptions | Missing GitHub authorization, wrong scope, or OAuth/GitHub confusion blocks connection. |
| Postconditions | RepositoryConnection exists. |
| Functional Requirements | FR-006, FR-016 |
| Acceptance Criteria | AC-004, AC-023 |

## UC-006 Create Repository Snapshot

| Field | Content |
|---|---|
| Goal | Pin evidence to immutable branch/commit metadata. |
| Preconditions | RepositoryConnection exists. |
| Main flow | Resolve selected commit, create RepositorySnapshot metadata, and audit. |
| Exceptions | Inaccessible repository or commit blocks snapshot creation. |
| Postconditions | RepositorySnapshot exists. |
| Functional Requirements | FR-017 |
| Acceptance Criteria | AC-004, AC-020 |

## UC-007 Execute Repository Scan

| Field | Content |
|---|---|
| Goal | Convert a commit-pinned snapshot into static technical evidence. |
| Preconditions | RepositorySnapshot exists and actor may request a scan. |
| Main flow | Create ScanJob, publish `command.scan.requested.v1`, run Python Worker static analysis, persist redacted evidence metadata, and emit completed or failed event. |
| Exceptions | Repository access, parser, privacy, schema, sandbox, or cleanup failures produce bounded coverage or fail-closed state. |
| Postconditions | TechnicalEvidenceReport exists or failure is recorded. |
| Functional Requirements | FR-018..FR-020, FR-048 |
| Acceptance Criteria | AC-004, AC-005, AC-028..AC-032 |

## UC-008 Generate TechnicalProfile

| Field | Content |
|---|---|
| Goal | Normalize accepted evidence into technical dimensions. |
| Preconditions | TechnicalEvidenceReport passed schema, privacy, and quality gates. |
| Main flow | Aggregate provider, invocation, data, output, decision, human-review, and domain signals into TechnicalProfile. |
| Exceptions | Invalid or insufficient evidence blocks the profile with an actionable reason. |
| Postconditions | TechnicalProfile exists with evidence refs and explicit unknowns. |
| Functional Requirements | FR-021..FR-023 |
| Acceptance Criteria | AC-006, AC-007, AC-032 |

## UC-009 Generate AIUsageFlow

| Field | Content |
|---|---|
| Goal | Produce evidence-backed business usage claims. |
| Preconditions | WizardProfile, TechnicalProfile, and accepted evidence exist. |
| Main flow | Generate claims, confidence, uncertainty, and conflict candidates with claim-level evidence refs. |
| Exceptions | Unknown critical usage remains `UNCLEAR` and blocks unsupported downstream conclusions. |
| Postconditions | AIUsageFlow exists or downstream is blocked. |
| Functional Requirements | FR-023..FR-025 |
| Acceptance Criteria | AC-008, AC-009, AC-031, AC-032 |

## UC-010 Resolve Conflict

| Field | Content |
|---|---|
| Goal | Resolve material mismatch while preserving machine evidence. |
| Preconditions | Conflict exists and Manager owns the assessment. |
| Main flow | Manager reviews compared values/evidence, records rationale, and reruns reconciliation. |
| Optional input | Active MVP may use structured attestation under FR-046 as supplemental input. |
| Deferred | Delegated technical clarification workflow under FR-052 is not part of active MVP UX. |
| Exceptions | Missing rationale or unresolved conflict keeps classification blocked. |
| Postconditions | Conflict is resolved or remains blocking. |
| Functional Requirements | FR-026..FR-029 |
| Acceptance Criteria | AC-010..AC-012, AC-033 |

## UC-011 Create and Approve VerifiedProfile

| Field | Content |
|---|---|
| Goal | Create the reconciled basis for legal matching. |
| Preconditions | WizardProfile, TechnicalProfile, AIUsageFlow exist and conflicts are absent or resolved. |
| Main flow | Create VerifiedProfile and apply Manager review/approval where required. |
| Exceptions | Any unresolved material conflict blocks creation or approval. |
| Postconditions | VerifiedProfile exists and legal matching may start. |
| Functional Requirements | FR-030, FR-031 |
| Acceptance Criteria | AC-014, AC-015 |

## UC-012 Operate Legal Corpus and Perform Legal Matching

| Field | Content |
|---|---|
| Goal | Maintain an approved immutable legal corpus and match verified usage to citation-backed rules. |
| Primary Actors | Internal Legal Operator for ingestion/approval; LCSP System for retrieval/matching. |
| UX Boundary | Corpus administration is internal operations/API/CLI for MVP and is excluded from Manager/Developer product UX. |
| Preconditions | Approved source URLs and LegalCorpusVersion exist; VerifiedProfile exists for matching. |
| Main flow | Ingest and hash official-source snapshots, review/approve corpus version, build FTS/vector index, retrieve candidates, evaluate citation coverage, and persist LegalRuleMatch. |
| Exceptions | Unapproved/obsolete corpus, missing citation, unavailable source, or unknown critical fact blocks or degrades output. |
| Postconditions | Approved corpus and LegalRuleMatch records exist, or an explicit blocked state is recorded. |
| Functional Requirements | FR-032..FR-034, FR-053, FR-054, FR-056 |
| Acceptance Criteria | AC-016, AC-017, AC-034..AC-036 |

## UC-013 Run Risk Classification

| Field | Content |
|---|---|
| Goal | Produce evidence- and citation-backed classification or blocked state. |
| Preconditions | VerifiedProfile and LegalRuleMatch records exist; real LLM provider configuration is available for A-to-Z acceptance. |
| Main flow | Validate guardrails, invoke the configured LLM Gateway where allowed, validate structured output, persist RiskClassification, and audit. |
| Exceptions | Missing citation, provider outage, invalid schema, unknown critical usage, or provider-only evidence fails closed. |
| Postconditions | Classification completes or is blocked with reasons. |
| Functional Requirements | FR-035..FR-037, FR-055 |
| Acceptance Criteria | AC-018, AC-034, AC-037, AC-038 |

## UC-014 Generate Gap Analysis and Documents

| Field | Content |
|---|---|
| Goal | Produce gap analysis, final compliance report, or readiness-only output under guardrails. |
| Preconditions | Final report requires completed classification, gap analysis, legal trace, and no unresolved conflict. |
| Main flow | Generate GapAnalysis, request document generation, store artifact in object storage, expose status/download, and audit. |
| Alternative | Readiness-only export may be generated before evidence completion but contains no risk level. |
| Exceptions | Missing citation, conflict, invalid classification, or generation guardrail failure blocks final output. |
| Postconditions | GapAnalysis and GeneratedDocument exist, or blocked reason is recorded. |
| Functional Requirements | FR-038..FR-041 |
| Acceptance Criteria | AC-003, AC-018, AC-019, AC-041 |

## UC-015 Review and Export Audit Trail

| Field | Content |
|---|---|
| Goal | Trace material workflow, evidence, conflict, legal, classification, attestation, and document events. |
| Preconditions | Assessment exists. |
| Main flow | Record append-oriented redacted AuditEvents, display them to Manager, and export allowed metadata. |
| Exceptions | Raw source, secrets, provider tokens, and full prompts are excluded. |
| Postconditions | Audit trail is viewable/exportable without sensitive leakage. |
| Functional Requirements | FR-042..FR-045 |
| Acceptance Criteria | AC-020, AC-039, AC-040 |

## UC-016 Re-run Assessment Evidence

| Field | Content |
|---|---|
| Goal | Recover from failed/weak evidence or changed repository state without mutating history. |
| Preconditions | Repository connection and prior evidence state exist. |
| Main flow | Select same/new snapshot, create a new idempotent ScanJob, and rebuild downstream evidence chain. |
| Deferred | Local/CI report upload (`FR-050`) and manual evidence JSON upload (`FR-051`) are not active MVP paths. |
| Postconditions | New evidence chain exists; previous chain remains traceable. |
| Functional Requirements | FR-049 |
| Acceptance Criteria | AC-004, AC-020, AC-028 |

## UC-017 Enforce Security and Privacy Controls

| Field | Content |
|---|---|
| Goal | Keep source, secrets, prompts, tokens, logs, and audit records within guardrails. |
| Main flow | Enforce no-raw-source-to-LLM, redaction, metadata-only persistence, restricted workspace, cleanup, and auditable fail-closed behavior. |
| Exceptions | Any control failure blocks or fails the affected operation. |
| Functional Requirements | FR-019, FR-042, FR-048 |
| Acceptance Criteria | AC-022, AC-023, AC-030, AC-041 |

## UC-018 Submit Optional Developer Attestation

| Field | Content |
|---|---|
| Goal | Capture scoped structured Developer attestation as optional supplemental input. |
| Preconditions | Developer has invitation, accepted task, and active policy. |
| Main flow | Submit role, claim, scope, reason, evidence refs, and timestamp; validate and store separately from scanner evidence; allow Manager review. |
| Guardrails | Attestation cannot replace machine metadata, resolve conflict, approve VerifiedProfile, or unlock classification by itself. |
| Deferred | Free-form/delegated technical clarification workflow under FR-052 is not active MVP UX. |
| Postconditions | Attestation is recorded and auditable, or rejected with reason. |
| Functional Requirements | FR-010..FR-012, FR-045..FR-047 |
| Acceptance Criteria | AC-013, AC-025, AC-026 |

## Legacy Alias Policy

Legacy `UC-MXX-XX` identifiers remain only in historical recovery tables under `requirements-baseline.md`. Active product, UX, acceptance, traceability, story, and implementation artifacts must use `UC-001..UC-018`.