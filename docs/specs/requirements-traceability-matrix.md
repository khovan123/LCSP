# LCSP Requirements Traceability Matrix

## Purpose

This document is the canonical enterprise requirements traceability matrix for LCSP. Active rows use only canonical `UC-001..UC-018`, `FR-001..FR-056`, `AC-001..AC-041`, and active NFR identifiers.

## Canonical Inventory and Coverage Status

| Item | Count / Status |
|---|---|
| Canonical FR total | 56 |
| Active MVP FR total | 53 (`FR-001..FR-049`, `FR-053..FR-056`) |
| Deferred FR total | 3 (`FR-050..FR-052`) |
| Active NFR total | 33 (`NFR-001..NFR-030`, `NFR-033..NFR-035`) |
| AC total | 41 |
| Requirement-to-domain/architecture coverage | Tracked below |
| Requirement-to-implementation-area coverage | Tracked below |
| Requirement-to-story coverage | STORY_COVERAGE_NOT_ASSESSABLE |
| Story artifact status | CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING |
| UX specification status | CANONICAL_UX_PENDING |

`NFR-031` and `NFR-032` are legacy identifiers only. They map to active `NFR-005` and `NFR-008` respectively and are not active rows.

Trace path:

```text
UC -> FR -> AC -> Domain Spec -> State Machine -> Implementation Area
```

## Functional Traceability Matrix

| UC | FR | AC | Domain Spec | State Machine | Implementation Area |
|---|---|---|---|---|---|
| UC-001 | FR-001 | AC-021 | `domain-model.md` | Identity/session policy | Backend API / Identity |
| UC-001 | FR-002 | AC-021 | `domain-model.md` | Identity/session policy | Backend API / Identity |
| UC-001 | FR-003 | AC-021 | `domain-model.md` | Identity/session policy | Backend API / Identity |
| UC-001 | FR-004 | AC-021, AC-022 | `domain-model.md` | Identity/session policy | Backend API / Identity |
| UC-001 | FR-005 | AC-021, AC-023 | `domain-model.md` | OAuth callback policy | Backend API / Identity |
| UC-001, UC-005 | FR-006 | AC-023 | `user-task-flows.md` | Repository authorization guard | Backend API / Identity + Repository |
| UC-002 | FR-007 | AC-024 | `domain-model.md` | Organization policy | Backend API / Organization |
| UC-002 | FR-008 | AC-024 | `domain-model.md` | Organization policy | Backend API / Organization |
| UC-002 | FR-009 | AC-024 | `domain-model.md` | Role policy | Backend API / RBAC |
| UC-002, UC-018 | FR-010 | AC-025 | `user-task-flows.md` | Developer task policy | Backend API / RBAC |
| UC-002, UC-018 | FR-011 | AC-025, AC-026 | `user-task-flows.md` | Developer task policy | Backend API / RBAC |
| UC-002, UC-010, UC-011, UC-013, UC-014, UC-018 | FR-012 | AC-025, AC-026 | `user-task-flows.md` | Manager-only guards | Backend API / RBAC |
| UC-003 | FR-013 | AC-001 | `domain-model.md` | Assessment | Backend API / Assessment |
| UC-004 | FR-014 | AC-002 | `domain-model.md`, `user-task-flows.md` | Assessment: `CREATED -> WIZARD_PROFILE_READY` | Backend API / Wizard |
| UC-004, UC-014 | FR-015 | AC-003 | `system-context.md`, `document-generation-spec.md` | Pre-evidence locked states | Web UI / Assessment |
| UC-005 | FR-016 | AC-004, AC-023 | `user-task-flows.md` | Assessment: repository connection | Backend API / Repository |
| UC-006 | FR-017 | AC-004, AC-020 | `domain-model.md`, `event-catalog.md` | Assessment: snapshot created | Backend API / Repository |
| UC-007, UC-016 | FR-018 | AC-004, AC-028, AC-029 | `scanner-spec.md`, `event-catalog.md` | ScanJob | Python Worker |
| UC-007, UC-017 | FR-019 | AC-005, AC-022, AC-029, AC-030 | `scanner-spec.md` | ScanJob failure/coverage | Python Worker / Security |
| UC-007, UC-008 | FR-020 | AC-005 | `scanner-spec.md` | TechnicalEvidenceReport | Evidence Gate |
| UC-008 | FR-021 | AC-006 | `scanner-spec.md`, `domain-state-machines.md` | TechnicalEvidenceReport | Evidence Gate / Technical Profile Worker |
| UC-008 | FR-022 | AC-007 | `assessment-lifecycle-spec.md`, `domain-model.md` | TechnicalProfile | Technical Profile Worker |
| UC-007, UC-008, UC-009 | FR-023 | AC-007, AC-031, AC-032 | `scanner-spec.md`, `ai-usage-flow-domain-spec.md` | TechnicalProfile / AIUsageFlow | Python Worker / AIUsageFlow Worker |
| UC-009 | FR-024 | AC-008 | `ai-usage-flow-domain-spec.md` | AIUsageFlow | AIUsageFlow Worker |
| UC-009 | FR-025 | AC-009, AC-031, AC-032 | `ai-usage-flow-domain-spec.md` | AIUsageFlow | AIUsageFlow Worker |
| UC-010 | FR-026 | AC-010, AC-033 | `assessment-lifecycle-spec.md` | Conflict / Assessment | Reconciliation Worker |
| UC-010 | FR-027 | AC-011 | `assessment-lifecycle-spec.md` | Conflict | Reconciliation Worker |
| UC-010 | FR-028 | AC-012, AC-033 | `user-task-flows.md`, `domain-state-machines.md` | Conflict | Backend API / Reconciliation |
| UC-010 | FR-029 | AC-012, AC-033 | `assessment-lifecycle-spec.md`, `domain-state-machines.md` | Conflict / VerifiedProfile | Backend API / Reconciliation |
| UC-011 | FR-030 | AC-014, AC-015 | `assessment-lifecycle-spec.md`, `domain-state-machines.md` | VerifiedProfile | Reconciliation Worker |
| UC-011 | FR-031 | AC-015 | `assessment-lifecycle-spec.md` | VerifiedProfile | Backend API / Reconciliation |
| UC-012 | FR-032 | AC-016, AC-035, AC-036 | `legal-matching-domain-spec.md`, `legal-classification-spec.md` | LegalRuleMatch | Hybrid Retriever / Legal Matching Worker |
| UC-012 | FR-033 | AC-016, AC-036 | `legal-matching-domain-spec.md` | LegalRuleMatch | Legal Matching Worker |
| UC-012, UC-013 | FR-034 | AC-017, AC-034, AC-036 | `legal-matching-domain-spec.md`, `legal-classification-spec.md` | LegalRuleMatch / RiskClassification | Legal Matching Worker |
| UC-013 | FR-035 | AC-016, AC-018, AC-037, AC-038 | `legal-classification-spec.md` | RiskClassification | Classification Worker |
| UC-013 | FR-036 | AC-017, AC-018, AC-034 | `legal-classification-spec.md` | RiskClassification | Classification Worker |
| UC-013 | FR-037 | AC-018 | `legal-classification-spec.md` | RiskClassification | Backend API / Classification UI |
| UC-014 | FR-038 | AC-018 | `document-generation-spec.md` | GapAnalysis | Gap Analysis Worker |
| UC-014 | FR-039 | AC-018, AC-019, AC-027, AC-041 | `document-generation-spec.md` | GeneratedDocument | Document Worker |
| UC-004, UC-014 | FR-040 | AC-003, AC-019 | `document-generation-spec.md`, `system-context.md` | Pre-classification document state | Document Worker / Web UI |
| UC-014 | FR-041 | AC-019, AC-041 | `document-generation-spec.md` | GeneratedDocument | Backend API / Document |
| UC-015, UC-017 | FR-042 | AC-020, AC-039, AC-040 | `event-catalog.md`, `domain-model.md` | All state machines | Audit / Outbox |
| UC-015 | FR-043 | AC-020, AC-022 | `domain-model.md` | AuditEvent | Backend API / Audit |
| UC-015, UC-016 | FR-044 | AC-020, AC-039, AC-040 | `domain-model.md` | Versioned artifacts | Audit / Persistence |
| UC-015, UC-018 | FR-045 | AC-013, AC-020 | `user-task-flows.md` | Attestation/audit state | Audit / Document |
| UC-018 | FR-046 | AC-013 | `user-task-flows.md`, `assessment-lifecycle-spec.md` | Supplemental input only | Backend API / Attestation |
| UC-018 | FR-047 | AC-025 | `user-task-flows.md` | Developer task policy | Backend API / RBAC |
| UC-007, UC-018 | FR-048 | AC-007, AC-022 | `scanner-spec.md`, `domain-model.md` | Evidence views | Backend API / Scanner UI |
| UC-016 | FR-049 | AC-004, AC-020, AC-028, AC-039 | `scanner-spec.md`, `domain-state-machines.md` | ScanJob / version chain | Backend API / Python Worker |
| UC-016 | FR-050 | AC-005 | `scanner-spec.md` | Deferred evidence path | Deferred / Future Evidence API |
| UC-016 | FR-051 | AC-005 | `scanner-spec.md` | Deferred evidence path | Deferred / Future Evidence API |
| UC-010, UC-018 | FR-052 | AC-012, AC-013 | `assessment-lifecycle-spec.md` | Deferred clarification path | Deferred / Future Clarification |
| UC-012 | FR-053 | AC-016 | `legal-corpus-source-spec.md` | LegalSource / LegalDocument | Legal Ingestion Worker |
| UC-012 | FR-054 | AC-016, AC-035 | `legal-corpus-source-spec.md` | LegalCorpusVersion | Internal Approval Gate |
| UC-013 | FR-055 | AC-018, AC-037, AC-038 | `llm-gateway-implementation.md` | Provider configuration | Platform / LLM Gateway |
| UC-012 | FR-056 | AC-016, AC-035, AC-036 | `legal-matching-domain-spec.md` | LegalRuleMatch | Hybrid Retriever |

## Acceptance Criteria Coverage

| AC Range | Canonical UCs | Primary FR Coverage |
|---|---|---|
| AC-001..AC-006 | UC-003..UC-008 | FR-013..FR-021 |
| AC-007..AC-009 | UC-008, UC-009 | FR-022..FR-025, FR-048 |
| AC-010..AC-015 | UC-010, UC-011, UC-018 | FR-026..FR-031, FR-045, FR-046 |
| AC-016..AC-019 | UC-012..UC-014 | FR-032..FR-041, FR-053..FR-056 |
| AC-020 | UC-006, UC-015, UC-016 | FR-017, FR-042..FR-045, FR-049 |
| AC-021..AC-026 | UC-001, UC-002, UC-005, UC-017, UC-018 | FR-001..FR-013, FR-016, FR-019, FR-043, FR-047, FR-048 |
| AC-027 | UC-001, UC-003..UC-015, UC-017 | Active A-to-Z requirement set |
| AC-028..AC-032 | UC-007..UC-009, UC-016, UC-017 | FR-018, FR-019, FR-023, FR-025, FR-049 |
| AC-033 | UC-010 | FR-026, FR-028, FR-029 |
| AC-034..AC-036 | UC-012, UC-013 | FR-032..FR-036, FR-054, FR-056 |
| AC-037, AC-038 | UC-013 | FR-035, FR-055 |
| AC-039, AC-040 | UC-015, UC-016 | FR-042, FR-044, FR-049 |
| AC-041 | UC-014, UC-017 | FR-039, FR-041 |

## NFR Coverage

| NFR | Primary FRs | Primary UCs | Verification Focus |
|---|---|---|---|
| NFR-001 | FR-001, FR-002, FR-005 | UC-001 | Authentication denial and audit |
| NFR-002 | FR-002, FR-004 | UC-001 | Session expiry/revocation |
| NFR-003 | FR-003 | UC-001 | MFA secret and OTP protection |
| NFR-004 | FR-002..FR-004 | UC-001 | Rate limiting/lockout |
| NFR-005 | FR-005 | UC-001 | OAuth callback/linking validation |
| NFR-006 | FR-006, FR-016 | UC-001, UC-005 | OAuth/GitHub separation |
| NFR-007 | FR-016, FR-018 | UC-005, UC-007 | Read-only selected repository scope |
| NFR-008 | FR-007..FR-013, FR-028, FR-031, FR-046 | UC-002, UC-003, UC-010, UC-011, UC-018 | Manager authority/RBAC |
| NFR-009 | FR-008, FR-010..FR-012, FR-016, FR-046, FR-047 | UC-002, UC-005, UC-018 | Scoped Developer policy |
| NFR-010 | FR-011, FR-031, FR-042..FR-046 | UC-001..UC-018 | Material audit coverage |
| NFR-011 | FR-042..FR-045 | UC-015 | Append-oriented audit |
| NFR-012 | FR-019, FR-055 | UC-007, UC-013, UC-017 | No raw source to LLM |
| NFR-013 | FR-018, FR-019 | UC-007, UC-017 | No long-term raw source |
| NFR-014 | FR-018, FR-019, FR-048 | UC-007, UC-017, UC-018 | Redacted finding views |
| NFR-015 | FR-019, FR-043, FR-048 | UC-007, UC-015, UC-017 | Secret redaction |
| NFR-016 | FR-017, FR-020, FR-022, FR-044 | UC-006..UC-008, UC-015 | Evidence provenance/integrity |
| NFR-017 | FR-032..FR-036, FR-053, FR-054, FR-056 | UC-012, UC-013 | Legal rule/citation/corpus trace |
| NFR-018 | FR-015, FR-021, FR-025..FR-041, FR-045, FR-046 | UC-004, UC-008..UC-014, UC-018 | Fail-closed gates |
| NFR-019 | FR-025, FR-033..FR-036 | UC-009, UC-012, UC-013 | Verified evidence basis |
| NFR-020 | FR-015, FR-034, FR-036, FR-039, FR-040 | UC-004, UC-012..UC-014 | No overclaim |
| NFR-021 | FR-035, FR-038, FR-039 | UC-013, UC-014 | Async job reliability |
| NFR-022 | FR-015, FR-021, FR-025, FR-031, FR-034..FR-041 | UC-004, UC-008..UC-014 | Actionable blocked/failed UX |
| NFR-023 | FR-018, FR-019, FR-023 | UC-007..UC-009 | Bounded worker/scan behavior |
| NFR-024 | FR-018, FR-024, FR-032, FR-035, FR-038, FR-039 | UC-007, UC-009, UC-012..UC-014 | API/worker separation |
| NFR-025 | All active FRs | UC-001..UC-018 | Ownership/code-map alignment |
| NFR-026 | FR-018..FR-025, FR-032..FR-039, FR-042 | UC-007..UC-015 | Correlation/failure observability |
| NFR-027 | User-facing FRs | UC-001..UC-018 | Accessible forms/status/review |
| NFR-028 | FR-014, FR-015, FR-021, FR-027 | UC-004, UC-008, UC-010 | Business-language UX |
| NFR-029 | FR-023..FR-025, FR-032, FR-033, FR-056 | UC-008, UC-009, UC-012 | Claim evidence refs |
| NFR-030 | FR-017, FR-044, FR-049 | UC-006, UC-015, UC-016 | Immutable rerun history |
| NFR-033 | FR-055, FR-056 | UC-012, UC-013 | LLM/embedding cost controls |
| NFR-034 | FR-032, FR-053, FR-054, FR-056 | UC-012 | Immutable approved corpus |
| NFR-035 | FR-018, FR-019 | UC-007, UC-017 | Python Worker sandbox cleanup |

## Legacy Alias Remapping

Legacy `UC-MXX-XX`, `FR-057..FR-082`, `NFR-031`, and `NFR-032` may appear only in historical recovery/alias sections. They must not appear in active traceability rows.

## Validation Markers

```text
REQUIREMENT_TRACEABILITY_CORE_MATRIX_NORMALIZED
CANONICAL_UC_IDS_ONLY
NO_ORPHAN_REQUIREMENTS
NO_ORPHAN_ACCEPTANCE_CRITERIA
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
STORY_COVERAGE_NOT_ASSESSABLE
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
```