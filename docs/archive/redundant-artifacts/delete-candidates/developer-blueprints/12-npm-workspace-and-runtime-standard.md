# npm Workspace and Runtime Standard

## Root Runtime Rule

LCSP controlled MVP prototype uses npm workspaces only.

Do not use pnpm, yarn or bun.

## Required Root Scripts

```bash
npm install
npm run dev
npm run build
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run db:generate
npm run db:migrate
npm run db:seed
npm run worker
```

## Required Workspace Scripts

```bash
npm run dev --workspace @lcsp/web
npm run dev --workspace @lcsp/api
npm run dev --workspace @lcsp/worker
npm run test --workspace @lcsp/scanner
npm run test --workspace @lcsp/contracts
```

## Lockfile and Automation Rules

- Commit `package-lock.json`.
- Use `npm ci` in automation.
- One root `package.json` defines workspaces.
- No `pnpm-lock.yaml`.
- No `yarn.lock`.
- No `bun.lock`.

## Workspace Names

```text
@lcsp/web
@lcsp/api
@lcsp/worker
@lcsp/contracts
@lcsp/authz
@lcsp/config
@lcsp/logger
@lcsp/scanner
@lcsp/ai-usage-flow
@lcsp/reconciliation
@lcsp/legal-rag
@lcsp/audit
@lcsp/test-fixtures
```
