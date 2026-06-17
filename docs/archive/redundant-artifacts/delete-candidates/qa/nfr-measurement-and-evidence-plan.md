# NFR Measurement and Evidence Plan

## Purpose

Define what evidence LCSP must collect to evaluate NFR gates after implementation. This document is documentation-only and does not create instrumentation, dashboards, tests or scripts.

## Scope

The plan covers security, privacy, authorization, scanner safety, evidence integrity, AIUsageFlow, legal citation, queue reliability, recovery, auditability, performance baseline, accessibility and manual validation evidence.

## Dependencies / Source References

- `docs/design/non-functional-requirements.md`
- `docs/qa/nfr-quality-audit.md`
- `docs/qa/nfr-acceptance-gates.md`
- `docs/qa/security-privacy-control-verification.md`
- `docs/qa/performance-capacity-quality-design.md`
- `docs/qa/observability-operational-readiness-audit.md`
- `docs/qa/manual-validation-protocols.md`

## Measurement and Evidence Matrix

| Quality Attribute | Metric / Evidence | Collection Point | Redaction Rule | Retention Rule | Reviewer | Gate / Decision Use |
| --- | --- | --- | --- | --- | --- | --- |
| OAuth safety | invalid state/nonce/redirect/issuer/audience/expiry rejected and audited | Auth API, OAuth callback audit | No provider token or raw identity token | Audit retention policy | Security/QA | NFR-GATE-01 |
| MFA safety | invalid/expired/replayed OTP rejected; reset audited | MFA service, audit | No MFA seed or recovery secret | Audit retention policy | Security/QA | NFR-GATE-02 |
| Manager authorization | Manager completes MVP flow without Developer; Developer denied final actions | API authorization logs, UI flow evidence | No sensitive payload | Audit retention policy | QA/Product | NFR-GATE-03 |
| GitHub App authorization | OAuth login does not create repo connection; GitHub App uses selected repo/read-only scope | GitHub integration audit | No GitHub token | Audit retention policy | Security/Architecture | NFR-GATE-04 |
| Workspace cleanup | cleanup event after success/failure; workspace absence verified by worker evidence | Scanner worker telemetry | No source path beyond sanitized workspace ID | Operational retention | Security/Worker QA | NFR-GATE-05 |
| Source exclusion from LLM | LLM Gateway inputs are sanitized metadata refs only | LLM Gateway metadata review | No source, full prompt, secret or AST body | Model metadata retention | Security/QA | NFR-GATE-06 |
| Secret redaction | persisted findings/audit/reports contain no secret values | Scanner redaction checks, artifact inspection | Store secret category/hash only | Evidence retention policy | Security/QA | NFR-GATE-06 |
| Evidence report integrity | report_hash, scanner_version, ruleset_version, commit_sha present | Evidence contract validation | Metadata only | Evidence retention policy | QA/Architecture | NFR-GATE-07 |
| AIUsageFlow evidence completeness | all material claims have evidence_refs, confidence, source_type | AIUsageFlow validation | Evidence refs only | Assessment retention policy | QA/A2-b reviewers | NFR-GATE-08 |
| Unknown/abstain correctness | unsupported dynamic flows emit limitation and block critical final classification | Scanner/AIUsageFlow result review | Metadata only | A2-b fixture retention | QA/A2-b reviewers | NFR-GATE-08 |
| Citation coverage | risk output references legal rule/citation/version; missing citation blocks/degrades output | Citation Guardrail result | Citation IDs and versions | Legal output retention | Legal/QA | NFR-GATE-10 |
| Queue idempotency | duplicate job uses same idempotency key and does not duplicate final state | Queue/job metadata | No sensitive job payload | Operational retention | Backend/QA | NFR-GATE-11 |
| Recovery behavior | retry/dead-letter/pause/resume outcomes match failure design | Worker/orchestrator traces | No source/prompt payload | Operational retention | QA/Ops | NFR-GATE-13 |
| Audit integrity | critical transition audit events exist and are append-oriented | Audit store | Redacted actor/action/outcome only | Audit retention policy | Security/Compliance | NFR-GATE-12 |
| Performance baseline | latency, duration, backlog, timeout and resource metrics by workload category | API, Queue, Worker, RAG, LLM Gateway | Aggregate where possible | Metrics retention policy | QA/Ops | NFR-GATE-14 |
| Accessibility review | screen checklist, keyboard/focus observations, blocked-state clarity evidence | Manual review, accessibility tooling after implementation | No customer data | Validation evidence retention | UX/QA | NFR-GATE-15 |
| A1 manual validation | Wizard simplicity/completeness notes, task success, confusion points | Manual protocol records | No personal sensitive details beyond consented study metadata | Validation retention policy | Product/QA | Backlog gate |
| A2 manual validation | legal rule/citation reliability review decisions | Manual protocol records | Legal corpus refs only | Validation retention policy | Legal/Product | Backlog gate |
| A2-b manual validation | scanner and AIUsageFlow mapping metrics | Fixture results and reviewer notes | Synthetic fixtures only | Validation retention policy | QA/Architecture | Backlog gate |
| A3 manual validation | governance/attestation abuse findings | Manual protocol records | Redacted participant notes | Validation retention policy | Product/Security | Backlog gate |

## Required Inputs and Outputs

| Input | Output |
| --- | --- |
| NFR gates | Evidence collection plan |
| Phase 3.1 scenarios and fixtures | Measurement mapping |
| Implementation contracts | Gate-ready evidence checklist |

## State / Error / Failure Handling

| Evidence Gap | Required Handling |
| --- | --- |
| OAuth or MFA evidence missing | NFR-GATE-01/02 cannot pass |
| AIUsageFlow evidence refs missing | Claim cannot feed legal rule matching |
| Missing citation evidence | Classification output blocked/degraded |
| Missing audit event for critical transition | Gate fails or remains blocked pending evidence |
| Performance threshold not approved | Gate remains measurement-ready but threshold decision required before implementation |

## Security and Privacy Considerations

- Evidence collection must use synthetic fixtures where possible.
- Manual validation records must avoid collecting unnecessary personal data.
- No measurement artifact may store raw source code, full prompts, secrets or full AST bodies.
- LLM evidence uses metadata references and hashes, not raw prompt/source content.

## Audit Requirements

The measurement plan itself does not create audit events, but all runtime evidence used for gates must be reproducible from audit events, workflow traces, contract validation results, fixture results or manual validation records.

## Decision Required

| Decision | Classification | Recommended Default | Owner | Required Before |
| --- | --- | --- | --- | --- |
| Final NFR evidence retention periods | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Align audit/evidence retention with institutional compliance policy and source privacy policy | Product/Security | Implementation |
| Numeric performance thresholds | DECISION_REQUIRED_BEFORE_IMPLEMENTATION | Establish baseline after implementation environment exists; do not invent targets in design phase | Product/Architecture/QA | Implementation |

