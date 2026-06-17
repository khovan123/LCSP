# Story STORY-07-02 — Legal Rule and Citation Retrieval Boundary

## Metadata
- Epic ID: EPIC-07
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-07-01 and STORY-06-03
- Intended implementation order: 21
- Prototype-only classification: Controlled MVP prototype retrieval boundary story

## User Story
As the classification workflow, I want retrieval to use VerifiedProfile and AIUsageFlow fields so legal matching is based on usage context.

## Business Value
Prevents provider-only legal matching.

## Authorization and Scope Boundary
Prototype retrieval boundary only. It does not produce final legal advice.

## In Scope
- Retrieval inputs from VerifiedProfile and AIUsageFlow.
- Corpus version pinning.
- Rule/citation metadata output.
- Provider/model/framework-only rejection.

## Out of Scope
- Final legal advice.
- Formal legal reliability validation.
- Full legal corpus coverage claim.

## Dependencies
- STORY-07-01.
- STORY-06-03.

## Architecture and Module References
- `docs/specs/ai-usage-rule-mapping-spec.md`
- `docs/specs/legal-rule-citation-contract.md`
- `docs/architecture/multi-agent-system-architecture.md`

## Domain, Data, Event, and API Contract References
- Entities: LegalRule, LegalCitation, LegalDocumentVersion, AIUsageFlow.
- Retrieval output: rule_id, source, citation, corpus version.

## Acceptance Criteria
1. Retrieval input requires VerifiedProfile, AIUsageFlow and corpus version.
2. Rule matching considers process, purpose, input/output, downstream action, affected subjects, human review, automation level and harm categories.
3. Provider/model/framework presence alone cannot select legal rule family.
4. Retrieval output includes rule_id, source, citation and corpus version where available.

## Technical Implementation Notes
- RAG/vector store supports retrieval but does not conclude risk alone.
- LLM Gateway receives sanitized metadata only if used.

## Security and Privacy Constraints
- LLM/RAG input excludes raw source and secrets.

## Auditability and Observability Expectations
- Audit retrieval query refs and returned/missing citations.

## Error Handling and Failure-Safe Behavior
- Missing citation blocks/degrades downstream output.

## Test Expectations
- Unit tests: retrieval input eligibility.
- Integration tests: provider-only signal cannot map rule.
- Manual verification: citation refs present.
- Explicit non-testable conditions: legal correctness requires A2.

## Validation and Risk-Acceptance Limitations
Retrieval quality remains subject to A2 validation.

## Explicit Non-Claims
No formal legal reliability, legal advice, compliance certification or production legal output.

## Definition of Done
Legal retrieval boundary uses VerifiedProfile and AIUsageFlow context with citation traceability.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-07-02-legal-rule-and-citation-retrieval-boundary.md`
