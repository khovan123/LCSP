# Story STORY-08-01 — Risk Classification Workflow Shell

## Metadata
- Epic ID: EPIC-08
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-07-03
- Intended implementation order: 23
- Prototype-only classification: Controlled MVP prototype classification shell

## User Story
As a Manager, I want classification to run only when prerequisites are satisfied so prototype results cannot bypass gates.

## Business Value
Preserves evidence-first product promise.

## Authorization and Scope Boundary
Workflow shell only. It does not claim formal risk classification accuracy.

## In Scope
- Prerequisite checks for approved VerifiedProfile and legal citation inputs.
- Blocked/degraded/completed shell status.
- Provider-only risk inference prevention.

## Out of Scope
- Formal risk classification accuracy claim.
- Compliance certification.
- Production legal conclusion.

## Dependencies
- STORY-07-03.

## Architecture and Module References
- `docs/specs/implementation-contract.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/legal-rule-citation-contract.md`

## Domain, Data, Event, and API Contract References
- Entity: ClassificationRun, RiskClassificationResult.
- Events: CLASSIFICATION_REQUESTED, BLOCKED, COMPLETED.

## Acceptance Criteria
1. Classification shell requires approved VerifiedProfile.
2. Classification shell requires legal retrieval/citation inputs.
3. Missing evidence, unresolved conflict, unclear critical usage or missing citation blocks/degrades output.
4. Provider/model/framework presence alone cannot produce risk level.

## Technical Implementation Notes
- Shell may return blocked/degraded status without final scoring.
- LLM use only via LLM Gateway with sanitized metadata.

## Security and Privacy Constraints
- No raw source/full prompt/secrets to LLM.

## Auditability and Observability Expectations
- Audit classification requested/completed/blocked/degraded.

## Error Handling and Failure-Safe Behavior
- Missing prerequisite blocks classification.

## Test Expectations
- Unit tests: prerequisite gate.
- Integration tests: no VerifiedProfile means blocked.
- Manual verification: blocked reason.
- Explicit non-testable conditions: formal classification accuracy not tested.

## Validation and Risk-Acceptance Limitations
Outputs are prototype workflow artifacts, not validated compliance deliverables.

## Explicit Non-Claims
No compliance certification, formal legal reliability, production risk result or A2-b2 completion.

## Definition of Done
Classification shell enforces VerifiedProfile/citation/evidence prerequisites and fails closed.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-08-01-risk-classification-workflow-shell.md`
