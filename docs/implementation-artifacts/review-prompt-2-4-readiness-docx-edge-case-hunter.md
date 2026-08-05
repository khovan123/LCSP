# Edge Case Hunter Review Prompt

Invoke the `bmad-review-edge-case-hunter` skill on the Story 2.4 readiness DOCX-format rebuild.

Use this approved spec:

- `docs/implementation-artifacts/spec-2-4-rebuild-readiness-export-docx-format.md`

Review the complete tracked and untracked implementation diff from baseline commit `c779cd720fad3d0d7f3546daebcb55909f48b498`, with primary focus on:

- `apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.ts`
- `apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts`
- `apps/api/scripts/readiness-export-pdf-demo.helpers.ts`
- `apps/api/test/readiness-export-pdf-demo.spec.ts`
- `apps/api/test/wizard-readiness-export.e2e-spec.ts`

The authoritative visual source is `output/readiness_template.docx`. Exhaustively inspect pagination, long values, empty sections, explicit unknowns, ASCII replacement, table boundaries, repeated headers/footers, total page numbering, signature layout, and prohibited readiness wording. Report only unhandled edge cases with file and line references.

