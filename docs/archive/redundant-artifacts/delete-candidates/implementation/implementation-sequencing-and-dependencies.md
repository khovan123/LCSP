# Implementation Sequencing and Dependencies

## Purpose

Describe technical dependency sequencing for future implementation. This is not a backlog, epic list, sprint plan or implementation task list.

## Scope

Sequencing shows dependency order for implementation readiness once validation gates unblock backlog.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [Readiness Gates and Handoff](readiness-gates-and-handoff.md)

## Technical Dependency Sequence

| Phase | Technical Goal | Depends On | Exit Criteria | Validation Dependency |
| --- | --- | --- | --- | --- |
| Foundation | Shared contracts, config, persistence base, audit skeleton | Architecture approval | Contract/version boundaries usable | A1-A3/A2-b before backlog |
| Authentication and Manager authorization | Password/OAuth/OIDC/MFA/session/RBAC | Foundation | Manager super-role enforced | A1/A3 policy check |
| Assessment and Wizard | Assessment lifecycle and WizardProfile | Auth | Manager can create/submit WizardProfile | A1 |
| GitHub App connection | Repository connection and commit selection | Auth, assessment | Manager can connect selected repo | A2-b |
| Repository Scan | Static scanner job and TechnicalEvidenceReport | GitHub App, worker, queue | Scan report generated and cleaned up | A2-b |
| Evidence contracts and gates | Schema/Quality/TechnicalProfile | Repository Scan | Gates block/allow correctly | A2-b |
| AIUsageFlow | Usage flow claims and uncertainty | Evidence/TechnicalProfile | Evidence-backed AIUsageFlow | A2-b |
| Reconciliation and VerifiedProfile | Manager conflict task and profile snapshot | Wizard, TechnicalProfile, AIUsageFlow | No conflict -> VerifiedProfile; conflict blocks | A3 |
| Legal corpus / RAG | Rule retrieval and citations | VerifiedProfile, corpus | Citation-backed rule retrieval | A2 |
| Classification and Citation Guardrail | Risk result with citations | RAG, VerifiedProfile | No provider-only classification | A2/A2-b |
| Gap Analysis and Documents | Gaps, document gate, artifacts | Classification/citations | Documents generated only when gate passes | A2 |
| Observability and deployment hardening | Metrics, alerts, backup/recovery | All runtime components | Operational readiness | All validation |

## Implementation Boundaries

Do not begin implementation from this sequence until readiness gates allow backlog creation. This document is dependency guidance only.

## Security and Privacy Considerations

Security controls for auth, scanner, source privacy, LLM Gateway and audit must be implemented alongside the related component, not after final integration.

## Audit Requirements

Audit taxonomy and correlation ids should be established early because later components depend on traceability.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| Final go/no-go after validation | Backlog remains blocked | Backlog unblock |

