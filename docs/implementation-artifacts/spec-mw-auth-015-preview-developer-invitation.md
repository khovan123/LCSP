---
title: 'MW-auth-015: Preview Developer Invitation and Preserve Acceptance Scope'
type: 'feature'
created: '2026-07-19T00:00:00+07:00'
status: 'in-review'
baseline_revision: '324eb37012767627be112d397a6bec07e88d223a'
review_loop_iteration: 0
followup_review_recommended: true
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/implementation/tasks/modules/auth-workspace/15-preview-developer-invitation-endpoint.md'
warnings: []
---

<intent-contract>

## Intent

**Problem:** Invited Developers cannot inspect the safe organization, assessment, granted actions, or expiry before accepting, and the acceptance response does not preserve the authoritative invitation scope needed for exact workspace routing.

**Approach:** Add a public, read-only invitation preview query and a shared persisted-data projection used by both preview and acceptance. Return one non-enumerable invalid response for every unusable token state, filter actions through the Developer allowlist and pinned policy, and audit denied previews without storing token or existence signals.

## Boundaries & Constraints

**Always:** Treat the opaque body token as the only preview credential; resolve labels and scope only from persisted records; require assessment-to-organization ownership; return HTTP 200 for valid preview and HTTP 400 `INVITATION_INVALID` for every invalid state; keep preview side-effect free except a safe denied audit; derive acceptance scope from the consumed invitation and return it only after atomic consumption succeeds; preserve all existing acceptance response fields.

**Block If:** Implementation requires a schema migration, a new public error distinction, a client-supplied scope/display label, or a change to existing session-token semantics.

**Never:** Put the token in path/query/log/audit; expose email, subject attributes, policy identifiers/versions, or Manager-only actions; create user, membership, session, allow audit, or extend expiry during preview; weaken Manager workspace behavior.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Assessment preview | Approved, unexpired invite with valid pinned policy and same-org assessment | 200 with safe organization/assessment labels, intersected actions, original expiry and correlation ID; no mutation | No error expected |
| Organization preview | Valid invite without assessment scope | 200 with organization scope and `assessment: null` | No error expected |
| Unusable invitation | Missing/unknown/expired/consumed/non-approved token, malformed scope, missing policy/entity, or cross-org assessment | No domain/display data; one denied audit containing correlation ID and safe null refs | 400 `INVITATION_INVALID` for all branches |
| Action contamination | Stored attributes or policy include unknown/Manager action | Return only intersection with `DEVELOPER_ALLOWED_ACTIONS` | Invalid actions are omitted, not exposed |
| Preview then accept | Same valid invitation is previewed repeatedly then accepted once | Preview remains read-only; acceptance returns matching typed scope after successful consume | Later preview/accept uses generic invalid response |

</intent-contract>

## Code Map

- `apps/api/src/modules/auth-workspace/application/commands/accept-invitation/accept-invitation.handler.ts` -- current atomic invitation consumption and unsafe action fallback to replace.
- `apps/api/src/modules/auth-workspace/application/services/auth-workspace/invitation-scope-projection.ts` -- shared persisted scope/action validation and projection.
- `apps/api/src/modules/auth-workspace/presentation/http/auth-workspace.controller.ts` -- public route boundary; POST must explicitly return 200.
- `apps/api/src/modules/auth-workspace/application/services/auth-workspace/auth-workspace.facade.ts` -- query dispatch seam.
- `apps/api/src/modules/auth-workspace/auth-workspace.module.ts` -- handler registration and facade wiring.
- `packages/contracts/src/auth/audit-event-types.ts` -- canonical safe preview-denied audit event.
- `apps/api/test/accept-invitation.e2e-spec.ts` -- existing acceptance/atomicity regression suite and fixture patterns.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/src/modules/auth-workspace/application/contracts/auth-workspace/invitation-preview.contract.ts` and `application/queries/preview-invitation/{preview-invitation.query.ts,preview-invitation.handler.ts}` -- add request/response types and read-only Prisma query with uniform invalid handling and safe denied audit.
- [x] `apps/api/src/modules/auth-workspace/application/services/auth-workspace/invitation-scope-projection.ts` -- parse assessment versus organization scope and intersect stored actions, pinned policy actions, and `DEVELOPER_ALLOWED_ACTIONS`; reject malformed or unverifiable persisted state.
- [x] `apps/api/src/modules/auth-workspace/application/contracts/auth-workspace/accept-invitation.contract.ts` and `application/commands/accept-invitation/accept-invitation.handler.ts` -- add typed acceptance scope and use the shared projection inside the authoritative acceptance path while preserving atomic consumption/session behavior.
- [x] `apps/api/src/modules/auth-workspace/application/services/auth-workspace/auth-workspace.facade.ts`, `presentation/http/auth-workspace.controller.ts`, and `auth-workspace.module.ts` -- expose and wire public `POST /auth/invitations/preview` with explicit HTTP 200.
- [x] `packages/contracts/src/auth/audit-event-types.ts` -- define the preview-denied event without adding sensitive payload fields.
- [x] `apps/api/test/preview-invitation.e2e-spec.ts` and `apps/api/test/accept-invitation.e2e-spec.ts` -- cover the matrix, scope parity, tenant isolation, non-mutation, action filtering, one-shot acceptance, and response/audit redaction.

**Acceptance Criteria:**
- Given a valid persisted invitation, when preview is requested one or repeatedly, then the safe projection is stable and invitation/authentication state and expiry remain unchanged.
- Given any invalid or unverifiable invitation state, when preview is requested, then the same 400 envelope is returned and its denied audit cannot reveal token existence, raw token, tenant, email, policy, or attributes.
- Given a previewed invitation, when atomic acceptance succeeds, then the response retains existing fields and adds a scope whose type and assessment ID match the previewed authoritative scope.
- Given stored or policy action contamination, when either projection is built, then only actions allowed by all three sources are returned and no Manager action leaks.

## Spec Change Log

## Review Triage Log

### 2026-07-19 — Review pass
- intent_gap: 0
- bad_spec: 0
- patch: 7: (high 3, medium 3, low 1)
- defer: 0
- reject: 3: (high 0, medium 2, low 1)
- addressed_findings:
  - `[high]` `[patch]` Moved invitation, pinned-policy, assessment, and projection reads into the acceptance transaction and rechecked expiry at consumption to prevent stale authoritative scope.
  - `[high]` `[patch]` Persisted the filtered action projection into the new membership instead of contaminated invitation actions.
  - `[medium]` `[patch]` Made null or missing preview bodies return the generic `INVITATION_INVALID` envelope instead of a runtime 500.
  - `[high]` `[patch]` Validated caller correlation IDs and replaced values equal to the opaque invitation token before audit persistence.
  - `[medium]` `[patch]` Added invalid-state coverage for missing assessment, wrong role, empty display label, missing token, and null body.
  - `[low]` `[patch]` Extended non-mutation assertions to memberships and acceptance allow-audit events.
  - `[medium]` `[patch]` Added organization-scope acceptance and contaminated-action membership regression coverage.

## Design Notes

The shared helper should accept already-loaded persisted invitation attributes, policy actions, and optional assessment data and return either a validated internal projection or failure. Preview may decorate the internal assessment ID with display names; acceptance serializes the same internal scope as `{ type, assessment_id }`. Invalid preview auditing keeps actor, organization, resource, session, and policy references null even when known, preventing audit storage from becoming an existence oracle.

## Verification

**Commands:**
- `pnpm --filter @lcsp/api test:e2e -- --runInBand --runTestsByPath test/preview-invitation.e2e-spec.ts test/accept-invitation.e2e-spec.ts` -- expected: focused preview and acceptance suites pass.
- `pnpm --filter @lcsp/api test` -- expected: API unit suite passes.
- `pnpm --filter @lcsp/api lint` -- expected: no lint violations.
- `pnpm --filter @lcsp/api build` -- expected: TypeScript build succeeds.

## Auto Run Result

Status: done

Summary: Added the public invitation preview endpoint, a shared persisted scope/action projection, acceptance response scope parity, safe denied auditing, and hardened transaction/persistence behavior discovered during adversarial review.

Files changed:
- `../../apps/api/src/modules/auth-workspace/application/contracts/auth-workspace/invitation-preview.contract.ts` -- preview request, response, and error types.
- `../../apps/api/src/modules/auth-workspace/application/queries/preview-invitation/preview-invitation.query.ts` -- opaque-token query input.
- `../../apps/api/src/modules/auth-workspace/application/queries/preview-invitation/preview-invitation.handler.ts` -- read-only preview, uniform denial, and safe audit behavior.
- `../../apps/api/src/modules/auth-workspace/application/services/auth-workspace/invitation-scope-projection.ts` -- shared scope validation and three-way action intersection.
- `../../apps/api/src/modules/auth-workspace/application/contracts/auth-workspace/accept-invitation.contract.ts` -- typed acceptance scope.
- `../../apps/api/src/modules/auth-workspace/application/commands/accept-invitation/accept-invitation.handler.ts` -- transaction-bound projection and normalized membership actions.
- `../../apps/api/src/modules/auth-workspace/application/services/auth-workspace/auth-workspace.facade.ts` -- preview dispatch.
- `../../apps/api/src/modules/auth-workspace/presentation/http/auth-workspace.controller.ts` -- public HTTP 200 preview route.
- `../../apps/api/src/modules/auth-workspace/auth-workspace.module.ts` -- preview handler wiring.
- `../../packages/contracts/src/auth/audit-event-types.ts` -- preview-denied audit event.
- `../../apps/api/test/preview-invitation.e2e-spec.ts` -- preview, isolation, redaction, and non-mutation coverage.
- `../../apps/api/test/accept-invitation.e2e-spec.ts` -- scope parity and normalized membership coverage.
- `../implementation/tasks/modules/auth-workspace/15-preview-developer-invitation-endpoint.md` -- task status set to done.

Review findings: seven patches applied; no items deferred; three speculative or infrastructure-level findings rejected (constant-time response equalization, app-local throttling without a defined platform contract, and an unavoidable post-validation preview race).

Follow-up review recommendation: true, because the review produced security-significant transaction, persisted-authorization, and audit-redaction changes.

Verification: focused preview/acceptance e2e 25/25 passed; API unit tests 275/275 passed; API lint passed; API build passed; `git diff --check` passed.

Residual risks: anonymous abuse throttling remains an ingress/platform concern outside this endpoint contract; preview validity is point-in-time and may change immediately after a successful response.
