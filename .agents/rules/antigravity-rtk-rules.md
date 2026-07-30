# RTK - Rust Token Killer (Google Antigravity)

**Usage**: Token-optimized CLI proxy for shell commands.

## Rule

Always prefix shell commands with `rtk` to minimize token consumption.

Examples:

```bash
rtk git status
rtk cargo test
rtk ls src/
rtk grep "pattern" src/
rtk find "*.rs" .
rtk docker ps
rtk gh pr list
```

## Meta Commands

```bash
rtk gain              # Show token savings
rtk gain --history    # Command history with savings
rtk discover          # Find missed RTK opportunities
rtk proxy <cmd>       # Run raw (no filtering, for debugging)
```

## Why

RTK filters and compresses command output before it reaches the LLM context, saving 60-90% tokens on common operations. Always use `rtk <cmd>` instead of raw commands.

## LCSP project rules

- Domain/API value sets must be defined from `as const` objects, not TypeScript enums or direct string-literal unions.
- Canonical contract values must use `SCREAMING_SNAKE_CASE`. Do not introduce mixed styles such as `pending`, `pending_approval`, `FinalReport`, or `accessRevoked`.
- Hardcoded status/code/type/action/reason/resource/aggregate values are not allowed in `apps/web` or `apps/api`; import them from `packages/contracts`.
- `apps/api` may translate between Prisma enums and contract constants only at explicit persistence boundaries.
- In `apps/api/prisma/schema.prisma`, bounded status/type/reason/resource sets must use Prisma enums when the set is closed. Prisma enum members must also be `SCREAMING_SNAKE_CASE`.
- Backend JSON controllers must return one envelope contract:
  - success: `{ ok: true, data }`
  - failure: `{ ok: false, problem: { type, status, code, titleKey, detailKey, requiredAction, correlationId, meta } }`
- The HTTP status code must match `problem.status` in the failure body. Do not introduce legacy error shapes such as `{ error_code }` or `{ code }`.
- Next route handlers in `apps/web/src/app/api` are BFF/proxy code and must use shared helpers for upstream requests, session guards, query normalization, and envelope forwarding.
- Read `LCSP_API_BASE_URL` in one shared upstream helper under `apps/web/src/lib/server`, not repeatedly across routes or client modules.
- Client-side requests must go through shared `apiRequest`; TanStack Query belongs in `*-queries.ts`; domain mapping from `problem.code` belongs in domain modules.
- Do not keep `*-client.ts` files as thin duplicated fetch wrappers once shared request helpers exist.
- All web mock payload JSON must live under `apps/web/src/public/assets/mocks`.
