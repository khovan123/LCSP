# Phase 6.2 MVP Implementation Decision Lockdown Report

## Scope

This report records the Phase 6.2 lockdown of remaining controlled MVP implementation decisions after `IMPLEMENTATION_KICKOFF_APPROVED`.

Created artifacts:

- `docs/mvp-implementation-decision-lockdown.md`
- `docs/archive/decisions/phase-6-2-mvp-implementation-decision-lockdown-report.md`

No code, tests, CI, Docker, validation documents, stories, backlog or sprint plans were created.

## Documents Reviewed

Active documents reviewed:

- `docs/implementation-readiness-certification.md`
- `docs/implementation-delivery-plan.md`
- `docs/specs/scanner-spec.md`
- `docs/implementation/scanner-implementation.md`
- `docs/implementation/persistence-implementation.md`
- `docs/implementation/queue-implementation.md`
- `docs/implementation/backend-implementation.md`
- `docs/architecture/architecture.md`
- `docs/architecture/adr/`
- `docs/specs/domain-model.md`
- `docs/specs/event-catalog.md`
- `docs/specs/domain-state-machines.md`

Archived/delete-candidate material was not used as authority.

## Decisions Locked

| Area | Locked Decision | Result |
|---|---|---|
| Scanner sandbox | Restricted temporary local filesystem workspace. | LOCKED |
| Scanner runtime | TypeScript-first Node.js worker, npm workspaces, Tree-sitter, ts-morph, graphology; no Python worker/NetworkX/source execution. | LOCKED |
| Graph persistence | Metadata-only Postgres graph; `ScannerEvidencePath` embedded in `TechnicalFinding.metadata.evidencePath`. | LOCKED |
| Parser foundation | Phase 5.5A contracts for ParserRegistry, LanguageMapper, UnsupportedParserAdapter, TreeSitterAstExtractor and EvidenceRefFactory. | LOCKED |
| Queue retry/DLQ | 3 attempts per worker, exponential backoff 30s/120s/600s plus jitter, matching DLQ and terminal failure behavior. | LOCKED |
| Retention | No raw source long-term persistence; metadata/artifacts retained on MVP schedule. | LOCKED |
| Local development | npm workspace commands and expected smoke scan behavior. | LOCKED |
| OAuth/OIDC | Local mock OIDC by default with provider-agnostic interface. | LOCKED |
| LLM provider | Deterministic mock LLM gateway by default; provider mode disabled unless configured. | LOCKED |
| Legal corpus seed | Local JSONL seed with required citation fields and missing-corpus failure behavior. | LOCKED |
| Object storage | Local filesystem artifact store with S3-compatible adapter boundary. | LOCKED |
| MVP non-claims | Production/legal/compliance/A2-b2/customer-deployment claims explicitly denied. | LOCKED |

## Adversarial Review

Question: Can Wave 1 start without open MVP decisions?

Answer: YES.

Reason: Prisma, outbox, audit, RBAC, RabbitMQ topology, local commands and retry/DLQ values are locked sufficiently for TASK-001 through TASK-007.

Question: Can Scanner Foundation start without open MVP decisions?

Answer: YES.

Reason: Scanner runtime, parser adapters, LanguageMapper behavior, unsupported behavior, parse-failure behavior, temporary workspace handling and no-persistence rules are locked.

Question: Can Scanner Repository persistence be implemented without open schema decisions?

Answer: YES.

Reason: The MVP uses existing active Prisma models for `CodeGraphNode`, `CodeGraphEdge`, `EvidenceReference`, `TechnicalFinding` and `TechnicalEvidenceReport`. `ScannerEvidencePath` is explicitly embedded as structured JSON in `TechnicalFinding.metadata.evidencePath`, avoiding a new table decision.

Question: Can local dev run without inventing commands?

Answer: YES.

Reason: The lockdown preserves the npm command contract: `npm install`, `npm run db:generate`, `npm run db:migrate`, `npm run dev:api`, `npm run dev:worker`, `npm run dev:web`, `npm run test`, `npm run test:scanner`, and `npm run smoke:scan-fixture`.

Question: Can worker retry/DLQ be implemented without guessing?

Answer: YES.

Reason: Max attempts, backoff, DLQ queue and terminal failure behavior are defined for each worker.

## Remaining Issues

Critical blockers: 0.

High blockers: 0.

| Severity | Issue | Disposition |
|---|---|---|
| Medium | Active implementation docs still contain historical excerpts and older “Decision Required” sections. | Not a blocker; the Phase 6.2 lockdown provides the MVP coding default when older text says deferred. Future doc hygiene can remove stale sections without blocking TASK-001. |
| Medium | Container sandboxing is not selected for MVP. | Accepted MVP tradeoff; local restricted workspace plus cleanup/audit is locked. Production hardening may revisit. |
| Medium | Real OAuth/OIDC, real LLM provider and production object storage are not selected. | Accepted MVP defaults use mock/provider-agnostic interfaces and local filesystem storage; production claims remain blocked. |
| Low | Retry values may need tuning after integration evidence. | MVP values are sufficient for implementation; tuning belongs to hardening/change control. |

## Verification Against Final Questions

| Verification Question | Result |
|---|---|
| Can Wave 1 start without open MVP decisions? | YES |
| Can Scanner Foundation start without open MVP decisions? | YES |
| Can Scanner Repository persistence be implemented without open schema decisions? | YES |
| Can local dev run without inventing commands? | YES |
| Can worker retry/DLQ be implemented without guessing? | YES |

## Final Decision

MVP_IMPLEMENTATION_DECISIONS_LOCKED

NO_MORE_MVP_DECISION_DOCS_REQUIRED

ENGINEERING_EXECUTION_CAN_PROCEED

NEXT_ALLOWED_ACTIVITY:

bmad-agent-dev for TASK-001
