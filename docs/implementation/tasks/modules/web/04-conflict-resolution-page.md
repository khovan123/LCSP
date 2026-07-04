---
task_id: MW-web-004
module: web
runtime: nextjs
priority: P0
status: READY_FOR_DEV
epic_story: 5.3
depends_on:
  - reconciliation/02-list-conflicts-endpoint.md
  - reconciliation/03-resolve-conflict-endpoint.md
  - web/02-workspace-dashboard-page.md
---

# Conflict Resolution Page

## Outcome

Show Manager the list of pending reconciliation conflicts with Conflict Score, explanation, and evidence references. Manager can resolve or dismiss each conflict. Resolution is audited. No raw source code shown. No technical implementation terms.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/web/app/(workspace)/assessments/[id]/conflicts/page.tsx` | Create | Conflict list page |
| `apps/web/app/(workspace)/assessments/[id]/conflicts/conflict-card.tsx` | Create | Per-conflict card with resolution form |
| `apps/web/lib/api/conflict-client.ts` | Create | List + resolve API wrappers |

## UI Components

| Component | Notes |
|---|---|
| Conflict card | Type (business label), score (progress bar 0–100%), explanation, evidence refs (IDs only) |
| Conflict score indicator | Visual bar: 0% = low tension, 100% = high tension |
| Resolution buttons | "Mark as Resolved" + "Dismiss" |
| Resolution note | Optional text field, max 2000 chars |
| "All resolved" banner | Shown when no more PENDING conflicts |

## Conflict Type Labels (business language)

| API value | UI label |
|---|---|
| `evidence_contradiction` | Evidence Contradiction |
| `scope_mismatch` | Scope Mismatch |
| `unverifiable` | Unverifiable Finding |

## Business Rules

1. Fetch `GET /assessments/:id/conflicts?status=PENDING` on page load.
2. Conflict score shown as percentage (0–100) with color: 0–40% green, 41–70% amber, 71–100% red.
3. `evidence_refs` shown as IDs only — no raw source or finding content.
4. Resolution form: dropdown `RESOLVED / DISMISSED` + optional note.
5. After resolve: refresh conflict list. If empty → show "All Conflicts Resolved — Assessment proceeding to next step."
6. Developer cannot access this page (PBAC gated — will show 403).

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | PENDING conflicts exist | Cards shown with score and explanation |
| T02 | Resolve a conflict | Card disappears, list refreshes |
| T03 | All conflicts resolved | "All Resolved" banner shown |
| T04 | Conflict score 0.9 | Red indicator shown |
| T05 | `evidence_refs` shown as IDs | No source code shown |
| T06 | Developer accesses page | 403 shown |

## Definition of Done

- Conflict list with score and business-language explanation.
- Resolution form functional with audit trail.
- "All resolved" state handled.
- No raw source code or technical terms in UI.
