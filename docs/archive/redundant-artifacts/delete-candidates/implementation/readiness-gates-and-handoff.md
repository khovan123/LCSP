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
IMPLEMENTATION_NOT_READY
IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE
CONTROLLED_MVP_PROTOTYPE_BACKLOG_AUTHORIZED
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
```

## Owner Risk Acceptance Override

Project Lead Phan Nguyễn Quốc Minh authorized controlled MVP prototype implementation before completion of real validation evidence collection on 2026-06-20.

Reference:

```text
../validation/owner-risk-acceptance-controlled-mvp-prototype.md
```

This override permits only controlled MVP prototype implementation under owner risk acceptance. It does not mark validation complete, does not open production release, does not certify legal compliance, does not establish formal legal reliability and does not claim runtime scanner accuracy.

The prototype authorization permits backlog planning and implementation only for the approved MVP prototype scope:

1. OAuth/OIDC authentication and Manager super-role.
2. GitHub App connection and repository/branch/commit selection.
3. Scan orchestration contract and synthetic fixture-driven scanner prototype.
4. TechnicalEvidenceReport and TechnicalProfile persistence.
5. AIUsageFlow claim model and reconciliation workflow.
6. Manager-only conflict resolution and audit trail.
7. Legal corpus ingestion foundation with citation traceability.
8. Risk-classification workflow shell that blocks when evidence/citations are insufficient.
9. Gap-analysis and document-generation workflow shell.
10. Security controls: no raw-source-to-LLM, secret redaction, audit logging.

It does not authorize production deployment, customer onboarding, legal/compliance certification, formal legal reliability claims, runtime scanner accuracy claims, A2-b2 completion claims or removal of real-validation requirements.

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
- Validated/production backlog gate explicitly unblocked before validated/production story creation.
- Controlled MVP prototype backlog remains limited to owner-approved prototype scope.
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
- Controlled MVP prototype backlog planning under owner risk acceptance.
- Controlled MVP prototype implementation under owner risk acceptance.

## Blocked Before Validation

- Unconditional implementation backlog.
- Validated/production epics/stories/sprints.
- Prototype epics/stories/sprints outside the approved MVP prototype scope.
- Production release.
- Customer onboarding.
- Legal compliance certification.
- Formal legal reliability claims.
- Runtime scanner-accuracy claims.
- A2-b2 empirical scanner acceptance before scanner prototype exists.

## Security and Privacy Considerations

Security invariants remain active documentation constraints even before implementation: no raw source to LLM, no long-term raw source retention, no secrets in audit/logs, and citation trace required for legal output.

## Audit Requirements

Future handoff should include traceability from use case, FR, BR, NFR, implementation docs and QA artifacts.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Validated/production backlog unblock decision | Blocked until validation results | Validated/production backlog creation |
| Controlled MVP prototype scope control | Authorized only by owner risk acceptance and approved MVP prototype scope | Prototype backlog planning and prototype implementation |
