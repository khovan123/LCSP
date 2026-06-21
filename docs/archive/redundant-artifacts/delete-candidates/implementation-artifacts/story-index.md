# Controlled MVP Prototype Story Index

| Story ID | Epic | Title | Document Status | Priority | Dependencies | Intended Wave |
|---|---|---|---|---|---|---|
| STORY-01-01 | EPIC-01 | Prototype Runtime Boundary Setup | IMPLEMENTATION_AUTHORIZED | P0 | None | Wave 1 |
| STORY-01-02 | EPIC-01 | Shared Prototype Status and Guardrail Vocabulary | DOCUMENTED | P0 | STORY-01-01 | Wave 2 |
| STORY-01-03 | EPIC-01 | Prototype Configuration and Environment Boundary | DOCUMENTED | P1 | STORY-01-01 | Wave 2 |
| STORY-02-01 | EPIC-02 | OAuth/OIDC Login Boundary | BLOCKED_BY_DEPENDENCY | P0 | STORY-01-03 | Wave 3 |
| STORY-02-02 | EPIC-02 | Session, MFA Hooks, and Account Safety | BLOCKED_BY_DEPENDENCY | P1 | STORY-02-01 | Wave 4 |
| STORY-02-03 | EPIC-02 | Manager Super-role Authorization | BLOCKED_BY_DEPENDENCY | P0 | STORY-02-01 | Wave 4 |
| STORY-03-01 | EPIC-03 | GitHub App Installation and Repository Connection | BLOCKED_BY_DEPENDENCY | P0 | STORY-02-03 | Wave 5 |
| STORY-03-02 | EPIC-03 | Repository, Branch, and Commit Selection | BLOCKED_BY_DEPENDENCY | P0 | STORY-03-01 | Wave 6 |
| STORY-04-01 | EPIC-04 | Scan Job Lifecycle and Idempotency | BLOCKED_BY_DEPENDENCY | P0 | STORY-03-02 | Wave 7 |
| STORY-04-02 | EPIC-04 | Synthetic Fixture-driven Scanner Prototype | BLOCKED_BY_DEPENDENCY | P1 | STORY-04-01 | Wave 8 |
| STORY-04-03 | EPIC-04 | TechnicalEvidenceReport Contract Persistence | BLOCKED_BY_DEPENDENCY | P0 | STORY-04-02 | Wave 9 |
| STORY-04-04 | EPIC-04 | Evidence Gates and TechnicalProfile Builder | BLOCKED_BY_DEPENDENCY | P0 | STORY-04-03 | Wave 10 |
| STORY-05-01 | EPIC-05 | AIUsageFlow Claim Model | BLOCKED_BY_DEPENDENCY | P0 | STORY-04-04 | Wave 11 |
| STORY-05-02 | EPIC-05 | Uncertainty and Abstention Handling | BLOCKED_BY_DEPENDENCY | P0 | STORY-05-01 | Wave 12 |
| STORY-05-03 | EPIC-05 | Human Review and Automation Level Mapping | BLOCKED_BY_DEPENDENCY | P1 | STORY-05-01 | Wave 12 |
| STORY-06-01 | EPIC-06 | Reconciliation Engine Shell | BLOCKED_BY_DEPENDENCY | P0 | STORY-05-03 | Wave 13 |
| STORY-06-02 | EPIC-06 | Manager Conflict Resolution Workspace | BLOCKED_BY_DEPENDENCY | P0 | STORY-06-01 | Wave 14 |
| STORY-06-03 | EPIC-06 | VerifiedProfile Builder and Approval Gate | BLOCKED_BY_DEPENDENCY | P0 | STORY-06-02 | Wave 15 |
| STORY-06-04 | EPIC-06 | Immutable Audit Trail Foundation | BLOCKED_BY_DEPENDENCY | P1 | STORY-01-02 | Wave 5 |
| STORY-07-01 | EPIC-07 | Legal Corpus Version and Source Metadata | BLOCKED_BY_DEPENDENCY | P1 | STORY-06-04 | Wave 16 |
| STORY-07-02 | EPIC-07 | Legal Rule and Citation Retrieval Boundary | BLOCKED_BY_DEPENDENCY | P1 | STORY-07-01, STORY-06-03 | Wave 17 |
| STORY-07-03 | EPIC-07 | Citation Guardrail Shell | BLOCKED_BY_DEPENDENCY | P0 | STORY-07-02 | Wave 18 |
| STORY-08-01 | EPIC-08 | Risk Classification Workflow Shell | BLOCKED_BY_DEPENDENCY | P0 | STORY-07-03 | Wave 19 |
| STORY-08-02 | EPIC-08 | Gap Analysis Workflow Shell | BLOCKED_BY_DEPENDENCY | P1 | STORY-08-01 | Wave 20 |
| STORY-08-03 | EPIC-08 | Document Generation Workflow Shell | BLOCKED_BY_DEPENDENCY | P1 | STORY-08-02 | Wave 21 |
| STORY-08-04 | EPIC-08 | Readiness-only Export Shell | BLOCKED_BY_DEPENDENCY | P2 | STORY-01-02 | Wave 5 |
| STORY-09-01 | EPIC-09 | Secret Redaction and Evidence Sanitization | BLOCKED_BY_DEPENDENCY | P0 | STORY-04-03 | Wave 10 |
| STORY-09-02 | EPIC-09 | No Raw Source to LLM Boundary | BLOCKED_BY_DEPENDENCY | P0 | STORY-05-01, STORY-07-02 | Wave 18 |
| STORY-09-03 | EPIC-09 | Workspace Cleanup and Retention Boundary | BLOCKED_BY_DEPENDENCY | P1 | STORY-04-01 | Wave 8 |
| STORY-09-04 | EPIC-09 | Prototype Observability and Manual Verification Support | BLOCKED_BY_DEPENDENCY | P1 | EPIC-01 through EPIC-08 | Wave 22 |

## Notes

- `STORY-01-01` is the only story with existing implementation authorization.
- All other stories are documented for review and dependency planning only.
- No story in this package is marked implemented.

