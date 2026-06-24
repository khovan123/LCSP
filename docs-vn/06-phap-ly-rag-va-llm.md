# 06 — Pháp lý, RAG và LLM

## Legal corpus

Nguồn pháp lý phải là URL chính thức đã được xác minh. Mỗi lần ingest lưu snapshot bất biến trong S3-compatible storage cùng URL, thời điểm lấy và SHA-256 hash.

Dữ liệu được chuẩn hóa theo văn bản, chương, điều, khoản, điểm và phụ lục. Mọi thay đổi nội dung hoặc hiệu lực tạo phiên bản mới; LegalCorpusVersion đã APPROVED không bị sửa.

```text
LegalSource VALIDATED
-> Python Legal Ingestion Worker
-> snapshot và normalized DRAFT corpus
-> Internal Legal Operator review
-> APPROVED
-> Python Index Worker build FTS/vector
-> READY cho retrieval
```

Internal review/approval là control để bảo đảm provenance, version và dữ liệu dùng cho retrieval; nó không tạo thêm customer-facing product flow.

## Hybrid retrieval

Cấu hình MVP hiện được giữ:

```text
FTS: PostgreSQL simple + unaccent
Vector: vector(1536)
Similarity: cosine
Index: HNSW, m=16, ef_construction=64
Ranking: 0.4 FTS + 0.6 vector
```

Python Legal Matching Worker phải lọc theo corpus version đã pin, trạng thái APPROVED, index READY, nguồn đã xác minh, ngày hiệu lực và metadata phù hợp.

Mỗi kết quả quan trọng phải dựng lại được document ID, số/loại/tiêu đề/cơ quan ban hành, điều/khoản/điểm, source URL, content hash, corpus version, ngày hiệu lực, chunk ID và retrieval scores. Candidate thiếu citation không được dùng cho LegalRuleMatch quan trọng.

Retrieval audit chỉ lưu query hash hoặc structured facets đã làm sạch, filters, result refs, scores, Python worker/service identity, PBAC decision reference và correlation ID.

## LLM Gateway

Mọi external model call đi qua LLM Gateway. A-to-Z acceptance dùng provider/model thật; mock chỉ dùng cho test hoặc phát triển offline.

Python Classification, Gap và Document workers gọi gateway bằng sanitized structured input. Gateway chịu trách nhiệm provider/model, secret reference, timeout, retry, output schema validation, token/cost budget, ModelRunMetadata, output hash và fail-closed behavior.

Không gửi raw repository source, credentials, full customer prompt, full AST hoặc unredacted logs sang LLM/embedding service. Classification và document generation không được tạo kết luận vượt quá evidence và citation đã có.

## Gap hiện tại

Active legal/classification/document worker ownership trên `main` vẫn là Node/TS. Cần chuyển sang Python Worker Platform và cập nhật queue, persistence, code map, blueprints và acceptance trước UX.
