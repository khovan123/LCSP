# LCSP Code Map

## Purpose

The Code Map is the engineering source of truth for what code modules will exist and what each module owns. It is read before creating files.

It does not define product behavior, architecture decisions, or runtime flow. Those live in `product/`, `specs/`, `architecture/`, and `developer-execution-blueprints/`.

## Read Order

1. [module-ownership-map.md](./module-ownership-map.md)
2. [api-code-map.md](./api-code-map.md)
3. [scanner-code-map.md](./scanner-code-map.md)
4. [worker-code-map.md](./worker-code-map.md)
5. [shared-contracts-code-map.md](./shared-contracts-code-map.md)

## Repository Shape

```text
apps/
  api/
  web/
  worker/
packages/
  contracts/
  scanner/
  ai-usage-flow/
  legal-rag/
prisma/
```

## Ownership Columns

Every module entry must declare:

- Purpose
- Dependencies
- Owned DTOs
- Owned tables
- Owned queues
- Owned APIs
- Authoritative docs

## Guardrail

If a module is not listed in this Code Map, do not create it until the Code Map is updated.
