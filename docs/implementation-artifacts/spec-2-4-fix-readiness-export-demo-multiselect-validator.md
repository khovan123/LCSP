---
title: 'Fix Readiness Export Demo Multi-select Validator'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# Fix Readiness Export Demo Multi-select Validator

## Intent

**Problem:** The DOCX renderer correctly emits each selected array value with its own checkbox, while the demo validator still required legacy comma-joined response strings and rejected a valid PDF.

**Approach:** Validate each expected choice in row order with an individual checked-checkbox marker, update the structural fixture, and add regressions for flattened and unchecked multi-select output.

## Suggested Review Order

**Validator behavior**

- Verify multi-select rows require ordered, individually checked values.
  [`readiness-export-pdf-demo.helpers.ts:103`](../../apps/api/scripts/readiness-export-pdf-demo.helpers.ts#L103)

**Regression coverage**

- Review positive, flattened, and unchecked demo-validator fixtures.
  [`readiness-export-pdf-demo.spec.ts:6`](../../apps/api/test/readiness-export-pdf-demo.spec.ts#L6)

- Confirm the renderer exercises the demo's three-value Data Types answer.
  [`readiness-export-pdf.service.spec.ts:64`](../../apps/api/src/modules/wizard/application/services/wizard/readiness-export-pdf.service.spec.ts#L64)
