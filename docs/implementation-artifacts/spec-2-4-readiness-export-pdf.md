---
title: 'Story 2.4 Readiness Export PDF Download'
type: 'feature'
created: '2026-08-02'
status: 'done'
baseline_commit: 'c5cbc50ac1252358d2b5bfd15f515be4da1e79cf'
review_loop_iteration: 0
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/implementation-artifacts/epic-2-context.md'
  - '{project-root}/docs/implementation-artifacts/2-4-wizard-readiness-export.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The Manager download for Wizard Readiness Export is currently a raw JSON attachment, which is suitable as an immutable audit source but not as a document that people can comfortably read or share.

**Approach:** Preserve the guarded JSON content as the stored source of truth, but make the protected download endpoint render and return a human-readable, versioned PDF from that exact content. The Manager UI will identify the download as PDF.

## Boundaries & Constraints

**Always:** Re-run PBAC, organization, owner, generated-status, and output-guardrail checks before rendering. Render only persisted `ReadinessExportContent`; never read or expose raw Wizard answers. Keep the readiness-only label, locked classification metadata, evidence checklist, unresolved items, preparation guidance, next steps, provenance, and artifact version visible. Return `application/pdf`, a safe versioned filename, and private no-store caching headers. Keep the stored JSON artifact immutable.

**Ask First:** Adding a second public download format, changing the persisted artifact schema, introducing a browser/Chromium runtime, or embedding a new licensed font asset.

**Never:** Turn the PDF into a final report, add classification or legal conclusions, bypass the existing guardrail, trust client-supplied filenames, or replace the stored structured content with PDF bytes.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|----------------------------|----------------|
| Ready artifact | Authorized Manager requests a generated, guardrail-valid export | Versioned PDF with readable metadata and readiness sections | N/A |
| Empty optional section | Export has no unresolved unknowns or no items in another optional list | PDF displays a neutral empty-state line and remains valid | N/A |
| Long checklist | Guarded content spans more than one page | Renderer wraps text and adds pages without clipping content | Fail safely if rendering cannot complete |
| Blocked or drifted artifact | Status is blocked, content is missing, or guardrail fails | No PDF bytes are returned | Preserve the existing problem response and status |
| Wrong scope | Actor is not the owner/organization Manager with export permission | No artifact information or PDF is returned | Existing PBAC/not-downloadable problem behavior |

</frozen-after-approval>

## Code Map

- `apps/api/src/modules/wizard/application/queries/get-readiness-export/` -- existing authorization, ownership, status, and guardrail gate that returns safe structured content.
- `apps/api/src/modules/wizard/infrastructure/pdf/readiness-export-pdf.service.ts` -- new server-side PDF renderer using controlled content and automatic wrapping/pagination.
- `apps/api/src/modules/wizard/presentation/http/wizard.controller.ts` -- change the protected download action from JSON envelope to a PDF stream.
- `apps/api/src/modules/wizard/wizard.module.ts` -- register the renderer.
- `apps/web/src/lib/server/upstream-request.ts` -- add a shared binary upstream path without weakening JSON envelope handling elsewhere.
- `apps/web/src/app/api/assessments/[id]/wizard/readiness-exports/[exportId]/download/route.ts` -- proxy validated PDF bytes and set safe browser download headers; keep mock mode deterministic.
- `apps/web/src/features/readiness/components/organisms/readiness-status-page.tsx` and `packages/i18n/src/locales/*/pages.ts` -- label the action as PDF without hardcoded customer copy.
- `apps/api/test/wizard-readiness-export.e2e-spec.ts`, renderer unit tests, and `tests/story-2-4.web.test.ts` -- verify binary output, headers, access failures, layout boundaries, and UI wiring.

## Tasks & Acceptance

**Execution:**
- [x] `apps/api/package.json`, `pnpm-lock.yaml`, and `apps/api/src/modules/wizard/infrastructure/pdf/` -- add a focused server-side PDF dependency and renderer with readable sections, wrapping, page breaks, metadata, and deterministic tests.
- [x] `apps/api/src/modules/wizard/presentation/http/wizard.controller.ts` and `apps/api/src/modules/wizard/wizard.module.ts` -- stream the PDF only after the existing guarded query succeeds, with safe headers and no JSON success wrapper.
- [x] `apps/web/src/lib/server/upstream-request.ts` and the readiness-export download BFF route -- proxy binary responses while forwarding existing problem envelopes on failure.
- [x] Readiness UI, i18n, mocks, Story 2.4 record, and focused tests -- present “Download PDF” and document the implemented format.
- [x] Run focused tests, full API/web regressions, lint, typecheck, contract checks, and production builds.

**Acceptance Criteria:**
- Given a generated readiness export owned by an authorized Manager, when it is downloaded, then the response is a valid PDF attachment whose filename includes the immutable export version and whose pages contain all guarded readiness sections and provenance.
- Given the same artifact content used by history and audit, when the PDF is rendered, then stored JSON remains unchanged and the PDF adds no raw answers, unsupported classification, or legal conclusion.
- Given blocked, missing, guardrail-drifted, cross-owner, cross-organization, or PBAC-denied state, when download is attempted, then no PDF is disclosed and the existing safe problem behavior remains effective.
- Given content longer than one page or an empty optional section, when rendered, then the PDF remains readable, complete, and valid.

## Design Notes

Generate the PDF in the NestJS control plane after `GetReadinessExportHandler` returns guarded content. The API download endpoint is intentionally binary and therefore does not use the JSON success envelope. The Next BFF should proxy bytes rather than reconstruct the report, keeping authorization and document semantics in one trusted location.

## Verification

**Commands:**
- `pnpm --filter @lcsp/api test -- --runInBand --watchman=false` -- all API unit suites pass.
- `pnpm --filter @lcsp/api test:e2e -- --runInBand --runTestsByPath test/wizard-readiness-export.e2e-spec.ts` -- PDF success and protected failure scenarios pass.
- `node --test tests/*.web.test.ts apps/web/tests/*.test.ts` -- web and Story 2.4 tests pass.
- `node scripts/check-import-policy.mjs && node scripts/check-contract-literals.mjs && pnpm typecheck` -- policy and type gates pass.
- `pnpm --filter @lcsp/api build && pnpm --filter @lcsp/web build` -- production builds succeed.

## Suggested Review Order

**Protected download boundary**

- Start where guarded content becomes a private, versioned PDF response.
  [`wizard.controller.ts:195`](../../apps/api/src/modules/wizard/presentation/http/wizard.controller.ts#L195)

- Bind every PDF provenance field back to the owner-scoped database record.
  [`get-readiness-export.handler.ts:47`](../../apps/api/src/modules/wizard/application/queries/get-readiness-export/get-readiness-export.handler.ts#L47)

- Fail closed on structural drift, oversized content, and separator-based overclaims.
  [`readiness-export-guardrail.service.ts:11`](../../apps/api/src/modules/wizard/application/services/wizard/readiness-export-guardrail.service.ts#L11)

**PDF projection and layout**

- Project immutable guarded content into readable provenance and readiness sections.
  [`readiness-export-pdf.service.ts:31`](../../apps/api/src/modules/wizard/infrastructure/pdf/readiness-export-pdf.service.ts#L31)

- Render wrapped, paginated PDF bytes without mutating stored JSON.
  [`readiness-export-pdf.service.ts:76`](../../apps/api/src/modules/wizard/infrastructure/pdf/readiness-export-pdf.service.ts#L76)

**Binary BFF and Manager UI**

- Proxy binary upstream responses while preserving safe JSON problems on failure.
  [`upstream-request.ts:57`](../../apps/web/src/lib/server/upstream-request.ts#L57)

- Validate PDF type, filename, header, and end marker before browser download.
  [`route.ts:27`](../../apps/web/src/app/api/assessments/[id]/wizard/readiness-exports/[exportId]/download/route.ts#L27)

- Present the localized PDF action from immutable artifact history.
  [`readiness-status-page.tsx:259`](../../apps/web/src/features/readiness/components/organisms/readiness-status-page.tsx#L259)

**Verification and follow-up**

- Verify valid PDF output and every protected non-disclosure branch end to end.
  [`wizard-readiness-export.e2e-spec.ts:313`](../../apps/api/test/wizard-readiness-export.e2e-spec.ts#L313)

- Verify layout, pagination, neutral empty states, and source immutability.
  [`readiness-export-pdf.service.spec.ts:19`](../../apps/api/src/modules/wizard/infrastructure/pdf/readiness-export-pdf.service.spec.ts#L19)

- Track pre-existing concurrency, migration, and client-hardening work separately.
  [`deferred-work.md:1`](deferred-work.md#L1)
