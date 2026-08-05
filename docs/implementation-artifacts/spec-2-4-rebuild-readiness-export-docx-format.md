---
title: 'Rebuild Story 2.4 Readiness Export from DOCX Format'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
baseline_commit: 'c779cd720fad3d0d7f3546daebcb55909f48b498'
review_loop_iteration: 0
context:
  - '{project-root}/docs/project-context.md'
  - '{project-root}/docs/implementation-artifacts/2-4-wizard-readiness-export.md'
  - '{project-root}/output/readiness_template.docx'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** The current Wizard Readiness Export uses an unrelated dark institutional-card layout and does not match the supplied legal/business DOCX form. This makes the generated artifact visually inconsistent with the approved report format.

**Approach:** Remove the current PDF layout and rebuild it as an A4 administrative form modeled directly on `output/readiness_template.docx`: Times-style typography, two-column national/organization header, centered document title, identification table, numbered sections, bordered answer/checkbox tables, record-status block, approval/signature table, form footer, and page numbering.

## Boundaries & Constraints

**Always:** Render persisted readiness snapshot data; preserve Story 2.4 readiness-only metadata, missing evidence, unresolved unknowns, preparation guidance, versioning, and page continuation. Keep the output as `application/pdf` and use the existing dependency-free PDF pipeline.

**Ask First:** Adding a PDF/font dependency, embedding a new binary font, changing API contracts, or changing the supplied DOCX requires approval.

**Never:** Reuse the current navy/teal card design; copy illustrative sample values from the DOCX; emit HIGH/MEDIUM/LOW labels, legal outcomes, certification, or non-compliant wording; mutate the source DOCX.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|---------------|---------------------------|----------------|
| Normal export | Submitted Wizard snapshot | A4 report follows the DOCX hierarchy and uses actual snapshot values | N/A |
| Unknown answer | Explicit unknown or unanswered field | Form renders a visible unchecked/unknown state and carries it into section 8 | Never silently omit it |
| Multi-page content | Long answers or many unknowns | Rows and sections continue on subsequent pages with header/footer repeated | Content must not overlap footer or clip |

</frozen-after-approval>

## Code Map

- `output/readiness_template.docx` -- authoritative visual and structural template.
- `apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts` -- PDF renderer to replace completely.
- `apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts` -- focused template and guardrail coverage.
- `apps/api/scripts/readiness-export-pdf-demo.helpers.ts` -- real demo PDF content validator.
- `apps/api/test/readiness-export-pdf-demo.spec.ts` -- demo validator regression fixture.
- `apps/api/test/wizard-readiness-export.e2e-spec.ts` -- download-level PDF assertions.

## Tasks & Acceptance

**Execution:**
- [x] `readiness-export-pdf.service.spec.ts` -- replace existing expectations with failing tests for the DOCX header, title, form sections, tables, signature area, footer, and prohibited wording.
- [x] `readiness-export-pdf.service.ts` -- delete the current visual system and implement the DOCX-derived A4 form renderer with safe pagination.
- [x] Demo/e2e validators -- align expected content with the rebuilt report and remove assertions tied to the deleted design.
- [x] Story record -- document the replacement and verification evidence.

**Acceptance Criteria:**
- Given a persisted readiness snapshot, when its PDF is rendered, then the document structure visibly follows sections 1–9 of the supplied DOCX and contains only snapshot-derived values.
- Given content spans multiple pages, when rendered, then each page keeps the administrative header/footer and no content enters reserved margins.
- Given the report is inspected, then readiness-only safeguards remain present and prohibited classification/legal-outcome terms are absent.

## Design Notes

Use PDF built-in Times fonts for the DOCX typography and vector-drawn borders, checkbox squares, check marks, rules, and signature cells. English labels remain because the current API artifact is not locale-aware; this change reproduces format and hierarchy, not a new localization contract.

## Verification

**Commands:**
- `cd apps/api && NODE_OPTIONS=--experimental-vm-modules pnpm exec jest --config ./jest.config.ts --runInBand --watchman=false src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts test/readiness-export-pdf-demo.spec.ts` -- expected: focused renderer/demo tests pass.
- `pnpm --filter @lcsp/api exec eslint <changed files>` -- expected: no errors.
- `pnpm exec tsc -b` -- expected: passes.
- `pnpm --filter @lcsp/api demo:readiness-export-pdf` -- expected: writes an inspectable PDF when Docker is available.
- `git diff --check` -- expected: passes.

## Suggested Review Order

**DOCX-derived rendering**

- Start with the A4 form hierarchy, sections, metadata, and page lifecycle.
  [`readiness-export-pdf.service.ts:19`](../../apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts#L19)

- Verify checkbox state, array choices, and multi-page row continuation.
  [`readiness-export-pdf.service.ts:313`](../../apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts#L313)

**Persisted snapshot fidelity**

- Review metadata enrichment and immutable snapshot construction at generation time.
  [`generate-readiness-export.handler.ts:67`](../../apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts#L67)

- Confirm known and additional Wizard answers retain state and original text.
  [`generate-readiness-export.handler.ts:446`](../../apps/api/src/modules/wizard/application/commands/generate-readiness-export/generate-readiness-export.handler.ts#L446)

- Check the enriched content contract consumed by download rendering.
  [`readiness-export.contract.ts:15`](../../apps/api/src/modules/wizard/application/contracts/wizard/readiness-export.contract.ts#L15)

**Regression coverage**

- Inspect long-content, checkbox-state, Unicode, and section-format assertions.
  [`readiness-export-pdf.service.spec.ts:8`](../../apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts#L8)

- Verify demo validation rejects malformed PDFs and readiness overclaims.
  [`readiness-export-pdf-demo.helpers.ts:69`](../../apps/api/scripts/readiness-export-pdf-demo.helpers.ts#L69)

- Confirm the HTTP download preserves PDF headers, hierarchy, and guardrails.
  [`wizard-readiness-export.e2e-spec.ts:176`](../../apps/api/test/wizard-readiness-export.e2e-spec.ts#L176)
