- source_spec: `docs/implementation-artifacts/spec-2-4-readiness-export-pdf.md`
  summary: Make readiness-export version allocation concurrency-safe instead of relying on a unique-index failure.
  evidence: The pre-existing generation path reads the latest version before its transaction, so concurrent requests can compute the same version and one can surface an unhandled Prisma unique-constraint error.
- source_spec: `docs/implementation-artifacts/spec-2-4-readiness-export-pdf.md`
  summary: Add a duplicate-data preflight or explicit upgrade policy to the readiness-export uniqueness migration.
  evidence: The pre-existing migration creates a unique assessment/version index directly and can fail if an older database already contains duplicate rows.
- source_spec: `docs/implementation-artifacts/spec-2-4-readiness-export-pdf.md`
  summary: Harden readiness-export response and history sanitization against partial contract drift and upstream failures.
  evidence: The pre-existing client sanitizer omits required `next_steps` and canonical value checks, history filtering silently drops malformed rows, and history request failures appear as an empty artifact list.
