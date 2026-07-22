

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
