# Validation Decision Rubric

## Purpose

Define how A1, A2, A2-b and A3 validation evidence maps to decisions and follow-up actions.

## Decision Values

| Decision | Meaning | Required Action |
| --- | --- | --- |
| PASS | Evidence satisfies acceptance criteria with no required source-doc update | Record result; keep implementation backlog blocked until all validations and later readiness checkpoint complete |
| PASS_WITH_REQUIRED_UPDATES | Validation objective is substantially met but source docs must be updated before readiness change | Update PRD/spec/architecture/ADR/QA as required; record update completion |
| INCONCLUSIVE_REQUIRES_RERUN | Evidence is insufficient, sample invalid or reviewer disagreement unresolved | Fix protocol/materials and rerun validation |
| FAIL_REQUIRES_PRODUCT_OR_ARCHITECTURE_AMENDMENT | Validation reveals a product, architecture, spec or governance failure | Amend relevant source docs and rerun impacted validation |

## Phase 4.1.1 Execution Decision Status Values

These values apply to `docs/validation/validation-execution-decision-log.md`, not to validation results.

| Status | Meaning | Execution Effect |
| --- | --- | --- |
| PROPOSED_DEFAULT | A default has been documented but owner approval is not recorded | Does not remove blocker |
| PENDING_OWNER_CONFIRMATION | Required owner confirmation or concrete assignment is missing | Blocks affected validation stream |
| APPROVED_FOR_EXECUTION | Owner approval and required concrete values are recorded | May remove the specific execution blocker |
| BLOCKED | Decision cannot proceed due to missing prerequisite or contradiction | Blocks affected validation stream |

## Result-to-Update Mapping

| Result | No Change | PRD Update | Spec Update | Architecture Update | ADR Update | QA Fixture Update | Validation Rerun | Implementation Remains Blocked |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PASS | Yes | No | No | No | No | No | No | Yes |
| PASS_WITH_REQUIRED_UPDATES | No | If impacted | If impacted | If impacted | If decision changed | If fixture expectation changed | Usually no | Yes |
| INCONCLUSIVE_REQUIRES_RERUN | No | Maybe | Maybe | Maybe | Maybe | Maybe | Yes | Yes |
| FAIL_REQUIRES_PRODUCT_OR_ARCHITECTURE_AMENDMENT | No | Likely | Likely | If architecture affected | If decision affected | Likely | Yes after amendment | Yes |

## Validation-Specific Failure Triggers

| Validation | Failure Trigger |
| --- | --- |
| A1 | Manager cannot complete critical Wizard fields without Developer assistance; unknown critical fields become final input |
| A2 | Critical legal output lacks rule/citation/version; LLM creates unsupported legal conclusion |
| A2-b | Provider/model/framework presence alone triggers high-risk classification; unsupported AIUsageFlow claim drives legal matching |
| A3 | Manager/Developer/attestation bypasses scanner evidence, unresolved conflict, VerifiedProfile or audit requirements |

## A2-b Result Boundary

| Stream | Decision Boundary |
| --- | --- |
| A2-b1 Pre-Implementation Mapping Design Validation | May validate expected mapping design, claim model, uncertainty behavior, reconciliation and legal-rule eligibility only |
| A2-b2 Post-Implementation Empirical Scanner Acceptance Validation | Must remain `POST_IMPLEMENTATION_ACCEPTANCE_GATE` until a real scanner implementation exists |

A2-b1 must not be recorded as runtime scanner accuracy validation.

## Implementation Backlog Rule

Validation pass alone does not unlock implementation. Implementation backlog remains blocked until:

- A1, A2, A2-b and A3 have real recorded outcomes.
- Required PRD/spec/architecture/ADR/QA updates are completed.
- A later readiness checkpoint explicitly permits implementation planning.

## Decision Owner Matrix

| Decision | Primary Owner | Supporting Reviewers |
| --- | --- | --- |
| A1 result | Product Manager | UX/domain reviewer, QA |
| A2 result | Product Manager / Legal owner | Legal reviewer, architecture, QA |
| A2-b result | Architecture / QA | Scanner reviewer, AIUsageFlow reviewer, Legal/RAG reviewer |
| A3 result | Product / Security | Governance reviewer, architecture, QA |
| Readiness change | Product + Architecture | QA, security, legal as applicable |
