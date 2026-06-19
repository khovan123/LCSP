# Testing Implementation

## Purpose

Define the test design needed to validate LCSP implementation later. This document does not create test source code.

## Scope

Covers unit, integration, contract, API, worker, scanner fixture, AIUsageFlow, OAuth/MFA, authorization, RAG/citation, document, security/privacy, performance/failure and regression fixture tests.

## Dependencies / Source References

- [QA Test Strategy](../qa/test-strategy.md)
- [Acceptance Criteria](../qa/acceptance-criteria.md)
- [Static Analysis Scanner Contract](../specs/static-analysis-scanner-contract.md)

## Implementation Boundaries

- No Playwright/Cypress/project scaffolding is created here.
- Tests must verify Manager-only MVP completion.
- Tests must verify no risk classification from provider/model/framework presence alone.
- Tests must verify no raw source/full prompt/secret to LLM/audit.

## Test Areas

| Area | Coverage |
| --- | --- |
| Unit | Gate rules, claim confidence, RBAC guards, citation guardrail |
| Integration | API/DB/queue/worker handoff, GitHub App scan job, object storage refs |
| Contract | API schemas, async events, evidence report contract, AIUsageFlow claim contract |
| Worker | Node order, checkpoint/resume, retry/idempotency |
| Scanner fixture | Static-only scanner, L0-L4, invocation/input/output/action/review signals |
| Auth/OAuth/MFA | Valid/invalid callback, MFA challenge, session revocation |
| Authorization | Manager super-role, Developer optional/delegated scope |
| RAG/citation | Rule retrieval, citation missing block/degrade |
| Document | Final report gate, citation rendering, blocked output |
| Security/privacy | Redaction, no raw source to LLM/audit, cleanup verification |
| Failure/chaos | Queue outage, worker crash, LLM timeout, storage failure |

## Required Fixtures

| Fixture | Expected Coverage |
| --- | --- |
| Internal summarization | Low-impact usage, not automated decision |
| Loan approval / credit scoring | scoring + approve/reject + financial/personal data |
| HR screening / recruitment ranking | ranking + employment data + discrimination risk signals |
| Customer-facing chatbot without decision | chatbot transparency, no automatic high-risk |
| Human-reviewed loan | human review present path |
| Auto-approve / auto-reject | automated decision detection |
| Dynamic runtime prompt reference | uncertainty/coverage limitation |
| Provider/model with no business impact | no risk classification from provider alone |
| Unresolved downstream path | unknown/abstain behavior |
| Wizard/code conflict | Manager conflict task |
| Missing citation | classification/document block/degrade |
| Repository scan failure | classification locked |
| Manager completes flow without Developer assignment | role model invariant |
| Invalid OAuth callback | callback rejected and audited |

## A2-b Metrics

Track AI invocation detection precision, business purpose mapping precision, input category accuracy, output type accuracy, downstream-action accuracy, human-review accuracy, automated-decision false-positive rate, unknown/abstain correctness, AIUsageFlow evidence completeness and legal-rule mapping eligibility completeness.

## State / Error / Failure Handling

Tests must cover schema fail, quality insufficient, unresolved conflict, unknown usage purpose, missing citation, queue retry, idempotent duplicate request and document generation failure.

## Security and Privacy Considerations

Fixtures must avoid real secrets and real customer source. Synthetic fixtures should include redaction cases.

## Audit Requirements

Tests should assert critical audit event emission and absence of raw source/secrets in audit records.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| A2-b pass thresholds | Metrics defined; thresholds pending validation | Backlog unblock |
| Exact test framework | Not selected in this documentation pack | Implementation |

