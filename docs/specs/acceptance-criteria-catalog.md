# LCSP Acceptance Criteria Catalog

## Purpose

This document is the canonical acceptance criteria inventory for LCSP. Active traceability uses only canonical `UC-001..UC-018`, `FR-001..FR-056`, and active `NFR-001..NFR-030`, `NFR-033..NFR-035` identifiers.

## Acceptance Criteria

| AC | Given | When | Then | Use Case | FR | NFR |
|---|---|---|---|---|---|---|
| AC-001 | Manager belongs to an organization | Manager creates an assessment | Assessment is created, Manager is recorded as owner, and the action is audited | UC-003 | FR-013 | NFR-008, NFR-010 |
| AC-002 | Assessment exists | Manager submits Wizard answers | WizardProfile is created with required business/legal fields | UC-004 | FR-014 | NFR-028 |
| AC-003 | Only WizardProfile or incomplete evidence exists | Manager views readiness or requests readiness-only export | System shows no HIGH/MEDIUM/LOW risk label and explains missing evidence | UC-004, UC-014 | FR-015, FR-040 | NFR-018, NFR-020, NFR-022, NFR-028 |
| AC-004 | Repository connection/snapshot/scan is requested | Actor has Manager or delegated permission | RepositoryConnection, RepositorySnapshot, and ScanJob are created only within authorized scope and preserve history on rerun | UC-005, UC-006, UC-007, UC-016 | FR-016, FR-017, FR-018, FR-049 | NFR-006, NFR-007, NFR-008, NFR-009, NFR-016, NFR-030 |
| AC-005 | TechnicalEvidenceReport is created | Schema and privacy gates run | Invalid schema or privacy flags reject evidence before TechnicalProfile generation | UC-007, UC-008 | FR-020 | NFR-012, NFR-013, NFR-014, NFR-015, NFR-016 |
| AC-006 | Evidence passes schema validation | Quality gate runs | Evidence becomes ready, insufficient, or rejected with actionable reason and correlation context | UC-008 | FR-021 | NFR-018, NFR-022, NFR-026 |
| AC-007 | Evidence is accepted | TechnicalProfile worker runs | TechnicalProfile includes AI/data/decision/human-review dimensions or explicit unknowns and redacted evidence refs | UC-008 | FR-022, FR-023, FR-048 | NFR-014, NFR-016, NFR-029 |
| AC-008 | WizardProfile and TechnicalProfile exist | AIUsageFlow worker runs | AIUsageFlow claims are generated with evidence refs, confidence, and uncertainty | UC-009 | FR-024 | NFR-029 |
| AC-009 | Critical AI usage is unclear | AIUsageFlow evaluates rules | Field remains UNKNOWN/UNCLEAR and unsupported classification is blocked | UC-009 | FR-025 | NFR-018, NFR-019, NFR-022 |
| AC-010 | WizardProfile conflicts with technical evidence | Reconciliation runs | Conflict is created and classification remains locked | UC-010 | FR-026 | NFR-018 |
| AC-011 | Conflict exists | Conflict score is calculated | Score explains materiality but does not create an alternative route or decision | UC-010 | FR-027 | NFR-028 |
| AC-012 | Conflict exists | Manager records resolution | Resolution is stored separately from scanner evidence, audited, and reconciliation reruns | UC-010 | FR-028, FR-029 | NFR-008, NFR-010, NFR-011, NFR-018 |
| AC-013 | Developer submits structured attestation | Attestation lacks role/scope/evidence or attempts to replace metadata | System rejects it or stores it only as supplemental input; it does not unlock classification | UC-018 | FR-045, FR-046 | NFR-008, NFR-009, NFR-010, NFR-018 |
| AC-014 | No unresolved conflict exists | Reconciliation completes | VerifiedProfile is created from WizardProfile, TechnicalProfile, AIUsageFlow, and Manager resolutions | UC-011 | FR-030 | NFR-016, NFR-018 |
| AC-015 | Unresolved conflict exists | Manager or system attempts VerifiedProfile approval | Approval is blocked with an actionable reason | UC-011 | FR-030, FR-031 | NFR-008, NFR-010, NFR-018, NFR-022 |
| AC-016 | Approved corpus and VerifiedProfile exist | Legal ingestion/retrieval/matching runs | Official-source snapshots are pinned, approved corpus is immutable, hybrid retrieval returns citations, and LegalRuleMatch records are created | UC-012 | FR-032, FR-033, FR-053, FR-054, FR-056 | NFR-017, NFR-029, NFR-033, NFR-034 |
| AC-017 | Required legal citation or approved corpus basis is missing | Legal matching or classification evaluates result | Classification is blocked or explicitly degraded; unsupported legal conclusion is not produced | UC-012, UC-013 | FR-034, FR-036 | NFR-017, NFR-018, NFR-020, NFR-022, NFR-034 |
| AC-018 | VerifiedProfile, legal matches, and provider configuration exist | Classification runs | RiskClassification completes or is blocked with reasons; provider-only evidence cannot classify risk | UC-013, UC-014 | FR-035, FR-036, FR-037, FR-038, FR-055 | NFR-017, NFR-018, NFR-019, NFR-021, NFR-022, NFR-033 |
| AC-019 | Final document is requested | Classification, gap, citation, conflict, or output guardrail prerequisites fail | Final report is blocked; readiness-only output contains no risk label or legal certainty overclaim | UC-014 | FR-039, FR-040, FR-041 | NFR-018, NFR-020, NFR-021, NFR-022 |
| AC-020 | Material event or rerun occurs | Workflow changes state or artifact version | Audit trail records actor/action/object/time/version refs without sensitive payloads and prior history remains immutable | UC-006, UC-015, UC-016 | FR-017, FR-042, FR-043, FR-044, FR-045, FR-049 | NFR-010, NFR-011, NFR-016, NFR-030 |
| AC-021 | User submits auth action | Credentials, OAuth, session, or MFA data is invalid | Access is denied without sensitive leakage and the outcome is audited | UC-001 | FR-001..FR-005 | NFR-001..NFR-005 |
| AC-022 | Source, secret, or prompt-sensitive value reaches a processing boundary | Scanner, worker, audit, log, report, or UI attempts to persist/send it | Raw or secret value is redacted or blocked; only permitted metadata/evidence refs remain | UC-007, UC-017 | FR-019, FR-043, FR-048 | NFR-012, NFR-013, NFR-014, NFR-015 |
| AC-023 | OAuth/OIDC login succeeds | User attempts repository access without GitHub App connection and LCSP permission | Repository access and scan remain denied | UC-001, UC-005, UC-017 | FR-005, FR-006, FR-016 | NFR-005, NFR-006, NFR-007 |
| AC-024 | Organization or role action is requested | Actor lacks required tenant or Manager scope | Action is denied and a security/audit event is recorded where relevant | UC-002, UC-003 | FR-007..FR-013 | NFR-008, NFR-009, NFR-010 |
| AC-025 | Developer has a scoped task | Developer attempts Manager-only action | Action is denied and cannot alter workflow truth | UC-002, UC-018 | FR-010, FR-011, FR-012, FR-047 | NFR-008, NFR-009, NFR-010 |
| AC-026 | Developer policy is revoked | Developer attempts a new delegated action | Action is denied and revocation/action is auditable | UC-002, UC-018 | FR-011, FR-012 | NFR-009, NFR-010 |
| AC-027 | Real PostgreSQL, RabbitMQ, S3-compatible storage, real LLM, approved corpus, and golden repository snapshot exist | Manager executes the canonical A-to-Z workflow | Login through audit export succeeds and produces a citation-backed document on real infrastructure | UC-001, UC-003..UC-015, UC-017 | FR-001..FR-049, FR-053..FR-056 | NFR-010, NFR-012, NFR-017..NFR-026, NFR-029, NFR-030, NFR-033..NFR-035 |
| AC-028 | Repository snapshot cannot be retrieved | Python Worker executes ScanJob | Job becomes FAILED with `REPOSITORY_ACCESS_FAILED`, failed event is staged, and downstream is blocked | UC-007, UC-016 | FR-018, FR-049 | NFR-022, NFR-023, NFR-026, NFR-035 |
| AC-029 | One source file has a parser error | Scan runs | File is skipped with coverage limitation while bounded scan continues | UC-007 | FR-018, FR-019 | NFR-018, NFR-023, NFR-026 |
| AC-030 | Scan analysis completes but workspace deletion cannot be verified | Cleanup runs | `SCANNER_WORKSPACE_CLEANUP_FAILED` is audited, scan fails, and downstream is blocked | UC-007, UC-017 | FR-019 | NFR-013, NFR-016, NFR-018, NFR-026, NFR-035 |
| AC-031 | Python code contains dynamic import, reflection, or runtime-only flow | Python analyzer runs | `UNSUPPORTED_DYNAMIC_FLOW` and coverage limitation are recorded; no false inference is produced | UC-007, UC-008, UC-009 | FR-023, FR-025 | NFR-018, NFR-023, NFR-026, NFR-035 |
| AC-032 | Scan detects AI library import without invocation evidence | TechnicalProfile/AIUsageFlow generation runs | `AI_PROVIDER_USAGE` remains possible-use evidence and no active model/decision claim is created | UC-008, UC-009 | FR-023, FR-025 | NFR-018, NFR-019, NFR-029 |
| AC-033 | Wizard and technical evidence materially conflict | Reconciliation runs | Conflict is created, Manager task is shown, and classification remains blocked | UC-010 | FR-026, FR-028, FR-029 | NFR-010, NFR-011, NFR-018, NFR-022 |
| AC-034 | A matched rule lacks citation backing | Legal matching or classification runs | Match is blocked/degraded and no unsupported legal conclusion is emitted | UC-012, UC-013 | FR-034, FR-036 | NFR-017, NFR-018, NFR-020, NFR-034 |
| AC-035 | Corpus version is not approved or is superseded for new assessments | Hybrid retriever runs | Retrieval and dependent classification are blocked with corpus status reason | UC-012 | FR-032, FR-054, FR-056 | NFR-017, NFR-018, NFR-022, NFR-034 |
| AC-036 | Hybrid retriever returns zero citation candidates | Legal matching runs | No applicable legal match is claimed; classification is blocked/degraded and audit is written | UC-012 | FR-032, FR-033, FR-034, FR-056 | NFR-017, NFR-018, NFR-029, NFR-034 |
| AC-037 | LLM provider times out or is unavailable | Classification runs | Gateway applies bounded retry, then fails closed with `CLASSIFICATION_LLM_UNAVAILABLE` and actionable status | UC-013 | FR-035, FR-055 | NFR-021, NFR-022, NFR-026, NFR-033 |
| AC-038 | LLM output fails schema validation | Classification runs | Gateway retries within policy, then fails closed and records redacted validation failure | UC-013 | FR-035, FR-055 | NFR-018, NFR-021, NFR-022, NFR-026 |
| AC-039 | Queue message is delivered more than once | Worker handles it | Idempotency key prevents duplicate state change and prior artifact chain remains intact | UC-015, UC-016 | FR-042, FR-044, FR-049 | NFR-010, NFR-024, NFR-026, NFR-030 |
| AC-040 | Broker publication fails transiently | Outbox publisher runs | Event remains pending and is retried with bounded backoff until acknowledgement or terminal failure | UC-015 | FR-042, FR-044 | NFR-010, NFR-021, NFR-024, NFR-026 |
| AC-041 | Generated document violates safety, citation, or overclaim guardrails | Document worker runs | Generation is blocked, reason is recorded, and no artifact is published | UC-014, UC-017 | FR-039, FR-041 | NFR-018, NFR-020, NFR-021, NFR-022, NFR-026 |

## Legacy AC Resolution

| Legacy AC | Resolution | Canonical AC |
|---|---|---|
| AC-1 | ACTIVE | AC-003 |
| AC-2 | ACTIVE | AC-014, AC-016, AC-018 |
| AC-3 | ACTIVE | AC-005 |
| AC-4 | ACTIVE | AC-006 |
| AC-5 | ACTIVE | AC-010, AC-012, AC-019 |
| AC-6 | ACTIVE | AC-012 |
| AC-7 | ACTIVE | AC-011 |
| AC-8 | ACTIVE | AC-011 |
| AC-9 | ACTIVE | AC-013 |
| AC-10 | ACTIVE | AC-017, AC-019 |
| AC-11 | ACTIVE | AC-013, AC-020 |
| AC-12 | ACTIVE | AC-020 |
| AC-13..AC-16 | SUPERSEDED | Replaced by active artifact checks and report markers. |

## Validation Markers

```text
CANONICAL_ACCEPTANCE_CRITERIA_NORMALIZED
CANONICAL_UC_IDS_ONLY_IN_ACTIVE_AC_ROWS
DEFERRED_FR_052_REMOVED_FROM_ACTIVE_ATTESTATION_ACCEPTANCE
```