# Story STORY-04-04 — Evidence Gates and TechnicalProfile Builder

## Metadata
- Epic ID: EPIC-04
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-04-03
- Intended implementation order: 12
- Prototype-only classification: Controlled MVP prototype evidence gate story

## User Story
As a Manager, I want invalid or insufficient evidence to block classification so LCSP does not overclaim.

## Business Value
Protects evidence-gated classification.

## Authorization and Scope Boundary
Prototype deterministic gates only. Does not authorize classification or legal conclusions.

## In Scope
- Schema Gate.
- Privacy Gate.
- Quality Gate.
- TechnicalProfile built only from accepted evidence.

## Out of Scope
- Attestation replacing technical evidence.
- Final classification.
- Manual/local evidence paths.

## Dependencies
- STORY-04-03.

## Architecture and Module References
- `docs/specs/evidence-report-contract.md`
- `docs/implementation/evidence-gates-reconciliation-implementation.md`
- `docs/specs/implementation-contract.md`

## Domain, Data, Event, and API Contract References
- Entities: EvidenceGateResult, TechnicalProfile.
- Events: EVIDENCE_SCHEMA_FAILED, EVIDENCE_QUALITY_INSUFFICIENT, TECHNICAL_PROFILE_READY.

## Acceptance Criteria
1. Schema Gate rejects missing/invalid required report fields.
2. Privacy Gate rejects raw source/full prompt/secret policy violations.
3. Quality Gate marks evidence insufficient when critical evidence is missing.
4. TechnicalProfile is built only from accepted evidence.

## Technical Implementation Notes
- Gate results are deterministic and auditable.
- Do not let LLM override gate results.

## Security and Privacy Constraints
- Gate reasons must not expose raw source or secret values.

## Auditability and Observability Expectations
- Audit schema/privacy/quality gate result and reason code.

## Error Handling and Failure-Safe Behavior
- Gate fail locks downstream TechnicalProfile/AIUsageFlow/classification.

## Test Expectations
- Unit tests: gate rule outcomes.
- Integration tests: failed gate blocks TechnicalProfile.
- Manual verification: blocked reason displayed safely.
- Explicit non-testable conditions: final thresholds may change after validation.

## Validation and Risk-Acceptance Limitations
Thresholds may change after validation; validated/production readiness remains blocked.

## Explicit Non-Claims
No legal classification, production evidence sufficiency certification or A2-b2 completion.

## Definition of Done
Evidence gates are deterministic, fail closed and produce TechnicalProfile only from accepted evidence.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-04-04-evidence-gates-and-technical-profile-builder.md`
