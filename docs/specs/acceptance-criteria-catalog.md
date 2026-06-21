# LCSP Acceptance Criteria Catalog

## Purpose

This document is the canonical acceptance criteria inventory for LCSP requirements traceability. It normalizes runtime and platform acceptance criteria into `AC-001` sequence.

## Acceptance Criteria

| AC | Given | When | Then | Use Case | FR | NFR |
|---|---|---|---|---|---|---|
| AC-001 | Manager belongs to organization | Manager creates assessment | Assessment is created and Manager is recorded as owner | UC-003 | FR-013 | NFR-008, NFR-010 |
| AC-002 | Assessment exists | Manager submits Wizard answers | WizardProfile is created with required business/legal fields | UC-004 | FR-014 | NFR-028 |
| AC-003 | Only WizardProfile exists | Manager views readiness/export | System does not show HIGH/MEDIUM/LOW or final risk label | UC-004, UC-014 | FR-015, FR-040 | NFR-018, NFR-028 |
| AC-004 | RepositoryConnection is requested | Actor has Manager or delegated permission | RepositoryConnection/Snapshot/ScanJob are created only within scope | UC-005, UC-006, UC-007, UC-016 | FR-016, FR-017, FR-018, FR-049 | NFR-007, NFR-008, NFR-009 |
| AC-005 | TechnicalEvidenceReport is created | Schema/privacy gates run | Invalid schema/privacy flags reject evidence before profile generation | UC-007, UC-008 | FR-020 | NFR-012, NFR-013, NFR-016 |
| AC-006 | Evidence passes schema | Quality gate runs | Evidence becomes ready, insufficient or rejected with actionable reason | UC-008 | FR-021 | NFR-018, NFR-022, NFR-026 |
| AC-007 | Evidence is accepted | TechnicalProfile worker runs | TechnicalProfile includes AI/data/decision/human-review dimensions or explicit unknowns | UC-008 | FR-022, FR-023, FR-048 | NFR-016, NFR-029 |
| AC-008 | WizardProfile and TechnicalProfile exist | AIUsageFlow worker runs | AIUsageFlow claims are generated with evidence refs, confidence and uncertainty | UC-009 | FR-024 | NFR-029 |
| AC-009 | Critical AI usage is unclear | AIUsageFlow worker evaluates rules | Field is UNKNOWN/UNCLEAR and unsupported classification is blocked | UC-009 | FR-025 | NFR-018, NFR-019 |
| AC-010 | WizardProfile conflicts with technical evidence | Reconciliation runs | Conflict is created and classification remains locked | UC-010 | FR-026 | NFR-018 |
| AC-011 | Conflict score is calculated | Conflict exists | Score explains seriousness but does not create alternate MVP route | UC-010 | FR-027 | NFR-028 |
| AC-012 | Conflict exists | Manager records resolution | Resolution is stored separately from scanner evidence and audited | UC-010 | FR-028, FR-029 | NFR-010, NFR-011 |
| AC-013 | Developer submits attestation | Attestation is missing scope/role or tries to replace metadata | System rejects it or stores only supplemental input; classification is not unlocked by attestation alone | UC-018 | FR-045, FR-046, FR-052 | NFR-010, NFR-018 |
| AC-014 | No unresolved conflict exists | Reconciliation completes | VerifiedProfile is created from WizardProfile, TechnicalProfile, AIUsageFlow and resolutions | UC-011 | FR-030 | NFR-016, NFR-018 |
| AC-015 | Unresolved conflict exists | Manager attempts VerifiedProfile approval | Approval is blocked | UC-011 | FR-031 | NFR-018 |
| AC-016 | VerifiedProfile exists | Legal matching runs | LegalRuleMatch records are created from usage-flow facts and citation-backed rules | UC-012, UC-013 | FR-032, FR-033, FR-035 | NFR-017, NFR-019 |
| AC-017 | Required legal citation is missing | Legal matching/classification evaluates result | Classification is blocked or degraded and unsupported legal conclusion is not produced | UC-012, UC-013 | FR-034, FR-036 | NFR-017, NFR-018, NFR-020 |
| AC-018 | VerifiedProfile and legal matches exist | Classification runs | ClassificationResult is completed or blocked with reasons; provider-only evidence cannot classify risk | UC-013, UC-014 | FR-035, FR-036, FR-037, FR-038 | NFR-018, NFR-019 |
| AC-019 | Final document is requested | Classification/gap/citation/conflict prerequisites fail | Final report is blocked; readiness-only output may not include risk level | UC-014 | FR-039, FR-041 | NFR-018, NFR-020 |
| AC-020 | Material event occurs | Workflow changes state or artifact version | Audit trail records actor/action/object/time/version refs without sensitive payloads | UC-015, UC-016 | FR-042, FR-043, FR-044, FR-045 | NFR-010, NFR-011, NFR-016, NFR-030 |
| AC-021 | User submits auth action | Credentials/OAuth/session/MFA data is invalid | Access is denied and sensitive details are not leaked | UC-001 | FR-001..FR-005 | NFR-001..NFR-005 |
| AC-022 | Source, secret or prompt-sensitive value enters processing boundary | Scanner/worker/audit/log/report tries to persist or send it | Raw/secret value is redacted or blocked | UC-017 | FR-019, FR-043, FR-048 | NFR-012, NFR-013, NFR-014, NFR-015 |
| AC-023 | OAuth/OIDC login succeeds | User attempts repository scan without GitHub App connection/LCSP permission | Repository access/scan remains denied | UC-001, UC-005, UC-017 | FR-005, FR-006, FR-016 | NFR-006, NFR-007 |
| AC-024 | Organization/role action is requested | Actor lacks required organization/Manager scope | Action is denied and audit/security event is recorded when relevant | UC-002, UC-003 | FR-007..FR-012 | NFR-008, NFR-009, NFR-010 |
| AC-025 | Developer has scoped task | Developer attempts Manager-only action | Action is denied and cannot alter workflow truth | UC-002, UC-018 | FR-010, FR-011, FR-012, FR-047 | NFR-008, NFR-009 |
| AC-026 | Developer policy is revoked | Developer attempts new delegated action | Action is denied and revocation/action is auditable | UC-002 | FR-011, FR-012 | NFR-009, NFR-010 |

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
| AC-13..AC-16 | SUPERSEDED | Phase/document acceptance criteria, superseded by active artifact existence and report markers. |
