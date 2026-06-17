# Controlled MVP Prototype Dependency and Implementation Order

## Critical Path

```text
STORY-01-01
-> STORY-01-03
-> STORY-02-01
-> STORY-02-03
-> STORY-03-01
-> STORY-03-02
-> STORY-04-01
-> STORY-04-02
-> STORY-04-03
-> STORY-04-04
-> STORY-05-01
-> STORY-05-03
-> STORY-06-01
-> STORY-06-02
-> STORY-06-03
-> STORY-07-01
-> STORY-07-02
-> STORY-07-03
-> STORY-08-01
-> STORY-08-02
-> STORY-08-03
```

## Parallelizable Story Groups

| Group | Stories | Notes |
|---|---|---|
| Foundation follow-up | STORY-01-02, STORY-01-03 | Both require STORY-01-01. |
| Auth follow-up | STORY-02-02, STORY-02-03 | Both require STORY-02-01; STORY-02-03 is on critical path. |
| AIUsageFlow follow-up | STORY-05-02, STORY-05-03 | Both require STORY-05-01; STORY-05-03 is on critical path. |
| Early audit/readiness branches | STORY-06-04, STORY-08-04 | Both require STORY-01-02 and can proceed before full evidence pipeline. |
| Scanner privacy branches | STORY-09-01, STORY-09-03 | STORY-09-01 requires STORY-04-03; STORY-09-03 requires STORY-04-01. |
| LLM privacy branch | STORY-09-02 | Requires STORY-05-01 and STORY-07-02. |

## Blocking Dependencies

- OAuth/OIDC stories must wait for configuration boundary.
- GitHub App stories must wait for Manager super-role authorization.
- Scan job lifecycle must wait for repository/branch/commit selection.
- TechnicalEvidenceReport persistence must wait for synthetic scanner prototype output.
- AIUsageFlow must wait for accepted TechnicalProfile/evidence gates.
- Reconciliation must wait for AIUsageFlow human-review/automation mapping.
- VerifiedProfile must wait for Manager conflict resolution.
- Legal retrieval must wait for legal corpus metadata and VerifiedProfile.
- Classification shell must wait for citation guardrail.
- Document shell must wait for gap analysis shell.

## Suggested Implementation Waves

| Wave | Stories |
|---:|---|
| 1 | STORY-01-01 |
| 2 | STORY-01-02, STORY-01-03 |
| 3 | STORY-02-01 |
| 4 | STORY-02-02, STORY-02-03 |
| 5 | STORY-03-01, STORY-06-04, STORY-08-04 |
| 6 | STORY-03-02 |
| 7 | STORY-04-01 |
| 8 | STORY-04-02, STORY-09-03 |
| 9 | STORY-04-03 |
| 10 | STORY-04-04, STORY-09-01 |
| 11 | STORY-05-01 |
| 12 | STORY-05-02, STORY-05-03 |
| 13 | STORY-06-01 |
| 14 | STORY-06-02 |
| 15 | STORY-06-03 |
| 16 | STORY-07-01 |
| 17 | STORY-07-02 |
| 18 | STORY-07-03, STORY-09-02 |
| 19 | STORY-08-01 |
| 20 | STORY-08-02 |
| 21 | STORY-08-03 |
| 22 | STORY-09-04 |

## First Eligible Story for Coding

```text
STORY-01-01 Prototype Runtime Boundary Setup
```

Only this story currently has per-story implementation authorization from Phase 5.2.

## Stories Blocked Until Predecessor Implementation Is Completed

All stories except `STORY-01-01` require predecessor implementation and per-story authorization before development starts.

## Deferred Work

The following remain outside the controlled MVP prototype backlog:

- Enterprise SSO/SAML/SCIM.
- Production CI/CD.
- Production infrastructure scaling.
- Production deployment.
- Customer onboarding.
- Formal legal validation.
- Compliance certification.
- A2-b2 empirical scanner acceptance.
- Production scanner benchmarking.
- Production legal document issuance.

