# LCSP Requirements Traceability Summary

## Purpose

This document summarizes the active canonical requirements traceability state for LCSP after Phase 5.2K-A planning remediation.

It does not create requirements, certify implementation readiness, or claim story-level coverage.

## Identifier Governance

- Canonical functional requirements are `FR-001..FR-056` in `docs/specs/functional-requirements.md`.
- PRD `FR-E*` values are product narrative/source aliases only.
- Canonical active NFRs are `NFR-001..NFR-030` and `NFR-033..NFR-035` in `docs/specs/non-functional-requirements.md`.
- `NFR-031` and `NFR-032` are legacy identifiers only, not active catalog rows.
- Historical or archived documents do not override active canonical documents.

## Canonical Inventory

| Inventory Item | Count / Status |
|---|---|
| Canonical FR total | 56 |
| Active MVP FR total | 53 |
| Deferred FR total | 3 |
| Active NFR total | 33 |
| AC total | 41 |
| UX specification status | CANONICAL_UX_PENDING |
| Canonical epics/stories artifact | Missing |
| Story coverage status | STORY_TRACEABILITY_PENDING |

## Functional Requirement Scope

| FR Range | Status | Meaning |
|---|---|---|
| `FR-001..FR-049` | Active MVP | Core platform, assessment, evidence, reconciliation, classification, reporting, audit and repository-scan behavior. |
| `FR-050` | Deferred | Local/CI scanner report upload. |
| `FR-051` | Deferred | Manual technical evidence JSON upload. |
| `FR-052` | Deferred | Delegated technical clarification. |
| `FR-053..FR-056` | Active MVP | Legal-source ingestion, corpus approval, LLM provider configuration and hybrid search. |

## Non-Functional Requirement Scope

| NFR Range | Status |
|---|---|
| `NFR-001..NFR-030` | Active |
| `NFR-031` | Legacy alias of active `NFR-005` for OAuth identity-linking safety |
| `NFR-032` | Legacy alias of active `NFR-008` for Manager super-role enforcement |
| `NFR-033..NFR-035` | Active |

## Active Traceability Assertions

```text
canonicalFrTotal = 56
activeMvpFrTotal = 53
deferredFrTotal = 3

activeNfrTotal = 33

FR-050 = DEFERRED
FR-051 = DEFERRED
FR-052 = DEFERRED

NFR-031 = LEGACY_ALIAS_OF_NFR-005
NFR-032 = LEGACY_ALIAS_OF_NFR-008

goldenEvidencePath = GITHUB_APP_REPOSITORY_SCAN
developerParticipation = OPTIONAL
attestation = OPTIONAL_SUPPLEMENTAL
attestationCanUnlockClassification = false
managerFinalResolver = true

STORY_COVERAGE_NOT_ASSESSABLE
CANONICAL_UX_PENDING
STORY_TRACEABILITY_PENDING
CANONICAL_EPICS_AND_STORIES_ARTIFACT_MISSING
```

## Coverage Boundaries

Requirement-to-domain and requirement-to-implementation-area coverage are tracked in `docs/specs/requirements-traceability-matrix.md`.

UX and story-level traceability remain pending until `bmad-ux` and `bmad-create-epics-and-stories` produce canonical UX and user-value epics/stories. This document must not be read as implementation readiness certification.

## Story Dependency Carry-Forward

When canonical stories are created, legal-source and retrieval stories must carry these explicit NFR dependencies:

| FR | Story-layer NFR dependencies |
|---|---|
| `FR-053` | `NFR-017`, `NFR-034` |
| `FR-054` | `NFR-017`, `NFR-034` |
| `FR-056` | `NFR-017`, `NFR-033`, `NFR-034` |

## Deferred Evidence Paths

The MVP golden technical-evidence path is GitHub App read-only Repository Scan.

The following are deferred and must not be treated as active MVP architecture, story or implementation paths:

- `FR-050`: Local/CI scanner report upload.
- `FR-051`: Manual technical evidence JSON upload.
- `FR-052`: Delegated technical clarification.
- API probe evidence unless separately approved through change control.

## Developer Collaboration and Attestation

Developer collaboration remains an optional MVP path. Manager can complete the A-to-Z golden path without Developer participation.

Structured attestation is optional supplemental input only:

- it is not required for the golden path;
- it requires a scoped Developer task;
- it cannot replace scanner metadata;
- it cannot independently unlock classification;
- it cannot finalize conflict resolution;
- Manager remains final resolver;
- `FR-045` disclosure/audit applies whenever attestation influences a material decision;
- `FR-046` submission must not be represented without `FR-045` disclosure/audit.

## Readiness Status

```text
IMPLEMENTATION_READINESS_NOT_CERTIFIED
STORY_LEVEL_TRACEABILITY_PENDING
```
