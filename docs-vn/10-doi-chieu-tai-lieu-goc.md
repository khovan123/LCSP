# 10 — Đối chiếu tài liệu gốc

## Mục đích

Bảng này cho biết các nhóm nội dung trong `docs/` đã được cô đọng vào tệp nào trong `docs-vn/`. Đây là bản đối chiếu theo chủ đề, không phải bản dịch 1:1 từng dòng.

## Tài liệu gốc ở root `docs/`

| Nguồn | Nội dung | Bản tóm lược |
|---|---|---|
| `docs/README.md` | thứ tự đọc, authority, runtime shape, trạng thái planning | `README.md`, `04`, `08`, `09` |
| `docs/documentation-governance.md` | lớp tài liệu, ownership và quy tắc chống trùng lặp | `09` |
| `docs/implementation-delivery-plan.md` | wave, dependency, exit criteria | `08` |
| `docs/implementation-readiness-certification.md` | trạng thái readiness và bước tiếp theo | `README.md`, `08`, `09` |

## `docs/product/`

| Nguồn | Nội dung | Bản tóm lược |
|---|---|---|
| `system-context.md` | sản phẩm, actor, external systems, UX boundary | `01`, `03` |
| `prd.md` | mục tiêu, phạm vi, outcome và yêu cầu sản phẩm | `01`, `02` |
| `business-rules.md` | các luật nghiệp vụ và guardrails | `01`, `02`, `03` |
| `validation-plan.md` | giả thuyết và cách xác thực sản phẩm | `02`, `08` |

## `docs/specs/`

| Nguồn/nhóm | Nội dung | Bản tóm lược |
|---|---|---|
| `use-cases.md`, `user-task-flows.md` | 18 use case, Manager/Developer flow và UI states | `02`, `03` |
| `functional-requirements.md` | 56 FR, active/deferred boundary | `02` |
| `non-functional-requirements.md` | 33 NFR về security, privacy, reliability, UX, cost | `02`, `07` |
| `acceptance-criteria-catalog.md` | 41 AC và negative paths | `02`, `03` |
| `requirements-baseline.md` | alias và recovery của requirement cũ | `09`, `10` |
| `requirements-traceability-matrix.md`, `requirements-traceability-summary.md` | traceability và planning gaps | `02`, `08` |
| `domain-model.md` | entity, relationship và ownership | `07` |
| `domain-state-machines.md` | lifecycle và transition guards | `03`, `07` |
| `event-catalog.md` | command/event names và orchestration | `03`, `07` |
| `assessment-lifecycle-spec.md` | assessment lifecycle và precondition | `03` |
| `scanner-spec.md`, `python-scanner-spec.md` | scanner behavior, finding, confidence và limits | `05` |
| `ai-usage-flow-domain-spec.md` | claim model, evidence, confidence và uncertainty | `03`, `05` |
| `legal-corpus-source-spec.md` | source, snapshot, provenance và approval | `06` |
| `legal-matching-domain-spec.md` | retrieval, rule matching và citation | `06` |
| `legal-classification-spec.md` | classification gates và blocked states | `03`, `06` |
| `document-generation-spec.md` | gap/report/readiness-only guardrails | `03`, `08` |

## `docs/architecture/`

| Nguồn/nhóm | Nội dung | Bản tóm lược |
|---|---|---|
| `architecture.md` | component topology và boundaries | `04` |
| `adr/architecture-decision-records.md` | authority index và supersession | `04`, `09` |
| ADR-001..ADR-022 | quyết định nền tảng, bảo mật, orchestration và evidence lịch sử/đang giữ lại | `04`, `07`, `09` |
| `adr-023-python-worker-scanner-runtime.md` | Python Worker ownership | `04`, `05` |
| `adr-024-real-llm-provider.md` | real provider happy path | `06` |
| `adr-025-legal-corpus-source-architecture.md` | official-source corpus | `06` |
| `adr-026-hybrid-legal-retriever.md` | FTS + pgvector profile | `06` |

## `docs/developer-execution-blueprints/`

| Nguồn/nhóm | Nội dung | Bản tóm lược |
|---|---|---|
| `end-to-end-execution.md` | 18 bước A-to-Z và queue choreography | `03` |
| `scanner-data-journey.md` | object transformation và scan persistence timing | `05`, `07` |
| `technical-profile-blueprint.md` | report sang TechnicalProfile | `03`, `05` |
| `reconciliation-blueprint.md` | conflict và VerifiedProfile | `03` |
| `gap-analysis-blueprint.md` | classification sang GapAnalysis | `03`, `08` |
| các blueprint domain/worker còn lại | runtime handoff giữa các object/workers | `03`, `04`, `07` |

## `docs/implementation/`

| Nguồn | Nội dung | Bản tóm lược |
|---|---|---|
| `README.md` | index implementation và runtime decisions | `04`, `08` |
| `backend-implementation.md` | NestJS API, auth, PBAC, trusted scan trigger, repository và orchestration | `04`, `07` |
| `persistence-implementation.md` | PostgreSQL/Prisma/pgvector, transaction và retention | `07` |
| `queue-implementation.md` | RabbitMQ, outbox, retry, idempotency, DLQ | `07` |
| `scanner-implementation.md` | scanner package/build contract | `05` |
| `python-worker-implementation.md` | Python process, workspace và subprocess | `05` |
| `legal-corpus-ingestion-implementation.md` | fetch, snapshot, normalization và approval | `06` |
| `hybrid-retriever-implementation.md` | FTS/vector query, filters, privacy và audit | `06` |
| `llm-gateway-implementation.md` | provider, schema, retry, budget và metadata | `06` |

## `docs/code-map/`

| Nguồn | Nội dung | Bản tóm lược |
|---|---|---|
| `README.md` | repository shape và ownership rules | `04` |
| `module-ownership-map.md` | module/table/queue/API ownership | `04` |
| `api-code-map.md` | NestJS modules và routes | `04` |
| `scanner-code-map.md` | Python scanner và TS/JS analyzer layout | `05` |
| `worker-code-map.md` | worker/queue responsibility | `04`, `07` |
| `shared-contracts-code-map.md` | DTO, event schema và shared contract ownership | `04`, `07` |

## Planning, change-control và reviews

| Nguồn/nhóm | Nội dung | Bản tóm lược |
|---|---|---|
| `docs/change-control/` | scope pivot và quyết định Project Owner | `01`, `04`, `09` |
| `docs/planning-artifacts/` | readiness, gap analysis và remediation reports | `08`, `09` |
| `docs/reviews/member-feedback/` | feedback, triage và canonical decisions | `09` |

## Archive

Toàn bộ `docs/archive/` được tóm lược theo vai trò lịch sử trong `09-quan-tri-tai-lieu-va-lich-su.md`. Archive gồm architecture originals, phase reports, validation packs, consolidation/recovery records, superseded specs và delete candidates. Nội dung này không phải authority cho UX hoặc implementation mới.

## Phạm vi bao phủ

```text
PRODUCT_SUMMARIZED
REQUIREMENTS_AND_ACCEPTANCE_SUMMARIZED
END_TO_END_WORKFLOW_SUMMARIZED
ARCHITECTURE_AND_ADRS_SUMMARIZED
SCANNER_SUMMARIZED
LEGAL_RAG_LLM_SUMMARIZED
DATA_EVENTS_SECURITY_SUMMARIZED
DELIVERY_AND_READINESS_SUMMARIZED
GOVERNANCE_REVIEWS_ARCHIVE_SUMMARIZED
```
