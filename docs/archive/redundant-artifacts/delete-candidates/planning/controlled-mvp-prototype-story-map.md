# Controlled MVP Prototype Story Map

## Purpose

This story map orders controlled MVP prototype work by dependency and user workflow. It is a planning artifact only and does not create implementation code, tests, CI/CD, Docker, infrastructure or production deployment artifacts.

## Release Boundary

Allowed:

```text
CONTROLLED_MVP_PROTOTYPE_BACKLOG_AUTHORIZED
CONTROLLED_MVP_PROTOTYPE_IMPLEMENTATION_AUTHORIZED_BY_OWNER_RISK_ACCEPTANCE
```

Still blocked:

```text
IMPLEMENTATION_BACKLOG_BLOCKED_FOR_VALIDATED_OR_PRODUCTION_RELEASE
IMPLEMENTATION_NOT_READY
```

## Dependency Map

| Order | Epic | User Workflow Slice | Key Stories | Dependency |
|---:|---|---|---|---|
| 1 | EPIC-01 Platform Foundation and Prototype Guardrails | Establish safe prototype boundaries | STORY-01-01, STORY-01-02, STORY-01-03 | Owner risk acceptance |
| 2 | EPIC-02 Identity, OAuth/OIDC, and Manager Authorization | Manager signs in and receives MVP authority | STORY-02-01, STORY-02-02, STORY-02-03 | EPIC-01 |
| 3 | EPIC-03 GitHub App Repository Connection | Manager connects repository and chooses commit | STORY-03-01, STORY-03-02 | EPIC-02 |
| 4 | EPIC-04 Scan Orchestration and Technical Evidence Foundation | Manager requests scan and evidence is persisted/gated | STORY-04-01..STORY-04-04 | EPIC-03 |
| 5 | EPIC-05 AIUsageFlow and Technical Profile Construction | Evidence becomes usage-flow claims | STORY-05-01..STORY-05-03 | EPIC-04 |
| 6 | EPIC-06 Reconciliation, Conflict Resolution, and Auditability | Manager resolves conflicts and approves VerifiedProfile | STORY-06-01..STORY-06-04 | EPIC-05 |
| 7 | EPIC-07 Legal Corpus and Citation Traceability Foundation | Legal retrieval/citation boundary is available | STORY-07-01..STORY-07-03 | EPIC-06 |
| 8 | EPIC-08 Risk Classification, Gap Analysis, and Document Workflow Shells | Workflow shells block/degrade or produce prototype outputs | STORY-08-01..STORY-08-04 | EPIC-07 |
| 9 | EPIC-09 Security, Privacy, and Prototype Observability | Cross-cutting privacy, audit and manual verification | STORY-09-01..STORY-09-04 | EPIC-01 plus relevant workflow stories |

## Vertical Prototype Slices

| Slice | Objective | Minimum Story Set | Prototype Output |
|---|---|---|---|
| VS-01 Foundation and login | Manager can enter a guarded prototype workspace | STORY-01-01, STORY-01-02, STORY-01-03, STORY-02-01, STORY-02-02, STORY-02-03 | Authenticated Manager session with prototype status guardrails |
| VS-02 Repository evidence setup | Manager connects repo and queues scan | STORY-03-01, STORY-03-02, STORY-04-01 | Repository snapshot and scan job status |
| VS-03 Synthetic evidence gates | Synthetic fixture-driven scanner emits report and gates | STORY-04-02, STORY-04-03, STORY-04-04, STORY-09-01, STORY-09-03 | TechnicalEvidenceReport and TechnicalProfile or blocked evidence state |
| VS-04 AIUsageFlow mapping | Technical evidence becomes claim-level AIUsageFlow | STORY-05-01, STORY-05-02, STORY-05-03 | Evidence-backed AIUsageFlow with uncertainty |
| VS-05 Reconciliation and VerifiedProfile | Manager resolves conflicts and approves profile | STORY-06-01, STORY-06-02, STORY-06-03, STORY-06-04 | VerifiedProfile or conflict-blocked state |
| VS-06 Legal/citation boundary | Retrieval and citation guardrails exist | STORY-07-01, STORY-07-02, STORY-07-03 | Citation-ready or citation-blocked legal retrieval result |
| VS-07 End-to-end workflow shell | Classification/gap/document shells enforce gates | STORY-08-01, STORY-08-02, STORY-08-03, STORY-08-04, STORY-09-02, STORY-09-04 | Prototype blocked/degraded/allowed workflow output with audit trace |

## Priority Groups

| Priority | Stories |
|---|---|
| P0 | STORY-01-01, STORY-01-02, STORY-02-01, STORY-02-03, STORY-03-01, STORY-03-02, STORY-04-01, STORY-04-03, STORY-04-04, STORY-05-01, STORY-05-02, STORY-06-01, STORY-06-02, STORY-06-03, STORY-07-03, STORY-08-01, STORY-09-01, STORY-09-02 |
| P1 | STORY-01-03, STORY-02-02, STORY-04-02, STORY-05-03, STORY-06-04, STORY-07-01, STORY-07-02, STORY-08-02, STORY-08-03, STORY-09-03, STORY-09-04 |
| P2 | STORY-08-04 |

## Non-negotiable Sequencing Gates

- Do not implement classification shell before VerifiedProfile gate stories exist.
- Do not implement document shell before citation guardrail shell exists.
- Do not implement scan evidence acceptance before redaction/privacy gate behavior exists.
- Do not treat synthetic fixture-driven scanner output as runtime scanner accuracy.
- Do not introduce Developer dependency in Manager MVP path.
- Do not implement production CI/CD or infrastructure from this story map.
