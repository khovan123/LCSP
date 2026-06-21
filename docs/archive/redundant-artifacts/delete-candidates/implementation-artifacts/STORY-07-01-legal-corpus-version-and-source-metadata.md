# Story STORY-07-01 — Legal Corpus Version and Source Metadata

## Metadata
- Epic ID: EPIC-07
- Priority: P1
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-06-04
- Intended implementation order: 20
- Prototype-only classification: Controlled MVP prototype legal corpus foundation story

## User Story
As a legal reviewer, I want legal corpus documents versioned with source metadata so prototype retrieval can cite pinned sources.

## Business Value
Enables citation traceability.

## Authorization and Scope Boundary
Internal corpus foundation only. It does not claim formal legal reliability or independent legal opinion.

## In Scope
- Corpus version metadata.
- Legal document source metadata.
- Draft/internal vs validated corpus status.
- Content hash when source artifact exists.

## Out of Scope
- Legal corpus completeness certification.
- Formal legal validation.
- Production legal document issuance.

## Dependencies
- STORY-06-04.

## Architecture and Module References
- `docs/specs/legal-rule-citation-contract.md`
- `docs/implementation/legal-rag-rule-matching-implementation.md`
- `docs/validation/owner-risk-acceptance-controlled-mvp-prototype.md`

## Domain, Data, Event, and API Contract References
- Entities: LegalDocumentVersion, LegalRule, LegalCitation.
- Events: corpus version imported/updated.

## Acceptance Criteria
1. Legal corpus version record exists.
2. Legal document metadata includes title, identifier, issuer/source, publication/effective date if available and content hash when present.
3. Corpus source status distinguishes draft/internal from validated.
4. No formal legal reliability claim is made.

## Technical Implementation Notes
- Keep corpus artifacts separate from customer evidence.
- Do not fabricate hashes for missing source files.

## Security and Privacy Constraints
- No customer source in legal corpus artifacts.

## Auditability and Observability Expectations
- Audit corpus import/update and version ref.

## Error Handling and Failure-Safe Behavior
- Missing corpus version blocks citation-dependent output.

## Test Expectations
- Unit tests: corpus metadata validation.
- Integration tests: retrieval requires corpus version.
- Manual verification: no formal legal claim.
- Explicit non-testable conditions: legal correctness requires A2 validation.

## Validation and Risk-Acceptance Limitations
A2 formal legal reliability remains not approved; A2 internal review is limited.

## Explicit Non-Claims
No legal certification, independent legal opinion, formal legal reliability or production legal output.

## Definition of Done
Legal corpus metadata is versioned, traceable and clearly marked as prototype/internal where applicable.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-07-01-legal-corpus-version-and-source-metadata.md`
