# LCSP Requirements Traceability Matrix

## Purpose

This document is the canonical enterprise requirements traceability matrix for LCSP.

## Canonical Inventory and Coverage Status

| Item | Count / Status |
|---|---|
| Canonical FR total | 56 |
| Active MVP FR total | 53 (`FR-001..FR-049`, `FR-053..FR-056`) |
| Deferred FR total | 3 (`FR-050..FR-052`) |
| Active NFR total | 33 (`NFR-001..NFR-030`, `NFR-033..NFR-035`) |
| AC total | 41 |
| Requirement-to-domain/architecture coverage | Tracked in this matrix through Domain Spec and State Machine columns. |
| Requirement-to-implementation-area coverage | Tracked in this matrix through Implementation Area column. |
| Requirement-to-story coverage | STORY_COVERAGE_NOT_ASSESSABLE |
| Story artifact status | CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING |

`NFR-031` and `NFR-032` are legacy identifiers only. `NFR-031` maps to active `NFR-005`; `NFR-032` maps to active `NFR-008`. They are not active NFR catalog rows and must not be counted as active NFRs.

Trace path:

```text
UC -> FR -> AC -> Domain Spec -> State Machine -> Implementation Area
```

## Functional Traceability Matrix

| UC | FR | AC | Domain Spec | State Machine | Implementation Area |
|---|---|---|---|---|---|
| UC-001 | FR-001 | AC-021 | `domain-model.md` | User/session policy outside assessment state | Backend API / Identity |
| UC-001 | FR-002 | AC-021 | `domain-model.md` | User/session policy outside assessment state | Backend API / Identity |
| UC-001 | FR-003 | AC-021 | `domain-model.md` | User/session policy outside assessment state | Backend API / Identity |
| UC-001 | FR-004 | AC-021 | `domain-model.md` | User/session policy outside assessment state | Backend API / Identity |
| UC-001 | FR-005 | AC-021, AC-023 | `domain-model.md` | User/session policy outside assessment state | Backend API / Identity |
| UC-001, UC-005 | FR-006 | AC-023 | `user-task-flows.md` | Assessment: repository connection guarded separately | Backend API / Identity + Repository |
| UC-002 | FR-007 | AC-024 | `domain-model.md` | Organization has no active assessment state | Backend API / Organization |
| UC-002 | FR-008 | AC-024 | `domain-model.md` | Organization has no active assessment state | Backend API / Organization |
| UC-002 | FR-009 | AC-024 | `domain-model.md` | User role/session policy outside assessment state | Backend API / RBAC |
| UC-002 | FR-010 | AC-025 | `user-task-flows.md` | Developer task state outside assessment state | Backend API / RBAC |
| UC-002, UC-018 | FR-011 | AC-025, AC-026 | `user-task-flows.md` | Developer task state outside assessment state | Backend API / RBAC |
| UC-002, UC-010, UC-011, UC-013, UC-014 | FR-012 | AC-025, AC-026 | `user-task-flows.md` | Assessment and Conflict guard states | Backend API / RBAC |
| UC-003 | FR-013 | AC-001 | `domain-model.md` | Assessment | Backend API / Assessment |
| UC-004 | FR-014 | AC-002 | `domain-model.md`, `user-task-flows.md` | Assessment: `CREATED -> WIZARD_PROFILE_READY` | Backend API / Wizard |
| UC-004, UC-014 | FR-015 | AC-003 | `system-context.md`, `document-generation-spec.md` | Assessment: pre-evidence locked states | Web UI / Assessment / Document shell |
| UC-005 | FR-016 | AC-004, AC-023 | `user-task-flows.md` | Assessment: `WIZARD_PROFILE_READY -> REPOSITORY_CONNECTED` | Backend API / Repository Integration |
| UC-006 | FR-017 | AC-004, AC-020 | `domain-model.md`, `event-catalog.md` | Assessment: `REPOSITORY_CONNECTED -> SNAPSHOT_CREATED` | Backend API / Repository Integration |
| UC-007, UC-016 | FR-018 | AC-004 | `scanner-spec.md`, `event-catalog.md` | ScanJob, Assessment scan states | Python Worker |
| UC-007, UC-017 | FR-019 | AC-019, AC-022 | `scanner-spec.md` | ScanJob failure/coverage states | Scanner Worker / Security |
| UC-007, UC-008 | FR-020 | AC-005 | `scanner-spec.md` | TechnicalEvidenceReport | Scanner Worker / Evidence Gate |
| UC-008 | FR-021 | AC-006 | `scanner-spec.md`, `domain-state-machines.md` | TechnicalEvidenceReport | Evidence Gate / Technical Profile Worker |
| UC-008 | FR-022 | AC-007 | `assessment-lifecycle-spec.md`, `domain-model.md` | TechnicalProfile | Technical Profile Worker |
| UC-008, UC-009 | FR-023 | AC-007 | `scanner-spec.md`, `ai-usage-flow-domain-spec.md` | TechnicalProfile, AIUsageFlow | Scanner Worker / AIUsageFlow Worker |
| UC-009 | FR-024 | AC-008 | `ai-usage-flow-domain-spec.md` | AIUsageFlow | AIUsageFlow Worker |
| UC-009 | FR-025 | AC-009 | `ai-usage-flow-domain-spec.md` | AIUsageFlow | AIUsageFlow Worker |
| UC-010 | FR-026 | AC-010 | `assessment-lifecycle-spec.md`, `ai-usage-flow-domain-spec.md` | Conflict, Assessment | Reconciliation Worker |
| UC-010 | FR-027 | AC-011 | `assessment-lifecycle-spec.md` | Conflict | Reconciliation Worker |
| UC-010 | FR-028 | AC-012 | `user-task-flows.md`, `domain-state-machines.md` | Conflict | Backend API / Reconciliation |
| UC-010 | FR-029 | AC-012, AC-013 | `assessment-lifecycle-spec.md`, `domain-state-machines.md` | Conflict, VerifiedProfile | Backend API / Reconciliation |
| UC-011 | FR-030 | AC-014, AC-015 | `assessment-lifecycle-spec.md`, `domain-state-machines.md` | VerifiedProfile, Assessment | Reconciliation Worker |
| UC-011 | FR-031 | AC-015 | `assessment-lifecycle-spec.md`, `domain-state-machines.md` | VerifiedProfile | Backend API / Reconciliation |
| UC-012 | FR-032 | AC-016 | `legal-matching-domain-spec.md`, `legal-classification-spec.md` | LegalRuleMatch | Legal Matching Worker / Hybrid Retriever |
| UC-012 | FR-033 | AC-016 | `legal-matching-domain-spec.md`, `ai-usage-flow-domain-spec.md` | LegalRuleMatch | Legal Matching Worker |
| UC-012, UC-013 | FR-034 | AC-017 | `legal-matching-domain-spec.md`, `legal-classification-spec.md` | LegalRuleMatch, RiskClassification | Legal Matching Worker |
| UC-013 | FR-035 | AC-016, AC-018 | `legal-classification-spec.md` | RiskClassification | Classification Worker |
| UC-013 | FR-036 | AC-017, AC-018 | `legal-classification-spec.md`, `legal-matching-domain-spec.md` | RiskClassification | Classification Worker |
| UC-013 | FR-037 | AC-018 | `legal-classification-spec.md` | RiskClassification | Backend API / Classification UI |
| UC-014 | FR-038 | AC-018 | `document-generation-spec.md`, `legal-classification-spec.md` | RiskClassification | Gap Analysis Worker |
| UC-014 | FR-039 | AC-018, AC-019 | `document-generation-spec.md` | GeneratedDocument | Document Worker |
| UC-004, UC-014 | FR-040 | AC-003 | `document-generation-spec.md`, `system-context.md` | GeneratedDocument / pre-classification states | Document Worker / Web UI |
| UC-014 | FR-041 | AC-019 | `document-generation-spec.md` | GeneratedDocument | Backend API / Document |
| UC-015, UC-017 | FR-042 | AC-020, AC-023 | `event-catalog.md`, `domain-model.md` | All state machines | Audit Service |
| UC-015 | FR-043 | AC-020 | `domain-model.md`, `event-catalog.md` | AuditEvent | Backend API / Audit |
| UC-015, UC-016 | FR-044 | AC-020 | `domain-model.md`, `event-catalog.md` | Evidence/Profile/Legal/Document state machines | Audit / Persistence |
| UC-015, UC-018 | FR-045 | AC-013, AC-020 | `user-task-flows.md`, `document-generation-spec.md` | Conflict, RiskClassification, GeneratedDocument | Audit / Document |
| UC-018 | FR-046 | AC-013 | `user-task-flows.md`, `assessment-lifecycle-spec.md` | Conflict | Backend API / Attestation |
| UC-018 | FR-047 | AC-025 | `user-task-flows.md` | Developer task state outside assessment state | Backend API / RBAC |
| UC-007, UC-018 | FR-048 | AC-007, AC-022 | `scanner-spec.md`, `domain-model.md` | TechnicalEvidenceReport, TechnicalProfile | Backend API / Scanner UI |
| UC-016 | FR-049 | AC-004, AC-020 | `scanner-spec.md`, `domain-state-machines.md` | ScanJob, Assessment | Backend API / Scanner Worker |
| UC-016 | FR-050 | AC-005 | `scanner-spec.md` | Deferred evidence path | Deferred / Future Evidence API |
| UC-016 | FR-051 | AC-005, AC-013 | `scanner-spec.md` | Deferred evidence path | Deferred / Future Evidence API |
| UC-010, UC-018 | FR-052 | AC-012, AC-013 | `assessment-lifecycle-spec.md` | Conflict | Deferred / Future Clarification |
| UC-M07-01 | FR-053 | AC-016 | `legal-corpus-source-spec.md` | LegalCorpusVersion | Legal Ingestion Worker |
| UC-M07-01 | FR-054 | AC-016 | `legal-corpus-source-spec.md` | LegalCorpusVersion | Legal Ingestion Worker / Approval Gate |
| UC-M07-02 | FR-055 | AC-018 | `domain-model.md` | Assessment | Backend API / Platform |
| UC-M07-01 | FR-056 | AC-016 | `legal-matching-domain-spec.md` | LegalRuleMatch | Legal Matching Worker / Hybrid Retriever |

## Acceptance Criteria Coverage

| AC | Covered By FRs | Covered By UCs |
|---|---|---|
| AC-001 | FR-013 | UC-003 |
| AC-002 | FR-014 | UC-004 |
| AC-003 | FR-015, FR-040 | UC-004, UC-014 |
| AC-004 | FR-016, FR-017, FR-018, FR-049 | UC-005, UC-006, UC-007, UC-016 |
| AC-005 | FR-020, FR-050, FR-051 | UC-007, UC-008, UC-016 |
| AC-006 | FR-021 | UC-008 |
| AC-007 | FR-022, FR-023, FR-048 | UC-008, UC-009 |
| AC-008 | FR-024 | UC-009 |
| AC-009 | FR-025 | UC-009 |
| AC-010 | FR-026 | UC-010 |
| AC-011 | FR-027 | UC-010 |
| AC-012 | FR-028, FR-029, FR-052 | UC-010 |
| AC-013 | FR-029, FR-045, FR-046, FR-051, FR-052 | UC-010, UC-018 |
| AC-014 | FR-030 | UC-011 |
| AC-015 | FR-030, FR-031 | UC-011 |
| AC-016 | FR-032, FR-033, FR-035 | UC-012, UC-013 |
| AC-017 | FR-034, FR-036 | UC-012, UC-013 |
| AC-018 | FR-035, FR-036, FR-037, FR-038, FR-039 | UC-013, UC-014 |
| AC-019 | FR-019, FR-039, FR-041 | UC-014, UC-017 |
| AC-020 | FR-017, FR-042, FR-043, FR-044, FR-045, FR-049 | UC-006, UC-015, UC-016 |
| AC-021 | FR-001..FR-005 | UC-001 |
| AC-022 | FR-019, FR-043, FR-048 | UC-015, UC-017 |
| AC-023 | FR-005, FR-006, FR-016, FR-042 | UC-001, UC-005, UC-017 |
| AC-024 | FR-007..FR-009, FR-013 | UC-002, UC-003 |
| AC-025 | FR-010..FR-012, FR-047 | UC-002, UC-018 |
| AC-026 | FR-011, FR-012 | UC-002 |
| AC-027 | FR-039 | UC-M08-02 |
| AC-028 | FR-018 | UC-M04-08 |
| AC-029 | FR-018 | UC-M04-08 |
| AC-030 | FR-019 | UC-M10-03 |
| AC-031 | FR-023 | UC-M04-08 |
| AC-032 | FR-023 | UC-M04-08 |
| AC-033 | FR-028 | UC-M06-03 |
| AC-034 | FR-034 | UC-M07-04 |
| AC-035 | FR-032 | UC-M07-01 |
| AC-036 | FR-032 | UC-M07-01 |
| AC-037 | FR-035 | UC-M07-02 |
| AC-038 | FR-035 | UC-M07-02 |
| AC-039 | FR-044 | UC-M09-04 |
| AC-040 | FR-042 | UC-M09-01 |
| AC-041 | FR-039 | UC-M08-02 |

## NFR Coverage

| NFR | Primary FRs | Primary UCs | Verification Focus |
|---|---|---|---|
| NFR-001 | FR-001, FR-002, FR-005 | UC-001 | Authentication denial and audit. |
| NFR-002 | FR-004 | UC-001 | Expired/revoked session behavior. |
| NFR-003 | FR-003 | UC-001 | MFA secret/OTP behavior. |
| NFR-004 | FR-002, FR-003 | UC-001 | Rate limit/lockout. |
| NFR-005 | FR-005 | UC-001 | OAuth callback/linking validation. |
| NFR-006 | FR-006 | UC-001, UC-005 | OAuth/GitHub separation. |
| NFR-007 | FR-016, FR-018 | UC-005, UC-007 | Read-only selected repo scope. |
| NFR-008 | FR-007..FR-013 | UC-002, UC-003 | RBAC / Manager authority. |
| NFR-009 | FR-010..FR-012, FR-047 | UC-002, UC-018 | Scoped Developer policy. |
| NFR-010 | FR-042..FR-045 | UC-015 | Audit coverage. |
| NFR-011 | FR-042, FR-043 | UC-015 | Append-oriented audit. |
| NFR-012 | FR-019 | UC-017 | No raw source to LLM. |
| NFR-013 | FR-019 | UC-017 | No long-term raw source. |
| NFR-014 | FR-048 | UC-007, UC-018 | Redacted finding exposure. |
| NFR-015 | FR-019, FR-043 | UC-017 | Secret redaction. |
| NFR-016 | FR-020, FR-044 | UC-007, UC-015 | Evidence provenance/hash. |
| NFR-017 | FR-032, FR-034, FR-036 | UC-012, UC-013 | Rule/citation/version trace. |
| NFR-018 | FR-025, FR-030, FR-034..FR-039 | UC-009, UC-011, UC-012, UC-013, UC-014 | Fail-closed gates. |
| NFR-019 | FR-033, FR-035 | UC-012, UC-013 | No provider-only classification. |
| NFR-020 | FR-039 | UC-014 | Document overclaim prevention. |
| NFR-021 | FR-018, FR-035, FR-039 | UC-007, UC-013, UC-014 | Async job reliability. |
| NFR-022 | FR-021, FR-037, FR-041 | UC-008, UC-013, UC-014 | Actionable blocked state. |
| NFR-023 | FR-018 | UC-007 | Scanner bounds. |
| NFR-024 | FR-018, FR-035, FR-039 | UC-007, UC-013, UC-014 | Worker separation. |
| NFR-025 | FR-001..FR-056 | UC-001..UC-018 | Module ownership traceability. |
| NFR-026 | FR-021, FR-042 | UC-008, UC-015 | Correlation/failure observability. |
| NFR-027 | FR-014, FR-037, FR-041 | UC-004, UC-013, UC-014 | UI accessibility. |
| NFR-028 | FR-014, FR-015, FR-021 | UC-004, UC-008 | Business language and status clarity. |
| NFR-029 | FR-023..FR-025, FR-032, FR-033 | UC-009, UC-012 | Evidence refs on usage claims. |
| NFR-030 | FR-044, FR-049 | UC-015, UC-016 | Historical evidence versioning. |
| NFR-033 | FR-055 | UC-M07-02 | LLM cost control and token logging. |
| NFR-034 | FR-032 | UC-M07-01 | Immutable LegalCorpusVersion and approval gate. |
| NFR-035 | FR-019 | UC-M10-03 | Standalone Python Worker sandbox directory restriction and cleanup. |

### Legacy NFR Alias Remapping

| Legacy Identifier | Active NFR | Meaning |
|---|---|---|
| NFR-031 | NFR-005 | OAuth identity-linking safety. |
| NFR-032 | NFR-008 | Manager super-role enforcement. |

## Orphan Check

| Item Type | Result |
|---|---|
| FR | 56 of 56 appear in Functional Traceability Matrix. |
| AC | 41 of 41 appear in Acceptance Criteria Coverage. |
| NFR | 33 of 33 active NFRs appear in NFR Coverage. Legacy NFR-031 and NFR-032 are remapped aliases, not active rows. |
| UC | 18 of 18 appear in Functional Traceability Matrix or NFR Coverage. |
| Story coverage | Not assessable until canonical epics/stories artifact exists. |

## Final Traceability Decision

TRACEABILITY_MATRIX_COMPLETED

NO_ORPHAN_REQUIREMENTS

NO_ORPHAN_ACCEPTANCE_CRITERIA

NO_UNRESOLVED_REQUIREMENT_IDS

STORY_COVERAGE_NOT_ASSESSABLE

CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
