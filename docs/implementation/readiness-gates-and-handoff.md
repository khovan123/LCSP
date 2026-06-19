# Readiness Gates and Handoff

## Purpose

Define current readiness, validation gates, handoff package expectations and what remains allowed or blocked before validation.

## Scope

This document summarizes the Phase 2 documentation handoff. It does not change readiness state and does not open implementation backlog.

## Dependencies / Source References

- [Implementation Readiness](../implementation-readiness.md)
- [Validation Plan](../product/validation-plan.md)
- [Validation Execution Plan](../product/validation-execution-plan.md)

## Current Readiness

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```

## Validation Gates

| Gate | Required Result |
| --- | --- |
| A1 | Wizard simplicity versus information completeness validated |
| A2 | Legal corpus and rule reliability validated |
| A2-b | Scanner + AIUsageFlow can reliably map usage purpose to legal rule/corpus |
| A3 | Human attestation abuse/governance risk validated |

## Required Updates After Validation

| Validation Outcome | Required Update |
| --- | --- |
| Requirement changes | PRD and functional requirements |
| Architecture impact | ADR and architecture docs |
| Scanner/AIUsageFlow threshold changes | Scanner/AIUsageFlow specs and QA docs |
| Legal corpus changes | Legal RAG/citation docs |
| Attestation policy changes | Reconciliation/security/business rules |

## Go / No-Go Checklist

- A1/A2/A2-b/A3 results recorded.
- No unresolved critical validation failure.
- PRD updated if validation changed scope.
- ADR updated if validation changed architecture.
- Backlog gate explicitly unblocked before story creation.
- Implementation pack reviewed through checkpoint preview.

## Handoff Package Contents

- Canonical implementation contract.
- Static-analysis scanner contract.
- Architecture and ADRs.
- Phase 2 implementation documentation pack.
- QA/test strategy and acceptance criteria.
- Readiness and validation reports.

## Allowed Before Validation

- Documentation review.
- Consistency fixes.
- Validation planning/execution.
- Architecture amendments if validation or review finds contradiction.

## Blocked Before Validation

- Implementation backlog.
- Epics/stories/sprints.
- Source code generation.
- Prisma/NestJS/Next.js/Python implementation.
- Dockerfile or CI/CD YAML creation.
- Development execution.

## Security and Privacy Considerations

Security invariants remain active documentation constraints even before implementation: no raw source to LLM, no long-term raw source retention, no secrets in audit/logs, and citation trace required for legal output.

## Audit Requirements

Future handoff should include traceability from use case, FR, BR, NFR, implementation docs and QA artifacts.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Backlog unblock decision | Blocked until validation results | Backlog creation |

