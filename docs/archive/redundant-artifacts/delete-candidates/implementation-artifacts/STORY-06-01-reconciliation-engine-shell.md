# Story STORY-06-01 — Reconciliation Engine Shell

## Metadata
- Epic ID: EPIC-06
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-05-03
- Intended implementation order: 16
- Prototype-only classification: Controlled MVP prototype reconciliation story

## User Story
As a Manager, I want LCSP to compare my WizardProfile with technical and usage-flow evidence so conflicts are detected before classification.

## Business Value
Protects VerifiedProfile integrity.

## Authorization and Scope Boundary
Prototype reconciliation shell only. It does not run classification.

## In Scope
- Compare WizardProfile, TechnicalProfile and AIUsageFlow.
- Binary MVP routing: conflict/no conflict.
- Manager conflict task creation on conflict.

## Out of Scope
- Severity-based workflow routing.
- Developer final resolution.
- Classification before VerifiedProfile.

## Dependencies
- STORY-05-03.

## Architecture and Module References
- `docs/specs/reconciliation-policy.md`
- `docs/specs/implementation-contract.md`
- `docs/implementation/evidence-gates-reconciliation-implementation.md`

## Domain, Data, Event, and API Contract References
- Entities: ConflictRecord, AIUsageFlow, TechnicalProfile, WizardProfile.
- Events: CONFLICT_FOUND, MANAGER_CONFLICT_RESOLUTION_REQUIRED.

## Acceptance Criteria
1. Reconciliation compares WizardProfile, TechnicalProfile and AIUsageFlow.
2. Result is `NO_CONFLICT_FOUND` or `CONFLICT_FOUND`.
3. Conflict creates a Manager task and keeps classification locked.
4. No conflict allows VerifiedProfile candidate creation.

## Technical Implementation Notes
- Scores can be informational only.
- Conflict records use evidence refs, not raw source.

## Security and Privacy Constraints
- Conflict views show evidence refs, not raw source.

## Auditability and Observability Expectations
- Audit reconciliation started, conflict/no-conflict and conflict record creation.

## Error Handling and Failure-Safe Behavior
- Any unresolved conflict blocks classification and final document.

## Test Expectations
- Unit tests: conflict rules.
- Integration tests: conflict blocks classification shell.
- Manual verification: conflict task creation.
- Explicit non-testable conditions: A3 may refine governance wording.

## Validation and Risk-Acceptance Limitations
A3 governance validation remains incomplete.

## Explicit Non-Claims
No classification, compliance certification, production release or formal legal validation.

## Definition of Done
Reconciliation shell creates auditable conflict/no-conflict state and never unlocks classification with unresolved conflict.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-06-01-reconciliation-engine-shell.md`
