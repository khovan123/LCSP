# Post-Readiness Planning Remediation Proposal: Canonical FR/NFR Scope Alignment

**Project:** LCSP - Legal Compliance Support Platform  
**Date:** 2026-06-23  
**Mode:** Batch, revised after Project Owner feedback  
**Approval authority requested:** Project Owner approval for documentation and planning remediation only  
**Not authorized by approval:** implementation, sprint execution, sprint-status mutation, or technical task execution

## 1. Issue Summary

The previous draft proposal direction is accepted, but it must be rebased on the canonical requirements model before Project Owner approval.

The active source of truth is no longer the 37 PRD `FR-E*` aliases. The scope decision must use:

- `docs/specs/functional-requirements.md` with canonical `FR-001..FR-056`
- `docs/specs/non-functional-requirements.md` with active `NFR-001..NFR-030` and `NFR-033..NFR-035`
- `docs/specs/requirements-traceability-matrix.md`
- `docs/product/prd.md`
- `docs/architecture/architecture.md`
- `docs/implementation-delivery-plan.md`
- `docs/planning-artifacts/implementation-readiness-report-2026-06-23.md`

This proposal is intentionally renamed from the generic `sprint-change-proposal-2026-06-23.md` form so it cannot be confused with the already-approved Phase 5.2J scope-pivot proposal.

## 2. Revised Scope Baseline

### Canonical FR Inventory

| FR Range | Status | Decision |
|---|---|---|
| `FR-001..FR-049` | Active MVP | Use for UX, epics/stories, and readiness coverage. |
| `FR-050` | Deferred, `MVP? N` | Local/CI scanner report upload remains future scope. |
| `FR-051` | Deferred, `MVP? N` | Manual evidence JSON upload remains future scope. |
| `FR-052` | Deferred, `MVP? N` | Delegated technical clarification remains future scope; Manager remains final resolver. |
| `FR-053..FR-056` | Active MVP | Legal ingestion, corpus approval, LLM configuration, and hybrid search stay in MVP. |

Canonical active MVP FR count: **53** (`FR-001..FR-049`, `FR-053..FR-056`).  
Canonical deferred FR count: **3** (`FR-050..FR-052`).

### Canonical NFR Inventory

Active catalog currently contains:

- `NFR-001..NFR-030`
- `NFR-033..NFR-035`

Active NFR count: **33**.

Traceability drift to resolve:

- `NFR-031` is not an active NFR row; legacy mapping says it is platform baseline covered by `NFR-005`.
- `NFR-032` is not an active NFR row; legacy mapping says it is covered by active `NFR-008`.

Required remediation:

- Update `docs/specs/requirements-traceability-matrix.md` so active NFR coverage does not present `NFR-031` or `NFR-032` as active catalog items.
- Replace `NFR-031` references with `NFR-005` where the meaning is OAuth identity linking safety.
- Replace `NFR-032` references with `NFR-008` where the meaning is Manager super-role enforcement.
- Keep legacy mapping in `docs/specs/non-functional-requirements.md` for historical traceability, but do not treat `NFR-031` or `NFR-032` as active NFRs.

## 3. Revised MVP / Deferred Decisions

| Capability | Canonical FR/NFR Basis | Revised Decision |
|---|---|---|
| Account, login, OAuth/OIDC, organization, RBAC | `FR-001..FR-012`, `NFR-001..NFR-011` | MVP |
| Manager assessment and WizardProfile | `FR-013..FR-015`, `NFR-022`, `NFR-027`, `NFR-028` | MVP |
| GitHub read-only repository evidence path | `FR-016..FR-020`, `NFR-006`, `NFR-007`, `NFR-012..NFR-016`, `NFR-035` | MVP golden path |
| Evidence quality and TechnicalProfile | `FR-020..FR-022`, `NFR-016`, `NFR-018`, `NFR-026` | MVP |
| AIUsageFlow and uncertainty handling | `FR-023..FR-025`, `NFR-018`, `NFR-019`, `NFR-029` | MVP |
| Reconciliation and Manager conflict resolution | `FR-026..FR-031`, `NFR-008`, `NFR-010`, `NFR-018` | MVP |
| Legal matching, legal corpus, hybrid retrieval | `FR-032..FR-034`, `FR-053`, `FR-054`, `FR-056`, `NFR-017`, `NFR-034` | MVP |
| Risk classification and real LLM/embedding configuration | `FR-035..FR-037`, `FR-055`, `NFR-017..NFR-020`, `NFR-033` | MVP |
| Gap analysis, final report, readiness-only export, document status | `FR-038..FR-041`, `NFR-020`, `NFR-022` | MVP |
| Audit and artifact versioning | `FR-042..FR-044`, `NFR-010`, `NFR-011`, `NFR-030` | MVP |
| Structured attestation usage/submission | `FR-045`, `FR-046` | Optional MVP scope, not golden path |
| Developer task acceptance and findings review | `FR-047`, `FR-048`, `NFR-009`, `NFR-014` | MVP if Developer collaboration remains active |
| Re-run repository scan | `FR-049`, `NFR-030` | MVP |
| Local/CI scanner report upload | `FR-050` | Deferred |
| Manual evidence JSON upload | `FR-051` | Deferred |
| Delegated technical clarification path | `FR-052` | Deferred |

## 4. Structured Attestation Decision

Structured attestation is **optional MVP scope**, not the golden path.

Required wording for downstream PRD, UX, and story artifacts:

- The golden path must succeed without structured attestation.
- Attestation is supplemental input only.
- Attestation can be used only when a scoped Developer task exists.
- Attestation cannot replace scanner/report metadata, report hash, scanner version, scan timestamp, repo/commit metadata, privacy flags, dependency inventory/SBOM, legal corpus version, or evidence integrity.
- Attestation cannot independently unlock classification.
- Attestation cannot finalize conflict resolution; Manager remains final resolver.
- If attestation affects Manager resolution, report interpretation, or audit, it must be disclosed through `FR-045`.

Planning consequence:

- `FR-045` must be represented in stories if `FR-046` is represented.
- If optional attestation is too costly for MVP, create a separate Project Owner decision to defer both implementation story coverage and report disclosure behavior consistently.

## 5. Required Story Dependencies Before Technical Delivery Tasks

No additional technical delivery tasks should be added before UX and canonical user-value epics/stories exist.

The next planning sequence is:

1. Create or update canonical UX specification.
2. Create canonical user-value epics and stories.
3. Add FR-to-story coverage for all active MVP FRs.
4. Add acceptance criteria and dependencies.
5. Only then update technical delivery tasks to support the approved stories.

## 6. Explicit Dependencies Required in UX and Stories

The canonical UX spec and epics/stories must include these dependencies before implementation planning proceeds:

| Dependency | Applies To | Required Story Treatment |
|---|---|---|
| Embedding model selection | `FR-032`, `FR-056`, `FR-055`, `NFR-033` | Story must specify provider/config boundary and test fixture strategy. |
| Embedding vector dimension | `FR-056` | Story must define fixed dimension, migration/index implication, and mismatch failure behavior. |
| Vietnamese full-text search | `FR-032`, `FR-056` | Story must specify Vietnamese tokenizer/dictionary approach or explicit MVP fallback with quality risk. |
| Retrieval-query privacy | `FR-032..FR-036`, `NFR-012`, `NFR-015`, `NFR-017` | Story must ensure no raw source, secrets, full prompts, or unnecessary sensitive details enter retrieval/LLM payloads. |
| Real LLM credentials | `FR-055`, `NFR-033` | Story must define secret configuration, environment separation, and missing-credential blocked state. |
| LLM token/cost budget | `FR-055`, `NFR-033` | Story must define budget caps, token logging, timeout behavior, and fail-closed behavior. |
| Legal-source validation | `FR-053`, `FR-054`, `NFR-034` | Story must validate official source allowlist, snapshot hash, approval gate, corpus version immutability, and rejected-source behavior. |

These dependencies must appear before stories for classification, legal matching, gap analysis, or final report are marked implementation-ready.

## 7. Artifact Change Proposals

### PRD Changes

Update `docs/product/prd.md` to align with canonical requirements:

- Replace active `FR-E*` planning references with canonical `FR-001..FR-056` cross-references or state that `FR-E*` headings are legacy PRD aliases only.
- Mark Local/CI scanner report upload as Deferred using canonical `FR-050`.
- Mark manual technical evidence JSON upload as Deferred using canonical `FR-051`.
- Mark delegated technical clarification path as Deferred using canonical `FR-052`.
- Clarify that GitHub App read-only Repository Scan is the MVP golden evidence path.
- Clarify structured attestation as optional MVP supplemental input only, not golden path and not independent classification unlock.
- Keep Developer invitation/policy/task scope only where it maps to active canonical FRs (`FR-010`, `FR-011`, `FR-047`, `FR-048`).

### NFR / Traceability Changes

Update `docs/specs/requirements-traceability-matrix.md`:

- Treat active NFR coverage as `NFR-001..NFR-030`, `NFR-033..NFR-035`.
- Remove or remap active coverage rows for `NFR-031` and `NFR-032`.
- Remap `NFR-031` semantics to active `NFR-005`.
- Remap `NFR-032` semantics to active `NFR-008`.
- Keep the final traceability decision conditional until this drift is fixed.

Update `docs/specs/non-functional-requirements.md` only if needed:

- Add a note after the catalog that `NFR-031` and `NFR-032` are legacy identifiers only, not active catalog rows.

### Architecture Changes

Update `docs/architecture/architecture.md`:

- State explicitly that GitHub read-only Repository Scan is the MVP golden evidence path.
- State that `FR-050..FR-052` are deferred and must not be implemented through MVP architecture unless reopened.
- Add attestation boundary as optional supplemental input, not a classifier unlock or metadata replacement.
- Add LLM/embedding configuration dependency: credentials, budget, embedding dimension, provider configuration, privacy boundary.
- Add legal-source validation dependency: official source allowlist, snapshot hashing, approval gate, immutable corpus versions.

### UX Changes

Create canonical UX spec before story generation.

Required UX scope:

- Manager Wizard and "I don't know" behavior.
- Readiness without risk level.
- GitHub evidence flow.
- Evidence rejected/insufficient/ready states.
- Redacted findings review.
- Conflict resolution.
- Optional Developer workspace.
- Optional attestation submission/review/disclosure.
- Classification blocked/degraded/final states.
- Readiness-only export.
- Final report and audit export.
- Accessibility for forms, status messages, and document review.

### Epics / Stories Changes

Create canonical user-value epics/stories before adding technical delivery tasks.

Proposed epic set:

1. Manager Starts a Governed Assessment
2. Manager Collects Repository Evidence
3. Manager Understands Evidence and Resolves Conflicts
4. Developer Completes Scoped Optional Technical Tasks
5. LCSP Matches Legal Rules and Produces Evidence-Based Classification
6. Manager Generates Outputs and Audit Trail

Each story must include:

- Canonical FR IDs.
- NFR IDs.
- Given/When/Then acceptance criteria.
- Explicit deferred exclusions for `FR-050..FR-052` where relevant.
- UX states.
- Legal/LLM/retrieval dependencies where relevant.

### Delivery Plan Changes

Do not add further technical tasks yet.

After UX and canonical stories are approved, update `docs/implementation-delivery-plan.md` to:

- Reference the canonical backlog as the implementation authority.
- Preserve engineering sequencing as support only.
- Add task coverage only for approved stories.
- Correct NFR references to active `NFR-001..NFR-030`, `NFR-033..NFR-035`.

## 8. Recommended Path Forward

Selected path: **Documentation and planning remediation before implementation**.

Scope classification: **Major planning remediation**.

This is not an implementation approval. This is a controlled correction of planning artifacts so a later implementation-readiness run can produce a reliable decision.

Recommended sequence:

1. Project Owner approves this revised remediation proposal.
2. PM updates PRD scope against canonical `FR-001..FR-056`.
3. Analyst/PM fixes NFR traceability drift for `NFR-031` and `NFR-032`.
4. UX owner creates canonical UX spec.
5. Story owner creates canonical user-value epics/stories.
6. Architect confirms legal retrieval, LLM/embedding, privacy, and legal-source validation dependencies.
7. Only after those are approved, update technical delivery plan.
8. Re-run implementation readiness.
9. Proceed to sprint planning only after readiness passes.

## 9. Approval Boundary

Approving this proposal authorizes:

- PRD documentation remediation.
- NFR and traceability documentation remediation.
- UX specification creation.
- Canonical epics/stories creation.
- Architecture clarification for planning dependencies.
- Delivery-plan wording updates that point to the approved backlog and active NFR inventory.

Approving this proposal does **not** authorize:

- Code implementation.
- Technical task execution.
- Sprint execution.
- Sprint-status updates.
- Reopening `FR-050..FR-052` into MVP.
- Treating optional attestation as a golden-path dependency.

## 10. Final Project Owner Approval Request

**Status:** Revised for final Project Owner review.  
**Requested decision:** approve / revise / reject.  
**Recommended decision:** approve documentation and planning remediation only.
