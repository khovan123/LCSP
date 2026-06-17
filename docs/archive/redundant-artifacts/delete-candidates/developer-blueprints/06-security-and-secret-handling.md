# Security and Secret Handling

## Secret Naming

Secrets are referenced by `_REF` values in configuration. Runtime code resolves them through the approved secret-loading boundary.

Examples:

- `OIDC_CLIENT_SECRET_REF`
- `GITHUB_APP_PRIVATE_KEY_REF`
- `GITHUB_WEBHOOK_SECRET_REF`
- `S3_SECRET_KEY_REF`

## Redaction Behavior

`packages/logger` owns `redactSecretLikeValues(input)` and all structured logs pass through it before emission. Redaction covers tokens, private keys, API keys, passwords, full prompts and likely secret-looking values.

## No Raw Source to LLM Enforcement

- Scanner may read raw source only in ephemeral worker workspace.
- PostgreSQL stores metadata, hashes, spans and evidence refs only.
- RabbitMQ carries IDs, hashes and references only.
- LLM Gateway, if used later, accepts sanitized structured metadata only.
- Full prompts, raw source, secrets and raw AST bodies are rejected before provider calls.

## Threat-to-Control Map

| Threat | Control | Verification |
|---|---|---|
| OAuth callback replay | state/nonce/issuer/audience/expiry validation | Auth integration test |
| GitHub token leakage | token minted in memory by worker, never persisted or queued | log/audit scan and code review |
| Raw source persistence | snapshot cleanup and metadata-only persistence | scanner integration test |
| Secret in logs | logger redaction and forbidden fields | unit tests for redactor |
| Manager overreach | PermissionGuard + StateTransitionGuard | authorization matrix tests |
| Citation bypass | citation guardrail before final legal output | classification/document integration tests |
| Queue poison message | retry limit and DLQ | queue integration test |

## Retention Boundaries

Temporary scanner workspaces are deleted after scan completion or failure. Generated artifacts are stored as object references with retention policy; raw source is not a generated artifact.
