# Story STORY-04-03 — TechnicalEvidenceReport Contract Persistence

## Metadata
- Epic ID: EPIC-04
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-04-02
- Intended implementation order: 11
- Prototype-only classification: Controlled MVP prototype evidence persistence story

## User Story
As a compliance workflow operator, I want scan outputs persisted as TechnicalEvidenceReport metadata so downstream gates can operate on traceable evidence.

## Business Value
Creates the evidence basis for TechnicalProfile and AIUsageFlow.

## Authorization and Scope Boundary
Prototype evidence metadata persistence only. No raw source or physical production schema guarantee.

## In Scope
- TechnicalEvidenceReport metadata.
- Report hash, source type, provenance, findings and coverage limits.
- Rejected/insufficient/ready status support.

## Out of Scope
- Manual evidence JSON upload.
- Raw source persistence.
- Full AST body persistence.

## Dependencies
- STORY-04-02.

## Architecture and Module References
- `docs/specs/evidence-report-contract.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/security/source-code-privacy-policy.md`

## Domain, Data, Event, and API Contract References
- Entities: TechnicalEvidenceReport, TechnicalFinding, EvidenceReference.
- Source type: `GITHUB_REPOSITORY_SCAN`.

## Acceptance Criteria
1. TechnicalEvidenceReport stores report id, source type, provenance, report hash, findings and coverage limits.
2. Source type is `GITHUB_REPOSITORY_SCAN`.
3. Raw source/full AST bodies/full prompts/secrets are not persisted.
4. Evidence report status supports rejected, insufficient and ready.

## Technical Implementation Notes
- Use normalized metadata plus JSON evidence payloads.
- Persist refs/hashes/paths only for graph evidence.

## Security and Privacy Constraints
- Redaction before persistence.
- No secrets in findings/audit/document outputs.

## Auditability and Observability Expectations
- Audit report created/accepted/rejected and report hash.

## Error Handling and Failure-Safe Behavior
- Invalid schema or privacy violation rejects report and blocks downstream.

## Test Expectations
- Unit tests: schema validation.
- Integration tests: raw-source fields rejected.
- Manual verification: report hash/provenance.
- Explicit non-testable conditions: production schema may evolve.

## Validation and Risk-Acceptance Limitations
Persistence contract can evolve after validation.

## Explicit Non-Claims
No production data model certification, runtime scanner accuracy, A2-b2 completion or compliance certification.

## Definition of Done
Accepted evidence is structured, traceable, redacted and ready for evidence gates.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-04-03-technical-evidence-report-contract-persistence.md`
