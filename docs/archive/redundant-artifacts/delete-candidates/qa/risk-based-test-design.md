# Risk-Based Test Design

## Purpose

This document prioritizes LCSP test effort using a probability x impact model. Critical and high-risk areas receive multi-layer coverage; lower-risk areas use focused contract/manual checks.

## Risk Scale

| Level | Score Guidance | Required Action |
| --- | --- | --- |
| Critical | 9 or compliance/security blocker | Blocking tests required |
| High | 6-8 | Mitigation and explicit coverage required |
| Medium | 4-5 | Monitor with targeted coverage |
| Low | 1-3 | Document or smoke/manual coverage |

## Risk Matrix

| Test Area | Risk | Failure Impact | Required Test Layers | Blocking Test? | Linked Requirement / Rule |
| --- | --- | --- | --- | --- | --- |
| Manager authority and no Developer dependency | Critical | MVP workflow deadlocks or wrong authority model | E2E, API contract, RBAC integration | Yes | UC-M03-01, UC-M04-08, UC-M06-08, FR-077, BR-089, NFR-032 |
| OAuth/OIDC callback and account-linking safety | Critical | Account takeover or login CSRF | API contract, security/privacy, integration | Yes | UC-M01-14, FR-074, FR-075, BR-086, BR-087, NFR-027, NFR-031 |
| GitHub App authorization boundary | Critical | Unauthorized repository access | API contract, integration, security | Yes | UC-M04-02, UC-M04-08, FR-025, FR-066, BR-077, NFR-014, NFR-028 |
| Repository scan static-only safety | Critical | Customer code execution or privacy breach | Scanner fixture, security/privacy, integration | Yes | UC-M04-08, FR-066, BR-057..BR-061, NFR-012..NFR-016 |
| No customer-code execution | Critical | Remote code execution, legal/privacy breach | Scanner fixture, sandbox review, security | Yes | Static scanner contract, BR-057..BR-061 |
| Workspace cleanup | Critical | Raw source retention | Scanner fixture, operational recovery, security | Yes | UC-M10-03, FR-060, BR-059, NFR-016 |
| Secret redaction | Critical | Secret leakage into DB/audit/LLM | Scanner fixture, security/privacy | Yes | UC-M10-02, FR-059, BR-058, NFR-013 |
| Raw-source exclusion from LLM and audit persistence | Critical | Confidential source leakage | LLM Gateway contract, audit inspection, security | Yes | UC-M10-04, UC-M10-05, FR-061, FR-062, BR-060, BR-061 |
| Schema Gate | Critical | Invalid evidence drives profile | Contract, unit, workflow | Yes | UC-M05-01, FR-031, BR-036 |
| Quality Gate | Critical | Insufficient evidence drives classification | Unit, workflow, scanner fixture | Yes | UC-M05-03, FR-033, BR-038, BR-040 |
| AIUsageFlow claim-level evidence | Critical | Legal matching from unsupported claim | Scanner fixture, AIUsageFlow contract, RAG | Yes | FR-069..FR-073, BR-080..BR-085, NFR-026 |
| Unknown/unclear flow abstention | Critical | Overclaimed risk/classification | Scanner fixture, workflow, RAG | Yes | FR-071, FR-072, BR-083, NFR-026 |
| Reconciliation and Manager-only conflict resolution | Critical | Unsafe VerifiedProfile or workflow deadlock | E2E, workflow, API contract | Yes | UC-M06-01..UC-M06-08, FR-036..FR-042, FR-067, BR-041..BR-048 |
| VerifiedProfile gate | Critical | Classification before verified facts | Workflow, API contract, E2E | Yes | UC-M06-08, UC-M07-02, FR-067, BR-078 |
| Legal citation guardrail | Critical | Unsupported legal conclusion | RAG evaluation, classification contract | Yes | UC-M07-04, FR-046, BR-051, NFR-020 |
| Document-generation final gate | Critical | Final report overclaims compliance | E2E, document contract, guardrail | Yes | UC-M08-02, FR-049, BR-063, NFR-021 |
| Queue idempotency and duplicate job handling | Critical | Duplicate scan/classification/doc results | Queue integration, workflow recovery | Yes | UC-M04-08, NFR-022 |
| Audit event integrity | Critical | No compliance trace | Integration, audit contract, recovery | Yes | UC-M09-01, FR-053, BR-067..BR-070 |
| LLM timeout/invalid output | High | Workflow stalls or unsafe model output | LLM Gateway contract, recovery | Yes | LLM Gateway invariant, BR-051 |
| RAG retrieval failure | High | Classification blocked incorrectly or unsupported | RAG evaluation, recovery | Yes | UC-M07-01, FR-043, A2 |
| Object storage failure | Medium | Document unavailable | Integration, recovery | No | UC-M08-05, FR-052 |
| Optional Developer delegation | Medium | Post-MVP privilege confusion | Authorization contract | No for MVP, yes post-MVP | FR-078, BR-090..BR-094 |
| CI/CD design controls | Low | Future delivery risk | Manual review | No | `ci-cd-implementation.md` |

## Risk Treatment Rules

- Critical risks require blocking test scenarios.
- High risks require explicit mitigation and at least one integration/contract or fixture scenario.
- Medium risks require targeted coverage and monitoring.
- Low risks may be documented for later quality gates.

## Testability Status

| Area | Status |
| --- | --- |
| Architecture invariants | TESTABLE_NOW as document checks; TESTABLE_AFTER_IMPLEMENTATION as automated tests |
| Scanner behavior | TESTABLE_WITH_FIXTURE |
| Legal corpus reliability | MANUAL_VALIDATION_REQUIRED / BLOCKED_BY_VALIDATION_DEPENDENCY |
| Manager-only MVP flow | TESTABLE_AFTER_IMPLEMENTATION |
| A1/A2/A2-b/A3 | MANUAL_VALIDATION_REQUIRED |

