# Sprint Change Proposal: PRD Scope Normalization and MVP/Deferred Decision

**Project:** LCSP - Legal Compliance Support Platform  
**Date:** 2026-06-23  
**Mode:** Batch  
**Trigger:** Implementation readiness assessment found PRD scope contradictions and missing implementation handoff artifacts.

## 1. Issue Summary

### Problem Statement

LCSP has enough architecture and domain specification to continue solutioning, but the active PRD and planning artifacts are not aligned enough for implementation handoff. The main issue is scope ambiguity: some capabilities are described as active PRD functional requirements while other canonical artifacts already mark them as deferred or do not plan them at all.

### Discovery Context

This change was triggered by `bmad-check-implementation-readiness`, which produced `docs/planning-artifacts/implementation-readiness-report-2026-06-23.md` with overall status **NOT READY**.

### Evidence

- `docs/product/prd.md` lists `FR-E3-2 Local/CI evidence upload` and `FR-E3-3 Manual technical evidence JSON upload` as functional requirements.
- The same PRD also lists "Local/CI scanner report upload hoặc manual technical evidence JSON trong MVP main flow" as **Out of Scope for MVP**.
- `docs/specs/functional-requirements.md` resolves this contradiction canonically:
  - `FR-050 Support deferred Local/CI scanner report upload` has `MVP? N`.
  - `FR-051 Support deferred manual evidence JSON upload` has `MVP? N`.
- PRD includes human technical attestation as MVP-adjacent behavior, and canonical requirements keep it active:
  - `FR-045 Track attestation usage` is `Must`, `MVP? Y`.
  - `FR-046 Submit structured technical attestation` is `Should`, `MVP? Y`.
- `docs/implementation-delivery-plan.md` does not include explicit implementation tasks for Developer invitation, policy assignment, attestation, readiness-only export, UX copy, or formal story-level acceptance criteria.
- No canonical UX artifact exists.
- No canonical epics/stories backlog exists; the delivery plan explicitly states it is not backlog, sprint planning, story creation, or task tracking.

## 2. Checklist Execution Notes

| Checklist Item | Status | Finding |
|---|---|---|
| 1.1 Triggering story | [N/A] | No active sprint story caused the issue; readiness review found planning inconsistency before implementation handoff. |
| 1.2 Core problem | [x] | Issue type: misunderstanding/conflict in original requirements plus incomplete downstream planning. |
| 1.3 Supporting evidence | [x] | Evidence found in PRD, canonical FR catalog, delivery plan, architecture, user flows, and readiness report. |
| 2.1 Current epic impact | [!] | No canonical epic exists; delivery waves cannot be validated as epics. |
| 2.2 Epic-level changes | [!] | Need new user-value epics/stories or a canonical backlog artifact. |
| 2.3 Future epic impact | [!] | Delivery waves need mapping to stories and FR coverage. |
| 2.4 Obsolete/new epics | [!] | Deferred evidence upload should not appear in MVP epics; attestation needs explicit MVP story or explicit deferral. |
| 2.5 Epic order/priority | [x] | Preserve technical dependency chain, but generate vertical-slice user epics before sprint planning. |
| 3.1 PRD conflicts | [!] | Local/CI upload and manual JSON upload conflict with out-of-scope section; attestation scope needs tightening. |
| 3.2 Architecture conflicts | [x] | Architecture supports active MVP path: GitHub repository scan, gates, VerifiedProfile, legal matching, classification, documents. No structural architecture change needed. |
| 3.3 UI/UX conflicts | [!] | UX is implied but missing as a canonical artifact. |
| 3.4 Other artifact impact | [!] | Delivery plan, traceability, stories, UX, and implementation tasks require updates. |
| 4.1 Direct adjustment | [ ] Not viable | Editing a few tasks is not enough; PRD and backlog alignment are missing. |
| 4.2 Rollback | [ ] Not viable | No completed sprint work needs rollback. |
| 4.3 PRD MVP review | [x] Viable | Best path: normalize MVP/deferred scope and regenerate backlog/UX handoff. |
| 4.4 Recommended path | [x] | Hybrid: PRD MVP Review plus backlog/UX regeneration. |
| 5.1 Issue summary | [x] | Included in this proposal. |
| 5.2 Impact and artifact needs | [x] | Included below. |
| 5.3 Recommended path | [x] | Included below. |
| 5.4 MVP impact/action plan | [x] | Included below. |
| 5.5 Handoff plan | [x] | Major scope: PM/Architect + UX + backlog/story creation. |
| 6.1 Checklist review | [x] | All applicable sections addressed. |
| 6.2 Proposal accuracy | [x] | Proposal reconciles PRD against canonical FR/NFR and architecture. |
| 6.3 User approval | [!] | Pending user approval. |
| 6.4 Sprint status update | [N/A] | No canonical sprint-status/backlog exists yet to update. |
| 6.5 Handoff confirmation | [!] | Pending user approval. |

## 3. Impact Analysis

### Epic Impact

There is no implementation-ready epic/story artifact. `docs/implementation-delivery-plan.md` is useful engineering sequencing, but it should not be treated as the backlog.

Required epic impact:

- Create a canonical user-value backlog with explicit FR coverage.
- Exclude Local/CI evidence upload and manual evidence JSON from MVP stories.
- Keep GitHub App read-only repository scan as the active MVP evidence path.
- Keep Developer invitation/policy assignment active because canonical requirements mark it MVP and user task flows depend on it.
- Keep structured attestation active only as a constrained supplemental MVP capability, not as evidence-gate bypass or classification unlock by itself.

### Story Impact

Current and future stories must be created or revised to cover:

- Manager creates assessment and completes WizardProfile.
- Manager sees readiness without risk level.
- Manager connects GitHub repository and runs scan.
- Evidence schema/privacy/quality gates produce actionable blocked states.
- TechnicalProfile and AIUsageFlow preserve uncertainty and evidence refs.
- Reconciliation routes all MVP conflicts to Manager.
- Developer invitation and scoped policy/task acceptance.
- Structured technical attestation as supplemental input only.
- Legal corpus approval, hybrid retrieval, citation guardrails, classification, gap analysis, final report, readiness-only export, audit export.

### Artifact Conflicts

#### PRD

Needs scope normalization:

- Local/CI evidence upload and manual JSON upload must move from active MVP FRs to Deferred/Future.
- Accepted evidence source language must distinguish active MVP vs future/deferred paths.
- Attestation must be clarified as MVP supplemental input only, with no independent classification unlock.
- Open questions and high-risk assumptions should remain, but each needs owner, validation method, and acceptance threshold before sprint planning.

#### Architecture

No major architecture reversal is required. Architecture already supports:

- GitHub App repository scan as active MVP evidence path.
- Gate-driven workflow.
- VerifiedProfile prerequisite.
- Citation/legal matching guardrails.
- Audit and privacy invariants.

Architecture update needed:

- Add or clarify "Deferred Evidence API" as future-only, not active MVP.
- Add explicit attestation storage/review boundary if attestation remains MVP.
- Add UI/UX ownership note for readiness-only export and blocked/degraded states.

#### UX

Canonical UX spec is missing and must be created. It must cover:

- Wizard wording and progressive disclosure.
- Readiness-only state and export.
- Evidence rejected/insufficient states.
- Findings review without raw code exposure.
- Manager conflict resolution.
- Developer scoped task workspace.
- Attestation submission/review/disclosure.
- Classification blocked/degraded/final states.
- Document generation and audit export.

#### Delivery Plan

`docs/implementation-delivery-plan.md` should be retained as engineering sequencing, but updated to include:

- Explicit story/backlog dependency on canonical epics.
- Tasks for Developer invitation/policy assignment.
- Tasks for evidence schema and quality gate.
- Tasks for readiness-only export.
- Tasks for attestation submission/review/audit/disclosure if kept in MVP.
- Correct NFR reference from `NFR-001..NFR-030` to the canonical NFR catalog, currently including `NFR-001..NFR-035` with gaps.

## 4. Recommended Approach

### Selected Path

**Hybrid: PRD MVP Review + Backlog Regeneration**

This is a **Major** change because it affects PRD scope, backlog readiness, UX handoff, and sprint planning prerequisites.

### Rationale

Direct adjustment is not enough because the project lacks a canonical epics/stories artifact. Rollback is not relevant because this is a planning readiness issue, not a failed implementation. The correct move is to normalize PRD scope first, then regenerate UX and stories from a clean MVP boundary.

### MVP Scope Decision

| Capability | Decision | Rationale |
|---|---|---|
| Manager-led assessment flow | MVP | Core product flow. |
| OAuth/OIDC login | MVP | Active PRD and architecture requirement. |
| Web Wizard | MVP | Required for WizardProfile and Manager business/legal truth. |
| GitHub App read-only repository scan | MVP | Active evidence path; architecture invariant. |
| Local/CI scanner report upload | Deferred | Canonical `FR-050`, `MVP? N`; PRD out-of-scope already says not MVP main flow. |
| Manual technical evidence JSON upload | Deferred | Canonical `FR-051`, `MVP? N`; PRD out-of-scope already says not MVP main flow. |
| API probe evidence | Deferred / Future unless already implemented as fixture support | PRD says "if available"; not in delivery plan as active MVP. |
| Structured human technical attestation | MVP constrained / Should | Keep only as supplemental, structured, audited Developer input. It cannot replace machine metadata, cannot bypass evidence gates, and cannot unlock classification alone. |
| Developer invitation and scoped task/policy | MVP | Canonical `FR-010`, `FR-011`, `FR-047` are MVP and user flows include Developer task acceptance. |
| Developer final conflict resolution | Deferred / Not MVP | Manager remains final resolver. |
| Evidence schema and privacy gate | MVP | Required before reconciliation. |
| Evidence quality/context-aware threshold | MVP | Required by PRD and canonical `FR-021`. |
| Legal corpus ingestion/approval/versioning | MVP | Required for citation-backed classification. |
| Real LLM gateway | MVP | Required for happy-path classification/document generation. |
| Readiness-only export | MVP Should | Canonical `FR-040`, `MVP? Y`; must not include risk level. |
| Final compliance report | MVP | Only after classification/gap/legal/conflict gates pass. |
| Enterprise SSO/SAML/SCIM | Deferred | Already out of scope. |
| Public auditor/regulator portal | Deferred | Already out of scope. |

### Effort and Risk

- Effort: **High** for planning correction, **Medium** for documentation edits, **High** if attestation remains MVP and must be story-complete.
- Risk: **High** if implementation begins before scope/backlog/UX correction; **Medium** after correction.
- Timeline impact: sprint planning should pause until PRD scope, UX spec, and epics/stories are corrected.

## 5. Detailed Change Proposals

### PRD Change 1: Normalize Technical Evidence Scope

**Artifact:** `docs/product/prd.md`  
**Section:** `6. MVP Scope`, `7. Functional Requirements`, `11. Evidence Requirements`

**OLD:**

```markdown
#### FR-E3-2: Local/CI evidence upload

Developer with `UPLOAD_EVIDENCE` can upload Local/CI scanner report.
```

```markdown
#### FR-E3-3: Manual technical evidence JSON upload

Developer with `UPLOAD_EVIDENCE` can upload manual technical evidence JSON when scanner runs outside LCSP or dynamic/wrapper logic is not detected automatically.
```

**NEW:**

```markdown
#### FR-E3-2: Deferred Local/CI evidence upload

Local/CI scanner report upload is Deferred/Future and is not part of the active MVP main flow. The MVP preserves the future requirement as a planned evidence path, but it does not expose upload UI/API or allow uploaded reports to unlock MVP classification.

**Consequences:**
- Active MVP evidence collection uses GitHub App read-only Repository Scan.
- Future Local/CI reports must pass the same schema completeness, privacy, provenance and quality gates before reconciliation.
- No MVP story should implement Local/CI report upload unless this PRD decision is explicitly reopened.
```

```markdown
#### FR-E3-3: Deferred manual technical evidence JSON upload

Manual technical evidence JSON upload is Deferred/Future and is not part of the active MVP main flow. Manual evidence remains a future controlled path for scanner-limited environments, but it cannot be used in the MVP to unlock classification.

**Consequences:**
- MVP must not provide free-text or manual JSON evidence upload as a classification path.
- Future manual evidence must be structured, provenance-bound and gate-checked.
- Free-text comments never unlock classification.
```

**Rationale:** Aligns PRD with canonical `FR-050` and `FR-051` where both are deferred and `MVP? N`.

### PRD Change 2: Clarify Active MVP Evidence Sources

**Artifact:** `docs/product/prd.md`  
**Section:** `11. Evidence Requirements`

**OLD:**

```markdown
Accepted evidence sources for MVP/near-MVP:

- GitHub App read-only scan.
- Local/CI scanner report.
- Manual technical evidence JSON.
- API probe result, if available.
- Structured human technical attestation as supplement.
```

**NEW:**

```markdown
Accepted evidence sources:

**Active MVP evidence path**
- GitHub App read-only Repository Scan.
- Structured human technical attestation as supplemental input only, when delegated and audited. Attestation cannot replace machine-generated metadata, cannot bypass evidence gates and cannot unlock classification by itself.

**Deferred/Future evidence paths**
- Local/CI scanner report upload.
- Manual technical evidence JSON upload.
- API probe result, unless explicitly activated by a later scope decision.
```

**Rationale:** Removes ambiguity between MVP and future evidence paths.

### PRD Change 3: Tighten Attestation Scope

**Artifact:** `docs/product/prd.md`  
**Section:** `7. Functional Requirements`, `11. Evidence Requirements`, `15. A3`

**OLD:**

```markdown
Developer can provide structured human technical attestation only as controlled evidence supplement.
```

**NEW:**

```markdown
Developer can provide structured human technical attestation only as controlled supplemental input for Manager review and audit.

**MVP constraints:**
- Attestation is allowed only for delegated Developer tasks.
- Attestation cannot replace scanner/report metadata, report hash, scanner version, scan timestamp, repo/commit metadata, privacy flags, dependency inventory/SBOM, legal corpus version or evidence integrity.
- Attestation cannot unlock classification by itself.
- If attestation contributes to a Manager conflict resolution or classification-relevant interpretation, final reports and audit trail must disclose it.
- Unsupported/free-text attestation is rejected.
```

**Rationale:** Keeps canonical `FR-045` and `FR-046` active while preventing scanner bypass.

### PRD Change 4: Update MVP Scope Lists

**Artifact:** `docs/product/prd.md`  
**Section:** `6. MVP Scope`

**OLD In Scope snippets:**

```markdown
- Developer invitation và task/policy assignment as optional collaboration.
- Developer Workspace cho optional technical evidence/clarification tasks.
```

**NEW In Scope snippets:**

```markdown
- Developer invitation and scoped task/policy assignment for optional collaboration.
- Developer Workspace for delegated repository, findings review and structured attestation tasks.
- Structured technical attestation as supplemental, audited input only; not a substitute for machine metadata and not an independent classification unlock path.
```

**OLD Out of Scope snippet:**

```markdown
- Local/CI scanner report upload hoặc manual technical evidence JSON trong MVP main flow.
```

**NEW Out of Scope snippet:**

```markdown
- Local/CI scanner report upload and manual technical evidence JSON upload as active MVP evidence paths.
- API probe evidence as an active MVP evidence path unless separately approved.
- Developer-finalized conflict resolution or Developer-controlled classification/report generation.
```

**Rationale:** Makes MVP/deferred boundary explicit.

### PRD Change 5: Update Open Questions

**Artifact:** `docs/product/prd.md`  
**Section:** `16. Open Questions`

**OLD:**

```markdown
### Evidence and Scanner

- GitHub App read-only acceptance by target MVP users needs validation.
- Scope coverage for monorepos needs definition.
- Stale evidence behavior when commit/branch changes needs decision.
- API probe evidence trust model needs decision.

### Attestation

- Exact list of Developer-attestable claims needs confirmation.
- Confidence impact of attestation needs decision.
- Policy for excessive attestation use needs decision.
```

**NEW:**

```markdown
### Evidence and Scanner

- GitHub App read-only acceptance by target MVP users needs validation.
- Scope coverage for monorepos needs definition.
- Stale evidence behavior when commit/branch changes needs decision.
- Local/CI report upload, manual evidence JSON and API probe evidence are Deferred/Future unless reopened by change control.

### Attestation

- MVP attestation is constrained to delegated, structured, supplemental Developer input.
- Exact list of Developer-attestable claims needs confirmation before story creation.
- Confidence impact of attestation must not allow attestation to bypass evidence gates.
- Policy for excessive attestation use needs decision.
```

**Rationale:** Converts evidence-path ambiguity into explicit future scope.

### Architecture Change 1: Add Deferred Evidence Boundary

**Artifact:** `docs/architecture/architecture.md`  
**Section:** `Mandatory Architectural Invariants`

**OLD:**

```markdown
- Repository Scan is the active MVP technical evidence path.
```

**NEW:**

```markdown
- Repository Scan through GitHub App read-only access is the active MVP technical evidence path.
- Local/CI report upload, manual technical evidence JSON and API probe evidence are Deferred/Future evidence paths unless activated by a later change proposal.
- Structured human technical attestation may exist in MVP only as supplemental audited input; it cannot replace machine metadata or unlock classification by itself.
```

**Rationale:** Architecture already implies this, but explicit wording prevents downstream implementation drift.

### Delivery Plan Change 1: Add Missing Planning Prerequisites

**Artifact:** `docs/implementation-delivery-plan.md`  
**Section:** `Purpose` or new `Planning Prerequisites`

**OLD:**

```markdown
It is not backlog, sprint planning, story creation, task tracking, architecture creation or implementation specification.
```

**NEW:**

```markdown
It is not backlog, sprint planning, story creation, task tracking, architecture creation or implementation specification.

Before sprint planning, this delivery sequence must be paired with:

- canonical user-value epics and stories;
- FR-to-story coverage matrix;
- story-level BDD acceptance criteria;
- UX specification or UX acceptance criteria for user-facing flows;
- explicit MVP/deferred scope decisions from the PRD.
```

**Rationale:** Prevents delivery plan from being misused as implementation-ready backlog.

### Delivery Plan Change 2: Add Missing MVP Tasks

**Artifact:** `docs/implementation-delivery-plan.md`  
**Section:** `First 30 Engineering Tasks`

**NEW tasks to add before acceptance run:**

```markdown
| TASK-035 Implement Developer invitation and scoped task policy APIs | Support MVP optional Developer collaboration. | TASK-008, TASK-011 | Assessment Team | Developer invite, policy assignment/revocation and audit. |
| TASK-036 Implement evidence schema/privacy/quality gate | Enforce rejected/insufficient/ready evidence statuses before TechnicalProfile. | TASK-020 | Scanner + Intelligence Team | Gate service with actionable failure reasons. |
| TASK-037 Implement structured attestation supplement | Allow delegated Developer to submit structured attestation as supplemental input only. | TASK-035, TASK-020 | Intelligence Team | Attestation record, validation, audit and Manager-visible review. |
| TASK-038 Implement readiness-only export | Generate no-risk readiness output before evidence is complete. | TASK-013, TASK-032 shell | Reporting Team | Readiness export without HIGH/MEDIUM/LOW. |
| TASK-039 Implement attestation disclosure in report/audit | Disclose classification-relevant attestation usage. | TASK-037, TASK-032 | Reporting Team | Report disclosure and audit trail coverage. |
```

**Rationale:** Covers active MVP gaps found by readiness assessment.

### UX Change 1: Create Canonical UX Spec

**Artifact:** New UX artifact under planning artifacts or design artifacts.

**NEW required sections:**

```markdown
# LCSP MVP UX Specification

## Manager Wizard
- Business/legal language question set.
- Progressive disclosure.
- "I don't know" behavior for critical fields.

## Readiness Without Risk
- Readiness state screen.
- Missing evidence checklist.
- Readiness-only export behavior.
- Prohibited language: HIGH/MEDIUM/LOW, preliminary risk level.

## Repository Evidence Flow
- Connect repository.
- Select branch/commit.
- Scan progress.
- Evidence rejected/insufficient/ready states.

## Findings Review
- Redacted findings only.
- Evidence refs and coverage limitations.

## Conflict Resolution
- Compared values.
- Evidence refs.
- Manager rationale capture.
- Rescan/correction path.

## Developer Workspace
- Accept scoped task.
- Review redacted findings.
- Submit structured attestation.
- Revoked/expired task behavior.

## Classification and Report
- Blocked/degraded/final status.
- Legal citation visibility.
- Attestation disclosure.
- Final report/download.
- Audit export.

## Accessibility
- Keyboard navigation.
- Form labels.
- Error summaries.
- Status announcements.
- Document review accessibility.
```

**Rationale:** UX is implied but absent; implementation handoff needs screen/state behavior.

### Backlog Change 1: Generate Canonical User-Value Epics

**Artifact:** New epics/stories artifact.

**Proposed MVP epics:**

```markdown
Epic 1: Manager Starts a Governed Assessment
Outcome: Manager can authenticate, create an organization/assessment, and complete WizardProfile with no-risk readiness state.

Epic 2: Manager Collects Repository Evidence
Outcome: Manager can connect a read-only GitHub repository, select snapshot, run scan and see evidence status.

Epic 3: Manager Understands Evidence and Resolves Conflicts
Outcome: Manager can review redacted findings, AIUsageFlow uncertainty and resolve conflicts before VerifiedProfile.

Epic 4: Developer Completes Scoped Technical Tasks
Outcome: Invited Developer can accept scoped task, review assigned findings and submit structured attestation without gaining Manager authority.

Epic 5: LCSP Produces Evidence-Based Legal Matching and Classification
Outcome: System retrieves citation-backed legal rules, blocks/degrades unsupported cases and produces valid classification only after gates.

Epic 6: Manager Generates Outputs and Audit Trail
Outcome: Manager can generate readiness-only export, final compliance report and audit export under output guardrails.
```

**Rationale:** Converts technical waves into user-value epics while preserving delivery sequence.

## 6. Implementation Handoff

### Scope Classification

**Major**

Reason: The change touches PRD scope, UX, backlog/story creation, delivery planning and sprint readiness. It does not require architecture reversal, but it requires a planning reset before sprint execution.

### Handoff Recipients

| Recipient | Responsibility |
|---|---|
| Product Manager / PM agent | Approve MVP/deferred scope decisions and update PRD. |
| UX agent / UX owner | Create canonical MVP UX spec for screens, flows and states. |
| Product Owner / Story agent | Generate canonical epics/stories with FR traceability and BDD acceptance criteria. |
| Solution Architect | Confirm architecture invariants after PRD scope normalization, especially deferred evidence paths and attestation boundary. |
| Developer agent | Wait for approved stories before implementation; use delivery plan as sequencing support only. |

### Success Criteria

- PRD no longer contains active MVP FRs that contradict its out-of-scope section.
- Local/CI evidence upload and manual JSON upload are consistently marked Deferred/Future.
- Attestation is either explicitly constrained as MVP supplemental input or explicitly deferred. This proposal recommends constrained MVP.
- Canonical UX spec exists for Manager/Developer workflows and blocked/degraded states.
- Canonical epics/stories exist and cover all MVP FRs with BDD acceptance criteria.
- Delivery plan is updated to reference backlog prerequisites and missing MVP tasks.
- Implementation readiness can be rerun with no critical PRD scope contradictions.

## 7. Recommended Next Workflow Steps

1. Approve or edit this Sprint Change Proposal.
2. Apply PRD scope updates.
3. Run `bmad-ux` to create the canonical UX spec.
4. Run `bmad-create-epics-and-stories` to generate user-value epics/stories.
5. Rerun `bmad-check-implementation-readiness`.
6. Only then proceed to `bmad-sprint-planning`.

## 8. Approval

**Status:** Pending user review.  
**Approval options:** Continue / Edit / Revise / Reject.
