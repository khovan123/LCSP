# Phase 5.1 Controlled MVP Prototype Backlog Planning Report

## Scope and Authorization Boundary

This phase creates controlled MVP prototype epics and stories under owner risk acceptance.

Entry condition:

```text
CONTROLLED_MVP_PROTOTYPE_HANDOFF_TO_BACKLOG_PLANNING_ALLOWED
```

Planning mode:

```text
CONTROLLED_MVP_PROTOTYPE_ONLY
```

This planning does not authorize:

- production deployment;
- customer onboarding;
- compliance certification;
- formal legal reliability validation;
- independent legal opinion;
- runtime scanner accuracy claim;
- A2-b2 completion claim;
- validated production release.

Global statuses remain unchanged:

```text
PRODUCT_READY_FOR_VALIDATION
READY_FOR_ARCHITECTURE_REVIEW
VALIDATION_READY
IMPLEMENTATION_NOT_READY
```

Validated/production implementation backlog remains blocked. Only controlled MVP prototype implementation is authorized.

Source-document note: the requested path `docs/implementation/implementation-contract.md` is not present in the repository. This planning used the canonical contract at `docs/specs/implementation-contract.md` together with the existing implementation guidance under `docs/implementation/`.

## Epic Inventory

| Epic ID | Title | Dependency Order | Prototype Scope | Deferred Scope |
|---|---|---:|---|---|
| EPIC-01 | Platform Foundation and Prototype Guardrails | 1 | Prototype boundaries, status vocabulary, config categories | Production infra/CI/CD |
| EPIC-02 | Identity, OAuth/OIDC, and Manager Authorization | 2 | OAuth/OIDC login, session/MFA hooks, Manager super-role | SAML/SCIM/enterprise SSO |
| EPIC-03 | GitHub App Repository Connection | 3 | GitHub App connection, repository/branch/commit selection | Local/CI/manual evidence, API probing |
| EPIC-04 | Scan Orchestration and Technical Evidence Foundation | 4 | Scan jobs, synthetic fixture-driven scanner prototype, TechnicalEvidenceReport, TechnicalProfile | A2-b2, production scanner accuracy |
| EPIC-05 | AIUsageFlow and Technical Profile Construction | 5 | Claim-level AIUsageFlow, uncertainty, automation/human-review mapping | Legal classification accuracy claim |
| EPIC-06 | Reconciliation, Conflict Resolution, and Auditability | 6 | Manager conflict tasks, VerifiedProfile gate, immutable audit trail | Developer final resolver |
| EPIC-07 | Legal Corpus and Citation Traceability Foundation | 7 | Corpus metadata, retrieval boundary, citation guardrail shell | Formal legal reliability validation |
| EPIC-08 | Risk Classification, Gap Analysis, and Document Workflow Shells | 8 | Shells that block/degrade on missing prerequisites | Compliance certification/final production reports |
| EPIC-09 | Security, Privacy, and Prototype Observability | 9 | Redaction, no raw-source-to-LLM, retention, manual verification support | Production security certification/dashboards |

## Story Inventory

| Story ID | Epic | Priority | Dependency | Prototype Limitation |
|---|---|---|---|---|
| STORY-01-01 | EPIC-01 | P0 | None | Boundary setup only |
| STORY-01-02 | EPIC-01 | P0 | STORY-01-01 | Prototype labels only |
| STORY-01-03 | EPIC-01 | P1 | STORY-01-01 | Local/dev config only |
| STORY-02-01 | EPIC-02 | P0 | STORY-01-03 | Provider-neutral OAuth/OIDC prototype |
| STORY-02-02 | EPIC-02 | P1 | STORY-02-01 | Prototype MFA/session hooks |
| STORY-02-03 | EPIC-02 | P0 | STORY-02-01 | Manager-only MVP enforcement |
| STORY-03-01 | EPIC-03 | P0 | STORY-02-03 | GitHub App prototype connection |
| STORY-03-02 | EPIC-03 | P0 | STORY-03-01 | Metadata-only repository snapshot |
| STORY-04-01 | EPIC-04 | P0 | STORY-03-02 | Prototype queue/job behavior |
| STORY-04-02 | EPIC-04 | P1 | STORY-04-01 | Synthetic fixture-driven scanner only |
| STORY-04-03 | EPIC-04 | P0 | STORY-04-02 | Evidence metadata persistence only |
| STORY-04-04 | EPIC-04 | P0 | STORY-04-03 | Prototype gate thresholds may change |
| STORY-05-01 | EPIC-05 | P0 | STORY-04-04 | Claim model design only |
| STORY-05-02 | EPIC-05 | P0 | STORY-05-01 | Abstention/uncertainty design only |
| STORY-05-03 | EPIC-05 | P1 | STORY-05-01 | Mapping design only |
| STORY-06-01 | EPIC-06 | P0 | STORY-05-03 | Binary MVP reconciliation shell |
| STORY-06-02 | EPIC-06 | P0 | STORY-06-01 | Manager-only resolution prototype |
| STORY-06-03 | EPIC-06 | P0 | STORY-06-02 | VerifiedProfile gate shell |
| STORY-06-04 | EPIC-06 | P1 | STORY-01-02 | Prototype audit persistence |
| STORY-07-01 | EPIC-07 | P1 | STORY-06-04 | Internal corpus foundation only |
| STORY-07-02 | EPIC-07 | P1 | STORY-07-01, STORY-06-03 | Retrieval boundary only |
| STORY-07-03 | EPIC-07 | P0 | STORY-07-02 | Citation traceability shell |
| STORY-08-01 | EPIC-08 | P0 | STORY-07-03 | Classification gating shell only |
| STORY-08-02 | EPIC-08 | P1 | STORY-08-01 | Gap shell only |
| STORY-08-03 | EPIC-08 | P1 | STORY-08-02 | Document shell only |
| STORY-08-04 | EPIC-08 | P2 | STORY-01-02 | Readiness-only export shell |
| STORY-09-01 | EPIC-09 | P0 | STORY-04-03 | Initial redaction rules only |
| STORY-09-02 | EPIC-09 | P0 | STORY-05-01, STORY-07-02 | LLM boundary guard only |
| STORY-09-03 | EPIC-09 | P1 | STORY-04-01 | Prototype workspace lifecycle |
| STORY-09-04 | EPIC-09 | P1 | EPIC-01..EPIC-08 | Prototype observability only |

## Traceability Coverage

| Concern | Primary Epics | Traceability |
|---|---|---|
| Platform foundation and module boundaries | EPIC-01 | `docs/implementation/repository-and-module-layout.md`, `docs/implementation/system-runtime-and-component-contracts.md` |
| OAuth/OIDC and Manager super-role | EPIC-02 | FR-074..FR-077, BR-086..BR-089, UC-M01-14, UC-M03-01 |
| GitHub App repository selection | EPIC-03 | FR-025, FR-066, BR-032, BR-077, UC-M04-02, UC-M04-08 |
| Scan orchestration and evidence | EPIC-04 | FR-031..FR-035, FR-066, `docs/specs/evidence-report-contract.md` |
| AIUsageFlow | EPIC-05 | FR-069..FR-073, BR-080..BR-085, `docs/specs/ai-usage-flow-analysis-spec.md` |
| Reconciliation and VerifiedProfile | EPIC-06 | FR-036..FR-042, FR-067, `docs/specs/reconciliation-policy.md` |
| Legal corpus and citations | EPIC-07 | FR-043..FR-046, FR-073, `docs/specs/legal-rule-citation-contract.md` |
| Classification/gap/document shells | EPIC-08 | FR-044..FR-052, FR-068 |
| Security/privacy/observability | EPIC-09 | FR-053..FR-062, NFR-012..NFR-018, `docs/security/source-code-privacy-policy.md` |

## Validation and Risk-Acceptance Constraints

- Real validation remains incomplete.
- A2-b1 may validate mapping-design evidence only.
- A2-b2 remains post-implementation empirical scanner acceptance.
- Formal legal reliability validation is not approved.
- Synthetic fixture-driven scanner prototype cannot claim runtime scanner accuracy.
- Validated/production backlog remains blocked.
- Controlled MVP prototype work remains inside owner-approved scope.

## Explicitly Deferred Work

- Enterprise SSO/SAML/SCIM.
- Production CI/CD deployment.
- Production infrastructure scaling.
- A2-b2 empirical scanner acceptance.
- Production-grade scanner accuracy benchmarking.
- Formal legal validation.
- Automated production compliance certification.
- Runtime claims beyond documented prototype scope.
- Customer onboarding.
- Validated production release.

## Backlog Readiness for Story Implementation

Controlled MVP prototype story implementation planning is allowed after this phase for stories in:

- `docs/planning/controlled-mvp-prototype-epics-and-stories.md`
- `docs/planning/controlled-mvp-prototype-story-map.md`

Implementation remains constrained by:

```text
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE
IMPLEMENTATION_NOT_READY
```

No story may permit:

- classification before VerifiedProfile;
- silent overwrite of scanner evidence;
- raw source code sent directly to an LLM;
- final legal output without citation traceability;
- Developer role blocking Manager-only MVP workflow;
- production compliance claims.

## Final Decision

CONTROLLED_MVP_PROTOTYPE_BACKLOG_PLANNED

STORY_IMPLEMENTATION_PLANNING_ALLOWED

This permits only controlled MVP prototype story implementation planning. It does not permit production deployment, customer onboarding, formal legal reliability claims, A2-b2 completion claims, CI/CD production deployment or removal of real-validation requirements.
