# Story STORY-06-03 — VerifiedProfile Builder and Approval Gate

## Metadata
- Epic ID: EPIC-06
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-06-02
- Intended implementation order: 18
- Prototype-only classification: Controlled MVP prototype VerifiedProfile gate story

## User Story
As a Manager, I want VerifiedProfile created only after gates pass and conflicts are resolved so classification has a trusted input.

## Business Value
Enforces the classification prerequisite.

## Authorization and Scope Boundary
Prototype VerifiedProfile gate only. It does not create legal risk classification.

## In Scope
- VerifiedProfile candidate creation.
- Manager approval before `READY_FOR_CLASSIFICATION`.
- Invalidation/blocking on new conflict.

## Out of Scope
- Wizard-only classification.
- Legal classification.
- Developer approval as final gate.

## Dependencies
- STORY-06-02.

## Architecture and Module References
- `docs/specs/implementation-contract.md`
- `docs/specs/state-machine.md`
- `docs/specs/reconciliation-policy.md`

## Domain, Data, Event, and API Contract References
- Entity: VerifiedProfile.
- Events: VERIFIED_PROFILE_READY, classification blocked reason.

## Acceptance Criteria
1. VerifiedProfile candidate requires WizardProfile, accepted TechnicalEvidenceReport, TechnicalProfile, AIUsageFlow and no unresolved conflict.
2. Manager approval is required before `READY_FOR_CLASSIFICATION`.
3. Any new conflict invalidates or blocks approval.
4. Classification cannot run before approved VerifiedProfile.

## Technical Implementation Notes
- Preserve source refs and resolution refs.
- Versioning can be minimal but traceable.

## Security and Privacy Constraints
- VerifiedProfile stores refs and structured claims, not raw source.

## Auditability and Observability Expectations
- Audit VerifiedProfile created/approved/blocked.

## Error Handling and Failure-Safe Behavior
- Missing prerequisite blocks classification.

## Test Expectations
- Unit tests: prerequisite gate.
- Integration tests: classification shell cannot run without VerifiedProfile.
- Manual verification: Manager approval required.
- Explicit non-testable conditions: legal accuracy is out of scope.

## Validation and Risk-Acceptance Limitations
Real validation remains incomplete; gate is prototype behavior.

## Explicit Non-Claims
No formal legal reliability, risk accuracy certification, production release or A2-b2 completion.

## Definition of Done
VerifiedProfile is the mandatory, auditable prerequisite for classification shell execution.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-06-03-verifiedprofile-builder-and-approval-gate.md`
