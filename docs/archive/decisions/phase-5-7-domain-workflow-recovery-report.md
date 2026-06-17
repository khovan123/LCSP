# Phase 5.7 Domain Model & Workflow Recovery Report

## Scope

Mode: `DOMAIN_RECOVERY_MODE`.

This phase created minimum domain-level source-of-truth documents so a new BA, Architect or Developer can understand what LCSP does, who uses it, how work flows, what domain objects exist, and how events drive the system.

This phase did not create stories, epics, backlog, sprint plans, implementation guides, playbooks, blueprints, architecture rewrites or validation documents.

## Files Created

- `docs/product/system-context.md`
- `docs/product/business-capability-map.md`
- `docs/specs/domain-model.md`
- `docs/specs/event-catalog.md`
- `docs/specs/user-task-flows.md`
- `docs/archive/decisions/phase-5-7-domain-workflow-recovery-report.md`

## Source Documents Used

- `docs/product/prd.md`
- `docs/product/business-rules.md`
- `docs/specs/requirements-baseline.md`
- `docs/specs/requirements-traceability-summary.md`
- `docs/specs/scanner-spec.md`
- `docs/specs/assessment-lifecycle-spec.md`
- `docs/specs/legal-classification-spec.md`
- `docs/specs/document-generation-spec.md`
- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/implementation/backend-implementation.md`
- `docs/implementation/queue-implementation.md`
- `docs/implementation/persistence-implementation.md`

## Domain Recovery Results

| Question | Result | Evidence |
|---|---|---|
| Can a new BA understand the business? | PASS | `system-context.md` defines problem, product vision, actors, journeys, lifecycle, outcomes and success metrics. |
| Can a new Architect understand the domain? | PASS | `business-capability-map.md`, `domain-model.md`, and `event-catalog.md` define capability boundaries, domain objects, relationships and event choreography. |
| Can a new Developer explain Assessment -> Scan -> TechnicalProfile -> VerifiedProfile -> Classification -> Report without implementation docs? | PASS | `user-task-flows.md`, `domain-model.md`, and `event-catalog.md` describe the complete object, state and event journey. |
| Are canonical queue names preserved? | PASS | `event-catalog.md` uses only `command.*.v1` and `event.*.v1` names from the active queue contract. |
| Are archived requirements promoted to active requirements? | PASS | Documents summarize existing active behavior and do not create new UC/FR/NFR/BR IDs. |
| Are implementation details avoided? | PASS_WITH_LIMITS | Documents reference service ownership and database object changes at domain level, but do not specify classes, folders, packages, or implementation algorithms. |

## Cross-Document Consistency

| Area | Result | Notes |
|---|---|---|
| Actor model | PASS | Manager remains required/sufficient MVP role; Developer remains optional collaborator. |
| Assessment lifecycle | PASS | Lifecycle aligns with active assessment and queue/persistence contracts. |
| Scanner boundary | PASS | Repository Scan remains static-analysis only and cannot classify legal risk. |
| Classification guardrail | PASS | Classification requires VerifiedProfile and legal matching. |
| Document guardrail | PASS | Final output requires citation trace and no unresolved conflict. |
| Privacy boundary | PASS | Raw source, secrets, full prompts and full AST bodies are excluded from persistence, queue payloads and LLM input. |

## Conflicts / Open Domain Notes

| Item | Status | Handling |
|---|---|---|
| Requirements baseline remains partially incomplete for legacy auth/account/security aliases | KNOWN_FROM_PHASE_5_6 | Not resolved in this phase; no new requirements were created. |
| GapAnalysis physical schema is not a standalone canonical Prisma model in current physical schema | DOCUMENTED_AS_DOMAIN_RESULT | `domain-model.md` documents GapAnalysis as domain result; physical persistence remains owned by implementation schema. |
| Some task/audit event labels exist as business/audit names rather than RabbitMQ integration events | DOCUMENTED | `event-catalog.md` separates business/domain events from integration events. |

## Adversarial Review Summary

Findings considered during review:

- Domain docs must be understandable without `implementation/`, `developer-execution-blueprints/`, or `code-map/`.
- Event names must not regress to old unprefixed queue names.
- The docs must not create implementation instructions under the label of domain recovery.
- Manager/Developer authority must remain clear.
- Scanner must not be described as a legal classifier.
- Legal matching must sit between VerifiedProfile and Classification.
- Document generation must be blocked when citation/conflict prerequisites fail.
- GapAnalysis must not overclaim a physical schema if active persistence docs do not define one directly.
- Archived requirement material must not be treated as new active requirements.
- Privacy and redaction boundaries must remain visible at every object/event flow.

## Final Verification

Success criterion:

> A reviewer can explain the entire LCSP workflow from business perspective without opening `implementation/`, `developer-execution-blueprints/`, or `code-map/`.

Result: PASS.

The reviewer can now read:

1. `docs/product/system-context.md`
2. `docs/product/business-capability-map.md`
3. `docs/specs/domain-model.md`
4. `docs/specs/event-catalog.md`
5. `docs/specs/user-task-flows.md`

and explain:

```text
Assessment
-> WizardProfile
-> Repository Scan
-> TechnicalEvidenceReport
-> TechnicalProfile
-> AIUsageFlow
-> Reconciliation
-> VerifiedProfile
-> LegalRuleMatch
-> ClassificationResult
-> GapAnalysis
-> GeneratedDocument
```

## Final Decision

`DOMAIN_WORKFLOW_RECOVERY_COMPLETED`

`BUSINESS_DOMAIN_CONTEXT_RESTORED`

`END_TO_END_WORKFLOW_VISIBLE_WITHOUT_IMPLEMENTATION_DOCS`

`NO_APPLICATION_CODE_CREATED`
