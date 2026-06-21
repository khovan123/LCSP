# Requirements Baseline Audit Report

## Scope

Audit mode: `AUDIT_ONLY`.

This report inventories requirements material that already exists in active documentation and identifies whether the baseline is complete enough to treat as a stable requirements source. It does not create new requirements, PRD content, architecture, stories, backlog items, or validation plans.

Active documentation reviewed:

- `docs/README.md`
- `docs/documentation-governance.md`
- `docs/product/prd.md`
- `docs/product/business-rules.md`
- `docs/specs/`
- `docs/architecture/`
- `docs/developer-execution-blueprints/`
- `docs/implementation/`
- `docs/code-map/`

Historical / non-active documentation checked only to determine whether missing baseline material had been archived:

- `docs/archive/redundant-artifacts/delete-candidates/design/use-case-specification.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/traceability-matrix.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/functional-requirements.md`
- `docs/archive/redundant-artifacts/delete-candidates/design/non-functional-requirements.md`
- `docs/archive/redundant-artifacts/delete-candidates/qa/acceptance-criteria.md`

## Baseline Classification Summary

| Baseline Item | Classification | Active Evidence | Audit Finding |
|---|---|---|---|
| Use Cases | `PRESENT_BUT_FRAGMENTED` | `docs/product/business-rules.md` references 63 unique `UC-MXX-XX` IDs; PRD has user journeys and flows. | Use case IDs and names are referenced, but the full use-case inventory is not active; it is archived under delete-candidates. |
| Actors | `PRESENT_AND_TRACEABLE` | `docs/product/prd.md` defines Manager, Developer, and non-users; backend implementation and code-map preserve Manager/Developer authorization boundaries. | Actor baseline is active and traceable to role, permission, and workflow constraints. |
| Business Processes | `PRESENT_BUT_FRAGMENTED` | PRD user journeys, specs lifecycle docs, developer-execution blueprints, and implementation docs describe process flow. | Processes exist, but no single active business-process inventory owns the complete list. |
| Functional Requirements | `CONTRADICTORY` | PRD defines 37 `FR-E...` requirements; active business rules reference 78 unique `FR-###` IDs. | Active docs use two incompatible FR ID schemes. The numeric FR catalog exists in archived delete-candidates, not in the active baseline. |
| Business Rules | `PRESENT_BUT_FRAGMENTED` | `docs/product/business-rules.md` defines 94 `BR-###` rules with related UC/FR/NFR/state/audit columns. | Rule inventory is strong, but outgoing FR/NFR trace links point to non-active numeric requirement schemes. |
| Non Functional Requirements | `CONTRADICTORY` | PRD defines 14 product-level `NFR-1..NFR-14`; active business rules reference `NFR-###` IDs from the archived NFR catalog. | Active docs use incompatible NFR ID schemes. |
| Acceptance Criteria | `PRESENT_BUT_FRAGMENTED` | PRD defines 16 `AC-#` criteria; implementation docs include component-level acceptance criteria. | Acceptance criteria exist, but there is no active acceptance matrix mapping AC to UC/FR/BR/NFR. |
| Traceability | `CONTRADICTORY` | Business rules include trace columns; scanner spec has local traceability; ADRs include trace references. | Full active traceability is broken by archived UC/FR/NFR sources and mismatched ID schemes. |

## Use Case Inventory

Classification: `PRESENT_BUT_FRAGMENTED`

Active findings:

- `docs/product/prd.md` defines end-to-end user journeys:
  - `UJ-1`: Manager starts an evidence-based assessment.
  - `UJ-2`: Developer supplies technical evidence as an assigned task.
  - `UJ-3`: Manager resolves a conflict.
  - `UJ-4`: Manager generates final compliance report after classification is unlocked.
  - `UJ-5`: Manager exports readiness-only output when evidence is unavailable.
- `docs/product/business-rules.md` references 63 unique use-case IDs in the `UC-MXX-XX` pattern.
- Business-rule references include modules for authentication, role/permission, wizard, evidence collection, evidence gates, reconciliation, legal matching, document generation, audit, and security/privacy.

Non-active findings:

- The complete use-case specification exists only in `docs/archive/redundant-artifacts/delete-candidates/design/use-case-specification.md`.
- The complete use-case-to-FR matrix exists only in `docs/archive/redundant-artifacts/delete-candidates/design/traceability-matrix.md`.

Audit conclusion:

Use cases exist as references and journey narratives, but there is no active authoritative use-case inventory. The active baseline cannot guarantee that all referenced `UC-MXX-XX` IDs still map to active product scope.

## Actor Inventory

Classification: `PRESENT_AND_TRACEABLE`

Active findings:

- `docs/product/prd.md` defines:
  - Manager as the required and sufficient MVP actor for assessment completion.
  - Developer as optional, invitation-based support for technical evidence.
  - Non-users / out-of-scope actors for MVP.
- `docs/product/prd.md` defines Manager permissions and Developer policies/restrictions.
- `docs/implementation/backend-implementation.md` includes the MVP role matrix and route-level implementation boundaries.
- `docs/code-map/api-code-map.md` and active implementation docs preserve Manager-only and Developer-limited module ownership.

Audit conclusion:

Actor definitions are active, stable, and traceable to authorization behavior.

## Business Process Inventory

Classification: `PRESENT_BUT_FRAGMENTED`

Active process coverage:

| Process Area | Active Source |
|---|---|
| Assessment setup and role management | `docs/product/prd.md`, `docs/implementation/backend-implementation.md` |
| Wizard and self-declared readiness | `docs/product/prd.md`, `docs/specs/assessment-lifecycle-spec.md` |
| Repository scan / technical evidence | `docs/specs/scanner-spec.md`, `docs/developer-execution-blueprints/scanner-data-journey.md`, `docs/implementation/scanner-implementation.md` |
| TechnicalProfile and AIUsageFlow | `docs/specs/assessment-lifecycle-spec.md`, `docs/developer-execution-blueprints/ai-usage-flow-blueprint.md` |
| Reconciliation and VerifiedProfile | `docs/specs/assessment-lifecycle-spec.md`, `docs/developer-execution-blueprints/reconciliation-blueprint.md` |
| Legal matching and classification | `docs/specs/legal-classification-spec.md`, `docs/developer-execution-blueprints/classification-blueprint.md` |
| Document generation | `docs/specs/document-generation-spec.md`, implementation docs |
| Audit, queue, persistence, and local runtime | `docs/implementation/backend-implementation.md`, `docs/implementation/queue-implementation.md`, `docs/implementation/persistence-implementation.md` |

Audit conclusion:

The business processes are present through runtime and implementation documents, but the active documentation does not have a single business-process inventory that identifies every process and its owning requirement IDs.

## FR Inventory

Classification: `CONTRADICTORY`

Active PRD inventory:

- `docs/product/prd.md` defines 37 functional requirements using the `FR-E<epic>-<number>` scheme.
- Active FR groups:
  - Epic 1: Assessment Setup & Role Management, `FR-E1-1` to `FR-E1-4`.
  - Epic 2: Web Wizard & Self-Declared Readiness, `FR-E2-1` to `FR-E2-4`.
  - Epic 3: Technical Evidence Collection, `FR-E3-1` to `FR-E3-5`.
  - Epic 4: Evidence Quality Gate, `FR-E4-1` to `FR-E4-4`.
  - Epic 5: Reconciliation, `FR-E5-1` to `FR-E5-6`.
  - Epic 6: Verified Profile & Risk Classification, `FR-E6-1` to `FR-E6-5`.
  - Epic 7: Gap Analysis & Document Generation, `FR-E7-1` to `FR-E7-4`.
  - Epic 8: Audit Trail, `FR-E8-1` to `FR-E8-5`.

Contradiction:

- `docs/product/business-rules.md` references 78 unique numeric `FR-###` IDs.
- The numeric FR catalog is not active; it exists under archived delete-candidates.
- The active PRD does not define a mapping from `FR-###` to `FR-E...`.

Audit conclusion:

Functional requirements are present, but the active baseline is contradictory because traceability references a different inactive FR namespace.

## BR Inventory

Classification: `PRESENT_BUT_FRAGMENTED`

Active findings:

- `docs/product/business-rules.md` defines 94 business rules from `BR-001` through `BR-094`.
- The rule table includes:
  - Rule ID.
  - Statement.
  - Category.
  - Rationale.
  - Data/entity references.
  - Module references.
  - Related use case.
  - Related FR.
  - Related NFR.
  - State.
  - Audit event.
  - Validation dependency.
- The same file includes sections for:
  - Rule-to-Use-Case Traceability.
  - Rule-to-Requirement Traceability.
  - Rule-to-State Traceability.
  - Rule-to-Audit Traceability.

Traceability limitation:

- Related UC, FR, and NFR references use ID schemes whose canonical full inventories are not all active.
- Related FR and NFR references use numeric ID schemes that conflict with active PRD IDs.

Audit conclusion:

Business rules are substantially present, but their external trace links are not clean enough to classify the rule baseline as fully traceable.

## NFR Inventory

Classification: `CONTRADICTORY`

Active PRD inventory:

- `docs/product/prd.md` defines 14 product-level NFRs:
  - `NFR-1` to `NFR-5`: security and privacy.
  - `NFR-6` to `NFR-9`: reliability and governance.
  - `NFR-10` to `NFR-12`: usability.
  - `NFR-13` to `NFR-14`: accessibility and localization.

Contradiction:

- `docs/product/business-rules.md` references numeric IDs such as `NFR-001`, `NFR-007`, `NFR-030`, and `NFR-031`.
- The fuller numeric NFR catalog exists in `docs/archive/redundant-artifacts/delete-candidates/design/non-functional-requirements.md`, not active documentation.
- No active mapping exists from `NFR-###` to `NFR-1..NFR-14`.

Audit conclusion:

NFR content exists, but the active baseline is contradictory because active trace links reference archived numeric NFR IDs.

## Acceptance Criteria Inventory

Classification: `PRESENT_BUT_FRAGMENTED`

Active findings:

- `docs/product/prd.md` defines 16 acceptance criteria:
  - `AC-1` to `AC-12`: product acceptance criteria.
  - `AC-13` to `AC-16`: PRD acceptance criteria.
- Active implementation docs include component-level acceptance criteria, especially scanner implementation criteria.
- Active specs include invariant and readiness constraints that function as acceptance guardrails.

Fragmentation:

- The detailed QA acceptance criteria file is archived under delete-candidates.
- There is no active acceptance criteria matrix mapping `AC-#` to UC/FR/BR/NFR.
- Component-level acceptance criteria are distributed across implementation documents and not centrally indexed.

Audit conclusion:

Acceptance criteria exist, but they are fragmented and not fully traceable in active documentation.

## Traceability Matrix Summary

Classification: `CONTRADICTORY`

Active traceability coverage:

| Trace Link | Status | Evidence |
|---|---|---|
| BR -> UC | Partially active | `docs/product/business-rules.md` contains related use case IDs. |
| BR -> FR | Contradictory | Business rules reference `FR-###`, while active PRD defines `FR-E...`. |
| BR -> NFR | Contradictory | Business rules reference `NFR-###`, while active PRD defines `NFR-1..NFR-14`. |
| PRD FR -> Success Metrics | Active | PRD success metrics reference `FR-E...`. |
| PRD AC -> Product constraints | Active but not mapped | PRD acceptance criteria exist, but no active matrix links them to FR/BR/NFR. |
| Specs -> runtime / implementation | Active but local | Scanner, assessment lifecycle, legal classification, and document specs point to runtime/implementation docs. |
| Full UC -> FR -> BR -> NFR -> AC matrix | Not active | Complete matrix exists only in archived delete-candidates. |

Audit conclusion:

Traceability exists in fragments, but the active baseline cannot be treated as complete because the central matrix is archived and active documents still reference archived ID schemes.

## Gap Analysis

| Gap | Severity | Impact | Recommendation |
|---|---|---|---|
| Active use-case inventory absent | High | Requirements readers cannot verify whether all `UC-MXX-XX` references remain active or in MVP scope. | Either restore a slim active use-case inventory or remove UC IDs from active traceability and replace them with PRD journey/process references. |
| FR ID scheme conflict | Critical | Business rules cannot be reliably traced to active PRD functional requirements. | Normalize active traceability to one FR namespace, preferably the active PRD `FR-E...` scheme, or create an active crosswalk. |
| NFR ID scheme conflict | Critical | Security/privacy/governance rules cannot be reliably traced to active NFRs. | Normalize active traceability to one NFR namespace, or create an active crosswalk from numeric NFR IDs to PRD NFRs. |
| Full traceability matrix archived | High | Active baseline cannot prove UC/FR/BR/NFR/AC coverage end to end. | Create or restore one active lightweight traceability summary after ID normalization. |
| Acceptance criteria not mapped | Medium | Product ACs exist but are not connected to FR/BR/NFR coverage. | Add active AC trace links only after FR/NFR namespaces are normalized. |
| Business process inventory fragmented | Medium | New contributors must infer process inventory from PRD, specs, blueprints, and implementation docs. | Maintain a short active process inventory or add process ownership to `docs/README.md` / governance docs. |
| Archived requirement documents still contain richer canonical-looking material | Medium | Reviewers may accidentally use archived delete-candidates as active source of truth. | Keep `docs/README.md` warning intact and add a cleanup/crosswalk decision before deleting or restoring archived requirement catalogs. |

## Final Decision

`REQUIREMENTS_BASELINE_INCOMPLETE`

Reason:

The repository contains substantial requirements content, but the active baseline is not complete because use cases and full traceability are archived or fragmented, and active documents contain contradictory FR/NFR ID schemes.
