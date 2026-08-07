---
title: 'Fix Readiness Export E2E Label Assertions'
type: 'bugfix'
created: '2026-08-05'
status: 'done'
route: 'one-shot'
---

# Fix Readiness Export E2E Label Assertions

## Intent

**Problem:** The download E2E test searched for mixed-case field labels even though the DOCX-derived PDF intentionally renders table labels in uppercase, causing a valid PDF to fail at the `Purpose` assertion.

**Approach:** Assert bounded PDF row sequences so the test verifies the exact uppercase label, checkbox state, and persisted response together without matching unrelated section headings or unknown values.

## Suggested Review Order

- Review the checked Purpose and unchecked Data Types row assertions.
  [`wizard-readiness-export.e2e-spec.ts:198`](../../apps/api/test/wizard-readiness-export.e2e-spec.ts#L198)
