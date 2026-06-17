# Prototype Default Decision Register

| Decision | Prototype Default | Reason | Affected Stories | Production Approval? |
|---|---|---|---|---|
| Runtime | TypeScript-first npm workspaces | One dependency/runtime model for implementation clarity | All | No |
| Package manager | npm only with `package-lock.json` | Consistent install/build/test commands | All | No |
| Internal IDs | UUIDv7 via `uuid` package | Stable sortable unique IDs across API/queue/audit | All persistence/API stories | No |
| Queue | RabbitMQ through `amqplib` | Explicit queue topology and retry/DLQ support | STORY-04-01 onward | No |
| Worker | Node.js TypeScript worker | Removes Python runtime split for controlled prototype | Worker/scanner/RAG stories | No |
| Scanner | Tree-sitter + TS Compiler API | Static-only evidence from supported languages | STORY-04-02 | No runtime accuracy claim |
| Python semantic analysis | Deferred | Avoids Python runtime/AST analyzer in controlled prototype | Scanner stories | No |
| AIUsageFlow mapping | deterministic rule engine | Evidence-to-claim mapping without LLM dependency | STORY-05-* | No legal-risk claim |
| Legal retrieval | ChromaDB JS client | Local prototype vector retrieval | STORY-07-* | No formal legal reliability claim |
| Object storage | MinIO local S3-compatible | Local generated artifacts | STORY-08-03/08-04 | No production storage decision |
