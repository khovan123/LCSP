# LCSP Implementation Readiness

## Current Status

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_BACKLOG_BLOCKED
IMPLEMENTATION_NOT_READY
```

## Documents Generated

| Area | Documents |
| --- | --- |
| Project Overview | `docs/project/project-overview.md` |
| Brainstorming | `docs/brainstorming/*` |
| Product | `docs/product/product-brief.md`, `docs/product/prd.md` |
| Validation | `docs/product/validation-plan.md`, `validation-execution-plan.md`, `validation-results-template.md`, `validation-run-checklist.md` |
| Architecture | `docs/architecture/*`, including `docs/architecture/multi-agent-system-architecture.md` |
| Detailed Design | `docs/design/use-case-specification.md`, `functional-requirements.md`, `non-functional-requirements.md`, `business-rules.md`, `erd.md`, `ux-specification.md`, `flowcharts.md`, `sequence-diagrams.md`, `traceability-matrix.md`, `use-case-comparison-report.md` |
| Specs | `docs/specs/*`, including `docs/specs/ai-usage-flow-analysis-spec.md`, `docs/specs/scanner-signal-taxonomy.md`, `docs/specs/ai-usage-rule-mapping-spec.md` |
| Implementation Documentation | `docs/implementation/README.md` and the Phase 2 technical implementation documentation pack under `docs/implementation/*-implementation.md`, `docs/implementation/*-runbook.md`, `docs/implementation/implementation-sequencing-and-dependencies.md`, `docs/implementation/readiness-gates-and-handoff.md` |
| Security | `docs/security/*` |
| QA | `docs/qa/*` |

## Product Readiness

Conditional PRD exists and captures core constraints:

- LCSP is evidence-based compliance platform.
- No risk level without technical evidence.
- Wizard-only is readiness/preliminary only.
- Risk Classification requires VerifiedProfile.
- A1-A3 remain validation required.

Status:

```text
PRODUCT_READY_FOR_VALIDATION
```

## Detailed Design Normalization

Detailed design docs have been normalized:

- Use cases are grouped by major modules M01-M10.
- Use Case IDs use `UC-MXX-XX`.
- Functional Requirement IDs use `FR-XXX`.
- Non-Functional Requirement IDs use `NFR-XXX`.
- Business Rule IDs use `BR-XXX`.
- Authentication now includes Authenticator App MFA, including setup, OTP verification, login with MFA, disable/reset MFA, and MFA audit events.
- Consistency fixing from `docs/design/use-case-comparison-report.md` has been applied.
- Added explicit MVP use cases: `UC-M04-08 Run Repository Scan`, `UC-M06-08 Review and Approve VerifiedProfile`, `UC-M08-06 View Gap Analysis`.
- Added traditional auth coverage where already implied by current docs: `UC-M01-11 Verify Email`, `UC-M01-12 Change Password`, `UC-M01-13 Manage Personal Profile`.
- Deferred Source A legacy/admin/CLI/legal-corpus use cases remain out of MVP and are recorded in `docs/design/use-case-specification.md`.
- MFA login mappings now explicitly reference `UC-M01-10 Login With MFA`.
- `docs/design/traceability-matrix.md` has been added to map Use Case, FR, NFR, BR, sequence diagrams, flowcharts, UX screens and entities.
- MVP evidence pipeline has been simplified. Active MVP evidence path is `Run Repository Scan`; Local/CI upload, manual JSON upload, CLI evidence submission and CI/CD evidence submission are Deferred/Future/Enterprise paths.
- Conflict routing has been simplified for MVP. Main flow now uses binary decision: conflict exists or not. Any unresolved conflict blocks Risk Classification and final compliance report; severity-based conflict routing is not part of the MVP main flow.
- AI Usage Flow Analysis has been added as the missing bridge between repository technical evidence and legal rule matching. The main pipeline now derives `AIUsageFlow` after `TechnicalProfile` and before Reconciliation, so LCSP does not classify risk based only on provider/model/framework presence.
- Implementation-ready AI Usage Flow specifications have been added:
  - `docs/specs/ai-usage-flow-analysis-spec.md` defines the node input/output contract, analysis stages, confidence, uncertainty, conflict creation and LLM/privacy policy.
  - `docs/specs/scanner-signal-taxonomy.md` defines scanner finding types, required finding fields, evidence refs and scanner-side security constraints.
  - `docs/specs/ai-usage-rule-mapping-spec.md` defines how `AIUsageFlow` is used for Legal Rule Matching without relying on provider/model presence alone.
- OAuth/OIDC login has been moved into active MVP authentication scope. OAuth/OIDC authenticates LCSP user identity and remains separate from GitHub App repository connection and Repository Scan authorization.
- Manager is now the MVP superset role. Manager can complete the active MVP assessment workflow end-to-end without Developer assignment.
- Developer is optional in MVP and becomes a scoped, revocable delegated technical collaborator in post-MVP permission design.
- MVP conflict resolution routes any conflict to Manager. Developer clarification can exist only as optional delegated input and does not unlock classification or finalize conflict resolution.
- These specs support A2-b validation but do not unblock backlog while A1-A3/A2-b remain `NOT_RUN`.
- Phase 2 technical implementation documentation has been created at design/spec level. It covers frontend, API, auth/OAuth/MFA/RBAC, GitHub App Repository Scan, Python Worker/Orchestrator, AIUsageFlow, evidence gates, reconciliation, Legal RAG, LLM Gateway, document generation, persistence, queue, audit, security, configuration, deployment, CI/CD design, testing and operations.
- Backlog remains blocked until A1-A3 validation result exists.

Detailed design consistency status:

```text
DETAILED_DESIGN_CONSISTENCY_FIX_COMPLETED
```

## Architecture Readiness

Architecture is ready for review with conditional direction:

```text
Modular monolith + separate Python scanner/agent worker
```

Multi-agent architecture has been clarified:

- `docs/architecture/multi-agent-system-architecture.md` now defines the Orchestrator-controlled LangGraph DAG as LCSP's multi-agent control plane.
- The design is grounded in OpenAI Agents SDK multi-agent orchestration concepts and Microsoft Azure AI agent orchestration patterns.
- ADR-009 records the conditional decision to use Orchestrator-controlled multi-agent workflow.
- ADR-010 records the conditional decision to simplify MVP evidence collection to Repository Scan only.
- ADR-011 records the conditional decision to include OAuth/OIDC login in MVP authentication.
- ADR-012 records the conditional decision to make Manager the superset MVP role and final conflict resolver.
- LLM provider usage is constrained behind an LLM Gateway; LCSP owns workflow, rules, prompts, schemas, legal corpus, output validation and audit.
- Backlog remains blocked until A1-A3 validation result exists.

Status:

```text
READY_FOR_ARCHITECTURE_REVIEW
```

## Validation Status

A1-A3 results are not recorded yet.

| Assumption | Status |
| --- | --- |
| A1 - Wizard simplicity vs completeness | NOT_RUN |
| A2 - Legal corpus / rule reliability | NOT_RUN |
| A3 - Human attestation abuse risk | NOT_RUN |

A2 now includes sub-validation:

```text
A2-b - Scanner + AI Usage Flow Analysis mapping accuracy:
Can scanner + AIUsageFlow accurately map usage purpose to legal rule/corpus?
Status: NOT_RUN
```

Status:

```text
VALIDATION_READY
```

## Backlog Gate

Backlog is blocked until:

1. A1-A3 have validation results.
2. No unresolved critical FAIL remains.
3. PRD is updated if validation changes requirements.
4. Architecture/ADR is revisited if validation changes design.
5. Final sign-off is complete.

Current backlog status:

```text
IMPLEMENTATION_BACKLOG_BLOCKED
```

## Implementation Blockers

| Blocker | Reason |
| --- | --- |
| A1 result missing | WizardProfile field model may change |
| A2 result missing | Legal rule/citation contract, AIUsageFlow-to-rule mapping and Risk/RAG boundary may change |
| A3 result missing | Attestation policy may be restricted or removed |
| Backlog not created | Backlog must wait for validation unblock |

## Required Next Actions

The only allowed next action:

```text
Run A1-A3 validation using docs/product/validation-run-checklist.md and record results in docs/product/validation-results-template.md.
```

## Conditions to Start Backlog

Backlog may start only after backlog gate passes and `validation-results-template.md` records `BACKLOG_UNBLOCKED`.

## Conditions to Start Implementation

Implementation may start only when:

- A1-A3 have validation result.
- No unresolved critical FAIL remains.
- PRD has been updated if validation affects requirements.
- Architecture/ADR has been revisited if validation affects design.
- Backlog has been created after unblock.
- Final sign-off is complete.

Current implementation status:

```text
IMPLEMENTATION_NOT_READY
```
