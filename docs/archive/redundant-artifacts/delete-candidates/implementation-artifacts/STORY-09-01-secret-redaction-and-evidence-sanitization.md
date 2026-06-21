# Story STORY-09-01 — Secret Redaction and Evidence Sanitization

## Metadata
- Epic ID: EPIC-09
- Priority: P0
- Document status: BLOCKED_BY_DEPENDENCY
- Dependency status: Requires STORY-04-03
- Intended implementation order: 27
- Prototype-only classification: Controlled MVP prototype privacy control story

## User Story
As a security reviewer, I want secret-like values redacted before persistence so evidence and audit artifacts do not leak credentials.

## Business Value
Protects customers and supports safe validation.

## Authorization and Scope Boundary
Prototype redaction control only. Not production DLP certification.

## In Scope
- Deterministic redaction before persistence.
- Redacted findings with evidence refs/hash metadata.
- Redaction failure blocking evidence acceptance.

## Out of Scope
- Production DLP certification.
- Full secret scanning product.
- Customer source retention.

## Dependencies
- STORY-04-03.

## Architecture and Module References
- `docs/security/source-code-privacy-policy.md`
- `docs/specs/static-analysis-scanner-contract.md`
- `docs/implementation/security-privacy-implementation.md`

## Domain, Data, Event, and API Contract References
- Entities: TechnicalFinding, EvidenceReference, AuditEvent.
- Event: redaction failed/evidence rejected.

## Acceptance Criteria
1. Scanner/evidence outputs pass through redaction before persistence.
2. Redacted findings preserve evidence refs and hash metadata.
3. Secret-like values are not stored in TechnicalFinding, audit or generated documents.
4. Redaction failure blocks evidence acceptance.

## Technical Implementation Notes
- Redaction precedes DB/object storage/audit/model usage.

## Security and Privacy Constraints
- No secrets in logs, DB, object storage, LLM input or documents.

## Auditability and Observability Expectations
- Audit redaction failure and evidence rejection using safe reason codes.

## Error Handling and Failure-Safe Behavior
- Redaction uncertainty fails closed for sensitive persistence.

## Test Expectations
- Unit tests: redaction rules.
- Integration tests: secret-like value rejected/redacted.
- Manual verification: persisted sample contains no secret.
- Explicit non-testable conditions: production DLP coverage deferred.

## Validation and Risk-Acceptance Limitations
Prototype redaction supports validation but does not certify production privacy.

## Explicit Non-Claims
No production DLP certification, production security certification, compliance certification or production deployment.

## Definition of Done
Secret-like values cannot pass into evidence/audit/document/LLM paths unredacted.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-09-01-secret-redaction-and-evidence-sanitization.md`
