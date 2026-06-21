# Web Frontend Implementation

## Purpose

Define the Next.js web implementation contract for LCSP MVP screens and user actions.

## Scope

The frontend renders Manager-owned MVP workflows and optional Developer collaboration views. It calls the NestJS API only. It does not call the Worker, LLM provider, scanner workspace or GitHub repository directly.

## Dependencies / Source References

- [Implementation Contract](../specs/implementation-contract.md)
- [System Runtime and Component Contracts](system-runtime-and-component-contracts.md)
- [UX Specification](../design/ux-specification.md)
- [API and Async Event Contracts](api-and-async-event-contracts.md)

## Implementation Boundaries

- Manager must access every required MVP screen and action.
- Developer UI is optional and must not be required for assessment completion.
- UI state is not authoritative for workflow state; API state is authoritative.
- OAuth/OIDC callback handling creates LCSP session only after API validation and MFA policy enforcement.
- Repository access is shown through GitHub App connection state, not OAuth/OIDC login state.

## Screen Contract

| Screen | Primary Role | Required Data | Allowed Actions | State Preconditions | Errors / Empty States | Audit-Relevant Action |
| --- | --- | --- | --- | --- | --- | --- |
| Login | Manager, optional Developer | Login methods, CSRF/session state | Password login, start OAuth/OIDC login | No active session | Invalid credentials, provider unavailable | Login attempt |
| OAuth/OIDC callback | Manager, optional Developer | Callback state, nonce, provider result | Continue session or show failure | Valid OAuth/OIDC redirect | Invalid state, nonce, issuer, audience, expiry | Callback success/failure |
| TOTP MFA challenge | Manager, optional Developer | Pending session, MFA policy | Submit TOTP, request recovery/reset flow | Identity verified and MFA required | Invalid/expired code, lockout | MFA challenge/success/failure |
| Assessment dashboard | Manager | Assessments, workflow status | Create assessment, open assessment | Authenticated Manager | Empty assessment list | Assessment opened/created |
| Assessment creation | Manager | Organization, template/version context | Create assessment | Manager session | Validation failure | `ASSESSMENT_CREATED` |
| WizardProfile | Manager | Wizard schema, saved answers | Save progress, submit WizardProfile | Assessment exists | Missing required fields | `WIZARD_SUBMITTED` |
| GitHub repository connection | Manager | GitHub App status, repo list/selection | Install/connect, choose repository/branch/commit | Assessment exists | No installation, repo access denied | `GITHUB_REPOSITORY_CONNECTED` |
| Repository scan progress | Manager | Scan job, progress, status | Request scan, re-run scan, view status | Repository connected | Scan queued/running/failed/no scan | `REPOSITORY_SCAN_REQUESTED` |
| TechnicalEvidenceReport and findings | Manager | Report metadata, findings, coverage limits | View report, inspect evidence refs | Scan completed | Report invalid or unavailable | Findings viewed |
| AIUsageFlow review | Manager | AIUsageFlow claims, confidence, uncertainty | Review usage claims, request clarification/re-scan if blocked | TechnicalProfile ready | Unknown critical usage purpose | AIUsageFlow reviewed |
| Manager conflict-resolution workspace | Manager | ConflictRecord, WizardProfile, TechnicalProfile, AIUsageFlow, evidence refs | Resolve, update declaration, request re-scan | Conflict exists | Conflict already resolved, stale evidence | `CONFLICT_RESOLVED` |
| VerifiedProfile review | Manager | VerifiedProfile snapshot/version | Approve/review VerifiedProfile | No unresolved conflict | Missing prerequisites | `VERIFIED_PROFILE_READY` |
| Risk classification result | Manager | Classification result, citations, blocking reason | View result, request classification when allowed | VerifiedProfile ready | Citation missing, classification blocked | `CLASSIFICATION_REQUESTED` |
| Gap analysis | Manager | GapAnalysisResult, obligations | View gaps | Classification valid | No valid classification | Gap analysis viewed |
| Document generation and export | Manager | Gap analysis, citations, final report gate | Request generation, download allowed artifact | Final report gate passes | Gate blocked, generation failed | `DOCUMENT_GENERATION_REQUESTED` |
| Audit history | Manager | Audit events, filters | View/export audit trail | Assessment exists | No events, access denied | Audit trail viewed/exported |
| Profile and security settings | Manager, optional Developer | Profile, MFA status, sessions, OAuth identities | Update profile, manage MFA, revoke sessions | Authenticated user | Invalid update | Security setting changed |
| Optional Developer task view | Developer | Assigned delegated scope | Respond to clarification if assigned | Post-MVP or optional delegated task | No assigned task | Developer response submitted |

## Required Inputs and Outputs

| Input | Source | Output |
| --- | --- | --- |
| Session and role state | API | Authorized UI route rendering |
| Assessment/workflow status | API | Stepper, blocking reason, allowed action set |
| Job progress | API polling or SSE endpoint | Scan/classification/document progress UI |
| Evidence refs and result summaries | API | Manager review screens |

## State / Error / Failure Handling

- Render server-provided blocking reason for classification/document gates.
- Disable actions when API state preconditions fail.
- Treat stale workflow version responses as refresh-required UI states.
- Never infer completion from client timers; use API status.
- Show re-scan/correction paths only when API marks evidence insufficient or scan failed.

## Security and Privacy Considerations

- Do not render raw provider tokens, raw source, full prompts, secrets or full AST bodies.
- Do not store OAuth tokens, GitHub tokens or scanner artifacts in browser storage.
- Enforce authorization server-side; client-side controls are only usability hints.
- Show evidence summaries and refs, not raw source.

## Audit Requirements

Frontend-triggered actions must result in API-side audit events for login, MFA, assessment creation, Wizard submission, repository connection, scan request, conflict resolution, classification request, document request and audit export.

## Decision Required

| Decision | Current Handling | Required Before |
| --- | --- | --- |
| SSE versus polling details per progress screen | Support either API-defined polling or SSE; do not assume direct worker access | Implementation |
| Exact OAuth/OIDC provider display names | Provider configured per environment | Release configuration |

