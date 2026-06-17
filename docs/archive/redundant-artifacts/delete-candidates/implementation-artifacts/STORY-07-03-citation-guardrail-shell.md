# Story STORY-07-03 — Citation Guardrail Shell

## Metadata
- Epic ID: EPIC-07
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-07-02
- Intended implementation order: 22
- Prototype-only classification: Controlled MVP prototype citation guardrail story

## User Story
As a Manager, I want legal output blocked or degraded when citations are missing so reports do not invent legal basis.

## Business Value
Prevents unsupported compliance claims.

## Authorization and Scope Boundary
Traceability guardrail only; validates citation presence, not legal correctness.

## In Scope
- Rule_id/source/citation/corpus-version requirements for critical legal conclusion.
- Block/degrade behavior for missing citations.
- Manager-visible blocked reason.

## Out of Scope
- Formal legal reliability validation.
- Legal correctness certification.
- LLM citation invention.

## Dependencies
- STORY-07-02.

## Architecture and Module References
- `docs/specs/legal-rule-citation-contract.md`
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/implementation/legal-rag-rule-matching-implementation.md`

## Domain, Data, Event, and API Contract References
- Entities: LegalCitation, RiskClassificationResult, GapAnalysisResult, ComplianceDocument.
- Event: citation validation passed/failed.

## Acceptance Criteria
1. Critical legal conclusion requires rule_id, source, citation and corpus version.
2. Missing required citation blocks or degrades classification/gap/document output.
3. LLM cannot invent citations outside approved corpus.
4. Blocked reason is visible to Manager.

## Technical Implementation Notes
- Deterministic guardrail runs after retrieval and before output shell.

## Security and Privacy Constraints
- Citation guardrail logs no raw prompts.

## Auditability and Observability Expectations
- Audit citation validation passed/failed.

## Error Handling and Failure-Safe Behavior
- Missing citation fails closed for final legal output.

## Test Expectations
- Unit tests: citation guardrail.
- Integration tests: missing citation blocks/degrades.
- Manual verification: blocked reason visible.
- Explicit non-testable conditions: legal correctness deferred to A2.

## Validation and Risk-Acceptance Limitations
A2 formal legal reliability is not approved.

## Explicit Non-Claims
No formal legal validation, legal advice, compliance certification or production legal document issuance.

## Definition of Done
Citation traceability is required before legal-output shells can proceed.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-07-03-citation-guardrail-shell.md`
