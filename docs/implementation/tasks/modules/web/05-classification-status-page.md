---
task_id: MW-web-005
module: web
runtime: nextjs
priority: P1
status: READY_FOR_DEV
epic_story: 7.3
depends_on:
  - classification/02-classification-result-callback-endpoint.md
  - web/04-conflict-resolution-page.md
---

# Classification Status Page

## Outcome

Show Manager the current classification status. When locked: show `LOCKED_EVIDENCE_REQUIRED` with business-language explanation and next steps. When available: show classification result summary (no overclaim). Show guardrail status. Link to document generation.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/web/app/(workspace)/assessments/[id]/classification/page.tsx` | Create | Classification status page |
| `apps/web/components/ui/classification-status-card.tsx` | Create | Status display component |
| `apps/web/lib/api/classification-client.ts` | Create | Classification API wrapper |

## UI States

| State | Display |
|---|---|
| `LOCKED_EVIDENCE_REQUIRED` | Blue info card: "Classification is locked — technical evidence required." |
| `PROCESSING` | Spinner: "Classification in progress..." |
| `READY` (`guardrail = passed`) | Summary of applicable rules + citation links + "Generate Final Report" button |
| `READY` (`guardrail = degraded`) | Degraded banner + partial summary + "Generate Gap Analysis" button |
| `BLOCKED` | Red card: business-language blocked reason + "Generate Gap Analysis" button |

## Business Rules

1. No `HIGH/MEDIUM/LOW`, `risk`, `severity`, `violation`, `non-compliant`, `certified`, `compliant` wording anywhere in this page.
2. When `guardrail_status = passed`: show applicable legal rule references (article IDs, not raw clause text).
3. When `guardrail_status = degraded`: show "Some legal references could not be fully verified." (business language).
4. When `guardrail_status = blocked`: show "Classification could not be completed — citation basis missing."
5. "Generate Final Report" button only when `guardrail_status = passed`.
6. "Generate Gap Analysis" button always available when classification exists (any guardrail status).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Classification locked | Info card with next steps |
| T02 | `guardrail = passed` | Summary + Final Report button |
| T03 | `guardrail = degraded` | Degraded banner |
| T04 | `guardrail = blocked` | Red card, gap analysis button only |
| T05 | No overclaim wording | UI text inspection |
| T06 | Final Report button only when guardrail passed | Button visibility verified |

## Definition of Done

- All four classification states rendered correctly.
- No risk/severity/compliance wording.
- Final Report button gated on `guardrail = passed`.
- Business-language messages for all states.
