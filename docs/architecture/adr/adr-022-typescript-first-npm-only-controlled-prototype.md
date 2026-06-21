# ADR-022 - TypeScript-first npm-only controlled prototype runtime

## Status

Accepted for controlled MVP prototype.

## Decision

```text
CONTROLLED_MVP_PROTOTYPE_RUNTIME:
TYPESCRIPT_FIRST_NPM_WORKSPACES
```

LCSP controlled MVP prototype uses a single TypeScript-first runtime with npm workspaces.

```text
apps/
  web/                 Next.js frontend
  api/                 NestJS REST API and WebSocket gateway
  worker/              Node.js worker for queues, scanner, orchestration

packages/  contracts/           DTOs, event envelopes, UUID helpers, enums
  authz/               authorization policy and permission guards
  config/              environment schema and typed configuration
  logger/              structured logging and secret redaction
  scanner/             repository snapshot and static analysis
  ai-usage-flow/       deterministic evidence-to-usage-flow rules
  reconciliation/      profile comparison and conflict rules
  legal-rag/           corpus retrieval and citation guardrail
  audit/               immutable audit event contract
  test-fixtures/       synthetic prototype fixtures
```

## Required Runtime Defaults

| Concern                | Prototype Decision                                                                                                                           |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Package manager        | npm workspaces only                                                                                                                          |
| Frontend               | Next.js, React Hook Form, Zod, TanStack Query                                                                                                |
| Backend                | NestJS, Prisma, PostgreSQL, REST + JSON, OpenAPI decorators                                                                                  |
| Authentication         | OAuth/OIDC, NestJS guard boundary, organization-scoped authorization                                                                         |
| GitHub App             | `@octokit/app`, `@octokit/rest`                                                                                                              |
| Messaging              | RabbitMQ, `amqplib`                                                                                                                          |
| Scanner                | `tree-sitter`, `tree-sitter-typescript`, `tree-sitter-javascript`, `tree-sitter-python`, TypeScript Compiler API, `fast-glob`, `ignore`, Zod |
| AI usage-flow          | Deterministic rule engine in `packages/ai-usage-flow`; no LLM required for evidence-to-claim mapping                                         |
| Legal retrieval        | ChromaDB JavaScript client and citation guardrail in `packages/legal-rag`                                                                    |
| Workflow orchestration | `@langchain/langgraph`, used only where applicable after VerifiedProfile gates                                                               |
| UUID                   | `uuid` package, UUIDv7 for all internal identifiers                                                                                          |

## Explicit Replacements

Do not use:

- pnpm, yarn or bun.
- Python runtime worker.
- Python LangGraph worker.
- Python-specific semantic AST analysis in the controlled MVP prototype.

Python files in prototype receive Tree-sitter syntactic coverage only. Python semantic AST analysis is:

```text
DEFERRED_FROM_CONTROLLED_MVP_PROTOTYPE
```

Unsupported or weakly-supported language paths must return one of:

```text
LANGUAGE_COVERAGE_LIMITED
ANALYSIS_ABSTAINED
```

## Rationale

A TypeScript-first npm workspace keeps runtime, contracts, queue consumers, scanner prototype, legal retrieval and UI/API code in one dependency model. This reduces handoff ambiguity and makes developer execution easier for the controlled prototype.

## Consequences

- Existing Python-worker references in developer blueprints are legacy scope and must be normalized to Node.js worker guidance.
- Scanner semantic depth for Python is intentionally lower than the previous architecture exploration. This is a controlled prototype trade-off and must not be represented as runtime scanner accuracy.
- A2-b2 remains the post-implementation empirical scanner acceptance gate.

## Explicit Non-Claims

This ADR does not authorize production deployment, formal legal reliability validation, compliance certification, runtime scanner accuracy claims or A2-b2 completion.
