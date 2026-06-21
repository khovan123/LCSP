# Story STORY-01-01: Prototype Runtime Boundary Setup

Status: ready-for-dev

## Story ID

STORY-01-01

## Epic ID

EPIC-01

## Title

Prototype Runtime Boundary Setup

## Metadata

- Epic ID: EPIC-01
- Priority: P0
- Document status: IMPLEMENTATION_AUTHORIZED
- Dependency status: Unblocked
- Intended implementation order: 1
- Prototype-only classification: Controlled MVP prototype foundation story

## User Story

As a technical lead, I want the prototype runtime boundaries represented in the project structure so Web, API, Worker, scanner, contracts and rules are separated from the start.

## Business Value

This story reduces rework and prevents early architecture drift before OAuth/OIDC, GitHub App connection, Repository Scan orchestration, TechnicalEvidenceReport persistence and auditability are implemented.

## Authorization and Scope Boundary

This story is authorized only for the controlled MVP prototype under owner risk acceptance.

Allowed authorization state:

```text
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
```

Still not authorized:

- production deployment;
- customer onboarding;
- validated production release;
- legal or compliance certification;
- formal legal reliability validation;
- runtime scanner accuracy claims;
- A2-b2 empirical scanner acceptance claims;
- raw source code sent to an LLM;
- silent overwrite or deletion of scanner evidence.

Global readiness remains:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_NOT_READY
IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE
```

## In Scope

Implement the first prototype foundation boundary so later stories can add runtime behavior without mixing ownership.

In scope:

- establish repository areas for Web, API, Worker, scanner, TypeScript analyzer sidecar, shared contracts, shared config, shared vocabulary, deterministic rules and UI primitives;
- represent the Web-to-API-only boundary;
- represent API-to-Queue-to-Worker async boundary for long-running work;
- represent Worker/scanner separation and scanner static-analysis-only boundary;
- represent shared contracts/config/rules packages without adding runtime behavior beyond boundary scaffolding;
- add prototype-only markers or documentation where needed so future developers do not confuse prototype work with validated/production release readiness;
- preserve all source privacy and LLM boundary constraints.

## Out of Scope

- OAuth/OIDC login, MFA, session lifecycle or RBAC implementation;
- GitHub App installation, repository connection or scan authorization implementation;
- scanner parser, AST, data-flow, ruleset execution or runtime scanner accuracy work;
- TechnicalEvidenceReport persistence, database schema, migration or Prisma schema;
- queue worker execution logic, LangGraph orchestration or job processing;
- Legal RAG, classification, gap analysis or document generation;
- production CI/CD, Docker, infrastructure or deployment;
- enterprise SSO/SAML/SCIM;
- formal legal validation, A2-b2 empirical scanner acceptance or production-grade scanner benchmarking.

## Dependencies

- Phase 5.1 backlog planning decision:
  - `CONTROLLED_MVP_PROTOTYPE_BACKLOG_PLANNED`
  - `STORY_IMPLEMENTATION_PLANNING_ALLOWED`
- Owner risk acceptance for controlled MVP prototype implementation.
- No previous story dependency. This is the first foundation story in EPIC-01.

## Architecture and Module References

- `docs/implementation/repository-and-module-layout.md`
- `docs/implementation/system-runtime-and-component-contracts.md`
- `docs/implementation/implementation-scope-and-invariants.md`
- `docs/architecture/architecture.md`
- `docs/architecture/multi-agent-system-architecture.md`
- `docs/architecture/architecture-decision-records.md`
- `docs/specs/implementation-contract.md`
- `docs/security/source-code-privacy-policy.md`

## Domain, Data, Event, and API Contract References

This story does not implement API endpoints, database schema, migrations or DTO behavior. It must still prepare boundaries compatible with:

- API-facing contracts: `packages/contracts`
- configuration contracts: `packages/config`
- shared vocabulary/status/event constants: `packages/shared`
- deterministic rules and guardrail contracts: `packages/rules`
- Web frontend area: `apps/web`
- NestJS API area: `apps/api`
- Python Worker area: `apps/worker`
- scanner subsystem area: `apps/worker/scanner`
- TypeScript analyzer sidecar area: `apps/worker/ts-analyzer`

Future API and async contracts must preserve:

```text
Web -> API -> Queue -> Worker
```

Web must not call Worker, Queue, PostgreSQL, Vector Store, GitHub App, scanner or LLM provider directly.

## Acceptance Criteria

1. Repository areas for the controlled prototype boundaries are present or explicitly represented:
   - `apps/web`
   - `apps/api`
   - `apps/worker`
   - `apps/worker/scanner`
   - `apps/worker/ts-analyzer`
   - `packages/contracts`
   - `packages/config`
   - `packages/shared`
   - `packages/rules`
   - `packages/ui`
   - `legal-corpus`
   - `scanner-rulesets`
   - `test-fixtures`

2. Boundary documentation or placeholder metadata makes these dependency rules explicit:
   - Web calls API only.
   - API creates/enqueues long-running work and does not run scan/classification/document jobs inline.
   - Worker consumes async jobs and owns scanner/orchestrator runtime work.
   - Scanner remains under Worker boundary and is static-analysis only.
   - LLM calls may occur only through LLM Gateway in later stories.

3. No created artifact allows or implies:
   - raw source persistence;
   - raw source, full prompts, secrets or raw AST bodies being sent to LLM;
   - scanner legal-risk classification;
   - classification before VerifiedProfile;
   - final legal output without citation traceability;
   - Developer assignment as a prerequisite for Manager MVP workflow.

4. Prototype-only readiness markers are visible to future developers:
   - controlled MVP prototype is authorized;
   - validated/production backlog remains blocked;
   - `IMPLEMENTATION_NOT_READY` remains unchanged;
   - real validation remains incomplete;
   - A2-b2 remains post-implementation empirical scanner acceptance.

5. The foundation does not create implementation behavior outside boundary setup:
   - no production CI/CD;
   - no Docker or infrastructure artifacts;
   - no scanner/parser implementation;
   - no authentication implementation;
   - no database schema or migration;
   - no test framework setup.

6. The boundary setup can be manually verified by inspecting the repository tree and boundary notes against `docs/implementation/repository-and-module-layout.md`.

## Technical Implementation Notes

- Prefer creating minimal directory-level boundary scaffolding and non-runtime notes where the repository does not yet contain code.
- If a package or app area needs a placeholder, keep it non-executable and clearly marked as prototype boundary scaffolding.
- Do not add package manifests, dependency installation files, Dockerfiles, CI workflows or generated framework projects in this story unless a later story explicitly authorizes implementation setup for that area.
- Keep module names aligned with the canonical layout:
  - `apps/web`: Next.js Web application boundary.
  - `apps/api`: NestJS API boundary.
  - `apps/worker`: Python Worker boundary.
  - `apps/worker/scanner`: static scanner subsystem boundary.
  - `apps/worker/ts-analyzer`: restricted Node.js TypeScript analyzer sidecar boundary.
  - `packages/contracts`: shared DTO/event/evidence/AIUsageFlow/audit contracts.
  - `packages/config`: environment/config schema boundary; no secret values.
  - `packages/shared`: status, role, permission and audit-event vocabulary.
  - `packages/rules`: deterministic rule and guardrail contracts.
  - `packages/ui`: shared UI primitive boundary.
- The foundation must not decide final providers for OAuth/OIDC, queue, object storage, vector store or LLM provider. Keep those as configuration/adapter boundaries.
- This story should leave a clear path for EPIC-02 through EPIC-09 without introducing cross-boundary shortcuts.

## Security and Privacy Constraints

- No raw source code may be stored in persistent app areas.
- No raw source, full prompts, secrets or raw AST bodies may enter LLM, audit logs or long-term persistence.
- Web must not receive raw GitHub App tokens, raw source, provider secrets or worker internals.
- Queue/job payloads must be future-compatible with refs and IDs only, not raw source.
- Scanner boundary must state static-analysis-only behavior and forbid customer-code execution, installs, builds, tests, Docker, shell scripts, CI workflows and API probing.
- Audit boundary must be append-oriented and must not silently edit/delete material events.

## Auditability and Observability Expectations

This story does not implement audit storage, but it must prepare locations and vocabulary boundaries for future audit events.

Future critical events to preserve in boundary vocabulary:

- auth/OAuth/MFA session events;
- assessment and Wizard lifecycle events;
- GitHub repository connection events;
- Repository Scan requested/started/completed/failed events;
- evidence gate result events;
- AIUsageFlow generated/unclear/conflict-created events;
- reconciliation and Manager conflict-resolution events;
- VerifiedProfile approval events;
- legal retrieval/classification/document generation blocked or completed events.

## Error Handling and Failure-Safe Behavior

- Missing required boundary representation must block dependent story implementation until corrected.
- Any artifact that implies raw source persistence, direct LLM source ingestion, production deployment or validated release readiness must be treated as a scope violation.
- If future implementation encounters unclear module ownership, it must stop and update the story/references rather than creating cross-boundary shortcuts.

## Manual Verification Steps

1. Inspect repository areas created or represented by this story and compare them with `docs/implementation/repository-and-module-layout.md`.
2. Confirm Web/API/Worker/scanner/shared package boundaries are named consistently.
3. Confirm no production CI/CD, Docker, infrastructure, scanner implementation, auth implementation, database schema or test framework setup was created by this story.
4. Confirm boundary notes preserve:
   - Web calls API only;
   - API enqueues long-running work;
   - Worker handles scanner/orchestrator workloads;
   - scanner remains static-analysis only;
   - no raw source to LLM;
   - Manager MVP path is not Developer-blocked.
5. Confirm global readiness status was not changed.

## Test Expectations

- Unit tests: not required in this story unless implementation introduces executable boundary validation helpers.
- Integration tests: not required in this story unless implementation introduces executable package/module wiring.
- Manual verification: inspect repository areas, placeholder metadata and boundary notes against `docs/implementation/repository-and-module-layout.md`.
- Explicit non-testable conditions: production deployment, runtime scanner accuracy, formal legal reliability and A2-b2 completion are not testable in this story because they are explicitly out of scope.

When implementation creates repository scaffolding, future automated checks should validate:

- forbidden files are absent for this story scope, including CI workflow files, Dockerfiles and production infrastructure manifests;
- directory/package boundaries match the canonical layout;
- no file contains real secrets or provider tokens;
- no future Web boundary imports Worker/scanner internals directly.

Do not create Playwright, Cypress, Jest, Pytest or CI test scaffolding in this story unless a later authorized implementation story explicitly adds test framework setup.

## Validation and Risk-Acceptance Limitations

Real validation remains incomplete. This story is authorized only by owner risk acceptance for controlled MVP prototype work and does not convert simulated validation into validation evidence.

## Traceability References

| Item | Reference |
|---|---|
| Story source | `docs/planning/controlled-mvp-prototype-epics-and-stories.md` |
| Story map | `docs/planning/controlled-mvp-prototype-story-map.md` |
| Phase 5.1 decision | `docs/workflows/phase-5-1-controlled-mvp-prototype-backlog-planning-report.md` |
| Owner risk acceptance | `docs/validation/owner-risk-acceptance-controlled-mvp-prototype.md` |
| Module layout | `docs/implementation/repository-and-module-layout.md` |
| Runtime contracts | `docs/implementation/system-runtime-and-component-contracts.md` |
| Canonical implementation contract | `docs/specs/implementation-contract.md` |
| Source privacy | `docs/security/source-code-privacy-policy.md` |
| Audit requirement | FR-053, NFR-018 |
| Async boundary | NFR-022, NFR-025 |
| Source privacy guardrails | FR-060, FR-061, FR-062, NFR-012, NFR-013, NFR-016 |

## Explicit Non-Claims

- No production deployment or production release readiness.
- No customer onboarding.
- No legal/compliance certification.
- No formal legal reliability validation.
- No runtime scanner accuracy claim.
- No A2-b2 completion claim.
- No enterprise SSO/SAML/SCIM.
- No production CI/CD deployment.
- No production infrastructure scaling.
- No A2-b2 empirical scanner acceptance.
- No production-grade scanner benchmarking.
- No raw source to LLM.
- No silent overwrite of scanner evidence.

## Definition of Done

- Story file is reviewed against Phase 5.1 backlog and canonical architecture references.
- The repository boundary setup can be implemented without guessing module ownership.
- All acceptance criteria are testable by repository inspection and documentation review.
- No scope item implies production readiness, validation completion, legal certification or scanner accuracy.
- No readiness status is changed.
- This story is ready for `bmad-dev-story` implementation only for `STORY-01-01`.

## Dev Agent Record

### Agent Model Used

To be filled by implementation agent.

### Debug Log References

To be filled by implementation agent.

### Completion Notes List

To be filled by implementation agent.

### File List

To be filled by implementation agent.
## Developer Blueprint

- `docs/developer-blueprints/stories/DEV-BLUEPRINT-STORY-01-01-prototype-runtime-boundary-setup.md`
