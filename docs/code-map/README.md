# LCSP Code Map

## Purpose

The Code Map is the engineering source of truth for planned module ownership before implementation files are created. Product behavior, architecture decisions, and runtime flow remain owned by product/spec/architecture/blueprint documents.

## Read Order

1. [module-ownership-map.md](./module-ownership-map.md)
2. [api-code-map.md](./api-code-map.md)
3. [scanner-code-map.md](./scanner-code-map.md)
4. [worker-code-map.md](./worker-code-map.md)
5. [shared-contracts-code-map.md](./shared-contracts-code-map.md)

## Repository Shape

```text
apps/
  api/                         NestJS API, auth, PBAC, query surfaces
  web/                         Manager and optional Developer product UX

lcsp-python-workers/           Python Worker Platform for async domain workloads
  pyproject.toml
  src/lcsp_workers/

tools/
  ts-js-analyzer/              bounded Node.js CLI used by Python Scanner Worker

packages/
  contracts/
  ai-usage-flow/
  legal-rag/

prisma/
```

## Runtime Ownership Summary

| Concern | Owner |
|---|---|
| Scan job creation and query | NestJS API `scans` module |
| Repository Scan lifecycle | Python Scanner Worker |
| TypeScript/JavaScript semantic analysis | `tools/ts-js-analyzer` CLI subprocess |
| TechnicalProfile through document workers | Python Worker Platform |
| Legal ingestion/index build | Python legal/corpus workers plus internal operations API/CLI |
| Customer product UI | `apps/web` |

## Ownership Columns

Every module entry must declare:

- purpose;
- dependencies;
- owned DTOs/contracts;
- owned tables;
- owned queues/events;
- owned APIs where applicable;
- authoritative documents.

## Guardrails

- Python Scanner Worker is the sole consumer of `command.scan.requested.v1`.
- Node.js downstream domain workers are `SUPERSEDED_FOR_ACTIVE_MVP`; Node.js remains only for NestJS API, web/tooling and bounded TS/JS analyzer CLI.
- Internal legal corpus administration is not part of Manager/Developer product UX for MVP.
- A module not listed in the Code Map must not be created until this map is updated.
- Code Map alignment is required by `NFR-025`.
