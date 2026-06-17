# Phase 5.2 First Story Preparation Report

## Selected Story

Selected story:

| Field | Value |
|---|---|
| Story ID | STORY-01-01 |
| Epic ID | EPIC-01 |
| Title | Prototype Runtime Boundary Setup |
| Story file | `docs/implementation-artifacts/STORY-01-01-prototype-runtime-boundary-setup.md` |
| Status | ready-for-dev |

The selected story uses the exact canonical Story ID and title from `docs/planning/controlled-mvp-prototype-epics-and-stories.md`.

## Why This Story Is First

`STORY-01-01 Prototype Runtime Boundary Setup` is the earliest unblocked story in `EPIC-01 Platform Foundation and Prototype Guardrails`.

It is first because later prototype work depends on clear runtime and repository boundaries:

- OAuth/OIDC and Manager authorization need the `apps/web`, `apps/api`, `packages/contracts`, `packages/config` and `packages/shared` boundaries.
- GitHub App connection needs API-owned repository integration boundaries and must not be conflated with OAuth/OIDC login.
- Scan orchestration needs API-to-Queue-to-Worker separation.
- Scanner work needs `apps/worker/scanner` and `apps/worker/ts-analyzer` boundaries before any scanner prototype behavior appears.
- Evidence persistence, AIUsageFlow, reconciliation and auditability need shared contracts/rules/vocabulary boundaries before runtime behavior is added.

## Dependency Verification

| Dependency | Result | Evidence |
|---|---|---|
| Phase 5.1 backlog planned | Pass | `CONTROLLED_MVP_PROTOTYPE_BACKLOG_PLANNED` recorded in `docs/workflows/phase-5-1-controlled-mvp-prototype-backlog-planning-report.md` |
| Story implementation planning allowed | Pass | `STORY_IMPLEMENTATION_PLANNING_ALLOWED` recorded in Phase 5.1 report |
| Owner risk acceptance exists | Pass | `docs/validation/owner-risk-acceptance-controlled-mvp-prototype.md` |
| Story is first in EPIC-01 | Pass | `STORY-01-01` appears before `STORY-01-02` and `STORY-01-03` in EPIC-01 |
| No previous story dependency | Pass | Story map lists EPIC-01 first and `STORY-01-01` has no story dependency |
| Foundation prerequisite for later work | Pass | Story establishes Web/API/Worker/scanner/contracts/config/shared/rules boundaries |

## Story Readiness Assessment

The story is ready for implementation preparation because it has:

- canonical Story ID, Epic ID and title;
- clear user story and business value;
- explicit prototype authorization boundary;
- bounded scope and out-of-scope exclusions;
- architecture, data/API, security, audit and traceability references;
- acceptance criteria that can be verified without production deployment;
- manual verification steps;
- automated-test expectations without creating test source in this phase;
- explicit non-goals and definition of done.

No sprint status file was present for automatic update. This phase did not create a sprint, task, code branch, CI job or implementation artifact beyond the story document.

## Prototype Authorization Boundary

This story is authorized only for controlled MVP prototype implementation under owner risk acceptance.

It does not authorize:

- production deployment;
- customer onboarding;
- validated production release;
- legal/compliance certification;
- formal legal reliability validation;
- independent legal opinion;
- runtime scanner accuracy claim;
- A2-b2 completion claim;
- removal of real-validation requirements.

Global statuses remain unchanged:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_NOT_READY
IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE
CONTROLLED_MVP_PROTOTYPE_BACKLOG_AUTHORIZED
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
```

## Acceptance Criteria Summary

The prepared story requires implementation to:

- represent the canonical repository/runtime areas for Web, API, Worker, scanner, TS analyzer sidecar, shared contracts, config, shared vocabulary, deterministic rules and UI primitives;
- preserve Web-to-API-only access;
- preserve API-to-Queue-to-Worker async boundary;
- keep scanner under Worker boundary and static-analysis-only;
- keep LLM calls behind LLM Gateway for later stories;
- make prototype-only status and production/validated-release block clear;
- avoid all production CI/CD, Docker, infrastructure, scanner implementation, auth implementation, DB schema and test framework setup in this story.

## Security and Privacy Constraints

The story carries forward the required security and privacy invariants:

- no raw source to LLM;
- no long-term raw source storage;
- no raw source, full prompts, secrets or raw AST bodies in ordinary audit logs;
- scanner boundary forbids customer-code execution, installs, builds, tests, Docker, shell scripts, CI workflows and API probing;
- Web cannot receive raw GitHub App tokens, raw source or worker internals;
- audit trail must remain append-oriented and must not silently edit/delete material events.

## Explicitly Deferred Work

- Enterprise SSO/SAML/SCIM.
- Production CI/CD deployment.
- Production infrastructure scaling.
- OAuth/OIDC implementation.
- GitHub App implementation.
- Scanner/parser/AST/data-flow implementation.
- A2-b2 empirical scanner acceptance.
- Production-grade scanner benchmarking.
- Formal legal validation.
- Legal/compliance certification.
- Customer onboarding.
- Runtime claims beyond documented prototype scope.

## Final Decision

FIRST_CONTROLLED_MVP_PROTOTYPE_STORY_READY_FOR_IMPLEMENTATION

BMAD_DEV_STORY_ALLOWED_FOR_SELECTED_STORY_ONLY

This permits `bmad-dev-story` only for `STORY-01-01 Prototype Runtime Boundary Setup`. It does not permit implementation of other stories, production deployment, test automation framework setup, CI/CD, Docker, infrastructure, legal certification, formal legal reliability claims, runtime scanner accuracy claims or A2-b2 completion claims.

