

<!-- Source: AGENTS.md -->

@RTK.md

## Tailwind CSS v4.3 utility policy

- Before adding or editing a Tailwind class, prefer the canonical Tailwind v4.3 utility over an arbitrary value whenever both produce the same CSS.
- Do not write `min-h-[100dvh]`, `min-h-[18rem]`, `rounded-[2px]`, or equivalent arbitrary forms when `min-h-dvh`, `min-h-72`, and `rounded-sm` exist.
- Use an arbitrary value only when there is no semantically equivalent built-in utility (for example, `clamp()`, `min()`, a `ch` measure, or an approved design token not represented in Tailwind's scale).
- During frontend review, search changed TSX/JSX for `-[` utilities and replace every built-in-equivalent occurrence before declaring the task complete.

## Frontend Atomic Design boundaries

- Keep shadcn primitives in `apps/web/src/components/ui`. Keep reusable Atomic Design components in `apps/web/src/components/{atoms,molecules,organisms}`; they must remain domain-neutral and reusable across features.
- Keep feature-specific composition in `apps/web/src/features/<feature>/components/{molecules,organisms}`. Do not place feature components directly under `features/<feature>/molecules` or `features/<feature>/organisms`.
- Put schemas, types, and static configuration in sibling `schemas/`, `types/`, and `config/` directories, never inline in a component.
- All customer-facing copy, including labels, helper text, validation messages, alerts, metadata, and accessible labels, must be represented by keys and resolved from `@lcsp/i18n`; never hardcode display strings in `apps/web`.



<!-- Source: .ruler/AGENTS.md -->

# AGENTS.md

Centralised AI agent instructions. Add coding guidelines, style guides, and project context here.

Ruler concatenates all .md files in this directory (and subdirectories), starting with AGENTS.md (if present), then remaining files in sorted order.

## Contract value-set typing

- Do not define TypeScript enums for app/domain value sets. Use `as const` objects and derive types from them.
- Do not define direct string literal unions such as `type Status = "A" | "B"`. Define a constant source first, then derive the type:
  ```ts
  export const EVIDENCE_SEVERITIES = {
    low: "LOW",
    medium: "MEDIUM",
    high: "HIGH",
  } as const;

  export type EvidenceSeverity =
    (typeof EVIDENCE_SEVERITIES)[keyof typeof EVIDENCE_SEVERITIES];
  ```
- Apply the same rule to discriminators such as `kind`, `type`, `status`, `reason`, `requiredAction`, and UI state strings. Local UI-only states may keep local constants, but domain/API values must live in `packages/contracts`.
- Hardcoded error codes, status values, workflow values, PBAC actions, scan statuses, evidence severities, and wizard/assessment statuses must be imported from `packages/contracts`; do not repeat raw strings in `apps/web` or `apps/api`.
- Before finishing a TS change, search changed code for direct literal unions and enums:
  `rg 'type [A-Za-z0-9_]+\\s*=\\s*"[^"]+"\\s*\\||^\\s*\\|\\s*"[^"]+"|\\benum\\b'`.

## API result contract

- Backend JSON controllers must return one envelope contract for success and failure:
  - success: `{ ok: true, data }`
  - failure: `{ ok: false, problem: { type, status, code, titleKey, detailKey, requiredAction, correlationId, meta } }`
- The HTTP status code must match `problem.status` in the failure body. Add or update tests when touching problem factories, filters, or interceptors.
- Use the backend problem factory/global exception filter for failures instead of ad hoc response shapes. Do not introduce legacy shapes such as `{ error_code }`, `{ code }`, or custom per-controller error bodies.
- Do not apply a global success wrapper to stream/download endpoints unless the endpoint is explicitly JSON-only.

## Web BFF and API client layer

- Keep Next route handlers as BFF/proxy code. They should use shared server helpers for upstream calls, bearer/session handling, query param normalization, result JSON, and payload validation. Do not repeat `fetch(apiBaseUrl...)`, `response.json()`, credential/session cookie guards, or pagination parsing in every route.
- `LCSP_API_BASE_URL` must be read in one shared upstream helper, not repeatedly inside `apps/web/src/app/api` or client modules.
- Client-side API calls must go through the shared `apiRequest` helper so envelope parsing and credential behavior are centralized.
- TanStack Query belongs in `*-queries.ts` hooks. Domain mapping from `problem.code` to page outcomes belongs in domain client modules, using shared outcome constants instead of raw `kind` strings.
- Keep server-only proxy helpers under `apps/web/src/lib/server`, not under `apps/web/src/lib/api`.

## Mock data placement

- All mock payload data must live under `apps/web/src/public/assets/mocks`.
- Type definitions, fixture readers, cookie constants, and mock-mode helpers may live under server/helper folders, but they must not embed mock payload objects that should be JSON assets.
- Do not add mock JSON, fixture payloads, or seed-like web data outside `apps/web/src/public/assets/mocks`.
