# Accessibility and Usability NFR Review

## Purpose

Define Manager-facing accessibility and usability NFR review criteria for the LCSP MVP. This document is design-only and does not create UI code or automated accessibility tests.

## Scope

The review covers critical Manager MVP screens and the UX constraints required to preserve compliance guardrails, evidence clarity and Developer optionality.

## Dependencies / Source References

- `docs/design/ux-specification.md`
- `docs/design/non-functional-requirements.md`
- `docs/implementation/web-frontend-implementation.md`
- `docs/qa/test-scenario-catalog.md`
- `docs/qa/manual-validation-protocols.md`

## Implementation Boundaries

- Manager must be able to complete the whole MVP assessment flow without Developer assignment.
- UX must not imply that provider/model/framework detection alone determines legal risk.
- UX must clearly distinguish scanned evidence, Manager declaration, reconciled facts and legal citations.
- Accessibility validation requires implementation; this document defines review criteria.

## Screen Review Matrix

| Screen | Primary Task | Accessibility Requirement | Error/Empty State Requirement | Keyboard/Focus Requirement | Usability Risk | Validation Method |
| --- | --- | --- | --- | --- | --- | --- |
| Login and OAuth callback | Sign in with password or OAuth/OIDC | Labels, visible focus, no hidden callback errors | Invalid callback/state/nonce shows safe generic error and audit reference | Focus moves to error or MFA challenge | Account-linking confusion | TESTABLE_AFTER_IMPLEMENTATION |
| MFA challenge | Complete TOTP challenge/recovery path | Accessible input labels and countdown/help text | Invalid/expired/replayed OTP uses safe error | Keyboard entry and submit supported | MFA bypass or lockout confusion | TESTABLE_AFTER_IMPLEMENTATION |
| Assessment dashboard | Create/select assessment | Clear buttons and table semantics | Empty dashboard offers create action | Focus order follows dashboard actions | Manager unsure how to start | A1 manual validation |
| Wizard | Complete WizardProfile | Progressive disclosure, accessible validation messages | Missing required answers are local and field-specific | Focus jumps to first invalid field | Business/legal confusion | A1 manual validation |
| Repository selection | Connect GitHub repo and choose branch/commit | Clear OAuth/GitHub boundary wording and selectable controls | No repositories/permission error explains GitHub App requirement | Repository/branch/commit selection keyboard accessible | OAuth mistaken for repository permission | TESTABLE_AFTER_IMPLEMENTATION |
| Scan progress | Monitor Repository Scan | Live region/status semantics for progress | Failure explains retry/rescan option without exposing source | Refresh/status controls keyboard accessible | Manager thinks scan is synchronous or blocked by Developer | TESTABLE_AFTER_IMPLEMENTATION |
| Evidence report | Review TechnicalEvidenceReport and findings | Tables/lists readable with evidence refs | Empty/invalid/insufficient evidence states are explicit | Findings navigable without mouse | Evidence confidence misread | TESTABLE_AFTER_IMPLEMENTATION |
| AIUsageFlow review | Review AI purpose, inputs, outputs, actions, uncertainty | Claim groups and confidence visible | Unknown/unclear critical claim explains block/clarification | Claim rows and evidence refs keyboard accessible | AI purpose overclaimed | A2-b manual validation |
| Conflict-resolution workspace | Resolve Manager Conflict Resolution Task | Compare WizardProfile, TechnicalProfile and AIUsageFlow accessibly | Unresolved conflict blocks progression with reason | Focus preserves selected conflict and resolution action | Manager erases scanner evidence silently | A3 manual validation |
| VerifiedProfile review | Review reconciled profile | Source labels for manager-declared/scanner-derived/reconciled facts | Missing approval or stale profile blocks classification | Review and approval actions keyboard accessible | VerifiedProfile treated as optional | TESTABLE_AFTER_IMPLEMENTATION |
| Classification result | View risk result | Legal citation links and status labels accessible | Missing citation/unclear purpose shows blocked/degraded output | Citation navigation keyboard accessible | Risk seen as legal advice or provider-only | A2 manual validation |
| Gap analysis | View obligations/gaps | Gaps and evidence/citation references readable | Gap unavailable until classification valid | Expand/collapse keyboard accessible | Gap analysis treated as final report | A2/A3 validation |
| Document export | Request/export compliance document | Export action and generated file metadata accessible | Blocked output lists failed prerequisite gates | Focus moves to blocker list or generated file | Final report generated despite missing citation/conflict | TESTABLE_AFTER_IMPLEMENTATION |
| Audit history | Review audit trail | Table semantics and filters accessible | No events shown only for valid empty state | Filters and rows keyboard accessible | Audit trace incomplete or too technical | A3 manual validation |

## Critical Usability Rules

- The UI must present scanned evidence and Manager declarations as different source types.
- Uncertainty must be visible where AIUsageFlow has unknown/unclear critical claims.
- Blocked states must show which gate blocks the workflow: Schema Gate, Quality Gate, Reconciliation, VerifiedProfile, Citation Guardrail or Output Guardrail.
- Conflict resolution must communicate that Manager is the final resolver in MVP.
- Developer assignment must not appear as required in any MVP happy path.
- The UI must avoid wording that turns provider/model/framework detection into a legal risk conclusion.

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| UX specification and screen contracts | Accessibility/usability review matrix |
| A1/A2/A2-b/A3 protocols | Manual validation mapping |
| Implementation web screen plan | Screen-level NFR acceptance focus |

## State / Error / Failure Handling

| State / Failure | Required UX Behavior |
| --- | --- |
| OAuth callback validation failure | Show safe login failure, do not expose provider token details |
| Repository not connected | Explain GitHub App connection requirement |
| Scan failed | Show failure category and retry/rescan path |
| Evidence insufficient | Lock classification and explain re-scan/correction need |
| AIUsageFlow unclear | Explain unknown claim and required clarification/conflict handling |
| Conflict unresolved | Keep classification and document generation locked |
| Missing citation | Block or degrade output and show citation gap |

## Security and Privacy Considerations

- UI must not display raw provider tokens, GitHub installation tokens, secrets, raw source, full prompts or full AST bodies.
- Evidence snippets, if ever shown under policy, must be redacted and reference-based.
- Audit history must expose trace metadata without leaking sensitive payloads.

## Audit Requirements

Manager actions on repository connection, scan request, AIUsageFlow review, conflict resolution, VerifiedProfile approval, classification trigger, document generation and audit export must produce audit events.

## Decision Required

| Decision | Classification | Recommended Default | Owner | Required Before |
| --- | --- | --- | --- | --- |
| Accessibility conformance target | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Adopt WCAG 2.1 AA for Manager-facing MVP screens unless a stricter institutional standard is approved | Product/UX | Implementation |
| A1 Manager usability threshold | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Define pass/fail thresholds in A1 validation plan before backlog unblocking | Product/QA | Implementation |

