# LCSP Requirements Traceability Matrix

## Purpose

Canonical traceability from use cases to requirements, acceptance criteria, domain/state specifications, and implementation areas.

## Inventory

| Item                    | State                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Canonical use cases     | UC-001..UC-017; historical UC-018 superseded                                                                                                                        |
| Functional requirements | 56 total; Phase 5.2L: `FR-050` active Automatic Trusted Scan Initiation; `FR-051` removed; `FR-052` deferred; `FR-045/FR-046` superseded                            |
| Active NFRs             | 33                                                                                                                                                                  |
| Acceptance criteria     | AC-001..AC-041 plus AC-050A..AC-050F                                                                                                                                |
| UX                      | active rebased UX in `docs/planning-artifacts/ux-designs/ux-LCSP-2026-06-24/` plus canonical review                                                                 |
| Stories                 | `docs/planning-artifacts/epics.md`; implementation-readiness traceability in `docs/test-artifacts/traceability/implementation-readiness-traceability-2026-06-25.md` |
| Baseline freeze status  | Canonical Candidate; not Frozen until remediation gaps and open PR effects are reconciled                                                                           |

Legacy `UC-MXX-XX`, `FR-E*`, `FR-057..FR-082`, `NFR-031`, and `NFR-032` are aliases/history only. Active rows below use canonical identifiers.

## Functional Traceability

| FR     | UC                                     | AC                             | Domain / State Source                          | Implementation Area                           |
| ------ | -------------------------------------- | ------------------------------ | ---------------------------------------------- | --------------------------------------------- |
| FR-001 | UC-001                                 | AC-021                         | domain model / identity policy                 | API Identity                                  |
| FR-002 | UC-001                                 | AC-021                         | identity/session policy                        | API Identity                                  |
| FR-003 | UC-001                                 | AC-021                         | identity/session policy                        | API Identity                                  |
| FR-004 | UC-001                                 | AC-021, AC-022                 | identity/session policy                        | API Identity                                  |
| FR-005 | UC-001                                 | AC-021, AC-023                 | OAuth policy                                   | API Identity                                  |
| FR-006 | UC-001, UC-005                         | AC-023                         | user task flows                                | Identity + Repository API                     |
| FR-007 | UC-002                                 | AC-024                         | domain model                                   | Organization API                              |
| FR-008 | UC-002                                 | AC-024                         | domain model                                   | Organization API                              |
| FR-009 | UC-002                                 | AC-024                         | RBAC subject attributes/templates              | RBAC                                          |
| FR-010 | —                                      | —                              | `RETIRED_FROM_ACTIVE_MVP`                      | no active implementation                      |
| FR-011 | —                                      | —                              | `RETIRED_FROM_ACTIVE_MVP`                      | no active implementation                      |
| FR-012 | UC-002, UC-010, UC-011, UC-013, UC-014 | AC-025, AC-026                 | RBAC guards                                    | RBAC                                          |
| FR-013 | UC-003                                 | AC-001                         | Assessment state                               | Assessment API                                |
| FR-014 | UC-004                                 | AC-002                         | WizardProfile / Assessment / context revision  | Wizard API/UI; Interview runtime              |
| FR-015 | UC-004, UC-014                         | AC-003                         | system context / document spec                 | Assessment UI                                 |
| FR-016 | UC-005                                 | AC-004, AC-023                 | repository connection state                    | GitHub API; read-only default path            |
| FR-017 | UC-006                                 | AC-004, AC-020                 | RepositorySnapshot                             | GitHub API                                    |
| FR-018 | UC-007, UC-016                         | AC-004, AC-028, AC-029         | ScanJob / scanner spec                         | API + Python Worker                           |
| FR-019 | UC-007, UC-017                         | AC-005, AC-022, AC-029, AC-030 | scanner spec / ScanJob                         | Python Worker Security                        |
| FR-020 | UC-007, UC-008                         | AC-005                         | TechnicalEvidenceReport                        | Evidence Gates                                |
| FR-021 | UC-008                                 | AC-006                         | report state machine                           | Evidence Gates                                |
| FR-022 | UC-008                                 | AC-007                         | TechnicalProfile                               | Technical Profile Worker                      |
| FR-023 | UC-007, UC-008, UC-009                 | AC-007, AC-031, AC-032         | scanner + AIUsageFlow specs                    | Python/AIUsage Workers                        |
| FR-024 | UC-009                                 | AC-008                         | AIUsageFlow                                    | AI Usage Flow Worker                          |
| FR-025 | UC-009                                 | AC-009, AC-031, AC-032         | AIUsageFlow state                              | AI Usage Flow Worker                          |
| FR-026 | UC-010                                 | AC-010, AC-033                 | conflict state                                 | Reconciliation Worker                         |
| FR-027 | UC-010                                 | AC-011                         | reconciliation spec                            | Reconciliation Worker                         |
| FR-028 | UC-010                                 | AC-012, AC-033                 | conflict state                                 | Reconciliation API                            |
| FR-029 | UC-010                                 | AC-012, AC-033                 | conflict state                                 | Reconciliation API                            |
| FR-030 | UC-011                                 | AC-014, AC-015                 | AIUsageFlow/evidence context                   | EngineeringRule Assessment                    |
| FR-031 | UC-011                                 | AC-015                         | retired VerifiedProfile approval gate          | Classification API/UI                         |
| FR-032 | UC-012                                 | AC-016, AC-035, AC-036         | legal corpus state                             | Legal Corpus / EngineeringRule Compiler       |
| FR-033 | UC-012                                 | AC-016, AC-036                 | EngineeringRule spec                           | EngineeringRule Assessment                    |
| FR-034 | UC-012, UC-013                         | AC-017, AC-034, AC-036         | EngineeringRule/classification state           | EngineeringRule Assessment                    |
| FR-035 | UC-013                                 | AC-016, AC-018, AC-037, AC-038 | classification state                           | EngineeringRule Assessment                    |
| FR-036 | UC-013                                 | AC-017, AC-018, AC-034         | classification state                           | EngineeringRule Assessment                    |
| FR-037 | UC-013                                 | AC-018                         | classification spec                            | Classification API/UI                         |
| FR-038 | UC-014                                 | AC-018                         | GapAnalysis / RemediationChangeRequest         | Gap Analysis Worker; remediation proposal     |
| FR-039 | UC-014                                 | AC-018, AC-019, AC-027, AC-041 | document state                                 | Document Worker                               |
| FR-040 | UC-004, UC-014                         | AC-003, AC-019                 | document spec                                  | Document API/UI                               |
| FR-041 | UC-014                                 | AC-019, AC-041                 | document state                                 | Document API/UI                               |
| FR-042 | UC-015, UC-017                         | AC-020, AC-039, AC-040         | event catalog / all states                     | Audit + Outbox                                |
| FR-043 | UC-015                                 | AC-020, AC-022                 | AuditEvent                                     | Audit API                                     |
| FR-044 | UC-015, UC-016                         | AC-020, AC-039, AC-040         | versioned artifacts                            | Persistence/Audit                             |
| FR-045 | —                                      | AC-013 historical only         | `SUPERSEDED_FOR_ACTIVE_MVP`                    | no active implementation                      |
| FR-046 | —                                      | AC-013 historical only         | `SUPERSEDED_FOR_ACTIVE_MVP`                    | no active implementation                      |
| FR-047 | —                                      | —                              | `RETIRED_FROM_ACTIVE_MVP`                      | no active implementation                      |
| FR-048 | UC-007                                 | AC-007, AC-022, AC-025         | evidence view                                  | Scanner API/UI                                |
| FR-049 | UC-016                                 | AC-004, AC-020, AC-028, AC-039 | ScanJob/version/remediation verification state | API + Python Worker                           |
| FR-050 | UC-016                                 | AC-050A..AC-050F               | TrustedScanTrigger / ScanMappingResolution     | API + Python Scan Trigger Worker              |
| FR-051 | —                                      | —                              | `REMOVED_FROM_PRODUCT`                         | no active or future product implementation    |
| FR-052 | UC-010                                 | — Deferred                     | deferred clarification path                    | no active implementation                      |
| FR-053 | UC-012                                 | AC-016                         | LegalSource/LegalDocument ingestion state      | Legal Ingestion Worker                        |
| FR-054 | UC-012                                 | AC-016, AC-035                 | LegalCorpusVersion state                       | Internal Approval Gate; evaluation provenance |
| FR-055 | UC-013                                 | AC-018, AC-037, AC-038         | LLM Gateway configuration                      | Platform / LLM Gateway                        |
| FR-056 | UC-012                                 | AC-016, AC-035, AC-036         | legal matching/index state                     | ChromaDB Legal Retriever                      |

## NFR Coverage

| NFR              | Primary FRs                                                    | Verification Focus                                                     |
| ---------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------- |
| NFR-001..NFR-005 | FR-001..FR-005                                                 | auth/session/MFA/OAuth safety                                          |
| NFR-006, NFR-007 | FR-006, FR-016, FR-018                                         | identity/repository separation and read-only scope                     |
| NFR-008..NFR-010 | FR-007..FR-013, FR-028, FR-031, FR-042..FR-044, FR-047, FR-050 | RBAC, scoped collaboration, trigger/audit                              |
| NFR-011          | FR-042..FR-044, FR-050                                         | append-oriented audit                                                  |
| NFR-012..NFR-016 | FR-017..FR-023, FR-043, FR-044, FR-048, FR-055                 | source/privacy/evidence integrity                                      |
| NFR-017          | FR-032..FR-036, FR-053, FR-054, FR-056                         | legal citation/corpus provenance                                       |
| NFR-018..NFR-022 | FR-015, FR-021, FR-025..FR-041, FR-050                         | fail-closed, no overclaim, reliable/actionable states                  |
| NFR-023..NFR-026 | worker-driven FRs                                              | bounds, API-worker split, ownership, observability                     |
| NFR-027, NFR-028 | user-facing FRs                                                | accessibility and business-language UX                                 |
| NFR-029          | FR-023..FR-025, FR-032, FR-033, FR-056                         | claim evidence refs                                                    |
| NFR-030          | FR-017, FR-044, FR-049                                         | immutable rerun history                                                |
| NFR-033          | FR-055                                                         | LLM budget controls; embeddings future-only unless separately approved |
| NFR-034          | FR-032, FR-053, FR-054, FR-056                                 | immutable approved corpus                                              |
| NFR-035          | FR-018, FR-019                                                 | Python Worker sandbox/cleanup                                          |

## UX and Story Boundary

UX has been rebased against the pruned active authority set and reviewed for epic generation. Story coverage is assessable through `docs/planning-artifacts/epics.md`; certification-grade planning traceability is captured in `docs/test-artifacts/traceability/implementation-readiness-traceability-2026-06-25.md`.

## Remediation E2E Traceability

| Step                                     | UC/FR/AC                               | Required behavior                                                                                    | Current implementation evidence                                                                                          | Test/evidence status                              |
| ---------------------------------------- | -------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Customer decision                        | UC-014; FR-038; AC-018, AC-020         | Customer chooses remediation path from available runtime actions.                                    | `AssessmentInterviewRuntimeService.submitPostFindingDecision` persists selected post-finding decision to runtime events. | PARTIAL / evidenced for decision persistence only |
| Repository write permission verification | UC-014; FR-038, FR-049; AC-004, AC-020 | Verify Contents + Pull requests write capability after approval and before mutation.                 | No complete backend path evidenced in reviewed GitHub integration.                                                       | MISSING / NO EVIDENCE                             |
| PAT upgrade/update for remediation       | UC-014; FR-038; AC-020, AC-023         | Require/update credential when current credential lacks write capability.                            | Existing settings/post-finding i18n intent for `UPDATE_GITHUB_PAT` and write-access helper copy.                         | UI/i18n intent; backend E2E missing               |
| Patch generation/revision                | UC-014; FR-038; AC-018, AC-020         | Create versioned remediation patch tied to evidence/gap/correlation refs.                            | Runtime/UI artifact intent exists; end-to-end generation not established.                                                | PARTIAL                                           |
| Branch/commit/PR mutation                | UC-014; FR-038, FR-049; AC-004, AC-020 | Create remediation branch/commit/PR and persist PR refs.                                             | GitHub integration evidence centers on credential/discovery/connect/snapshot/scan.                                       | MISSING / NO EVIDENCE                             |
| Re-scan patched commit                   | UC-016; FR-049; AC-004, AC-020, AC-039 | Create scan job against patched commit and preserve history.                                         | Requirement/design gap.                                                                                                  | MISSING                                           |
| Re-evaluation                            | UC-013, UC-014; FR-035..FR-038; AC-018 | Re-evaluate affected EngineeringRule/risk/gap context after patched scan.                            | Requirement/design gap.                                                                                                  | MISSING                                           |
| Audit/history linkage                    | UC-015; FR-042..FR-044; AC-020, AC-039 | Link decision, credential update, mutation refs, scan, evaluation, verification, and report history. | Generic audit/history exists; remediation-specific chain not mapped end to end.                                          | PARTIAL / gap                                     |

## Message Appendix

Message identifiers below are cataloged from existing `@lcsp/i18n` keys. The copy remains owned by i18n/UX; requirements use these keys only for trigger/context/action traceability.

| MSG     | i18n key                                                                                                 | Trigger/context                                                                      | Action mapping                                                                                           | Trace                                                 |
| ------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| MSG-001 | `pages.workspace.assessment.postFinding.decisions.UPDATE_GITHUB_PAT`                                     | Remediation approval requires credential update or write capability is insufficient. | Show update PAT action and route to repository credential update.                                        | FR-038, FR-049; AC-020, AC-023; UX-CODE-REMEDIATION   |
| MSG-002 | `pages.workspace.assessment.postFinding.decisions.CREATE_REMEDIATION_PR`                                 | Customer may approve creation of a remediation PR.                                   | Submit Customer remediation decision; then require write-capability check before mutation.               | FR-038, FR-049; AC-018, AC-020; UX-CODE-REMEDIATION   |
| MSG-003 | `pages.workspace.assessment.postFinding.decisions.CONTINUE_DETECTED_PR`                                  | Existing detected PR can continue the remediation path.                              | Select detected PR branch and preserve PR reference.                                                     | FR-038, FR-049; AC-020; UX-CODE-REMEDIATION           |
| MSG-004 | `pages.workspace.assessment.postFinding.verificationStatuses.PENDING/RUNNING/PASSED/FAILED`              | Remediation verification lifecycle changes.                                          | Render verification status without implying final remediation success before re-scan/re-evaluation pass. | FR-049; AC-020, AC-039; UX-HISTORY-REASSESS           |
| MSG-005 | `pages.workspace.settings.repositories.codeRemediationWriteAccess`                                       | Repository settings shows remediation write-access readiness.                        | Explain write access as remediation-specific capability, not default connect/scan access.                | FR-016, FR-038; AC-004, AC-023; UX-CODE-REMEDIATION   |
| MSG-006 | `pages.workspace.settings.repositories.codeRemediationWriteHelper`                                       | Customer reviews required write scope.                                               | State required Contents + Pull requests write capability.                                                | FR-038, FR-049; AC-020, AC-023; UX-CODE-REMEDIATION   |
| MSG-007 | `pages.workspace.settings.repositories.repositoryAccessGuidance`                                         | Customer manages repository credentials.                                             | Explain read access default and write access only for code fixes/PRs.                                    | FR-016, FR-038; AC-004, AC-023; UX-REPOSITORY         |
| MSG-008 | `pages.workspace.assessment.gapAnalysisLabel` and `pages.workspace.assessment.gapAnalysisPendingMessage` | Gap stage is not ready yet.                                                          | Show gap availability/pending state without overclaiming generated remediation.                          | FR-038; AC-018; UX-GAP                                |
| MSG-009 | `pages.workspace.assessment.documents.documentStates.*`                                                  | Final report/readiness/gap document status changes.                                  | Show queued/generating/ready/failed/blocked/permission-denied states.                                    | FR-039..FR-041; AC-019, AC-041; UX-REPORT             |
| MSG-010 | `pages.workspace.assessment.verifiedProfileReview.verificationSourceLabel` and `verificationSources.*`   | Evaluation/review needs evidence source context.                                     | Show technical plus confirmed customer context versus unknown source.                                    | FR-030, FR-035..FR-037; AC-014, AC-018; UX-EVALUATION |

## UX Control Mapping

| UX mapping                | Entry point/control                                                                                | FR/AC                                                          | Implementation evidence/test                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| UX-BUSINESS-CONTEXT-EDIT  | Business Context artifact, Interview answer submit, queued edit/revision status.                   | FR-014; AC-002                                                 | Runtime context revisions and Interview tests exist; queued-during-running edit behavior remains requirement gap unless separately evidenced. |
| UX-EVALUATION             | Evaluation/classification status, evidence source review, blocked/failed states.                   | FR-030, FR-035..FR-037; AC-014, AC-018, AC-034, AC-037, AC-038 | PR #312 affects Investigator/evaluation runtime and must be reconciled before freeze.                                                         |
| UX-AI-RISK                | Risk classification result/blocked state and citation/evidence provenance.                         | FR-035..FR-037; AC-018                                         | Existing classification runtime docs/code; PR #312 may update evidence semantics.                                                             |
| UX-GAP                    | Gap analysis pending/ready and remediation recommendation proposal.                                | FR-038; AC-018                                                 | Gap label/pending messages exist; remediation E2E remains partial.                                                                            |
| UX-REPORT                 | Final report, readiness export, document guard blocked and download states.                        | FR-039..FR-041; AC-019, AC-041                                 | Document state i18n exists; final guard behavior traces to document specs/tests.                                                              |
| UX-HISTORY-REASSESS       | Audit/history/reassess actions, duplicate delivery, rerun history.                                 | FR-042..FR-044, FR-049; AC-020, AC-039, AC-040                 | Generic audit/history exists; remediation-specific chain is a gap.                                                                            |
| UX-CODE-REMEDIATION       | Approve remediation, update PAT, continue detected PR, create remediation PR, write-access helper. | FR-038, FR-049; AC-018, AC-020, AC-023                         | Post-finding decision persistence and i18n exist; write-back chain missing.                                                                   |
| UX-PROGRAM-EVIDENCE-GRAPH | Graph drawer/navigation, selected-node inspector, provenance-safe entry points.                    | FR-023, FR-048; AC-007, AC-022, AC-031, AC-032                 | PR #309 must be reconciled before freeze.                                                                                                     |

## Open PR Reconciliation

| PR              | Scope effect                                                                                                                                                           | Freeze treatment                                                                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| #310 / LCSP-295 | M11 Admin User Account UI/contract: `ACTIVE/SUSPENDED/INVITED`, `ADMIN/CUSTOMER`, provider metadata, list/detail/search/filter/pagination/role/suspension, EN/VI i18n. | Use as strongest current M11 evidence; roles remain subject labels and PBAC/RBAC remains authorization source of truth. |
| #312 / LCSP-303 | Investigator/evaluation runtime, `RULE_SCOPE_NOT_APPLICABLE`, bounded recovery, evidence search semantics.                                                             | Reconcile with Evaluation/AI Risk traceability before Frozen.                                                           |
| #309 / LCSP-232 | Program Evidence Graph drawer/navigation and customer-safe provenance.                                                                                                 | Reconcile with UX-PROGRAM-EVIDENCE-GRAPH before Frozen.                                                                 |
| #268 / LCSP-236 | Multi-repository integration draft.                                                                                                                                    | Do not treat as canonical current behavior unless accepted into scope.                                                  |

```text
REQUIREMENT_TRACEABILITY_CORE_MATRIX_NORMALIZED
CANONICAL_UC_IDS_ONLY
FR_050_AUTOMATIC_TRUSTED_SCAN_INITIATION_TRACED
FR_051_REMOVED_FROM_PRODUCT
STRUCTURED_ATTESTATION_SUPERSEDED_FOR_ACTIVE_MVP
ACTIVE_REQUIREMENTS_TRACE_RECHECKED
ACCEPTANCE_CRITERIA_TRACE_RECHECKED
PROJECT_OWNER_DOC_REMEDIATION_APPROVED
SCANNER_BEHAVIOR_AUTHORITY_CONSOLIDATED
CHROMADB_VECTORLESS_DOMAIN_CONTRACT_ALIGNED
UX_REBASED_ACTIVE_DOC_SET
PYTHON_WORKER_PACKAGE_TOPOLOGY_LOCKED
AUDIT_EXPORT_SYNC_API_BOUNDARY_LOCKED
UX_REBASE_COMPLETE_AFTER_DOC_PRUNING
CHROMADB_STRUCTURE_FIRST_VECTORLESS_LEGAL_RAG_APPROVED
POSTGRESQL_PGVECTOR_LEGAL_RETRIEVAL_SUPERSEDED
STORY_TRACEABILITY_CREATED
STORY_COVERAGE_ASSESSABLE
CANONICAL_EPICS_AND_STORIES_ARTIFACT_PRESENT
```
