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
  api/                         NestJS API, auth, RBAC, query surfaces
  web/                         Manager and optional Developer product UX
  worker/                      Node.js downstream workers

lcsp-scanner-worker/           Standalone Python Scanner Worker
  pyproject.toml
  src/lcsp_scanner/

tools/
  ts-js-analyzer/              Node.js subprocess used by Python Worker

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
| Repository Scan lifecycle | `lcsp-scanner-worker` (Python) |
| TypeScript/JavaScript semantic analysis | `tools/ts-js-analyzer` subprocess |
| TechnicalProfile through document workers | `apps/worker` Node.js runtime |
| Legal ingestion/index build | dedicated downstream workers plus internal operations API/CLI |
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

- Python Worker is the sole consumer of `command.scan.requested.v1`.
- `apps/worker` must not contain an active Node.js scanner lifecycle worker.
- Internal legal corpus administration is not part of Manager/Developer product UX for MVP.
- A module not listed in the Code Map must not be created until this map is updated.
- Code Map alignment is required by `NFR-025`.