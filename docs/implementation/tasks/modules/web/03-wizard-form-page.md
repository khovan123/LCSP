---
task_id: MW-web-003
module: web
runtime: nextjs
priority: P0
status: READY_FOR_DEV
epic_story: 2.2
depends_on:
  - wizard/01-save-wizard-draft-endpoint.md
  - wizard/02-submit-wizard-endpoint.md
  - web/02-workspace-dashboard-page.md
---

# Wizard Form Page

## Outcome

Multi-step Wizard form for WizardProfile completion. Business language throughout — no code-centric terms. Auto-saves drafts. Complex questions include examples and progressive disclosure. Validation messages business-language only. Submit requires all critical fields.

## Module Files

| File | Action | Notes |
|---|---|---|
| `apps/web/app/(workspace)/assessments/[id]/wizard/page.tsx` | Create | Wizard page |
| `apps/web/app/(workspace)/assessments/[id]/wizard/wizard-steps.tsx` | Create | Step navigation + per-step forms |
| `apps/web/app/(workspace)/assessments/[id]/wizard/wizard-step-*.tsx` | Create | One component per wizard section |
| `apps/web/lib/api/wizard-client.ts` | Create | Draft save + submit API wrappers |

## Wizard Steps

| Step | Questions | Critical |
|---|---|---|
| 1: System Purpose | `purpose`, `sector` | Yes |
| 2: Data & Users | `data_type`, `user_group`, `user_impact` | Yes |
| 3: Decision Making | `decision_role`, `human_oversight` | Yes |
| 4: AI Provider | `external_llm_usage` | Yes |
| 5: Risk Indicators | `biometric_indicator`, `high_impact_indicator` | No |

## UI Behaviour

- Auto-save draft: debounced 2s after field change → `PUT /assessments/:id/wizard/draft`.
- "Save and continue" on each step.
- Final step: "Submit Wizard" button → `POST /assessments/:id/wizard/submit`.
- Progress indicator showing completed/current/pending steps.
- Validation error inline: business language only.

**Example progressive disclosure:**
- `decision_role`: Show helper text "Does the AI system make decisions that affect people without human review?" + examples for each answer.
- `human_oversight`: Show field only when `decision_role ≠ no_autonomous_decision`.

## Business Rules

1. All labels and questions in business language (Vietnamese or English per locale). No technical jargon.
2. `external_llm_usage` question: "Does your system call an external AI provider (such as OpenAI, Anthropic, or similar)?"
3. Draft auto-save: silent (no toast on every save). Only show "Saved" indicator.
4. Submit blocked until all critical fields filled — show per-field business-language errors.
5. Submitted WizardProfile shows read-only view — no re-edit allowed.
6. `WIZARD_ALREADY_SUBMITTED` from API → show read-only mode.

## Test Cases

| ID | Scenario | Expected |
|---|---|---|
| T01 | Fill all critical fields → submit | Redirect to readiness page |
| T02 | Missing critical field on submit | Business-language validation error |
| T03 | Auto-save triggers | Draft saved, "Saved" indicator shown |
| T04 | Already submitted → open wizard | Read-only mode shown |
| T05 | No technical jargon in labels | UI text inspection |
| T06 | Progressive disclosure works | `human_oversight` hidden/shown per `decision_role` |

## Definition of Done

- Auto-save working (debounced, silent).
- Submit requires all critical fields with business-language validation.
- Submitted state shows read-only mode.
- No technical jargon or code terms in UI text.
